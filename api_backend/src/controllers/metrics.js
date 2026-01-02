'use strict';

const employeesStore = require('../services/employeesStore');
const skillFactoriesStore = require('../services/skillFactoriesStore');
const learningPathsStore = require('../services/learningPathsStore');
const assessmentsStore = require('../services/assessmentsStore');

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
 * Computes per-learning-path metrics from LearningPaths store.
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
 * Computes per-skill-factory metrics from SkillFactories store.
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
 * Computes marks average from a list of items with optional numeric "marks".
 *
 * @param {any[]} items
 * @returns {{ count: number, withMarksCount: number, averageMarks: number|null }}
 */
function computeMarksAverage(items) {
  const all = safeArray(items);
  let withMarksCount = 0;
  let sum = 0;

  for (const it of all) {
    const marks = it && typeof it === 'object' ? toFiniteNumber(it.marks) : undefined;
    if (marks === undefined) continue;
    withMarksCount += 1;
    sum += marks;
  }

  return {
    count: all.length,
    withMarksCount,
    averageMarks: withMarksCount > 0 ? sum / withMarksCount : null,
  };
}

class MetricsController {
  /**
   * PUBLIC_INTERFACE
   * Returns a high-level metrics summary aggregated across the in-memory stores:
   * - learningPaths
   * - skillFactories
   * - employees (including billed counts inferred safely)
   * - assessments (counts + optional average marks)
   *
   * No data is persisted; metrics are computed per-request.
   *
   * @param {import('express').Request} req Express request
   * @param {import('express').Response} res Express response
   * @returns {Promise<import('express').Response>} 200 response with summary payload.
   */
  async summary(req, res) {
    const [employees, skillFactories, learningPaths, assessments] = await Promise.all([
      employeesStore.listEmployees(),
      skillFactoriesStore.listSkillFactories(),
      learningPathsStore.listLearningPaths(),
      assessmentsStore.listAssessments(),
    ]);

    const learningHighlights = computeLearningPathHighlights(learningPaths);

    const learningDurationsNumeric = safeArray(learningPaths)
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

    const skillHighlights = computeSkillFactoryHighlights(skillFactories);
    const totalMentors = safeArray(skillFactories).reduce((a, sf) => a + safeArray(sf && sf.mentors).length, 0);
    const totalEmployeesInFactories = safeArray(skillFactories).reduce(
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

    const totalEmployees = safeArray(employees).length;
    const billedCount = safeArray(employees).reduce((a, e) => a + (inferEmployeeBilled(e) ? 1 : 0), 0);
    const notBilledCount = totalEmployees - billedCount;
    const billingRate = totalEmployees > 0 ? billedCount / totalEmployees : 0;

    const assessmentsMarks = computeMarksAverage(assessments);

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
   * @param {import('express').Request} req Express request
   * @param {import('express').Response} res Express response
   * @returns {Promise<import('express').Response>} 200 response with list payload.
   */
  async learningPaths(req, res) {
    const learningPaths = await learningPathsStore.listLearningPaths();
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
   * @param {import('express').Request} req Express request
   * @param {import('express').Response} res Express response
   * @returns {Promise<import('express').Response>} 200 response with list payload.
   */
  async skillFactories(req, res) {
    const skillFactories = await skillFactoriesStore.listSkillFactories();
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
