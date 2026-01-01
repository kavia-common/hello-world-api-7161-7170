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
 * Accepts only numbers (not numeric strings) to keep type strict and predictable.
 *
 * @param {unknown} value Potential feedback rating
 * @returns {{ value?: number, error?: { field: string, message: string } }} Parsed value or error
 */
function parseOptionalFeedbackRating(value) {
  if (value === undefined || value === null || value === '') return { value: undefined };

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return {
      error: {
        field: 'feedbackRating',
        message: 'feedbackRating must be a number between 1 and 5.',
      },
    };
  }

  if (value < 1 || value > 5) {
    return {
      error: {
        field: 'feedbackRating',
        message: 'feedbackRating must be between 1 and 5.',
      },
    };
  }

  return { value };
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
   * - feedbackRating (number, 1-5)
   * - futureMapping (string, free-form)
   *
   * @param {import('express').Request} req Express request
   * @param {import('express').Response} res Express response
   * @returns {import('express').Response} Response with created record or validation errors.
   */
  create(req, res) {
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

      // New optional fields
      feedbackRating,
      futureMapping: futureMapping === undefined || futureMapping === null ? undefined : futureMapping,
    };

    try {
      const created = employeesStore.createEmployee(employeeRecord);
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
      // unexpected error: propagate to global error handler
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
   * @returns {import('express').Response} Response containing employee list.
   */
  list(req, res) {
    const employees = employeesStore.listEmployees();
    return res.status(200).json({
      status: 'success',
      data: employees,
      count: employees.length,
    });
  }
}

module.exports = new EmployeesController();
