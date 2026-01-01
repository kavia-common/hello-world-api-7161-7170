const express = require('express');

const employeesController = require('../controllers/employees');
const skillFactoriesController = require('../controllers/skillFactories');
const learningPathsController = require('../controllers/learningPaths');
const assessmentsController = require('../controllers/assessments');
const feedbackController = require('../controllers/feedback');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Hello
 *     description: Hello World endpoint
 *   - name: Employees
 *     description: Employee record management (in-memory)
 *   - name: SkillFactories
 *     description: Skill Factory management (in-memory)
 *   - name: LearningPaths
 *     description: Learning Path management (in-memory)
 *   - name: Assessments
 *     description: Assessments management (in-memory)
 *   - name: Feedback
 *     description: Feedback capturing (in-memory)
 */

/**
 * @swagger
 * /hello:
 *   get:
 *     tags: [Hello]
 *     summary: Hello World
 *     description: Returns a simple Hello World response.
 *     responses:
 *       200:
 *         description: Hello World response
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: Hello World
 */
router.get('/hello', (req, res) => {
  return res.status(200).send('Hello World');
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Employee:
 *       type: object
 *       required:
 *         - employeeId
 *         - employeeName
 *         - email
 *       properties:
 *         employeeId:
 *           type: string
 *           description: Unique Employee ID.
 *           example: "E12345"
 *         employeeName:
 *           type: string
 *           description: Employee Name.
 *           example: "Jane Doe"
 *         employeeType:
 *           type: string
 *           description: Employee Type.
 *           example: "Full-time"
 *         email:
 *           type: string
 *           description: Email address.
 *           example: "jane.doe@example.com"
 *         currentCompetency:
 *           type: string
 *           description: Current Competency.
 *           example: "Backend"
 *         currentAccount:
 *           type: string
 *           description: Current Account.
 *           example: "ACME"
 *         currentStatus:
 *           type: string
 *           description: Current Status.
 *           example: "Active"
 *         totalYearsOfExperience:
 *           oneOf:
 *             - type: number
 *             - type: string
 *           description: Total Years of Experience.
 *           example: 5
 *         grade:
 *           type: string
 *           description: Grade.
 *           example: "G6"
 *         designation:
 *           type: string
 *           description: Designation.
 *           example: "Senior Engineer"
 *         role:
 *           type: string
 *           description: Role.
 *           example: "API Developer"
 *         location:
 *           type: string
 *           description: Location.
 *           example: "Bengaluru"
 *         phoneNumber:
 *           type: string
 *           description: Phone Number.
 *           example: "+1-555-0100"
 *         coreSkills:
 *           description: Core Skills.
 *           example: ["Node.js", "Express", "PostgreSQL"]
 *         secondaryTrainingSkills:
 *           description: Secondary/Training Skills.
 *           example: ["Docker", "Kubernetes"]
 *         projectsSupported:
 *           description: Projects Supported.
 *           example: ["Project A", "Project B"]
 *         learningPaths:
 *           description: Learning Paths.
 *           example: ["Cloud Fundamentals"]
 *         skillFactory:
 *           description: Skill Factory.
 *           example: "Platform Engineering"
 *         monthOfJoiningCompetency:
 *           type: string
 *           description: Month of Joining Competency.
 *           example: "2024-01"
 *         monthOfLeavingCompetency:
 *           type: string
 *           description: Month of Leaving Competency.
 *           example: "2024-12"
 *         currentActivity:
 *           type: string
 *           description: Current Activity.
 *           example: "Billable"
 *         feedbackRating:
 *           type: string
 *           description: Optional feedback rating.
 *           enum: ["Needs Improvement", "Average", "Good", "Very Good", "Excellent"]
 *           example: "Very Good"
 *         futureMapping:
 *           type: string
 *           description: Optional free-form notes or future mapping plan.
 *           example: "Shadow senior engineer for 2 months; move to Platform team Q3."
 *         createdAt:
 *           type: string
 *           description: Server timestamp when record was stored.
 *           example: "2026-01-01T00:00:00.000Z"
 *     SkillFactoryEmployee:
 *       type: object
 *       required:
 *         - id
 *         - name
 *         - email
 *         - initialRating
 *         - currentRating
 *         - startDate
 *         - isInPool
 *       properties:
 *         id:
 *           type: string
 *           description: Employee ID.
 *           example: "E12345"
 *         name:
 *           type: string
 *           description: Employee name.
 *           example: "Jane Doe"
 *         email:
 *           type: string
 *           description: Employee email.
 *           example: "jane.doe@example.com"
 *         initialRating:
 *           type: number
 *           description: Initial rating (numeric).
 *           example: 3.5
 *         currentRating:
 *           type: number
 *           description: Current rating (numeric).
 *           example: 4.2
 *         startDate:
 *           type: string
 *           description: Start date (recommended YYYY-MM-DD; also accepts ISO-8601 timestamp strings).
 *           example: "2026-01-01"
 *         endDate:
 *           type: string
 *           nullable: true
 *           description: Optional end date (recommended YYYY-MM-DD; also accepts ISO-8601 timestamp strings). Must be >= startDate when both provided.
 *           example: "2026-06-30"
 *         isInPool:
 *           type: boolean
 *           description: Whether the employee is in pool.
 *           example: true
 *     Mentor:
 *       type: object
 *       required:
 *         - mentorId
 *         - mentorName
 *         - mentorEmail
 *         - isInPool
 *       properties:
 *         mentorId:
 *           type: string
 *           description: Unique mentor ID.
 *           example: "M-001"
 *         mentorName:
 *           type: string
 *           description: Mentor name.
 *           example: "Mentor A"
 *         mentorEmail:
 *           type: string
 *           format: email
 *           description: Mentor email.
 *           example: "mentor.a@example.com"
 *         isInPool:
 *           type: boolean
 *           description: Whether the mentor is in pool.
 *           example: true
 *     SkillFactory:
 *       type: object
 *       required:
 *         - skillFactoryId
 *         - skillFactoryName
 *       properties:
 *         skillFactoryId:
 *           type: string
 *           description: Unique Skill Factory ID.
 *           example: "SF-PLATFORM-001"
 *         skillFactoryName:
 *           type: string
 *           description: Skill Factory Name.
 *           example: "Platform Engineering"
 *         mentors:
 *           type: array
 *           description: Mentors assigned to this skill factory.
 *           items:
 *             $ref: '#/components/schemas/Mentor'
 *           example:
 *             - mentorId: "M-001"
 *               mentorName: "Mentor A"
 *               mentorEmail: "mentor.a@example.com"
 *               isInPool: true
 *             - mentorId: "M-002"
 *               mentorName: "Mentor B"
 *               mentorEmail: "mentor.b@example.com"
 *               isInPool: false
 *         employees:
 *           type: array
 *           description: Employees in this skill factory (each item includes rating/date/pool fields).
 *           items:
 *             $ref: '#/components/schemas/SkillFactoryEmployee'
 *         createdAt:
 *           type: string
 *           description: Server timestamp when record was stored.
 *           example: "2026-01-01T00:00:00.000Z"
 *         updatedAt:
 *           type: string
 *           description: Server timestamp when record was last updated.
 *           example: "2026-01-01T00:00:00.000Z"
 *     LearningPath:
 *       type: object
 *       required:
 *         - learningPathName
 *         - courseLinks
 *         - duration
 *         - enrolledCount
 *         - completedCount
 *         - inProgressCount
 *       properties:
 *         learningPathName:
 *           type: string
 *           description: Unique Learning Path name/identifier.
 *           example: "Cloud Fundamentals"
 *         description:
 *           type: string
 *           description: Optional Learning Path description.
 *           example: "Start-to-finish introduction to cloud concepts."
 *         tags:
 *           type: array
 *           description: Optional tags to categorize the learning path.
 *           items:
 *             type: string
 *           example: ["cloud", "foundations"]
 *         courseLinks:
 *           type: array
 *           description: List of course links (URLs or internal references).
 *           items:
 *             type: string
 *           example: ["https://example.com/course-1", "https://example.com/course-2"]
 *         duration:
 *           oneOf:
 *             - type: number
 *             - type: string
 *           description: Duration of the learning path (e.g., hours as number, or a human-readable string).
 *           example: "6h"
 *         enrolledCount:
 *           type: integer
 *           description: Total number of enrolled learners.
 *           example: 100
 *         completedCount:
 *           type: integer
 *           description: Number of learners who completed the learning path.
 *           example: 40
 *         inProgressCount:
 *           type: integer
 *           description: Number of learners currently in progress.
 *           example: 50
 *         createdAt:
 *           type: string
 *           description: Server timestamp when record was stored.
 *           example: "2026-01-01T00:00:00.000Z"
 *         updatedAt:
 *           type: string
 *           description: Server timestamp when record was last updated.
 *           example: "2026-01-01T00:00:00.000Z"
 *     AssessmentAssignee:
 *       type: object
 *       required:
 *         - employeeId
 *         - employeeName
 *         - email
 *       properties:
 *         employeeId:
 *           type: string
 *           description: Employee ID.
 *           example: "E12345"
 *         employeeName:
 *           type: string
 *           description: Employee name.
 *           example: "Jane Doe"
 *         email:
 *           type: string
 *           description: Employee email.
 *           example: "jane.doe@example.com"
 *     Assessment:
 *       type: object
 *       required:
 *         - assessmentId
 *         - title
 *       properties:
 *         assessmentId:
 *           type: string
 *           description: Unique assessment identifier.
 *           example: "A-001"
 *         title:
 *           type: string
 *           description: Assessment title.
 *           example: "Quarterly Technical Assessment"
 *         description:
 *           type: string
 *           description: Optional description.
 *           example: "Assessment for backend engineering fundamentals."
 *         assignedTo:
 *           type: array
 *           description: List of employees assigned to the assessment.
 *           items:
 *             $ref: '#/components/schemas/AssessmentAssignee'
 *         dueDate:
 *           type: string
 *           description: Optional due date (ISO date string).
 *           example: "2026-02-01T00:00:00.000Z"
 *         status:
 *           type: string
 *           description: Assessment status.
 *           enum: ["Draft", "Assigned", "In Progress", "Completed"]
 *           example: "Assigned"
 *         createdAt:
 *           type: string
 *           description: Server timestamp when record was stored.
 *           example: "2026-01-01T00:00:00.000Z"
 *         updatedAt:
 *           type: string
 *           description: Server timestamp when record was last updated.
 *           example: "2026-01-01T00:00:00.000Z"
 *     Feedback:
 *       type: object
 *       required:
 *         - feedbackId
 *         - assessmentId
 *         - employeeId
 *         - rating
 *       properties:
 *         feedbackId:
 *           type: string
 *           description: Unique feedback identifier.
 *           example: "F-001"
 *         assessmentId:
 *           type: string
 *           description: Assessment ID (reference; not enforced).
 *           example: "A-001"
 *         employeeId:
 *           type: string
 *           description: Employee ID submitting the feedback.
 *           example: "E12345"
 *         rating:
 *           type: string
 *           description: Feedback rating.
 *           enum: ["Needs Improvement", "Average", "Good", "Very Good", "Excellent"]
 *           example: "Very Good"
 *         comments:
 *           type: string
 *           description: Optional comments.
 *           example: "Strong fundamentals; work on testing depth."
 *         submittedAt:
 *           type: string
 *           description: Server timestamp when feedback was submitted.
 *           example: "2026-01-01T00:00:00.000Z"
 */

/**
 * @swagger
 * /employees:
 *   post:
 *     tags: [Employees]
 *     summary: Create an employee record
 *     description: Creates and stores an employee record (in-memory). Requires employeeId, employeeName, and email.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Employee'
 *     responses:
 *       201:
 *         description: Employee created.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Employee'
 *       400:
 *         description: Invalid request or validation failure.
 *       409:
 *         description: Duplicate employeeId.
 */
router.post('/employees', (req, res) => employeesController.create(req, res));

/**
 * @swagger
 * /employees:
 *   get:
 *     tags: [Employees]
 *     summary: List employee records
 *     description: Lists all stored employee records (in-memory).
 *     responses:
 *       200:
 *         description: Employees list.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Employee'
 *                 count:
 *                   type: integer
 *                   example: 1
 */
router.get('/employees', (req, res) => employeesController.list(req, res));

/**
 * @swagger
 * /employees/{employeeId}:
 *   put:
 *     tags: [Employees]
 *     summary: Replace an employee record
 *     description: Replaces the full employee record for the given employeeId (in-memory). employeeName and email are required. If employeeId is present in the body, it must match the path parameter.
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID to replace.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Employee'
 *     responses:
 *       200:
 *         description: Employee updated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Employee'
 *       400:
 *         description: Invalid request or validation failure.
 *       404:
 *         description: Employee not found.
 *   patch:
 *     tags: [Employees]
 *     summary: Partially update an employee record
 *     description: Partially updates fields for the given employeeId (in-memory). Validates updated fields (including feedbackRating enum). If employeeId is present in the body, it must match the path parameter.
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID to patch.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Partial employee fields to update.
 *     responses:
 *       200:
 *         description: Employee updated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Employee'
 *       400:
 *         description: Invalid request or validation failure.
 *       404:
 *         description: Employee not found.
 *   delete:
 *     tags: [Employees]
 *     summary: Delete an employee record
 *     description: Deletes the employee record for the given employeeId (in-memory).
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID to delete.
 *     responses:
 *       204:
 *         description: Employee deleted.
 *       404:
 *         description: Employee not found.
 */
router.put('/employees/:employeeId', (req, res) => employeesController.replace(req, res));
router.patch('/employees/:employeeId', (req, res) => employeesController.patch(req, res));
router.delete('/employees/:employeeId', (req, res) => employeesController.delete(req, res));

/**
 * @swagger
 * /skill-factories:
 *   post:
 *     tags: [SkillFactories]
 *     summary: Create a Skill Factory record
 *     description: Creates and stores a Skill Factory record (in-memory). Requires skillFactoryId and skillFactoryName.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SkillFactory'
 *     responses:
 *       201:
 *         description: Skill Factory created.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/SkillFactory'
 *       400:
 *         description: Invalid request or validation failure.
 *       409:
 *         description: Duplicate skillFactoryId.
 */
router.post('/skill-factories', (req, res) => skillFactoriesController.create(req, res));

/**
 * @swagger
 * /skill-factories:
 *   get:
 *     tags: [SkillFactories]
 *     summary: List Skill Factory records
 *     description: Lists all stored Skill Factory records (in-memory).
 *     responses:
 *       200:
 *         description: Skill Factories list.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SkillFactory'
 *                 count:
 *                   type: integer
 *                   example: 1
 */
router.get('/skill-factories', (req, res) => skillFactoriesController.list(req, res));

/**
 * @swagger
 * /skill-factories/{skillFactoryId}:
 *   get:
 *     tags: [SkillFactories]
 *     summary: Get a Skill Factory record
 *     description: Gets a Skill Factory record by skillFactoryId (in-memory).
 *     parameters:
 *       - in: path
 *         name: skillFactoryId
 *         required: true
 *         schema:
 *           type: string
 *         description: Skill Factory ID to fetch.
 *     responses:
 *       200:
 *         description: Skill Factory record.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/SkillFactory'
 *       404:
 *         description: Skill Factory not found.
 *   put:
 *     tags: [SkillFactories]
 *     summary: Replace a Skill Factory record
 *     description: Replaces the full Skill Factory record for the given skillFactoryId (in-memory). skillFactoryName is required. If skillFactoryId is present in the body, it must match the path parameter.
 *     parameters:
 *       - in: path
 *         name: skillFactoryId
 *         required: true
 *         schema:
 *           type: string
 *         description: Skill Factory ID to replace.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SkillFactory'
 *     responses:
 *       200:
 *         description: Skill Factory updated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/SkillFactory'
 *       400:
 *         description: Invalid request or validation failure.
 *       404:
 *         description: Skill Factory not found.
 *   patch:
 *     tags: [SkillFactories]
 *     summary: Partially update a Skill Factory record
 *     description: Partially updates fields for the given skillFactoryId (in-memory). Validates updated fields and date ordering. If skillFactoryId is present in the body, it must match the path parameter.
 *     parameters:
 *       - in: path
 *         name: skillFactoryId
 *         required: true
 *         schema:
 *           type: string
 *         description: Skill Factory ID to patch.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Partial Skill Factory fields to update.
 *     responses:
 *       200:
 *         description: Skill Factory updated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/SkillFactory'
 *       400:
 *         description: Invalid request or validation failure.
 *       404:
 *         description: Skill Factory not found.
 *   delete:
 *     tags: [SkillFactories]
 *     summary: Delete a Skill Factory record
 *     description: Deletes the Skill Factory record for the given skillFactoryId (in-memory).
 *     parameters:
 *       - in: path
 *         name: skillFactoryId
 *         required: true
 *         schema:
 *           type: string
 *         description: Skill Factory ID to delete.
 *     responses:
 *       204:
 *         description: Skill Factory deleted.
 *       404:
 *         description: Skill Factory not found.
 */
router.get('/skill-factories/:skillFactoryId', (req, res) => skillFactoriesController.getById(req, res));
router.put('/skill-factories/:skillFactoryId', (req, res) => skillFactoriesController.replace(req, res));
router.patch('/skill-factories/:skillFactoryId', (req, res) => skillFactoriesController.patch(req, res));
router.delete('/skill-factories/:skillFactoryId', (req, res) => skillFactoriesController.delete(req, res));

/**
 * @swagger
 * /learningpaths:
 *   post:
 *     tags: [LearningPaths]
 *     summary: Create a Learning Path record
 *     description: Creates and stores a Learning Path record (in-memory). Requires learningPathName (unique), courseLinks (array), duration, and enrollment/completion/in-progress counts.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LearningPath'
 *     responses:
 *       201:
 *         description: Learning Path created.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/LearningPath'
 *       400:
 *         description: Invalid request or validation failure.
 *       409:
 *         description: Duplicate learningPathName.
 */
router.post('/learningpaths', (req, res) => learningPathsController.create(req, res));

/**
 * @swagger
 * /learningpaths:
 *   get:
 *     tags: [LearningPaths]
 *     summary: List Learning Path records
 *     description: Lists all stored Learning Path records (in-memory).
 *     responses:
 *       200:
 *         description: Learning Paths list.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/LearningPath'
 *                 count:
 *                   type: integer
 *                   example: 1
 */
router.get('/learningpaths', (req, res) => learningPathsController.list(req, res));

/**
 * @swagger
 * /learningpaths/{learningPathName}:
 *   put:
 *     tags: [LearningPaths]
 *     summary: Replace a Learning Path record
 *     description: Replaces the full Learning Path record for the given learningPathName (in-memory). If learningPathName is present in the body, it must match the path parameter.
 *     parameters:
 *       - in: path
 *         name: learningPathName
 *         required: true
 *         schema:
 *           type: string
 *         description: Learning Path name to replace.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LearningPath'
 *     responses:
 *       200:
 *         description: Learning Path updated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/LearningPath'
 *       400:
 *         description: Invalid request or validation failure.
 *       404:
 *         description: Learning Path not found.
 *   patch:
 *     tags: [LearningPaths]
 *     summary: Partially update a Learning Path record
 *     description: Partially updates fields for the given learningPathName (in-memory). If learningPathName is present in the body, it must match the path parameter.
 *     parameters:
 *       - in: path
 *         name: learningPathName
 *         required: true
 *         schema:
 *           type: string
 *         description: Learning Path name to patch.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Partial Learning Path fields to update.
 *     responses:
 *       200:
 *         description: Learning Path updated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/LearningPath'
 *       400:
 *         description: Invalid request or validation failure.
 *       404:
 *         description: Learning Path not found.
 *   delete:
 *     tags: [LearningPaths]
 *     summary: Delete a Learning Path record
 *     description: Deletes the Learning Path record for the given learningPathName (in-memory).
 *     parameters:
 *       - in: path
 *         name: learningPathName
 *         required: true
 *         schema:
 *           type: string
 *         description: Learning Path name to delete.
 *     responses:
 *       204:
 *         description: Learning Path deleted.
 *       404:
 *         description: Learning Path not found.
 */
router.put('/learningpaths/:learningPathName', (req, res) => learningPathsController.replace(req, res));
router.patch('/learningpaths/:learningPathName', (req, res) => learningPathsController.patch(req, res));
router.delete('/learningpaths/:learningPathName', (req, res) => learningPathsController.delete(req, res));

/**
 * @swagger
 * /assessments:
 *   post:
 *     tags: [Assessments]
 *     summary: Create an assessment record
 *     description: Creates and stores an assessment record (in-memory). Requires assessmentId and title.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Assessment'
 *     responses:
 *       201:
 *         description: Assessment created.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Assessment'
 *       400:
 *         description: Invalid request or validation failure.
 *       409:
 *         description: Duplicate assessmentId.
 *   get:
 *     tags: [Assessments]
 *     summary: List assessment records
 *     description: Lists all stored assessment records (in-memory).
 *     responses:
 *       200:
 *         description: Assessments list.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Assessment'
 *                 count:
 *                   type: integer
 *                   example: 1
 */
router.post('/assessments', (req, res) => assessmentsController.create(req, res));
router.get('/assessments', (req, res) => assessmentsController.list(req, res));

/**
 * @swagger
 * /assessments/{assessmentId}:
 *   get:
 *     tags: [Assessments]
 *     summary: Get an assessment record
 *     description: Gets an assessment record by assessmentId (in-memory).
 *     parameters:
 *       - in: path
 *         name: assessmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Assessment ID to fetch.
 *     responses:
 *       200:
 *         description: Assessment record.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Assessment'
 *       404:
 *         description: Assessment not found.
 *   put:
 *     tags: [Assessments]
 *     summary: Replace an assessment record
 *     description: Replaces the full assessment record for the given assessmentId (in-memory). title is required. If assessmentId is present in the body, it must match the path parameter.
 *     parameters:
 *       - in: path
 *         name: assessmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Assessment ID to replace.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Assessment'
 *     responses:
 *       200:
 *         description: Assessment updated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Assessment'
 *       400:
 *         description: Invalid request or validation failure.
 *       404:
 *         description: Assessment not found.
 *   patch:
 *     tags: [Assessments]
 *     summary: Partially update an assessment record
 *     description: Partially updates fields for the given assessmentId (in-memory). Validates updated fields. If assessmentId is present in the body, it must match the path parameter.
 *     parameters:
 *       - in: path
 *         name: assessmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Assessment ID to patch.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Partial assessment fields to update.
 *     responses:
 *       200:
 *         description: Assessment updated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Assessment'
 *       400:
 *         description: Invalid request or validation failure.
 *       404:
 *         description: Assessment not found.
 *   delete:
 *     tags: [Assessments]
 *     summary: Delete an assessment record
 *     description: Deletes the assessment record for the given assessmentId (in-memory).
 *     parameters:
 *       - in: path
 *         name: assessmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Assessment ID to delete.
 *     responses:
 *       204:
 *         description: Assessment deleted.
 *       404:
 *         description: Assessment not found.
 */
router.get('/assessments/:assessmentId', (req, res) => assessmentsController.getById(req, res));
router.put('/assessments/:assessmentId', (req, res) => assessmentsController.replace(req, res));
router.patch('/assessments/:assessmentId', (req, res) => assessmentsController.patch(req, res));
router.delete('/assessments/:assessmentId', (req, res) => assessmentsController.delete(req, res));

/**
 * @swagger
 * /feedback:
 *   post:
 *     tags: [Feedback]
 *     summary: Create a feedback record
 *     description: Creates and stores a feedback record (in-memory). Requires feedbackId, assessmentId, employeeId, and rating.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Feedback'
 *     responses:
 *       201:
 *         description: Feedback created.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Feedback'
 *       400:
 *         description: Invalid request or validation failure.
 *       409:
 *         description: Duplicate feedbackId.
 *   get:
 *     tags: [Feedback]
 *     summary: List feedback records
 *     description: Lists all stored feedback records (in-memory).
 *     responses:
 *       200:
 *         description: Feedback list.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Feedback'
 *                 count:
 *                   type: integer
 *                   example: 1
 */
router.post('/feedback', (req, res) => feedbackController.create(req, res));
router.get('/feedback', (req, res) => feedbackController.list(req, res));

/**
 * @swagger
 * /feedback/{feedbackId}:
 *   get:
 *     tags: [Feedback]
 *     summary: Get a feedback record
 *     description: Gets a feedback record by feedbackId (in-memory).
 *     parameters:
 *       - in: path
 *         name: feedbackId
 *         required: true
 *         schema:
 *           type: string
 *         description: Feedback ID to fetch.
 *     responses:
 *       200:
 *         description: Feedback record.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Feedback'
 *       404:
 *         description: Feedback not found.
 *   put:
 *     tags: [Feedback]
 *     summary: Replace a feedback record
 *     description: Replaces the full feedback record for the given feedbackId (in-memory). assessmentId, employeeId, and rating are required. If feedbackId is present in the body, it must match the path parameter.
 *     parameters:
 *       - in: path
 *         name: feedbackId
 *         required: true
 *         schema:
 *           type: string
 *         description: Feedback ID to replace.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Feedback'
 *     responses:
 *       200:
 *         description: Feedback updated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Feedback'
 *       400:
 *         description: Invalid request or validation failure.
 *       404:
 *         description: Feedback not found.
 *   patch:
 *     tags: [Feedback]
 *     summary: Partially update a feedback record
 *     description: Partially updates fields for the given feedbackId (in-memory). Validates updated fields (including rating enum). If feedbackId is present in the body, it must match the path parameter.
 *     parameters:
 *       - in: path
 *         name: feedbackId
 *         required: true
 *         schema:
 *           type: string
 *         description: Feedback ID to patch.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Partial feedback fields to update.
 *     responses:
 *       200:
 *         description: Feedback updated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Feedback'
 *       400:
 *         description: Invalid request or validation failure.
 *       404:
 *         description: Feedback not found.
 *   delete:
 *     tags: [Feedback]
 *     summary: Delete a feedback record
 *     description: Deletes the feedback record for the given feedbackId (in-memory).
 *     parameters:
 *       - in: path
 *         name: feedbackId
 *         required: true
 *         schema:
 *           type: string
 *         description: Feedback ID to delete.
 *     responses:
 *       204:
 *         description: Feedback deleted.
 *       404:
 *         description: Feedback not found.
 */
router.get('/feedback/:feedbackId', (req, res) => feedbackController.getById(req, res));
router.put('/feedback/:feedbackId', (req, res) => feedbackController.replace(req, res));
router.patch('/feedback/:feedbackId', (req, res) => feedbackController.patch(req, res));
router.delete('/feedback/:feedbackId', (req, res) => feedbackController.delete(req, res));

module.exports = router;
