'use strict';

const skillFactoriesStore = require('../services/skillFactoriesStore');

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
    errors.push({ field: 'skillFactoryId', message: 'skillFactoryId must be a non-empty string when provided.' });
    return;
  }

  if (normalized.trim() !== pathId) {
    errors.push({ field: 'skillFactoryId', message: 'skillFactoryId in body must match skillFactoryId in path.' });
  }
}

function isBoolean(value) {
  return typeof value === 'boolean';
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Accepts:
 * - YYYY-MM-DD (recommended)
 * - ISO-8601 timestamps
 *
 * Returns normalized ISO string (date-only kept as provided) or undefined.
 */
function parseOptionalDateString(value) {
  if (value === undefined || value === null || value === '') return { value: undefined };
  if (typeof value !== 'string') {
    return { error: 'Date must be a string.' };
  }

  const trimmed = value.trim();
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
  if (isDateOnly) return { value: trimmed };

  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return { error: 'Invalid date string.' };

  return { value: new Date(parsed).toISOString() };
}

/**
 * Parses and validates mentors for SkillFactory create/replace/patch.
 *
 * Expected shape:
 * mentors: [{ mentorId, mentorName, mentorEmail, isInPool }]
 *
 * Backward compatibility:
 * - `mentorNames` is rejected with a clear error message (clients must migrate).
 *
 * @param {unknown} value
 * @returns {{ value?: Array<{ mentorId: string, mentorName: string, mentorEmail: string, isInPool: boolean }>, error?: string, errors?: Array<{ field: string, message: string }> }}
 */
function parseMentorsArray(value) {
  if (value === undefined || value === null) return { value: undefined };
  if (!Array.isArray(value)) return { error: 'mentors must be an array of objects.' };

  const errors = [];
  /** @type {Array<{ mentorId: string, mentorName: string, mentorEmail: string, isInPool: boolean }>} */
  const normalized = [];

  value.forEach((item, idx) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      errors.push({ field: `mentors[${idx}]`, message: 'Each mentor must be an object.' });
      return;
    }

    const mentorId = asOptionalString(item.mentorId);
    const mentorName = asOptionalString(item.mentorName);
    const mentorEmail = asOptionalString(item.mentorEmail);
    const isInPool = item.isInPool;

    if (!isNonEmptyString(mentorId)) {
      errors.push({ field: `mentors[${idx}].mentorId`, message: 'mentorId is required and must be a non-empty string.' });
    }
    if (!isNonEmptyString(mentorName)) {
      errors.push({
        field: `mentors[${idx}].mentorName`,
        message: 'mentorName is required and must be a non-empty string.',
      });
    }
    if (!isValidEmail(mentorEmail)) {
      errors.push({ field: `mentors[${idx}].mentorEmail`, message: 'mentorEmail is required and must be a valid email.' });
    }
    if (!isBoolean(isInPool)) {
      errors.push({ field: `mentors[${idx}].isInPool`, message: 'isInPool is required and must be a boolean.' });
    }

    if (isNonEmptyString(mentorId) && isNonEmptyString(mentorName) && isValidEmail(mentorEmail) && isBoolean(isInPool)) {
      normalized.push({
        mentorId: mentorId.trim(),
        mentorName: mentorName.trim(),
        mentorEmail: mentorEmail.trim(),
        isInPool,
      });
    }
  });

  if (errors.length > 0) return { errors };
  return { value: normalized };
}

/**
 * Parses and validates the employees array for SkillFactory create/replace/patch.
 *
 * Requirements (per employee item):
 * - name (string) OR employeeName (string)
 * - id (string) OR employeeId (string)
 * - email (string, valid)
 * - initialRating (number)
 * - currentRating (number)
 * - startDate (ISO date string; recommended YYYY-MM-DD)
 * - endDate (ISO date string; optional)
 * - isInPool (boolean)
 *
 * Normalizes output to:
 * { id, name, email, initialRating, currentRating, startDate, endDate, isInPool }
 */
