const express = require('express');

const employeesController = require('../controllers/employees');
const skillFactoriesController = require('../controllers/skillFactories');
const learningPathsController = require('../controllers/learningPaths');
const assessmentsController = require('../controllers/assessments');
const metricsController = require('../controllers/metrics');
const authController = require('../controllers/auth');
const instructionsController = require('../controllers/instructions');
const announcementsController = require('../controllers/announcements');
const { verifyJwt, requireRole } = require('../middleware');

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
 *   - name: Metrics
 *     description: Aggregated success metrics across Learning Paths, Skill Factories, and Employees (computed in-memory)
 *   - name: Auth
 *     description: User signup/authentication endpoints (in-memory)
 *   - name: Instructions
 *     description: Instruction content management (in-memory)
 *   - name: Announcements
 *     description: Announcements feed management (in-memory)
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
 * /signup:
 *   post:
 *     tags: [Auth]
 *     summary: Sign up a new user
 *     description: |
 *       Creates a new user (in-memory) by validating {username, password, role},
 *       hashing the password with bcrypt, and storing as passwordHash.
 *
 *       Notes:
 *       - Duplicate usernames are rejected (409).
 *       - The response never returns password or passwordHash.
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
 *                 description: Unique username (case-sensitive).
 *                 example: "jane.doe"
 *               password:
 *                 type: string
 *                 description: Plain-text password; will be bcrypt-hashed before storage.
 *                 example: "S3cretPass!"
 *               role:
 *                 type: string
 *                 description: Role for the user.
 *                 enum: [admin, manager, user]
 *                 example: "user"
 *           examples:
 *             signupUser:
 *               summary: Create a standard user
 *               value:
 *                 username: "jane.doe"
 *                 password: "S3cretPass!"
 *                 role: "user"
 *             signupAdmin:
 *               summary: Create an admin user
 *               value:
 *                 username: "admin.user"
 *                 password: "AdminPass123!"
 *                 role: "admin"
 *     responses:
 *       201:
 *         description: User created.
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
 *                     username:
 *                       type: string
 *                       example: "jane.doe"
 *                     role:
 *                       type: string
 *                       enum: [admin, manager, user]
 *                       example: "user"
 *                     createdAt:
 *                       type: string
 *                       example: "2026-01-01T00:00:00.000Z"
 *             examples:
 *               created:
 *                 summary: Successful signup
 *                 value:
 *                   status: "success"
 *                   data:
 *                     username: "jane.doe"
 *                     role: "user"
 *                     createdAt: "2026-01-01T00:00:00.000Z"
 *       400:
 *         description: Invalid request or validation failure.
 *       409:
 *         description: Duplicate username.
 */
router.post('/signup', (req, res) => authController.signup(req, res));

/**
 * @swagger
 * /login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in and receive a JWT
 *     description: |
 *       Validates {username, password} against the in-memory users store.
 *       On success returns a JWT token with claims { sub: username, role } and a minimal user summary.
 *
 *       Error cases:
 *       - 400: username or password missing
 *       - 401: invalid credentials
 *
 *       Notes:
 *       - JWT is signed using server env var JWT_SECRET (required).
 *       - Token expiry uses JWT_EXPIRES_IN (optional, default: "1h").
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
 *                 description: Existing username (case-sensitive).
 *                 example: "jane.doe"
 *               password:
 *                 type: string
 *                 description: Plain-text password.
 *                 example: "S3cretPass!"
 *           examples:
 *             login:
 *               summary: Login with username/password
 *               value:
 *                 username: "jane.doe"
 *                 password: "S3cretPass!"
 *     responses:
 *       200:
 *         description: Login successful.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: Signed JWT token with claims {sub, role}.
 *                 user:
 *                   type: object
 *                   properties:
 *                     username:
 *                       type: string
 *                       example: "jane.doe"
 *                     role:
 *                       type: string
 *                       enum: [admin, manager, user]
 *                       example: "user"
 *             examples:
 *               success:
 *                 summary: Successful login (token truncated)
 *                 value:
 *                   token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJqYW5lLmRvZSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzM1Njg5NjAwLCJleHAiOjE3MzU2OTMyMDB9.signature"
 *                   user:
 *                     username: "jane.doe"
 *                     role: "user"
 *       400:
 *         description: Missing fields.
 *       401:
 *         description: Invalid credentials.
 */
