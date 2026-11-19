/**
 * Nutrition Clinic Pro - Deterministic Food Scaling & Exchange Divergence Engine
 * Phase 2 Foundation & Controlled Remediation
 *
 * Clinical Rules:
 * 1. Pure, deterministic, side-effect free calculations.
 * 2. Unanalyzed/missing nutrients MUST remain null in complete totals — never substitute with 0.
 * 3. Provide observedTotal to preserve known intake, with explicit hasIncompleteData flags.
 * 4. Never present observedTotal as a complete total when data is missing.
 * 5. Multi-component exchangeBreakdown scaling without automated guesswork.
 * 6. Sourced carbohydrate semantics (Total by Difference vs Available Carbs).
 * 7. Arabic text normalization for clinical food search.
 */

import {
  ExchangeCategoryId,
  ExchangeDivergenceResult,
  ExchangeSystemId,
  FoodItemRecord,
  FoodNutrientProfile100g,
  FoodPortion,
  PreparationState,
  ScaledNutrientProfile,
  VerificationStatus,
} from './types';
import { getExchangeSystem } from './exchange-systems';

/**
 * Rounds a number to a specific decimal precision deterministically.
 */
export function roundToPrecision(value: number, decimals: number = 2): number {
  if (!Number.isFinite(value)) {
    throw new TypeError(`Expected finite number for rounding, received: ${value}`);
  }
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Scales an optional nutrient value proportionally or preserves null if unanalyzed.
 */
function scaleOptionalNutrient(value: number | null | undefined, netWeightG: number, decimals: number = 2): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  return roundToPrecision((value * netWeightG) / 100.0, decimals);
}

export function hasAnalyticalMacros(
  profile: Pick<FoodNutrientProfile100g | ScaledNutrientProfile, 'caloriesKcal' | 'carbsG' | 'proteinG' | 'fatG'>
): boolean {
  return (
    profile.caloriesKcal !== null &&
    profile.caloriesKcal !== undefined &&
    profile.carbsG !== null &&
    profile.carbsG !== undefined &&
    profile.proteinG !== null &&
    profile.proteinG !== undefined &&
    profile.fatG !== null &&
    profile.fatG !== undefined
  );
}

/**
 * Scales a 100g food nutrient profile to an arbitrary net gram weight.
 * 
 * Clinical Rule:
 * Unknown or unanalyzed nutrients remain strictly null.
 * Never impute 0 for missing values.
 */
export function scaleNutrientProfile(
  nutrients100g: FoodNutrientProfile100g,
  netWeightG: number
): ScaledNutrientProfile {
  if (!Number.isFinite(netWeightG) || netWeightG < 0) {
    throw new RangeError(`Net food weight must be a non-negative finite number, received: ${netWeightG}`);
  }

  return {
    netWeightG: roundToPrecision(netWeightG, 2),
    caloriesKcal: scaleOptionalNutrient(nutrients100g.caloriesKcal, netWeightG, 1),
    carbsG: scaleOptionalNutrient(nutrients100g.carbsG, netWeightG, 2),
    availableCarbsG:
      nutrients100g.availableCarbsG !== undefined && nutrients100g.availableCarbsG !== null
        ? scaleOptionalNutrient(nutrients100g.availableCarbsG, netWeightG, 2)
        : nutrients100g.availableCarbsG === null
        ? null
        : undefined,
    carbCalculationBasis: nutrients100g.carbCalculationBasis,
    proteinG: scaleOptionalNutrient(nutrients100g.proteinG, netWeightG, 2),
    fatG: scaleOptionalNutrient(nutrients100g.fatG, netWeightG, 2),
    fiberG: scaleOptionalNutrient(nutrients100g.fiberG, netWeightG, 2),
    saturatedFatG: scaleOptionalNutrient(nutrients100g.saturatedFatG, netWeightG, 2),
    transFatG: scaleOptionalNutrient(nutrients100g.transFatG, netWeightG, 2),
    monounsaturatedFatG: scaleOptionalNutrient(nutrients100g.monounsaturatedFatG, netWeightG, 2),
    polyunsaturatedFatG: scaleOptionalNutrient(nutrients100g.polyunsaturatedFatG, netWeightG, 2),
    cholesterolMg: scaleOptionalNutrient(nutrients100g.cholesterolMg, netWeightG, 1),
    sodiumMg: scaleOptionalNutrient(nutrients100g.sodiumMg, netWeightG, 1),
    potassiumMg: scaleOptionalNutrient(nutrients100g.potassiumMg, netWeightG, 1),
    calciumMg: scaleOptionalNutrient(nutrients100g.calciumMg, netWeightG, 1),
    ironMg: scaleOptionalNutrient(nutrients100g.ironMg, netWeightG, 2),
    missingNutrientKeys: [...nutrients100g.missingNutrientKeys],
  };
}

