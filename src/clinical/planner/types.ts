/**
 * Nutrition Clinic Pro - Unified Meal Planner Domain Types
 * Phase 4 Implementation
 *
 * Reuses Phase 2 FoodItemRecord / ScaledNutrientProfile and Phase 3 MealType / RecallNutrientSummary
 * without duplicating nutrient scaling or aggregation semantics.
 *
 * Strict Data Integrity Rules:
 * - 0 = confirmed analytical zero
 * - null = unknown or unavailable (never coerced to 0)
 * - exchange_only items never contribute fabricated macronutrients or calories
 */

import { CompositionBasis, ExchangeCategoryId, ScaledNutrientProfile } from '../food/types';
import { MealType, Phase1TargetInputs, RecallNutrientSummary } from '../recall/types';

export interface MealPlanTargetInputs extends Phase1TargetInputs {
  targetFiberG?: number | null;
}

export interface MealPlanItem {
  id: string;
  foodId: string;
  foodCode?: string;
  foodNameEn: string;
  foodNameAr: string;
  selectedPortionId?: string; // undefined means direct gram input
  portionNameEn?: string;
  portionNameAr?: string;
  quantity: number; // multiplier for portion, or grams if isDirectGrams === true
  isDirectGrams: boolean;
  resolvedGramWeight: number;
  nutrients: ScaledNutrientProfile;
  isCustomFood: boolean;
  verificationStatus: string;
  compositionBasis?: CompositionBasis;
  notes?: string;
}

export interface MealSlot {
  id: string;
  mealType: MealType;
  customNameEn?: string;
  customNameAr?: string;
  timeOfDay?: string; // e.g. "08:30"
  items: MealPlanItem[];
  notes?: string;
}

export interface DailyMealPlan {
  id: string;
  titleEn: string;
  titleAr: string;
  planDate: string; // ISO YYYY-MM-DD
  patientName?: string;
  meals: MealSlot[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MealSlotSummary {
  mealId: string;
  mealType: MealType;
  itemsCount: number;
  nutrientSummary: RecallNutrientSummary;
  exchangeSummary: Partial<Record<ExchangeCategoryId, number>>;
  hasUnclassifiedExchanges: boolean;
}

export type MealPlanTargetMetric = 'energy' | 'protein' | 'carbs' | 'fat' | 'fiber';

export type MealPlanComparisonStatus =
  | 'achieved' // 90% - 110% of target with 100% complete analytical data
  | 'under' // < 90% of target with 100% complete analytical data (remaining > 0)
  | 'over' // > 110% of target with 100% complete analytical data (excess > 0)
  | 'target_unavailable' // Phase 1 target not configured / <= 0
  | 'empty_plan' // 0 items in plan
  | 'incomplete_data' // Some items assayed, >= 1 item lacks analytical data for this nutrient
  | 'unavailable_data'; // >= 1 items in plan, 0 have analytical data for this nutrient

export interface MealPlanTargetComparison {
  metric: MealPlanTargetMetric;
  labelEn: string;
  labelAr: string;
  unit: string;
  plannedObserved: number | null; // Sum of assayed values only (null if 0 assayed items)
  plannedComplete: number | null; // Authoritative daily total (null if any item lacks data)
  isComplete: boolean;
  knownItemsCount: number;
  totalItemsCount: number;
  targetValue: number | null;
  difference: number | null; // plannedComplete - targetValue (strictly null unless isComplete && targetValue !== null)
  remaining: number | null; // targetValue - plannedComplete when difference < 0, else 0 when complete; null if incomplete
  excess: number | null; // plannedComplete - targetValue when difference > 0, else 0 when complete; null if incomplete
  percentOfTarget: number | null;
  status: MealPlanComparisonStatus;
  clinicalNoteEn: string;
  clinicalNoteAr: string;
}

export interface DailyMealPlanAnalysis {
  totalItemsCount: number;
  mealsSummaries: MealSlotSummary[];
  dailySummary: RecallNutrientSummary;
  exchangeSummary: Partial<Record<ExchangeCategoryId, number>>;
  hasUnclassifiedExchanges: boolean;
  targetComparisons: MealPlanTargetComparison[];
}
