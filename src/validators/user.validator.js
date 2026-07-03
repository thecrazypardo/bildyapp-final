import { z } from 'zod';

// --- Bloques reutilizables ---
const emailField = z
  .string({ required_error: 'El email es obligatorio' })
  .trim()
  .email('Email no válido')
  .transform((v) => v.toLowerCase());

const passwordField = z
  .string({ required_error: 'La contraseña es obligatoria' })
  .min(8, 'La contraseña debe tener al menos 8 caracteres');

const addressSchema = z
  .object({
    street: z.string().trim().optional(),
    number: z.string().trim().optional(),
    postal: z.string().trim().optional(),
    city: z.string().trim().optional(),
    province: z.string().trim().optional()
  })
  .partial();

// 1) Registro — POST /api/user/register
export const registerSchema = z.object({
  body: z.object({
    email: emailField,
    password: passwordField
  })
});

// 2) Validación de email — PUT /api/user/validation
export const validateEmailSchema = z.object({
  body: z.object({
    code: z
      .string({ required_error: 'El código es obligatorio' })
      .trim()
      .length(6, 'El código debe tener exactamente 6 dígitos')
      .regex(/^\d{6}$/, 'El código debe contener solo dígitos')
  })
});

// 3) Login — POST /api/user/login
export const loginSchema = z.object({
  body: z.object({
    email: emailField,
    password: z.string({ required_error: 'La contraseña es obligatoria' }).min(1)
  })
});

// 4a) Onboarding datos personales — PUT /api/user/register
export const personalDataSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'El nombre es obligatorio'),
    lastName: z.string().trim().min(1, 'Los apellidos son obligatorios'),
    nif: z.string().trim().min(1, 'El NIF es obligatorio')
  })
});

// 4b) Onboarding compañía — PATCH /api/user/company
// Usa discriminatedUnion sobre isFreelance para validación condicional (bonus).
const freelanceCompanySchema = z.object({
  isFreelance: z.literal(true),
  // Si es autónomo, estos campos son opcionales porque se auto-rellenan
  // con los datos personales del usuario en el controlador.
  name: z.string().trim().optional(),
  cif: z.string().trim().optional(),
  address: addressSchema.optional()
});

const regularCompanySchema = z.object({
  isFreelance: z.literal(false),
  name: z.string().trim().min(1, 'El nombre de la compañía es obligatorio'),
  cif: z.string().trim().min(1, 'El CIF es obligatorio'),
  address: addressSchema.optional()
});

export const companySchema = z.object({
  body: z.discriminatedUnion('isFreelance', [
    freelanceCompanySchema,
    regularCompanySchema
  ])
});

// 7a) Refresh token — POST /api/user/refresh
export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string({ required_error: 'El refreshToken es obligatorio' }).min(1)
  })
});

// 9) Cambiar contraseña — PUT /api/user/password
export const changePasswordSchema = z.object({
  body: z
    .object({
      currentPassword: z.string({ required_error: 'La contraseña actual es obligatoria' }),
      newPassword: passwordField
    })
    .refine((data) => data.currentPassword !== data.newPassword, {
      message: 'La nueva contraseña debe ser diferente de la actual',
      path: ['newPassword']
    })
});

// 10) Invitar compañeros — POST /api/user/invite
export const inviteSchema = z.object({
  body: z.object({
    email: emailField,
    name: z.string().trim().optional(),
    lastName: z.string().trim().optional()
  })
});

// Query param ?soft=true para DELETE /api/user
export const deleteUserSchema = z.object({
  query: z.object({
    soft: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => v === 'true')
  })
});