router.post('/login', (req, res) => authController.login(req, res));

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
 *         marks:
 *           oneOf:
 *             - type: number
 *             - type: string
 *           description: Optional marks/score for the assessment (number or numeric string in requests; stored as number).
 *           example: 85
 *         basisOfScoring:
 *           type: string
 *           description: Optional basis of scoring (e.g., rubric/criteria).
 *           example: "Rubric-based scoring across 5 competencies."
 *         strength:
 *           type: string
 *           description: Optional strengths noted during assessment.
 *           example: "Strong system design and API clarity."
 *         areasOfImprovement:
 *           type: string
 *           description: Optional areas of improvement noted during assessment.
 *           example: "Increase unit test coverage and edge-case handling."
 *         createdAt:
 *           type: string
 *           description: Server timestamp when record was stored.
 *           example: "2026-01-01T00:00:00.000Z"
 *         updatedAt:
 *           type: string
 *           description: Server timestamp when record was last updated.
 *           example: "2026-01-01T00:00:00.000Z"
 *     MetricsSummaryResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: success
 *         data:
 *           type: object
 *           properties:
 *             learningPaths:
 *               type: object
 *               properties:
 *                 totals:
 *                   type: integer
 *                   example: 2
 *                 enrolledCount:
 *                   type: integer
 *                   example: 150
 *                 completedCount:
 *                   type: integer
 *                   example: 70
 *                 inProgressCount:
 *                   type: integer
 *                   example: 60
 *                 topPaths:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       learningPathName:
 *                         type: string
 *                         example: "Cloud Fundamentals"
 *                       completionRate:
 *                         type: number
 *                         example: 0.4
 *                       enrolled:
 *                         type: integer
 *                         example: 100
 *                       completed:
 *                         type: integer
 *                         example: 40
 *                       inProgress:
 *                         type: integer
 *                         example: 50
 *                 averageDuration:
 *                   nullable: true
 *                   oneOf:
 *                     - type: number
 *                     - type: "null"
 *                   description: Average numeric duration across learning paths (only computed when duration is numeric).
 *                   example: 6
 *             skillFactories:
 *               type: object
 *               properties:
 *                 totals:
 *                   type: integer
 *                   example: 1
 *                 totalMentors:
 *                   type: integer
 *                   example: 2
 *                 totalEmployees:
 *                   type: integer
 *                   example: 4
 *                 poolCounts:
 *                   type: object
 *                   properties:
 *                     inPool:
 *                       type: integer
 *                       example: 2
 *                     notInPool:
 *                       type: integer
 *                       example: 2
 *                 topFactories:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       skillFactoryName:
 *                         type: string
 *                         example: "Platform Engineering"
 *                       employeeCount:
 *                         type: integer
 *                         example: 4
 *                       mentorCount:
 *                         type: integer
 *                         example: 2
 *                 dateRanges:
 *                   type: object
 *                   properties:
 *                     avgDurationDays:
 *                       type: number
 *                       example: 120
 *                     minDurationDays:
 *                       type: number
 *                       example: 30
 *                     maxDurationDays:
 *                       type: number
 *                       example: 180
 *             employees:
 *               type: object
 *               properties:
 *                 totals:
 *                   type: integer
 *                   example: 10
 *                 billedCount:
 *                   type: integer
 *                   example: 6
 *                 notBilledCount:
 *                   type: integer
 *                   example: 4
 *                 billingRate:
 *                   type: number
 *                   example: 0.6
 *             assessments:
 *               type: object
 *               properties:
 *                 totals:
 *                   type: integer
 *                   example: 3
 *                 withMarksCount:
 *                   type: integer
 *                   example: 2
 *                 averageMarks:
 *                   nullable: true
 *                   oneOf:
 *                     - type: number
 *                     - type: "null"
 *                   example: 82.5
 *     LearningPathMetricsItem:
 *       type: object
 *       properties:
 *         learningPathName:
 *           type: string
 *           example: "Cloud Fundamentals"
 *         enrolled:
 *           type: integer
 *           example: 100
 *         completed:
 *           type: integer
 *           example: 40
 *         inProgress:
 *           type: integer
 *           example: 50
 *         completionRate:
 *           type: number
 *           example: 0.4
 *     SkillFactoryMetricsItem:
 *       type: object
 *       properties:
 *         skillFactoryId:
 *           type: string
 *           nullable: true
 *           example: "SF-PLATFORM-001"
 *         skillFactoryName:
 *           type: string
 *           example: "Platform Engineering"
 *         mentorCount:
 *           type: integer
 *           example: 2
 *         employeeCount:
 *           type: integer
 *           example: 4
 *         inPoolCount:
 *           type: integer
 *           example: 2
 *         notInPoolCount:
 *           type: integer
 *           example: 2
 *     LearningPathMetricsListResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: success
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/LearningPathMetricsItem'
 *         count:
 *           type: integer
 *           example: 2
 *     SkillFactoryMetricsListResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: success
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/SkillFactoryMetricsItem'
 *         count:
 *           type: integer
 *           example: 1
 *     Instruction:
 *       type: object
 *       required:
 *         - id
 *         - title
 *         - content
 *       properties:
 *         id:
 *           type: string
 *           description: Unique instruction identifier (client-provided).
 *           example: "getting-started"
 *         slug:
 *           type: string
 *           description: Optional human-friendly unique slug (unique if provided).
 *           example: "getting-started"
 *         title:
 *           type: string
 *           description: Instruction title.
 *           example: "Getting started"
 *         content:
 *           type: string
 *           description: Instruction content (Markdown or plain text).
 *           example: "Welcome to Digi Portal. Use the navigation to access features..."
 *         category:
 *           type: string
 *           description: Optional category grouping.
 *           example: "general"
 *         createdAt:
 *           type: string
 *           description: Server timestamp when record was stored.
 *           example: "2026-01-01T00:00:00.000Z"
 *         updatedAt:
 *           type: string
 *           description: Server timestamp when record was last updated.
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
router.put(
  '/employees/:employeeId',
  verifyJwt,
  requireRole(['admin', 'manager']),
  (req, res) => employeesController.replace(req, res)
);
router.patch(
  '/employees/:employeeId',
  verifyJwt,
  requireRole(['admin', 'manager']),
  (req, res) => employeesController.patch(req, res)
);
router.delete(
  '/employees/:employeeId',
  verifyJwt,
  requireRole(['admin', 'manager']),
  (req, res) => employeesController.delete(req, res)
);

