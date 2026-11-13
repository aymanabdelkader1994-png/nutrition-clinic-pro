/**
 * Nutrition Clinic Pro - 24-Hour Dietary Recall Test Suite
 * Phase 3 Automated Verification
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  getAllFoodItems,
  getFoodItemById,
  registerCustomFoodItem,
  clearCustomFoodsForTesting,
} from '../src/clinical/food/food-database';

import { searchFoodItems } from '../src/clinical/food/scaling-engine';

import {
  validateIntakeQuantity,
  validateRecallPeriodDays,
  resolveRecallEntry,
  aggregateRecallEntries,
  calculateDayNutrientSummary,
  calculateMultiDayRecallAnalysis,
  compareIntakeWithPhase1Targets,
  generateRecallSessionWarnings,
  createNewRecallSession,
} from '../src/clinical/recall/recall-engine';

import {
  RecallEntry,
  RecallMeal,
  RecallDay,
  RecallSession,
  Phase1TargetInputs,
} from '../src/clinical/recall/types';

describe('Phase 3: 24-Hour Dietary Recall Engine Tests', () => {

  describe('1. Recall Domain & Input Robustness Validation', () => {
    it('accepts valid 1, 2, and 3-day recall periods', () => {
      assert.equal(validateRecallPeriodDays(1), 1);
      assert.equal(validateRecallPeriodDays(2), 2);
      assert.equal(validateRecallPeriodDays(3), 3);
    });

    it('rejects 0-day, >3-day, and invalid recall periods', () => {
      assert.throws(() => validateRecallPeriodDays(0), /Recall period must be 1, 2, or 3 days/);
      assert.throws(() => validateRecallPeriodDays(4), /Recall period must be 1, 2, or 3 days/);
      assert.throws(() => validateRecallPeriodDays(-1), /Recall period must be 1, 2, or 3 days/);
      assert.throws(() => validateRecallPeriodDays(NaN), /Recall period must be 1, 2, or 3 days/);
    });

    it('validates strictly positive, finite numbers for intake quantities', () => {
      assert.equal(validateIntakeQuantity(1.5), 1.5);
      assert.equal(validateIntakeQuantity(100), 100);

      assert.throws(() => validateIntakeQuantity(0), /strictly positive finite number/);
      assert.throws(() => validateIntakeQuantity(-5), /strictly positive finite number/);
      assert.throws(() => validateIntakeQuantity(NaN), /strictly positive finite number/);
      assert.throws(() => validateIntakeQuantity(Infinity), /strictly positive finite number/);
      assert.throws(() => validateIntakeQuantity('100'), /strictly positive finite number/);
      assert.throws(() => validateIntakeQuantity(null), /strictly positive finite number/);
    });

    it('initializes a structured session with default meal buckets for the requested days', () => {
      const session1 = createNewRecallSession({ targetDays: 1, startDate: '2026-11-08' });
      assert.equal(session1.targetDays, 1);
      assert.equal(session1.days.length, 1);
      assert.equal(session1.days[0].meals.length, 4);
      assert.equal(session1.days[0].meals[0].mealType, 'breakfast');

      const session3 = createNewRecallSession({ targetDays: 3, startDate: '2026-11-08' });
      assert.equal(session3.targetDays, 3);
      assert.equal(session3.days.length, 3);
      assert.equal(session3.days[0].dayIndex, 1);
      assert.equal(session3.days[2].dayIndex, 3);
    });
  });

  describe('2. Food Selection & Portion Resolution', () => {
    it('resolves an entry with a verified household portion', () => {
      const bread = getFoodItemById('food_bread_baladi_baked')!;
      assert.ok(bread);

      // Half loaf portion (~70g)
      const portion = bread.portions.find((p) => p.id === 'portion_baladi_half_loaf')!;
      assert.ok(portion);

      const entry = resolveRecallEntry({
        food: bread,
        selectedPortionId: 'portion_baladi_half_loaf',
        quantity: 1, // 1x half loaf = 70g
      });

      assert.equal(entry.foodId, 'food_bread_baladi_baked');
      assert.equal(entry.resolvedGramWeight, 70.0);
      assert.equal(entry.isDirectGrams, false);
      assert.equal(entry.nutrients.caloriesKcal, 176.4); // 252 * 0.7 = 176.4
      assert.equal(entry.nutrients.carbsG, 36.96); // 52.8 * 0.7 = 36.96
      assert.equal(entry.nutrients.proteinG, 6.37); // 9.1 * 0.7 = 6.37
    });

    it('resolves an entry using direct gram input', () => {
      const chicken = getFoodItemById('food_chicken_breast_grilled_skinless')!;
      assert.ok(chicken);

      const entry = resolveRecallEntry({
        food: chicken,
        selectedPortionId: 'grams',
        quantity: 150, // 150 grams
      });

      assert.equal(entry.isDirectGrams, true);
      assert.equal(entry.resolvedGramWeight, 150.0);
      assert.equal(entry.nutrients.proteinG, 46.53); // 31.02 * 1.5 = 46.53
      assert.equal(entry.nutrients.caloriesKcal, 247.5); // 165 * 1.5 = 247.5
    });

    it('throws when referencing a non-existent portion ID', () => {
      const apple = getFoodItemById('food_apple_raw_skin')!;
      assert.throws(
        () =>
          resolveRecallEntry({
            food: apple,
            selectedPortionId: 'invalid_portion_id_999',
            quantity: 1,
          }),
        /Portion with ID "invalid_portion_id_999" not found/
      );
    });

    it('supports custom food creation and isolates it from standard records', () => {
      clearCustomFoodsForTesting();

      const custom = registerCustomFoodItem({
        code: 'CLINIC-SHAKE-01',
        nameEn: 'Clinic Whey Protein Shake',
        nameAr: 'مخفوق بروتين مصل اللبن',
        foodGroupId: 'dairy',
        primaryExchangeCategoryId: 'meat_lean',
        preparationState: 'raw',
        nutrients100g: {
          basisWeightG: 100,
          caloriesKcal: 80,
          proteinG: 16,
          fatG: 1,
          carbsG: 2,
          fiberG: 0,
          saturatedFatG: null,
          transFatG: null,
          monounsaturatedFatG: null,
          polyunsaturatedFatG: null,
          cholesterolMg: null,
          sodiumMg: 50,
          potassiumMg: 120,
          calciumMg: 100,
          ironMg: 0.2,
          missingNutrientKeys: ['monounsaturatedFatG', 'polyunsaturatedFatG'],
        },
        portions: [
          {
            id: 'portion_shake_bottle',
            portionNameEn: '1 Bottle (250ml / 250g)',
            portionNameAr: 'عبوة واحدة (250 جم)',
            householdMeasureEn: '1 Bottle (250ml / 250g)',
            householdMeasureAr: 'عبوة واحدة (250 جم)',
            gramWeight: 250,
            exchangeCategory: 'meat_lean',
            exchangeEquivalentFactor: 2,
            isDefaultServing: true,
          },
        ],
        tags: ['custom', 'protein shake'],
      });

      assert.equal(custom.isCustom, true);
      assert.equal(custom.verificationStatus, 'user_custom');

      const entry = resolveRecallEntry({
        food: custom,
        selectedPortionId: 'portion_shake_bottle',
        quantity: 1,
      });

      assert.equal(entry.isCustomFood, true);
      assert.equal(entry.resolvedGramWeight, 250.0);
      assert.equal(entry.nutrients.proteinG, 40.0); // 16 * 2.5
      assert.equal(entry.nutrients.caloriesKcal, 200.0); // 80 * 2.5
    });
  });

  describe('3. Deterministic Nutrient Calculations & Aggregation', () => {
    it('aggregates entries across a meal without forced zero imputation for missing nutrients', () => {
      const rice = getFoodItemById('food_rice_white_cooked')!;
      const oliveOil = getFoodItemById('food_oil_olive_extra_virgin')!;

      // Cooked rice: 150g (USDA: fiber 0.4g/100g, sodium 0)
      const riceEntry = resolveRecallEntry({
        food: rice,
        quantity: 150,
        selectedPortionId: 'grams',
      });

      // Olive oil: 10g (USDA: fiber 0, sodium 2mg)
      const oilEntry = resolveRecallEntry({
        food: oliveOil,
        quantity: 10,
        selectedPortionId: 'grams',
      });

      const summary = aggregateRecallEntries([riceEntry, oilEntry]);

      // Calories: rice 130 * 1.5 = 195 kcal; olive oil 884 * 0.1 = 88.4 kcal. Total = 283.4 kcal
      assert.equal(summary.caloriesKcal.observedTotal, 283.4);
      assert.equal(summary.caloriesKcal.isComplete, true);
      assert.equal(summary.caloriesKcal.knownEntriesCount, 2);
      assert.equal(summary.caloriesKcal.missingEntriesCount, 0);

      // Carbs: rice 28.17 * 1.5 = 42.26g; olive oil 0. Total = 42.26g
      assert.equal(summary.carbsG.observedTotal, 42.26);
    });

    it('marks completeTotal as null when an entry has null for a nutrient', () => {
      // Mock an entry with null sodium (e.g. unassayed laboratory item)
      const bread = getFoodItemById('food_bread_baladi_baked')!;
      const breadEntry = resolveRecallEntry({
        food: bread,
        quantity: 100,
        selectedPortionId: 'grams',
      });

      // Create an entry where sodium is null
      const unassayedEntry: RecallEntry = {
        ...breadEntry,
        id: 'mock_unassayed_entry',
        nutrients: {
          ...breadEntry.nutrients,
          sodiumMg: null,
        },
      };

      const summary = aggregateRecallEntries([breadEntry, unassayedEntry]);

      // Bread has 490mg sodium per 100g
      assert.equal(summary.sodiumMg.observedTotal, 490.0); // sum of known values
      assert.equal(summary.sodiumMg.completeTotal, null); // incomplete assay
      assert.equal(summary.sodiumMg.isComplete, false);
      assert.equal(summary.sodiumMg.knownEntriesCount, 1);
      assert.equal(summary.sodiumMg.missingEntriesCount, 1);
      assert.equal(summary.hasIncompleteNutrients, true);
    });

    it('aggregates day meals correctly and preserves total entries count', () => {
      const apple = getFoodItemById('food_apple_raw_skin')!;
      const egg = getFoodItemById('food_egg_whole_boiled')!;

      const appleEntry = resolveRecallEntry({
        food: apple,
        quantity: 100,
        selectedPortionId: 'grams',
      });

      const eggEntry = resolveRecallEntry({
        food: egg,
        quantity: 50, // 1 large egg
        selectedPortionId: 'grams',
      });

      const day: RecallDay = {
        id: 'test_day_1',
        dayIndex: 1,
        date: '2026-11-08',
        meals: [
          {
            id: 'm1',
            mealType: 'breakfast',
            entries: [eggEntry],
          },
          {
            id: 'm2',
            mealType: 'morning_snack',
            entries: [appleEntry],
          },
        ],
      };

      const daySummary = calculateDayNutrientSummary(day);
      assert.equal(daySummary.totalEntriesCount, 2);

      // Egg 50g = 77.5 kcal, 6.29g protein; Apple 100g = 52 kcal, 0.26g protein
      // Total calories = 129.5 kcal
      assert.equal(daySummary.caloriesKcal.observedTotal, 129.5);
      // Total protein = 6.29 + 0.26 = 6.55g
      assert.equal(daySummary.proteinG.observedTotal, 6.55);
    });
  });

  describe('4. Multi-Day Recall Analysis & Averaging', () => {
    it('computes exact 1-day average matching the single recorded day', () => {
      const egg = getFoodItemById('food_egg_whole_boiled')!;
      const entry = resolveRecallEntry({ food: egg, quantity: 100, selectedPortionId: 'grams' });

      const session: RecallSession = {
        id: 's1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        targetDays: 1,
        status: 'completed',
        days: [
          {
            id: 'd1',
            dayIndex: 1,
            date: '2026-11-08',
            meals: [{ id: 'm1', mealType: 'breakfast', entries: [entry] }],
          },
        ],
      };

      const analysis = calculateMultiDayRecallAnalysis(session);
      assert.equal(analysis.recordedDaysCount, 1);
      assert.equal(analysis.sessionTargetDays, 1);
      assert.equal(analysis.averages.caloriesKcal.denominator, 1);
      assert.equal(analysis.averages.caloriesKcal.observedAverage, 155.0);
      assert.equal(analysis.averages.caloriesKcal.averageValue, 155.0);
    });

    it('computes exact 2-day average with accurate denominator and no zero-day imputation', () => {
      const bread = getFoodItemById('food_bread_baladi_baked')!; // 252 kcal/100g
      const entryDay1 = resolveRecallEntry({ food: bread, quantity: 100, selectedPortionId: 'grams' }); // 252 kcal
      const entryDay2 = resolveRecallEntry({ food: bread, quantity: 200, selectedPortionId: 'grams' }); // 504 kcal

      const session: RecallSession = {
        id: 's2',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        targetDays: 2,
        status: 'completed',
        days: [
          {
            id: 'd1',
            dayIndex: 1,
            date: '2026-11-07',
            meals: [{ id: 'm1', mealType: 'lunch', entries: [entryDay1] }],
          },
          {
            id: 'd2',
            dayIndex: 2,
            date: '2026-11-08',
            meals: [{ id: 'm2', mealType: 'lunch', entries: [entryDay2] }],
          },
        ],
      };

      const analysis = calculateMultiDayRecallAnalysis(session);
      assert.equal(analysis.recordedDaysCount, 2);
      assert.equal(analysis.averages.caloriesKcal.denominator, 2);
      // (252 + 504) / 2 = 756 / 2 = 378 kcal
      assert.equal(analysis.averages.caloriesKcal.observedAverage, 378.0);
      assert.equal(analysis.averages.caloriesKcal.averageValue, 378.0);
      assert.equal(analysis.averages.caloriesKcal.completeDaysCount, 2);
    });

    it('handles incomplete days in multi-day averaging without fabricating complete averages', () => {
      const bread = getFoodItemById('food_bread_baladi_baked')!;
      const entry = resolveRecallEntry({ food: bread, quantity: 100, selectedPortionId: 'grams' });

      const unassayedSodiumEntry: RecallEntry = {
        ...entry,
        id: 'unassayed_d2',
        nutrients: { ...entry.nutrients, sodiumMg: null },
      };

      const session: RecallSession = {
        id: 's3',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        targetDays: 2,
        status: 'in_progress',
        days: [
          {
            id: 'd1',
            dayIndex: 1,
            date: '2026-11-07',
            meals: [{ id: 'm1', mealType: 'lunch', entries: [entry] }], // sodium 520mg (complete)
          },
          {
            id: 'd2',
            dayIndex: 2,
            date: '2026-11-08',
            meals: [{ id: 'm2', mealType: 'lunch', entries: [unassayedSodiumEntry] }], // sodium null (incomplete)
          },
        ],
      };

      const analysis = calculateMultiDayRecallAnalysis(session);
      // Day 1 has 490mg sodium, Day 2 has 0 observed sodium. Denominator = 2. Observed avg = 245mg
      assert.equal(analysis.averages.sodiumMg.observedAverage, 245.0);
      // averageValue MUST be null because Day 2 had incomplete sodium data
      assert.equal(analysis.averages.sodiumMg.averageValue, null);
      assert.equal(analysis.averages.sodiumMg.isComplete, false);
      assert.equal(analysis.averages.sodiumMg.completeDaysCount, 1);
    });
  });

  describe('5. Phase 1 Target Comparison & Boundaries', () => {
    it('compares actual intake against Phase 1 targets without recalculating them', () => {
      const targets: Phase1TargetInputs = {
        targetCalories: 2000,
        targetProteinG: 120,
        targetCarbsG: 220,
        targetFatG: 65,
      };

      // Mock actual averages
      const actualAverages = {
        caloriesKcal: { observedAverage: 1800 } as any,
        proteinG: { observedAverage: 130 } as any,
        carbsG: { observedAverage: 200 } as any,
        fatG: { observedAverage: 65 } as any,
      };

      const comparisons = compareIntakeWithPhase1Targets({ actualAverages, targets });
      assert.equal(comparisons.length, 4);

      // Energy: 1800 / 2000 = 90% (achieved range 90-110%)
      const energyComp = comparisons.find((c) => c.metric === 'energy')!;
      assert.equal(energyComp.actualIntake, 1800);
      assert.equal(energyComp.targetValue, 2000);
      assert.equal(energyComp.difference, -200);
      assert.equal(energyComp.percentAchieved, 90.0);
      assert.equal(energyComp.status, 'achieved');

      // Protein: 130 / 120 = 108.3% (achieved range)
      const proComp = comparisons.find((c) => c.metric === 'protein')!;
      assert.equal(proComp.percentAchieved, 108.3);

      // Carbs: 200 / 220 = 90.9% (achieved)
      const carbComp = comparisons.find((c) => c.metric === 'carbs')!;
      assert.equal(carbComp.percentAchieved, 90.9);

      // Fat: 65 / 65 = 100% (achieved)
      const fatComp = comparisons.find((c) => c.metric === 'fat')!;
      assert.equal(fatComp.percentAchieved, 100.0);
    });

    it('gracefully handles missing Phase 1 targets with target_unavailable status', () => {
      const comparisons = compareIntakeWithPhase1Targets({
        actualAverages: { caloriesKcal: { observedAverage: 1500 } as any },
        targets: {
          targetCalories: null, // target not available
          targetProteinG: undefined,
        },
      });

      const energyComp = comparisons.find((c) => c.metric === 'energy')!;
      assert.equal(energyComp.status, 'target_unavailable');
      assert.equal(energyComp.targetValue, null);
      assert.equal(energyComp.percentAchieved, null);
      assert.ok(energyComp.clinicalNoteEn?.includes('unavailable'));
    });
  });

  describe('6. Clinical Warnings & Data Completeness Reporting', () => {
    it('generates warnings for empty days, custom foods, and incomplete assays', () => {
      const session = createNewRecallSession({ targetDays: 2, startDate: '2026-11-08' });

      // Session with 0 entries in Day 1 and Day 2, and missing Phase 1 targets
      const warnings = generateRecallSessionWarnings(session, {});

      // Must have missing Phase 1 target warning
      assert.ok(warnings.some((w) => w.id === 'warn_target_unavailable'));
      // Must have empty day warnings
      assert.ok(warnings.some((w) => w.id.startsWith('warn_empty_day_')));
    });

    it('identifies unassayed sodium items in warning list', () => {
      const egg = getFoodItemById('food_egg_whole_boiled')!;
      const entry = resolveRecallEntry({ food: egg, quantity: 50, selectedPortionId: 'grams' });
      const unassayedSodiumEntry: RecallEntry = {
        ...entry,
        nutrients: { ...entry.nutrients, sodiumMg: null },
      };

      const session: RecallSession = {
        id: 's_warn',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        targetDays: 1,
        status: 'in_progress',
        days: [
          {
            id: 'd1_warn',
            dayIndex: 1,
            date: '2026-11-08',
            meals: [{ id: 'm1', mealType: 'breakfast', entries: [unassayedSodiumEntry] }],
          },
        ],
      };

      const warnings = generateRecallSessionWarnings(session, { targetCalories: 2000 });
      assert.ok(warnings.some((w) => w.id.startsWith('warn_incomplete_sodium_')));
    });

    it('marks potassiumMg, ironMg, fiberG, and sodiumMg as incomplete in mixed assays without fabricating complete totals', () => {
      const peanuts = getFoodItemById('food_fat_rp_ft_082')!; // USDA complete FDC record with fiber & sodium; verify missing K/Fe or add mixed entry
      const bread = getFoodItemById('food_bread_baladi_baked')!;

      const completeMicroEntry = resolveRecallEntry({
        food: bread,
        selectedPortionId: 'grams',
        quantity: 100,
      });
      // Synthesize a fully assayed item vs unassayed item (e.g. RegimePlan item missing K, Fe, fiber, sodium)
      const completeEntry: RecallEntry = {
        ...completeMicroEntry,
        id: 'complete_micro',
        nutrients: {
          ...completeMicroEntry.nutrients,
          potassiumMg: 120,
          ironMg: 1.5,
          fiberG: 4.8,
          sodiumMg: 490,
        },
      };
      const peanutsEntry = resolveRecallEntry({
        food: peanuts,
        selectedPortionId: peanuts.portions[0].id,
        quantity: 2, // 20g -> 113.4 kcal, 5.16g P, 3.22g C, 9.84g F, K/Fe null
      });

      assert.equal(peanutsEntry.nutrients.potassiumMg, null);
      assert.equal(peanutsEntry.nutrients.ironMg, null);

      const summary = aggregateRecallEntries([completeEntry, peanutsEntry]);
      assert.equal(summary.hasIncompleteNutrients, true);
      assert.equal(summary.potassiumMg.isComplete, false);
      assert.equal(summary.potassiumMg.completeTotal, null);
      assert.equal(summary.potassiumMg.observedTotal, 120);
      assert.equal(summary.ironMg.isComplete, false);
      assert.equal(summary.ironMg.completeTotal, null);
      assert.equal(summary.ironMg.observedTotal, 1.5);
      assert.equal(summary.fiberG.isComplete, true);
      assert.equal(summary.sodiumMg.isComplete, true);

      const session: RecallSession = {
        id: 's_mixed_micro',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        targetDays: 1,
        status: 'in_progress',
        days: [
          {
            id: 'd1_micro',
            dayIndex: 1,
            date: '2026-11-10',
            meals: [{ id: 'm1', mealType: 'snack' as any, entries: [completeEntry, peanutsEntry] }],
          },
        ],
      };

      const multi = calculateMultiDayRecallAnalysis(session);
      assert.equal(multi.averages.potassiumMg.isComplete, false);
      assert.equal(multi.averages.potassiumMg.averageValue, null);
      assert.equal(multi.averages.ironMg.isComplete, false);
      assert.equal(multi.averages.ironMg.averageValue, null);
    });
  });
});