/**
 * Calculates chemically derived available (glycemic) carbohydrates per 100g or portion
 * using the compositional equation: Total Carbohydrates by Difference - Dietary Fiber.
 *
 * CRITICAL CLINICAL PROTOCOL NOTICE:
 * This value represents a chemical food composition estimate.
 * It is NOT an insulin bolus dosing recommendation.
 * Protocol-specific clinical heuristics (such as advanced carbohydrate-counting guidelines
 * where a portion of dietary fiber is deducted for insulin titration when fiber exceeds
 * a clinical threshold such as 5g per serving) are clinical management algorithms that belong
 * to clinical decision-support interfaces, not to the foundational chemical food database.
 * Never blindly subtract fiber unless the source definition confirms total by difference.
 */
export function deriveAvailableCarbohydrates(
  profile: FoodNutrientProfile100g | ScaledNutrientProfile
): number | null {
  if (profile.availableCarbsG !== undefined && profile.availableCarbsG !== null) {
    return profile.availableCarbsG;
  }
  if (
    profile.carbCalculationBasis === 'total_by_difference' &&
    profile.carbsG !== null &&
    profile.carbsG !== undefined &&
    profile.fiberG !== null &&
    profile.fiberG !== undefined
  ) {
    const net = profile.carbsG - profile.fiberG;
    return roundToPrecision(Math.max(0, net), 2);
  }
  return null;
}

/**
 * Calculates the exact nutrient profile for a selected portion and quantity multiplier.
 * Supports multi-component exchange breakdown scaling without automated guesswork.
 */
export function calculatePortionNutrients(
  food: FoodItemRecord,
  portionId?: string,
  quantityMultiplier: number = 1
): ScaledNutrientProfile {
  if (!Number.isFinite(quantityMultiplier) || quantityMultiplier <= 0) {
    throw new RangeError(`Portion quantity multiplier must be greater than zero, received: ${quantityMultiplier}`);
  }

  // Find target portion or fallback to default serving or first available portion
  let portion: FoodPortion | undefined;
  if (portionId) {
    portion = food.portions.find((p) => p.id === portionId);
  }
  if (!portion) {
    portion = food.portions.find((p) => p.isDefaultServing) || food.portions[0];
  }

  if (!portion) {
    throw new Error(`Food item "${food.nameEn}" (${food.id}) does not have any defined portions.`);
  }

  const netWeightG = portion.gramWeight * quantityMultiplier;
  const scaled = scaleNutrientProfile(food.nutrients100g, netWeightG);

  scaled.exchangeCategory = portion.exchangeCategory;
  scaled.calculatedExchangeCount =
    portion.isUnclassifiedExchange && !portion.exchangeBreakdown
      ? undefined
      : roundToPrecision(portion.exchangeEquivalentFactor * quantityMultiplier, 2);

  scaled.isUnclassifiedExchange = portion.isUnclassifiedExchange;
  scaled.unclassifiedExchangeNoticeEn = portion.unclassifiedExchangeNoticeEn;
  scaled.unclassifiedExchangeNoticeAr = portion.unclassifiedExchangeNoticeAr;

  // Scale multi-component exchange breakdown if documented on the portion
  if (portion.exchangeBreakdown) {
    const scaledBreakdown: Partial<Record<ExchangeCategoryId, number>> = {};
    for (const [cat, factor] of Object.entries(portion.exchangeBreakdown)) {
      if (typeof factor === 'number') {
        scaledBreakdown[cat as ExchangeCategoryId] = roundToPrecision(factor * quantityMultiplier, 2);
      }
    }
    scaled.exchangeBreakdown = scaledBreakdown;
  }

  return scaled;
}

/**
 * Calculates nutrients for an explicit custom gram weight.
 */
export function calculateCustomGramsNutrients(
  food: FoodItemRecord,
  customGrams: number
): ScaledNutrientProfile {
  const scaled = scaleNutrientProfile(food.nutrients100g, customGrams);
  scaled.exchangeCategory = food.primaryExchangeCategoryId;

  // Estimate exchange count based on default portion weight if available
  const defaultPortion = food.portions.find((p) => p.isDefaultServing) || food.portions[0];
  if (defaultPortion && defaultPortion.gramWeight > 0) {
    scaled.isUnclassifiedExchange = defaultPortion.isUnclassifiedExchange;
    scaled.unclassifiedExchangeNoticeEn = defaultPortion.unclassifiedExchangeNoticeEn;
    scaled.unclassifiedExchangeNoticeAr = defaultPortion.unclassifiedExchangeNoticeAr;
    scaled.calculatedExchangeCount =
      defaultPortion.isUnclassifiedExchange && !defaultPortion.exchangeBreakdown
        ? undefined
        : roundToPrecision(
            (customGrams / defaultPortion.gramWeight) * defaultPortion.exchangeEquivalentFactor,
            2
          );

    if (defaultPortion.exchangeBreakdown) {
      const ratio = customGrams / defaultPortion.gramWeight;
      const scaledBreakdown: Partial<Record<ExchangeCategoryId, number>> = {};
      for (const [cat, factor] of Object.entries(defaultPortion.exchangeBreakdown)) {
        if (typeof factor === 'number') {
          scaledBreakdown[cat as ExchangeCategoryId] = roundToPrecision(factor * ratio, 2);
        }
      }
      scaled.exchangeBreakdown = scaledBreakdown;
    }
  }

  return scaled;
}