/**
 * @swagger
 * /skill-factories:
 *   post:
 *     tags: [SkillFactories]
 *     summary: Create a Skill Factory record (protected)
 *     description: Creates and stores a Skill Factory record (in-memory). Requires skillFactoryId and skillFactoryName.
 *     security:
 *       - bearerAuth: []
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
 *       401:
 *         description: Unauthorized (missing/invalid JWT).
 *       403:
 *         description: Forbidden (insufficient role).
 *       409:
 *         description: Duplicate skillFactoryId.
 */
router.post(
  '/skill-factories',
  verifyJwt,
  requireRole(['admin', 'manager']),
  (req, res) => skillFactoriesController.create(req, res)
);

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
 *     summary: Replace a Skill Factory record (protected)
 *     description: Replaces the full Skill Factory record for the given skillFactoryId (in-memory). skillFactoryName is required. If skillFactoryId is present in the body, it must match the path parameter.
 *     security:
 *       - bearerAuth: []
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
 *       401:
 *         description: Unauthorized (missing/invalid JWT).
 *       403:
 *         description: Forbidden (insufficient role).
 *       404:
 *         description: Skill Factory not found.
 *   patch:
 *     tags: [SkillFactories]
 *     summary: Partially update a Skill Factory record (protected)
 *     description: Partially updates fields for the given skillFactoryId (in-memory). Validates updated fields and date ordering. If skillFactoryId is present in the body, it must match the path parameter.
 *     security:
 *       - bearerAuth: []
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
 *       401:
 *         description: Unauthorized (missing/invalid JWT).
 *       403:
 *         description: Forbidden (insufficient role).
 *       404:
 *         description: Skill Factory not found.
 *   delete:
 *     tags: [SkillFactories]
 *     summary: Delete a Skill Factory record (protected)
 *     description: Deletes the Skill Factory record for the given skillFactoryId (in-memory).
 *     security:
 *       - bearerAuth: []
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
 *       401:
 *         description: Unauthorized (missing/invalid JWT).
 *       403:
 *         description: Forbidden (insufficient role).
 *       404:
 *         description: Skill Factory not found.
 */