function parseEmployeesArray(value, { required }) {
  if (value === undefined || value === null) {
    if (required) return { error: 'employees is required and must be an array.' };
    return { value: undefined };
  }
  if (!Array.isArray(value)) return { error: 'employees must be an array.' };

  const errors = [];
  /** @type {Array<{ id: string, name: string, email: string, initialRating: number, currentRating: number, startDate: string, endDate?: string, isInPool: boolean }>} */
  const normalized = [];

  value.forEach((item, idx) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      errors.push({ field: `employees[${idx}]`, message: 'Each employee must be an object.' });
      return;
    }

    const id = asOptionalString(item.id ?? item.employeeId);
    const name = asOptionalString(item.name ?? item.employeeName);
    const email = asOptionalString(item.email);

    if (!isNonEmptyString(id)) {
      // Maintain backward-compatible field naming in error messages where reasonable.
      errors.push({ field: `employees[${idx}].id`, message: 'id is required.' });
    }
    if (!isNonEmptyString(name)) {
      errors.push({ field: `employees[${idx}].name`, message: 'name is required.' });
    }
    if (!isValidEmail(email)) {
      errors.push({ field: `employees[${idx}].email`, message: 'Valid email is required.' });
    }

    const initialRating = item.initialRating;
    const currentRating = item.currentRating;

    if (!isFiniteNumber(initialRating)) {
      errors.push({ field: `employees[${idx}].initialRating`, message: 'initialRating must be a number.' });
    }
    if (!isFiniteNumber(currentRating)) {
      errors.push({ field: `employees[${idx}].currentRating`, message: 'currentRating must be a number.' });
    }

    const startDateParsed = parseOptionalDateString(item.startDate);
    if (!startDateParsed.value) {
      // startDate is required for employee entries
      errors.push({ field: `employees[${idx}].startDate`, message: 'startDate is required.' });
    } else if (startDateParsed.error) {
      errors.push({ field: `employees[${idx}].startDate`, message: startDateParsed.error });
    }

    const endDateParsed = parseOptionalDateString(item.endDate);
    if (endDateParsed.error) {
      errors.push({ field: `employees[${idx}].endDate`, message: endDateParsed.error });
    }

    if (startDateParsed.value && endDateParsed.value && Date.parse(startDateParsed.value) > Date.parse(endDateParsed.value)) {
      errors.push({ field: `employees[${idx}].endDate`, message: 'endDate must be >= startDate.' });
    }

    const isInPool = item.isInPool ?? item.is_in_pool;
    if (!isBoolean(isInPool)) {
      errors.push({ field: `employees[${idx}].isInPool`, message: 'isInPool must be a boolean.' });
    }

    // Only push normalized if no obvious required-field issues for this entry.
    // (We still collect full error list above; this prevents partial acceptance.)
    if (
      isNonEmptyString(id) &&
      isNonEmptyString(name) &&
      isValidEmail(email) &&
      isFiniteNumber(initialRating) &&
      isFiniteNumber(currentRating) &&
      isNonEmptyString(startDateParsed.value) &&
      isBoolean(isInPool) &&
      !(endDateParsed.value && Date.parse(startDateParsed.value) > Date.parse(endDateParsed.value))
    ) {
      normalized.push({
        id: id.trim(),
        name: name.trim(),
        email: email.trim(),
        initialRating,
        currentRating,
        startDate: startDateParsed.value,
        endDate: endDateParsed.value,
        isInPool,
      });
    }
  });

  if (errors.length > 0) return { errors };
  return { value: normalized };
}

class SkillFactoriesController {
  /**
   * PUBLIC_INTERFACE
   * Creates a new Skill Factory record.
   *
   * Required fields:
   * - skillFactoryId
   * - skillFactoryName
   * - employees (array of employee objects; see validation rules below)
   *
   * Optional fields:
   * - mentors (array of mentor objects)
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

    const skillFactoryId = asOptionalString(payload.skillFactoryId);
    const skillFactoryName = asOptionalString(payload.skillFactoryName ?? payload.skillFactory);

    const errors = [];
    if (!isNonEmptyString(skillFactoryId)) errors.push({ field: 'skillFactoryId', message: 'skillFactoryId is required.' });
    if (!isNonEmptyString(skillFactoryName)) {
      errors.push({ field: 'skillFactoryName', message: 'skillFactoryName is required.' });
    }

    // Explicitly reject deprecated mentorNames to avoid silent misinterpretation.
    if (payload.mentorNames !== undefined) {
      errors.push({
        field: 'mentorNames',
        message:
          'mentorNames is deprecated. Use mentors (array of { mentorId, mentorName, mentorEmail, isInPool }) instead.',
      });
    }

    const mentorsParsed = parseMentorsArray(payload.mentors);
    if (mentorsParsed.error) errors.push({ field: 'mentors', message: mentorsParsed.error });
    if (mentorsParsed.errors) errors.push(...mentorsParsed.errors);

    const employeesParsed = parseEmployeesArray(payload.employees, { required: true });
    if (employeesParsed.error) errors.push({ field: 'employees', message: employeesParsed.error });
    if (employeesParsed.errors) errors.push(...employeesParsed.errors);

    // Reject top-level legacy fields (moved to employees[]).
    const movedFields = ['initialRating', 'currentRating', 'startDate', 'endDate', 'isInPool', 'is_in_pool'];
    for (const f of movedFields) {
      if (payload[f] !== undefined) {
        errors.push({ field: f, message: `${f} must be provided per employee (employees[].${f}), not at the top-level.` });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors,
      });
    }

    const record = {
      skillFactoryId: skillFactoryId.trim(),
      skillFactoryName: skillFactoryName.trim(),
      mentors: mentorsParsed.value,
      employees: employeesParsed.value,
    };

    try {
      const created = await skillFactoriesStore.createSkillFactory(record);
      return res.status(201).json({
        status: 'success',
        data: created,
      });
    } catch (err) {
      if (err && err.code === 'DUPLICATE_SKILL_FACTORY_ID') {
        return res.status(409).json({
          status: 'error',
          message: err.message,
        });
      }
      return res.status(500).json({
        status: 'error',
        message: 'Failed to create skill factory record.',
      });
    }
  }

  /**
   * PUBLIC_INTERFACE
   * Lists all stored Skill Factory records (in-memory).
   *
   * @param {import('express').Request} req Express request
   * @param {import('express').Response} res Express response
   * @returns {Promise<import('express').Response>} Response containing list.
   */
  async list(req, res) {
    const records = await skillFactoriesStore.listSkillFactories();
    return res.status(200).json({
      status: 'success',
      data: records,
      count: records.length,
    });
  }

