'use strict';

const express = require('express');

const employeesController = require('../controllers/employees');
const skillFactoriesController = require('../controllers/skillFactories');
const learningPathsController = require('../controllers/learningPaths');
const assessmentsController = require('../controllers/assessments');
const instructionsController = require('../controllers/instructions');
const announcementsController = require('../controllers/announcements');
const authController = require('../controllers/auth');
const healthController = require('../controllers/health');
const metricsController = require('../controllers/metrics');
const backupController = require('../controllers/backup');

const { verifyJwt, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * Hello World
 */
router.get('/hello', (_req, res) => res.send('Hello World'));

/**
 * Auth
 */
router.post('/signup', authController.signup);
router.post('/login', authController.login);

/**
 * Health
 */
router.get('/health', healthController.getHealth);

/**
 * Employees (public GET)
 */
router.get('/employees', employeesController.listEmployees);
router.post('/employees', employeesController.createEmployee);
router.put('/employees/:employeeId', employeesController.replaceEmployee);
router.patch('/employees/:employeeId', employeesController.patchEmployee);
router.delete('/employees/:employeeId', employeesController.deleteEmployee);

/**
 * Skill Factories (GET public, mutations protected)
 */
router.get('/skill-factories', skillFactoriesController.listSkillFactories);
router.get('/skill-factories/:skillFactoryId', skillFactoriesController.getSkillFactoryById);
router.post('/skill-factories', verifyJwt, requireRole(['admin', 'manager']), skillFactoriesController.createSkillFactory);
router.put(
  '/skill-factories/:skillFactoryId',
  verifyJwt,
  requireRole(['admin', 'manager']),
  skillFactoriesController.replaceSkillFactory
);
router.patch(
  '/skill-factories/:skillFactoryId',
  verifyJwt,
  requireRole(['admin', 'manager']),
  skillFactoriesController.patchSkillFactory
);
router.delete(
  '/skill-factories/:skillFactoryId',
  verifyJwt,
  requireRole(['admin', 'manager']),
  skillFactoriesController.deleteSkillFactory
);

/**
 * Learning Paths (GET public, mutations protected)
 *
 * Note: existing path is /learningpaths (no dash) for compatibility.
 */
router.get('/learningpaths', learningPathsController.listLearningPaths);
router.post('/learningpaths', verifyJwt, requireRole(['admin', 'manager']), learningPathsController.createLearningPath);
router.put(
  '/learningpaths/:learningPathName',
  verifyJwt,
  requireRole(['admin', 'manager']),
  learningPathsController.replaceLearningPath
);
router.patch(
  '/learningpaths/:learningPathName',
  verifyJwt,
  requireRole(['admin', 'manager']),
  learningPathsController.patchLearningPath
);
router.delete(
  '/learningpaths/:learningPathName',
  verifyJwt,
  requireRole(['admin', 'manager']),
  learningPathsController.deleteLearningPath
);

/**
 * Assessments (GET public, mutations protected)
 */
router.get('/assessments', assessmentsController.listAssessments);
router.get('/assessments/:assessmentId', assessmentsController.getAssessmentById);
router.post('/assessments', verifyJwt, requireRole(['admin', 'manager']), assessmentsController.createAssessment);
router.put(
  '/assessments/:assessmentId',
  verifyJwt,
  requireRole(['admin', 'manager']),
  assessmentsController.replaceAssessment
);
router.patch(
  '/assessments/:assessmentId',
  verifyJwt,
  requireRole(['admin', 'manager']),
  assessmentsController.patchAssessment
);
router.delete(
  '/assessments/:assessmentId',
  verifyJwt,
  requireRole(['admin', 'manager']),
  assessmentsController.deleteAssessment
);

/**
 * Instructions (GET public, mutations protected)
 */
router.get('/instructions', instructionsController.listInstructions);
router.get('/instructions/:id', instructionsController.getInstructionById);
router.post('/instructions', verifyJwt, requireRole(['admin', 'manager']), instructionsController.createInstruction);
router.put('/instructions/:id', verifyJwt, requireRole(['admin', 'manager']), instructionsController.replaceInstruction);
router.patch('/instructions/:id', verifyJwt, requireRole(['admin', 'manager']), instructionsController.patchInstruction);
router.delete(
  '/instructions/:id',
  verifyJwt,
  requireRole(['admin', 'manager']),
  instructionsController.deleteInstruction
);

/**
 * Announcements (GET public, mutations protected)
 */
router.get('/announcements', announcementsController.listAnnouncements);
router.get('/announcements/:id', announcementsController.getAnnouncementById);
router.post('/announcements', verifyJwt, requireRole(['admin', 'manager']), announcementsController.createAnnouncement);
router.put(
  '/announcements/:id',
  verifyJwt,
  requireRole(['admin', 'manager']),
  announcementsController.replaceAnnouncement
);
router.patch(
  '/announcements/:id',
  verifyJwt,
  requireRole(['admin', 'manager']),
  announcementsController.patchAnnouncement
);
router.delete(
  '/announcements/:id',
  verifyJwt,
  requireRole(['admin', 'manager']),
  announcementsController.deleteAnnouncement
);

/**
 * Metrics (public)
 */
router.get('/metrics/summary', metricsController.getSummary);
router.get('/metrics/learning-paths', metricsController.getLearningPathsMetrics);
router.get('/metrics/skill-factories', metricsController.getSkillFactoriesMetrics);

/**
 * @swagger
 * tags:
 *   - name: Backups
 *     description: Create and retrieve in-memory backup snapshots.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     BackupListItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Backup id
 *         timestamp:
 *           type: string
 *           description: ISO timestamp when backup was created
 *         metadata:
 *           type: object
 *           description: Optional metadata recorded at creation time
 *     BackupSnapshot:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         timestamp:
 *           type: string
 *         data:
 *           type: object
 *         metadata:
 *           type: object
 *     BackupJobRun:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique job run id
 *         startedAt:
 *           type: string
 *           description: ISO timestamp
 *         finishedAt:
 *           type: string
 *           description: ISO timestamp
 *         status:
 *           type: string
 *           enum: [running, success, error]
 *         trigger:
 *           type: string
 *           description: What triggered the run (e.g. scheduler)
 *         durationMs:
 *           type: number
 *         backup:
 *           type: object
 *           description: Backup metadata produced by the run (on success)
 *         error:
 *           type: string
 *           description: Error message (on failure)
 */

/**
 * Backups
 * - POST /backup is protected (admin/manager)
 * - GET /backup and GET /backup/:id are public reads
 * - GET /backup/jobs is protected (admin/manager) to inspect recent scheduler runs
 */

/**
 * @swagger
 * /backup:
 *   post:
 *     summary: Create a backup snapshot
 *     description: Creates a backup snapshot by reading from in-memory stores (no external HTTP calls).
 *     tags: [Backups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Backup created
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.post('/backup', verifyJwt, requireRole(['admin', 'manager']), backupController.createBackup);

/**
 * @swagger
 * /backup:
 *   get:
 *     summary: List backups
 *     description: Lists stored backups (metadata only). Backups are stored in-memory and reset on restart.
 *     tags: [Backups]
 *     responses:
 *       200:
 *         description: Backup list
 */
router.get('/backup', backupController.listBackups);

/**
 * @swagger
 * /backup/{id}:
 *   get:
 *     summary: Get backup by id
 *     description: Fetches a specific backup snapshot by id.
 *     tags: [Backups]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Backup snapshot
 *       404:
 *         description: Not found
 */
router.get('/backup/:id', backupController.getBackupById);

/**
 * @swagger
 * /backup/jobs:
 *   get:
 *     summary: List recent backup scheduler runs
 *     description: Lists recent periodic backup runs (start/end/status/error). Protected for operational visibility.
 *     tags: [Backups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Job run list
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/backup/jobs', verifyJwt, requireRole(['admin', 'manager']), backupController.listBackupJobs);

module.exports = router;
