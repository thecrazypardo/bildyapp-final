import multer from 'multer';
import { AppError } from '../utils/AppError.js';
import { logErrorToSlack } from '../services/logger.service.js';

// Middleware centralizado de errores (T6). Debe registrarse el último,
// después de todas las rutas.
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, _next) => {
  // Errores de Multer (p. ej. archivo demasiado grande)
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      ok: false,
      error: { code: 'UPLOAD_ERROR', message: err.message }
    });
  }

  // Errores de duplicado de Mongo (índices unique) no capturados explícitamente
  if (err.code === 11000) {
    return res.status(409).json({
      ok: false,
      error: { code: 'CONFLICT', message: 'El recurso ya existe', details: err.keyValue }
    });
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logErrorToSlack(err, req).catch(() => {});
    }
    return res.status(err.statusCode).json({
      ok: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {})
      }
    });
  }

  // Error no controlado / bug de programación → siempre es 5XX
  logErrorToSlack(err, req).catch(() => {});

  return res.status(500).json({
    ok: false,
    error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' }
  });
};

export const notFoundHandler = (req, _res, next) => {
  next(new AppError(`Ruta no encontrada: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND'));
};
