'use strict';

const instructionsStore = require('../services/instructionsStore');

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

class InstructionsController {
  /**
   * PUBLIC_INTERFACE
   * Creates a new instruction (in-memory).
   *
   * Required fields:
   * - id (string)
   * - title (string)
   * - content (string)
   *
   * Optional fields:
   * - slug (string, unique if provided)
   * - category (string)
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

    const id = asOptionalString(payload.id);
    const title = asOptionalString(payload.title);
    const content = asOptionalString(payload.content);
    const slug = asOptionalString(payload.slug);
    const category = asOptionalString(payload.category);

    const errors = [];
    if (!isNonEmptyString(id)) errors.push({ field: 'id', message: 'id is required.' });
    if (!isNonEmptyString(title)) errors.push({ field: 'title', message: 'title is required.' });
    if (!isNonEmptyString(content)) errors.push({ field: 'content', message: 'content is required.' });

    if (slug !== undefined && slug !== null && typeof slug !== 'string') {
      errors.push({ field: 'slug', message: 'slug must be a string.' });
    } else if (isNonEmptyString(slug) && slug.trim().length > 120) {
      errors.push({ field: 'slug', message: 'slug must be <= 120 characters.' });
    }

    if (category !== undefined && category !== null && typeof category !== 'string') {
      errors.push({ field: 'category', message: 'category must be a string.' });
    }

    if (errors.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors,
      });
    }

    const record = {
      id: id.trim(),
      title: title.trim(),
      content: content,
      slug: isNonEmptyString(slug) ? slug.trim() : undefined,
      category: isNonEmptyString(category) ? category.trim() : undefined,
    };

    try {
      const created = await instructionsStore.createInstruction(record);
      return res.status(201).json({
        status: 'success',
        data: created,
      });
    } catch (err) {
      if (err && err.code === 'DUPLICATE_ID') {
        return res.status(409).json({ status: 'error', message: err.message });
      }
      if (err && err.code === 'DUPLICATE_SLUG') {
        return res.status(409).json({ status: 'error', message: err.message });
      }
      if (err && err.code === 'VALIDATION_ERROR') {
        return res.status(400).json({ status: 'error', message: err.message });
      }

      return res.status(500).json({
        status: 'error',
        message: 'Failed to create instruction.',
      });
    }
  }

  /**
   * PUBLIC_INTERFACE
   * Lists all stored instructions (in-memory).
   *
   * @param {import('express').Request} req Express request
   * @param {import('express').Response} res Express response
   * @returns {Promise<import('express').Response>} Response containing instruction list.
   */
  async list(req, res) {
    const instructions = await instructionsStore.listInstructions();
    return res.status(200).json({
      status: 'success',
      data: instructions,
      count: instructions.length,
    });
  }