/**
 * Aggregates multiple scaled food items into a composite nutrient summary.
 *
 * Clinical Remediation Rules:
 * 1. Complete totals (`totalFiberG`, `totalSodiumMg`, etc.) strictly equal `null` if any constituent item has missing data.
 * 2. Observed totals (`observedTotalFiberG`, etc.) report the exact sum of known values so analyzed intake is preserved.
 * 3. Never present `observedTotal` as a complete authoritative total when `hasIncompleteData === true`.
 * 4. Never convert `null` into zero.
 */
export interface CompositeNutrientSummary {
  totalNetWeightG: number;
  totalCaloriesKcal: number | null;
  totalCarbsG: number | null;
  totalProteinG: number | null;
  totalFatG: number | null;

  /** Complete totals (strictly null if ANY item is missing that nutrient) */
  totalFiberG: number | null;
  totalSaturatedFatG: number | null;
  totalSodiumMg: number | null;
  totalPotassiumMg: number | null;
  totalCalciumMg: number | null;
  totalIronMg: number | null;
  totalAvailableCarbsG?: number | null;

  /**
   * Observed totals: The arithmetic sum of all analyzed non-null values across constituent food items.
   * CLINICAL NOTICE: When hasIncompleteData is true, this represents an OBSERVED MINIMUM intake,
   * NOT the patient's full intake, because constituent items with unanalyzed values are excluded.
   */
  observedTotals: {
    caloriesKcal: number;
    carbsG: number;
    proteinG: number;
    fatG: number;
    fiberG: number;
    saturatedFatG: number;
    sodiumMg: number;
    potassiumMg: number;
    calciumMg: number;
    ironMg: number;
  };

  /** Direct access to observed totals */
  observedTotalFiberG: number;
  observedTotalSaturatedFatG: number;
  observedTotalSodiumMg: number;
  observedTotalPotassiumMg: number;
  observedTotalCalciumMg: number;
  observedTotalIronMg: number;

  /** True if any food item in the aggregated set has incomplete/null data for any nutrient */
  hasIncompleteData: boolean;
  incompleteNutrientKeys: string[];
  missingNutrientKeys: string[];

  /** Per-nutrient completeness flags */
  completeness: {
    caloriesKcal: boolean;
    carbsG: boolean;
    proteinG: boolean;
    fatG: boolean;
    fiberG: boolean;
    saturatedFatG: boolean;
    sodiumMg: boolean;
    potassiumMg: boolean;
    calciumMg: boolean;
    ironMg: boolean;
  };

  incompleteDataWarningEn?: string;
  incompleteDataWarningAr?: string;
}