router.get('/skill-factories/:skillFactoryId', (req, res) => skillFactoriesController.getById(req, res));
router.put(
  '/skill-factories/:skillFactoryId',
  verifyJwt,
  requireRole(['admin', 'manager']),
  (req, res) => skillFactoriesController.replace(req, res)
);
router.patch(
  '/skill-factories/:skillFactoryId',
  verifyJwt,
  requireRole(['admin', 'manager']),
  (req, res) => skillFactoriesController.patch(req, res)
);
router.delete(
  '/skill-factories/:skillFactoryId',
  verifyJwt,
  requireRole(['admin', 'manager']),
  (req, res) => skillFactoriesController.delete(req, res)
);

/**
 * @swagger
 * /learningpaths:
 *   post:
 *     tags: [LearningPaths]
 *     summary: Create a Learning Path record (protected)
 *     description: Creates and stores a Learning Path record (in-memory). Requires learningPathName (unique), courseLinks (array), duration, and enrollment/completion/in-progress counts.
 *     security:
 *       - bearerAuth: []
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
 *       401:
 *         description: Unauthorized (missing/invalid JWT).
 *       403:
 *         description: Forbidden (insufficient role).
 *       409:
 *         description: Duplicate learningPathName.
 */
router.post(
  '/learningpaths',
  verifyJwt,
  requireRole(['admin', 'manager']),
  (req, res) => learningPathsController.create(req, res)
);

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
 *     summary: Replace a Learning Path record (protected)
 *     description: Replaces the full Learning Path record for the given learningPathName (in-memory). If learningPathName is present in the body, it must match the path parameter.
 *     security:
 *       - bearerAuth: []
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
 *       401:
 *         description: Unauthorized (missing/invalid JWT).
 *       403:
 *         description: Forbidden (insufficient role).
 *       404:
 *         description: Learning Path not found.
 *   patch:
 *     tags: [LearningPaths]
 *     summary: Partially update a Learning Path record (protected)
 *     description: Partially updates fields for the given learningPathName (in-memory). If learningPathName is present in the body, it must match the path parameter.
 *     security:
 *       - bearerAuth: []
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
 *       401:
 *         description: Unauthorized (missing/invalid JWT).
 *       403:
 *         description: Forbidden (insufficient role).
 *       404:
 *         description: Learning Path not found.
 *   delete:
 *     tags: [LearningPaths]
 *     summary: Delete a Learning Path record (protected)
 *     description: Deletes the Learning Path record for the given learningPathName (in-memory).
 *     security:
 *       - bearerAuth: []
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
 *       401:
 *         description: Unauthorized (missing/invalid JWT).
 *       403:
 *         description: Forbidden (insufficient role).
 *       404:
 *         description: Learning Path not found.
 */
