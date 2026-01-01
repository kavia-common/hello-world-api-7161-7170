'use strict';

const crypto = require('crypto');

const announcementsStore = require('../services/announcementsStore');

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function asOptionalString(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') return value;
  return undefined;
}

function parseIdFromPath(value) {
  if (!isNonEmptyString(value)) return undefined;
  return value.trim();
}

function asOptionalBoolean(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'boolean') return value;
  return undefined;
}

function asOptionalIsoDateString(value) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') return '__INVALID__';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '__INVALID__';
  return value;
}

/**
 * Validates that body.id (if provided) matches the path id.
 *
 * @param {string} pathId Path id
 * @param {unknown} bodyId Body id candidate
 * @param {Array<{field: string, message: string}>} errors Mutable errors list
 */
function validateIdMatch(pathId, bodyId, errors) {
  if (bodyId === undefined || bodyId === null || bodyId === '') return;

  const normalized = asOptionalString(bodyId);
  if (!isNonEmptyString(normalized)) {
    errors.push({ field: 'id', message: 'id must be a non-empty string when provided.' });
    return;
  }

  if (normalized.trim() !== pathId) {
    errors.push({ field: 'id', message: 'id in body must match id in path.' });
  }
}

class AnnouncementsController {
  /**
   * PUBLIC_INTERFACE
   * Lists all stored announcements (in-memory).
   *
   * @param {import('express').Request} req Express request
   * @param {import('express').Response} res Express response
   * @returns {Promise<import('express').Response>} Response containing announcement list.
   */
  async list(req, res) {
    const announcements = await announcementsStore.listAnnouncements();
    return res.status(200).json({
      status: 'success',
      data: announcements,
      count: announcements.length,
    });
  }

