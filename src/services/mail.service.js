// Envío de emails (código de verificación) con Nodemailer (T13 / requisito
// "Envío de emails"). Si no hay credenciales SMTP configuradas, hace un
// fallback a console.log para que el desarrollo local no dependa de ellas.

import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

let transporter = null;

if (config.mail.enabled) {
  transporter = nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: config.mail.port === 465,
    auth: { user: config.mail.user, pass: config.mail.pass }
  });
}

export const sendVerificationEmail = async (to, code) => {
  const subject = 'Verifica tu cuenta de BildyApp';
  const text = `Tu código de verificación es: ${code}. Caduca tras 3 intentos fallidos.`;

  if (!transporter) {
    console.log(`[mail:fallback] Para: ${to} | Asunto: ${subject} | Código: ${code}`);
    return { delivered: false, fallback: true };
  }

  await transporter.sendMail({ from: config.mail.from, to, subject, text });
  return { delivered: true, fallback: false };
};
