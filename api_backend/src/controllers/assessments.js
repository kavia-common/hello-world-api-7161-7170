'use strict';

const assessmentsStore = require('../services/assessmentsStore');

const ALLOWED_ASSESSMENT_STATUSES = ['Draft', 'Assigned', 'In Progress', 'Completed'];

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function asOptionalString(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}

function isValidEmail(value) {
  if (!isNonEmptyString(value)) return false;
  // pragmatic email check (not exhaustive)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function parseIdFromPath(value) {
  if (!isNonEmptyString(value)) return undefined;
  return value.trim();
}

function validateIdMatch(pathId, bodyId, errors) {
  if (bodyId === undefined || bodyId === null || bodyId === '') return;

  const normalized = asOptionalString(bodyId);
  if (!isNonEmptyString(normalized)) {
    errors.push({ field: 'assessmentId', message: 'assessmentId must be a non-empty string when provided.' });
    return;
  }

  if (normalized.trim() !== pathId) {
    errors.push({ field: 'assessmentId', message: 'assessmentId in body must match assessmentId in path.' });
  }
}

/**
 * Accepts ISO-8601 date-time strings, rejects invalids.
 * Returns undefined for missing/empty.
 */
function parseOptionalIsoDateString(value) {
  if (value === undefined || value === null || value === '') return { value: undefined };

  if (typeof value !== 'string') {
    return { error: 'dueDate must be a string (ISO date string).' };
  }

  const trimmed = value.trim();
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) {
    return { error: 'dueDate must be a valid ISO date string.' };
  }

  // Keep a canonical representation to reduce ambiguity
  return { value: new Date(parsed).toISOString() };
}

function parseOptionalStatus(value) {
  if (value === undefined || value === null || value === '') return { value: undefined };
  if (typeof value !== 'string') {
    return { error: `status must be a string and one of: ${ALLOWED_ASSESSMENT_STATUSES.join(', ')}.` };
  }
  const trimmed = value.trim();
  if (!ALLOWED_ASSESSMENT_STATUSES.includes(trimmed)) {
    return { error: `status must be one of: ${ALLOWED_ASSESSMENT_STATUSES.join(', ')}.` };
  }
  return { value: trimmed };
}

/**
 * Parses assignedTo items:
 * [{ employeeId, employeeName, email }]
 *
 * @param {unknown} value
 * @param {{ required: boolean }} opts
 * @returns {{ value?: Array<{ employeeId: string, employeeName: string, email: string }>, error?: string, errors?: Array<{ field: string, message: string }> }}
 */
function parseAssignedToArray(value, opts) {
  if (value === undefined || value === null) {
    if (opts.required) return { error: 'assignedTo is required and must be an array of assignees.' };
    return { value: undefined };
  }

  if (!Array.isArray(value)) {
    return { error: 'assignedTo must be an array of assignees.' };
  }

  const errors = [];
  /** @type {Array<{ employeeId: string, employeeName: string, email: string }>} */
  const normalized = [];

  value.forEach((item, idx) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      errors.push({ field: `assignedTo[${idx}]`, message: 'Each assignee must be an object.' });
      return;
    }

    const employeeId = asOptionalString(item.employeeId);
    const employeeName = asOptionalString(item.employeeName);
    const email = asOptionalString(item.email);

    if (!isNonEmptyString(employeeId)) {
      errors.push({
        field: `assignedTo[${idx}].employeeId`,
        message: 'employeeId is required and must be a non-empty string.',
      });
    }
    if (!isNonEmptyString(employeeName)) {
      errors.push({
        field: `assignedTo[${idx}].employeeName`,
        message: 'employeeName is required and must be a non-empty string.',
      });
    }
    if (!isValidEmail(email)) {
      errors.push({ field: `assignedTo[${idx}].email`, message: 'email is required and must be a valid email.' });
    }

    if (isNonEmptyString(employeeId) && isNonEmptyString(employeeName) && isValidEmail(email)) {
      normalized.push({
        employeeId: employeeId.trim(),
        employeeName: employeeName.trim(),
        email: email.trim(),
      });
    }
  });

  if (errors.length > 0) return { errors };
  return { value: normalized };
}

