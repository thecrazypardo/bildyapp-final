// Configuración centralizada de la aplicación.
// Todas las variables de entorno se leen aquí una única vez (T1: --env-file=.env)

const required = (name, fallback) => {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Falta la variable de entorno obligatoria: ${name}`);
  }
  return value;
};

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,

  mongoUri: required('MONGO_URI'),

  jwt: {
    accessSecret: required('JWT_SECRET'),
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshSecret: required('JWT_REFRESH_SECRET'),
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d'
  },

  uploads: {
    dir: 'uploads',
    maxLogoSizeMb: Number(process.env.MAX_LOGO_SIZE_MB) || 5
  },

  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX) || 100
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    enabled: Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
    )
  },

  mail: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'BildyApp <no-reply@bildyapp.test>',
    enabled: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
  },

  slack: {
    webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
    enabled: Boolean(process.env.SLACK_WEBHOOK_URL)
  },

  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000'
};
