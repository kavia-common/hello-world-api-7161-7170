'use strict';

const healthService = require('../services/health');

class HealthController {
  check(req, res) {
    const healthStatus = healthService.getStatus();
    return res.status(200).json(healthStatus);
  }
}

const controller = new HealthController();

// Backward-compatible alias expected by routes/index.js
controller.getHealth = controller.check.bind(controller);

module.exports = controller;
