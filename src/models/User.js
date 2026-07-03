import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

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

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true
    },
    password: {
      type: String,
      required: true,
      select: false // nunca se devuelve por defecto en las consultas
    },
    name: { type: String, trim: true, default: '' },
    lastName: { type: String, trim: true, default: '' },
    nif: { type: String, trim: true, default: null },
    role: {
      type: String,
      enum: ['admin', 'guest'],
      default: 'admin'
    },
    status: {
      type: String,
      enum: ['pending', 'verified'],
      default: 'pending',
      index: true
    },
    verificationCode: {
      type: String,
      select: false
    },
    verificationAttempts: {
      type: Number,
      default: 3
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
      index: true
    },
    address: addressSchema,
    refreshToken: {
      type: String,
      select: false,
      default: null
    },
    deleted: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Index compuesto útil para filtrar usuarios activos de una compañía por rol
userSchema.index({ company: 1, role: 1 });

// --- Virtual fullName ---
userSchema.virtual('fullName').get(function () {
  return [this.name, this.lastName].filter(Boolean).join(' ');
});

// --- Hash de la contraseña antes de guardar ---
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Excluye por defecto los usuarios borrados (soft delete) de los find()
userSchema.pre(/^find/, function (next) {
  if (this.getFilter().includeDeleted) {
    delete this.getFilter().includeDeleted;
    return next();
  }
  this.where({ deleted: { $ne: true } });
  next();
});

// --- Métodos de instancia ---
userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Nunca exponer campos sensibles en las respuestas JSON
userSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.verificationCode;
    delete ret.refreshToken;
    delete ret.__v;
    return ret;
  }
});

export const User = model('User', userSchema);