router.put(
  '/learningpaths/:learningPathName',
  verifyJwt,
  requireRole(['admin', 'manager']),
  (req, res) => learningPathsController.replace(req, res)
);
router.patch(
  '/learningpaths/:learningPathName',
  verifyJwt,
  requireRole(['admin', 'manager']),
  (req, res) => learningPathsController.patch(req, res)
);
router.delete(
  '/learningpaths/:learningPathName',
  verifyJwt,
  requireRole(['admin', 'manager']),
  (req, res) => learningPathsController.delete(req, res)
);

/**
 * @swagger
 * /assessments:
 *   post:
 *     tags: [Assessments]
 *     summary: Create an assessment record (protected)
 *     description: Creates and stores an assessment record (in-memory). Requires assessmentId and title.
 *     security:
 *       - bearerAuth: []
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
 *       401:
 *         description: Unauthorized (missing/invalid JWT).
 *       403:
 *         description: Forbidden (insufficient role).
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
router.post(
  '/assessments',
  verifyJwt,
  requireRole(['admin', 'manager']),
  (req, res) => assessmentsController.create(req, res)
);
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
 *     summary: Replace an assessment record (protected)
 *     description: Replaces the full assessment record for the given assessmentId (in-memory). title is required. If assessmentId is present in the body, it must match the path parameter.
 *     security:
 *       - bearerAuth: []
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
 *       401:
 *         description: Unauthorized (missing/invalid JWT).
 *       403:
 *         description: Forbidden (insufficient role).
 *       404:
 *         description: Assessment not found.
 *   patch:
 *     tags: [Assessments]
 *     summary: Partially update an assessment record (protected)
 *     description: Partially updates fields for the given assessmentId (in-memory). Validates updated fields. If assessmentId is present in the body, it must match the path parameter.
 *     security:
 *       - bearerAuth: []
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
 *       401:
 *         description: Unauthorized (missing/invalid JWT).
 *       403:
 *         description: Forbidden (insufficient role).
 *       404:
 *         description: Assessment not found.
 *   delete:
 *     tags: [Assessments]
 *     summary: Delete an assessment record (protected)
 *     description: Deletes the assessment record for the given assessmentId (in-memory).
 *     security:
 *       - bearerAuth: []
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
 *       401:
 *         description: Unauthorized (missing/invalid JWT).
 *       403:
 *         description: Forbidden (insufficient role).
 *       404:
 *         description: Assessment not found.
 */
router.get('/assessments/:assessmentId', (req, res) => assessmentsController.getById(req, res));
router.put(
  '/assessments/:assessmentId',
  verifyJwt,
  requireRole(['admin', 'manager']),
  (req, res) => assessmentsController.replace(req, res)
);
router.patch(
  '/assessments/:assessmentId',
  verifyJwt,
  requireRole(['admin', 'manager']),
  (req, res) => assessmentsController.patch(req, res)
);
router.delete(
  '/assessments/:assessmentId',
  verifyJwt,
  requireRole(['admin', 'manager']),
  (req, res) => assessmentsController.delete(req, res)
);

/**
 * @swagger
 * /metrics/summary:
 *   get:
 *     tags: [Metrics]
 *     summary: Get aggregated success metrics summary
 *     description: |
 *       Computes aggregated success metrics on each request from in-memory stores (no persistence).
 *       Includes Learning Paths rollups, Skill Factories rollups, and Employees billed counts (inferred safely).
 *     responses:
 *       200:
 *         description: Metrics summary.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MetricsSummaryResponse'
 */
router.get('/metrics/summary', (req, res) => metricsController.summary(req, res));

/**
 * @swagger
 * /metrics/learning-paths:
 *   get:
 *     tags: [Metrics]
 *     summary: Get per-learning-path success metrics
 *     description: Computes per-learning-path enrollment/completion/in-progress and completion rate (completed/enrolled) from in-memory Learning Paths data.
 *     responses:
 *       200:
 *         description: Learning paths metrics list.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LearningPathMetricsListResponse'
 */
router.get('/metrics/learning-paths', (req, res) => metricsController.learningPaths(req, res));

