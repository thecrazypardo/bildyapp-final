import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID no válido');

const workerSchema = z.object({
  name: z.string().trim().min(1),
  hours: z.number().nonnegative()
});

const baseFields = {
  project: objectId,
  client: objectId,
  description: z.string().trim().optional(),
  workDate: z.coerce.date({ required_error: 'La fecha de trabajo es obligatoria' })
};

const materialSchema = z.object({
  format: z.literal('material'),
  ...baseFields,
  material: z.string().trim().min(1, 'El material es obligatorio'),
  quantity: z.number().positive('La cantidad debe ser mayor que 0'),
  unit: z.string().trim().min(1, 'La unidad es obligatoria')
});

const hoursSchema = z.object({
  format: z.literal('hours'),
  ...baseFields,
  hours: z.number().positive().optional(),
  workers: z.array(workerSchema).optional()
});

const deliveryNoteBodySchema = z
  .discriminatedUnion('format', [materialSchema, hoursSchema])
  .superRefine((data, ctx) => {
    if (data.format === 'hours' && data.hours === undefined && !(data.workers && data.workers.length > 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debes indicar "hours" o al menos un elemento en "workers"',
        path: ['hours']
      });
    }
  });

export const createDeliveryNoteSchema = z.object({ body: deliveryNoteBodySchema });

export const deliveryNoteIdSchema = z.object({
  params: z.object({ id: objectId })
});

export const listDeliveryNotesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    project: objectId.optional(),
    client: objectId.optional(),
    format: z.enum(['material', 'hours']).optional(),
    signed: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === 'true')),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    sort: z.string().trim().optional()
  })
});
