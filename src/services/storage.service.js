// Servicio de almacenamiento en la nube (T13). Usa Cloudinary si hay
// credenciales configuradas; si no, hace un fallback a almacenamiento
// local en /uploads para que el proyecto funcione también en desarrollo
// sin cuenta de Cloudinary.

import fs from 'node:fs';
import path from 'node:path';
import { v2 as cloudinary } from 'cloudinary';
import sharp from 'sharp';
import { config } from '../config/index.js';

if (config.cloudinary.enabled) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret
  });
}

// Optimiza una imagen de firma: máximo 800px de ancho, formato WebP.
export const optimizeSignatureImage = async (buffer) =>
  sharp(buffer).resize({ width: 800, withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();

// Sube un buffer (imagen ya optimizada o PDF) a Cloudinary, o lo guarda
// localmente en /uploads si Cloudinary no está configurado.
export const uploadBuffer = async (buffer, { folder, filename, resourceType = 'image' }) => {
  if (config.cloudinary.enabled) {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, public_id: filename, resource_type: resourceType, overwrite: true },
        (err, result) => (err ? reject(err) : resolve(result.secure_url))
      );
      stream.end(buffer);
    });
  }

  // Fallback local
  const dir = path.join(config.uploads.dir, folder);
  fs.mkdirSync(dir, { recursive: true });
  const ext = resourceType === 'raw' ? 'pdf' : 'webp';
  const filePath = path.join(dir, `${filename}.${ext}`);
  fs.writeFileSync(filePath, buffer);
  return `/${config.uploads.dir}/${folder}/${filename}.${ext}`;
};
