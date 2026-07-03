import { DeliveryNote } from '../models/DeliveryNote.js';
import { Client } from '../models/Client.js';
import { Project } from '../models/Project.js';
import { AppError } from '../utils/AppError.js';
import { paginate } from '../utils/pagination.js';
import { emitToCompany } from '../services/socket.service.js';
import { generateDeliveryNotePdf } from '../services/pdf.service.js';
import { optimizeSignatureImage, uploadBuffer } from '../services/storage.service.js';

// POST /api/deliverynote
export const createDeliveryNote = async (req, res, next) => {
  try {
    const { client, project } = req.body;

    const [existingClient, existingProject] = await Promise.all([
      Client.findOne({ _id: client, company: req.user.company }),
      Project.findOne({ _id: project, company: req.user.company })
    ]);

    if (!existingClient) throw AppError.badRequest('El cliente indicado no existe en tu compañía');
    if (!existingProject) throw AppError.badRequest('El proyecto indicado no existe en tu compañía');
    if (existingProject.client.toString() !== client) {
      throw AppError.badRequest('El proyecto indicado no pertenece a ese cliente');
    }

    const deliveryNote = await DeliveryNote.create({
      ...req.body,
      user: req.user._id,
      company: req.user.company
    });

    emitToCompany(req.user.company, 'deliverynote:new', deliveryNote);

    res.status(201).json({ ok: true, data: { deliveryNote } });
  } catch (err) {
    next(err);
  }
};

// GET /api/deliverynote
export const listDeliveryNotes = async (req, res, next) => {
  try {
    const { page, limit, project, client, format, signed, from, to, sort } = req.query;
    const filter = { company: req.user.company };

    if (project) filter.project = project;
    if (client) filter.client = client;
    if (format) filter.format = format;
    if (signed !== undefined) filter.signed = signed;
    if (from || to) {
      filter.workDate = {};
      if (from) filter.workDate.$gte = from;
      if (to) filter.workDate.$lte = to;
    }

    const { items, pagination } = await paginate(DeliveryNote, filter, {
      page,
      limit,
      sort: sort || '-workDate'
    });

    res.json({ ok: true, data: { deliveryNotes: items, ...pagination } });
  } catch (err) {
    next(err);
  }
};

// GET /api/deliverynote/:id
export const getDeliveryNote = async (req, res, next) => {
  try {
    const deliveryNote = await DeliveryNote.findOne({
      _id: req.params.id,
      company: req.user.company
    })
      .populate('user', 'email name lastName')
      .populate('client')
      .populate('project');

    if (!deliveryNote) throw AppError.notFound('Albarán no encontrado');

    res.json({ ok: true, data: { deliveryNote } });
  } catch (err) {
    next(err);
  }
};

// GET /api/deliverynote/pdf/:id
export const downloadDeliveryNotePdf = async (req, res, next) => {
  try {
    const deliveryNote = await DeliveryNote.findOne({
      _id: req.params.id,
      company: req.user.company
    })
      .populate('user', 'email name lastName')
      .populate('client')
      .populate('project');

    if (!deliveryNote) throw AppError.notFound('Albarán no encontrado');

    // Solo el propio autor o un guest de la misma compañía puede descargarlo
    const isOwner = deliveryNote.user._id.toString() === req.user._id.toString();
    const isCompanyGuest = req.user.role === 'guest' && req.user.company.toString() === deliveryNote.company.toString();
    if (!isOwner && !isCompanyGuest && req.user.role !== 'admin') {
      throw AppError.forbidden('No tienes permiso para descargar este albarán');
    }

    // Si ya está firmado y el PDF está en la nube, redirige a esa URL
    if (deliveryNote.signed && deliveryNote.pdfUrl) {
      return res.redirect(deliveryNote.pdfUrl);
    }

    const pdfBuffer = await generateDeliveryNotePdf({
      deliveryNote,
      user: deliveryNote.user,
      client: deliveryNote.client,
      project: deliveryNote.project,
      company: req.user.company
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="albaran-${deliveryNote._id}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/deliverynote/:id/sign
export const signDeliveryNote = async (req, res, next) => {
  try {
    const deliveryNote = await DeliveryNote.findOne({
      _id: req.params.id,
      company: req.user.company
    })
      .populate('user', 'email name lastName')
      .populate('client')
      .populate('project');

    if (!deliveryNote) throw AppError.notFound('Albarán no encontrado');
    if (deliveryNote.signed) throw AppError.badRequest('El albarán ya está firmado');
    if (!req.file) throw AppError.badRequest('Debes adjuntar la imagen de la firma');

    // Optimiza la firma (máx. 800px de ancho, WebP) y la sube a la nube
    const optimized = await optimizeSignatureImage(req.file.buffer);
    const signatureUrl = await uploadBuffer(optimized, {
      folder: `signatures/${req.user.company}`,
      filename: `signature-${deliveryNote._id}`,
      resourceType: 'image'
    });

    deliveryNote.signed = true;
    deliveryNote.signedAt = new Date();
    deliveryNote.signatureUrl = signatureUrl;

    // Genera el PDF final firmado y lo sube también a la nube
    const pdfBuffer = await generateDeliveryNotePdf({
      deliveryNote,
      user: deliveryNote.user,
      client: deliveryNote.client,
      project: deliveryNote.project,
      company: req.user.company
    });
    const pdfUrl = await uploadBuffer(pdfBuffer, {
      folder: `delivery-notes/${req.user.company}`,
      filename: `albaran-${deliveryNote._id}`,
      resourceType: 'raw'
    });
    deliveryNote.pdfUrl = pdfUrl;

    await deliveryNote.save();

    emitToCompany(req.user.company, 'deliverynote:signed', deliveryNote);

    res.json({ ok: true, data: { deliveryNote } });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/deliverynote/:id
export const deleteDeliveryNote = async (req, res, next) => {
  try {
    const deliveryNote = await DeliveryNote.findOne({
      _id: req.params.id,
      company: req.user.company
    });

    if (!deliveryNote) throw AppError.notFound('Albarán no encontrado');
    if (deliveryNote.signed) {
      throw AppError.forbidden('No se puede borrar un albarán ya firmado');
    }

    await DeliveryNote.deleteOne({ _id: deliveryNote._id });

    res.json({ ok: true, message: 'Albarán eliminado' });
  } catch (err) {
    next(err);
  }
};
