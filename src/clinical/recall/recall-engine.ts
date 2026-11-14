/**
 * Nutrition Clinic Pro - 24-Hour Dietary Recall Calculation & Aggregation Engine
 * Phase 3 Implementation
 */

import {
  FoodItemRecord,
  FoodNutrientProfile100g,
  FoodPortion,
  ScaledNutrientProfile,
} from '../food/types';
import {
  scaleNutrientProfile,
  roundToPrecision,
  deriveAvailableCarbohydrates,
} from '../food/scaling-engine';
import { getFoodItemById } from '../food/food-database';

import {
  MealType,
  RecallDay,
  RecallEntry,
  RecallMeal,
  RecallPeriodDays,
  RecallSession,
  RecallNutrientSummary,
  NutrientAggregationItem,
  MultiDayRecallAnalysis,
  MultiDayNutrientAverageItem,
  Phase1TargetInputs,
  TargetComparisonItem,
  RecallClinicalWarning,
  STANDARD_MEAL_TYPES,
} from './types';

/**
 * Validates that an entered food intake quantity is finite, strictly positive, and non-NaN.
 */
export function validateIntakeQuantity(quantity: unknown): number {
  if (typeof quantity !== 'number' || !Number.isFinite(quantity) || isNaN(quantity) || quantity <= 0) {
    throw new Error('Intake quantity must be a strictly positive finite number.');
  }
  return quantity;
}

/**
 * Validates a recall session period (1, 2, or 3 days supported).
 */
export function validateRecallPeriodDays(days: unknown): RecallPeriodDays {
  if (days !== 1 && days !== 2 && days !== 3) {
    throw new Error('Recall period must be 1, 2, or 3 days.');
  }
  return days;
}

/**
 * Resolves a food entry's gram weight and scaled nutrient profile deterministically.
 */
