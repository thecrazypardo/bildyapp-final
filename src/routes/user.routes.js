import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { uploadLogo } from '../middleware/upload.js';
import {
  registerSchema,
  validateEmailSchema,
  loginSchema,
  personalDataSchema,
  companySchema,
  refreshTokenSchema,
  changePasswordSchema,
  inviteSchema,
  deleteUserSchema
} from '../validators/user.validator.js';

export const userRouter = Router();

/**
 * @openapi
 * /api/user/register:
 *   post:
 *     summary: Registrar un nuevo usuario
 *     tags: [User]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       201: { description: Usuario creado, devuelve tokens }
 *       409: { description: Ya existe una cuenta verificada con ese email }
 *   put:
 *     summary: Completar datos personales (onboarding)
 *     tags: [User]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Usuario actualizado }
 */
// 1) Registro
userRouter.post('/register', validate(registerSchema), userController.register);

// 4a) Onboarding: datos personales (mismo path que registro, método PUT)
userRouter.put(
  '/register',
  authenticate,
  validate(personalDataSchema),
  userController.updatePersonalData
);

/**
 * @openapi
 * /api/user/validation:
 *   put:
 *     summary: Verificar el email con el código de 6 dígitos
 *     tags: [User]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Email verificado }
 *       400: { description: Código incorrecto }
 *       429: { description: Intentos agotados }
 */
// 2) Validación de email
userRouter.put(
  '/validation',
  authenticate,
  validate(validateEmailSchema),
  userController.validateEmail
);

/**
 * @openapi
 * /api/user/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [User]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Login correcto, devuelve tokens }
 *       401: { description: Credenciales incorrectas }
 */
// 3) Login
userRouter.post('/login', validate(loginSchema), userController.login);

/**
 * @openapi
 * /api/user/company:
 *   patch:
 *     summary: Crear o unirse a una compañía (onboarding)
 *     tags: [User]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Compañía asignada al usuario }
 */
// 4b) Onboarding: compañía
userRouter.patch(
  '/company',
  authenticate,
  validate(companySchema),
  userController.updateCompany
);

/**
 * @openapi
 * /api/user/logo:
 *   patch:
 *     summary: Subir el logo de la compañía
 *     tags: [User]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               logo: { type: string, format: binary }
 *     responses:
 *       200: { description: Logo actualizado }
 */
// 5) Logo de la compañía
userRouter.patch('/logo', authenticate, uploadLogo, userController.updateLogo);

/**
 * @openapi
 * /api/user:
 *   get:
 *     summary: Obtener el usuario autenticado (con su compañía populada)
 *     tags: [User]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Usuario actual }
 *   delete:
 *     summary: Eliminar el usuario (hard o soft delete)
 *     tags: [User]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: soft, schema: { type: boolean } }
 *     responses:
 *       200: { description: Usuario eliminado }
 */
// 6) Obtener usuario autenticado
userRouter.get('/', authenticate, userController.getMe);

/**
 * @openapi
 * /api/user/refresh:
 *   post:
 *     summary: Renovar el access token con el refresh token
 *     tags: [User]
 *     security: []
 *     responses:
 *       200: { description: Nuevos tokens }
 *       401: { description: Refresh token inválido o expirado }
 * /api/user/logout:
 *   post:
 *     summary: Cerrar sesión (invalida el refresh token)
 *     tags: [User]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Sesión cerrada }
 */
// 7) Sesión: refresh + logout
userRouter.post('/refresh', validate(refreshTokenSchema), userController.refresh);
userRouter.post('/logout', authenticate, userController.logout);

// 8) Eliminar usuario
userRouter.delete(
  '/',
  authenticate,
  validate(deleteUserSchema),
  userController.deleteUser
);

/**
 * @openapi
 * /api/user/password:
 *   put:
 *     summary: Cambiar la contraseña
 *     tags: [User]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Contraseña actualizada }
 *       401: { description: Contraseña actual incorrecta }
 */
// 9) Cambiar contraseña
userRouter.put(
  '/password',
  authenticate,
  validate(changePasswordSchema),
  userController.changePassword
);

/**
 * @openapi
 * /api/user/invite:
 *   post:
 *     summary: Invitar a un compañero a la misma compañía (solo admin)
 *     tags: [User]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Usuario invitado }
 *       403: { description: Se requiere rol admin }
 *       409: { description: Ya existe un usuario con ese email }
 */
// 10) Invitar compañeros (solo admin)
userRouter.post(
  '/invite',
  authenticate,
  requireRole('admin'),
  validate(inviteSchema),
  userController.invite
);