export function aggregateNutrientProfiles(profiles: ScaledNutrientProfile[]): CompositeNutrientSummary {
  let totalNetWeightG = 0;
  let totalCaloriesKcal: number | null = 0;
  let totalCarbsG: number | null = 0;
  let totalProteinG: number | null = 0;
  let totalFatG: number | null = 0;

  let observedCaloriesKcal = 0;
  let observedCarbsG = 0;
  let observedProteinG = 0;
  let observedFatG = 0;

  // Complete totals (null if any item has null)
  let totalFiberG: number | null = 0;
  let totalSaturatedFatG: number | null = 0;
  let totalSodiumMg: number | null = 0;
  let totalPotassiumMg: number | null = 0;
  let totalCalciumMg: number | null = 0;
  let totalIronMg: number | null = 0;

  // Observed totals (sums only non-null numbers; never converts null to 0)
  let observedFiberG = 0;
  let observedSaturatedFatG = 0;
  let observedSodiumMg = 0;
  let observedPotassiumMg = 0;
  let observedCalciumMg = 0;
  let observedIronMg = 0;

  const incompleteNutrientKeysSet = new Set<string>();
  const missingKeysSet = new Set<string>();

  for (const p of profiles) {
    totalNetWeightG += p.netWeightG;

    // Energy
    if (p.caloriesKcal === null || p.caloriesKcal === undefined) {
      totalCaloriesKcal = null;
      incompleteNutrientKeysSet.add('caloriesKcal');
      missingKeysSet.add('caloriesKcal');
    } else {
      observedCaloriesKcal += p.caloriesKcal;
      if (totalCaloriesKcal !== null) totalCaloriesKcal += p.caloriesKcal;
    }

    // Carbs
    if (p.carbsG === null || p.carbsG === undefined) {
      totalCarbsG = null;
      incompleteNutrientKeysSet.add('carbsG');
      missingKeysSet.add('carbsG');
    } else {
      observedCarbsG += p.carbsG;
      if (totalCarbsG !== null) totalCarbsG += p.carbsG;
    }

    // Protein
    if (p.proteinG === null || p.proteinG === undefined) {
      totalProteinG = null;
      incompleteNutrientKeysSet.add('proteinG');
      missingKeysSet.add('proteinG');
    } else {
      observedProteinG += p.proteinG;
      if (totalProteinG !== null) totalProteinG += p.proteinG;
    }

    // Fat
    if (p.fatG === null || p.fatG === undefined) {
      totalFatG = null;
      incompleteNutrientKeysSet.add('fatG');
      missingKeysSet.add('fatG');
    } else {
      observedFatG += p.fatG;
      if (totalFatG !== null) totalFatG += p.fatG;
    }

    // Fiber
    if (p.fiberG === null || p.fiberG === undefined) {
      totalFiberG = null;
      incompleteNutrientKeysSet.add('fiberG');
      missingKeysSet.add('fiberG');
    } else {
      observedFiberG += p.fiberG;
      if (totalFiberG !== null) {
        totalFiberG += p.fiberG;
      }
    }

    // Saturated fat
    if (p.saturatedFatG === null || p.saturatedFatG === undefined) {
      totalSaturatedFatG = null;
      incompleteNutrientKeysSet.add('saturatedFatG');
      missingKeysSet.add('saturatedFatG');
    } else {
      observedSaturatedFatG += p.saturatedFatG;
      if (totalSaturatedFatG !== null) {
        totalSaturatedFatG += p.saturatedFatG;
      }
    }

    // Sodium
    if (p.sodiumMg === null || p.sodiumMg === undefined) {
      totalSodiumMg = null;
      incompleteNutrientKeysSet.add('sodiumMg');
      missingKeysSet.add('sodiumMg');
    } else {
      observedSodiumMg += p.sodiumMg;
      if (totalSodiumMg !== null) {
        totalSodiumMg += p.sodiumMg;
      }
    }

    // Potassium
    if (p.potassiumMg === null || p.potassiumMg === undefined) {
      totalPotassiumMg = null;
      incompleteNutrientKeysSet.add('potassiumMg');
      missingKeysSet.add('potassiumMg');
    } else {
      observedPotassiumMg += p.potassiumMg;
      if (totalPotassiumMg !== null) {
        totalPotassiumMg += p.potassiumMg;
      }
    }

    // Calcium
    if (p.calciumMg === null || p.calciumMg === undefined) {
      totalCalciumMg = null;
      incompleteNutrientKeysSet.add('calciumMg');
      missingKeysSet.add('calciumMg');
    } else {
      observedCalciumMg += p.calciumMg;
      if (totalCalciumMg !== null) {
        totalCalciumMg += p.calciumMg;
      }
    }

    // Iron
    if (p.ironMg === null || p.ironMg === undefined) {
      totalIronMg = null;
      incompleteNutrientKeysSet.add('ironMg');
      missingKeysSet.add('ironMg');
    } else {
      observedIronMg += p.ironMg;
      if (totalIronMg !== null) {
        totalIronMg += p.ironMg;
      }
    }

    p.missingNutrientKeys.forEach((k) => missingKeysSet.add(k));
  }

  const incompleteNutrientKeys = Array.from(incompleteNutrientKeysSet);
  const missingNutrientKeys = Array.from(missingKeysSet);
  const hasIncompleteData = incompleteNutrientKeys.length > 0 || missingNutrientKeys.length > 0;

  const observedTotals = {
    caloriesKcal: roundToPrecision(observedCaloriesKcal, 1),
    carbsG: roundToPrecision(observedCarbsG, 2),
    proteinG: roundToPrecision(observedProteinG, 2),
    fatG: roundToPrecision(observedFatG, 2),
    fiberG: roundToPrecision(observedFiberG, 2),
    saturatedFatG: roundToPrecision(observedSaturatedFatG, 2),
    sodiumMg: roundToPrecision(observedSodiumMg, 1),
    potassiumMg: roundToPrecision(observedPotassiumMg, 1),
    calciumMg: roundToPrecision(observedCalciumMg, 1),
    ironMg: roundToPrecision(observedIronMg, 2),
  };

  return {
    totalNetWeightG: roundToPrecision(totalNetWeightG, 2),
    totalCaloriesKcal: totalCaloriesKcal !== null ? roundToPrecision(totalCaloriesKcal, 1) : null,
    totalCarbsG: totalCarbsG !== null ? roundToPrecision(totalCarbsG, 2) : null,
    totalProteinG: totalProteinG !== null ? roundToPrecision(totalProteinG, 2) : null,
    totalFatG: totalFatG !== null ? roundToPrecision(totalFatG, 2) : null,

    totalFiberG: totalFiberG !== null ? roundToPrecision(totalFiberG, 2) : null,
    totalSaturatedFatG: totalSaturatedFatG !== null ? roundToPrecision(totalSaturatedFatG, 2) : null,
    totalSodiumMg: totalSodiumMg !== null ? roundToPrecision(totalSodiumMg, 1) : null,
    totalPotassiumMg: totalPotassiumMg !== null ? roundToPrecision(totalPotassiumMg, 1) : null,
    totalCalciumMg: totalCalciumMg !== null ? roundToPrecision(totalCalciumMg, 1) : null,
    totalIronMg: totalIronMg !== null ? roundToPrecision(totalIronMg, 2) : null,

    observedTotals,
    observedTotalFiberG: observedTotals.fiberG,
    observedTotalSaturatedFatG: observedTotals.saturatedFatG,
    observedTotalSodiumMg: observedTotals.sodiumMg,
    observedTotalPotassiumMg: observedTotals.potassiumMg,
    observedTotalCalciumMg: observedTotals.calciumMg,
    observedTotalIronMg: observedTotals.ironMg,

    hasIncompleteData,
    incompleteNutrientKeys,
    missingNutrientKeys,

    completeness: {
      caloriesKcal: !incompleteNutrientKeysSet.has('caloriesKcal'),
      carbsG: !incompleteNutrientKeysSet.has('carbsG'),
      proteinG: !incompleteNutrientKeysSet.has('proteinG'),
      fatG: !incompleteNutrientKeysSet.has('fatG'),
      fiberG: !incompleteNutrientKeysSet.has('fiberG'),
      saturatedFatG: !incompleteNutrientKeysSet.has('saturatedFatG'),
      sodiumMg: !incompleteNutrientKeysSet.has('sodiumMg'),
      potassiumMg: !incompleteNutrientKeysSet.has('potassiumMg'),
      calciumMg: !incompleteNutrientKeysSet.has('calciumMg'),
      ironMg: !incompleteNutrientKeysSet.has('ironMg'),
    },

    incompleteDataWarningEn: hasIncompleteData
      ? `Clinical Notice: ${incompleteNutrientKeys.length} nutrient(s) (${incompleteNutrientKeys.join(', ')}) have unanalyzed values in one or more foods. Displayed observed totals represent known measured values only and are not complete daily totals.`
      : undefined,
    incompleteDataWarningAr: hasIncompleteData
      ? `تنبيه سريري: يحتوي السجل على ${incompleteNutrientKeys.length} عنصر غذائي غير مكتمل التحليل في بعض الأصناف (${incompleteNutrientKeys.join(', ')}). المجاميع المرصودة (observed totals) تمثل فقط القيم المقاسة معملياً وليست إجمالياً كاملاً.`
      : undefined,
  };
}

