'use strict';

const mongoose = require('mongoose');

const FEEDBACK_RATING_VALUES = ['Needs Improvement', 'Average', 'Good', 'Very Good', 'Excellent'];

const employeeSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    employeeName: {
      type: String,
      required: true,
      trim: true,
    },
    employeeType: { type: String },
    email: {
      type: String,
      required: true,
      trim: true,
    },
    currentCompetency: { type: String },
    currentAccount: { type: String },
    currentStatus: { type: String },
    totalYearsOfExperience: { type: mongoose.Schema.Types.Mixed },
    grade: { type: String },
    designation: { type: String },
    role: { type: String },
    location: { type: String },
    phoneNumber: { type: String },
    coreSkills: { type: mongoose.Schema.Types.Mixed },
    secondaryTrainingSkills: { type: mongoose.Schema.Types.Mixed },
    projectsSupported: { type: mongoose.Schema.Types.Mixed },
    learningPaths: { type: mongoose.Schema.Types.Mixed },
    skillFactory: { type: String },
    monthOfJoiningCompetency: { type: String },
    monthOfLeavingCompetency: { type: String },
    currentActivity: { type: String },

    // Per requirement: feedbackRating is a required string enum (when present, it must match allowed).
    // The controller currently treats it as optional; we preserve controller behavior by allowing undefined,
    // but if provided it must be one of the enum values.
    feedbackRating: {
      type: String,
      enum: FEEDBACK_RATING_VALUES,
    },

    futureMapping: { type: String },
  },
  {
    // Adds createdAt/updatedAt as Date fields. Controller returns ISO strings.
    timestamps: true,
    versionKey: false,
  }
);

// Ensure JSON output is API-friendly (createdAt as ISO string, remove _id).
employeeSchema.set('toJSON', {
  transform: (_doc, ret) => {
    // Normalize timestamps to ISO string to match previous API behavior.
    if (ret.createdAt instanceof Date) ret.createdAt = ret.createdAt.toISOString();
    if (ret.updatedAt instanceof Date) ret.updatedAt = ret.updatedAt.toISOString();

    // Keep Mongo _id out of API payload; use employeeId as identifier.
    delete ret._id;

    return ret;
  },
});

const Employee = mongoose.model('Employee', employeeSchema);

module.exports = {
  Employee,
  FEEDBACK_RATING_VALUES,
};
