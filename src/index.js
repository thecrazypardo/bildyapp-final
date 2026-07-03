import http from 'node:http';
import mongoose from 'mongoose';
import { app } from './app.js';
import { config } from './config/index.js';
import { initSocket, closeSocket } from './services/socket.service.js';

const httpServer = http.createServer(app);
initSocket(httpServer);

let server;

const start = async () => {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('✅ Conectado a MongoDB Atlas');

    server = httpServer.listen(config.port, () => {
      console.log(`🚀 BildyApp API escuchando en http://localhost:${config.port} (${config.env})`);
      console.log(`📚 Documentación Swagger en http://localhost:${config.port}/api-docs`);
    });
  } catch (err) {
    console.error('❌ Error al arrancar el servidor:', err);
    process.exit(1);
  }
};

start();

// --- Apagado ordenado (graceful shutdown) ---
const shutdown = async (signal) => {
  console.log(`\n${signal} recibido, cerrando el servidor de forma ordenada...`);
  try {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
      console.log('✅ Servidor HTTP cerrado');
    }
    await closeSocket();
    await mongoose.connection.close();
    console.log('✅ Conexión a MongoDB cerrada');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error durante el apagado:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});
