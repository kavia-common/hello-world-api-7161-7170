'use strict';

const feedbackStore = require('../services/feedbackStore');

const ALLOWED_FEEDBACK_RATINGS = ['Needs Improvement', 'Average', 'Good', 'Very Good', 'Excellent'];

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function asOptionalString(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}

function parseIdFromPath(value) {
  if (!isNonEmptyString(value)) return undefined;
  return value.trim();
}

function validateIdMatch(pathId, bodyId, errors) {
  if (bodyId === undefined || bodyId === null || bodyId === '') return;

  const normalized = asOptionalString(bodyId);
  if (!isNonEmptyString(normalized)) {
    errors.push({ field: 'feedbackId', message: 'feedbackId must be a non-empty string when provided.' });
    return;
  }

  if (normalized.trim() !== pathId) {
    errors.push({ field: 'feedbackId', message: 'feedbackId in body must match feedbackId in path.' });
  }
}

function parseRequiredNonEmptyString(value, field, errors) {
  const s = asOptionalString(value);
  if (!isNonEmptyString(s)) {
    errors.push({ field, message: `${field} is required.` });
    return undefined;
  }
  return s.trim();
}

function parseOptionalRating(value) {
  if (value === undefined || value === null || value === '') return { value: undefined };
  if (typeof value !== 'string') {
    return { error: `rating must be a string and one of: ${ALLOWED_FEEDBACK_RATINGS.join(', ')}.` };
  }
  const trimmed = value.trim();
  if (!ALLOWED_FEEDBACK_RATINGS.includes(trimmed)) {
    return { error: `rating must be one of: ${ALLOWED_FEEDBACK_RATINGS.join(', ')}.` };
  }
  return { value: trimmed };
}

/**
 * Parses optional "marks" which can be a number or a numeric string.
 * Returns { value: number|undefined } or { error: string }.
 */
function parseOptionalMarks(value) {
  if (value === undefined || value === null || value === '') return { value: undefined };

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return { error: 'marks must be a finite number.' };
    return { value };
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return { value: undefined };
    const n = Number(trimmed);
    if (!Number.isFinite(n)) return { error: 'marks must be a number or a numeric string.' };
    return { value: n };
  }

  return { error: 'marks must be a number or a numeric string.' };
}

/**
 * Parses optional text fields that must be strings when provided.
 * Trims strings; treats null as undefined.
 */
function parseOptionalText(value, fieldName) {
  if (value === undefined || value === null || value === '') return { value: undefined };
  if (typeof value !== 'string') return { error: `${fieldName} must be a string.` };
  return { value: value.trim() };
}