/**
 * Computes estimated macronutrients and calories for a distribution of nominal food exchanges.
 */
export interface ExchangeAllocationEstimate {
  systemId: ExchangeSystemId;
  totalCaloriesKcal: number;
  totalCarbsG: number;
  totalProteinG: number;
  totalFatG: number;
  categoryBreakdown: Partial<
    Record<
      ExchangeCategoryId,
      {
        count: number;
        caloriesKcal: number;
        carbsG: number;
        proteinG: number;
        fatG: number;
      }
    >
  >;
}

export function convertExchangesToEstimatedNutrients(
  allocations: Partial<Record<ExchangeCategoryId, number>>,
  systemId?: ExchangeSystemId
): ExchangeAllocationEstimate {
  const system = getExchangeSystem(systemId);
  let totalCaloriesKcal = 0;
  let totalCarbsG = 0;
  let totalProteinG = 0;
  let totalFatG = 0;

  const categoryBreakdown: ExchangeAllocationEstimate['categoryBreakdown'] = {};

  for (const [key, rawCount] of Object.entries(allocations)) {
    const categoryId = key as ExchangeCategoryId;
    const count = rawCount ?? 0;
    if (count <= 0) continue;

    const ref = system.exchangeValues[categoryId];
    if (!ref) continue;

    const catKcal = ref.caloriesKcal * count;
    const catCarbs = ref.carbsG * count;
    const catProtein = ref.proteinG * count;
    const catFat = ref.fatG * count;

    totalCaloriesKcal += catKcal;
    totalCarbsG += catCarbs;
    totalProteinG += catProtein;
    totalFatG += catFat;

    categoryBreakdown[categoryId] = {
      count: roundToPrecision(count, 2),
      caloriesKcal: roundToPrecision(catKcal, 1),
      carbsG: roundToPrecision(catCarbs, 1),
      proteinG: roundToPrecision(catProtein, 1),
      fatG: roundToPrecision(catFat, 1),
    };
  }

  return {
    systemId: system.systemId,
    totalCaloriesKcal: roundToPrecision(totalCaloriesKcal, 1),
    totalCarbsG: roundToPrecision(totalCarbsG, 1),
    totalProteinG: roundToPrecision(totalProteinG, 1),
    totalFatG: roundToPrecision(totalFatG, 1),
    categoryBreakdown,
  };
}

/**
 * Calculates the clinical divergence between food catalog analytical composition
 * and nominal exchange list expectations.
 */
