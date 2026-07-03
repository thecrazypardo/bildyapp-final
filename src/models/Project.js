import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const addressSchema = new Schema(
  {
    street: { type: String, trim: true },
    number: { type: String, trim: true },
    postal: { type: String, trim: true },
    city: { type: String, trim: true },
    province: { type: String, trim: true }
  },
  { _id: false }
);

const projectSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    company: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    client: { type: Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    name: { type: String, required: true, trim: true },
    projectCode: { type: String, required: true, trim: true, uppercase: true },
    address: addressSchema,
    email: { type: String, trim: true, lowercase: true, default: null },
    notes: { type: String, trim: true, default: '' },
    active: { type: Boolean, default: true },
    deleted: { type: Boolean, default: false, index: true }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// El código de proyecto debe ser único dentro de cada compañía
projectSchema.index({ company: 1, projectCode: 1 }, { unique: true });
projectSchema.index({ company: 1, client: 1 });

projectSchema.pre(/^find/, function (next) {
  if (this.getFilter().includeDeleted) {
    delete this.getFilter().includeDeleted;
    return next();
  }
  this.where({ deleted: { $ne: true } });
  next();
});

export const Project = model('Project', projectSchema);
