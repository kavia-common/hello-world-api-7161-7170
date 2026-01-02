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
const restoreController = require('../controllers/restore');

const { verifyJwt, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * OpenAPI/Swagger documentation lives in this file.
 *
 * swagger-jsdoc is configured to scan:
 * - this routes entrypoint (so all operations appear)
 * - controllers (for shared schemas, if present)
 *
 * @openapi
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @openapi
 * tags:
 *   - name: System
 *     description: Service-level endpoints
 *   - name: Auth
 *     description: Authentication endpoints
 *   - name: Employees
 *     description: Employees CRUD
 *   - name: Skill Factories
 *     description: Skill Factory CRUD
 *   - name: Learning Paths
 *     description: Learning paths CRUD
 *   - name: Assessments
 *     description: Assessments CRUD
 *   - name: Instructions
 *     description: Instructions CRUD
 *   - name: Announcements
 *     description: Announcements CRUD
 *   - name: Metrics
 *     description: Aggregated metrics endpoints
 *   - name: Backup
 *     description: Backup endpoints
 *   - name: Restore
 *     description: Restore endpoints
 */

/**
 * @openapi
 * /hello:
 *   get:
 *     tags: [System]
 *     summary: Hello World
 *     description: Returns a plain text hello message.
 *     responses:
 *       200:
 *         description: Hello World text response
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 */
router.get('/hello', (_req, res) => res.send('Hello World'));

/**
 * @openapi
 * /signup:
 *   post:
 *     tags: [Auth]
 *     summary: Create a new user
 *     description: Creates an in-memory user account.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password, role]
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, manager, user]
 *     responses:
 *       201:
 *         description: User created
 *       400:
 *         description: Validation failed
 *       409:
 *         description: Duplicate username
 */
router.post('/signup', authController.signup);

/**
 * @openapi
 * /login:
 *   post:
 *     tags: [Auth]
 *     summary: Login
 *     description: Authenticates a user and returns a JWT.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login success
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', authController.login);

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [System]
 *     summary: Health check
 *     description: Returns service health.
 *     responses:
 *       200:
 *         description: Service is healthy
 */
router.get('/health', healthController.getHealth);

/**
 * @openapi
 * /employees:
 *   get:
 *     tags: [Employees]
 *     summary: List employees
 *     responses:
 *       200:
 *         description: List employees
 *   post:
 *     tags: [Employees]
 *     summary: Create employee
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         description: Validation failed
 *       409:
 *         description: Duplicate employeeId
 */
router.get('/employees', employeesController.listEmployees);
router.post('/employees', employeesController.createEmployee);

/**
 * @openapi
 * /employees/{employeeId}:
 *   put:
 *     tags: [Employees]
 *     summary: Replace employee
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Updated
 *       400:
 *         description: Validation failed
 *       404:
 *         description: Not found
 *   patch:
 *     tags: [Employees]
 *     summary: Patch employee
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Updated
 *       400:
 *         description: Validation failed
 *       404:
 *         description: Not found
 *   delete:
 *     tags: [Employees]
 *     summary: Delete employee
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Deleted
 *       404:
 *         description: Not found
 */
router.put('/employees/:employeeId', employeesController.replaceEmployee);
router.patch('/employees/:employeeId', employeesController.patchEmployee);
router.delete('/employees/:employeeId', employeesController.deleteEmployee);

/**
 * @openapi
 * /skill-factories:
 *   get:
 *     tags: [Skill Factories]
 *     summary: List skill factories
 *     responses:
 *       200:
 *         description: List skill factories
 *   post:
 *     tags: [Skill Factories]
 *     summary: Create skill factory
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/skill-factories', skillFactoriesController.listSkillFactories);
router.post('/skill-factories', verifyJwt, requireRole(['admin', 'manager']), skillFactoriesController.createSkillFactory);

/**
 * @openapi
 * /skill-factories/{skillFactoryId}:
 *   get:
 *     tags: [Skill Factories]
 *     summary: Get skill factory by id
 *     parameters:
 *       - in: path
 *         name: skillFactoryId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Skill factory
 *       404:
 *         description: Not found
 *   put:
 *     tags: [Skill Factories]
 *     summary: Replace skill factory
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: skillFactoryId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Updated
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 *   patch:
 *     tags: [Skill Factories]
 *     summary: Patch skill factory
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: skillFactoryId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Updated
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 *   delete:
 *     tags: [Skill Factories]
 *     summary: Delete skill factory
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: skillFactoryId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 */
router.get('/skill-factories/:skillFactoryId', skillFactoriesController.getSkillFactoryById);
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
 * @openapi
 * /learningpaths:
 *   get:
 *     tags: [Learning Paths]
 *     summary: List learning paths
 *     responses:
 *       200:
 *         description: List learning paths
 *   post:
 *     tags: [Learning Paths]
 *     summary: Create learning path
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/learningpaths', learningPathsController.listLearningPaths);
router.post('/learningpaths', verifyJwt, requireRole(['admin', 'manager']), learningPathsController.createLearningPath);

/**
 * @openapi
 * /learningpaths/{learningPathName}:
 *   put:
 *     tags: [Learning Paths]
 *     summary: Replace learning path
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: learningPathName
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Updated
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 *   patch:
 *     tags: [Learning Paths]
 *     summary: Patch learning path
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: learningPathName
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Updated
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 *   delete:
 *     tags: [Learning Paths]
 *     summary: Delete learning path
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: learningPathName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 */
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
 * @openapi
 * /assessments:
 *   get:
 *     tags: [Assessments]
 *     summary: List assessments
 *     responses:
 *       200:
 *         description: List assessments
 *   post:
 *     tags: [Assessments]
 *     summary: Create assessment
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/assessments', assessmentsController.listAssessments);
router.post('/assessments', verifyJwt, requireRole(['admin', 'manager']), assessmentsController.createAssessment);

/**
 * @openapi
 * /assessments/{assessmentId}:
 *   get:
 *     tags: [Assessments]
 *     summary: Get assessment by id
 *     parameters:
 *       - in: path
 *         name: assessmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Assessment
 *       404:
 *         description: Not found
 *   put:
 *     tags: [Assessments]
 *     summary: Replace assessment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assessmentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Updated
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 *   patch:
 *     tags: [Assessments]
 *     summary: Patch assessment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assessmentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Updated
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 *   delete:
 *     tags: [Assessments]
 *     summary: Delete assessment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assessmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 */
router.get('/assessments/:assessmentId', assessmentsController.getAssessmentById);
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
 * @openapi
 * /instructions:
 *   get:
 *     tags: [Instructions]
 *     summary: List instructions
 *     responses:
 *       200:
 *         description: List instructions
 *   post:
 *     tags: [Instructions]
 *     summary: Create instruction
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/instructions', instructionsController.listInstructions);
router.post('/instructions', verifyJwt, requireRole(['admin', 'manager']), instructionsController.createInstruction);

/**
 * @openapi
 * /instructions/{id}:
 *   get:
 *     tags: [Instructions]
 *     summary: Get instruction by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Instruction
 *       404:
 *         description: Not found
 *   put:
 *     tags: [Instructions]
 *     summary: Replace instruction
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Updated
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 *   patch:
 *     tags: [Instructions]
 *     summary: Patch instruction
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Updated
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 *   delete:
 *     tags: [Instructions]
 *     summary: Delete instruction
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 */
router.get('/instructions/:id', instructionsController.getInstructionById);
router.put('/instructions/:id', verifyJwt, requireRole(['admin', 'manager']), instructionsController.replaceInstruction);
router.patch('/instructions/:id', verifyJwt, requireRole(['admin', 'manager']), instructionsController.patchInstruction);
router.delete('/instructions/:id', verifyJwt, requireRole(['admin', 'manager']), instructionsController.deleteInstruction);

/**
 * @openapi
 * /announcements:
 *   get:
 *     tags: [Announcements]
 *     summary: List announcements
 *     responses:
 *       200:
 *         description: List announcements
 *   post:
 *     tags: [Announcements]
 *     summary: Create announcement
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/announcements', announcementsController.listAnnouncements);
router.post('/announcements', verifyJwt, requireRole(['admin', 'manager']), announcementsController.createAnnouncement);

/**
 * @openapi
 * /announcements/{id}:
 *   get:
 *     tags: [Announcements]
 *     summary: Get announcement by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Announcement
 *       404:
 *         description: Not found
 *   put:
 *     tags: [Announcements]
 *     summary: Replace announcement
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Updated
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 *   patch:
 *     tags: [Announcements]
 *     summary: Patch announcement
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Updated
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 *   delete:
 *     tags: [Announcements]
 *     summary: Delete announcement
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 */
router.get('/announcements/:id', announcementsController.getAnnouncementById);
router.put('/announcements/:id', verifyJwt, requireRole(['admin', 'manager']), announcementsController.replaceAnnouncement);
router.patch('/announcements/:id', verifyJwt, requireRole(['admin', 'manager']), announcementsController.patchAnnouncement);
router.delete('/announcements/:id', verifyJwt, requireRole(['admin', 'manager']), announcementsController.deleteAnnouncement);

/**
 * @openapi
 * /metrics/summary:
 *   get:
 *     tags: [Metrics]
 *     summary: Metrics summary
 *     description: Aggregated metrics computed from persisted resources.
 *     responses:
 *       200:
 *         description: Metrics summary
 */
router.get('/metrics/summary', metricsController.getSummary);

/**
 * @openapi
 * /metrics/learning-paths:
 *   get:
 *     tags: [Metrics]
 *     summary: Learning paths metrics
 *     responses:
 *       200:
 *         description: Learning path metrics
 */
router.get('/metrics/learning-paths', metricsController.getLearningPathsMetrics);

/**
 * @openapi
 * /metrics/skill-factories:
 *   get:
 *     tags: [Metrics]
 *     summary: Skill factories metrics
 *     responses:
 *       200:
 *         description: Skill factory metrics
 */
router.get('/metrics/skill-factories', metricsController.getSkillFactoriesMetrics);

/**
 * @openapi
 * components:
 *   schemas:
 *     BackupSnapshotMeta:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Snapshot id (also the JSON filename without extension).
 *         filename:
 *           type: string
 *           description: Snapshot JSON filename on disk.
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: ISO timestamp embedded in the snapshot content (if available).
 *         sizeBytes:
 *           type: integer
 *           description: File size in bytes.
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Filesystem mtime (used as a fallback when timestamp is missing).
 *     BackupSnapshot:
 *       type: object
 *       description: Full JSON snapshot content persisted to disk.
 *       properties:
 *         id:
 *           type: string
 *         timestamp:
 *           type: string
 *           format: date-time
 *         kind:
 *           type: string
 *           example: public-get-snapshot
 *         data:
 *           type: object
 *         metadata:
 *           type: object
 *
 * /backup:
 *   get:
 *     tags: [Backup]
 *     summary: List backups
 *     description: Lists available JSON snapshot files stored on disk.
 *     responses:
 *       200:
 *         description: List of snapshot metadata
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BackupSnapshotMeta'
 *       500:
 *         description: Failed to list backups
 *   post:
 *     tags: [Backup]
 *     summary: Create backup
 *     description: Aggregates all public GET endpoints into a single JSON snapshot and writes it to disk.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Snapshot created and persisted to disk
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     filename:
 *                       type: string
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     sizeBytes:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Failed to create backup
 */
router.post('/backup', verifyJwt, requireRole(['admin', 'manager']), backupController.createBackup);
router.get('/backup', backupController.listBackups);

/**
 * @openapi
 * /backup/{id}:
 *   get:
 *     tags: [Backup]
 *     summary: Get backup by id
 *     description: Reads a snapshot JSON file from disk and returns its full content.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Snapshot id (uuid) or filename (uuid.json).
 *     responses:
 *       200:
 *         description: Snapshot content
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/BackupSnapshot'
 *       400:
 *         description: Missing id
 *       404:
 *         description: Snapshot not found
 *       500:
 *         description: Failed to read snapshot (IO or JSON parse error)
 */
router.get('/backup/:id', backupController.getBackupById);

/**
 * @openapi
 * components:
 *   schemas:
 *     RestoreRequest:
 *       type: object
 *       description: Request to restore state from a backup snapshot.
 *       properties:
 *         snapshotId:
 *           type: string
 *           description: Snapshot id (uuid) or filename (uuid.json) to load from disk.
 *         snapshot:
 *           type: object
 *           description: Full snapshot object (as returned by GET /backup/{id} or created by POST /backup).
 *       oneOf:
 *         - required: [snapshotId]
 *         - required: [snapshot]
 *     RestoreResourceCount:
 *       type: object
 *       properties:
 *         attempted:
 *           type: integer
 *           example: 10
 *         restored:
 *           type: integer
 *           example: 10
 *         failed:
 *           type: integer
 *           example: 0
 *     RestoreSummary:
 *       type: object
 *       properties:
 *         employees:
 *           $ref: '#/components/schemas/RestoreResourceCount'
 *         skillFactories:
 *           $ref: '#/components/schemas/RestoreResourceCount'
 *         learningPaths:
 *           $ref: '#/components/schemas/RestoreResourceCount'
 *         assessments:
 *           $ref: '#/components/schemas/RestoreResourceCount'
 *         instructions:
 *           $ref: '#/components/schemas/RestoreResourceCount'
 *         announcements:
 *           $ref: '#/components/schemas/RestoreResourceCount'
 *     RestoreErrorItem:
 *       type: object
 *       properties:
 *         resource:
 *           type: string
 *           example: employees
 *         index:
 *           type: integer
 *           example: 0
 *         message:
 *           type: string
 *           example: Employee with this employeeId already exists.
 *     RestoreResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: success
 *         data:
 *           type: object
 *           properties:
 *             restoreMode:
 *               type: string
 *               enum: [replace, merge]
 *             snapshotId:
 *               type: string
 *               description: Snapshot id if present in the snapshot payload.
 *             timestamp:
 *               type: string
 *               format: date-time
 *             kind:
 *               type: string
 *             summary:
 *               $ref: '#/components/schemas/RestoreSummary'
 *             warnings:
 *               type: array
 *               items:
 *                 type: string
 *             errors:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/RestoreErrorItem'
 *
 * /restore:
 *   post:
 *     tags: [Restore]
 *     summary: Restore state from a backup snapshot
 *     description: |
 *       Restores persisted application state (MongoDB) by replaying create operations for each resource.
 *
 *       Default behavior is idempotent-safe **replace** mode which clears current MongoDB collections first.
 *       Use `?restoreMode=merge` to keep existing data and attempt to insert from the snapshot.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: restoreMode
 *         required: false
 *         schema:
 *           type: string
 *           enum: [replace, merge]
 *           default: replace
 *         description: replace clears existing MongoDB collections before restore; merge keeps existing data.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RestoreRequest'
 *     responses:
 *       200:
 *         description: Restore completed (may include per-item errors)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RestoreResponse'
 *       400:
 *         description: Validation failed (missing snapshotId/snapshot, or invalid payload)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Failed to restore (unexpected server error)
 */
router.post('/restore', verifyJwt, requireRole(['admin', 'manager']), restoreController.restore);

module.exports = router;
