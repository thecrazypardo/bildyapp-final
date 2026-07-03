import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const workerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    hours: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const deliveryNoteSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    company: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    client: { type: Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    format: { type: String, enum: ['material', 'hours'], required: true },
    description: { type: String, trim: true, default: '' },
    workDate: { type: Date, required: true },

    // Campos específicos de format: 'material'
    material: { type: String, trim: true, default: null },
    quantity: { type: Number, default: null, min: 0 },
    unit: { type: String, trim: true, default: null },

    // Campos específicos de format: 'hours'
    hours: { type: Number, default: null, min: 0 },
    workers: { type: [workerSchema], default: undefined },

    // Firma
    signed: { type: Boolean, default: false, index: true },
    signedAt: { type: Date, default: null },
    signatureUrl: { type: String, default: null },
    pdfUrl: { type: String, default: null },

    deleted: { type: Boolean, default: false, index: true }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

deliveryNoteSchema.index({ company: 1, project: 1 });
deliveryNoteSchema.index({ company: 1, client: 1 });
deliveryNoteSchema.index({ company: 1, workDate: -1 });

deliveryNoteSchema.pre(/^find/, function (next) {
  if (this.getFilter().includeDeleted) {
    delete this.getFilter().includeDeleted;
    return next();
  }
  this.where({ deleted: { $ne: true } });
  next();
});

export const DeliveryNote = model('DeliveryNote', deliveryNoteSchema);