class AssessmentsController {
  /**
   * PUBLIC_INTERFACE
   * Creates a new Assessment record.
   *
   * Required fields:
   * - assessmentId
   * - title
   *
   * Optional fields:
   * - description
   * - assignedTo (array of { employeeId, employeeName, email })
   * - dueDate (ISO date string)
   * - status (Draft | Assigned | In Progress | Completed)
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

    const assessmentId = asOptionalString(payload.assessmentId);
    const title = asOptionalString(payload.title);
    const description = payload.description;

    const errors = [];
    if (!isNonEmptyString(assessmentId)) errors.push({ field: 'assessmentId', message: 'assessmentId is required.' });
    if (!isNonEmptyString(title)) errors.push({ field: 'title', message: 'title is required.' });

    if (description !== undefined && description !== null && typeof description !== 'string') {
      errors.push({ field: 'description', message: 'description must be a string.' });
    }

    const assignedToParsed = parseAssignedToArray(payload.assignedTo, { required: false });
    if (assignedToParsed.error) errors.push({ field: 'assignedTo', message: assignedToParsed.error });
    if (assignedToParsed.errors) errors.push(...assignedToParsed.errors);

    const dueDateParsed = parseOptionalIsoDateString(payload.dueDate);
    if (dueDateParsed.error) errors.push({ field: 'dueDate', message: dueDateParsed.error });

    const statusParsed = parseOptionalStatus(payload.status);
    if (statusParsed.error) errors.push({ field: 'status', message: statusParsed.error });

    if (errors.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors,
      });
    }

    const record = {
      assessmentId: assessmentId.trim(),
      title: title.trim(),
      description: description === undefined || description === null ? undefined : description.trim(),
      assignedTo: assignedToParsed.value,
      dueDate: dueDateParsed.value,
      status: statusParsed.value ?? 'Draft',
    };

    try {
      const created = await assessmentsStore.createAssessment(record);
      return res.status(201).json({
        status: 'success',
        data: created,
      });
    } catch (err) {
      if (err && err.code === 'DUPLICATE_ASSESSMENT_ID') {
        return res.status(409).json({
          status: 'error',
          message: err.message,
        });
      }
      return res.status(500).json({
        status: 'error',
        message: 'Failed to create assessment record.',
      });
    }
  }

  /**
   * PUBLIC_INTERFACE
   * Lists all stored Assessments (in-memory).
   *
   * @param {import('express').Request} req Express request
   * @param {import('express').Response} res Express response
   * @returns {Promise<import('express').Response>} Response containing list.
   */
  async list(req, res) {
    const records = await assessmentsStore.listAssessments();
    return res.status(200).json({
      status: 'success',
      data: records,
      count: records.length,
    });
  }