/**
 * @swagger
 * /metrics/skill-factories:
 *   get:
 *     tags: [Metrics]
 *     summary: Get per-skill-factory metrics
 *     description: Computes per-skill-factory mentor/employee counts and pool breakdown from in-memory Skill Factories data.
 *     responses:
 *       200:
 *         description: Skill factories metrics list.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SkillFactoryMetricsListResponse'
 */
router.get('/metrics/skill-factories', (req, res) => metricsController.skillFactories(req, res));

/**
 * @swagger
 * /instructions:
 *   post:
 *     tags: [Instructions]
 *     summary: Create an instruction (protected)
 *     description: Creates and stores an instruction record (in-memory). Requires id, title, and content. If slug is provided it must be unique.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Instruction'
 *           examples:
 *             createInstruction:
 *               summary: Create a general instruction
 *               value:
 *                 id: "getting-started"
 *                 slug: "getting-started"
 *                 title: "Getting started"
 *                 content: "Welcome to Digi Portal. Use the navigation to access features..."
 *                 category: "general"
 *     responses:
 *       201:
 *         description: Instruction created.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Instruction'
 *       400:
 *         description: Invalid request or validation failure.
 *       401:
 *         description: Unauthorized (missing/invalid JWT).
 *       403:
 *         description: Forbidden (insufficient role).
 *       409:
 *         description: Duplicate id or slug.
 *   get:
 *     tags: [Instructions]
 *     summary: List instructions
 *     description: Lists all stored instruction records (in-memory).
 *     responses:
 *       200:
 *         description: Instructions list.
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
 *                     $ref: '#/components/schemas/Instruction'
 *                 count:
 *                   type: integer
 *                   example: 1
 */
router.post(
  '/instructions',
  verifyJwt,
  requireRole(['admin', 'manager']),
  (req, res) => instructionsController.create(req, res)
);
router.get('/instructions', (req, res) => instructionsController.list(req, res));

/**
 * @swagger
 * /instructions/{id}:
 *   get:
 *     tags: [Instructions]
 *     summary: Get an instruction
 *     description: Gets a single instruction by id (in-memory).
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Instruction id to fetch.
 *     responses:
 *       200:
 *         description: Instruction record.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Instruction'
 *       404:
 *         description: Instruction not found.
 *   put:
 *     tags: [Instructions]
 *     summary: Replace an instruction (protected)
 *     description: Replaces the full instruction record for the given id (in-memory). title and content are required. If id is present in the body, it must match the path parameter.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Instruction id to replace.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Instruction'
 *           examples:
 *             replaceInstruction:
 *               summary: Replace instruction content
 *               value:
 *                 id: "getting-started"
 *                 slug: "getting-started"
 *                 title: "Getting started (updated)"
 *                 content: "Updated instructions..."
 *                 category: "general"
 *     responses:
 *       200:
 *         description: Instruction updated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Instruction'
 *       400:
 *         description: Invalid request or validation failure.
 *       401:
 *         description: Unauthorized (missing/invalid JWT).
 *       403:
 *         description: Forbidden (insufficient role).
 *       404:
 *         description: Instruction not found.
 *       409:
 *         description: Duplicate slug.
 *   patch:
 *     tags: [Instructions]
 *     summary: Partially update an instruction (protected)
 *     description: Partially updates fields for the given id (in-memory). If id is present in the body, it must match the path parameter.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Instruction id to patch.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Partial instruction fields to update.
 *           examples:
 *             patchTitle:
 *               summary: Update title only
 *               value:
 *                 title: "Getting started (new title)"
 *     responses:
 *       200:
 *         description: Instruction updated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Instruction'
 *       400:
 *         description: Invalid request or validation failure.
 *       401:
 *         description: Unauthorized (missing/invalid JWT).
 *       403:
 *         description: Forbidden (insufficient role).
 *       404:
 *         description: Instruction not found.
 *       409:
 *         description: Duplicate slug.
 *   delete:
 *     tags: [Instructions]
 *     summary: Delete an instruction (protected)
 *     description: Deletes the instruction record for the given id (in-memory).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Instruction id to delete.
 *     responses:
 *       204:
 *         description: Instruction deleted.
 *       401:
 *         description: Unauthorized (missing/invalid JWT).
 *       403:
 *         description: Forbidden (insufficient role).
 *       404:
 *         description: Instruction not found.
 */