export function calculateExchangeDivergence(
  food: FoodItemRecord,
  portion: FoodPortion,
  systemId?: ExchangeSystemId
): ExchangeDivergenceResult {
  if (portion.isUnclassifiedExchange && !portion.exchangeBreakdown) {
    throw new Error(
      `Cannot compute exchange divergence for unclassified composite food "${food.nameEn}": portion contains unclassified carbohydrates and lipids without a documented exchangeBreakdown.`
    );
  }

  const system = getExchangeSystem(systemId);
  const refValue = system.exchangeValues[portion.exchangeCategory];

  if (!refValue) {
    throw new Error(`Category "${portion.exchangeCategory}" is not recognized in system "${system.systemId}".`);
  }

  const exchangeCount = portion.exchangeEquivalentFactor;

  // Nominal expected values
  const nominalKcal = refValue.caloriesKcal * exchangeCount;
  const nominalCarbsG = refValue.carbsG * exchangeCount;
  const nominalProteinG = refValue.proteinG * exchangeCount;
  const nominalFatG = refValue.fatG * exchangeCount;

  // Actual scaled analytical values
  const actualProfile = scaleNutrientProfile(food.nutrients100g, portion.gramWeight);
  if (!hasAnalyticalMacros(actualProfile)) {
    throw new Error(
      `Cannot compute exchange divergence for exchange-only food "${food.nameEn}" (${food.id}): analytical macronutrient composition is unavailable (null).`
    );
  }
  const actualKcal = actualProfile.caloriesKcal!;
  const actualCarbsG = actualProfile.carbsG!;
  const actualProteinG = actualProfile.proteinG!;
  const actualFatG = actualProfile.fatG!;

  const deltaKcal = roundToPrecision(actualKcal - nominalKcal, 1);
  const deltaCarbsG = roundToPrecision(actualCarbsG - nominalCarbsG, 2);
  const deltaProteinG = roundToPrecision(actualProteinG - nominalProteinG, 2);
  const deltaFatG = roundToPrecision(actualFatG - nominalFatG, 2);

  const divergencePercentageKcal =
    nominalKcal > 0 ? roundToPrecision((deltaKcal / nominalKcal) * 100, 1) : 0;

  return {
    foodId: food.id,
    foodNameEn: food.nameEn,
    foodNameAr: food.nameAr,
    portionNameEn: portion.portionNameEn,
    portionNameAr: portion.portionNameAr,
    gramWeight: portion.gramWeight,
    exchangeCategory: portion.exchangeCategory,
    exchangeCount,
    nominalKcal: roundToPrecision(nominalKcal, 1),
    nominalCarbsG: roundToPrecision(nominalCarbsG, 2),
    nominalProteinG: roundToPrecision(nominalProteinG, 2),
    nominalFatG: roundToPrecision(nominalFatG, 2),
    actualKcal: roundToPrecision(actualKcal, 1),
    actualCarbsG: roundToPrecision(actualCarbsG, 2),
    actualProteinG: roundToPrecision(actualProteinG, 2),
    actualFatG: roundToPrecision(actualFatG, 2),
    deltaKcal,
    deltaCarbsG,
    deltaProteinG,
    deltaFatG,
    divergencePercentageKcal,
  };
}

/**
 * Normalizes Arabic text for flexible clinical search:
 * - Strips all Arabic diacritical marks (Tashkeel) and Tatweel (ـ).
 * - Normalizes Alef forms (أ, إ, آ, ٱ -> ا).
 * - Normalizes Taa Marbuta (ة -> ه) and Yaa (ى -> ي).
 * - Trims and squashes multiple whitespace characters.
 */
export function normalizeArabicText(text: string): string {
  if (!text) return '';

  return (
    text
      // Strip Arabic Tashkeel / diacritics and Tatweel elongation
      .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
      // Normalize Alef variations
      .replace(/[أإآٱ]/g, 'ا')
      // Normalize Taa Marbuta
      .replace(/ة/g, 'ه')
      // Normalize Alef Maksura to Yaa
      .replace(/ى/g, 'ي')
      // Normalize Persian/Urdu kaf/gaf/yeh if any
      .replace(/ك/g, 'ك')
      // Normalize extra whitespace
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
  );
}

/**
 * Normalizes English/Latin text for flexible clinical search:
 * - Strips combining diacritics (e.g. Pané -> pane)
 * - Normalizes punctuation/separators to spaces and squashes whitespace
 * - Trims and lowercases
 */
