import { Project } from '../models/Project.js';
import { Client } from '../models/Client.js';
import { AppError } from '../utils/AppError.js';
import { paginate } from '../utils/pagination.js';
import { emitToCompany } from '../services/socket.service.js';

// POST /api/project
export const createProject = async (req, res, next) => {
  try {
    const { name, projectCode, client, address, email, notes, active } = req.body;
    const normalizedCode = projectCode.toUpperCase().trim();

    const existingClient = await Client.findOne({ _id: client, company: req.user.company });
    if (!existingClient) {
      throw AppError.badRequest('El cliente indicado no existe en tu compañía');
    }

    const existingProject = await Project.findOne({
      company: req.user.company,
      projectCode: normalizedCode
    });
    if (existingProject) {
      throw AppError.conflict('Ya existe un proyecto con este código en tu compañía');
    }

    const project = await Project.create({
      user: req.user._id,
      company: req.user.company,
      client,
      name,
      projectCode: normalizedCode,
      address,
      email,
      notes,
      active
    });

    emitToCompany(req.user.company, 'project:new', project);

    res.status(201).json({ ok: true, data: { project } });
  } catch (err) {
    next(err);
  }
};

// PUT /api/project/:id
export const updateProject = async (req, res, next) => {
  try {
    const update = { ...req.body };

    if (update.projectCode) update.projectCode = update.projectCode.toUpperCase().trim();

    if (update.client) {
      const existingClient = await Client.findOne({ _id: update.client, company: req.user.company });
      if (!existingClient) throw AppError.badRequest('El cliente indicado no existe en tu compañía');
    }

    if (update.projectCode) {
      const existing = await Project.findOne({
        company: req.user.company,
        projectCode: update.projectCode,
        _id: { $ne: req.params.id }
      });
      if (existing) throw AppError.conflict('Ya existe un proyecto con este código en tu compañía');
    }

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, company: req.user.company },
      update,
      { new: true, runValidators: true }
    );

    if (!project) throw AppError.notFound('Proyecto no encontrado');

    res.json({ ok: true, data: { project } });
  } catch (err) {
    next(err);
  }
};

// GET /api/project
export const listProjects = async (req, res, next) => {
  try {
    const { page, limit, client, name, active, sort } = req.query;
    const filter = { company: req.user.company };
    if (client) filter.client = client;
    if (name) filter.name = { $regex: name, $options: 'i' };
    if (active !== undefined) filter.active = active;

    const { items, pagination } = await paginate(Project, filter, {
      page,
      limit,
      sort: sort || '-createdAt'
    });

    res.json({ ok: true, data: { projects: items, ...pagination } });
  } catch (err) {
    next(err);
  }
};

// GET /api/project/archived
export const listArchivedProjects = async (req, res, next) => {
  try {
    const { page, limit, sort } = req.query;
    const filter = { company: req.user.company, deleted: true, includeDeleted: true };

    const { items, pagination } = await paginate(Project, filter, {
      page,
      limit,
      sort: sort || '-updatedAt'
    });

    res.json({ ok: true, data: { projects: items, ...pagination } });
  } catch (err) {
    next(err);
  }
};

// GET /api/project/:id
export const getProject = async (req, res, next) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      company: req.user.company
    }).populate('client');
    if (!project) throw AppError.notFound('Proyecto no encontrado');
    res.json({ ok: true, data: { project } });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/project/:id?soft=true
export const deleteProject = async (req, res, next) => {
  try {
    const { soft } = req.query;

    const project = await Project.findOne({ _id: req.params.id, company: req.user.company });
    if (!project) throw AppError.notFound('Proyecto no encontrado');

    if (soft) {
      project.deleted = true;
      await project.save();
    } else {
      await Project.deleteOne({ _id: project._id });
    }

    res.json({ ok: true, message: `Proyecto eliminado (${soft ? 'soft' : 'hard'} delete)` });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/project/:id/restore
export const restoreProject = async (req, res, next) => {
  try {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, company: req.user.company, includeDeleted: true, deleted: true },
      { deleted: false },
      { new: true }
    );

    if (!project) throw AppError.notFound('Proyecto archivado no encontrado');

    res.json({ ok: true, data: { project } });
  } catch (err) {
    next(err);
  }
};
