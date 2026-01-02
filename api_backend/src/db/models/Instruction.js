'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

const InstructionSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    // slug is optional but must be unique if set
    slug: { type: String, required: false, unique: true, sparse: true, index: true },
  },
  {
    timestamps: true,
    minimize: false,
    strict: false,
  }
);

InstructionSchema.set('toJSON', {
  versionKey: false,
  transform(_doc, ret) {
    if (ret.createdAt instanceof Date) ret.createdAt = ret.createdAt.toISOString();
    if (ret.updatedAt instanceof Date) ret.updatedAt = ret.updatedAt.toISOString();
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model('Instruction', InstructionSchema);