  /**
   * PUBLIC_INTERFACE
   * Gets a single announcement by id (public).
   *
   * @param {import('express').Request} req Express request
   * @param {import('express').Response} res Express response
   * @returns {Promise<import('express').Response>} Response with announcement or 404.
   */
  async getById(req, res) {
    const id = parseIdFromPath(req.params.id);
    if (!id) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors: [{ field: 'id', message: 'id path parameter is required.' }],
      });
    }

    const record = await announcementsStore.getAnnouncementById(id);
    if (!record) {
      return res.status(404).json({
        status: 'error',
        message: `Announcement with id ${id} not found.`,
      });
    }

    return res.status(200).json({
      status: 'success',
      data: record,
    });
  }

  /**
   * PUBLIC_INTERFACE
   * Creates a new announcement (protected).
   *
   * Required fields:
   * - title (string)
   * - message (string)
   *
   * Optional fields:
   * - id (string) (client-provided; if not provided server generates)
   * - author (string)
   * - priority (low|normal|high)
   * - startsAt (ISO date string)
   * - endsAt (ISO date string)
   * - isActive (boolean)
   *
   * Error cases:
   * - 400 on validation error
   * - 409 on duplicate id
   *
   * @param {import('express').Request} req Express request
   * @param {import('express').Response} res Express response
   * @returns {Promise<import('express').Response>} Response with created record or error.
   */
  async create(req, res) {
    const payload = req.body;

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid JSON body. Expected a JSON object.',
      });
    }

    const id = asOptionalString(payload.id);
    const title = asOptionalString(payload.title);
    const message = asOptionalString(payload.message);
    const author = asOptionalString(payload.author);
    const priority = asOptionalString(payload.priority);
    const startsAt = asOptionalIsoDateString(payload.startsAt);
    const endsAt = asOptionalIsoDateString(payload.endsAt);
    const isActive = asOptionalBoolean(payload.isActive);

    const errors = [];
    if (id !== undefined && !isNonEmptyString(id)) errors.push({ field: 'id', message: 'id must be a non-empty string.' });
    if (!isNonEmptyString(title)) errors.push({ field: 'title', message: 'title is required.' });
    if (!isNonEmptyString(message)) errors.push({ field: 'message', message: 'message is required.' });

    if (author !== undefined && author !== null && typeof author !== 'string') {
      errors.push({ field: 'author', message: 'author must be a string.' });
    }

    if (priority !== undefined && priority !== null) {
      if (typeof priority !== 'string' || !announcementsStore.ALLOWED_PRIORITIES.has(priority)) {
        errors.push({ field: 'priority', message: 'priority must be one of: low, normal, high.' });
      }
    }

    if (startsAt === '__INVALID__') errors.push({ field: 'startsAt', message: 'startsAt must be an ISO date string.' });
    if (endsAt === '__INVALID__') errors.push({ field: 'endsAt', message: 'endsAt must be an ISO date string.' });

    if (isActive !== undefined && typeof isActive !== 'boolean') {
      errors.push({ field: 'isActive', message: 'isActive must be a boolean.' });
    }

    // Validate date ordering if both provided
    if (typeof startsAt === 'string' && typeof endsAt === 'string') {
      const s = new Date(startsAt);
      const e = new Date(endsAt);
      if (!Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime()) && e.getTime() < s.getTime()) {
        errors.push({ field: 'endsAt', message: 'endsAt must be >= startsAt.' });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors,
      });
    }

    const effectiveId = isNonEmptyString(id) ? id.trim() : crypto.randomUUID?.() || crypto.randomBytes(12).toString('hex');

    const record = {
      id: effectiveId,
      title: title.trim(),
      message,
      author: isNonEmptyString(author) ? author.trim() : undefined,
      priority: isNonEmptyString(priority) ? priority : 'normal',
      startsAt: typeof startsAt === 'string' ? startsAt : undefined,
      endsAt: typeof endsAt === 'string' ? endsAt : undefined,
      isActive: typeof isActive === 'boolean' ? isActive : true,
    };

    try {
      const created = await announcementsStore.createAnnouncement(record);
      return res.status(201).json({
        status: 'success',
        data: created,
      });
    } catch (err) {
      if (err && err.code === 'DUPLICATE_ID') {
        return res.status(409).json({ status: 'error', message: err.message });
      }
      if (err && err.code === 'VALIDATION_ERROR') {
        return res.status(400).json({ status: 'error', message: err.message });
      }
      return res.status(500).json({
        status: 'error',
        message: 'Failed to create announcement.',
      });
    }
  }

  /**
   * PUBLIC_INTERFACE
   * Replaces a full announcement record for the given id (protected).
   *
   * Required fields in body:
   * - title
   * - message
   *
   * Optional:
   * - author
   * - priority
   * - startsAt
   * - endsAt
   * - isActive
   *
   * @param {import('express').Request} req Express request
   * @param {import('express').Response} res Express response
   * @returns {Promise<import('express').Response>} Updated announcement or error response.
   */
  async replace(req, res) {
    const pathId = parseIdFromPath(req.params.id);
    if (!pathId) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors: [{ field: 'id', message: 'id path parameter is required.' }],
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
    validateIdMatch(pathId, payload.id, errors);

    const title = asOptionalString(payload.title);
    const message = asOptionalString(payload.message);
    const author = asOptionalString(payload.author);
    const priority = asOptionalString(payload.priority);
    const startsAt = asOptionalIsoDateString(payload.startsAt);
    const endsAt = asOptionalIsoDateString(payload.endsAt);
    const isActive = asOptionalBoolean(payload.isActive);

    if (!isNonEmptyString(title)) errors.push({ field: 'title', message: 'title is required.' });
    if (!isNonEmptyString(message)) errors.push({ field: 'message', message: 'message is required.' });

    if (author !== undefined && author !== null && typeof author !== 'string') {
      errors.push({ field: 'author', message: 'author must be a string.' });
    }

    if (priority !== undefined && priority !== null) {
      if (typeof priority !== 'string' || !announcementsStore.ALLOWED_PRIORITIES.has(priority)) {
        errors.push({ field: 'priority', message: 'priority must be one of: low, normal, high.' });
      }
    }

    if (startsAt === '__INVALID__') errors.push({ field: 'startsAt', message: 'startsAt must be an ISO date string.' });
    if (endsAt === '__INVALID__') errors.push({ field: 'endsAt', message: 'endsAt must be an ISO date string.' });

    if (isActive !== undefined && typeof isActive !== 'boolean') {
      errors.push({ field: 'isActive', message: 'isActive must be a boolean.' });
    }

    if (typeof startsAt === 'string' && typeof endsAt === 'string') {
      const s = new Date(startsAt);
      const e = new Date(endsAt);
      if (!Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime()) && e.getTime() < s.getTime()) {
        errors.push({ field: 'endsAt', message: 'endsAt must be >= startsAt.' });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors,
      });
    }

    const existing = await announcementsStore.getAnnouncementById(pathId);
    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: `Announcement with id ${pathId} not found.`,
      });
    }

    const replacement = {
      id: pathId,
      title: title.trim(),
      message,
      author: isNonEmptyString(author) ? author.trim() : undefined,
      priority: isNonEmptyString(priority) ? priority : 'normal',
      startsAt: typeof startsAt === 'string' ? startsAt : undefined,
      endsAt: typeof endsAt === 'string' ? endsAt : undefined,
      isActive: typeof isActive === 'boolean' ? isActive : true,
    };

    try {
      const updated = await announcementsStore.replaceAnnouncement(pathId, replacement);
      if (!updated) {
        return res.status(404).json({
          status: 'error',
          message: `Announcement with id ${pathId} not found.`,
        });
      }

      return res.status(200).json({
        status: 'success',
        data: updated,
      });
    } catch (err) {
      if (err && err.code === 'VALIDATION_ERROR') {
        return res.status(400).json({ status: 'error', message: err.message });
      }
      return res.status(500).json({
        status: 'error',
        message: 'Failed to update announcement.',
      });
    }
  }

  /**
   * PUBLIC_INTERFACE
   * Partially updates an announcement record for the given id (protected).
   *
   * Validation rules:
   * - if body.id is present, it must match the path id
   * - if title is present, it must be a non-empty string
   * - if message is present, it must be a non-empty string
   *
   * @param {import('express').Request} req Express request
   * @param {import('express').Response} res Express response
   * @returns {Promise<import('express').Response>} Updated announcement or error response.
   */
  async patch(req, res) {
    const pathId = parseIdFromPath(req.params.id);
    if (!pathId) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors: [{ field: 'id', message: 'id path parameter is required.' }],
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
    validateIdMatch(pathId, payload.id, errors);

    const patch = {};

    if (payload.title !== undefined) {
      const title = asOptionalString(payload.title);
      if (!isNonEmptyString(title)) {
        errors.push({ field: 'title', message: 'title must be a non-empty string when provided.' });
      } else {
        patch.title = title.trim();
      }
    }

    if (payload.message !== undefined) {
      const message = asOptionalString(payload.message);
      if (!isNonEmptyString(message)) {
        errors.push({ field: 'message', message: 'message must be a non-empty string when provided.' });
      } else {
        patch.message = message;
      }
    }

    if (payload.author !== undefined) {
      const author = asOptionalString(payload.author);
      if (author !== undefined && author !== null && typeof author !== 'string') {
        errors.push({ field: 'author', message: 'author must be a string when provided.' });
      } else {
        patch.author = isNonEmptyString(author) ? author.trim() : undefined;
      }
    }

    if (payload.priority !== undefined) {
      const priority = asOptionalString(payload.priority);
      if (priority !== undefined && priority !== null) {
        if (typeof priority !== 'string' || !announcementsStore.ALLOWED_PRIORITIES.has(priority)) {
          errors.push({ field: 'priority', message: 'priority must be one of: low, normal, high.' });
        } else {
          patch.priority = priority;
        }
      } else {
        patch.priority = undefined;
      }
    }

    if (payload.startsAt !== undefined) {
      const startsAt = asOptionalIsoDateString(payload.startsAt);
      if (startsAt === '__INVALID__') {
        errors.push({ field: 'startsAt', message: 'startsAt must be an ISO date string when provided.' });
      } else {
        patch.startsAt = typeof startsAt === 'string' ? startsAt : undefined;
      }
    }

    if (payload.endsAt !== undefined) {
      const endsAt = asOptionalIsoDateString(payload.endsAt);
      if (endsAt === '__INVALID__') {
        errors.push({ field: 'endsAt', message: 'endsAt must be an ISO date string when provided.' });
      } else {
        patch.endsAt = typeof endsAt === 'string' ? endsAt : undefined;
      }
    }

    if (payload.isActive !== undefined) {
      const isActive = asOptionalBoolean(payload.isActive);
      if (isActive === undefined && payload.isActive !== null) {
        errors.push({ field: 'isActive', message: 'isActive must be a boolean when provided.' });
      } else {
        patch.isActive = isActive;
      }
    }

    // If both startsAt/endsAt are being set in this patch, validate ordering.
    const candidateStartsAt =
      Object.prototype.hasOwnProperty.call(patch, 'startsAt') ? patch.startsAt : undefined;
    const candidateEndsAt = Object.prototype.hasOwnProperty.call(patch, 'endsAt') ? patch.endsAt : undefined;

    if (typeof candidateStartsAt === 'string' && typeof candidateEndsAt === 'string') {
      const s = new Date(candidateStartsAt);
      const e = new Date(candidateEndsAt);
      if (!Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime()) && e.getTime() < s.getTime()) {
        errors.push({ field: 'endsAt', message: 'endsAt must be >= startsAt.' });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors,
      });
    }

    try {
      const updated = await announcementsStore.patchAnnouncement(pathId, patch);
      if (!updated) {
        return res.status(404).json({
          status: 'error',
          message: `Announcement with id ${pathId} not found.`,
        });
      }

      return res.status(200).json({
        status: 'success',
        data: updated,
      });
    } catch (err) {
      if (err && err.code === 'VALIDATION_ERROR') {
        return res.status(400).json({ status: 'error', message: err.message });
      }
      return res.status(500).json({
        status: 'error',
        message: 'Failed to update announcement.',
      });
    }
  }

  /**
   * PUBLIC_INTERFACE
   * Deletes an announcement record for the given id (protected).
   *
   * @param {import('express').Request} req Express request
   * @param {import('express').Response} res Express response
   * @returns {Promise<import('express').Response>} 204 on success, 404 if not found.
   */
  async delete(req, res) {
    const pathId = parseIdFromPath(req.params.id);
    if (!pathId) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors: [{ field: 'id', message: 'id path parameter is required.' }],
      });
    }

    const deleted = await announcementsStore.deleteAnnouncement(pathId);
    if (!deleted) {
      return res.status(404).json({
        status: 'error',
        message: `Announcement with id ${pathId} not found.`,
      });
    }

    return res.status(204).send();
  }
}

module.exports = new AnnouncementsController();
