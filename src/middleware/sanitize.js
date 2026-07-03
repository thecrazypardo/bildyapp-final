// Sanitización contra inyección NoSQL (T6), implementada a mano porque
// `express-mongo-sanitize` intenta reescribir `req.query`, que en Express 5
// es una propiedad de solo lectura (getter) y provoca un TypeError.
//
// Elimina de forma recursiva cualquier clave que empiece por "$" o que
// contenga un ".", que son los caracteres que MongoDB interpreta como
// operadores y permitirían una inyección de query.

const isPlainObject = (value) =>
  Object.prototype.toString.call(value) === '[object Object]';

const sanitizeValue = (value) => {
  if (Array.isArray(value)) {
    return value.forEach(sanitizeValue);
  }

  if (isPlainObject(value)) {
    for (const key of Object.keys(value)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete value[key];
        continue;
      }
      sanitizeValue(value[key]);
    }
  }
};

export const sanitizeInput = (req, _res, next) => {
  // req.body y req.params sí son reescribibles en Express 5;
  // req.query se sanea "in place" sin reasignar el objeto completo.
  if (req.body) sanitizeValue(req.body);
  if (req.params) sanitizeValue(req.params);
  if (req.query) sanitizeValue(req.query);
  next();
};