  /**
   * PUBLIC_INTERFACE
   * Gets a single instruction by id.
   *
   * @param {import('express').Request} req Express request
   * @param {import('express').Response} res Express response
   * @returns {Promise<import('express').Response>} Response with instruction or 404.
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

    const record = await instructionsStore.getInstructionById(id);
    if (!record) {
      return res.status(404).json({
        status: 'error',
        message: `Instruction with id ${id} not found.`,
      });
    }

    return res.status(200).json({
      status: 'success',
      data: record,
    });
  }

  /**
   * PUBLIC_INTERFACE
   * Replaces a full instruction record for the given id.
   *
   * Required fields in body:
   * - title
   * - content
   *
   * Optional:
   * - slug (unique if provided)
   * - category
   *
   * @param {import('express').Request} req Express request
   * @param {import('express').Response} res Express response
   * @returns {Promise<import('express').Response>} Updated instruction or error response.
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
    const content = asOptionalString(payload.content);
    const slug = asOptionalString(payload.slug);
    const category = asOptionalString(payload.category);

    if (!isNonEmptyString(title)) errors.push({ field: 'title', message: 'title is required.' });
    if (!isNonEmptyString(content)) errors.push({ field: 'content', message: 'content is required.' });

    if (slug !== undefined && slug !== null && typeof slug !== 'string') {
      errors.push({ field: 'slug', message: 'slug must be a string.' });
    } else if (isNonEmptyString(slug) && slug.trim().length > 120) {
      errors.push({ field: 'slug', message: 'slug must be <= 120 characters.' });
    }

    if (category !== undefined && category !== null && typeof category !== 'string') {
      errors.push({ field: 'category', message: 'category must be a string.' });
    }

    if (errors.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors,
      });
    }

    const existing = await instructionsStore.getInstructionById(pathId);
    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: `Instruction with id ${pathId} not found.`,
      });
    }

    const replacement = {
      id: pathId,
      title: title.trim(),
      content,
      slug: isNonEmptyString(slug) ? slug.trim() : undefined,
      category: isNonEmptyString(category) ? category.trim() : undefined,
    };

    try {
      const updated = await instructionsStore.replaceInstruction(pathId, replacement);
      if (!updated) {
        return res.status(404).json({
          status: 'error',
          message: `Instruction with id ${pathId} not found.`,
        });
      }

      return res.status(200).json({
        status: 'success',
        data: updated,
      });
    } catch (err) {
      if (err && err.code === 'DUPLICATE_SLUG') {
        return res.status(409).json({ status: 'error', message: err.message });
      }
      return res.status(500).json({
        status: 'error',
        message: 'Failed to update instruction.',
      });
    }
  }

  /**
   * PUBLIC_INTERFACE
   * Partially updates an instruction record for the given id.
   *
   * Validation rules:
   * - if body.id is present, it must match the path id
   * - if title is present, it must be a non-empty string
   * - if content is present, it must be a non-empty string
   *
   * @param {import('express').Request} req Express request
   * @param {import('express').Response} res Express response
   * @returns {Promise<import('express').Response>} Updated instruction or error response.
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

    if (payload.content !== undefined) {
      const content = asOptionalString(payload.content);
      if (!isNonEmptyString(content)) {
        errors.push({ field: 'content', message: 'content must be a non-empty string when provided.' });
      } else {
        patch.content = content;
      }
    }

    if (payload.slug !== undefined) {
      const slug = asOptionalString(payload.slug);
      if (slug !== undefined && slug !== null && typeof slug !== 'string') {
        errors.push({ field: 'slug', message: 'slug must be a string when provided.' });
      } else if (isNonEmptyString(slug) && slug.trim().length > 120) {
        errors.push({ field: 'slug', message: 'slug must be <= 120 characters.' });
      } else {
        // allow clearing slug by setting null/empty string; store will handle mapping
        patch.slug = isNonEmptyString(slug) ? slug.trim() : undefined;
      }
    }

    if (payload.category !== undefined) {
      const category = asOptionalString(payload.category);
      if (category !== undefined && category !== null && typeof category !== 'string') {
        errors.push({ field: 'category', message: 'category must be a string when provided.' });
      } else {
        patch.category = isNonEmptyString(category) ? category.trim() : undefined;
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
      const updated = await instructionsStore.patchInstruction(pathId, patch);
      if (!updated) {
        return res.status(404).json({
          status: 'error',
          message: `Instruction with id ${pathId} not found.`,
        });
      }

      return res.status(200).json({
        status: 'success',
        data: updated,
      });
    } catch (err) {
      if (err && err.code === 'DUPLICATE_SLUG') {
        return res.status(409).json({ status: 'error', message: err.message });
      }
      return res.status(500).json({
        status: 'error',
        message: 'Failed to update instruction.',
      });
    }
  }

  /**
   * PUBLIC_INTERFACE
   * Deletes an instruction record for the given id.
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

    const deleted = await instructionsStore.deleteInstruction(pathId);
    if (!deleted) {
      return res.status(404).json({
        status: 'error',
        message: `Instruction with id ${pathId} not found.`,
      });
    }

    return res.status(204).send();
  }
}

module.exports = new InstructionsController();

