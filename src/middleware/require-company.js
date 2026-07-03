import { AppError } from '../utils/AppError.js';

// Exige que el usuario autenticado ya haya completado el onboarding de
// compañía. Debe usarse después de `authenticate`.
export const requireCompany = (req, _res, next) => {
  if (!req.user.company) {
    return next(
      AppError.badRequest('Debes completar el onboarding de compañía antes de continuar')
    );
  }
  next();
};
