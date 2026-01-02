'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

const EmployeeSchema = new Schema(
  {
    employeeId: { type: String, required: true, unique: true, index: true },
    // All other properties are flexible; controllers already validate shape/types.
  },
  {
    timestamps: true,
    minimize: false,
    strict: false,
  }
);

// Ensure consistent JSON output (remove internal fields).
EmployeeSchema.set('toJSON', {
  versionKey: false,
  transform(_doc, ret) {
    // Map timestamps to ISO strings (controllers/stores historically return strings)
    if (ret.createdAt instanceof Date) ret.createdAt = ret.createdAt.toISOString();
    if (ret.updatedAt instanceof Date) ret.updatedAt = ret.updatedAt.toISOString();
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model('Employee', EmployeeSchema);
