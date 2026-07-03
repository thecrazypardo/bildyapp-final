// Logging de errores 5XX a Slack mediante Incoming Webhook (T8).

import { config } from '../config/index.js';

export const logErrorToSlack = async (err, req) => {
  console.error('[5xx]', err);

  if (!config.slack.enabled) return;

  const payload = {
    text: [
      `:rotating_light: *Error 5XX en BildyApp API*`,
      `*Timestamp:* ${new Date().toISOString()}`,
      `*Ruta:* ${req.method} ${req.originalUrl}`,
      `*Mensaje:* ${err.message}`,
      `*Stack:*\n\`\`\`${(err.stack || '').slice(0, 1500)}\`\`\``
    ].join('\n')
  };

  try {
    await fetch(config.slack.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (slackErr) {
    console.error('[slack] No se pudo notificar el error a Slack:', slackErr.message);
  }
};
