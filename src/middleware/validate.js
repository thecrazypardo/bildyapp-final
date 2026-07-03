import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';

// Middleware genérico de validación. Recibe un schema Zod que valida
// { body, query, params } y sustituye req.body/req.query por los datos
// ya transformados (transform de email a minúsculas, trims, etc).
export const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params
    });

    if (parsed.body) req.body = parsed.body;
    if (parsed.query) {
      // En Express 5, req.query es de solo lectura (no se puede reasignar
      // el objeto completo), así que mutamos sus propiedades en el sitio.
      for (const key of Object.keys(req.query)) delete req.query[key];
      Object.assign(req.query, parsed.query);
    }
    if (parsed.params) req.params = parsed.params;

    next();
  } catch (err) {
    if (err instanceof ZodError) {
      const details = err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message
      }));
      return next(AppError.badRequest('Error de validación', details));
    }
    next(err);
  }
};
