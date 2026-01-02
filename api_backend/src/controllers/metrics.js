'use strict';

const Employee = require('../db/models/Employee');
const SkillFactory = require('../db/models/SkillFactory');
const LearningPath = require('../db/models/LearningPath');
const Assessment = require('../db/models/Assessment');

function toFiniteNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string') {
    const n = Number(value.trim());
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeLowerString(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

/**
 * Safely infers whether an employee is billed.
 *
 * Billing rules (as requested):
 * - If an explicit boolean field exists (e.g., isBilled/billed), use it.
 * - Otherwise infer from currentStatus (e.g., "Billed" or "Active").
 * - Otherwise fallback to false.
 *
 * NOTE: We intentionally do NOT change employee schema; we only infer.
 *
 * @param {any} employee
 * @returns {boolean}
 */
function inferEmployeeBilled(employee) {
  if (!employee || typeof employee !== 'object') return false;

  const explicitFlags = ['isBilled', 'billed', 'is_billable', 'isBillable', 'billable'];
  for (const key of explicitFlags) {
    if (typeof employee[key] === 'boolean') return employee[key];
  }

  const status = safeLowerString(employee.currentStatus);
  if (!status) return false;

  // Requested: infer from values like 'Billed' or 'Active'
  if (status === 'billed') return true;
  if (status === 'active') return true;

  return false;
}

/**
 * Computes per-learning-path metrics from LearningPaths documents.
 *
 * @param {any[]} learningPaths
 * @returns {Array<{ learningPathName: string, enrolled: number, completed: number, inProgress: number, completionRate: number }>}
 */
function computeLearningPathHighlights(learningPaths) {
  return safeArray(learningPaths)
    .filter((lp) => lp && typeof lp === 'object')
    .map((lp) => {
      const enrolled = Number.isInteger(lp.enrolledCount) && lp.enrolledCount >= 0 ? lp.enrolledCount : 0;
      const completed = Number.isInteger(lp.completedCount) && lp.completedCount >= 0 ? lp.completedCount : 0;
      const inProgress = Number.isInteger(lp.inProgressCount) && lp.inProgressCount >= 0 ? lp.inProgressCount : 0;

      const completionRate = enrolled > 0 ? completed / enrolled : 0;

      return {
        learningPathName: typeof lp.learningPathName === 'string' ? lp.learningPathName : 'Unknown',
        enrolled,
        completed,
        inProgress,
        completionRate,
      };
    })
    .sort((a, b) => b.completionRate - a.completionRate);
}

/**
 * Parses a date string to a timestamp (ms).
 * Accepts YYYY-MM-DD or ISO-8601.
 *
 * @param {unknown} value
 * @returns {number|undefined}
 */
function parseDateToMs(value) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const t = Date.parse(trimmed);
  if (Number.isNaN(t)) return undefined;
  return t;
}

/**
 * Computes per-skill-factory metrics from SkillFactories documents.
 *
 * NOTE: This requires reading the embedded employees array in each SkillFactory,
 * so it's not feasible to compute fully via counts without changing schema.
 *
 * @param {any[]} skillFactories
 * @returns {Array<{ skillFactoryId?: string, skillFactoryName: string, mentorCount: number, employeeCount: number, inPoolCount: number, notInPoolCount: number, durationStatsDays: { avg: number, min: number, max: number } }>}
 */
function computeSkillFactoryHighlights(skillFactories) {
  return safeArray(skillFactories)
    .filter((sf) => sf && typeof sf === 'object')
    .map((sf) => {
      const mentors = safeArray(sf.mentors);
      const employees = safeArray(sf.employees);

      let inPoolCount = 0;
      let notInPoolCount = 0;

      /** @type {number[]} */
      const durationsDays = [];

      for (const e of employees) {
        const isInPool = !!(e && typeof e === 'object' && e.isInPool === true);
        if (isInPool) inPoolCount += 1;
        else notInPoolCount += 1;

        // Duration in days: if endDate is present, use [start,end], else ignore for duration stats.
        const startMs = parseDateToMs(e && e.startDate);
        const endMs = parseDateToMs(e && e.endDate);
        if (startMs !== undefined && endMs !== undefined && endMs >= startMs) {
          const days = (endMs - startMs) / (1000 * 60 * 60 * 24);
          durationsDays.push(days);
        }
      }

      const mentorCount = mentors.length;
      const employeeCount = employees.length;

      const min = durationsDays.length ? Math.min(...durationsDays) : 0;
      const max = durationsDays.length ? Math.max(...durationsDays) : 0;
      const avg = durationsDays.length ? durationsDays.reduce((a, b) => a + b, 0) / durationsDays.length : 0;

      return {
        skillFactoryId: typeof sf.skillFactoryId === 'string' ? sf.skillFactoryId : undefined,
        skillFactoryName: typeof sf.skillFactoryName === 'string' ? sf.skillFactoryName : 'Unknown',
        mentorCount,
        employeeCount,
        inPoolCount,
        notInPoolCount,
        durationStatsDays: { avg, min, max },
      };
    })
    .sort((a, b) => b.employeeCount - a.employeeCount);
}

