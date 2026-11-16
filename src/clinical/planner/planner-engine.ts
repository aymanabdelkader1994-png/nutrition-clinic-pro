/**
 * Nutrition Clinic Pro - Unified Meal Planner Calculation & Planning Engine
 * Phase 4 Implementation
 *
 * Reuses Phase 2 scaling-engine and Phase 3 aggregateRecallEntries / resolveRecallEntry
 * directly to guarantee zero calculation duplication and strict 0 vs null integrity.
 */

import { ExchangeCategoryId, FoodItemRecord } from '../food/types';
import {
  calculateCustomGramsNutrients,
  calculatePortionNutrients,
  roundToPrecision,
} from '../food/scaling-engine';
import { getFoodItemById } from '../food/food-database';
import {
  aggregateRecallEntries,
  resolveRecallEntry,
  validateIntakeQuantity,
} from '../recall/recall-engine';
import {
  MealType,
  NutrientAggregationItem,
  RecallEntry,
  RecallNutrientSummary,
  STANDARD_MEAL_TYPES,
} from '../recall/types';
import {
  DailyMealPlan,
  DailyMealPlanAnalysis,
  MealPlanItem,
  MealPlanTargetComparison,
  MealPlanTargetInputs,
  MealPlanTargetMetric,
  MealSlot,
  MealSlotSummary,
} from './types';

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Resolves a FoodItemRecord + portion or direct grams into a MealPlanItem,
 * delegating nutrient scaling to resolveRecallEntry and documented exchange metadata
 * to Phase 2 scaling functions (never deriving nutrients from exchanges).
 */
export function resolveMealPlanItem(params: {
  id?: string;
  food: FoodItemRecord;
  selectedPortionId?: string;
  quantity: number;
  notes?: string;
}): MealPlanItem {
  const quantity = validateIntakeQuantity(params.quantity);
  const resolved: RecallEntry = resolveRecallEntry({
    id: params.id || makeId('plan_item'),
    food: params.food,
    selectedPortionId: params.selectedPortionId,
    quantity,
    notes: params.notes,
  });

  // Preserve documented exchange metadata separately from analytical nutrient composition
  let exchangeCategory = resolved.nutrients.exchangeCategory;
  let calculatedExchangeCount = resolved.nutrients.calculatedExchangeCount;
  let exchangeBreakdown = resolved.nutrients.exchangeBreakdown;
  let isUnclassifiedExchange = resolved.nutrients.isUnclassifiedExchange;
  let unclassifiedExchangeNoticeEn = resolved.nutrients.unclassifiedExchangeNoticeEn;
  let unclassifiedExchangeNoticeAr = resolved.nutrients.unclassifiedExchangeNoticeAr;

  if (params.food.portions.length > 0) {
    const withExchange = resolved.isDirectGrams
      ? calculateCustomGramsNutrients(params.food, resolved.resolvedGramWeight)
      : calculatePortionNutrients(params.food, resolved.selectedPortionId, quantity);

    exchangeCategory = withExchange.exchangeCategory;
    calculatedExchangeCount = withExchange.calculatedExchangeCount;
    exchangeBreakdown = withExchange.exchangeBreakdown;
    isUnclassifiedExchange = withExchange.isUnclassifiedExchange;
    unclassifiedExchangeNoticeEn = withExchange.unclassifiedExchangeNoticeEn;
    unclassifiedExchangeNoticeAr = withExchange.unclassifiedExchangeNoticeAr;
  }

  return {
    ...resolved,
    nutrients: {
      ...resolved.nutrients,
      exchangeCategory,
      calculatedExchangeCount,
      exchangeBreakdown,
      isUnclassifiedExchange,
      unclassifiedExchangeNoticeEn,
      unclassifiedExchangeNoticeAr,
    },
  };
}

/**
 * Converts a RecallEntry (e.g. returned from FoodEntryModal) into a MealPlanItem,
 * enriching exchange metadata if the underlying food exists in the catalog.
 */