router.get('/instructions/:id', (req, res) => instructionsController.getById(req, res));
router.put(
  '/instructions/:id',
  verifyJwt,
  requireRole(['admin', 'manager']),
  (req, res) => instructionsController.replace(req, res)
);
router.patch(
  '/instructions/:id',
  verifyJwt,
  requireRole(['admin', 'manager']),
  (req, res) => instructionsController.patch(req, res)
);
router.delete(
  '/instructions/:id',
  verifyJwt,
  requireRole(['admin', 'manager']),
  (req, res) => instructionsController.delete(req, res)
);

/**
 * @swagger
 * components:
 *   schemas:
 *     Announcement:
 *       type: object
 *       required:
 *         - id
 *         - title
 *         - message
 *       properties:
 *         id:
 *           type: string
 *           description: Unique announcement id (client-provided or server-generated).
 *           example: "announce-001"
 *         title:
 *           type: string
 *           description: Announcement title.
 *           example: "Maintenance window"
 *         message:
 *           type: string
 *           description: Announcement message body.
 *           example: "The portal will be unavailable on Saturday 02:00-03:00 UTC."
 *         author:
 *           type: string
 *           description: Optional author name.
 *           example: "IT Ops"
 *         priority:
 *           type: string
 *           description: Priority of the announcement.
 *           enum: [low, normal, high]
 *           example: "high"
 *         startsAt:
 *           type: string
 *           description: Optional start timestamp (ISO-8601 string).
 *           example: "2026-01-01T00:00:00.000Z"
 *         endsAt:
 *           type: string
 *           description: Optional end timestamp (ISO-8601 string). Must be >= startsAt when both provided.
 *           example: "2026-01-02T00:00:00.000Z"
 *         isActive:
 *           type: boolean
 *           description: Whether the announcement is currently active.
 *           example: true
 *         createdAt:
 *           type: string
 *           description: Server timestamp when record was stored.
 *           example: "2026-01-01T00:00:00.000Z"
 *         updatedAt:
 *           type: string
 *           description: Server timestamp when record was last updated.
 *           example: "2026-01-01T00:00:00.000Z"
 */

/**
 * @swagger
 * /announcements:
 *   get:
 *     tags: [Announcements]
 *     summary: List announcements (public)
 *     description: Lists all stored announcements (in-memory).
 *     responses:
 *       200:
 *         description: Announcements list.
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
 *                     $ref: '#/components/schemas/Announcement'
 *                 count:
 *                   type: integer
 *                   example: 1
 *   post:
 *     tags: [Announcements]
 *     summary: Create an announcement (protected)
 *     description: Creates and stores an announcement record (in-memory). Requires title and message. id is optional; if omitted the server generates one.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, message]
 *             properties:
 *               id:
 *                 type: string
 *                 example: "announce-001"
 *               title:
 *                 type: string
 *                 example: "Maintenance window"
 *               message:
 *                 type: string
 *                 example: "The portal will be unavailable on Saturday 02:00-03:00 UTC."
 *               author:
 *                 type: string
 *                 example: "IT Ops"
 *               priority:
 *                 type: string
 *                 enum: [low, normal, high]
 *                 example: "high"
 *               startsAt:
 *                 type: string
 *                 example: "2026-01-01T00:00:00.000Z"
 *               endsAt:
 *                 type: string
 *                 example: "2026-01-02T00:00:00.000Z"
 *               isActive:
 *                 type: boolean
 *                 example: true
 *           examples:
 *             createAnnouncement:
 *               summary: Create a high priority announcement
 *               value:
 *                 id: "announce-001"
 *                 title: "Maintenance window"
 *                 message: "The portal will be unavailable on Saturday 02:00-03:00 UTC."
 *                 author: "IT Ops"
 *                 priority: "high"
 *                 startsAt: "2026-01-01T00:00:00.000Z"
 *                 endsAt: "2026-01-02T00:00:00.000Z"
 *                 isActive: true
 *     responses:
 *       201:
 *         description: Announcement created.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Announcement'
 *       400:
 *         description: Invalid request or validation failure.
 *       401:
 *         description: Unauthorized (missing/invalid JWT).
 *       403:
 *         description: Forbidden (insufficient role).
 *       409:
 *         description: Duplicate id.
 */