/**
 * Runs a MongoDB aggregation on Assessments to compute totals + average marks.
 *
 * Returns the same shape as the prior in-memory helper:
 * { count, withMarksCount, averageMarks }
 *
 * @returns {Promise<{ count: number, withMarksCount: number, averageMarks: number|null }>}
 */
async function computeAssessmentMarksMetricsMongo() {
  const pipeline = [
    {
      $project: {
        _marksNumber: {
          // Convert numeric-ish values to number, otherwise null.
          $convert: { input: '$marks', to: 'double', onError: null, onNull: null },
        },
      },
    },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        withMarksCount: { $sum: { $cond: [{ $ne: ['$_marksNumber', null] }, 1, 0] } },
        averageMarks: { $avg: '$_marksNumber' },
      },
    },
  ];

  const rows = await Assessment.aggregate(pipeline).allowDiskUse(false);
  const row = rows && rows[0];

  return {
    count: row && typeof row.count === 'number' ? row.count : 0,
    withMarksCount: row && typeof row.withMarksCount === 'number' ? row.withMarksCount : 0,
    averageMarks: row && typeof row.averageMarks === 'number' ? row.averageMarks : null,
  };
}

class MetricsController {
  /**
   * PUBLIC_INTERFACE
   * Returns a high-level metrics summary aggregated across persisted MongoDB collections:
   * - learningPaths
   * - skillFactories
   * - employees (including billed counts inferred safely)
   * - assessments (counts + optional average marks)
   *
   * Metrics are computed per-request from MongoDB-backed resources.
   *
   * @param {import('express').Request} req Express request
   * @param {import('express').Response} res Express response
   * @returns {Promise<import('express').Response>} 200 response with summary payload.
   */
  async summary(req, res) {
    // Query optimization strategy:
    // - Use countDocuments/aggregate where we can (employees totals/billed, assessments avg).
    // - Only load full documents where required for response shape (learning path list, skill factories list).
    const [
      totalEmployees,
      billedCount,
      learningPathsDocs,
      skillFactoriesDocs,
      assessmentsMarks,
    ] = await Promise.all([
      Employee.countDocuments({}),
      // We can infer billed from either explicit boolean flags OR from currentStatus values.
      // This is a lightweight aggregation (no full doc fetch needed).
      Employee.aggregate([
        {
          $project: {
            _explicitBilled: {
              $cond: [
                { $in: [{ $type: '$isBilled' }, ['bool']] },
                '$isBilled',
                {
                  $cond: [
                    { $in: [{ $type: '$billed' }, ['bool']] },
                    '$billed',
                    null,
                  ],
                },
              ],
            },
            _statusLower: { $toLower: { $trim: { input: { $ifNull: ['$currentStatus', ''] } } } },
          },
        },
        {
          $project: {
            _isBilledComputed: {
              $cond: [
                { $ne: ['$_explicitBilled', null] },
                '$_explicitBilled',
                { $in: ['$_statusLower', ['billed', 'active']] },
              ],
            },
          },
        },
        { $group: { _id: null, billedCount: { $sum: { $cond: ['$_isBilledComputed', 1, 0] } } } },
      ]).then((rows) => (rows && rows[0] ? rows[0].billedCount : 0)),
      // Keep response identical: topPaths + totals rely on per-path completion rates.
      LearningPath.find({}, { _id: 0 }).lean(),
      // Keep response identical: duration stats rely on embedded skill factory employees array.
      SkillFactory.find({}, { _id: 0 }).lean(),
      computeAssessmentMarksMetricsMongo(),
    ]);

    const learningHighlights = computeLearningPathHighlights(learningPathsDocs);

    const learningDurationsNumeric = safeArray(learningPathsDocs)
      .map((lp) => (lp && typeof lp === 'object' ? toFiniteNumber(lp.duration) : undefined))
      .filter((n) => typeof n === 'number' && Number.isFinite(n));

    const averageDuration = learningDurationsNumeric.length
      ? learningDurationsNumeric.reduce((a, b) => a + b, 0) / learningDurationsNumeric.length
      : null;

    const learningTotals = {
      totals: learningHighlights.length,
      enrolledCount: learningHighlights.reduce((a, x) => a + x.enrolled, 0),
      completedCount: learningHighlights.reduce((a, x) => a + x.completed, 0),
      inProgressCount: learningHighlights.reduce((a, x) => a + x.inProgress, 0),
      topPaths: learningHighlights.slice(0, 5).map((x) => ({
        learningPathName: x.learningPathName,
        completionRate: x.completionRate,
        enrolled: x.enrolled,
        completed: x.completed,
        inProgress: x.inProgress,
      })),
      averageDuration, // null when not computable
    };

    const skillHighlights = computeSkillFactoryHighlights(skillFactoriesDocs);
    const totalMentors = safeArray(skillFactoriesDocs).reduce((a, sf) => a + safeArray(sf && sf.mentors).length, 0);
    const totalEmployeesInFactories = safeArray(skillFactoriesDocs).reduce(
      (a, sf) => a + safeArray(sf && sf.employees).length,
      0
    );
    const poolIn = skillHighlights.reduce((a, sf) => a + sf.inPoolCount, 0);
    const poolOut = skillHighlights.reduce((a, sf) => a + sf.notInPoolCount, 0);

    const durationAvgs = skillHighlights.map((sf) => sf.durationStatsDays.avg).filter((n) => Number.isFinite(n));
    const durationMins = skillHighlights.map((sf) => sf.durationStatsDays.min).filter((n) => Number.isFinite(n));
    const durationMaxs = skillHighlights.map((sf) => sf.durationStatsDays.max).filter((n) => Number.isFinite(n));

    const skillFactoriesSummary = {
      totals: skillHighlights.length,
      totalMentors,
      totalEmployees: totalEmployeesInFactories,
      poolCounts: { inPool: poolIn, notInPool: poolOut },
      topFactories: skillHighlights.slice(0, 5).map((sf) => ({
        skillFactoryName: sf.skillFactoryName,
        employeeCount: sf.employeeCount,
        mentorCount: sf.mentorCount,
      })),
      dateRanges: {
        // duration in days based on employees with both startDate and endDate; 0 when missing
        avgDurationDays: durationAvgs.length ? durationAvgs.reduce((a, b) => a + b, 0) / durationAvgs.length : 0,
        minDurationDays: durationMins.length ? Math.min(...durationMins) : 0,
        maxDurationDays: durationMaxs.length ? Math.max(...durationMaxs) : 0,
      },
    };

    const notBilledCount = totalEmployees - billedCount;
    const billingRate = totalEmployees > 0 ? billedCount / totalEmployees : 0;

    return res.status(200).json({
      status: 'success',
      data: {
        learningPaths: learningTotals,
        skillFactories: skillFactoriesSummary,
        employees: {
          totals: totalEmployees,
          billedCount,
          notBilledCount,
          billingRate,
        },
        assessments: {
          totals: assessmentsMarks.count,
          withMarksCount: assessmentsMarks.withMarksCount,
          averageMarks: assessmentsMarks.averageMarks,
        },
      },
    });
  }

