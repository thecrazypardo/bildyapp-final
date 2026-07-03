import { Router } from 'express';
import * as deliveryNoteController from '../controllers/deliverynote.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireCompany } from '../middleware/require-company.js';
import { uploadSignature } from '../middleware/upload.js';
import {
  createDeliveryNoteSchema,
  deliveryNoteIdSchema,
  listDeliveryNotesSchema
} from '../validators/deliverynote.validator.js';

export const deliveryNoteRouter = Router();

deliveryNoteRouter.use(authenticate, requireCompany);

/**
 * @openapi
 * /api/deliverynote:
 *   post:
 *     summary: Crear un albarán (material u horas)
 *     tags: [DeliveryNote]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/DeliveryNoteInput' }
 *     responses:
 *       201: { description: Albarán creado }
 *       400: { description: Cliente o proyecto no válido }
 *   get:
 *     summary: Listar albaranes con filtros y paginación
 *     tags: [DeliveryNote]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *       - { in: query, name: project, schema: { type: string } }
 *       - { in: query, name: client, schema: { type: string } }
 *       - { in: query, name: format, schema: { type: string, enum: [material, hours] } }
 *       - { in: query, name: signed, schema: { type: boolean } }
 *       - { in: query, name: from, schema: { type: string, format: date } }
 *       - { in: query, name: to, schema: { type: string, format: date } }
 *       - { in: query, name: sort, schema: { type: string } }
 *     responses:
 *       200: { description: Lista paginada de albaranes }
 */
deliveryNoteRouter.post('/', validate(createDeliveryNoteSchema), deliveryNoteController.createDeliveryNote);
deliveryNoteRouter.get('/', validate(listDeliveryNotesSchema), deliveryNoteController.listDeliveryNotes);

/**
 * @openapi
 * /api/deliverynote/pdf/{id}:
 *   get:
 *     summary: Descargar el albarán en PDF
 *     tags: [DeliveryNote]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Fichero PDF }
 *       403: { description: Sin permiso para descargar este albarán }
 *       404: { description: Albarán no encontrado }
 */
deliveryNoteRouter.get(
  '/pdf/:id',
  validate(deliveryNoteIdSchema),
  deliveryNoteController.downloadDeliveryNotePdf
);

/**
 * @openapi
 * /api/deliverynote/{id}:
 *   get:
 *     summary: Obtener un albarán concreto (con user, client y project populados)
 *     tags: [DeliveryNote]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Albarán encontrado }
 *       404: { description: Albarán no encontrado }
 *   delete:
 *     summary: Borrar un albarán (solo si no está firmado)
 *     tags: [DeliveryNote]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Albarán eliminado }
 *       403: { description: No se puede borrar un albarán firmado }
 */
deliveryNoteRouter.get('/:id', validate(deliveryNoteIdSchema), deliveryNoteController.getDeliveryNote);
deliveryNoteRouter.delete('/:id', validate(deliveryNoteIdSchema), deliveryNoteController.deleteDeliveryNote);

/**
 * @openapi
 * /api/deliverynote/{id}/sign:
 *   patch:
 *     summary: Firmar un albarán (sube la firma y genera el PDF final)
 *     tags: [DeliveryNote]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               signature: { type: string, format: binary }
 *     responses:
 *       200: { description: Albarán firmado }
 *       400: { description: Ya estaba firmado o falta la imagen }
 */
deliveryNoteRouter.patch(
  '/:id/sign',
  validate(deliveryNoteIdSchema),
  uploadSignature,
  deliveryNoteController.signDeliveryNote
);