  /**
   * PUBLIC_INTERFACE
   * Gets a single Skill Factory record by id.
   *
   * @param {import('express').Request} req Express request
   * @param {import('express').Response} res Express response
   * @returns {Promise<import('express').Response>} Response containing record or 404.
   */
  async getById(req, res) {
    const id = parseIdFromPath(req.params.skillFactoryId);
    if (!id) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors: [{ field: 'skillFactoryId', message: 'skillFactoryId path parameter is required.' }],
      });
    }

    const record = await skillFactoriesStore.getSkillFactoryById(id);
    if (!record) {
      return res.status(404).json({
        status: 'error',
        message: `Skill Factory with skillFactoryId ${id} not found.`,
      });
    }

    return res.status(200).json({
      status: 'success',
      data: record,
    });
  }

  /**
   * PUBLIC_INTERFACE
   * Replaces a full Skill Factory record for the given skillFactoryId.
   *
   * Required fields in body:
   * - skillFactoryName
   * - employees
   *
   * If skillFactoryId is present in the body, it must match the path parameter.
   *
   * @param {import('express').Request} req Express request
   * @param {import('express').Response} res Express response
   * @returns {Promise<import('express').Response>} Updated record or error response.
   */
  async replace(req, res) {
    const pathId = parseIdFromPath(req.params.skillFactoryId);
    if (!pathId) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors: [{ field: 'skillFactoryId', message: 'skillFactoryId path parameter is required.' }],
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
    validateIdMatch(pathId, payload.skillFactoryId, errors);

    const skillFactoryName = asOptionalString(payload.skillFactoryName ?? payload.skillFactory);
    if (!isNonEmptyString(skillFactoryName)) {
      errors.push({ field: 'skillFactoryName', message: 'skillFactoryName is required.' });
    }

    if (payload.mentorNames !== undefined) {
      errors.push({
        field: 'mentorNames',
        message:
          'mentorNames is deprecated. Use mentors (array of { mentorId, mentorName, mentorEmail, isInPool }) instead.',
      });
    }

    const mentorsParsed = parseMentorsArray(payload.mentors);
    if (mentorsParsed.error) errors.push({ field: 'mentors', message: mentorsParsed.error });
    if (mentorsParsed.errors) errors.push(...mentorsParsed.errors);

    const employeesParsed = parseEmployeesArray(payload.employees, { required: true });
    if (employeesParsed.error) errors.push({ field: 'employees', message: employeesParsed.error });
    if (employeesParsed.errors) errors.push(...employeesParsed.errors);

    const movedFields = ['initialRating', 'currentRating', 'startDate', 'endDate', 'isInPool', 'is_in_pool'];
    for (const f of movedFields) {
      if (payload[f] !== undefined) {
        errors.push({ field: f, message: `${f} must be provided per employee (employees[].${f}), not at the top-level.` });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors,
      });
    }

    const existing = await skillFactoriesStore.getSkillFactoryById(pathId);
    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: `Skill Factory with skillFactoryId ${pathId} not found.`,
      });
    }

    const replacement = {
      skillFactoryId: pathId,
      skillFactoryName: skillFactoryName.trim(),
      mentors: mentorsParsed.value,
      employees: employeesParsed.value,
    };

    const updated = await skillFactoriesStore.replaceSkillFactory(pathId, replacement);
    if (!updated) {
      return res.status(404).json({
        status: 'error',
        message: `Skill Factory with skillFactoryId ${pathId} not found.`,
      });
    }

    return res.status(200).json({
      status: 'success',
      data: updated,
    });
  }

  /**
   * PUBLIC_INTERFACE
   * Partially updates a Skill Factory record for the given skillFactoryId.
   *
   * If skillFactoryId is present in the body, it must match the path parameter.
   * Updated fields are validated.
   *
   * Allowed patch fields:
   * - skillFactoryName
   * - mentors
   * - employees
   *
   * @param {import('express').Request} req Express request
   * @param {import('express').Response} res Express response
   * @returns {Promise<import('express').Response>} Updated record or error response.
   */
  async patch(req, res) {
    const pathId = parseIdFromPath(req.params.skillFactoryId);
    if (!pathId) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors: [{ field: 'skillFactoryId', message: 'skillFactoryId path parameter is required.' }],
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
    validateIdMatch(pathId, payload.skillFactoryId, errors);

    const patch = {};

    if (payload.skillFactoryName !== undefined || payload.skillFactory !== undefined) {
      const name = asOptionalString(payload.skillFactoryName ?? payload.skillFactory);
      if (!isNonEmptyString(name)) {
        errors.push({ field: 'skillFactoryName', message: 'skillFactoryName must be a non-empty string when provided.' });
      } else {
        patch.skillFactoryName = name.trim();
      }
    }

    if (payload.mentorNames !== undefined) {
      errors.push({
        field: 'mentorNames',
        message:
          'mentorNames is deprecated. Use mentors (array of { mentorId, mentorName, mentorEmail, isInPool }) instead.',
      });
    }

    if (payload.mentors !== undefined) {
      const mentorsParsed = parseMentorsArray(payload.mentors);
      if (mentorsParsed.error) errors.push({ field: 'mentors', message: mentorsParsed.error });
      if (mentorsParsed.errors) errors.push(...mentorsParsed.errors);
      if (mentorsParsed.value) patch.mentors = mentorsParsed.value;
    }

    if (payload.employees !== undefined) {
      const employeesParsed = parseEmployeesArray(payload.employees, { required: false });
      if (employeesParsed.error) errors.push({ field: 'employees', message: employeesParsed.error });
      if (employeesParsed.errors) errors.push(...employeesParsed.errors);
      if (employeesParsed.value) patch.employees = employeesParsed.value;
    }

    // Reject top-level legacy fields (moved to employees[]).
    const movedFields = ['initialRating', 'currentRating', 'startDate', 'endDate', 'isInPool', 'is_in_pool'];
    for (const f of movedFields) {
      if (payload[f] !== undefined) {
        errors.push({ field: f, message: `${f} must be provided per employee (employees[].${f}), not at the top-level.` });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors,
      });
    }

    const existing = await skillFactoriesStore.getSkillFactoryById(pathId);
    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: `Skill Factory with skillFactoryId ${pathId} not found.`,
      });
    }

    const updated = await skillFactoriesStore.patchSkillFactory(pathId, patch);
    if (!updated) {
      return res.status(404).json({
        status: 'error',
        message: `Skill Factory with skillFactoryId ${pathId} not found.`,
      });
    }

    return res.status(200).json({
      status: 'success',
      data: updated,
    });
  }

  /**
   * PUBLIC_INTERFACE
   * Deletes a Skill Factory record for the given skillFactoryId.
   *
   * @param {import('express').Request} req Express request
   * @param {import('express').Response} res Express response
   * @returns {Promise<import('express').Response>} 204 on success, 404 if not found.
   */
  async delete(req, res) {
    const pathId = parseIdFromPath(req.params.skillFactoryId);
    if (!pathId) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors: [{ field: 'skillFactoryId', message: 'skillFactoryId path parameter is required.' }],
      });
    }

    const deleted = await skillFactoriesStore.deleteSkillFactory(pathId);
    if (!deleted) {
      return res.status(404).json({
        status: 'error',
        message: `Skill Factory with skillFactoryId ${pathId} not found.`,
      });
    }

    return res.status(204).send();
  }
}

module.exports = new SkillFactoriesController();
