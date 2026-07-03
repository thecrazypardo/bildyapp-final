# BildyApp API — Digitalización de Albaranes

API REST con Node.js 22 + Express 5 para la digitalización de albaranes de obra de **BildyApp**: gestión de usuarios y compañías (heredado de la práctica intermedia), clientes, proyectos y albaranes (material u horas) con firma digital y generación de PDF.

## Tecnologías

- Node.js 22 (ESM, `--watch`, `--env-file`)
- Express 5 + Socket.IO (notificaciones en tiempo real por compañía)
- MongoDB Atlas + Mongoose (multi-tenant por `company`, soft delete, índices únicos compuestos)
- Zod (validación con `discriminatedUnion`, `refine`, `coerce`)
- JWT + bcrypt, Helmet, `express-rate-limit`, sanitización NoSQL propia
- Multer + Sharp (procesado de imágenes de firma)
- Cloudinary (almacenamiento de firmas y PDFs, con fallback local en `/uploads`)
- PDFKit (generación de albaranes en PDF)
- Nodemailer (envío de emails de verificación, con fallback a consola)
- Slack Incoming Webhooks (notificación de errores 5XX)
- Swagger / OpenAPI 3 (`swagger-jsdoc` + `swagger-ui-express`)
- Jest + Supertest + `mongodb-memory-server` (tests de integración)
- Docker + GitHub Actions (CI)

## Estructura del proyecto

```
src/
├── config/            # config centralizada + swagger.js
├── controllers/        # user, client, project, deliverynote
├── middleware/         # auth, validate, roles, upload, sanitize, require-company, error-handler
├── models/             # User, Company, Client, Project, DeliveryNote
├── routes/             # un router por recurso + index.js (apiRouter)
├── services/            # notification (EventEmitter), mail, storage, pdf, logger (Slack), socket.io
├── utils/                # AppError, pagination
├── validators/           # esquemas Zod por recurso
├── app.js               # Express: middlewares, swagger, rutas, errores
└── index.js              # servidor HTTP + Socket.IO + graceful shutdown
tests/                    # Jest + Supertest + mongodb-memory-server
Dockerfile / docker-compose.yml
.github/workflows/ci.yml  # tests + build de Docker en cada push
requests.http             # colección de ejemplos de todos los endpoints
```

## Instalación

```bash
npm install
cp .env.example .env   # y rellena tus credenciales
npm run dev
```

El servidor arranca en `http://localhost:3000`. Documentación interactiva en **`http://localhost:3000/api-docs`**.

### Variables de entorno opcionales

`CLOUDINARY_*`, `SMTP_*` y `SLACK_WEBHOOK_URL` son opcionales: si se dejan vacías, el proyecto sigue funcionando con fallbacks (almacenamiento local, log a consola, sin notificación a Slack), útil para desarrollo sin cuentas externas.

## Tests

```bash
npm test
```

Usa `mongodb-memory-server`, así que no necesitas una base de datos real para ejecutar los tests. Cubren el flujo completo de usuario (registro → verificación → onboarding → compañía), CRUD de clientes y proyectos, aislamiento multi-tenant (un usuario no puede ver los datos de otra compañía), y el ciclo de vida de un albarán (creación, validación de formato, firma y borrado).

## Docker

```bash
docker compose up --build
```

## Modelo de datos y multi-tenancy

Todos los recursos de negocio (`Client`, `Project`, `DeliveryNote`) llevan un campo `company` y **todas** las consultas de sus controladores filtran explícitamente por `company: req.user.company`, garantizando que un usuario nunca vea datos de otra compañía aunque conozca el ID del recurso.

- **Client**: `cif` único por compañía (no globalmente).
- **Project**: `projectCode` único por compañía, referencia obligatoria a un `Client` de la misma compañía.
- **DeliveryNote**: referencia a `Client` y `Project`, con `format` discriminado (`material` u `hours`) validado con Zod; una vez `signed: true` no se puede borrar.

## Tiempo real (Socket.IO)

Cada socket se autentica con el mismo JWT de acceso (`socket.handshake.auth.token`) y se une automáticamente a la room `company:<id>`. Eventos emitidos: `client:new`, `project:new`, `deliverynote:new`, `deliverynote:signed`.

## Notas de diseño

- **Soft delete**: hooks `pre(/^find/)` en los modelos excluyen documentos `deleted: true` por defecto; los endpoints `/archived` los recuperan explícitamente con `includeDeleted`.
- **Firma de albaranes**: la imagen se procesa con Sharp (máx. 800px, WebP) antes de subirse, y se genera un PDF final con PDFKit que también se sube a Cloudinary (o `/uploads` en local).
- **Errores 5XX**: se notifican automáticamente a un canal de Slack vía Incoming Webhook, además de quedar registrados en consola.
- **Swagger**: la especificación se genera a partir de comentarios JSDoc (`@openapi`) en cada fichero de rutas; disponible en `/api-docs` (UI) y `/api-docs.json` (spec cruda).
