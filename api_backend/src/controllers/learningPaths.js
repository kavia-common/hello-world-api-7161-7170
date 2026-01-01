'use strict';

const learningPathsStore = require('../services/learningPathsStore');

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function asOptionalString(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}

function parseNameFromPath(value) {
  if (!isNonEmptyString(value)) return undefined;
  return value.trim();
}

function validateNameMatch(pathName, bodyName, errors) {
  if (bodyName === undefined || bodyName === null || bodyName === '') return;

  const normalized = asOptionalString(bodyName);
  if (!isNonEmptyString(normalized)) {
    errors.push({
      field: 'learningPathName',
      message: 'learningPathName must be a non-empty string when provided.',
    });
    return;
  }

  if (normalized.trim() !== pathName) {
    errors.push({
      field: 'learningPathName',
      message: 'learningPathName in body must match learningPathName in path.',
    });
  }
}

function isValidUrlLikeString(value) {
  if (!isNonEmptyString(value)) return false;
  // Pragmatic URL check: allow http(s) and also general URL parsing.
  // We keep this permissive to avoid rejecting internal links.
  try {
    URL.parse(value.trim());
    return true;
  } catch {
    return false;
  }
}

function parseCourseLinks(value, { required }) {
  if (value === undefined || value === null) {
    if (required) return { error: 'courseLinks is required and must be an array of strings.' };
    return { value: undefined };
  }
  if (!Array.isArray(value)) return { error: 'courseLinks must be an array of strings.' };

  const errors = [];
  /** @type {string[]} */
  const normalized = [];

  value.forEach((item, idx) => {
    if (!isNonEmptyString(item)) {
      errors.push({ field: `courseLinks[${idx}]`, message: 'Each course link must be a non-empty string.' });
      return;
    }
    const trimmed = item.trim();
    // If it looks like a URL, validate; otherwise allow non-URL strings (e.g., internal LMS link ids).
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      if (!isValidUrlLikeString(trimmed)) {
        errors.push({ field: `courseLinks[${idx}]`, message: 'Invalid URL format.' });
        return;
      }
    }
    normalized.push(trimmed);
  });

  if (errors.length > 0) return { errors };
  return { value: normalized };
}

function parseNonNegativeInt(value, field, { required }) {
  if (value === undefined || value === null) {
    if (required) return { error: `${field} is required.` };
    return { value: undefined };
  }
  if (!Number.isInteger(value) || value < 0) {
    return { error: `${field} must be a non-negative integer.` };
  }
  return { value };
}

function parseDuration(value, { required }) {
  if (value === undefined || value === null) {
    if (required) return { error: 'duration is required.' };
    return { value: undefined };
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return { error: 'duration must be a non-empty string or a number.' };
    return { value: trimmed };
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value < 0) return { error: 'duration must be non-negative when provided as a number.' };
    return { value };
  }

  return { error: 'duration must be a string or a number.' };
}

function parseOptionalStringArray(value, field) {
  if (value === undefined || value === null) return { value: undefined };
  if (!Array.isArray(value)) return { error: `${field} must be an array of strings.` };

  const errors = [];
  /** @type {string[]} */
  const normalized = [];

  value.forEach((item, idx) => {
    if (!isNonEmptyString(item)) {
      errors.push({ field: `${field}[${idx}]`, message: 'Each item must be a non-empty string.' });
      return;
    }
    normalized.push(item.trim());
  });

  if (errors.length > 0) return { errors };
  return { value: normalized };
}

function validateCountsConsistency(candidate, errors) {
  const enrolledCount = candidate.enrolledCount;
  const completedCount = candidate.completedCount;
  const inProgressCount = candidate.inProgressCount;

  // Only enforce when all three are present (as requested).
  if (
    enrolledCount !== undefined &&
    completedCount !== undefined &&
    inProgressCount !== undefined &&
    completedCount + inProgressCount > enrolledCount
  ) {
    errors.push({
      field: 'counts',
      message: 'completedCount + inProgressCount must be <= enrolledCount when all are provided.',
    });
  }
}

