'use strict';

const backupsFileStore = require('../services/backupsFileStore');

const employeesStore = require('../services/employeesStore');
const skillFactoriesStore = require('../services/skillFactoriesStore');
const learningPathsStore = require('../services/learningPathsStore');
const assessmentsStore = require('../services/assessmentsStore');
const announcementsStore = require('../services/announcementsStore');
const instructionsStore = require('../services/instructionsStore');

const metricsController = require('./metrics');

/**
 * Runs the metrics controller internally and extracts its JSON payload.
 *
 * We avoid external HTTP calls by invoking the controller handler directly with a stubbed response.
 *
 * @param {import('express').RequestHandler} handler Metrics handler
 * @returns {Promise<any>} metrics payload (as returned by metrics controller)
 */
async function runMetricsHandler(handler) {
  if (typeof handler !== 'function') return undefined;

  let captured;
  /** @type {any} */
  const res = {
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      captured = payload;
      return payload;
    },
  };

  const req = { query: {}, params: {} };
  await handler(req, res);
  return captured;
}

/**
 * Computes the "all public GET endpoints" snapshot.
 *
 * NOTE:
 * - We snapshot data for list endpoints plus metrics endpoints.
 * - For "by id" endpoints, there is no stable set of IDs to enumerate in a generic way,
 *   so we snapshot the collections and key computed resources.
 *
 * @param {import('express').Request} req Express Request (used for metadata only)
 * @returns {Promise<object>} Snapshot payload
 */
async function buildSnapshot(req) {
  const timestamp = new Date().toISOString();

  const [employees, skillFactories, learningPaths, assessments, announcements, instructions] = await Promise.all([
    employeesStore.listEmployees(),
    skillFactoriesStore.listSkillFactories(),
    learningPathsStore.listLearningPaths(),
    assessmentsStore.listAssessments(),
    announcementsStore.listAnnouncements(),
    instructionsStore.listInstructions(),
  ]);

  const [metricsSummary, metricsLearningPaths, metricsSkillFactories] = await Promise.all([
    runMetricsHandler(metricsController.getSummary),
    runMetricsHandler(metricsController.getLearningPathsMetrics),
    runMetricsHandler(metricsController.getSkillFactoriesMetrics),
  ]);

  return {
    timestamp,
    kind: 'public-get-snapshot',
    data: {
      hello: 'Hello World',
      health: { status: 'ok' },
      employees,
      skillFactories,
      learningPaths,
      assessments,
      announcements,
      instructions,
      metrics: {
        summary: metricsSummary,
        learningPaths: metricsLearningPaths,
        skillFactories: metricsSkillFactories,
      },
    },
    metadata: {
      createdBy: req.user && req.user.username ? req.user.username : undefined,
      role: req.user && req.user.role ? req.user.role : undefined,
      source: 'in-process',
    },
  };
}

/**
 * PUBLIC_INTERFACE
 * Creates a backup snapshot by aggregating responses from all public GET endpoints
 * and persisting them to a JSON file on disk.
 *
 * Authz:
 * - Protected: verifyJwt + requireRole(['admin','manager']) should be applied at route level.
 *
 * Response:
 * - 201 with snapshot metadata { id, filename, timestamp, sizeBytes }
 *
 * @param {import('express').Request} req Express Request
 * @param {import('express').Response} res Express Response
 * @returns {Promise<void>} JSON response
 */
async function createBackup(req, res) {
  try {
    const snapshot = await buildSnapshot(req);
    const stored = await backupsFileStore.writeSnapshot(snapshot);

    return res.status(201).json({
      status: 'success',
      data: stored,
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: err && err.message ? err.message : 'Failed to create backup snapshot.',
    });
  }
}

/**
 * PUBLIC_INTERFACE
 * Lists stored backup snapshots available on disk (public).
 *
 * @param {import('express').Request} _req Express Request
 * @param {import('express').Response} res Express Response
 * @returns {Promise<void>} JSON response
 */
async function listBackups(_req, res) {
  try {
    const items = await backupsFileStore.listSnapshots();
    return res.status(200).json({
      status: 'success',
      data: items,
      count: items.length,
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: err && err.message ? err.message : 'Failed to list backups.',
    });
  }
}

/**
 * PUBLIC_INTERFACE
 * Fetches a specific backup snapshot by id/filename (public).
 *
 * If the file doesn't exist, returns 404.
 * If the file exists but is not valid JSON, returns 500.
 *
 * @param {import('express').Request} req Express Request
 * @param {import('express').Response} res Express Response
 * @returns {Promise<void>} JSON response
 */
async function getBackupById(req, res) {
  const { id } = req.params || {};
  if (!id || String(id).trim().length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing backup id.',
    });
  }

  try {
    const { snapshot } = await backupsFileStore.readSnapshot(id);

    if (!snapshot) {
      return res.status(404).json({
        status: 'error',
        message: 'Backup not found.',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: snapshot,
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: err && err.message ? err.message : 'Failed to read backup snapshot.',
    });
  }
}

module.exports = {
  createBackup,
  listBackups,
  getBackupById,
};

