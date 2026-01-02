'use strict';

const employeesStore = require('../services/employeesStore');

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function asOptionalString(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') return value;
  // allow numbers for phoneNumber, etc., but store as string for consistency
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}

function isValidEmail(value) {
  if (!isNonEmptyString(value)) return false;
  // pragmatic email check (not exhaustive)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * Parses and validates an optional feedback rating.
 * Accepts only one of the allowed string values.
 *
 * @param {unknown} value Potential feedback rating
 * @returns {{ value?: string, error?: { field: string, message: string } }} Parsed value or error
 */
function parseOptionalFeedbackRating(value) {
  const allowedValues = ['Needs Improvement', 'Average', 'Good', 'Very Good', 'Excellent'];

  if (value === undefined || value === null || value === '') return { value: undefined };

  if (typeof value !== 'string') {
    return {
      error: {
        field: 'feedbackRating',
        message: `feedbackRating must be a string and one of: ${allowedValues.join(', ')}.`,
      },
    };
  }

  const trimmed = value.trim();
  if (!allowedValues.includes(trimmed)) {
    return {
      error: {
        field: 'feedbackRating',
        message: `feedbackRating must be one of: ${allowedValues.join(', ')}.`,
      },
    };
  }

  return { value: trimmed };
}

function parseEmployeeIdFromPath(value) {
  if (!isNonEmptyString(value)) return undefined;
  return value.trim();
}

function validateEmployeeIdMatch(pathEmployeeId, bodyEmployeeId, errors) {
  if (bodyEmployeeId === undefined || bodyEmployeeId === null || bodyEmployeeId === '') return;

  const normalized = asOptionalString(bodyEmployeeId);
  if (!isNonEmptyString(normalized)) {
    errors.push({ field: 'employeeId', message: 'employeeId must be a non-empty string when provided.' });
    return;
  }

  if (normalized.trim() !== pathEmployeeId) {
    errors.push({ field: 'employeeId', message: 'employeeId in body must match employeeId in path.' });
  }
}

class EmployeesController {
  /**
   * PUBLIC_INTERFACE
   * Creates a new employee record.
   *
   * Required fields:
   * - employeeId
   * - employeeName
   * - email
   *
   * Optional fields:
   * - feedbackRating (string enum)
   * - futureMapping (string, free-form)
   *
   * @param {import('express').Request} req Express request
   * @param {import('express').Response} res Express response
   * @returns {Promise<import('express').Response>} Response with created record or validation errors.
   */
  async create(req, res) {
    const payload = req.body;

    // Ensure JSON parsing middleware has run and that a JSON object was provided.
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid JSON body. Expected a JSON object.',
      });
    }

    const employeeId = asOptionalString(payload.employeeId ?? payload.employeeIdRaw ?? payload['Employee ID']);
    const employeeName = asOptionalString(payload.employeeName ?? payload['Employee Name']);
    const email = asOptionalString(payload.email ?? payload['Email']);

    const errors = [];
    if (!isNonEmptyString(employeeId)) errors.push({ field: 'employeeId', message: 'employeeId is required.' });
    if (!isNonEmptyString(employeeName)) errors.push({ field: 'employeeName', message: 'employeeName is required.' });
    if (!isValidEmail(email)) errors.push({ field: 'email', message: 'Valid email is required.' });

    const { value: feedbackRating, error: feedbackRatingError } = parseOptionalFeedbackRating(
      payload.feedbackRating ?? payload['Feedback Rating']
    );
    if (feedbackRatingError) errors.push(feedbackRatingError);

    const futureMapping = payload.futureMapping ?? payload['Future Mapping'];
    if (futureMapping !== undefined && futureMapping !== null && typeof futureMapping !== 'string') {
      errors.push({ field: 'futureMapping', message: 'futureMapping must be a string.' });
    }

    if (errors.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors,
      });
    }

    // Map and store all known fields (camelCase). Accept either camelCase or the exact labels.
    const employeeRecord = {
      employeeId: employeeId.trim(),
      employeeName: employeeName.trim(),
      employeeType: asOptionalString(payload.employeeType ?? payload['Employee Type']),
      email: email.trim(),
      currentCompetency: asOptionalString(payload.currentCompetency ?? payload['Current Competency']),
      currentAccount: asOptionalString(payload.currentAccount ?? payload['Current Account']),
      currentStatus: asOptionalString(payload.currentStatus ?? payload['Current Status']),
      totalYearsOfExperience: payload.totalYearsOfExperience ?? payload['Total Years of Experience'],
      grade: asOptionalString(payload.grade ?? payload['Grade']),
      designation: asOptionalString(payload.designation ?? payload['Designation']),
      role: asOptionalString(payload.role ?? payload['Role']),
      location: asOptionalString(payload.location ?? payload['Location']),
      phoneNumber: asOptionalString(payload.phoneNumber ?? payload['Phone Number']),
      coreSkills: payload.coreSkills ?? payload['Core Skills'],
      secondaryTrainingSkills: payload.secondaryTrainingSkills ?? payload['Secondary/Training Skills'],
      projectsSupported: payload.projectsSupported ?? payload['Projects Supported'],
      learningPaths: payload.learningPaths ?? payload['Learning Paths'],
      skillFactory: payload.skillFactory ?? payload['Skill Factory'],
      monthOfJoiningCompetency: asOptionalString(
        payload.monthOfJoiningCompetency ?? payload['Month of Joining Competency']
      ),
      monthOfLeavingCompetency: asOptionalString(
        payload.monthOfLeavingCompetency ?? payload['Month of Leaving Competency']
      ),
      currentActivity: asOptionalString(payload.currentActivity ?? payload['Current Activity']),
      feedbackRating,
      futureMapping: futureMapping === undefined || futureMapping === null ? undefined : futureMapping,
    };

    try {
      const created = await employeesStore.createEmployee(employeeRecord);
      return res.status(201).json({
        status: 'success',
        data: created,
      });
    } catch (err) {
      if (err && err.code === 'DUPLICATE_EMPLOYEE_ID') {
        return res.status(409).json({
          status: 'error',
          message: err.message,
        });
      }
      return res.status(500).json({
        status: 'error',
        message: 'Failed to create employee record.',
      });
    }
  }

  /**
   * PUBLIC_INTERFACE
   * Lists all stored employee records (in-memory).
   *
   * @param {import('express').Request} req Express request
   * @param {import('express').Response} res Express response
   * @returns {Promise<import('express').Response>} Response containing employee list.
   */
  async list(req, res) {
    const employees = await employeesStore.listEmployees();
    return res.status(200).json({
      status: 'success',
      data: employees,
      count: employees.length,
    });
  }

  /**
   * PUBLIC_INTERFACE
   * Replaces a full employee record for the given employeeId.
   *
   * Validation rules:
   * - employeeId (path param) is required
   * - employeeName and email are required in body
   * - if body.employeeId is present, it must match the path employeeId
   * - feedbackRating (if provided) must be one of: Needs Improvement, Average, Good, Very Good, Excellent
   *
   * @param {import('express').Request} req Express request
   * @param {import('express').Response} res Express response
   * @returns {Promise<import('express').Response>} Updated employee or error response.
   */
  async replace(req, res) {
    const pathEmployeeId = parseEmployeeIdFromPath(req.params.employeeId);
    if (!pathEmployeeId) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors: [{ field: 'employeeId', message: 'employeeId path parameter is required.' }],
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

    validateEmployeeIdMatch(pathEmployeeId, payload.employeeId, errors);

    const employeeName = asOptionalString(payload.employeeName ?? payload['Employee Name']);
    const email = asOptionalString(payload.email ?? payload['Email']);

    if (!isNonEmptyString(employeeName)) errors.push({ field: 'employeeName', message: 'employeeName is required.' });
    if (!isValidEmail(email)) errors.push({ field: 'email', message: 'Valid email is required.' });

    const { value: feedbackRating, error: feedbackRatingError } = parseOptionalFeedbackRating(
      payload.feedbackRating ?? payload['Feedback Rating']
    );
    if (feedbackRatingError) errors.push(feedbackRatingError);

    const futureMapping = payload.futureMapping ?? payload['Future Mapping'];
    if (futureMapping !== undefined && futureMapping !== null && typeof futureMapping !== 'string') {
      errors.push({ field: 'futureMapping', message: 'futureMapping must be a string.' });
    }

    if (errors.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors,
      });
    }

    // Ensure the employee exists prior to replacement.
    const existing = await employeesStore.getEmployeeById(pathEmployeeId);
    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: `Employee with employeeId ${pathEmployeeId} not found.`,
      });
    }

    const replacement = {
      employeeId: pathEmployeeId,
      employeeName: employeeName.trim(),
      employeeType: asOptionalString(payload.employeeType ?? payload['Employee Type']),
      email: email.trim(),
      currentCompetency: asOptionalString(payload.currentCompetency ?? payload['Current Competency']),
      currentAccount: asOptionalString(payload.currentAccount ?? payload['Current Account']),
      currentStatus: asOptionalString(payload.currentStatus ?? payload['Current Status']),
      totalYearsOfExperience: payload.totalYearsOfExperience ?? payload['Total Years of Experience'],
      grade: asOptionalString(payload.grade ?? payload['Grade']),
      designation: asOptionalString(payload.designation ?? payload['Designation']),
      role: asOptionalString(payload.role ?? payload['Role']),
      location: asOptionalString(payload.location ?? payload['Location']),
      phoneNumber: asOptionalString(payload.phoneNumber ?? payload['Phone Number']),
      coreSkills: payload.coreSkills ?? payload['Core Skills'],
      secondaryTrainingSkills: payload.secondaryTrainingSkills ?? payload['Secondary/Training Skills'],
      projectsSupported: payload.projectsSupported ?? payload['Projects Supported'],
      learningPaths: payload.learningPaths ?? payload['Learning Paths'],
      skillFactory: payload.skillFactory ?? payload['Skill Factory'],
      monthOfJoiningCompetency: asOptionalString(
        payload.monthOfJoiningCompetency ?? payload['Month of Joining Competency']
      ),
      monthOfLeavingCompetency: asOptionalString(
        payload.monthOfLeavingCompetency ?? payload['Month of Leaving Competency']
      ),
      currentActivity: asOptionalString(payload.currentActivity ?? payload['Current Activity']),
      feedbackRating,
      futureMapping: futureMapping === undefined || futureMapping === null ? undefined : futureMapping,
    };

    const updated = await employeesStore.replaceEmployee(pathEmployeeId, replacement);
    if (!updated) {
      return res.status(404).json({
        status: 'error',
        message: `Employee with employeeId ${pathEmployeeId} not found.`,
      });
    }

    return res.status(200).json({
      status: 'success',
      data: updated,
    });
  }

  /**
   * PUBLIC_INTERFACE
   * Partially updates an employee record for the given employeeId.
   *
   * Validation rules:
   * - if body.employeeId is present, it must match the path employeeId
   * - if employeeName is present, it must be a non-empty string
   * - if email is present, it must be a valid email
   * - if feedbackRating is present, it must be one of: Needs Improvement, Average, Good, Very Good, Excellent
   *
   * @param {import('express').Request} req Express request
   * @param {import('express').Response} res Express response
   * @returns {Promise<import('express').Response>} Updated employee or error response.
   */
  async patch(req, res) {
    const pathEmployeeId = parseEmployeeIdFromPath(req.params.employeeId);
    if (!pathEmployeeId) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors: [{ field: 'employeeId', message: 'employeeId path parameter is required.' }],
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

    validateEmployeeIdMatch(pathEmployeeId, payload.employeeId, errors);

    const patch = {};

    if (payload.employeeName !== undefined || payload['Employee Name'] !== undefined) {
      const employeeName = asOptionalString(payload.employeeName ?? payload['Employee Name']);
      if (!isNonEmptyString(employeeName)) {
        errors.push({ field: 'employeeName', message: 'employeeName must be a non-empty string when provided.' });
      } else {
        patch.employeeName = employeeName.trim();
      }
    }

    if (payload.email !== undefined || payload['Email'] !== undefined) {
      const email = asOptionalString(payload.email ?? payload['Email']);
      if (!isValidEmail(email)) {
        errors.push({ field: 'email', message: 'Valid email is required when email is provided.' });
      } else {
        patch.email = email.trim();
      }
    }

    if (payload.feedbackRating !== undefined || payload['Feedback Rating'] !== undefined) {
      const { value: feedbackRating, error: feedbackRatingError } = parseOptionalFeedbackRating(
        payload.feedbackRating ?? payload['Feedback Rating']
      );
      if (feedbackRatingError) {
        errors.push(feedbackRatingError);
      } else {
        patch.feedbackRating = feedbackRating;
      }
    }

    if (payload.futureMapping !== undefined || payload['Future Mapping'] !== undefined) {
      const futureMapping = payload.futureMapping ?? payload['Future Mapping'];
      if (futureMapping !== undefined && futureMapping !== null && typeof futureMapping !== 'string') {
        errors.push({ field: 'futureMapping', message: 'futureMapping must be a string when provided.' });
      } else {
        patch.futureMapping = futureMapping === undefined || futureMapping === null ? undefined : futureMapping;
      }
    }

    // For all other known fields, accept type-flexible values but normalize strings where appropriate.
    const stringFields = [
      'employeeType',
      'currentCompetency',
      'currentAccount',
      'currentStatus',
      'grade',
      'designation',
      'role',
      'location',
      'phoneNumber',
      'monthOfJoiningCompetency',
      'monthOfLeavingCompetency',
      'currentActivity',
      'skillFactory',
    ];

    const labelMap = {
      employeeType: 'Employee Type',
      currentCompetency: 'Current Competency',
      currentAccount: 'Current Account',
      currentStatus: 'Current Status',
      grade: 'Grade',
      designation: 'Designation',
      role: 'Role',
      location: 'Location',
      phoneNumber: 'Phone Number',
      monthOfJoiningCompetency: 'Month of Joining Competency',
      monthOfLeavingCompetency: 'Month of Leaving Competency',
      currentActivity: 'Current Activity',
      skillFactory: 'Skill Factory',
    };

    for (const field of stringFields) {
      if (payload[field] !== undefined || payload[labelMap[field]] !== undefined) {
        patch[field] = asOptionalString(payload[field] ?? payload[labelMap[field]]);
      }
    }

    if (payload.totalYearsOfExperience !== undefined || payload['Total Years of Experience'] !== undefined) {
      patch.totalYearsOfExperience = payload.totalYearsOfExperience ?? payload['Total Years of Experience'];
    }
    if (payload.coreSkills !== undefined || payload['Core Skills'] !== undefined) {
      patch.coreSkills = payload.coreSkills ?? payload['Core Skills'];
    }
    if (payload.secondaryTrainingSkills !== undefined || payload['Secondary/Training Skills'] !== undefined) {
      patch.secondaryTrainingSkills = payload.secondaryTrainingSkills ?? payload['Secondary/Training Skills'];
    }
    if (payload.projectsSupported !== undefined || payload['Projects Supported'] !== undefined) {
      patch.projectsSupported = payload.projectsSupported ?? payload['Projects Supported'];
    }
    if (payload.learningPaths !== undefined || payload['Learning Paths'] !== undefined) {
      patch.learningPaths = payload.learningPaths ?? payload['Learning Paths'];
    }

    if (errors.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors,
      });
    }

    const updated = await employeesStore.patchEmployee(pathEmployeeId, patch);
    if (!updated) {
      return res.status(404).json({
        status: 'error',
        message: `Employee with employeeId ${pathEmployeeId} not found.`,
      });
    }

    return res.status(200).json({
      status: 'success',
      data: updated,
    });
  }

  /**
   * PUBLIC_INTERFACE
   * Deletes an employee record for the given employeeId.
   *
   * @param {import('express').Request} req Express request
   * @param {import('express').Response} res Express response
   * @returns {Promise<import('express').Response>} 204 on success, 404 if not found.
   */
  async delete(req, res) {
    const pathEmployeeId = parseEmployeeIdFromPath(req.params.employeeId);
    if (!pathEmployeeId) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors: [{ field: 'employeeId', message: 'employeeId path parameter is required.' }],
      });
    }

    const deleted = await employeesStore.deleteEmployee(pathEmployeeId);
    if (!deleted) {
      return res.status(404).json({
        status: 'error',
        message: `Employee with employeeId ${pathEmployeeId} not found.`,
      });
    }

    return res.status(204).send();
  }
}

const controller = new EmployeesController();

// Backward-compatible aliases expected by routes/index.js
controller.listEmployees = controller.list.bind(controller);
controller.createEmployee = controller.create.bind(controller);
controller.replaceEmployee = controller.replace.bind(controller);
controller.patchEmployee = controller.patch.bind(controller);
controller.deleteEmployee = controller.delete.bind(controller);

module.exports = controller;
