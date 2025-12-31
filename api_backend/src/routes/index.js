const express = require('express');
const authController = require('../controllers/auth');
const healthController = require('../controllers/health');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Health
 *     description: Service health endpoints
 *   - name: Auth
 *     description: User authentication endpoints
 */

// Health endpoint
/**
 * @swagger
 * /:
 *   get:
 *     tags: [Health]
 *     summary: Health endpoint
 *     responses:
 *       200:
 *         description: Service health check passed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 message:
 *                   type: string
 *                   example: Service is healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 environment:
 *                   type: string
 *                   example: development
 */
router.get('/', healthController.check.bind(healthController));

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     AuthSignupRequest:
 *       type: object
 *       required: [username, password]
 *       properties:
 *         username:
 *           type: string
 *           example: alice
 *         password:
 *           type: string
 *           example: "S3cureP@ssword"
 *     AuthLoginRequest:
 *       type: object
 *       required: [username, password]
 *       properties:
 *         username:
 *           type: string
 *           example: alice
 *         password:
 *           type: string
 *           example: "S3cureP@ssword"
 *     AuthLoginResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: success
 *         token:
 *           type: string
 */

/**
 * @swagger
 * /signup:
 *   post:
 *     tags: [Auth]
 *     summary: Create a new user account
 *     description: Creates a user with a bcrypt-hashed password. Username must be unique.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthSignupRequest'
 *     responses:
 *       201:
 *         description: User created
 *       400:
 *         description: Invalid request body
 *       409:
 *         description: Username already exists
 *       500:
 *         description: Internal server error
 */
router.post('/signup', authController.signup.bind(authController));

/**
 * @swagger
 * /login:
 *   post:
 *     tags: [Auth]
 *     summary: Login and receive a JWT token
 *     description: Validates credentials and returns a signed JWT token when successful.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthLoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthLoginResponse'
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server misconfiguration or internal error
 */
router.post('/login', authController.login.bind(authController));

module.exports = router;
