import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { User } from '../models/User.js';
import { Company } from '../models/Company.js';
import { AppError } from '../utils/AppError.js';
import { config } from '../config/index.js';
import { notifier, USER_EVENTS } from '../services/notification.service.js';
import { sendVerificationEmail } from '../services/mail.service.js';

// --- Helpers ---

const generateVerificationCode = () =>
  crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');

const signAccessToken = (user) =>
  jwt.sign({ sub: user._id.toString(), role: user.role }, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpires
  });

const signRefreshToken = (user) =>
  jwt.sign({ sub: user._id.toString() }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpires
  });

const issueTokens = async (user) => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });
  return { accessToken, refreshToken };
};

const publicUser = (user) => ({
  _id: user._id,
  email: user.email,
  status: user.status,
  role: user.role
});

// 1) POST /api/user/register — Registro de usuario
export const register = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const existing = await User.findOne({ email, status: 'verified' });
    if (existing) {
      throw AppError.conflict('Ya existe una cuenta verificada con este email');
    }

    // Si existe un usuario pendiente con ese email, lo eliminamos para
    // permitir un nuevo intento de registro con código nuevo.
    await User.deleteOne({ email, status: 'pending' });

    const user = new User({
      email,
      password,
      role: 'admin',
      status: 'pending',
      verificationCode: generateVerificationCode(),
      verificationAttempts: 3
    });

    await user.save();

    const { accessToken, refreshToken } = await issueTokens(user);

    notifier.emit(USER_EVENTS.REGISTERED, user);
    sendVerificationEmail(user.email, user.verificationCode).catch((err) =>
      console.error('[mail] Error enviando email de verificación:', err.message)
    );

    res.status(201).json({
      ok: true,
      data: {
        user: publicUser(user),
        accessToken,
        refreshToken
      }
    });
  } catch (err) {
    next(err);
  }
};

// 2) PUT /api/user/validation — Validación del email
export const validateEmail = async (req, res, next) => {
  try {
    const { code } = req.body;

    const user = await User.findById(req.user._id).select(
      '+verificationCode +verificationAttempts'
    );

    if (!user) throw AppError.notFound('Usuario no encontrado');

    if (user.status === 'verified') {
      return res.json({ ok: true, message: 'El email ya estaba verificado' });
    }

    if (user.verificationAttempts <= 0) {
      throw AppError.tooManyRequests('Has agotado los intentos de verificación');
    }

    if (user.verificationCode !== code) {
      user.verificationAttempts -= 1;
      await user.save({ validateBeforeSave: false });

      if (user.verificationAttempts <= 0) {
        throw AppError.tooManyRequests('Has agotado los intentos de verificación');
      }

      throw AppError.badRequest('Código de verificación incorrecto', {
        attemptsLeft: user.verificationAttempts
      });
    }

    user.status = 'verified';
    user.verificationCode = undefined;
    await user.save({ validateBeforeSave: false });

    notifier.emit(USER_EVENTS.VERIFIED, user);

    res.json({ ok: true, message: 'Email verificado correctamente' });
  } catch (err) {
    next(err);
  }
};

// 3) POST /api/user/login — Login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      throw AppError.unauthorized('Credenciales incorrectas');
    }

    const { accessToken, refreshToken } = await issueTokens(user);

    res.json({
      ok: true,
      data: {
        user: publicUser(user),
        accessToken,
        refreshToken
      }
    });
  } catch (err) {
    next(err);
  }
};

// 4a) PUT /api/user/register — Onboarding: datos personales
export const updatePersonalData = async (req, res, next) => {
  try {
    const { name, lastName, nif } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, lastName, nif },
      { new: true, runValidators: true }
    ).populate('company');

    res.json({ ok: true, data: { user } });
  } catch (err) {
    next(err);
  }
};

// 4b) PATCH /api/user/company — Onboarding: datos de compañía
export const updateCompany = async (req, res, next) => {
  try {
    const { isFreelance } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) throw AppError.notFound('Usuario no encontrado');

    let name = req.body.name;
    let cif = req.body.cif;
    let address = req.body.address;

    if (isFreelance) {
      // Autónomo: los datos de la compañía se rellenan con los datos personales
      if (!user.nif) {
        throw AppError.badRequest(
          'Completa primero tus datos personales (NIF) antes de darte de alta como autónomo'
        );
      }
      cif = user.nif;
      name = name || `${user.name} ${user.lastName}`.trim();
      address = address || user.address;
    }

    const normalizedCif = cif.toUpperCase().trim();

    let company = await Company.findOne({ cif: normalizedCif });

    if (!company) {
      // No existe: se crea, el usuario es owner y mantiene role admin
      company = await Company.create({
        owner: user._id,
        name,
        cif: normalizedCif,
        address,
        isFreelance: Boolean(isFreelance)
      });
      user.role = 'admin';
    } else if (company.owner.toString() === user._id.toString()) {
      // Ya existe y el usuario es su propio owner (p. ej. reenvía el mismo
      // formulario de onboarding): mantiene su role admin.
      user.role = 'admin';
    } else {
      // Ya existe y pertenece a otro usuario: se une con role guest
      user.role = 'guest';
    }

    user.company = company._id;
    await user.save({ validateBeforeSave: false });

    const populatedUser = await User.findById(user._id).populate('company');

    res.json({ ok: true, data: { user: populatedUser } });
  } catch (err) {
    next(err);
  }
};

