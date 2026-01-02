'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

const AnnouncementSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
  },
  {
    timestamps: true,
    minimize: false,
    strict: false,
  }
);

AnnouncementSchema.set('toJSON', {
  versionKey: false,
  transform(_doc, ret) {
    if (ret.createdAt instanceof Date) ret.createdAt = ret.createdAt.toISOString();
    if (ret.updatedAt instanceof Date) ret.updatedAt = ret.updatedAt.toISOString();
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model('Announcement', AnnouncementSchema);
