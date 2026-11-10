/**
 * Nutrition Clinic Pro - Patient Assessment History & Progress Tracking Types
 * Strongly typed records and trend metrics stored in LocalStorage.
 */

import { BiologicalSex, ActivityLevel, ClinicalStressCondition, EnergyEquationId } from '../types';

export interface PatientAssessmentRecord {
  id: string;
  patientName: string;
  patientIdOrMrn?: string;
  timestamp: string; // ISO 8601 string, e.g. "2026-11-09T13:48:00.000Z"
  visitDate: string; // Formatted YYYY-MM-DD
  notes?: string;

  // 1. Core Clinical Inputs
  inputs: {
    sex: BiologicalSex;
    ageYears: number;
    heightCm: number;
    weightKg: number;
    waistCm?: number;
    hipCm?: number;
    bodyFatPercent?: number;
    hasBodyFat: boolean;
    activityLevel: ActivityLevel;
    stressCondition: ClinicalStressCondition;
    adjustmentKcal: number;
    selectedEquation: EnergyEquationId;
    selectedDietPreset?: string;
    carbsPercent: number;
    proteinPercent: number;
    fatPercent: number;
  };

  // 2. Computed Anthropometric Results
  anthropometrics: {
    bmi: number;
    bmiCategoryKey: string;
    bmiCategoryAr: string;
    bmiCategoryEn: string;
    isPediatric: boolean;
    ibwDevineKg?: number;
    ibwHamwiKg?: number;
    ibwRobinsonKg?: number;
    abwKg?: number;
    isAdjustedWeightNeeded?: boolean;
    waistToHipRatio?: number;
    whrRiskAr?: string;
    whrRiskEn?: string;
    leanBodyMassKg?: number;
    fatMassKg?: number;
  };

  // 3. Computed Energy Requirements
  energy: {
    equationUsed: EnergyEquationId;
    bmrKcal: number;
    tdeeKcal: number;
    targetKcal: number;
    adjustmentKcal: number;
  };

  // 4. Computed Macronutrient Targets
  macronutrients: {
    carbsGrams: number;
    proteinGrams: number;
    fatGrams: number;
    carbsKcal: number;
    proteinKcal: number;
    fatKcal: number;
    proteinPerKgActual: number;
  };
}

export interface ProgressTrendPoint {
  id: string;
  timestamp: string;
  visitDate: string;
  dateLabel: string;
  weightKg: number;
  bmi: number;
  targetKcal: number;
  tdeeKcal: number;
  bodyFatPercent?: number;
  waistCm?: number;
  patientName: string;
}

export interface TrendStatistics {
  recordsCount: number;
  firstDate: string;
  latestDate: string;
  totalDays: number;
  initialWeightKg: number;
  latestWeightKg: number;
  weightDeltaKg: number;
  weightChangePercent: number;
  initialBmi: number;
  latestBmi: number;
  bmiDelta: number;
  initialTargetKcal: number;
  latestTargetKcal: number;
  caloricDeltaKcal: number;
  averageWeeklyWeightDeltaKg?: number;
}
