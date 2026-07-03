import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { AppError } from '../utils/AppError.js';
import { User } from '../models/User.js';

// Verifica el access token JWT enviado en la cabecera Authorization: Bearer <token>
// y adjunta el usuario autenticado a req.user (sin password).
export const authenticate = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      throw AppError.unauthorized('Token de acceso no proporcionado');
    }

    const token = header.split(' ')[1];

    let payload;
    try {
      payload = jwt.verify(token, config.jwt.accessSecret);
    } catch {
      throw AppError.unauthorized('Token de acceso inválido o expirado');
    }

    const user = await User.findById(payload.sub);

    if (!user) {
      throw AppError.unauthorized('El usuario del token ya no existe');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};
