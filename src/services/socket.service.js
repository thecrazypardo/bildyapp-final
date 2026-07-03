// Notificaciones en tiempo real con Socket.IO (T10).
// Cada socket se autentica con el mismo JWT de acceso que usa la API REST
// y se une automáticamente a la room de su compañía, de forma que los
// eventos solo llegan a usuarios de la misma empresa.

import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { User } from '../models/User.js';

let io = null;

const companyRoom = (companyId) => `company:${companyId}`;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: '*' }
  });

  // Middleware de autenticación de Socket.IO: exige el mismo JWT de acceso
  // que se usa en las peticiones REST, enviado en `socket.handshake.auth.token`.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) return next(new Error('Token de acceso no proporcionado'));

      const payload = jwt.verify(token, config.jwt.accessSecret);
      const user = await User.findById(payload.sub);

      if (!user) return next(new Error('Usuario no encontrado'));

      socket.user = user;
      next();
    } catch {
      next(new Error('Token de acceso inválido o expirado'));
    }
  });

  io.on('connection', (socket) => {
    if (socket.user.company) {
      socket.join(companyRoom(socket.user.company));
    }

    socket.on('disconnect', () => {
      // No-op: Socket.IO limpia las rooms automáticamente al desconectar.
    });
  });

  return io;
};

// Emite un evento a todos los sockets conectados de una compañía concreta.
// No lanza si Socket.IO no se ha inicializado (por ejemplo, en tests).
export const emitToCompany = (companyId, event, payload) => {
  if (!io || !companyId) return;
  io.to(companyRoom(companyId)).emit(event, payload);
};

export const closeSocket = async () => {
  if (!io) return;
  await new Promise((resolve) => io.close(resolve));
  io = null;
};
