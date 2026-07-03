// Servicio de eventos del ciclo de vida del usuario (T2: EventEmitter).
// En la práctica final estos listeners enviarían notificaciones a Slack;
// por ahora simplemente hacen log por consola.

import { EventEmitter } from 'node:events';

class NotificationService extends EventEmitter {}

export const notifier = new NotificationService();

export const USER_EVENTS = {
  REGISTERED: 'user:registered',
  VERIFIED: 'user:verified',
  INVITED: 'user:invited',
  DELETED: 'user:deleted'
};

notifier.on(USER_EVENTS.REGISTERED, (user) => {
  console.log(`[event] user:registered -> ${user.email} (${user._id})`);
});

notifier.on(USER_EVENTS.VERIFIED, (user) => {
  console.log(`[event] user:verified -> ${user.email} (${user._id})`);
});

notifier.on(USER_EVENTS.INVITED, ({ inviter, invited }) => {
  console.log(
    `[event] user:invited -> ${inviter.email} invitó a ${invited.email} a la compañía ${invited.company}`
  );
});

notifier.on(USER_EVENTS.DELETED, ({ user, soft }) => {
  console.log(
    `[event] user:deleted -> ${user.email} (${user._id}) [${soft ? 'soft' : 'hard'} delete]`
  );
});
