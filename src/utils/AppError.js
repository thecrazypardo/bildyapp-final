// Clase de error personalizada para errores "operacionales" (esperados),
// distintos de bugs de programación. El middleware centralizado de errores
// los reconoce por la propiedad `isOperational`.

export class AppError extends Error {
  constructor(message, statusCode, code = 'ERROR', details = undefined) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Petición incorrecta', details) {
    return new AppError(message, 400, 'BAD_REQUEST', details);
  }

  static unauthorized(message = 'No autorizado') {
    return new AppError(message, 401, 'UNAUTHORIZED');
  }

  static forbidden(message = 'Acceso prohibido') {
    return new AppError(message, 403, 'FORBIDDEN');
  }

  static notFound(message = 'Recurso no encontrado') {
    return new AppError(message, 404, 'NOT_FOUND');
  }

  static conflict(message = 'El recurso ya existe') {
    return new AppError(message, 409, 'CONFLICT');
  }

  static tooManyRequests(message = 'Demasiados intentos') {
    return new AppError(message, 429, 'TOO_MANY_REQUESTS');
  }

  static internal(message = 'Error interno del servidor') {
    return new AppError(message, 500, 'INTERNAL_ERROR');
  }
}
