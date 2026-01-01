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

function parseEmployeesArray(value) {
  if (value === undefined || value === null) return { value: undefined };
  if (!Array.isArray(value)) return { error: 'employees must be an array.' };

  const errors = [];
  /** @type {Array<{ employeeId: string, employeeName: string, email: string }>} */
  const normalized = [];

  value.forEach((item, idx) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      errors.push({ field: `employees[${idx}]`, message: 'Each employee must be an object.' });
      return;
    }

    const employeeId = asOptionalString(item.employeeId ?? item.id);
    const employeeName = asOptionalString(item.employeeName ?? item.name);
    const email = asOptionalString(item.email);

    if (!isNonEmptyString(employeeId)) {
      errors.push({ field: `employees[${idx}].employeeId`, message: 'employeeId is required.' });
    }
    if (!isNonEmptyString(employeeName)) {
      errors.push({ field: `employees[${idx}].employeeName`, message: 'employeeName is required.' });
    }
    if (!isValidEmail(email)) {
      errors.push({ field: `employees[${idx}].email`, message: 'Valid email is required.' });
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

function parseMentorsArray(value) {
  if (value === undefined || value === null) return { value: undefined };
  if (!Array.isArray(value)) return { error: 'mentorNames must be an array of non-empty strings.' };

  const mentors = [];
  for (let i = 0; i < value.length; i += 1) {
    const v = value[i];
    if (!isNonEmptyString(v)) return { error: 'mentorNames must contain only non-empty strings.' };
    mentors.push(v.trim());
  }
  return { value: mentors };
}

class SkillFactoriesController {
  /**
   * PUBLIC_INTERFACE
   * Creates a new Skill Factory record.
   *
   * Required fields:
   * - skillFactoryId
   * - skillFactoryName
   *
   * Optional fields:
   * - mentorNames (string[])
   * - employees (array of { employeeId, employeeName, email })
   * - initialRating (number)
   * - currentRating (number)
   * - startDate (string date)
   * - endDate (string date)
   * - isInPool (boolean)
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

    const { value: mentorNames, error: mentorNamesError } = parseMentorsArray(payload.mentorNames ?? payload.mentors);
    if (mentorNamesError) errors.push({ field: 'mentorNames', message: mentorNamesError });

    const employeesParsed = parseEmployeesArray(payload.employees);
    if (employeesParsed.error) errors.push({ field: 'employees', message: employeesParsed.error });
    if (employeesParsed.errors) errors.push(...employeesParsed.errors);

    const initialRating = payload.initialRating;
    const currentRating = payload.currentRating;

    if (initialRating !== undefined && initialRating !== null && !isFiniteNumber(initialRating)) {
      errors.push({ field: 'initialRating', message: 'initialRating must be a number.' });
    }
    if (currentRating !== undefined && currentRating !== null && !isFiniteNumber(currentRating)) {
      errors.push({ field: 'currentRating', message: 'currentRating must be a number.' });
    }

    const startDateParsed = parseOptionalDateString(payload.startDate);
    if (startDateParsed.error) errors.push({ field: 'startDate', message: startDateParsed.error });

    const endDateParsed = parseOptionalDateString(payload.endDate);
    if (endDateParsed.error) errors.push({ field: 'endDate', message: endDateParsed.error });

    if (
      startDateParsed.value &&
      endDateParsed.value &&
      Date.parse(startDateParsed.value) > Date.parse(endDateParsed.value)
    ) {
      errors.push({ field: 'endDate', message: 'endDate must be >= startDate.' });
    }

    const isInPool = payload.isInPool ?? payload.is_in_pool;
    if (isInPool !== undefined && isInPool !== null && !isBoolean(isInPool)) {
      errors.push({ field: 'isInPool', message: 'isInPool must be a boolean.' });
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
      mentorNames,
      employees: employeesParsed.value,
      initialRating,
      currentRating,
      startDate: startDateParsed.value,
      endDate: endDateParsed.value,
      isInPool,
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

    const { value: mentorNames, error: mentorNamesError } = parseMentorsArray(payload.mentorNames ?? payload.mentors);
    if (mentorNamesError) errors.push({ field: 'mentorNames', message: mentorNamesError });

    const employeesParsed = parseEmployeesArray(payload.employees);
    if (employeesParsed.error) errors.push({ field: 'employees', message: employeesParsed.error });
    if (employeesParsed.errors) errors.push(...employeesParsed.errors);

    const initialRating = payload.initialRating;
    const currentRating = payload.currentRating;

    if (initialRating !== undefined && initialRating !== null && !isFiniteNumber(initialRating)) {
      errors.push({ field: 'initialRating', message: 'initialRating must be a number.' });
    }
    if (currentRating !== undefined && currentRating !== null && !isFiniteNumber(currentRating)) {
      errors.push({ field: 'currentRating', message: 'currentRating must be a number.' });
    }

    const startDateParsed = parseOptionalDateString(payload.startDate);
    if (startDateParsed.error) errors.push({ field: 'startDate', message: startDateParsed.error });

    const endDateParsed = parseOptionalDateString(payload.endDate);
    if (endDateParsed.error) errors.push({ field: 'endDate', message: endDateParsed.error });

    if (
      startDateParsed.value &&
      endDateParsed.value &&
      Date.parse(startDateParsed.value) > Date.parse(endDateParsed.value)
    ) {
      errors.push({ field: 'endDate', message: 'endDate must be >= startDate.' });
    }

    const isInPool = payload.isInPool ?? payload.is_in_pool;
    if (isInPool !== undefined && isInPool !== null && !isBoolean(isInPool)) {
      errors.push({ field: 'isInPool', message: 'isInPool must be a boolean.' });
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
      mentorNames,
      employees: employeesParsed.value,
      initialRating,
      currentRating,
      startDate: startDateParsed.value,
      endDate: endDateParsed.value,
      isInPool,
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

    if (payload.mentorNames !== undefined || payload.mentors !== undefined) {
      const { value: mentorNames, error: mentorNamesError } = parseMentorsArray(payload.mentorNames ?? payload.mentors);
      if (mentorNamesError) errors.push({ field: 'mentorNames', message: mentorNamesError });
      else patch.mentorNames = mentorNames;
    }

    if (payload.employees !== undefined) {
      const employeesParsed = parseEmployeesArray(payload.employees);
      if (employeesParsed.error) errors.push({ field: 'employees', message: employeesParsed.error });
      if (employeesParsed.errors) errors.push(...employeesParsed.errors);
      if (employeesParsed.value) patch.employees = employeesParsed.value;
    }

    if (payload.initialRating !== undefined) {
      if (payload.initialRating !== null && !isFiniteNumber(payload.initialRating)) {
        errors.push({ field: 'initialRating', message: 'initialRating must be a number.' });
      } else {
        patch.initialRating = payload.initialRating;
      }
    }

    if (payload.currentRating !== undefined) {
      if (payload.currentRating !== null && !isFiniteNumber(payload.currentRating)) {
        errors.push({ field: 'currentRating', message: 'currentRating must be a number.' });
      } else {
        patch.currentRating = payload.currentRating;
      }
    }

    if (payload.startDate !== undefined) {
      const startDateParsed = parseOptionalDateString(payload.startDate);
      if (startDateParsed.error) errors.push({ field: 'startDate', message: startDateParsed.error });
      else patch.startDate = startDateParsed.value;
    }

    if (payload.endDate !== undefined) {
      const endDateParsed = parseOptionalDateString(payload.endDate);
      if (endDateParsed.error) errors.push({ field: 'endDate', message: endDateParsed.error });
      else patch.endDate = endDateParsed.value;
    }

    // If both dates are present in patch OR one is in patch and the other exists, validate ordering.
    const existing = await skillFactoriesStore.getSkillFactoryById(pathId);
    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: `Skill Factory with skillFactoryId ${pathId} not found.`,
      });
    }

    const startForCompare = patch.startDate !== undefined ? patch.startDate : existing.startDate;
    const endForCompare = patch.endDate !== undefined ? patch.endDate : existing.endDate;
    if (startForCompare && endForCompare && Date.parse(startForCompare) > Date.parse(endForCompare)) {
      errors.push({ field: 'endDate', message: 'endDate must be >= startDate.' });
    }

    if (payload.isInPool !== undefined || payload.is_in_pool !== undefined) {
      const isInPool = payload.isInPool ?? payload.is_in_pool;
      if (isInPool !== null && !isBoolean(isInPool)) {
        errors.push({ field: 'isInPool', message: 'isInPool must be a boolean when provided.' });
      } else {
        patch.isInPool = isInPool;
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors,
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
