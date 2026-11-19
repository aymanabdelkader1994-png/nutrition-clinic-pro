/**
 * Nutrition Clinic Pro - 24-Hour Dietary Recall Test Suite
 * Phase 3 Automated Verification
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RecallWorkbench } from '../src/components/recall/RecallWorkbench';

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
      // Day 1 has 490mg sodium, Day 2 has null sodium (unknown). Unknown day MUST NOT enter numerator or denominator.
      assert.equal(analysis.averages.sodiumMg.totalRecordedDays, 2);
      assert.equal(analysis.averages.sodiumMg.denominator, 1);
      assert.equal(analysis.averages.sodiumMg.observedAverage, 490.0);
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
        caloriesKcal: { observedAverage: 1800, isComplete: true, totalRecordedDays: 1 } as any,
        proteinG: { observedAverage: 130, isComplete: true, totalRecordedDays: 1 } as any,
        carbsG: { observedAverage: 200, isComplete: true, totalRecordedDays: 1 } as any,
        fatG: { observedAverage: 65, isComplete: true, totalRecordedDays: 1 } as any,
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
        actualAverages: { caloriesKcal: { observedAverage: 1500, isComplete: true, totalRecordedDays: 1 } as any },
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

    it('Blocker A: withholds under/achieved/over, difference, and % target when intake is incomplete or 0 days recorded', () => {
      const targets: Phase1TargetInputs = {
        targetCalories: 2000,
        targetProteinG: 120,
        targetCarbsG: 220,
        targetFatG: 65,
      };

      // Case 1: Incomplete intake (e.g., mixed with exchange_only item)
      const incompleteComps = compareIntakeWithPhase1Targets({
        actualAverages: {
          caloriesKcal: { observedAverage: 1850, isComplete: false, totalRecordedDays: 1 } as any,
          proteinG: { observedAverage: 110, isComplete: false, totalRecordedDays: 1 } as any,
          carbsG: { observedAverage: 190, isComplete: false, totalRecordedDays: 1 } as any,
          fatG: { observedAverage: 60, isComplete: false, totalRecordedDays: 1 } as any,
        },
        targets,
      });
      for (const comp of incompleteComps) {
        assert.equal(comp.status, 'incomplete_intake');
        assert.equal(comp.isActualIncomplete, true);
        assert.equal(comp.difference, null);
        assert.equal(comp.percentAchieved, null);
      }

      // Case 2: Zero recorded days (empty session)
      const emptySession = createNewRecallSession({ targetDays: 3, startDate: '2026-11-08' });
      const emptyAnalysis = calculateMultiDayRecallAnalysis(emptySession);
      assert.equal(emptyAnalysis.recordedDaysCount, 0);
      assert.equal(emptyAnalysis.averages.caloriesKcal.denominator, 0);
      assert.equal(emptyAnalysis.averages.caloriesKcal.isComplete, false);
      assert.equal(emptyAnalysis.averages.caloriesKcal.averageValue, null);
      assert.equal(emptyAnalysis.averages.caloriesKcal.observedAverage, null);

      const zeroDayComps = compareIntakeWithPhase1Targets({
        actualAverages: emptyAnalysis.averages,
        targets,
      });
      for (const comp of zeroDayComps) {
        assert.equal(comp.status, 'incomplete_intake');
        assert.equal(comp.actualIntake, null);
        assert.equal(comp.isActualIncomplete, true);
        assert.equal(comp.difference, null);
        assert.equal(comp.percentAchieved, null);
      }
    });

    it('Blocker B: excludes empty unrecorded days from recordedDaysCount, denominator, completeDaysCount, and multi-day averages', () => {
      const bread = getFoodItemById('food_bread_baladi_baked')!; // 252 kcal/100g
      const entryDay1 = resolveRecallEntry({ food: bread, quantity: 100, selectedPortionId: 'grams' }); // 252 kcal

      const session = createNewRecallSession({ targetDays: 3, startDate: '2026-11-10' });
      session.days[0].meals[0].entries.push(entryDay1);
      // Day 2 and Day 3 intentionally remain empty (0 entries)

      const analysis = calculateMultiDayRecallAnalysis(session);
      assert.equal(analysis.sessionTargetDays, 3);
      assert.equal(analysis.recordedDaysCount, 1);
      assert.equal(analysis.isSessionComplete, false);
      assert.equal(analysis.averages.caloriesKcal.denominator, 1);
      assert.equal(analysis.averages.caloriesKcal.totalRecordedDays, 1);
      assert.equal(analysis.averages.caloriesKcal.completeDaysCount, 1);
      assert.equal(analysis.averages.caloriesKcal.isComplete, true);
      assert.equal(analysis.averages.caloriesKcal.observedAverage, 252.0);
      assert.equal(analysis.averages.caloriesKcal.averageValue, 252.0);
    });

    it('Issue A regression suite: handles all empty days, partial 3-day sessions, valid zero nutrients, and target comparisons', () => {
      const targets: Phase1TargetInputs = {
        targetCalories: 1000,
        targetProteinG: 50,
        targetCarbsG: 120,
        targetFatG: 30,
      };

      // Scenario 1: All days empty (1-day & 3-day) -> observedAverage & actualIntake MUST be null (not 0)
      for (const daysCount of [1, 3] as const) {
        const empty = createNewRecallSession({ targetDays: daysCount, startDate: '2026-11-15' });
        const analysis = calculateMultiDayRecallAnalysis(empty);
        assert.equal(analysis.sessionTargetDays, daysCount);
        assert.equal(analysis.recordedDaysCount, 0);
        assert.equal(analysis.isSessionComplete, false);
        assert.equal(analysis.dailySummaries.length, daysCount);
        assert.ok(analysis.dailySummaries.every((d) => d.summary.totalEntriesCount === 0));
        for (const item of Object.values(analysis.averages)) {
          assert.equal(item.denominator, 0);
          assert.equal(item.observedAverage, null);
          assert.equal(item.averageValue, null);
          assert.equal(item.isComplete, false);
        }
        const comps = compareIntakeWithPhase1Targets({ actualAverages: analysis.averages, targets });
        for (const c of comps) {
          assert.equal(c.actualIntake, null);
          assert.equal(c.status, 'incomplete_intake');
          assert.equal(c.difference, null);
          assert.equal(c.percentAchieved, null);
        }
        const noTargetComps = compareIntakeWithPhase1Targets({ actualAverages: analysis.averages, targets: {} });
        for (const c of noTargetComps) {
          assert.equal(c.actualIntake, null);
          assert.equal(c.status, 'target_unavailable');
        }
      }

      // Scenario 2 & 3: 2 recorded days + 1 empty day in a 3-day session -> denominator 2, not 3
      const bread = getFoodItemById('food_bread_baladi_baked')!; // 252 kcal, 52.8C, 9.1P, 1.2F per 100g
      const session2of3 = createNewRecallSession({ targetDays: 3, startDate: '2026-11-15' });
      session2of3.days[0].meals[0].entries.push(resolveRecallEntry({ food: bread, quantity: 100, selectedPortionId: 'grams' }));
      session2of3.days[2].meals[1].entries.push(resolveRecallEntry({ food: bread, quantity: 200, selectedPortionId: 'grams' }));
      // Day 2 remains empty
      const analysis2of3 = calculateMultiDayRecallAnalysis(session2of3);
      assert.equal(analysis2of3.sessionTargetDays, 3);
      assert.equal(analysis2of3.recordedDaysCount, 2);
      assert.equal(analysis2of3.isSessionComplete, false);
      assert.equal(analysis2of3.dailySummaries[1].summary.totalEntriesCount, 0);
      assert.equal(analysis2of3.averages.caloriesKcal.denominator, 2);
      assert.equal(analysis2of3.averages.caloriesKcal.observedAverage, 378.0);
      assert.equal(analysis2of3.averages.caloriesKcal.averageValue, 378.0);

      // Scenario 4: Valid 0 nutrient observation on a recorded day MUST remain 0 (not null)
      const karkadeh = getFoodItemById('food_hibiscus_tea_karkadeh')!; // 0 kcal, 0C, 0P, 0F, 0 fiber
      const oil = getFoodItemById('food_oil_olive_extra_virgin')!; // 884 kcal, 0C, 0P, 100F, 0 fiber
      const zeroObsSession = createNewRecallSession({ targetDays: 3, startDate: '2026-11-15' });
      zeroObsSession.days[0].meals[0].entries.push(resolveRecallEntry({ food: karkadeh, quantity: 200, selectedPortionId: 'grams' }));
      zeroObsSession.days[0].meals[1].entries.push(resolveRecallEntry({ food: oil, quantity: 10, selectedPortionId: 'grams' }));
      const zeroObsAnalysis = calculateMultiDayRecallAnalysis(zeroObsSession);
      assert.equal(zeroObsAnalysis.recordedDaysCount, 1);
      assert.equal(zeroObsAnalysis.averages.carbsG.observedAverage, 0);
      assert.equal(zeroObsAnalysis.averages.carbsG.averageValue, 0);
      assert.equal(zeroObsAnalysis.averages.carbsG.isComplete, true);
      assert.equal(zeroObsAnalysis.averages.proteinG.observedAverage, 0);
      assert.equal(zeroObsAnalysis.averages.proteinG.averageValue, 0);
      assert.equal(zeroObsAnalysis.averages.fiberG.observedAverage, 0);
      assert.equal(zeroObsAnalysis.averages.fiberG.averageValue, 0);
      assert.equal(zeroObsAnalysis.averages.caloriesKcal.observedAverage, 88.4);

      // Scenario 5 & 6: Incomplete day (exchange_only) -> unknown day excluded from numerator/denominator, averageValue null, target comparison withheld
      const fino = getFoodItemById('food_starch_rp_rp_st_007')!; // exchange_only
      const mixedSession = createNewRecallSession({ targetDays: 2, startDate: '2026-11-15' });
      mixedSession.days[0].meals[0].entries.push(resolveRecallEntry({ food: bread, quantity: 100, selectedPortionId: 'grams' }));
      mixedSession.days[1].meals[0].entries.push(resolveRecallEntry({ food: fino, selectedPortionId: fino.portions[0].id, quantity: 1 }));
      const mixedAnalysis = calculateMultiDayRecallAnalysis(mixedSession);
      assert.equal(mixedAnalysis.recordedDaysCount, 2);
      assert.equal(mixedAnalysis.averages.caloriesKcal.totalRecordedDays, 2);
      assert.equal(mixedAnalysis.averages.caloriesKcal.denominator, 1);
      assert.equal(mixedAnalysis.averages.caloriesKcal.isComplete, false);
      assert.equal(mixedAnalysis.averages.caloriesKcal.averageValue, null);
      assert.equal(mixedAnalysis.averages.caloriesKcal.observedAverage, 252.0); // Day 2 unknown excluded from numerator and denominator
      const incompleteTargetComps = compareIntakeWithPhase1Targets({ actualAverages: mixedAnalysis.averages, targets });
      const energyInc = incompleteTargetComps.find((c) => c.metric === 'energy')!;
      assert.equal(energyInc.status, 'incomplete_intake');
      assert.equal(energyInc.actualIntake, 252.0);
      assert.equal(energyInc.difference, null);
      assert.equal(energyInc.percentAchieved, null);

      // Scenario 7: Complete intake vs Phase 1 targets -> exact comparison classification
      const completeSession = createNewRecallSession({ targetDays: 1, startDate: '2026-11-15' });
      completeSession.days[0].meals[0].entries.push(resolveRecallEntry({ food: bread, quantity: 400, selectedPortionId: 'grams' })); // 1008 kcal, 36.4P, 211.2C, 4.8F
      const completeAnalysis = calculateMultiDayRecallAnalysis(completeSession);
      const completeComps = compareIntakeWithPhase1Targets({ actualAverages: completeAnalysis.averages, targets });
      const energyDone = completeComps.find((c) => c.metric === 'energy')!;
      assert.equal(energyDone.actualIntake, 1008.0);
      assert.equal(energyDone.status, 'achieved');
      assert.equal(energyDone.difference, 8.0);
      assert.equal(energyDone.percentAchieved, 100.8);
      const carbsOver = completeComps.find((c) => c.metric === 'carbs')!;
      assert.equal(carbsOver.status, 'over');
      const proteinUnder = completeComps.find((c) => c.metric === 'protein')!;
      assert.equal(proteinUnder.status, 'under');
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
      const peanuts = getFoodItemById('food_fat_rp_ft_082')!;
      const bread = getFoodItemById('food_bread_baladi_baked')!;

      // Verify RP-FT-082 now carries full USDA SR Legacy potassium & iron assays
      assert.equal(peanuts.nutrients100g.potassiumMg, 705);
      assert.equal(peanuts.nutrients100g.ironMg, 4.58);

      const unassayedMicroFood = {
        ...peanuts,
        id: 'synthetic_unassayed_micro_food',
        nutrients100g: {
          ...peanuts.nutrients100g,
          potassiumMg: null,
          ironMg: null,
          missingNutrientKeys: [
            ...peanuts.nutrients100g.missingNutrientKeys,
            'potassiumMg',
            'ironMg',
          ],
        },
      };

      const completeMicroEntry = resolveRecallEntry({
        food: bread,
        selectedPortionId: 'grams',
        quantity: 100,
      });
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
      const partialMicroEntry = resolveRecallEntry({
        food: unassayedMicroFood,
        selectedPortionId: unassayedMicroFood.portions[0].id,
        quantity: 2, // 20g -> fiber & sodium present, K/Fe null
      });

      assert.equal(partialMicroEntry.nutrients.potassiumMg, null);
      assert.equal(partialMicroEntry.nutrients.ironMg, null);

      const summary = aggregateRecallEntries([completeEntry, partialMicroEntry]);
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
            meals: [{ id: 'm1', mealType: 'snack' as any, entries: [completeEntry, partialMicroEntry] }],
          },
        ],
      };

      const multi = calculateMultiDayRecallAnalysis(session);
      assert.equal(multi.averages.potassiumMg.isComplete, false);
      assert.equal(multi.averages.potassiumMg.averageValue, null);
      assert.equal(multi.averages.ironMg.isComplete, false);
      assert.equal(multi.averages.ironMg.averageValue, null);
    });

    it('propagates incomplete macro state cleanly when a recall session includes exchange_only foods', () => {
      const chickenBreast = getFoodItemById('food_meat_rp_mt_013')!; // USDA 05062
      const finoBread = getFoodItemById('food_starch_rp_rp_st_007')!; // exchange_only

      const chickenEntry = resolveRecallEntry({
        food: chickenBreast,
        selectedPortionId: 'grams',
        quantity: 100,
      });
      const finoEntry = resolveRecallEntry({
        food: finoBread,
        selectedPortionId: finoBread.portions[0].id,
        quantity: 1,
      });

      assert.equal(finoEntry.nutrients.caloriesKcal, null);
      assert.equal(finoEntry.nutrients.proteinG, null);
      assert.equal(finoEntry.nutrients.carbsG, null);
      assert.equal(finoEntry.nutrients.fatG, null);

      const summary = aggregateRecallEntries([chickenEntry, finoEntry]);
      assert.equal(summary.caloriesKcal.observedTotal, chickenEntry.nutrients.caloriesKcal);
      assert.equal(summary.caloriesKcal.completeTotal, null);
      assert.equal(summary.caloriesKcal.isComplete, false);
      assert.equal(summary.proteinG.completeTotal, null);
      assert.equal(summary.proteinG.isComplete, false);
      assert.equal(summary.carbsG.completeTotal, null);
      assert.equal(summary.carbsG.isComplete, false);
      assert.equal(summary.fatG.completeTotal, null);
      assert.equal(summary.fatG.isComplete, false);
      assert.equal(summary.hasIncompleteNutrients, true);

      const session: RecallSession = {
        id: 's_ex_only_mix',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        targetDays: 1,
        status: 'in_progress',
        days: [
          {
            id: 'd1_ex_mix',
            dayIndex: 1,
            date: '2026-11-12',
            meals: [{ id: 'm1', mealType: 'lunch', entries: [chickenEntry, finoEntry] }],
          },
        ],
      };

      const analysis = calculateMultiDayRecallAnalysis(session);
      assert.equal(analysis.averages.caloriesKcal.isComplete, false);
      assert.equal(analysis.averages.caloriesKcal.averageValue, null);
      assert.equal(analysis.averages.caloriesKcal.observedAverage, chickenEntry.nutrients.caloriesKcal);

      const comparisons = compareIntakeWithPhase1Targets({
        actualAverages: analysis.averages,
        targets: { targetCalories: 2000, targetProteinG: 120, targetCarbsG: 220, targetFatG: 65 },
      });
      assert.equal(comparisons.every((c) => c.isActualIncomplete === true), true);
      assert.equal(comparisons.every((c) => c.status === 'incomplete_intake'), true);
      assert.equal(comparisons.every((c) => c.difference === null && c.percentAchieved === null), true);

      const warnings = generateRecallSessionWarnings(session, { targetCalories: 2000 });
      assert.ok(warnings.some((w) => w.id === 'warn_incomplete_macros_d1_ex_mix'));
    });
  });

  describe('7. Root-Cause Null-Safety Regression Suite (Cases 1-6)', () => {
    const targets: Phase1TargetInputs = {
      targetCalories: 2000,
      targetProteinG: 100,
      targetCarbsG: 250,
      targetFatG: 65,
    };

    it('Case 1: entire day contains only exchange_only entries -> all observed totals and averages are null, never zero', () => {
      const fino = getFoodItemById('food_starch_rp_rp_st_007')!; // exchange_only
      const koshari = getFoodItemById('food_occ_rp_occ_001') || fino; // exchange_only
      const entry1 = resolveRecallEntry({ food: fino, selectedPortionId: fino.portions[0].id, quantity: 1 });
      const entry2 = resolveRecallEntry({ food: koshari, selectedPortionId: koshari.portions[0].id, quantity: 1 });

      const summary = aggregateRecallEntries([entry1, entry2]);
      assert.equal(summary.totalEntriesCount, 2);
      assert.equal(summary.hasIncompleteNutrients, true);

      const nutrientKeys = [
        'caloriesKcal',
        'proteinG',
        'carbsG',
        'availableCarbsG',
        'fatG',
        'fiberG',
        'saturatedFatG',
        'sodiumMg',
        'potassiumMg',
        'calciumMg',
        'ironMg',
      ] as const;

      for (const key of nutrientKeys) {
        assert.equal(summary[key].knownEntriesCount, 0, `${key} knownEntriesCount must be 0`);
        assert.equal(summary[key].missingEntriesCount, 2, `${key} missingEntriesCount must be 2`);
        assert.equal(summary[key].observedTotal, null, `${key} observedTotal must be null, not 0`);
        assert.equal(summary[key].completeTotal, null, `${key} completeTotal must be null`);
        assert.equal(summary[key].isComplete, false, `${key} isComplete must be false`);
      }

      const session = createNewRecallSession({ targetDays: 1, startDate: '2026-11-15' });
      session.days[0].meals[0].entries.push(entry1, entry2);
      const analysis = calculateMultiDayRecallAnalysis(session);
      assert.equal(analysis.recordedDaysCount, 1);
      for (const key of nutrientKeys) {
        assert.equal(analysis.averages[key].denominator, 0);
        assert.equal(analysis.averages[key].observedAverage, null);
        assert.equal(analysis.averages[key].averageValue, null);
        assert.equal(analysis.averages[key].isComplete, false);
      }

      const comps = compareIntakeWithPhase1Targets({ actualAverages: analysis.averages, targets });
      for (const c of comps) {
        assert.equal(c.actualIntake, null);
        assert.equal(c.status, 'incomplete_intake');
        assert.equal(c.difference, null);
        assert.equal(c.percentAchieved, null);
      }
    });

    it('Case 2: multiple days with one analytical day and one exchange_only day -> unknown day does not contribute zero, result marked partial, target classification withheld', () => {
      const bread = getFoodItemById('food_bread_baladi_baked')!; // 252 kcal, 9.1P, 52.8C, 1.2F, 490mg Na per 100g
      const fino = getFoodItemById('food_starch_rp_rp_st_007')!; // exchange_only

      const session = createNewRecallSession({ targetDays: 2, startDate: '2026-11-15' });
      session.days[0].meals[0].entries.push(resolveRecallEntry({ food: bread, quantity: 100, selectedPortionId: 'grams' }));
      session.days[1].meals[0].entries.push(resolveRecallEntry({ food: fino, selectedPortionId: fino.portions[0].id, quantity: 1 }));

      const analysis = calculateMultiDayRecallAnalysis(session);
      assert.equal(analysis.recordedDaysCount, 2);
      assert.equal(analysis.averages.caloriesKcal.totalRecordedDays, 2);
      assert.equal(analysis.averages.caloriesKcal.denominator, 1);
      assert.equal(analysis.averages.caloriesKcal.completeDaysCount, 1);
      assert.equal(analysis.averages.caloriesKcal.observedAverage, 252.0);
      assert.equal(analysis.averages.caloriesKcal.averageValue, null);
      assert.equal(analysis.averages.caloriesKcal.isComplete, false);

      assert.equal(analysis.averages.proteinG.denominator, 1);
      assert.equal(analysis.averages.proteinG.observedAverage, 9.1);
      assert.equal(analysis.averages.proteinG.isComplete, false);

      assert.equal(analysis.averages.carbsG.denominator, 1);
      assert.equal(analysis.averages.carbsG.observedAverage, 52.8);
      assert.equal(analysis.averages.carbsG.isComplete, false);

      assert.equal(analysis.averages.fatG.denominator, 1);
      assert.equal(analysis.averages.fatG.observedAverage, 1.2);
      assert.equal(analysis.averages.fatG.isComplete, false);

      const comps = compareIntakeWithPhase1Targets({ actualAverages: analysis.averages, targets });
      for (const c of comps) {
        assert.equal(c.status, 'incomplete_intake');
        assert.equal(c.isActualIncomplete, true);
        assert.equal(c.difference, null);
        assert.equal(c.percentAchieved, null);
      }
    });

    it('Case 3: genuine analytical zero remains 0 (not null) in daily aggregation and multi-day averages', () => {
      const karkadeh = getFoodItemById('food_hibiscus_tea_karkadeh')!; // USDA 171946: 0 kcal, 0P, 0C, 0F, 0 fiber
      const teaEntry = resolveRecallEntry({ food: karkadeh, quantity: 250, selectedPortionId: 'grams' });

      const summary = aggregateRecallEntries([teaEntry]);
      assert.equal(summary.caloriesKcal.knownEntriesCount, 1);
      assert.equal(summary.caloriesKcal.observedTotal, 0);
      assert.equal(summary.caloriesKcal.completeTotal, 0);
      assert.equal(summary.caloriesKcal.isComplete, true);
      assert.equal(summary.proteinG.observedTotal, 0);
      assert.equal(summary.carbsG.observedTotal, 0);
      assert.equal(summary.fatG.observedTotal, 0);
      assert.equal(summary.fiberG.observedTotal, 0);

      // Single analytical zero day + second exchange_only day -> denominator 1, observedAverage 0 (preserved), isComplete false
      const fino = getFoodItemById('food_starch_rp_rp_st_007')!;
      const session = createNewRecallSession({ targetDays: 2, startDate: '2026-11-15' });
      session.days[0].meals[0].entries.push(teaEntry);
      session.days[1].meals[0].entries.push(resolveRecallEntry({ food: fino, selectedPortionId: fino.portions[0].id, quantity: 1 }));

      const analysis = calculateMultiDayRecallAnalysis(session);
      assert.equal(analysis.averages.caloriesKcal.denominator, 1);
      assert.equal(analysis.averages.caloriesKcal.observedAverage, 0);
      assert.equal(analysis.averages.caloriesKcal.averageValue, null);
      assert.equal(analysis.averages.caloriesKcal.isComplete, false);
    });

    it('Case 4: mixed analytical and exchange_only entries on the same day aggregate only analytical values and never treat exchange_only as analytical', () => {
      const chickenBreast = getFoodItemById('food_chicken_breast_grilled_skinless')!; // 165 kcal, 31.02P, 0C, 3.57F per 100g
      const fino = getFoodItemById('food_starch_rp_rp_st_007')!; // exchange_only

      const chickenEntry = resolveRecallEntry({ food: chickenBreast, quantity: 100, selectedPortionId: 'grams' });
      const finoEntry = resolveRecallEntry({ food: fino, selectedPortionId: fino.portions[0].id, quantity: 1 });
      // Even if a malformed caller injected numbers onto an exchange_only entry, engine ignores them
      const corruptedExchangeOnlyEntry: RecallEntry = {
        ...finoEntry,
        id: 'corrupted_exchange_only',
        nutrients: { ...finoEntry.nutrients, caloriesKcal: 80, carbsG: 15, proteinG: 3, fatG: 1 },
      };

      const summary = aggregateRecallEntries([chickenEntry, corruptedExchangeOnlyEntry]);
      assert.equal(summary.caloriesKcal.knownEntriesCount, 1);
      assert.equal(summary.caloriesKcal.missingEntriesCount, 1);
      assert.equal(summary.caloriesKcal.observedTotal, 165);
      assert.equal(summary.caloriesKcal.completeTotal, null);
      assert.equal(summary.caloriesKcal.isComplete, false);

      assert.equal(summary.proteinG.observedTotal, 31.02);
      assert.equal(summary.carbsG.observedTotal, 0); // genuine analytical zero from chicken breast
      assert.equal(summary.fatG.observedTotal, 3.57);
      assert.equal(summary.hasIncompleteNutrients, true);
    });

    it('Case 5: all days analytically unknown for a nutrient produces observedAverage null and no artificial zero average', () => {
      const peanuts = getFoodItemById('food_fat_rp_ft_082')!;
      const unassayedMicroFood = {
        ...peanuts,
        id: 'synthetic_unassayed_micro_case5',
        nutrients100g: {
          ...peanuts.nutrients100g,
          potassiumMg: null,
          ironMg: null,
        },
      };
      const fino = getFoodItemById('food_starch_rp_rp_st_007')!; // exchange_only

      // 5a: Two days with all exchange_only entries -> every nutrient has observedAverage === null
      const allExSession = createNewRecallSession({ targetDays: 2, startDate: '2026-11-15' });
      allExSession.days[0].meals[0].entries.push(resolveRecallEntry({ food: fino, selectedPortionId: fino.portions[0].id, quantity: 1 }));
      allExSession.days[1].meals[0].entries.push(resolveRecallEntry({ food: fino, selectedPortionId: fino.portions[0].id, quantity: 2 }));
      const allExAnalysis = calculateMultiDayRecallAnalysis(allExSession);
      assert.equal(allExAnalysis.recordedDaysCount, 2);
      for (const item of Object.values(allExAnalysis.averages)) {
        assert.equal(item.denominator, 0);
        assert.equal(item.observedAverage, null);
        assert.equal(item.averageValue, null);
        assert.equal(item.isComplete, false);
      }

      // 5b: Two days where calories are known but potassiumMg & ironMg are null on both days
      const partialMicroSession = createNewRecallSession({ targetDays: 2, startDate: '2026-11-15' });
      partialMicroSession.days[0].meals[0].entries.push(resolveRecallEntry({ food: unassayedMicroFood, quantity: 50, selectedPortionId: 'grams' }));
      partialMicroSession.days[1].meals[0].entries.push(resolveRecallEntry({ food: unassayedMicroFood, quantity: 50, selectedPortionId: 'grams' }));
      const microAnalysis = calculateMultiDayRecallAnalysis(partialMicroSession);
      assert.equal(microAnalysis.averages.caloriesKcal.denominator, 2);
      assert.equal(microAnalysis.averages.caloriesKcal.isComplete, true);
      assert.ok(microAnalysis.averages.caloriesKcal.observedAverage !== null && microAnalysis.averages.caloriesKcal.observedAverage > 200);
      assert.equal(microAnalysis.averages.potassiumMg.denominator, 0);
      assert.equal(microAnalysis.averages.potassiumMg.observedAverage, null);
      assert.equal(microAnalysis.averages.potassiumMg.averageValue, null);
      assert.equal(microAnalysis.averages.potassiumMg.isComplete, false);
      assert.equal(microAnalysis.averages.ironMg.denominator, 0);
      assert.equal(microAnalysis.averages.ironMg.observedAverage, null);
      assert.equal(microAnalysis.averages.ironMg.isComplete, false);
    });

    it('Case 6: existing fully analytical recall data preserves exact totals, averages, completeness, and target comparisons', () => {
      const bread = getFoodItemById('food_bread_baladi_baked')!; // 252 kcal, 9.1P, 52.8C, 1.2F
      const chicken = getFoodItemById('food_chicken_breast_grilled_skinless')!; // 165 kcal, 31.02P, 0C, 3.57F

      const session = createNewRecallSession({ targetDays: 2, startDate: '2026-11-15' });
      session.days[0].meals[0].entries.push(resolveRecallEntry({ food: bread, quantity: 200, selectedPortionId: 'grams' }));
      session.days[0].meals[1].entries.push(resolveRecallEntry({ food: chicken, quantity: 200, selectedPortionId: 'grams' }));
      session.days[1].meals[0].entries.push(resolveRecallEntry({ food: bread, quantity: 200, selectedPortionId: 'grams' }));
      session.days[1].meals[1].entries.push(resolveRecallEntry({ food: chicken, quantity: 200, selectedPortionId: 'grams' }));

      const analysis = calculateMultiDayRecallAnalysis(session);
      assert.equal(analysis.recordedDaysCount, 2);
      assert.equal(analysis.isSessionComplete, true);
      assert.equal(analysis.averages.caloriesKcal.denominator, 2);
      assert.equal(analysis.averages.caloriesKcal.isComplete, true);
      assert.equal(analysis.averages.caloriesKcal.observedAverage, 834.0); // 504 + 330
      assert.equal(analysis.averages.caloriesKcal.averageValue, 834.0);
      assert.equal(analysis.averages.proteinG.observedAverage, 80.24); // 18.2 + 62.04
      assert.equal(analysis.averages.carbsG.observedAverage, 105.6);
      assert.equal(analysis.averages.fatG.observedAverage, 9.54);

      const comps = compareIntakeWithPhase1Targets({ actualAverages: analysis.averages, targets });
      const energy = comps.find((c) => c.metric === 'energy')!;
      assert.equal(energy.status, 'under');
      assert.equal(energy.actualIntake, 834.0);
      assert.equal(energy.difference, -1166.0);
      assert.equal(energy.percentAchieved, 41.7);
    });

    it('Case 7: 3-day session partial coverage counts (2/3 and 0/2) compute accurate denominators and withhold target classification', () => {
      const bread = getFoodItemById('food_bread_baladi_baked')!; // 252 kcal per 100g
      const chicken = getFoodItemById('food_chicken_breast_grilled_skinless')!; // 165 kcal per 100g
      const fino = getFoodItemById('food_starch_rp_rp_st_007')!; // exchange_only
      const peanuts = getFoodItemById('food_fat_rp_ft_082')!;
      const unassayedPotassiumFood = {
        ...peanuts,
        id: 'synthetic_unassayed_potassium_case7',
        nutrients100g: {
          ...peanuts.nutrients100g,
          potassiumMg: null,
        },
      };

      // 2 analytical days + 1 exchange_only day -> denominator 2 of 3 recorded days
      const session3 = createNewRecallSession({ targetDays: 3, startDate: '2026-11-15' });
      session3.days[0].meals[0].entries.push(resolveRecallEntry({ food: bread, quantity: 100, selectedPortionId: 'grams' }));
      session3.days[1].meals[0].entries.push(resolveRecallEntry({ food: chicken, quantity: 100, selectedPortionId: 'grams' }));
      session3.days[2].meals[0].entries.push(resolveRecallEntry({ food: fino, selectedPortionId: fino.portions[0].id, quantity: 1 }));

      const analysis3 = calculateMultiDayRecallAnalysis(session3);
      assert.equal(analysis3.recordedDaysCount, 3);
      assert.equal(analysis3.averages.caloriesKcal.denominator, 2);
      assert.equal(analysis3.averages.caloriesKcal.totalRecordedDays, 3);
      assert.equal(analysis3.averages.caloriesKcal.observedAverage, 208.5); // (252 + 165) / 2
      assert.equal(analysis3.averages.caloriesKcal.averageValue, null);
      assert.equal(analysis3.averages.caloriesKcal.isComplete, false);

      const comps3 = compareIntakeWithPhase1Targets({ actualAverages: analysis3.averages, targets });
      for (const c of comps3) {
        assert.equal(c.status, 'incomplete_intake');
        assert.equal(c.difference, null);
        assert.equal(c.percentAchieved, null);
      }

      // 0/2 analytical coverage for unassayed micronutrients (potassiumMg) across 2 recorded days
      const session0of2 = createNewRecallSession({ targetDays: 2, startDate: '2026-11-15' });
      session0of2.days[0].meals[0].entries.push(resolveRecallEntry({ food: unassayedPotassiumFood, quantity: 30, selectedPortionId: 'grams' }));
      session0of2.days[1].meals[0].entries.push(resolveRecallEntry({ food: unassayedPotassiumFood, quantity: 30, selectedPortionId: 'grams' }));
      const analysis0of2 = calculateMultiDayRecallAnalysis(session0of2);
      assert.equal(analysis0of2.recordedDaysCount, 2);
      assert.equal(analysis0of2.averages.potassiumMg.denominator, 0);
      assert.equal(analysis0of2.averages.potassiumMg.totalRecordedDays, 2);
      assert.equal(analysis0of2.averages.potassiumMg.observedAverage, null);
      assert.equal(analysis0of2.averages.potassiumMg.isComplete, false);
    });
  });

  describe('8. RecallWorkbench UI Presentation of Partial Coverage, Unavailable Values & Genuine Zero', () => {
    const targets: Phase1TargetInputs = {
      targetCalories: 2000,
      targetProteinG: 100,
      targetCarbsG: 250,
      targetFatG: 65,
    };

    it('renders Unavailable and — (never 0 kcal/day) and withholds target comparison when all entries are exchange_only', () => {
      const fino = getFoodItemById('food_starch_rp_rp_st_007')!;
      const session = createNewRecallSession({ targetDays: 1, startDate: '2026-11-15' });
      session.days[0].meals[0].entries.push(
        resolveRecallEntry({ food: fino, selectedPortionId: fino.portions[0].id, quantity: 1 })
      );

      const html = renderToStaticMarkup(
        React.createElement(RecallWorkbench, {
          isAr: false,
          phase1Targets: targets,
          initialSession: session,
        })
      );

      assert.ok(html.includes('— (Unassayed)'));
      assert.ok(html.includes('Unavailable'));
      assert.ok(html.includes('Comparison Withheld (Incomplete)'));
      assert.ok(!html.includes('>0 kcal<'));
      assert.ok(!html.includes(' 0 kcal'));
      assert.ok(!html.includes('0 kcal/day'));
    });

    it('renders exact partial coverage count (1/2 recorded days) in English and Arabic and does not dilute average across unknown days', () => {
      const bread = getFoodItemById('food_bread_baladi_baked')!; // 252 kcal per 100g
      const fino = getFoodItemById('food_starch_rp_rp_st_007')!; // exchange_only

      const session = createNewRecallSession({ targetDays: 2, startDate: '2026-11-15' });
      session.days[0].meals[0].entries.push(
        resolveRecallEntry({ food: bread, quantity: 100, selectedPortionId: 'grams' })
      );
      session.days[1].meals[0].entries.push(
        resolveRecallEntry({ food: fino, selectedPortionId: fino.portions[0].id, quantity: 1 })
      );

      const htmlEn = renderToStaticMarkup(
        React.createElement(RecallWorkbench, {
          isAr: false,
          phase1Targets: targets,
          initialSession: session,
        })
      );

      assert.ok(htmlEn.includes('Partial · 1/2 recorded days'));
      assert.ok(htmlEn.includes('252 kcal/day'));
      assert.ok(htmlEn.includes('Observed across 2 recorded day(s) (partial coverage noted below)'));
      assert.ok(htmlEn.includes('Comparison Withheld (Incomplete)'));
      assert.ok(!htmlEn.includes('126 kcal'));

      const htmlAr = renderToStaticMarkup(
        React.createElement(RecallWorkbench, {
          isAr: true,
          phase1Targets: targets,
          initialSession: session,
        })
      );

      assert.ok(htmlAr.includes('جزئي · 1/2 أيام مسجلة'));
      assert.ok(htmlAr.includes('مرصود عبر 2 أيام مسجلة (التغطية الجزئية موضحة لكل عنصر)'));
      assert.ok(htmlAr.includes('المقارنة معلّقة (غير مكتمل)'));
    });

    it('renders genuine analytical zero (0 kcal, 0 kcal/day, 0 g/day) cleanly without treating it as unavailable', () => {
      const karkadeh = getFoodItemById('food_hibiscus_tea_karkadeh')!;
      const session = createNewRecallSession({ targetDays: 1, startDate: '2026-11-15' });
      session.days[0].meals[0].entries.push(
        resolveRecallEntry({ food: karkadeh, quantity: 250, selectedPortionId: 'grams' })
      );

      const html = renderToStaticMarkup(
        React.createElement(RecallWorkbench, {
          isAr: false,
          phase1Targets: targets,
          initialSession: session,
        })
      );

      assert.ok(html.includes('0 kcal'));
      assert.ok(html.includes('0 kcal/day'));
      assert.ok(html.includes('0 g/day'));
      assert.ok(html.includes('100% Complete Assays'));
      assert.ok(!html.includes('Average Calories: <!-- -->(<span class="text-[10px] font-bold text-slate-500">(Unavailable)'));
      assert.ok(!html.includes('Energy (Calories)</span><span class="text-[9px] font-bold text-slate-500">Unavailable</span>'));
    });

    it('renders fully analytical multi-day averages without partial qualifiers', () => {
      const bread = getFoodItemById('food_bread_baladi_baked')!;
      const chicken = getFoodItemById('food_chicken_breast_grilled_skinless')!;
      const session = createNewRecallSession({ targetDays: 2, startDate: '2026-11-15' });
      session.days[0].meals[0].entries.push(resolveRecallEntry({ food: bread, quantity: 200, selectedPortionId: 'grams' }));
      session.days[0].meals[1].entries.push(resolveRecallEntry({ food: chicken, quantity: 200, selectedPortionId: 'grams' }));
      session.days[1].meals[0].entries.push(resolveRecallEntry({ food: bread, quantity: 200, selectedPortionId: 'grams' }));
      session.days[1].meals[1].entries.push(resolveRecallEntry({ food: chicken, quantity: 200, selectedPortionId: 'grams' }));

      const html = renderToStaticMarkup(
        React.createElement(RecallWorkbench, {
          isAr: false,
          phase1Targets: targets,
          initialSession: session,
        })
      );

      assert.ok(html.includes('Based on 2-day recorded average'));
      assert.ok(html.includes('834 kcal/day'));
      assert.ok(!html.includes('Partial ·'));
    });

    it('derives availableCarbsG in recall aggregation for total_by_difference foods while preserving null on exchange_only and missing fiber', () => {
      const peanuts = getFoodItemById('food_fat_rp_ft_082')!; // 16.1g carbsG, 8.5g fiberG, total_by_difference -> 7.6g avail per 100g
      const avocadoOil = getFoodItemById('food_fat_rp_ft_065')!;
      const unassayedFiberOil = {
        ...avocadoOil,
        id: 'synthetic_unassayed_fiber_oil',
        nutrients100g: {
          ...avocadoOil.nutrients100g,
          fiberG: null,
        },
      };
      const fino = getFoodItemById('food_starch_rp_rp_st_007')!; // exchange_only -> null

      const peanutEntry = resolveRecallEntry({ food: peanuts, quantity: 100, selectedPortionId: 'grams' });
      const peanutOnly = aggregateRecallEntries([peanutEntry]);
      assert.equal(peanutOnly.availableCarbsG.observedTotal, 7.6);
      assert.equal(peanutOnly.availableCarbsG.completeTotal, 7.6);
      assert.equal(peanutOnly.availableCarbsG.isComplete, true);

      const oilEntry = resolveRecallEntry({ food: unassayedFiberOil, quantity: 15, selectedPortionId: 'grams' });
      const finoEntry = resolveRecallEntry({ food: fino, selectedPortionId: fino.portions[0].id, quantity: 1 });
      const mixed = aggregateRecallEntries([peanutEntry, oilEntry, finoEntry]);
      assert.equal(mixed.availableCarbsG.observedTotal, 7.6);
      assert.equal(mixed.availableCarbsG.completeTotal, null);
      assert.equal(mixed.availableCarbsG.isComplete, false);
    });

    it('preserves USDA SR Legacy assayed dairy and fats micronutrients while keeping unassayed fields null', () => {
      const wholeMilk = getFoodItemById('food_dairy_rp_da_001')!; // NDB 01211: transFatG absent in USDA SR Legacy
      assert.equal(wholeMilk.nutrients100g.calciumMg, 113);
      assert.equal(wholeMilk.nutrients100g.potassiumMg, 132);
      assert.equal(wholeMilk.nutrients100g.transFatG, null);

      const skimPowder = getFoodItemById('food_dairy_rp_da_013')!; // NDB 01091
      assert.equal(skimPowder.nutrients100g.calciumMg, 1260);
      assert.equal(skimPowder.nutrients100g.transFatG, null);

      const greekNonfat = getFoodItemById('food_dairy_rp_da_015')!; // NDB 01256
      assert.equal(greekNonfat.nutrients100g.calciumMg, 110);

      const avocadoOil = getFoodItemById('food_fat_rp_ft_065')!; // NDB 04581: cholesterolMg & transFatG unassayed (null)
      assert.equal(avocadoOil.nutrients100g.saturatedFatG, 11.6);
      assert.equal(avocadoOil.nutrients100g.cholesterolMg, null);
      assert.equal(avocadoOil.nutrients100g.transFatG, null);
    });
  });
});