export function resolveRecallEntry(params: {
  id?: string;
  food: FoodItemRecord;
  selectedPortionId?: string; // undefined or empty for direct grams
  quantity: number; // multiplier for portion, or grams if direct
  notes?: string;
}): RecallEntry {
  const { food, selectedPortionId, notes } = params;
  const quantity = validateIntakeQuantity(params.quantity);

  let resolvedGramWeight: number;
  let portionNameEn: string | undefined;
  let portionNameAr: string | undefined;
  let isDirectGrams = false;

  if (!selectedPortionId || selectedPortionId === 'grams') {
    // Direct gram input
    isDirectGrams = true;
    resolvedGramWeight = roundToPrecision(quantity, 2);
    portionNameEn = `${resolvedGramWeight}g (Direct weight)`;
    portionNameAr = `${resolvedGramWeight} جم (وزن مباشر)`;
  } else {
    // Household portion resolution
    const portion = food.portions.find((p) => p.id === selectedPortionId);
    if (!portion) {
      throw new Error(`Portion with ID "${selectedPortionId}" not found for food "${food.nameEn}".`);
    }
    resolvedGramWeight = roundToPrecision(portion.gramWeight * quantity, 2);
    portionNameEn = quantity === 1 ? portion.portionNameEn : `${quantity}x ${portion.portionNameEn}`;
    portionNameAr = quantity === 1 ? portion.portionNameAr : `${quantity}x ${portion.portionNameAr}`;
  }

  // Deterministically scale nutrients using Phase 2 scaling engine
  const scaledNutrients = scaleNutrientProfile(food.nutrients100g, resolvedGramWeight);

  return {
    id: params.id || `entry_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    foodId: food.id,
    foodCode: food.code,
    foodNameEn: food.nameEn,
    foodNameAr: food.nameAr,
    selectedPortionId: isDirectGrams ? undefined : selectedPortionId,
    portionNameEn,
    portionNameAr,
    quantity,
    isDirectGrams,
    resolvedGramWeight,
    nutrients: scaledNutrients,
    isCustomFood: food.isCustom,
    verificationStatus: food.verificationStatus,
    notes,
  };
}

interface NutrientDef {
  key: keyof ScaledNutrientProfile;
  nameEn: string;
  nameAr: string;
  unit: string;
}

const TRACKED_NUTRIENTS: NutrientDef[] = [
  { key: 'caloriesKcal', nameEn: 'Energy', nameAr: 'السعرات الحرارية', unit: 'kcal' },
  { key: 'proteinG', nameEn: 'Protein', nameAr: 'البروتين', unit: 'g' },
  { key: 'carbsG', nameEn: 'Total Carbohydrates', nameAr: 'إجمالي الكربوهيدرات', unit: 'g' },
  { key: 'availableCarbsG', nameEn: 'Available Carbohydrates', nameAr: 'الكربوهيدرات المتاحة', unit: 'g' },
  { key: 'fatG', nameEn: 'Total Fat', nameAr: 'الدهون الكلية', unit: 'g' },
  { key: 'fiberG', nameEn: 'Dietary Fiber', nameAr: 'الألياف الغذائية', unit: 'g' },
  { key: 'saturatedFatG', nameEn: 'Saturated Fat', nameAr: 'الدهون المشبعة', unit: 'g' },
  { key: 'sodiumMg', nameEn: 'Sodium', nameAr: 'الصوديوم', unit: 'mg' },
  { key: 'potassiumMg', nameEn: 'Potassium', nameAr: 'البوتاسيوم', unit: 'mg' },
  { key: 'calciumMg', nameEn: 'Calcium', nameAr: 'الكالسيوم', unit: 'mg' },
  { key: 'ironMg', nameEn: 'Iron', nameAr: 'الحديد', unit: 'mg' },
];

/**
 * Aggregates a list of recall entries into a detailed nutrient summary.
 * Crucial rule: Never treats null as zero. If any constituent entry has null,
 * the complete total is marked null, while observedTotal records the observed sum.
 */
export function aggregateRecallEntries(entries: RecallEntry[]): RecallNutrientSummary {
  const summaryAccumulator: Record<string, NutrientAggregationItem> = {};
  let hasIncompleteNutrients = false;

  for (const def of TRACKED_NUTRIENTS) {
    let observedTotal = 0;
    let completeTotal: number | null = 0;
    let knownEntriesCount = 0;
    let missingEntriesCount = 0;

    for (const entry of entries) {
      const val = entry.nutrients[def.key] as number | null | undefined;
      if (val === null || val === undefined) {
        completeTotal = null;
        missingEntriesCount++;
      } else {
        observedTotal += val;
        knownEntriesCount++;
        if (completeTotal !== null) {
          completeTotal += val;
        }
      }
    }

    const isComplete = missingEntriesCount === 0;
    if (!isComplete) {
      hasIncompleteNutrients = true;
    }

    summaryAccumulator[def.key] = {
      nutrientKey: def.key,
      nameEn: def.nameEn,
      nameAr: def.nameAr,
      unit: def.unit,
      observedTotal: roundToPrecision(observedTotal, 2),
      completeTotal: completeTotal !== null ? roundToPrecision(completeTotal, 2) : null,
      isComplete,
      knownEntriesCount,
      missingEntriesCount,
    };
  }

  return {
    caloriesKcal: summaryAccumulator['caloriesKcal'],
    proteinG: summaryAccumulator['proteinG'],
    carbsG: summaryAccumulator['carbsG'],
    availableCarbsG: summaryAccumulator['availableCarbsG'],
    fatG: summaryAccumulator['fatG'],
    fiberG: summaryAccumulator['fiberG'],
    saturatedFatG: summaryAccumulator['saturatedFatG'],
    sodiumMg: summaryAccumulator['sodiumMg'],
    potassiumMg: summaryAccumulator['potassiumMg'],
    calciumMg: summaryAccumulator['calciumMg'],
    ironMg: summaryAccumulator['ironMg'],
    totalEntriesCount: entries.length,
    hasIncompleteNutrients,
  };
}

/**
 * Aggregates all entries in a specific recall day.
 */
export function calculateDayNutrientSummary(day: RecallDay): RecallNutrientSummary {
  const allEntries: RecallEntry[] = [];
  for (const meal of day.meals) {
    allEntries.push(...meal.entries);
  }
  return aggregateRecallEntries(allEntries);
}

/**
 * Calculates multi-day recall analysis across 1 to 3 days.
 * Critical Averaging Rule:
 * Does not calculate a misleading average by treating missing days or missing nutrient values as zero.
 * Tracks complete days, total recorded days, and the exact denominator used.
 */
export function calculateMultiDayRecallAnalysis(session: RecallSession): MultiDayRecallAnalysis {
  const targetDays = session.targetDays;
  const recordedDays = session.days.slice(0, targetDays);
  const recordedDaysCount = recordedDays.length;

  const dailySummaries = recordedDays.map((day) => ({
    dayIndex: day.dayIndex,
    date: day.date,
    summary: calculateDayNutrientSummary(day),
  }));

  const averages: Record<string, MultiDayNutrientAverageItem> = {};

  for (const def of TRACKED_NUTRIENTS) {
    let sumOfObservedDailyTotals = 0;
    let completeDaysCount = 0;

    for (const daySummary of dailySummaries) {
      const item = daySummary.summary[def.key as keyof RecallNutrientSummary] as NutrientAggregationItem;
      sumOfObservedDailyTotals += item.observedTotal;
      if (item.isComplete) {
        completeDaysCount++;
      }
    }

    const denominator = recordedDaysCount > 0 ? recordedDaysCount : 1;
    const observedAverage = roundToPrecision(sumOfObservedDailyTotals / denominator, 2);
    const isComplete = recordedDaysCount > 0 && completeDaysCount === recordedDaysCount;

    averages[def.key] = {
      nutrientKey: def.key,
      nameEn: def.nameEn,
      nameAr: def.nameAr,
      unit: def.unit,
      averageValue: isComplete ? observedAverage : null,
      observedAverage,
      completeDaysCount,
      totalRecordedDays: recordedDaysCount,
      denominator,
      isComplete,
    };
  }

  const isSessionComplete =
    recordedDaysCount === targetDays &&
    dailySummaries.every((d) => d.summary.totalEntriesCount > 0);

  return {
    sessionTargetDays: targetDays,
    recordedDaysCount,
    averages,
    isSessionComplete,
    dailySummaries,
  };
}

/**
 * Compares actual recall intake against existing Phase 1 assessment targets.
 * Strict boundary: Reuses Phase 1 targets without recalculating them.
 * When a target is missing or <= 0, marks it as 'target_unavailable'.
 */
export function compareIntakeWithPhase1Targets(params: {
  actualAverages: Record<string, MultiDayNutrientAverageItem>;
  targets: Phase1TargetInputs;
}): TargetComparisonItem[] {
  const { actualAverages, targets } = params;

  const metrics: Array<{
    metric: 'energy' | 'protein' | 'carbs' | 'fat';
    nutrientKey: string;
    labelEn: string;
    labelAr: string;
    unit: string;
    targetVal: number | null | undefined;
  }> = [
    {
      metric: 'energy',
      nutrientKey: 'caloriesKcal',
      labelEn: 'Energy Intake',
      labelAr: 'احتياج السعرات اليومي',
      unit: 'kcal',
      targetVal: targets.targetCalories,
    },
    {
      metric: 'protein',
      nutrientKey: 'proteinG',
      labelEn: 'Protein Intake',
      labelAr: 'احتياج البروتين اليومي',
      unit: 'g',
      targetVal: targets.targetProteinG,
    },
    {
      metric: 'carbs',
      nutrientKey: 'carbsG',
      labelEn: 'Carbohydrate Intake',
      labelAr: 'احتياج الكربوهيدرات اليومي',
      unit: 'g',
      targetVal: targets.targetCarbsG,
    },
    {
      metric: 'fat',
      nutrientKey: 'fatG',
      labelEn: 'Total Fat Intake',
      labelAr: 'احتياج الدهون اليومي',
      unit: 'g',
      targetVal: targets.targetFatG,
    },
  ];

  return metrics.map((m) => {
    const avgItem = actualAverages[m.nutrientKey];
    const actual = avgItem?.observedAverage ?? 0;
    const isActualIncomplete = avgItem ? !avgItem.isComplete : false;
    const target = m.targetVal && Number.isFinite(m.targetVal) && m.targetVal > 0 ? m.targetVal : null;

    if (target === null) {
      return {
        metric: m.metric,
        labelEn: m.labelEn,
        labelAr: m.labelAr,
        unit: m.unit,
        actualIntake: actual,
        isActualIncomplete,
        targetValue: null,
        difference: null,
        percentAchieved: null,
        status: 'target_unavailable',
        clinicalNoteEn: 'Phase 1 assessment target unavailable or not yet calculated.',
        clinicalNoteAr: 'الهدف السريري من المرحلة الأولى غير متوفر أو لم يُحسب بعد.',
      };
    }

    const diff = roundToPrecision(actual - target, 1);
    const percent = roundToPrecision((actual / target) * 100, 1);

    let status: 'achieved' | 'over' | 'under' = 'achieved';
    if (percent < 90) status = 'under';
    else if (percent > 110) status = 'over';

    return {
      metric: m.metric,
      labelEn: m.labelEn,
      labelAr: m.labelAr,
      unit: m.unit,
      actualIntake: actual,
      isActualIncomplete,
      targetValue: roundToPrecision(target, 1),
      difference: diff,
      percentAchieved: percent,
      status,
      clinicalNoteEn:
        status === 'achieved'
          ? `Within target range (90–110% of planned intake).`
          : status === 'under'
          ? `Below target intake by ${Math.abs(diff)} ${m.unit} (${percent}% achieved).`
          : `Exceeds target intake by ${diff} ${m.unit} (${percent}% achieved).`,
      clinicalNoteAr:
        status === 'achieved'
          ? `ضمن النطاق المستهدف المقبول (90–110%).`
          : status === 'under'
          ? `أقل من المستهدف بمقدار ${Math.abs(diff)} ${m.unit} (تم تحقيق ${percent}%).`
          : `يتجاوز المستهدف بمقدار ${diff} ${m.unit} (تم تحقيق ${percent}%).`,
    };
  });
}

/**
 * Generates comprehensive clinical warnings for a recall session.
 */
export function generateRecallSessionWarnings(
  session: RecallSession,
  targets?: Phase1TargetInputs
): RecallClinicalWarning[] {
  const warnings: RecallClinicalWarning[] = [];

  // Check 1: Missing Phase 1 Targets
  const hasPhase1Energy = targets?.targetCalories && targets.targetCalories > 0;
  if (!hasPhase1Energy) {
    warnings.push({
      id: 'warn_target_unavailable',
      severity: 'info',
      scope: 'target',
      messageEn: 'Phase 1 clinical energy target is unavailable. Compare intake after setting patient anthropometrics.',
      messageAr: 'الهدف السريري للطاقة من المرحلة الأولى غير محدد. قارن المأخوذ بعد إدخال القياسات الجسمانية للمريض.',
    });
  }

  // Check 2: Session completeness
  if (session.days.length < session.targetDays) {
    warnings.push({
      id: 'warn_incomplete_session_days',
      severity: 'warning',
      scope: 'session',
      messageEn: `Session requires ${session.targetDays} day(s), but only ${session.days.length} day(s) have been created.`,
      messageAr: `تتطلب الجلسة ${session.targetDays} أيام، بينما تم إنشاء ${session.days.length} يوم فقط حتى الآن.`,
    });
  }

  // Inspect each day
  session.days.forEach((day, dayIdx) => {
    let dayTotalEntries = 0;
    let dayHasCustomFood = false;
    let dayHasUnassayedMacros = false;
    let dayHasUnassayedSodium = false;
    let dayHasUnassayedFiber = false;

    day.meals.forEach((meal) => {
      dayTotalEntries += meal.entries.length;
      meal.entries.forEach((entry) => {
        if (entry.isCustomFood || entry.verificationStatus === 'user_custom') {
          dayHasCustomFood = true;
        }
        if (
          entry.nutrients.caloriesKcal === null ||
          entry.nutrients.caloriesKcal === undefined ||
          entry.nutrients.carbsG === null ||
          entry.nutrients.carbsG === undefined ||
          entry.nutrients.proteinG === null ||
          entry.nutrients.proteinG === undefined ||
          entry.nutrients.fatG === null ||
          entry.nutrients.fatG === undefined
        ) {
          dayHasUnassayedMacros = true;
        }
        if (entry.nutrients.sodiumMg === null || entry.nutrients.sodiumMg === undefined) {
          dayHasUnassayedSodium = true;
        }
        if (entry.nutrients.fiberG === null || entry.nutrients.fiberG === undefined) {
          dayHasUnassayedFiber = true;
        }
      });
    });

    if (dayTotalEntries === 0) {
      warnings.push({
        id: `warn_empty_day_${day.id}`,
        severity: 'warning',
        scope: 'day',
        targetId: day.id,
        messageEn: `Day ${day.dayIndex} (${day.date}) has no recorded food entries.`,
        messageAr: `اليوم ${day.dayIndex} (${day.date}) لا يحتوي على أي أطعمة مسجلة.`,
      });
    }

    if (dayHasCustomFood) {
      warnings.push({
        id: `warn_custom_food_day_${day.id}`,
        severity: 'info',
        scope: 'day',
        targetId: day.id,
        messageEn: `Day ${day.dayIndex} includes custom/unverified food records. Nutrients depend on clinician entry.`,
        messageAr: `اليوم ${day.dayIndex} يتضمن أطعمة مخصصة غير معيارية. دقة العناصر تعتمد على مدخلات العيادة.`,
      });
    }

    if (dayHasUnassayedMacros) {
      warnings.push({
        id: `warn_incomplete_macros_${day.id}`,
        severity: 'warning',
        scope: 'day',
        targetId: day.id,
        messageEn: `Day ${day.dayIndex}: Energy/macronutrient assays are missing for one or more exchange-only items. Displayed totals exclude unassayed items and are partial observed totals.`,
        messageAr: `اليوم ${day.dayIndex}: بيانات الطاقة والماكروز غير متوفرة لبعض أصناف البدائل فقط. الإجمالي المعروض يمثل مجموعاً جزئياً مرصوداً ولا يشمل الأصناف غير المحللة.`,
      });
    }

    if (dayHasUnassayedSodium) {
      warnings.push({
        id: `warn_incomplete_sodium_${day.id}`,
        severity: 'warning',
        scope: 'day',
        targetId: day.id,
        messageEn: `Day ${day.dayIndex}: Sodium assay data is incomplete for one or more items. Displayed sum is a partial observed total.`,
        messageAr: `اليوم ${day.dayIndex}: بيانات الصوديوم غير مكتملة في بعض الأطعمة. الرقم المعروض يمثل مجموعاً جزئياً مرصوداً.`,
      });
    }

    if (dayHasUnassayedFiber) {
      warnings.push({
        id: `warn_incomplete_fiber_${day.id}`,
        severity: 'warning',
        scope: 'day',
        targetId: day.id,
        messageEn: `Day ${day.dayIndex}: Dietary fiber data is incomplete for one or more items. Displayed sum is a partial observed total.`,
        messageAr: `اليوم ${day.dayIndex}: بيانات الألياف غير مكتملة في بعض الأطعمة. الرقم المعروض يمثل مجموعاً جزئياً مرصوداً.`,
      });
    }
  });

  return warnings;
}

/**
 * Creates a new blank recall session with default meal buckets for the requested days.
 */
export function createNewRecallSession(params: {
  targetDays?: RecallPeriodDays;
  startDate?: string; // YYYY-MM-DD
  patientId?: string;
}): RecallSession {
  const targetDays = validateRecallPeriodDays(params.targetDays || 1);
  const start = params.startDate ? new Date(params.startDate) : new Date();

  const days: RecallDay[] = [];
  for (let i = 1; i <= targetDays; i++) {
    const dayDate = new Date(start);
    dayDate.setDate(start.getDate() - (targetDays - i));
    const dateStr = dayDate.toISOString().split('T')[0];

    const meals: RecallMeal[] = [
      {
        id: `meal_breakfast_${i}_${Date.now()}`,
        mealType: 'breakfast',
        timeOfDay: '08:30',
        entries: [],
      },
      {
        id: `meal_lunch_${i}_${Date.now()}`,
        mealType: 'lunch',
        timeOfDay: '14:30',
        entries: [],
      },
      {
        id: `meal_dinner_${i}_${Date.now()}`,
        mealType: 'dinner',
        timeOfDay: '20:30',
        entries: [],
      },
      {
        id: `meal_snack_${i}_${Date.now()}`,
        mealType: 'afternoon_snack',
        timeOfDay: '17:30',
        entries: [],
      },
    ];

    days.push({
      id: `day_${i}_${Date.now()}`,
      dayIndex: i,
      date: dateStr,
      meals,
    });
  }

  const nowIso = new Date().toISOString();
  return {
    id: `recall_session_${Date.now()}`,
    patientId: params.patientId,
    createdAt: nowIso,
    updatedAt: nowIso,
    targetDays,
    days,
    status: 'in_progress',
  };
}
