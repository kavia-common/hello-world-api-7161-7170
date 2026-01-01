const express = require('express');

const employeesController = require('../controllers/employees');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Hello
 *     description: Hello World endpoint
 *   - name: Employees
 *     description: Employee record management (in-memory)
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
 */

/**
 * @swagger
 * /employees:
 *   post:
 *     tags: [Employees]
 *     summary: Create an employee record
 *     description: Creates and stores an employee record (MongoDB). Requires employeeId, employeeName, and email.
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
 *     description: Lists all stored employee records (MongoDB).
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
 *     description: Replaces the full employee record for the given employeeId (MongoDB). employeeName and email are required. If employeeId is present in the body, it must match the path parameter.
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
 *     description: Partially updates fields for the given employeeId (MongoDB). Validates updated fields (including feedbackRating enum). If employeeId is present in the body, it must match the path parameter.
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
 *     description: Deletes the employee record for the given employeeId (MongoDB).
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

module.exports = router;