class FeedbackController {
  /**
   * PUBLIC_INTERFACE
   * Creates a new Feedback record.
   *
   * Required fields:
   * - feedbackId
   * - assessmentId
   * - employeeId
   * - rating (Needs Improvement | Average | Good | Very Good | Excellent)
   *
   * Optional fields:
   * - comments
   * - marks (number or numeric string; stored as number)
   * - basisOfScoring (string)
   * - strength (string)
   * - areasOfImprovement (string)
   *
   * Note: assessmentId is not cross-validated against Assessments store (by request).
   *
   * @param {import('express').Request} req Express request
   * @param {import('express').Response} res Express response
   * @returns {Promise<import('express').Response>} Response with created record or validation errors.
   */
  async create(req, res) {
    const payload = req.body;

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid JSON body. Expected a JSON object.',
      });
    }

    const errors = [];

    const feedbackId = parseRequiredNonEmptyString(payload.feedbackId, 'feedbackId', errors);
    const assessmentId = parseRequiredNonEmptyString(payload.assessmentId, 'assessmentId', errors);
    const employeeId = parseRequiredNonEmptyString(payload.employeeId, 'employeeId', errors);

    const ratingParsed = parseOptionalRating(payload.rating);
    if (!ratingParsed.value) {
      errors.push({ field: 'rating', message: 'rating is required.' });
    } else if (ratingParsed.error) {
      errors.push({ field: 'rating', message: ratingParsed.error });
    }

    const comments = payload.comments;
    if (comments !== undefined && comments !== null && typeof comments !== 'string') {
      errors.push({ field: 'comments', message: 'comments must be a string.' });
    }

    const marksParsed = parseOptionalMarks(payload.marks);
    if (marksParsed.error) errors.push({ field: 'marks', message: marksParsed.error });

    const basisParsed = parseOptionalText(payload.basisOfScoring, 'basisOfScoring');
    if (basisParsed.error) errors.push({ field: 'basisOfScoring', message: basisParsed.error });

    const strengthParsed = parseOptionalText(payload.strength, 'strength');
    if (strengthParsed.error) errors.push({ field: 'strength', message: strengthParsed.error });

    const aoiParsed = parseOptionalText(payload.areasOfImprovement, 'areasOfImprovement');
    if (aoiParsed.error) errors.push({ field: 'areasOfImprovement', message: aoiParsed.error });

    if (errors.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors,
      });
    }

    const record = {
      feedbackId,
      assessmentId,
      employeeId,
      rating: ratingParsed.value,
      comments: comments === undefined || comments === null ? undefined : comments.trim(),
      marks: marksParsed.value,
      basisOfScoring: basisParsed.value,
      strength: strengthParsed.value,
      areasOfImprovement: aoiParsed.value,
    };

    try {
      const created = await feedbackStore.createFeedback(record);
      return res.status(201).json({
        status: 'success',
        data: created,
      });
    } catch (err) {
      if (err && err.code === 'DUPLICATE_FEEDBACK_ID') {
        return res.status(409).json({
          status: 'error',
          message: err.message,
        });
      }
      return res.status(500).json({
        status: 'error',
        message: 'Failed to create feedback record.',
      });
    }
  }

  /**
   * PUBLIC_INTERFACE
   * Lists all stored Feedback records (in-memory).
   *
   * @param {import('express').Request} req Express request
   * @param {import('express').Response} res Express response
   * @returns {Promise<import('express').Response>} Response containing list.
   */
  async list(req, res) {
    const records = await feedbackStore.listFeedback();
    return res.status(200).json({
      status: 'success',
      data: records,
      count: records.length,
    });
  }

  /**
   * PUBLIC_INTERFACE
   * Gets a single Feedback record by feedbackId.
   *
   * @param {import('express').Request} req Express request
   * @param {import('express').Response} res Express response
   * @returns {Promise<import('express').Response>} Response containing record or 404.
   */
  async getById(req, res) {
    const id = parseIdFromPath(req.params.feedbackId);
    if (!id) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors: [{ field: 'feedbackId', message: 'feedbackId path parameter is required.' }],
      });
    }

    const record = await feedbackStore.getFeedbackById(id);
    if (!record) {
      return res.status(404).json({
        status: 'error',
        message: `Feedback with feedbackId ${id} not found.`,
      });
    }

    return res.status(200).json({
      status: 'success',
      data: record,
    });
  }

  /**
   * PUBLIC_INTERFACE
   * Replaces a full Feedback record for the given feedbackId.
   *
   * Required fields in body:
   * - assessmentId
   * - employeeId
   * - rating
   *
   * If feedbackId is present in the body, it must match the path parameter.
   *
   * @param {import('express').Request} req Express request
   * @param {import('express').Response} res Express response
   * @returns {Promise<import('express').Response>} Updated record or error response.
   */
  async replace(req, res) {
    const pathId = parseIdFromPath(req.params.feedbackId);
    if (!pathId) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors: [{ field: 'feedbackId', message: 'feedbackId path parameter is required.' }],
      });
    }

    const payload = req.body;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid JSON body. Expected a JSON object.',
      });
    }

    const errors = [];
    validateIdMatch(pathId, payload.feedbackId, errors);

    const assessmentId = parseRequiredNonEmptyString(payload.assessmentId, 'assessmentId', errors);
    const employeeId = parseRequiredNonEmptyString(payload.employeeId, 'employeeId', errors);

    const ratingParsed = parseOptionalRating(payload.rating);
    if (!ratingParsed.value) {
      errors.push({ field: 'rating', message: 'rating is required.' });
    } else if (ratingParsed.error) {
      errors.push({ field: 'rating', message: ratingParsed.error });
    }

    const comments = payload.comments;
    if (comments !== undefined && comments !== null && typeof comments !== 'string') {
      errors.push({ field: 'comments', message: 'comments must be a string.' });
    }

    const marksParsed = parseOptionalMarks(payload.marks);
    if (marksParsed.error) errors.push({ field: 'marks', message: marksParsed.error });

    const basisParsed = parseOptionalText(payload.basisOfScoring, 'basisOfScoring');
    if (basisParsed.error) errors.push({ field: 'basisOfScoring', message: basisParsed.error });

    const strengthParsed = parseOptionalText(payload.strength, 'strength');
    if (strengthParsed.error) errors.push({ field: 'strength', message: strengthParsed.error });

    const aoiParsed = parseOptionalText(payload.areasOfImprovement, 'areasOfImprovement');
    if (aoiParsed.error) errors.push({ field: 'areasOfImprovement', message: aoiParsed.error });

    if (errors.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors,
      });
    }

    const existing = await feedbackStore.getFeedbackById(pathId);
    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: `Feedback with feedbackId ${pathId} not found.`,
      });
    }

    const replacement = {
      feedbackId: pathId,
      assessmentId,
      employeeId,
      rating: ratingParsed.value,
      comments: comments === undefined || comments === null ? undefined : comments.trim(),
      marks: marksParsed.value,
      basisOfScoring: basisParsed.value,
      strength: strengthParsed.value,
      areasOfImprovement: aoiParsed.value,
    };

    const updated = await feedbackStore.replaceFeedback(pathId, replacement);
    if (!updated) {
      return res.status(404).json({
        status: 'error',
        message: `Feedback with feedbackId ${pathId} not found.`,
      });
    }

    return res.status(200).json({
      status: 'success',
      data: updated,
    });
  }

  /**
   * PUBLIC_INTERFACE
   * Partially updates a Feedback record for the given feedbackId.
   *
   * If feedbackId is present in the body, it must match the path parameter.
   * Updated fields are validated.
   *
   * Allowed patch fields:
   * - assessmentId
   * - employeeId
   * - rating
   * - comments
   * - marks
   * - basisOfScoring
   * - strength
   * - areasOfImprovement
   *
   * @param {import('express').Request} req Express request
   * @param {import('express').Response} res Express response
   * @returns {Promise<import('express').Response>} Updated record or error response.
   */
  async patch(req, res) {
    const pathId = parseIdFromPath(req.params.feedbackId);
    if (!pathId) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors: [{ field: 'feedbackId', message: 'feedbackId path parameter is required.' }],
      });
    }

    const payload = req.body;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid JSON body. Expected a JSON object.',
      });
    }

    const errors = [];
    validateIdMatch(pathId, payload.feedbackId, errors);

    const patch = {};

    if (payload.assessmentId !== undefined) {
      const assessmentId = asOptionalString(payload.assessmentId);
      if (!isNonEmptyString(assessmentId)) {
        errors.push({ field: 'assessmentId', message: 'assessmentId must be a non-empty string when provided.' });
      } else {
        patch.assessmentId = assessmentId.trim();
      }
    }

    if (payload.employeeId !== undefined) {
      const employeeId = asOptionalString(payload.employeeId);
      if (!isNonEmptyString(employeeId)) {
        errors.push({ field: 'employeeId', message: 'employeeId must be a non-empty string when provided.' });
      } else {
        patch.employeeId = employeeId.trim();
      }
    }

    if (payload.rating !== undefined) {
      const ratingParsed = parseOptionalRating(payload.rating);
      if (ratingParsed.error) errors.push({ field: 'rating', message: ratingParsed.error });
      if (ratingParsed.value !== undefined) patch.rating = ratingParsed.value;
    }

    if (payload.comments !== undefined) {
      const comments = payload.comments;
      if (comments !== null && typeof comments !== 'string') {
        errors.push({ field: 'comments', message: 'comments must be a string when provided.' });
      } else {
        patch.comments = comments === null ? undefined : comments.trim();
      }
    }

    if (payload.marks !== undefined) {
      const marksParsed = parseOptionalMarks(payload.marks);
      if (marksParsed.error) errors.push({ field: 'marks', message: marksParsed.error });
      patch.marks = marksParsed.value;
    }

    if (payload.basisOfScoring !== undefined) {
      const basisParsed = parseOptionalText(payload.basisOfScoring, 'basisOfScoring');
      if (basisParsed.error) errors.push({ field: 'basisOfScoring', message: basisParsed.error });
      patch.basisOfScoring = basisParsed.value;
    }

    if (payload.strength !== undefined) {
      const strengthParsed = parseOptionalText(payload.strength, 'strength');
      if (strengthParsed.error) errors.push({ field: 'strength', message: strengthParsed.error });
      patch.strength = strengthParsed.value;
    }

    if (payload.areasOfImprovement !== undefined) {
      const aoiParsed = parseOptionalText(payload.areasOfImprovement, 'areasOfImprovement');
      if (aoiParsed.error) errors.push({ field: 'areasOfImprovement', message: aoiParsed.error });
      patch.areasOfImprovement = aoiParsed.value;
    }

    if (errors.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors,
      });
    }

    const existing = await feedbackStore.getFeedbackById(pathId);
    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: `Feedback with feedbackId ${pathId} not found.`,
      });
    }

    const updated = await feedbackStore.patchFeedback(pathId, patch);
    if (!updated) {
      return res.status(404).json({
        status: 'error',
        message: `Feedback with feedbackId ${pathId} not found.`,
      });
    }

    return res.status(200).json({
      status: 'success',
      data: updated,
    });
  }

  /**
   * PUBLIC_INTERFACE
   * Deletes a Feedback record for the given feedbackId.
   *
   * @param {import('express').Request} req Express request
   * @param {import('express').Response} res Express response
   * @returns {Promise<import('express').Response>} 204 on success, 404 if not found.
   */
  async delete(req, res) {
    const pathId = parseIdFromPath(req.params.feedbackId);
    if (!pathId) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors: [{ field: 'feedbackId', message: 'feedbackId path parameter is required.' }],
      });
    }

    const deleted = await feedbackStore.deleteFeedback(pathId);
    if (!deleted) {
      return res.status(404).json({
        status: 'error',
        message: `Feedback with feedbackId ${pathId} not found.`,
      });
    }

    return res.status(204).send();
  }
}

module.exports = new FeedbackController();