  /**
   * PUBLIC_INTERFACE
   * Gets a single Assessment record by assessmentId.
   *
   * @param {import('express').Request} req Express request
   * @param {import('express').Response} res Express response
   * @returns {Promise<import('express').Response>} Response containing record or 404.
   */
  async getById(req, res) {
    const id = parseIdFromPath(req.params.assessmentId);
    if (!id) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors: [{ field: 'assessmentId', message: 'assessmentId path parameter is required.' }],
      });
    }

    const record = await assessmentsStore.getAssessmentById(id);
    if (!record) {
      return res.status(404).json({
        status: 'error',
        message: `Assessment with assessmentId ${id} not found.`,
      });
    }

    return res.status(200).json({
      status: 'success',
      data: record,
    });
  }

  /**
   * PUBLIC_INTERFACE
   * Replaces a full Assessment record for the given assessmentId.
   *
   * Required fields in body:
   * - title
   *
   * If assessmentId is present in the body, it must match the path parameter.
   *
   * @param {import('express').Request} req Express request
   * @param {import('express').Response} res Express response
   * @returns {Promise<import('express').Response>} Updated record or error response.
   */
  async replace(req, res) {
    const pathId = parseIdFromPath(req.params.assessmentId);
    if (!pathId) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors: [{ field: 'assessmentId', message: 'assessmentId path parameter is required.' }],
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
    validateIdMatch(pathId, payload.assessmentId, errors);

    const title = asOptionalString(payload.title);
    const description = payload.description;

    if (!isNonEmptyString(title)) errors.push({ field: 'title', message: 'title is required.' });

    if (description !== undefined && description !== null && typeof description !== 'string') {
      errors.push({ field: 'description', message: 'description must be a string.' });
    }

    const assignedToParsed = parseAssignedToArray(payload.assignedTo, { required: false });
    if (assignedToParsed.error) errors.push({ field: 'assignedTo', message: assignedToParsed.error });
    if (assignedToParsed.errors) errors.push(...assignedToParsed.errors);

    const dueDateParsed = parseOptionalIsoDateString(payload.dueDate);
    if (dueDateParsed.error) errors.push({ field: 'dueDate', message: dueDateParsed.error });

    const statusParsed = parseOptionalStatus(payload.status);
    if (statusParsed.error) errors.push({ field: 'status', message: statusParsed.error });

    if (errors.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors,
      });
    }

    const existing = await assessmentsStore.getAssessmentById(pathId);
    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: `Assessment with assessmentId ${pathId} not found.`,
      });
    }

    const replacement = {
      assessmentId: pathId,
      title: title.trim(),
      description: description === undefined || description === null ? undefined : description.trim(),
      assignedTo: assignedToParsed.value,
      dueDate: dueDateParsed.value,
      status: statusParsed.value ?? existing.status ?? 'Draft',
    };

    const updated = await assessmentsStore.replaceAssessment(pathId, replacement);
    if (!updated) {
      return res.status(404).json({
        status: 'error',
        message: `Assessment with assessmentId ${pathId} not found.`,
      });
    }

    return res.status(200).json({
      status: 'success',
      data: updated,
    });
  }

  /**
   * PUBLIC_INTERFACE
   * Partially updates an Assessment record for the given assessmentId.
   *
   * If assessmentId is present in the body, it must match the path parameter.
   * Updated fields are validated.
   *
   * Allowed patch fields:
   * - title
   * - description
   * - assignedTo
   * - dueDate
   * - status
   *
   * @param {import('express').Request} req Express request
   * @param {import('express').Response} res Express response
   * @returns {Promise<import('express').Response>} Updated record or error response.
   */
  async patch(req, res) {
    const pathId = parseIdFromPath(req.params.assessmentId);
    if (!pathId) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors: [{ field: 'assessmentId', message: 'assessmentId path parameter is required.' }],
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
    validateIdMatch(pathId, payload.assessmentId, errors);

    const patch = {};

    if (payload.title !== undefined) {
      const title = asOptionalString(payload.title);
      if (!isNonEmptyString(title)) {
        errors.push({ field: 'title', message: 'title must be a non-empty string when provided.' });
      } else {
        patch.title = title.trim();
      }
    }

    if (payload.description !== undefined) {
      const description = payload.description;
      if (description !== null && typeof description !== 'string') {
        errors.push({ field: 'description', message: 'description must be a string when provided.' });
      } else {
        patch.description = description === null ? undefined : description.trim();
      }
    }

    if (payload.assignedTo !== undefined) {
      const assignedToParsed = parseAssignedToArray(payload.assignedTo, { required: false });
      if (assignedToParsed.error) errors.push({ field: 'assignedTo', message: assignedToParsed.error });
      if (assignedToParsed.errors) errors.push(...assignedToParsed.errors);
      if (assignedToParsed.value !== undefined) patch.assignedTo = assignedToParsed.value;
    }

    if (payload.dueDate !== undefined) {
      const dueDateParsed = parseOptionalIsoDateString(payload.dueDate);
      if (dueDateParsed.error) errors.push({ field: 'dueDate', message: dueDateParsed.error });
      patch.dueDate = dueDateParsed.value;
    }

    if (payload.status !== undefined) {
      const statusParsed = parseOptionalStatus(payload.status);
      if (statusParsed.error) errors.push({ field: 'status', message: statusParsed.error });
      if (statusParsed.value !== undefined) patch.status = statusParsed.value;
    }

    if (errors.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors,
      });
    }

    const existing = await assessmentsStore.getAssessmentById(pathId);
    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: `Assessment with assessmentId ${pathId} not found.`,
      });
    }

    const updated = await assessmentsStore.patchAssessment(pathId, patch);
    if (!updated) {
      return res.status(404).json({
        status: 'error',
        message: `Assessment with assessmentId ${pathId} not found.`,
      });
    }

    return res.status(200).json({
      status: 'success',
      data: updated,
    });
  }

  /**
   * PUBLIC_INTERFACE
   * Deletes an Assessment record for the given assessmentId.
   *
   * @param {import('express').Request} req Express request
   * @param {import('express').Response} res Express response
   * @returns {Promise<import('express').Response>} 204 on success, 404 if not found.
   */
  async delete(req, res) {
    const pathId = parseIdFromPath(req.params.assessmentId);
    if (!pathId) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors: [{ field: 'assessmentId', message: 'assessmentId path parameter is required.' }],
      });
    }

    const deleted = await assessmentsStore.deleteAssessment(pathId);
    if (!deleted) {
      return res.status(404).json({
        status: 'error',
        message: `Assessment with assessmentId ${pathId} not found.`,
      });
    }

    return res.status(204).send();
  }
}

module.exports = new AssessmentsController();
