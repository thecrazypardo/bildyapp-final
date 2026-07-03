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

const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'ID no válido');

export const createClientSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'El nombre es obligatorio'),
    cif: z.string().trim().min(1, 'El CIF es obligatorio'),
    email: z.string().trim().email('Email no válido').optional(),
    phone: z.string().trim().optional(),
    address: addressSchema.optional()
  })
});

export const updateClientSchema = z.object({
  params: z.object({ id: objectId }),
  body: createClientSchema.shape.body.partial()
});

export const clientIdSchema = z.object({
  params: z.object({ id: objectId })
});

export const listClientsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    name: z.string().trim().optional(),
    sort: z.string().trim().optional()
  })
});

export const deleteClientSchema = z.object({
  params: z.object({ id: objectId }),
  query: z.object({
    soft: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => v === 'true')
  })
});
