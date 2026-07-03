import { Router } from 'express';
import * as projectController from '../controllers/project.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireCompany } from '../middleware/require-company.js';
import {
  createProjectSchema,
  updateProjectSchema,
  projectIdSchema,
  listProjectsSchema,
  deleteProjectSchema
} from '../validators/project.validator.js';

export const projectRouter = Router();

projectRouter.use(authenticate, requireCompany);

/**
 * @openapi
 * /api/project:
 *   post:
 *     summary: Crear un proyecto
 *     tags: [Project]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ProjectInput' }
 *     responses:
 *       201: { description: Proyecto creado }
 *       409: { description: Ya existe un proyecto con ese código }
 *   get:
 *     summary: Listar proyectos de la compañía
 *     tags: [Project]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *       - { in: query, name: client, schema: { type: string } }
 *       - { in: query, name: name, schema: { type: string } }
 *       - { in: query, name: active, schema: { type: boolean } }
 *       - { in: query, name: sort, schema: { type: string } }
 *     responses:
 *       200: { description: Lista paginada de proyectos }
 */
projectRouter.post('/', validate(createProjectSchema), projectController.createProject);
projectRouter.get('/', validate(listProjectsSchema), projectController.listProjects);

/**
 * @openapi
 * /api/project/archived:
 *   get:
 *     summary: Listar proyectos archivados
 *     tags: [Project]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista de proyectos archivados }
 */
projectRouter.get('/archived', validate(listProjectsSchema), projectController.listArchivedProjects);

/**
 * @openapi
 * /api/project/{id}:
 *   get:
 *     summary: Obtener un proyecto (con su cliente populado)
 *     tags: [Project]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Proyecto encontrado }
 *       404: { description: Proyecto no encontrado }
 *   put:
 *     summary: Actualizar un proyecto
 *     tags: [Project]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Proyecto actualizado }
 *   delete:
 *     summary: Archivar o borrar un proyecto
 *     tags: [Project]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *       - { in: query, name: soft, schema: { type: boolean } }
 *     responses:
 *       200: { description: Proyecto eliminado }
 */
projectRouter.get('/:id', validate(projectIdSchema), projectController.getProject);
projectRouter.put('/:id', validate(updateProjectSchema), projectController.updateProject);
projectRouter.delete('/:id', validate(deleteProjectSchema), projectController.deleteProject);

/**
 * @openapi
 * /api/project/{id}/restore:
 *   patch:
 *     summary: Restaurar un proyecto archivado
 *     tags: [Project]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Proyecto restaurado }
 */
projectRouter.patch('/:id/restore', validate(projectIdSchema), projectController.restoreProject);