router.get('/announcements', (req, res) => announcementsController.list(req, res));
router.post(
  '/announcements',
  verifyJwt,
  requireRole(['admin', 'manager']),
  (req, res) => announcementsController.create(req, res)
);

/**
 * @swagger
 * /announcements/{id}:
 *   get:
 *     tags: [Announcements]
 *     summary: Get an announcement (public)
 *     description: Gets a single announcement by id (in-memory).
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Announcement id to fetch.
 *     responses:
 *       200:
 *         description: Announcement record.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Announcement'
 *       404:
 *         description: Announcement not found.
 *   put:
 *     tags: [Announcements]
 *     summary: Replace an announcement (protected)
 *     description: Replaces the full announcement record for the given id (in-memory). title and message are required. If id is present in the body, it must match the path parameter.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Announcement id to replace.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, message]
 *             properties:
 *               id:
 *                 type: string
 *                 example: "announce-001"
 *               title:
 *                 type: string
 *                 example: "Maintenance window (updated)"
 *               message:
 *                 type: string
 *                 example: "Updated details..."
 *               author:
 *                 type: string
 *                 example: "IT Ops"
 *               priority:
 *                 type: string
 *                 enum: [low, normal, high]
 *                 example: "normal"
 *               startsAt:
 *                 type: string
 *                 example: "2026-01-01T00:00:00.000Z"
 *               endsAt:
 *                 type: string
 *                 example: "2026-01-02T00:00:00.000Z"
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Announcement updated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Announcement'
 *       400:
 *         description: Invalid request or validation failure.
 *       401:
 *         description: Unauthorized (missing/invalid JWT).
 *       403:
 *         description: Forbidden (insufficient role).
 *       404:
 *         description: Announcement not found.
 *   patch:
 *     tags: [Announcements]
 *     summary: Partially update an announcement (protected)
 *     description: Partially updates fields for the given id (in-memory). If id is present in the body, it must match the path parameter.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Announcement id to patch.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Partial announcement fields to update.
 *           examples:
 *             patchPriority:
 *               summary: Update priority only
 *               value:
 *                 priority: "high"
 *     responses:
 *       200:
 *         description: Announcement updated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Announcement'
 *       400:
 *         description: Invalid request or validation failure.
 *       401:
 *         description: Unauthorized (missing/invalid JWT).
 *       403:
 *         description: Forbidden (insufficient role).
 *       404:
 *         description: Announcement not found.
 *   delete:
 *     tags: [Announcements]
 *     summary: Delete an announcement (protected)
 *     description: Deletes the announcement record for the given id (in-memory).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Announcement id to delete.
 *     responses:
 *       204:
 *         description: Announcement deleted.
 *       401:
 *         description: Unauthorized (missing/invalid JWT).
 *       403:
 *         description: Forbidden (insufficient role).
 *       404:
 *         description: Announcement not found.
 */
router.get('/announcements/:id', (req, res) => announcementsController.getById(req, res));
router.put(
  '/announcements/:id',
  verifyJwt,
  requireRole(['admin', 'manager']),
  (req, res) => announcementsController.replace(req, res)
);
router.patch(
  '/announcements/:id',
  verifyJwt,
  requireRole(['admin', 'manager']),
  (req, res) => announcementsController.patch(req, res)
);
router.delete(
  '/announcements/:id',
  verifyJwt,
  requireRole(['admin', 'manager']),
  (req, res) => announcementsController.delete(req, res)
);

module.exports = router;
