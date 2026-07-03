import { Client } from '../models/Client.js';
import { AppError } from '../utils/AppError.js';
import { paginate } from '../utils/pagination.js';
import { emitToCompany } from '../services/socket.service.js';

// POST /api/client
export const createClient = async (req, res, next) => {
  try {
    const { name, cif, email, phone, address } = req.body;
    const normalizedCif = cif.toUpperCase().trim();

    const existing = await Client.findOne({ company: req.user.company, cif: normalizedCif });
    if (existing) {
      throw AppError.conflict('Ya existe un cliente con este CIF en tu compañía');
    }

    const client = await Client.create({
      user: req.user._id,
      company: req.user.company,
      name,
      cif: normalizedCif,
      email,
      phone,
      address
    });

    emitToCompany(req.user.company, 'client:new', client);

    res.status(201).json({ ok: true, data: { client } });
  } catch (err) {
    next(err);
  }
};

// PUT /api/client/:id
export const updateClient = async (req, res, next) => {
  try {
    const update = { ...req.body };
    if (update.cif) update.cif = update.cif.toUpperCase().trim();

    if (update.cif) {
      const existing = await Client.findOne({
        company: req.user.company,
        cif: update.cif,
        _id: { $ne: req.params.id }
      });
      if (existing) throw AppError.conflict('Ya existe un cliente con este CIF en tu compañía');
    }

    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, company: req.user.company },
      update,
      { new: true, runValidators: true }
    );

    if (!client) throw AppError.notFound('Cliente no encontrado');

    res.json({ ok: true, data: { client } });
  } catch (err) {
    next(err);
  }
};

// GET /api/client
export const listClients = async (req, res, next) => {
  try {
    const { page, limit, name, sort } = req.query;
    const filter = { company: req.user.company };
    if (name) filter.name = { $regex: name, $options: 'i' };

    const { items, pagination } = await paginate(Client, filter, {
      page,
      limit,
      sort: sort || '-createdAt'
    });

    res.json({ ok: true, data: { clients: items, ...pagination } });
  } catch (err) {
    next(err);
  }
};

// GET /api/client/archived
export const listArchivedClients = async (req, res, next) => {
  try {
    const { page, limit, name, sort } = req.query;
    const filter = { company: req.user.company, deleted: true, includeDeleted: true };
    if (name) filter.name = { $regex: name, $options: 'i' };

    const { items, pagination } = await paginate(Client, filter, {
      page,
      limit,
      sort: sort || '-updatedAt'
    });

    res.json({ ok: true, data: { clients: items, ...pagination } });
  } catch (err) {
    next(err);
  }
};

// GET /api/client/:id
export const getClient = async (req, res, next) => {
  try {
    const client = await Client.findOne({ _id: req.params.id, company: req.user.company });
    if (!client) throw AppError.notFound('Cliente no encontrado');
    res.json({ ok: true, data: { client } });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/client/:id?soft=true
export const deleteClient = async (req, res, next) => {
  try {
    const { soft } = req.query;

    const client = await Client.findOne({ _id: req.params.id, company: req.user.company });
    if (!client) throw AppError.notFound('Cliente no encontrado');

    if (soft) {
      client.deleted = true;
      await client.save();
    } else {
      await Client.deleteOne({ _id: client._id });
    }

    res.json({ ok: true, message: `Cliente eliminado (${soft ? 'soft' : 'hard'} delete)` });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/client/:id/restore
export const restoreClient = async (req, res, next) => {
  try {
    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, company: req.user.company, includeDeleted: true, deleted: true },
      { deleted: false },
      { new: true }
    );

    if (!client) throw AppError.notFound('Cliente archivado no encontrado');

    res.json({ ok: true, data: { client } });
  } catch (err) {
    next(err);
  }
};
