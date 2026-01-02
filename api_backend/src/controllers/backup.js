'use strict';

const backupsStore = require('../services/backupsStore');

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
 * @returns {Promise<any>} metrics payload (as returned by metrics controller)
 */
async function computeMetricsSnapshot() {
  // Prefer summary as a stable "single object" snapshot.
  if (!metricsController || typeof metricsController.getSummary !== 'function') return undefined;

  let captured;
  /** @type {any} */
  const res = {
    status(code) {
      // metrics should be 200, but we ignore for snapshot purposes
      this.statusCode = code;
      return this;
    },
    json(payload) {
      captured = payload;
      return payload;
    },
  };

  // Minimal req object; controller should not rely on req for GET metrics.
  const req = { query: {}, params: {} };

  await metricsController.getSummary(req, res);
  return captured;
}

/**
 * PUBLIC_INTERFACE
 * Creates a backup snapshot by reading from in-memory stores (no external HTTP calls).
 *
 * The resulting snapshot is stored into backupsStore and the id/timestamp are returned.
 *
 * @param {import('express').Request} req Express Request
 * @param {import('express').Response} res Express Response
 * @returns {Promise<void>} JSON response
 */
async function createBackup(req, res) {
  try {
    const timestamp = new Date().toISOString();

    const [employees, skillFactories, learningPaths, assessments, announcements, instructions, metrics] =
      await Promise.all([
        employeesStore.listEmployees(),
        skillFactoriesStore.listSkillFactories(),
        learningPathsStore.listLearningPaths(),
        assessmentsStore.listAssessments(),
        announcementsStore.listAnnouncements(),
        instructionsStore.listInstructions(),
        computeMetricsSnapshot(),
      ]);

    const snapshot = {
      timestamp,
      data: {
        employees,
        skillFactories,
        learningPaths,
        assessments,
        announcements,
        instructions,
        // metrics is optional; include if computed
        ...(metrics !== undefined ? { metrics } : {}),
      },
      metadata: {
        createdBy: req.user && req.user.sub ? req.user.sub : undefined,
        role: req.user && req.user.role ? req.user.role : undefined,
      },
    };

    const stored = await backupsStore.put(snapshot);

    return res.status(201).json({
      status: 'success',
      data: {
        id: stored.id,
        timestamp: stored.timestamp,
      },
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
 * Lists stored backups (public).
 *
 * @param {import('express').Request} _req Express Request
 * @param {import('express').Response} res Express Response
 * @returns {Promise<void>} JSON response
 */
async function listBackups(_req, res) {
  const items = await backupsStore.list();
  return res.status(200).json({
    status: 'success',
    data: items,
    count: items.length,
  });
}

/**
 * PUBLIC_INTERFACE
 * Fetches a specific backup snapshot by id (public).
 *
 * @param {import('express').Request} req Express Request
 * @param {import('express').Response} res Express Response
 * @returns {Promise<void>} JSON response
 */
async function getBackupById(req, res) {
  const { id } = req.params || {};
  const snapshot = await backupsStore.get(id);

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
}

module.exports = {
  createBackup,
  listBackups,
  getBackupById,
};
