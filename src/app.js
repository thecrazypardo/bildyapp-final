import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import mongoose from 'mongoose';

import { config } from './config/index.js';
import { apiRouter } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { sanitizeInput } from './middleware/sanitize.js';
import { swaggerSpec } from './config/swagger.js';

export const app = express();

// --- Seguridad (T6) ---
app.use(helmet());
app.use(cors());

app.use(
  rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      ok: false,
      error: { code: 'TOO_MANY_REQUESTS', message: 'Demasiadas peticiones, inténtalo más tarde' }
    }
  })
);

// --- Parsers ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sanitización contra inyección NoSQL (debe ir tras los parsers de body)
app.use(sanitizeInput);

// --- Archivos estáticos (logos subidos, fallback local de firmas/PDFs) ---
app.use(`/${config.uploads.dir}`, express.static(config.uploads.dir));

// --- Documentación interactiva (Swagger / OpenAPI) ---
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));

// --- Health check (T11): comprueba también la conexión a MongoDB ---
app.get('/health', (_req, res) => {
  const dbState = mongoose.connection.readyState; // 1 = connected
  res.status(dbState === 1 ? 200 : 503).json({
    ok: dbState === 1,
    service: 'bildyapp-api',
    uptime: process.uptime(),
    db: dbState === 1 ? 'connected' : 'disconnected'
  });
});

// --- Rutas de la API ---
app.use('/api', apiRouter);

// --- Manejo de errores (siempre al final) ---
app.use(notFoundHandler);
app.use(errorHandler);