export function mealPlanItemFromEntry(entry: RecallEntry): MealPlanItem {
  const food = getFoodItemById(entry.foodId);
  if (!food || food.portions.length === 0) {
    return { ...entry };
  }
  return resolveMealPlanItem({
    id: entry.id,
    food,
    selectedPortionId: entry.isDirectGrams ? 'grams' : entry.selectedPortionId,
    quantity: entry.quantity,
    notes: entry.notes,
  });
}

/**
 * Creates a structured DailyMealPlan with default clinical meal and snack slots.
 */
export function createDailyMealPlan(params?: {
  titleEn?: string;
  titleAr?: string;
  planDate?: string;
  patientName?: string;
  notes?: string;
}): DailyMealPlan {
  const nowIso = new Date().toISOString();
  const defaultDate = nowIso.split('T')[0];

  const defaultSlots: Array<{ mealType: MealType; timeOfDay: string }> = [
    { mealType: 'breakfast', timeOfDay: '08:00' },
    { mealType: 'morning_snack', timeOfDay: '11:00' },
    { mealType: 'lunch', timeOfDay: '14:30' },
    { mealType: 'afternoon_snack', timeOfDay: '17:30' },
    { mealType: 'dinner', timeOfDay: '20:30' },
  ];

  const meals: MealSlot[] = defaultSlots.map((slot, idx) => ({
    id: `slot_${slot.mealType}_${idx + 1}_${Date.now()}`,
    mealType: slot.mealType,
    timeOfDay: slot.timeOfDay,
    items: [],
  }));

  return {
    id: makeId('meal_plan'),
    titleEn: params?.titleEn?.trim() || 'Daily Therapeutic Meal Plan',
    titleAr: params?.titleAr?.trim() || 'خطة الوجبات اليومية العلاجية',
    planDate: params?.planDate || defaultDate,
    patientName: params?.patientName,
    meals,
    notes: params?.notes,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export function addMealSlot(
  plan: DailyMealPlan,
  params: {
    mealType: MealType;
    customNameEn?: string;
    customNameAr?: string;
    timeOfDay?: string;
  }
): DailyMealPlan {
  const def = STANDARD_MEAL_TYPES[params.mealType];
  const newSlot: MealSlot = {
    id: makeId(`slot_${params.mealType}`),
    mealType: params.mealType,
    customNameEn: params.customNameEn?.trim() || (params.mealType === 'custom' ? def.defaultNameEn : undefined),
    customNameAr: params.customNameAr?.trim() || (params.mealType === 'custom' ? def.defaultNameAr : undefined),
    timeOfDay: params.timeOfDay,
    items: [],
  };

  return {
    ...plan,
    meals: [...plan.meals, newSlot],
    updatedAt: new Date().toISOString(),
  };
}

export function removeMealSlot(plan: DailyMealPlan, mealId: string): DailyMealPlan {
  if (plan.meals.length <= 1) {
    throw new Error('Daily meal plan must contain at least one meal slot.');
  }
  return {
    ...plan,
    meals: plan.meals.filter((m) => m.id !== mealId),
    updatedAt: new Date().toISOString(),
  };
}

export function updateMealSlotMeta(
  plan: DailyMealPlan,
  mealId: string,
  updates: { customNameEn?: string; customNameAr?: string; timeOfDay?: string; notes?: string }
): DailyMealPlan {
  return {
    ...plan,
    meals: plan.meals.map((m) => (m.id === mealId ? { ...m, ...updates } : m)),
    updatedAt: new Date().toISOString(),
  };
}

export function addItemToMeal(plan: DailyMealPlan, mealId: string, item: MealPlanItem): DailyMealPlan {
  const targetExists = plan.meals.some((m) => m.id === mealId);
  if (!targetExists) {
    throw new Error(`Meal slot "${mealId}" not found in plan.`);
  }
  return {
    ...plan,
    meals: plan.meals.map((m) => (m.id === mealId ? { ...m, items: [...m.items, item] } : m)),
    updatedAt: new Date().toISOString(),
  };
}

export function updateMealItemQuantity(
  plan: DailyMealPlan,
  mealId: string,
  itemId: string,
  updates: {
    selectedPortionId?: string;
    quantity: number;
    notes?: string;
  }
): DailyMealPlan {
  const quantity = validateIntakeQuantity(updates.quantity);
  const meal = plan.meals.find((m) => m.id === mealId);
  if (!meal) {
    throw new Error(`Meal slot "${mealId}" not found in plan.`);
  }
  const existingItem = meal.items.find((it) => it.id === itemId);
  if (!existingItem) {
    throw new Error(`Meal item "${itemId}" not found in meal "${mealId}".`);
  }

  const food = getFoodItemById(existingItem.foodId);
  if (!food) {
    throw new Error(
      `Food record "${existingItem.foodId}" (${existingItem.foodNameEn}) is missing from catalog; cannot re-scale without fabricating composition.`
    );
  }

  const updatedItem = resolveMealPlanItem({
    id: existingItem.id,
    food,
    selectedPortionId: updates.selectedPortionId,
    quantity,
    notes: updates.notes !== undefined ? updates.notes : existingItem.notes,
  });

  return {
    ...plan,
    meals: plan.meals.map((m) =>
      m.id === mealId
        ? {
            ...m,
            items: m.items.map((it) => (it.id === itemId ? updatedItem : it)),
          }
        : m
    ),
    updatedAt: new Date().toISOString(),
  };
}

export function replaceMealItem(
  plan: DailyMealPlan,
  mealId: string,
  itemId: string,
  replacement: MealPlanItem
): DailyMealPlan {
  const meal = plan.meals.find((m) => m.id === mealId);
  if (!meal) {
    throw new Error(`Meal slot "${mealId}" not found in plan.`);
  }
  if (!meal.items.some((it) => it.id === itemId)) {
    throw new Error(`Meal item "${itemId}" not found in meal "${mealId}".`);
  }
  return {
    ...plan,
    meals: plan.meals.map((m) =>
      m.id === mealId
        ? {
            ...m,
            items: m.items.map((it) => (it.id === itemId ? replacement : it)),
          }
        : m
    ),
    updatedAt: new Date().toISOString(),
  };
}

export function removeMealItem(plan: DailyMealPlan, mealId: string, itemId: string): DailyMealPlan {
  return {
    ...plan,
    meals: plan.meals.map((m) =>
      m.id === mealId
        ? {
            ...m,
            items: m.items.filter((it) => it.id !== itemId),
          }
        : m
    ),
    updatedAt: new Date().toISOString(),
  };
}

function accumulateExchangeSummary(items: MealPlanItem[]): {
  exchangeSummary: Partial<Record<ExchangeCategoryId, number>>;
  hasUnclassifiedExchanges: boolean;
} {
  const totals: Partial<Record<ExchangeCategoryId, number>> = {};
  let hasUnclassifiedExchanges = false;

  for (const item of items) {
    if (item.nutrients.isUnclassifiedExchange && !item.nutrients.exchangeBreakdown) {
      hasUnclassifiedExchanges = true;
      continue;
    }

    if (item.nutrients.exchangeBreakdown) {
      for (const [cat, factor] of Object.entries(item.nutrients.exchangeBreakdown)) {
        if (typeof factor === 'number' && Number.isFinite(factor) && factor > 0) {
          const key = cat as ExchangeCategoryId;
          totals[key] = roundToPrecision((totals[key] ?? 0) + factor, 2);
        }
      }
    } else if (
      item.nutrients.exchangeCategory &&
      typeof item.nutrients.calculatedExchangeCount === 'number' &&
      Number.isFinite(item.nutrients.calculatedExchangeCount) &&
      item.nutrients.calculatedExchangeCount > 0
    ) {
      const key = item.nutrients.exchangeCategory;
      totals[key] = roundToPrecision((totals[key] ?? 0) + item.nutrients.calculatedExchangeCount, 2);
    }
  }

  return { exchangeSummary: totals, hasUnclassifiedExchanges };
}

/**
 * Calculates meal-level analytical nutrient summary & separate documented exchanges.
 * Reuses aggregateRecallEntries so null vs 0 semantics match Phase 3 strictly.
 */
export function calculateMealSlotSummary(meal: MealSlot): MealSlotSummary {
  const nutrientSummary = aggregateRecallEntries(meal.items);
  const { exchangeSummary, hasUnclassifiedExchanges } = accumulateExchangeSummary(meal.items);

  return {
    mealId: meal.id,
    mealType: meal.mealType,
    itemsCount: meal.items.length,
    nutrientSummary,
    exchangeSummary,
    hasUnclassifiedExchanges,
  };
}

/**
 * Compares daily meal plan totals against Phase 1 clinical targets.
 * Strict Data Integrity Rules:
 * - Never treats unavailable (null) values as 0.
 * - Preserves genuine analytical 0 as 0 (e.g. 0g fat / 0 kcal item).
 * - Withholds remaining/excess/difference/% whenever any item in the plan lacks data for that nutrient.
 */
export function compareMealPlanWithTargets(
  dailySummary: RecallNutrientSummary,
  targets?: MealPlanTargetInputs
): MealPlanTargetComparison[] {
  const specs: Array<{
    metric: MealPlanTargetMetric;
    summaryKey: keyof RecallNutrientSummary;
    labelEn: string;
    labelAr: string;
    unit: string;
    targetVal: number | null | undefined;
  }> = [
    {
      metric: 'energy',
      summaryKey: 'caloriesKcal',
      labelEn: 'Energy (Calories)',
      labelAr: 'السعرات الحرارية',
      unit: 'kcal',
      targetVal: targets?.targetCalories,
    },
    {
      metric: 'protein',
      summaryKey: 'proteinG',
      labelEn: 'Protein',
      labelAr: 'البروتين',
      unit: 'g',
      targetVal: targets?.targetProteinG,
    },
    {
      metric: 'carbs',
      summaryKey: 'carbsG',
      labelEn: 'Total Carbohydrates',
      labelAr: 'الكربوهيدرات',
      unit: 'g',
      targetVal: targets?.targetCarbsG,
    },
    {
      metric: 'fat',
      summaryKey: 'fatG',
      labelEn: 'Total Fat',
      labelAr: 'الدهون الكلية',
      unit: 'g',
      targetVal: targets?.targetFatG,
    },
    {
      metric: 'fiber',
      summaryKey: 'fiberG',
      labelEn: 'Dietary Fiber',
      labelAr: 'الألياف الغذائية',
      unit: 'g',
      targetVal: targets?.targetFiberG,
    },
  ];

  const totalItemsCount = dailySummary.totalEntriesCount;

  return specs.map((spec) => {
    const item = dailySummary[spec.summaryKey] as NutrientAggregationItem;
    const plannedObserved = item.observedTotal;
    const plannedComplete = item.completeTotal;
    const isComplete = item.isComplete;
    const knownItemsCount = item.knownEntriesCount;

    const target =
      spec.targetVal !== null &&
      spec.targetVal !== undefined &&
      Number.isFinite(spec.targetVal) &&
      spec.targetVal > 0
        ? roundToPrecision(spec.targetVal, 1)
        : null;

    if (target === null) {
      return {
        metric: spec.metric,
        labelEn: spec.labelEn,
        labelAr: spec.labelAr,
        unit: spec.unit,
        plannedObserved,
        plannedComplete,
        isComplete,
        knownItemsCount,
        totalItemsCount,
        targetValue: null,
        difference: null,
        remaining: null,
        excess: null,
        percentOfTarget: null,
        status: 'target_unavailable',
        clinicalNoteEn: 'Phase 1 target unavailable; enter patient anthropometrics in Clinical Calculator.',
        clinicalNoteAr: 'الهدف السريري من المرحلة الأولى غير متوفر؛ أدخل بيانات المريض في الحاسبة.',
      };
    }

    if (totalItemsCount === 0) {
      return {
        metric: spec.metric,
        labelEn: spec.labelEn,
        labelAr: spec.labelAr,
        unit: spec.unit,
        plannedObserved: null,
        plannedComplete: null,
        isComplete: false,
        knownItemsCount: 0,
        totalItemsCount: 0,
        targetValue: target,
        difference: null,
        remaining: null,
        excess: null,
        percentOfTarget: null,
        status: 'empty_plan',
        clinicalNoteEn: `No foods planned yet. Daily target: ${target} ${spec.unit}.`,
        clinicalNoteAr: `لم تُضف أطعمة للخطة بعد. المستهدف اليومي: ${target} ${spec.unit}.`,
      };
    }

    if (!isComplete || plannedComplete === null) {
      const isFullyUnavailable = plannedObserved === null || knownItemsCount === 0;
      return {
        metric: spec.metric,
        labelEn: spec.labelEn,
        labelAr: spec.labelAr,
        unit: spec.unit,
        plannedObserved,
        plannedComplete: null,
        isComplete: false,
        knownItemsCount,
        totalItemsCount,
        targetValue: target,
        difference: null,
        remaining: null,
        excess: null,
        percentOfTarget: null,
        status: isFullyUnavailable ? 'unavailable_data' : 'incomplete_data',
        clinicalNoteEn: isFullyUnavailable
          ? `Remaining/excess withheld: all ${totalItemsCount} planned item(s) lack analytical data for ${spec.labelEn.toLowerCase()}.`
          : `Remaining/excess withheld: ${knownItemsCount}/${totalItemsCount} planned items have assayed data (observed sum excludes unassayed items).`,
        clinicalNoteAr: isFullyUnavailable
          ? `تم تعليق المتبقي/الفائض: جميع الأصناف (${totalItemsCount}) تفتقر لبيانات تحليلية لعنصر ${spec.labelAr}.`
          : `تم تعليق المتبقي/الفائض: تتوفر بيانات تحليلية لـ ${knownItemsCount}/${totalItemsCount} من الأصناف فقط (المعروض مجموع جزئي).`,
      };
    }

    // Complete analytical data across all planned items
    const difference = roundToPrecision(plannedComplete - target, 1);
    const remaining = difference < 0 ? roundToPrecision(Math.abs(difference), 1) : 0;
    const excess = difference > 0 ? roundToPrecision(difference, 1) : 0;
    const percentOfTarget = roundToPrecision((plannedComplete / target) * 100, 1);

    let status: 'achieved' | 'under' | 'over' = 'achieved';
    if (percentOfTarget < 90) status = 'under';
    else if (percentOfTarget > 110) status = 'over';

    const clinicalNoteEn =
      difference === 0
        ? `Exact match with target (${target} ${spec.unit}).`
        : difference < 0
        ? `${remaining} ${spec.unit} remaining to reach target (${percentOfTarget}% planned).`
        : `${excess} ${spec.unit} excess above target (${percentOfTarget}% planned).`;

    const clinicalNoteAr =
      difference === 0
        ? `مطابق تماماً للمستهدف (${target} ${spec.unit}).`
        : difference < 0
        ? `متبقي ${remaining} ${spec.unit} للوصول للمستهدف (${percentOfTarget}% مخطط).`
        : `فائض ${excess} ${spec.unit} عن المستهدف (${percentOfTarget}% مخطط).`;

    return {
      metric: spec.metric,
      labelEn: spec.labelEn,
      labelAr: spec.labelAr,
      unit: spec.unit,
      plannedObserved,
      plannedComplete,
      isComplete: true,
      knownItemsCount,
      totalItemsCount,
      targetValue: target,
      difference,
      remaining,
      excess,
      percentOfTarget,
      status,
      clinicalNoteEn,
      clinicalNoteAr,
    };
  });
}

/**
 * Computes full meal-level & daily analytical totals, documented exchanges, and target comparisons.
 */
export function calculateDailyMealPlanAnalysis(
  plan: DailyMealPlan,
  targets?: MealPlanTargetInputs
): DailyMealPlanAnalysis {
  const mealsSummaries = plan.meals.map((meal) => calculateMealSlotSummary(meal));
  const allItems: MealPlanItem[] = [];
  for (const meal of plan.meals) {
    allItems.push(...meal.items);
  }

  const dailySummary = aggregateRecallEntries(allItems);
  const { exchangeSummary, hasUnclassifiedExchanges } = accumulateExchangeSummary(allItems);
  const targetComparisons = compareMealPlanWithTargets(dailySummary, targets);

  return {
    totalItemsCount: allItems.length,
    mealsSummaries,
    dailySummary,
    exchangeSummary,
    hasUnclassifiedExchanges,
    targetComparisons,
  };
}

/**
 * Builds a deterministic, evidence-based sample Egyptian therapeutic meal plan
 * using verified catalog items.
 */
export function createSampleEgyptianMealPlan(patientName?: string): DailyMealPlan {
  let plan = createDailyMealPlan({
    titleEn: 'Sample Egyptian Balanced Plan',
    titleAr: 'نموذج خطة غذائية مصرية متوازنة',
    patientName,
  });

  const bread = getFoodItemById('food_bread_baladi_baked');
  const egg = getFoodItemById('food_egg_whole_boiled');
  const chicken = getFoodItemById('food_chicken_breast_grilled_skinless');
  const rice = getFoodItemById('food_rice_white_cooked');
  const salad = getFoodItemById('food_salad_baladi_green');
  const oil = getFoodItemById('food_oil_olive_extra_virgin');
  const apple = getFoodItemById('food_apple_raw_skin');
  const yogurt = getFoodItemById('food_yogurt_lowfat_plain');

  const breakfastSlot = plan.meals.find((m) => m.mealType === 'breakfast');
  if (breakfastSlot) {
    if (bread) {
      plan = addItemToMeal(
        plan,
        breakfastSlot.id,
        resolveMealPlanItem({ food: bread, selectedPortionId: 'portion_baladi_full_loaf', quantity: 1 })
      );
    }
    if (egg) {
      plan = addItemToMeal(
        plan,
        breakfastSlot.id,
        resolveMealPlanItem({ food: egg, selectedPortionId: 'portion_egg_large', quantity: 2 })
      );
    }
  }

  const morningSnackSlot = plan.meals.find((m) => m.mealType === 'morning_snack');
  if (morningSnackSlot && apple) {
    plan = addItemToMeal(
      plan,
      morningSnackSlot.id,
      resolveMealPlanItem({ food: apple, selectedPortionId: 'portion_apple_medium', quantity: 1 })
    );
  }

  const lunchSlot = plan.meals.find((m) => m.mealType === 'lunch');
  if (lunchSlot) {
    if (chicken) {
      plan = addItemToMeal(
        plan,
        lunchSlot.id,
        resolveMealPlanItem({ food: chicken, selectedPortionId: 'portion_chicken_grilled_serving', quantity: 1.5 })
      );
    }
    if (rice) {
      plan = addItemToMeal(
        plan,
        lunchSlot.id,
        resolveMealPlanItem({ food: rice, selectedPortionId: 'portion_rice_cooked_half_cup', quantity: 2 })
      );
    }
    if (salad) {
      plan = addItemToMeal(
        plan,
        lunchSlot.id,
        resolveMealPlanItem({ food: salad, selectedPortionId: 'portion_salad_bowl_cup', quantity: 1 })
      );
    }
    if (oil) {
      plan = addItemToMeal(
        plan,
        lunchSlot.id,
        resolveMealPlanItem({ food: oil, selectedPortionId: 'portion_olive_oil_tbsp', quantity: 1 })
      );
    }
  }

  const dinnerSlot = plan.meals.find((m) => m.mealType === 'dinner');
  if (dinnerSlot) {
    if (yogurt) {
      plan = addItemToMeal(
        plan,
        dinnerSlot.id,
        resolveMealPlanItem({ food: yogurt, selectedPortionId: 'portion_yogurt_egypt_pot', quantity: 2 })
      );
    }
    if (bread) {
      plan = addItemToMeal(
        plan,
        dinnerSlot.id,
        resolveMealPlanItem({ food: bread, selectedPortionId: 'portion_baladi_half_loaf', quantity: 1 })
      );
    }
  }

  return plan;
}
