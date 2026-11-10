/**
 * Nutrition Clinic Pro - Patient Assessment History & Progress Tracking Unit Tests
 * Verification of LocalStorage persistence, progress trends, delta analytics, and import/export.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  saveAssessment,
  getSavedAssessments,
  getAssessmentById,
  deleteAssessment,
  clearAllAssessments,
  exportAssessmentsJson,
  importAssessmentsJson,
  seedDemoProgressData,
  calculateProgressTrends,
  sortAssessmentsChronologically,
  getDistinctPatients,
} from '../src/clinical/history/index';
import { PatientAssessmentRecord } from '../src/clinical/history/types';

function createMockAssessment(
  id: string,
  date: string,
  weightKg: number,
  heightCm = 175,
  targetKcal = 2000,
  patientName = 'Test Patient'
): PatientAssessmentRecord {
  const bmi = Math.round((weightKg / ((heightCm / 100) ** 2)) * 10) / 10;
  return {
    id,
    patientName,
    patientIdOrMrn: 'MRN-001',
    timestamp: `${date}T10:00:00.000Z`,
    visitDate: date,
    notes: `Assessment on ${date}`,
    inputs: {
      sex: 'male',
      ageYears: 35,
      heightCm,
      weightKg,
      waistCm: 90,
      hipCm: 100,
      bodyFatPercent: 22,
      hasBodyFat: true,
      activityLevel: 'lightly_active',
      stressCondition: 'normal',
      adjustmentKcal: -500,
      selectedEquation: 'mifflin_st_jeor',
      carbsPercent: 35,
      proteinPercent: 35,
      fatPercent: 30,
    },
    anthropometrics: {
      bmi,
      bmiCategoryKey: 'normal',
      bmiCategoryAr: 'وزن طبيعي',
      bmiCategoryEn: 'Normal weight',
      isPediatric: false,
      ibwDevineKg: 70.6,
      abwKg: 70.6,
      isAdjustedWeightNeeded: false,
    },
    energy: {
      equationUsed: 'mifflin_st_jeor',
      bmrKcal: 1750,
      tdeeKcal: 2400,
      targetKcal,
      adjustmentKcal: -500,
    },
    macronutrients: {
      carbsGrams: 175,
      proteinGrams: 175,
      fatGrams: 67,
      carbsKcal: 700,
      proteinKcal: 700,
      fatKcal: 600,
      proteinPerKgActual: 2.0,
    },
  };
}

describe('Patient Assessment History & Progress Tracking', () => {
  beforeEach(() => {
    clearAllAssessments();
  });

  it('saves and retrieves patient assessments correctly', () => {
    const item1 = createMockAssessment('asmt_1', '2026-09-01', 95.0);
    saveAssessment(item1);

    const all = getSavedAssessments();
    assert.equal(all.length, 1);
    assert.equal(all[0].id, 'asmt_1');
    assert.equal(all[0].inputs.weightKg, 95.0);

    const fetched = getAssessmentById('asmt_1');
    assert.ok(fetched);
    assert.equal(fetched?.visitDate, '2026-09-01');
  });

  it('updates an existing record if same ID is saved', () => {
    const item1 = createMockAssessment('asmt_1', '2026-09-01', 95.0);
    saveAssessment(item1);

    const updated = {
      ...item1,
      inputs: { ...item1.inputs, weightKg: 94.0 },
      anthropometrics: { ...item1.anthropometrics, bmi: 30.7 },
    };
    saveAssessment(updated);

    const all = getSavedAssessments();
    assert.equal(all.length, 1);
    assert.equal(all[0].inputs.weightKg, 94.0);
  });

  it('deletes an assessment by ID', () => {
    saveAssessment(createMockAssessment('asmt_1', '2026-09-01', 95.0));
    saveAssessment(createMockAssessment('asmt_2', '2026-10-01', 92.0));

    assert.equal(getSavedAssessments().length, 2);
    const deleted = deleteAssessment('asmt_1');
    assert.equal(deleted, true);

    const remaining = getSavedAssessments();
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].id, 'asmt_2');
  });

  it('computes chronological progress trends and delta statistics accurately', () => {
    const a1 = createMockAssessment('asmt_1', '2026-08-01', 100.0, 175, 2100);
    const a2 = createMockAssessment('asmt_2', '2026-09-01', 96.0, 175, 2050);
    const a3 = createMockAssessment('asmt_3', '2026-10-01', 92.0, 175, 2000);

    // Save in non-chronological order to test sorting
    saveAssessment(a2);
    saveAssessment(a3);
    saveAssessment(a1);

    const { points, stats } = calculateProgressTrends(getSavedAssessments());

    assert.equal(points.length, 3);
    assert.equal(points[0].visitDate, '2026-08-01');
    assert.equal(points[1].visitDate, '2026-09-01');
    assert.equal(points[2].visitDate, '2026-10-01');

    assert.ok(stats);
    assert.equal(stats.recordsCount, 3);
    assert.equal(stats.initialWeightKg, 100.0);
    assert.equal(stats.latestWeightKg, 92.0);
    assert.equal(stats.weightDeltaKg, -8.0);
    assert.equal(stats.weightChangePercent, -8.0);
    assert.equal(stats.initialTargetKcal, 2100);
    assert.equal(stats.latestTargetKcal, 2000);
    assert.equal(stats.caloricDeltaKcal, -100);

    // BMI: 100 / (1.75^2) = 32.7; 92 / (1.75^2) = 30.0 -> delta -2.7
    assert.equal(stats.initialBmi, 32.7);
    assert.equal(stats.latestBmi, 30.0);
    assert.equal(stats.bmiDelta, -2.7);

    // Time span: Aug 1 to Oct 1 = 61 days
    assert.ok(stats.totalDays >= 60 && stats.totalDays <= 62);
    // Weekly rate: -8.0 kg / (61 / 7) ~= -0.92 kg/week
    assert.ok(stats.averageWeeklyWeightDeltaKg !== undefined);
    assert.ok(stats.averageWeeklyWeightDeltaKg! < -0.8 && stats.averageWeeklyWeightDeltaKg! > -1.1);
  });

  it('filters trends by selected patient name and lists distinct patients', () => {
    saveAssessment(createMockAssessment('asmt_1', '2026-08-01', 100.0, 175, 2100, 'Patient Alpha'));
    saveAssessment(createMockAssessment('asmt_2', '2026-09-01', 96.0, 175, 2050, 'Patient Alpha'));
    saveAssessment(createMockAssessment('asmt_3', '2026-08-15', 75.0, 165, 1600, 'Patient Beta'));

    const patients = getDistinctPatients(getSavedAssessments());
    assert.equal(patients.length, 2);
    assert.ok(patients.includes('Patient Alpha'));
    assert.ok(patients.includes('Patient Beta'));

    const alphaTrends = calculateProgressTrends(getSavedAssessments(), 'Patient Alpha');
    assert.equal(alphaTrends.points.length, 2);
    assert.equal(alphaTrends.stats?.weightDeltaKg, -4.0);

    const betaTrends = calculateProgressTrends(getSavedAssessments(), 'Patient Beta');
    assert.equal(betaTrends.points.length, 1);
    assert.equal(betaTrends.stats?.weightDeltaKg, 0);
  });

  it('exports and imports JSON safely', () => {
    saveAssessment(createMockAssessment('asmt_1', '2026-08-01', 90.0));
    const exportedJson = exportAssessmentsJson();
    assert.ok(exportedJson.includes('"recordCount": 1'));

    clearAllAssessments();
    assert.equal(getSavedAssessments().length, 0);

    const result = importAssessmentsJson(exportedJson);
    assert.equal(result.importedCount, 1);
    assert.equal(result.errors.length, 0);
    assert.equal(getSavedAssessments().length, 1);

    // Reject malformed JSON
    const badResult = importAssessmentsJson('not-json');
    assert.equal(badResult.importedCount, 0);
    assert.ok(badResult.errors.length > 0);
  });

  it('seeds demo progress data with 4 sequential visits', () => {
    const demoRecords = seedDemoProgressData('Ahmed Mansour');
    assert.equal(demoRecords.length, 4);

    const { points, stats } = calculateProgressTrends(demoRecords);
    assert.equal(points.length, 4);
    assert.ok(stats);
    assert.equal(stats?.initialWeightKg, 96.0);
    assert.equal(stats?.latestWeightKg, 88.0);
    assert.equal(stats?.weightDeltaKg, -8.0);
    assert.ok(stats?.totalDays > 70); // ~12 weeks
  });
});