  /**
   * PUBLIC_INTERFACE
   * Returns per-learning-path metrics highlighting:
   * - name
   * - enrolled
   * - completed
   * - inProgress
   * - completionRate
   *
   * Data is read from MongoDB (Mongoose model).
   *
   * @param {import('express').Request} req Express request
   * @param {import('express').Response} res Express response
   * @returns {Promise<import('express').Response>} 200 response with list payload.
   */
  async learningPaths(req, res) {
    const learningPaths = await LearningPath.find({}, { _id: 0 }).lean();
    const highlights = computeLearningPathHighlights(learningPaths).map((x) => ({
      learningPathName: x.learningPathName,
      enrolled: x.enrolled,
      completed: x.completed,
      inProgress: x.inProgress,
      completionRate: x.completionRate,
    }));

    return res.status(200).json({
      status: 'success',
      data: highlights,
      count: highlights.length,
    });
  }

  /**
   * PUBLIC_INTERFACE
   * Returns per-skill-factory metrics highlighting:
   * - name
   * - mentorCount
   * - employeeCount
   * - inPoolCount
   * - notInPoolCount
   *
   * Data is read from MongoDB (Mongoose model).
   *
   * @param {import('express').Request} req Express request
   * @param {import('express').Response} res Express response
   * @returns {Promise<import('express').Response>} 200 response with list payload.
   */
  async skillFactories(req, res) {
    // We need embedded mentors/employees arrays to compute pool counts and duration stats;
    // fetch full docs (minus _id) in one query.
    const skillFactories = await SkillFactory.find({}, { _id: 0 }).lean();

    const highlights = computeSkillFactoryHighlights(skillFactories).map((sf) => ({
      skillFactoryId: sf.skillFactoryId,
      skillFactoryName: sf.skillFactoryName,
      mentorCount: sf.mentorCount,
      employeeCount: sf.employeeCount,
      inPoolCount: sf.inPoolCount,
      notInPoolCount: sf.notInPoolCount,
    }));

    return res.status(200).json({
      status: 'success',
      data: highlights,
      count: highlights.length,
    });
  }
}

const controller = new MetricsController();

// Backward-compatible aliases expected by routes/index.js and controllers/backup.js
controller.getSummary = controller.summary.bind(controller);
controller.getLearningPathsMetrics = controller.learningPaths.bind(controller);
controller.getSkillFactoriesMetrics = controller.skillFactories.bind(controller);

module.exports = controller;
