import { AppError } from '../utils/AppError.js';

// Middleware de autorización por roles. Debe usarse siempre después de
// `authenticate`, que adjunta req.user.
// Uso: router.post('/invite', authenticate, requireRole('admin'), controller)
export const requireRole =
  (...allowedRoles) =>
  (req, _res, next) => {
    if (!req.user) {
      return next(AppError.unauthorized('No autenticado'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        AppError.forbidden(
          `Se requiere uno de los siguientes roles: ${allowedRoles.join(', ')}`
        )
      );
    }

    next();
  };