class LearningPathsController {
  /**
   * PUBLIC_INTERFACE
   * Creates a new Learning Path record.
   *
   * Required fields:
   * - learningPathName (unique identifier)
   * - courseLinks (array of strings/URLs)
   * - duration (string or number)
   * - enrolledCount (non-negative integer)
   * - completedCount (non-negative integer)
   * - inProgressCount (non-negative integer)
   *
   * Optional fields:
   * - description (string)
   * - tags (array of strings)
   *
   * Validation:
   * - learningPathName required and unique
   * - courseLinks must be an array of strings
   * - counts must be non-negative integers
   * - if enrolledCount, completedCount, inProgressCount are all provided, enforce completedCount + inProgressCount <= enrolledCount
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

    const learningPathName = asOptionalString(payload.learningPathName);
    const errors = [];

    if (!isNonEmptyString(learningPathName)) {
      errors.push({ field: 'learningPathName', message: 'learningPathName is required.' });
    }

    const courseLinksParsed = parseCourseLinks(payload.courseLinks, { required: true });
    if (courseLinksParsed.error) errors.push({ field: 'courseLinks', message: courseLinksParsed.error });
    if (courseLinksParsed.errors) errors.push(...courseLinksParsed.errors);

    const durationParsed = parseDuration(payload.duration, { required: true });
    if (durationParsed.error) errors.push({ field: 'duration', message: durationParsed.error });

    const enrolledParsed = parseNonNegativeInt(payload.enrolledCount, 'enrolledCount', { required: true });
    if (enrolledParsed.error) errors.push({ field: 'enrolledCount', message: enrolledParsed.error });

    const completedParsed = parseNonNegativeInt(payload.completedCount, 'completedCount', { required: true });
    if (completedParsed.error) errors.push({ field: 'completedCount', message: completedParsed.error });

    const inProgressParsed = parseNonNegativeInt(payload.inProgressCount, 'inProgressCount', { required: true });
    if (inProgressParsed.error) errors.push({ field: 'inProgressCount', message: inProgressParsed.error });

    const description = payload.description;
    if (description !== undefined && description !== null && typeof description !== 'string') {
      errors.push({ field: 'description', message: 'description must be a string.' });
    }

    const tagsParsed = parseOptionalStringArray(payload.tags, 'tags');
    if (tagsParsed.error) errors.push({ field: 'tags', message: tagsParsed.error });
    if (tagsParsed.errors) errors.push(...tagsParsed.errors);

    const candidate = {
      learningPathName: isNonEmptyString(learningPathName) ? learningPathName.trim() : undefined,
      courseLinks: courseLinksParsed.value,
      duration: durationParsed.value,
      enrolledCount: enrolledParsed.value,
      completedCount: completedParsed.value,
      inProgressCount: inProgressParsed.value,
    };
    validateCountsConsistency(candidate, errors);

    if (errors.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors,
      });
    }

    const record = {
      learningPathName: candidate.learningPathName,
      courseLinks: candidate.courseLinks,
      duration: candidate.duration,
      enrolledCount: candidate.enrolledCount,
      completedCount: candidate.completedCount,
      inProgressCount: candidate.inProgressCount,
      description: description === undefined || description === null ? undefined : description.trim(),
      tags: tagsParsed.value,
    };

    try {
      const created = await learningPathsStore.createLearningPath(record);
      return res.status(201).json({
        status: 'success',
        data: created,
      });
    } catch (err) {
      if (err && err.code === 'DUPLICATE_LEARNING_PATH_NAME') {
        return res.status(409).json({
          status: 'error',
          message: err.message,
        });
      }
      return res.status(500).json({
        status: 'error',
        message: 'Failed to create learning path record.',
      });
    }
  }

  /**
   * PUBLIC_INTERFACE
   * Lists all stored Learning Path records (in-memory).
   *
   * @param {import('express').Request} req Express request
   * @param {import('express').Response} res Express response
   * @returns {Promise<import('express').Response>} Response containing list.
   */
  async list(req, res) {
    const records = await learningPathsStore.listLearningPaths();
    return res.status(200).json({
      status: 'success',
      data: records,
      count: records.length,
    });
  }