export function normalizeEnglishText(text: string): string {
  if (!text) return '';

  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export type FoodCompletenessCategory =
  | 'complete_analytical'
  | 'partial_analytical'
  | 'clinic_estimated'
  | 'recipe_based'
  | 'exchange_only'
  | 'user_custom';

export interface FoodCompletenessMeta {
  category: FoodCompletenessCategory;
  missingCount: number;
  missingKeys: string[];
  badgeEn: string;
  badgeAr: string;
  detailEn: string;
  detailAr: string;
}

/**
 * Classifies a food record's analytical completeness for clinical transparency.
 */
export function getFoodCompletenessMeta(food: FoodItemRecord): FoodCompletenessMeta {
  const missingKeys = food.nutrients100g.missingNutrientKeys ?? [];
  const missingCount = missingKeys.length;

  if (food.isCustom || food.verificationStatus === 'user_custom') {
    return {
      category: 'user_custom',
      missingCount,
      missingKeys,
      badgeEn: 'Custom',
      badgeAr: 'مخصص',
      detailEn:
        missingCount > 0
          ? `User custom food (${missingCount} tracked micronutrients/fatty acids omitted)`
          : 'User custom food (all tracked fields entered)',
      detailAr:
        missingCount > 0
          ? `طعام مخصص (ناقص ${missingCount} عناصر غير مدخلة)`
          : 'طعام مخصص (جميع الحقول متوفرة)',
    };
  }

  if (food.compositionBasis === 'exchange_only' || food.nutrients100g.caloriesKcal === null) {
    return {
      category: 'exchange_only',
      missingCount,
      missingKeys,
      badgeEn: 'Exchange-Only',
      badgeAr: 'بديل فقط',
      detailEn: 'Exchange-only entry (unassayed 100g composition; calories/macros are null)',
      detailAr: 'بديل غذائي فقط (غير محلل لكل 100 جم؛ السعرات والماكروز غير متوفرة)',
    };
  }

  if (food.compositionBasis === 'recipe_based' || food.verificationStatus === 'recipe_based') {
    return {
      category: 'recipe_based',
      missingCount,
      missingKeys,
      badgeEn: 'Recipe Estimate',
      badgeAr: 'وصفة مركبة',
      detailEn:
        missingCount > 0
          ? `Recipe estimate (${missingCount} unassayed micronutrients)`
          : 'Recipe-modeled culinary composite (not lab-assayed)',
      detailAr:
        missingCount > 0
          ? `تقدير وصفي مركب (ناقص ${missingCount} عناصر)`
          : 'تقدير وصفي مركب (غير محلل معملياً)',
    };
  }

  if (food.compositionBasis === 'clinic_estimated') {
    return {
      category: 'clinic_estimated',
      missingCount,
      missingKeys,
      badgeEn: 'Estimated',
      badgeAr: 'تقديرية',
      detailEn:
        missingCount > 0
          ? `Clinically estimated macros (${missingCount} unassayed secondary nutrients)`
          : 'Clinically estimated composition',
      detailAr:
        missingCount > 0
          ? `تركيبة تقديرية مراجعة (ناقص ${missingCount} عناصر ثانوية)`
          : 'تركيبة تقديرية مراجعة سريرياً',
    };
  }

  if (missingCount > 0) {
    return {
      category: 'partial_analytical',
      missingCount,
      missingKeys,
      badgeEn: `Partial (${missingCount} missing)`,
      badgeAr: `تحليل جزئي (${missingCount} ناقص)`,
      detailEn: `Partial analytical profile (${missingCount} unassayed nutrients: ${missingKeys.join(', ')})`,
      detailAr: `ملف تحليلي جزئي (ناقص ${missingCount} عناصر: ${missingKeys.join('، ')})`,
    };
  }

  return {
    category: 'complete_analytical',
    missingCount: 0,
    missingKeys: [],
    badgeEn: 'Complete Analytical',
    badgeAr: 'تحليل مكتمل',
    detailEn: 'Complete analytical profile (all 15 tracked nutrients verified)',
    detailAr: 'ملف تحليلي مكتمل (جميع العناصر الـ 15 متوفرة وموثقة)',
  };
}

/**
 * Filter options for clinical food database queries.
 */
export interface FoodFilterOptions {
  exchangeCategory?: ExchangeCategoryId;
  preparationState?: PreparationState;
  verifiedOnly?: boolean;
  sourceId?: string;
  dataSourceId?: string;
}

const COMPLETENESS_PRIORITY: Record<FoodCompletenessCategory, number> = {
  complete_analytical: 0,
  partial_analytical: 1,
  clinic_estimated: 2,
  recipe_based: 3,
  user_custom: 4,
  exchange_only: 5,
};

function getCanonicalPriority(food: FoodItemRecord): number {
  const code = food.code ?? '';
  if (!code.startsWith('RP-')) {
    return 0; // Curated multi-portion canonical items (original_30 / USDA / NNI / RECIPE)
  }
  if (code.startsWith('RP-MT-') && food.primaryExchangeCategoryId === 'plant_protein_legumes') {
    return 2; // Overlapping legume entries retained in meats module; prefer legumes module (RP-LEG-*)
  }
  return 1;
}

function getVerificationPriority(status: VerificationStatus): number {
  switch (status) {
    case 'verified_standard':
      return 0;
    case 'clinic_reviewed':
      return 1;
    case 'recipe_based':
      return 2;
    case 'user_custom':
    default:
      return 3;
  }
}

function getSearchMatchTier(
  food: FoodItemRecord,
  normQueryAr: string,
  normQueryEn: string
): number | null {
  const normAr = normalizeArabicText(food.nameAr);
  const normEn = normalizeEnglishText(food.nameEn);
  const normTagsAr = (food.tags ?? []).map((t) => normalizeArabicText(t)).filter(Boolean);
  const normTagsEn = (food.tags ?? []).map((t) => normalizeEnglishText(t)).filter(Boolean);

  // Tier 1: Exact Arabic name match
  if (normQueryAr.length > 0 && normAr === normQueryAr) return 1;

  // Tier 2: Exact English name match
  if (normQueryEn.length > 0 && normEn === normQueryEn) return 2;

  // Tier 3: Exact normalized tag/alias match
  if (
    (normQueryAr.length > 0 && normTagsAr.some((t) => t === normQueryAr)) ||
    (normQueryEn.length > 0 && normTagsEn.some((t) => t === normQueryEn))
  ) {
    return 3;
  }

  // Tier 4: Prefix match on Arabic or English name
  if (
    (normQueryAr.length > 0 && normAr.startsWith(normQueryAr)) ||
    (normQueryEn.length > 0 && normEn.startsWith(normQueryEn))
  ) {
    return 4;
  }

  // Tier 5: Substring match on Arabic or English name
  if (
    (normQueryAr.length > 0 && normAr.includes(normQueryAr)) ||
    (normQueryEn.length > 0 && normEn.includes(normQueryEn))
  ) {
    return 5;
  }

  // Tier 6: Substring match on normalized tags/aliases
  if (
    (normQueryAr.length > 0 && normTagsAr.some((t) => t.includes(normQueryAr))) ||
    (normQueryEn.length > 0 && normTagsEn.some((t) => t.includes(normQueryEn)))
  ) {
    return 6;
  }

  // Tier 7: Scientific name match
  const normSci = food.scientificName ? normalizeEnglishText(food.scientificName) : '';
  if (normQueryEn.length > 0 && normSci.includes(normQueryEn)) {
    return 7;
  }

  return null;
}

/**
 * Searches and filters food items deterministically.
 * When a text query is provided, applies bilingual Arabic/English normalization
 * (including tag normalization) and 7-tier deterministic ranking with clinical completeness
 * and canonical tie-breakers.
 */
export function searchFoodItems(
  database: FoodItemRecord[],
  query: string,
  options?: FoodFilterOptions
): FoodItemRecord[] {
  const normQueryAr = normalizeArabicText(query);
  const normQueryEn = normalizeEnglishText(query);
  const hasQuery = normQueryEn.length > 0 || normQueryAr.length > 0;
  const targetSourceId = options?.sourceId || options?.dataSourceId;

  const filtered = database.filter((food) => {
    // 1. Exchange Category filter
    if (options?.exchangeCategory && food.primaryExchangeCategoryId !== options.exchangeCategory) {
      return false;
    }

    // 2. Preparation State filter
    if (options?.preparationState && food.preparationState !== options.preparationState) {
      return false;
    }

    // 3. Verification status filter
    if (options?.verifiedOnly && (food.verificationStatus === 'user_custom' || food.verificationStatus === 'recipe_based')) {
      return false;
    }

    // 4. Data Source filter
    if (targetSourceId && food.sourceId !== targetSourceId && food.dataSourceId !== targetSourceId) {
      return false;
    }

    return true;
  });

  if (!hasQuery) {
    return filtered;
  }

  const scored: Array<{
    food: FoodItemRecord;
    tier: number;
    completenessRank: number;
    canonicalRank: number;
    verificationRank: number;
    portionCount: number;
    nameLength: number;
  }> = [];

  for (const food of filtered) {
    const tier = getSearchMatchTier(food, normQueryAr, normQueryEn);
    if (tier === null) continue;

    const completeness = getFoodCompletenessMeta(food);
    scored.push({
      food,
      tier,
      completenessRank: COMPLETENESS_PRIORITY[completeness.category],
      canonicalRank: getCanonicalPriority(food),
      verificationRank: getVerificationPriority(food.verificationStatus),
      portionCount: food.portions.length,
      nameLength: Math.min(food.nameEn.length, food.nameAr.length),
    });
  }

  scored.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    if (a.completenessRank !== b.completenessRank) return a.completenessRank - b.completenessRank;
    if (a.canonicalRank !== b.canonicalRank) return a.canonicalRank - b.canonicalRank;
    if (a.verificationRank !== b.verificationRank) return a.verificationRank - b.verificationRank;
    if (a.portionCount !== b.portionCount) return b.portionCount - a.portionCount;
    if (a.nameLength !== b.nameLength) return a.nameLength - b.nameLength;
    return a.food.id.localeCompare(b.food.id);
  });

  return scored.map((entry) => entry.food);
}
