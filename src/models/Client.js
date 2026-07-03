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

const clientSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    company: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    name: { type: String, required: true, trim: true },
    cif: { type: String, required: true, trim: true, uppercase: true },
    email: { type: String, trim: true, lowercase: true, default: null },
    phone: { type: String, trim: true, default: null },
    address: addressSchema,
    deleted: { type: Boolean, default: false, index: true }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Un CIF debe ser único dentro de cada compañía (no globalmente)
clientSchema.index({ company: 1, cif: 1 }, { unique: true });
clientSchema.index({ company: 1, name: 'text' });

clientSchema.pre(/^find/, function (next) {
  if (this.getFilter().includeDeleted) {
    delete this.getFilter().includeDeleted;
    return next();
  }
  this.where({ deleted: { $ne: true } });
  next();
});

export const Client = model('Client', clientSchema);
