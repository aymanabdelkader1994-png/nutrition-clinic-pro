/**
 * Clinical Nutrition Types & Interfaces
 * Nutrition Clinic Pro - Deterministic Clinical Engine
 */

export type BiologicalSex = 'male' | 'female';

export type AgeGroup = 'infant' | 'child' | 'adolescent' | 'adult' | 'elderly';

export type DataSourceType =
  | 'measured'       // مقاس سريرياً بواسطة أجهزة دقيقة (مثل الميزان الطبي أو شريط القياس)
  | 'calculated'     // محسوب بدقة من معادلة معتمدة
  | 'estimated'      // تقديري (مثل تقدير نسبة الدهون بالعين أو تقريب غير معاير)
  | 'user_reported'  // منقول شفهياً من المريض
  | 'unknown';       // غير معروف المصدر

export interface ProvenanceValue<T> {
  value: T;
  source: DataSourceType;
  notes?: string;
  measuredAt?: string;
}

export type EnergyEquationId =
  | 'mifflin_st_jeor'
  | 'harris_benedict_revised'
  | 'katch_mcardle'
  | 'cunningham'
  | 'schofield'
  | 'who_fao_unu';

export interface ScientificCitation {
  formulaName: string;
  formulaNameAr: string;
  primaryReference: string;
  year: number;
  applicablePopulation: string;
  applicablePopulationAr: string;
  limitations: string;
  limitationsAr: string;
  requiresLeanBodyMass: boolean;
}

export type ActivityLevel =
  | 'sedentary'          // خامل (أعمال مكتبية دون نشاط إضافي)
  | 'lightly_active'     // نشاط خفيف (تمارين خفيفة 1-3 أيام/أسبوع)
  | 'moderately_active'  // نشاط معتدل (تمارين معتدلة 3-5 أيام/أسبوع)
  | 'very_active'        // نشط جداً (تمارين شاقة 6-7 أيام/أسبوع)
  | 'extra_active';      // نشط للغاية (أعمال بدنية شاقة أو رياضيون محترفون)

export interface ActivityLevelConfig {
  level: ActivityLevel;
  palFactor: number; // Physical Activity Level
  labelEn: string;
  labelAr: string;
  descriptionAr: string;
}

export type ClinicalStressCondition =
  | 'normal'
  | 'minor_surgery'
  | 'major_surgery'
  | 'mild_infection'
  | 'moderate_infection'
  | 'severe_infection_sepsis'
  | 'skeletal_trauma'
  | 'head_trauma'
  | 'burn_under_20_percent'
  | 'burn_over_40_percent';

export interface StressConditionConfig {
  condition: ClinicalStressCondition;
  factor: number;
  labelEn: string;
  labelAr: string;
  notesAr: string;
}

export type AdultBMICategory =
  | 'severe_underweight'   // نقص حاد في الوزن (< 16.0)
  | 'moderate_underweight' // نقص معتدل (16.0 - 16.99)
  | 'mild_underweight'     // نقص طفيف (17.0 - 18.49)
  | 'normal'               // وزن طبيعي (18.5 - 24.99)
  | 'overweight'           // زيادة وزن / ما قبل السمنة (25.0 - 29.99)
  | 'obese_class_1'        // سمنة درجة أولى (30.0 - 34.99)
  | 'obese_class_2'        // سمنة درجة ثانية (35.0 - 39.99)
  | 'obese_class_3';       // سمنة مفرطة درجة ثالثة (>= 40.0)

export interface AdultBMIClassificationResult {
  bmi: number;
  isPediatric: false;
  category: AdultBMICategory;
  categoryLabelEn: string;
  categoryLabelAr: string;
  colorClass: string;
  pediatricGuidance?: never;
}

export interface PediatricBMIClassificationResult {
  bmi: number;
  isPediatric: true;
  category?: never;
  categoryLabelEn?: never;
  categoryLabelAr?: never;
  colorClass: string;
  pediatricGuidance: {
    warningEn: string;
    warningAr: string;
    whoGrowthStandardRef: string;
    suggestedActionAr: string;
  };
}

export type BMIClassificationResult =
  | AdultBMIClassificationResult
  | PediatricBMIClassificationResult;

export interface IdealBodyWeightResults {
  hamwiKg: number;
  devineKg: number;
  robinsonKg: number;
  brocaKg: number;
  recommendedIBWKg: number;
  isAdjustedWeightNeeded: boolean;
  adjustedBodyWeightKg?: number; // IBW + 0.4 * (Actual - IBW)
  rationaleAr: string;
}

export interface BodyCompositionResult {
  weightKg: number;
  bodyFatPercentage?: number;
  fatMassKg?: number;
  leanBodyMassKg?: number; // LBM / FFM
  ffmi?: number;           // Fat-Free Mass Index
  fmi?: number;            // Fat Mass Index
}

export interface CardioMetabolicRiskResult {
  whr?: number;          // Waist-to-Hip Ratio
  whrRiskLevel?: 'low' | 'moderate' | 'high';
  whrRiskLabelAr?: string;
  whtr?: number;         // Waist-to-Height Ratio
  whtrRiskLevel?: 'low' | 'increased_risk' | 'substantially_increased_risk';
  whtrRiskLabelAr?: string;
  waistRiskLabelAr?: string;
}

export interface AnthropometricAssessmentOutput {
  bmiResult: BMIClassificationResult;
  bsaMostellerM2: number;
  bsaDuboisM2: number;
  ibwResult: IdealBodyWeightResults;
  bodyComposition: BodyCompositionResult;
  cardioMetabolicRisk: CardioMetabolicRiskResult;
}

export interface EnergyCalculationSingleResult {
  equationId: EnergyEquationId;
  bmrKcal: number;
  tdeeKcal: number;
  citation: ScientificCitation;
  weightUsedType: 'actual' | 'adjusted' | 'lean_mass';
  weightUsedKg: number;
  isAppropriate: boolean;
  suitabilityNoteAr: string;
  suitabilityNoteEn: string;
}

export interface EnergyAssessmentOutput {
  calculatedEquations: Record<EnergyEquationId, EnergyCalculationSingleResult>;
  primaryRecommendedEquation: EnergyEquationId;
  recommendedBmrKcal: number;
  recommendedTdeeKcal: number;
  activityLevel: ActivityLevelConfig;
  stressCondition: StressConditionConfig;
  targetKcal: number;
  adjustmentKcal: number; // e.g. -500 for deficit
  safetyAlerts: Array<{
    severity: 'warning' | 'danger' | 'info';
    messageEn: string;
    messageAr: string;
  }>;
}

export interface MacronutrientTarget {
  proteinGrams: number;
  proteinKcal: number;
  proteinPercentage: number;
  proteinGramsPerKg: number;

  carbsGrams: number;
  carbsKcal: number;
  carbsPercentage: number;

  fatGrams: number;
  fatKcal: number;
  fatPercentage: number;

  fiberGramsTarget: number;
  totalCalories: number;
  fluidRequirementMl: number;
}
