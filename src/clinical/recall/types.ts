/**
 * Nutrition Clinic Pro - 24-Hour Dietary Recall Domain Types
 * Phase 3 Implementation
 */

import { FoodItemRecord, ScaledNutrientProfile } from '../food/types';

export type RecallPeriodDays = 1 | 2 | 3;

export type MealType =
  | 'breakfast'
  | 'morning_snack'
  | 'lunch'
  | 'afternoon_snack'
  | 'dinner'
  | 'evening_snack'
  | 'custom';

export interface MealTypeDefinition {
  type: MealType;
  defaultNameEn: string;
  defaultNameAr: string;
  sortOrder: number;
}

export const STANDARD_MEAL_TYPES: Record<MealType, MealTypeDefinition> = {
  breakfast: {
    type: 'breakfast',
    defaultNameEn: 'Breakfast',
    defaultNameAr: 'الإفطار',
    sortOrder: 1,
  },
  morning_snack: {
    type: 'morning_snack',
    defaultNameEn: 'Morning Snack',
    defaultNameAr: 'وجبة خفيفة صباحية',
    sortOrder: 2,
  },
  lunch: {
    type: 'lunch',
    defaultNameEn: 'Lunch',
    defaultNameAr: 'الغداء',
    sortOrder: 3,
  },
  afternoon_snack: {
    type: 'afternoon_snack',
    defaultNameEn: 'Afternoon Snack',
    defaultNameAr: 'وجبة خفيفة مسائية',
    sortOrder: 4,
  },
  dinner: {
    type: 'dinner',
    defaultNameEn: 'Dinner',
    defaultNameAr: 'العشاء',
    sortOrder: 5,
  },
  evening_snack: {
    type: 'evening_snack',
    defaultNameEn: 'Late Night Snack',
    defaultNameAr: 'وجبة خفيفة ليلية',
    sortOrder: 6,
  },
  custom: {
    type: 'custom',
    defaultNameEn: 'Custom Meal',
    defaultNameAr: 'وجبة مخصصة',
    sortOrder: 7,
  },
};

export interface RecallEntry {
  id: string;
  foodId: string;
  foodCode?: string;
  foodNameEn: string;
  foodNameAr: string;
  selectedPortionId?: string; // undefined means direct gram input
  portionNameEn?: string;
  portionNameAr?: string;
  quantity: number; // multiplier for portion, or total grams if direct
  isDirectGrams: boolean;
  resolvedGramWeight: number;
  nutrients: ScaledNutrientProfile;
  isCustomFood: boolean;
  verificationStatus: string;
  notes?: string;
}

export interface RecallMeal {
  id: string;
  mealType: MealType;
  customNameEn?: string;
  customNameAr?: string;
  timeOfDay?: string; // e.g. "08:30"
  entries: RecallEntry[];
  notes?: string;
}

export interface RecallDay {
  id: string;
  dayIndex: number; // 1, 2, or 3
  date: string; // ISO format: YYYY-MM-DD
  meals: RecallMeal[];
  notes?: string;
}

export type RecallSessionStatus = 'in_progress' | 'completed';

export interface RecallSession {
  id: string;
  patientId?: string;
  createdAt: string;
  updatedAt: string;
  targetDays: RecallPeriodDays;
  days: RecallDay[];
  status: RecallSessionStatus;
  notes?: string;
}

/**
 * Metric-level tracking for a nutrient in aggregated views.
 * Distinguishes known observations from incomplete profiles.
 */
export interface NutrientAggregationItem {
  nutrientKey: string;
  nameEn: string;
  nameAr: string;
  unit: string;
  observedTotal: number;
  completeTotal: number | null; // null if any constituent entry has missing data
  isComplete: boolean;
  knownEntriesCount: number;
  missingEntriesCount: number;
}

export interface RecallNutrientSummary {
  caloriesKcal: NutrientAggregationItem;
  proteinG: NutrientAggregationItem;
  carbsG: NutrientAggregationItem;
  availableCarbsG: NutrientAggregationItem;
  fatG: NutrientAggregationItem;
  fiberG: NutrientAggregationItem;
  saturatedFatG: NutrientAggregationItem;
  sodiumMg: NutrientAggregationItem;
  potassiumMg: NutrientAggregationItem;
  calciumMg: NutrientAggregationItem;
  ironMg: NutrientAggregationItem;
  totalEntriesCount: number;
  hasIncompleteNutrients: boolean;
}

export interface MultiDayNutrientAverageItem {
  nutrientKey: string;
  nameEn: string;
  nameAr: string;
  unit: string;
  averageValue: number | null; // Complete average (null if any recorded day is incomplete)
  observedAverage: number; // Average of available observed totals across recorded days
  completeDaysCount: number;
  totalRecordedDays: number;
  denominator: number;
  isComplete: boolean;
}

export interface MultiDayRecallAnalysis {
  sessionTargetDays: RecallPeriodDays;
  recordedDaysCount: number;
  averages: Record<string, MultiDayNutrientAverageItem>;
  isSessionComplete: boolean;
  dailySummaries: Array<{
    dayIndex: number;
    date: string;
    summary: RecallNutrientSummary;
  }>;
}

export interface TargetComparisonItem {
  metric: 'energy' | 'protein' | 'carbs' | 'fat';
  labelEn: string;
  labelAr: string;
  unit: string;
  actualIntake: number; // Daily average actual intake
  isActualIncomplete?: boolean; // True if any entry in the analyzed period lacks energy/macro assay data
  targetValue: number | null; // From Phase 1 assessment
  difference: number | null; // actual - target
  percentAchieved: number | null; // (actual / target) * 100
  status: 'achieved' | 'over' | 'under' | 'target_unavailable';
  clinicalNoteEn?: string;
  clinicalNoteAr?: string;
}

export interface Phase1TargetInputs {
  targetCalories?: number | null;
  targetProteinG?: number | null;
  targetCarbsG?: number | null;
  targetFatG?: number | null;
}

export type WarningSeverity = 'info' | 'warning' | 'danger';

export interface RecallClinicalWarning {
  id: string;
  severity: WarningSeverity;
  scope: 'entry' | 'meal' | 'day' | 'session' | 'target';
  targetId?: string;
  messageEn: string;
  messageAr: string;
}