  /**
   * PUBLIC_INTERFACE
   * Replaces a full Learning Path record for the given learningPathName.
   *
   * Required fields in body:
   * - courseLinks
   * - duration
   * - enrolledCount
   * - completedCount
   * - inProgressCount
   *
   * If learningPathName is present in the body, it must match the path parameter.
   *
   * @param {import('express').Request} req Express request
   * @param {import('express').Response} res Express response
   * @returns {Promise<import('express').Response>} Updated record or error response.
   */
  async replace(req, res) {
    const pathName = parseNameFromPath(req.params.learningPathName);
    if (!pathName) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors: [{ field: 'learningPathName', message: 'learningPathName path parameter is required.' }],
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
    validateNameMatch(pathName, payload.learningPathName, errors);

    const courseLinksParsed = parseCourseLinks(payload.courseLinks, { required: true });
    if (courseLinksParsed.error) errors.push({ field: 'courseLinks', message: courseLinksParsed.error });
    if (courseLinksParsed.errors) errors.push(...courseLinksParsed.errors);

    const durationParsed = parseDuration(payload.duration, { required: true });
    if (durationParsed.error) errors.push({ field: 'duration', message: durationParsed.error });

    const enrolledParsed = parseNonNegativeInt(payload.enrolledCount, 'enrolledCount', { required: true });
    if (enrolledParsed.error) errors.push({ field: 'enrolledCount', message: enrolledParsed.error });

    const completedParsed = parseNonNegativeInt(payload.completedCount, 'completedCount', { required: true });
    if (completedParsed.error) errors.push({ field: 'completedCount', message: completedParsed.error });

    const inProgressParsed = parseNonNegativeInt(payload.inProgressCount, 'inProgressCount', { required: true });
    if (inProgressParsed.error) errors.push({ field: 'inProgressCount', message: inProgressParsed.error });

    const description = payload.description;
    if (description !== undefined && description !== null && typeof description !== 'string') {
      errors.push({ field: 'description', message: 'description must be a string.' });
    }

    const tagsParsed = parseOptionalStringArray(payload.tags, 'tags');
    if (tagsParsed.error) errors.push({ field: 'tags', message: tagsParsed.error });
    if (tagsParsed.errors) errors.push(...tagsParsed.errors);

    const candidate = {
      learningPathName: pathName,
      courseLinks: courseLinksParsed.value,
      duration: durationParsed.value,
      enrolledCount: enrolledParsed.value,
      completedCount: completedParsed.value,
      inProgressCount: inProgressParsed.value,
    };
    validateCountsConsistency(candidate, errors);

    if (errors.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors,
      });
    }

    const existing = await learningPathsStore.getLearningPathByName(pathName);
    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: `Learning Path with learningPathName ${pathName} not found.`,
      });
    }

    const replacement = {
      learningPathName: pathName,
      courseLinks: candidate.courseLinks,
      duration: candidate.duration,
      enrolledCount: candidate.enrolledCount,
      completedCount: candidate.completedCount,
      inProgressCount: candidate.inProgressCount,
      description: description === undefined || description === null ? undefined : description.trim(),
      tags: tagsParsed.value,
    };

    const updated = await learningPathsStore.replaceLearningPath(pathName, replacement);
    if (!updated) {
      return res.status(404).json({
        status: 'error',
        message: `Learning Path with learningPathName ${pathName} not found.`,
      });
    }

    return res.status(200).json({
      status: 'success',
      data: updated,
    });
  }

  /**
   * PUBLIC_INTERFACE
   * Partially updates a Learning Path record for the given learningPathName.
   *
   * If learningPathName is present in the body, it must match the path parameter.
   * Updated fields are validated.
   *
   * Validation:
   * - courseLinks (if provided) must be array of strings
   * - duration (if provided) must be string or number
   * - counts (if provided) must be non-negative integers
   * - if enrolledCount, completedCount, inProgressCount are all present after applying the patch, enforce completedCount + inProgressCount <= enrolledCount
   *
   * @param {import('express').Request} req Express request
   * @param {import('express').Response} res Express response
   * @returns {Promise<import('express').Response>} Updated record or error response.
   */
  async patch(req, res) {
    const pathName = parseNameFromPath(req.params.learningPathName);
    if (!pathName) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors: [{ field: 'learningPathName', message: 'learningPathName path parameter is required.' }],
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
    validateNameMatch(pathName, payload.learningPathName, errors);

    const patch = {};

    if (payload.courseLinks !== undefined) {
      const courseLinksParsed = parseCourseLinks(payload.courseLinks, { required: false });
      if (courseLinksParsed.error) errors.push({ field: 'courseLinks', message: courseLinksParsed.error });
      if (courseLinksParsed.errors) errors.push(...courseLinksParsed.errors);
      if (courseLinksParsed.value) patch.courseLinks = courseLinksParsed.value;
    }

    if (payload.duration !== undefined) {
      const durationParsed = parseDuration(payload.duration, { required: false });
      if (durationParsed.error) errors.push({ field: 'duration', message: durationParsed.error });
      if (durationParsed.value !== undefined) patch.duration = durationParsed.value;
    }

    if (payload.enrolledCount !== undefined) {
      const enrolledParsed = parseNonNegativeInt(payload.enrolledCount, 'enrolledCount', { required: false });
      if (enrolledParsed.error) errors.push({ field: 'enrolledCount', message: enrolledParsed.error });
      if (enrolledParsed.value !== undefined) patch.enrolledCount = enrolledParsed.value;
    }

    if (payload.completedCount !== undefined) {
      const completedParsed = parseNonNegativeInt(payload.completedCount, 'completedCount', { required: false });
      if (completedParsed.error) errors.push({ field: 'completedCount', message: completedParsed.error });
      if (completedParsed.value !== undefined) patch.completedCount = completedParsed.value;
    }

    if (payload.inProgressCount !== undefined) {
      const inProgressParsed = parseNonNegativeInt(payload.inProgressCount, 'inProgressCount', { required: false });
      if (inProgressParsed.error) errors.push({ field: 'inProgressCount', message: inProgressParsed.error });
      if (inProgressParsed.value !== undefined) patch.inProgressCount = inProgressParsed.value;
    }

    if (payload.description !== undefined) {
      const description = payload.description;
      if (description !== null && typeof description !== 'string') {
        errors.push({ field: 'description', message: 'description must be a string when provided.' });
      } else {
        patch.description = description === null ? undefined : description.trim();
      }
    }

    if (payload.tags !== undefined) {
      const tagsParsed = parseOptionalStringArray(payload.tags, 'tags');
      if (tagsParsed.error) errors.push({ field: 'tags', message: tagsParsed.error });
      if (tagsParsed.errors) errors.push(...tagsParsed.errors);
      if (tagsParsed.value !== undefined) patch.tags = tagsParsed.value;
    }

    if (errors.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors,
      });
    }

    const existing = await learningPathsStore.getLearningPathByName(pathName);
    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: `Learning Path with learningPathName ${pathName} not found.`,
      });
    }

    // Ensure the cross-field constraint against the resulting record.
    const candidate = {
      enrolledCount: patch.enrolledCount !== undefined ? patch.enrolledCount : existing.enrolledCount,
      completedCount: patch.completedCount !== undefined ? patch.completedCount : existing.completedCount,
      inProgressCount: patch.inProgressCount !== undefined ? patch.inProgressCount : existing.inProgressCount,
    };

    const consistencyErrors = [];
    validateCountsConsistency(candidate, consistencyErrors);
    if (consistencyErrors.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors: consistencyErrors,
      });
    }

    const updated = await learningPathsStore.patchLearningPath(pathName, patch);
    if (!updated) {
      return res.status(404).json({
        status: 'error',
        message: `Learning Path with learningPathName ${pathName} not found.`,
      });
    }

    return res.status(200).json({
      status: 'success',
      data: updated,
    });
  }

  /**
   * PUBLIC_INTERFACE
   * Deletes a Learning Path record for the given learningPathName.
   *
   * @param {import('express').Request} req Express request
   * @param {import('express').Response} res Express response
   * @returns {Promise<import('express').Response>} 204 on success, 404 if not found.
   */
  async delete(req, res) {
    const pathName = parseNameFromPath(req.params.learningPathName);
    if (!pathName) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors: [{ field: 'learningPathName', message: 'learningPathName path parameter is required.' }],
      });
    }

    const deleted = await learningPathsStore.deleteLearningPath(pathName);
    if (!deleted) {
      return res.status(404).json({
        status: 'error',
        message: `Learning Path with learningPathName ${pathName} not found.`,
      });
    }

    return res.status(204).send();
  }
}

module.exports = new LearningPathsController();