// 5) PATCH /api/user/logo — Logo de la compañía
export const updateLogo = async (req, res, next) => {
  try {
    if (!req.user.company) {
      throw AppError.badRequest('El usuario no tiene una compañía asociada');
    }

    if (!req.file) {
      throw AppError.badRequest('No se ha recibido ningún archivo de logo');
    }

    const logoUrl = `/${config.uploads.dir}/${req.file.filename}`;

    const company = await Company.findByIdAndUpdate(
      req.user.company,
      { logo: logoUrl },
      { new: true }
    );

    if (!company) {
      // Limpieza del archivo huérfano si la compañía no existe
      fs.unlink(req.file.path, () => {});
      throw AppError.notFound('Compañía no encontrada');
    }

    res.json({ ok: true, data: { company } });
  } catch (err) {
    next(err);
  }
};

// 6) GET /api/user — Obtener usuario autenticado
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('company');
    res.json({ ok: true, data: { user } });
  } catch (err) {
    next(err);
  }
};

// 7a) POST /api/user/refresh — Renovar access token
export const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    let payload;
    try {
      payload = jwt.verify(refreshToken, config.jwt.refreshSecret);
    } catch {
      throw AppError.unauthorized('Refresh token inválido o expirado');
    }

    const user = await User.findById(payload.sub).select('+refreshToken');

    if (!user || user.refreshToken !== refreshToken) {
      throw AppError.unauthorized('Refresh token inválido o expirado');
    }

    // Rotación del refresh token
    const { accessToken, refreshToken: newRefreshToken } = await issueTokens(user);

    res.json({ ok: true, data: { accessToken, refreshToken: newRefreshToken } });
  } catch (err) {
    next(err);
  }
};

// 7b) POST /api/user/logout — Cerrar sesión
export const logout = async (req, res, next) => {
  try {
    req.user.refreshToken = null;
    await req.user.save({ validateBeforeSave: false });

    res.json({ ok: true, message: 'Sesión cerrada correctamente' });
  } catch (err) {
    next(err);
  }
};

// 8) DELETE /api/user — Eliminar usuario (hard o soft)
export const deleteUser = async (req, res, next) => {
  try {
    const { soft } = req.query;

    if (soft) {
      req.user.deleted = true;
      req.user.refreshToken = null;
      await req.user.save({ validateBeforeSave: false });
    } else {
      await User.deleteOne({ _id: req.user._id });
    }

    notifier.emit(USER_EVENTS.DELETED, { user: req.user, soft });

    res.json({ ok: true, message: `Usuario eliminado (${soft ? 'soft' : 'hard'} delete)` });
  } catch (err) {
    next(err);
  }
};

// 9) PUT /api/user/password — Cambiar contraseña
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');

    if (!(await user.comparePassword(currentPassword))) {
      throw AppError.unauthorized('La contraseña actual es incorrecta');
    }

    user.password = newPassword;
    await user.save();

    res.json({ ok: true, message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    next(err);
  }
};

// 10) POST /api/user/invite — Invitar compañeros
export const invite = async (req, res, next) => {
  try {
    if (!req.user.company) {
      throw AppError.badRequest('Debes pertenecer a una compañía para invitar usuarios');
    }

    const { email, name, lastName } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      throw AppError.conflict('Ya existe un usuario con este email');
    }

    // Contraseña temporal aleatoria; el invitado debería cambiarla en su primer login
    const temporaryPassword = crypto.randomBytes(9).toString('base64url');

    const invitedUser = await User.create({
      email,
      password: temporaryPassword,
      name,
      lastName,
      role: 'guest',
      status: 'pending',
      company: req.user.company,
      verificationCode: generateVerificationCode(),
      verificationAttempts: 3
    });

    notifier.emit(USER_EVENTS.INVITED, { inviter: req.user, invited: invitedUser });

    res.status(201).json({
      ok: true,
      data: {
        user: publicUser(invitedUser),
        temporaryPassword
      }
    });
  } catch (err) {
    next(err);
  }
};
