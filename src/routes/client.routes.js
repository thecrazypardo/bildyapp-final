import { Router } from 'express';
import * as clientController from '../controllers/client.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireCompany } from '../middleware/require-company.js';
import {
  createClientSchema,
  updateClientSchema,
  clientIdSchema,
  listClientsSchema,
  deleteClientSchema
} from '../validators/client.validator.js';

export const clientRouter = Router();

clientRouter.use(authenticate, requireCompany);

/**
 * @openapi
 * /api/client:
 *   post:
 *     summary: Crear un cliente
 *     tags: [Client]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ClientInput' }
 *     responses:
 *       201: { description: Cliente creado }
 *       400: { description: Datos inválidos }
 *       409: { description: Ya existe un cliente con ese CIF }
 *   get:
 *     summary: Listar clientes de la compañía
 *     tags: [Client]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *       - { in: query, name: name, schema: { type: string } }
 *       - { in: query, name: sort, schema: { type: string } }
 *     responses:
 *       200: { description: Lista paginada de clientes }
 */
clientRouter.post('/', validate(createClientSchema), clientController.createClient);
clientRouter.get('/', validate(listClientsSchema), clientController.listClients);

/**
 * @openapi
 * /api/client/archived:
 *   get:
 *     summary: Listar clientes archivados
 *     tags: [Client]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista de clientes archivados }
 */
clientRouter.get('/archived', validate(listClientsSchema), clientController.listArchivedClients);

/**
 * @openapi
 * /api/client/{id}:
 *   get:
 *     summary: Obtener un cliente
 *     tags: [Client]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Cliente encontrado }
 *       404: { description: Cliente no encontrado }
 *   put:
 *     summary: Actualizar un cliente
 *     tags: [Client]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Cliente actualizado }
 *   delete:
 *     summary: Archivar o borrar un cliente
 *     tags: [Client]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *       - { in: query, name: soft, schema: { type: boolean } }
 *     responses:
 *       200: { description: Cliente eliminado }
 */
clientRouter.get('/:id', validate(clientIdSchema), clientController.getClient);
clientRouter.put('/:id', validate(updateClientSchema), clientController.updateClient);
clientRouter.delete('/:id', validate(deleteClientSchema), clientController.deleteClient);

/**
 * @openapi
 * /api/client/{id}/restore:
 *   patch:
 *     summary: Restaurar un cliente archivado
 *     tags: [Client]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Cliente restaurado }
 *       404: { description: Cliente archivado no encontrado }
 */
clientRouter.patch('/:id/restore', validate(clientIdSchema), clientController.restoreClient);
