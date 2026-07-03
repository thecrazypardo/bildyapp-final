import { z } from 'zod';

const addressSchema = z
  .object({
    street: z.string().trim().optional(),
    number: z.string().trim().optional(),
    postal: z.string().trim().optional(),
    city: z.string().trim().optional(),
    province: z.string().trim().optional()
  })
  .partial();

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID no válido');

export const createProjectSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'El nombre es obligatorio'),
    projectCode: z.string().trim().min(1, 'El código de proyecto es obligatorio'),
    client: objectId,
    address: addressSchema.optional(),
    email: z.string().trim().email('Email no válido').optional(),
    notes: z.string().trim().optional(),
    active: z.boolean().optional()
  })
});

export const updateProjectSchema = z.object({
  params: z.object({ id: objectId }),
  body: createProjectSchema.shape.body.partial()
});

export const projectIdSchema = z.object({
  params: z.object({ id: objectId })
});

export const listProjectsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    client: objectId.optional(),
    name: z.string().trim().optional(),
    active: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === 'true')),
    sort: z.string().trim().optional()
  })
});

export const deleteProjectSchema = z.object({
  params: z.object({ id: objectId }),
  query: z.object({
    soft: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => v === 'true')
  })
});
