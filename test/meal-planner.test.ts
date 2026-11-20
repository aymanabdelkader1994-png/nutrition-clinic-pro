/**
 * Nutrition Clinic Pro - Phase 4: Unified Meal Planner Test Suite
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  clearCustomFoodsForTesting,
  getFoodItemById,
  registerCustomFoodItem,
} from '../src/clinical/food/food-database';
import {
  addItemToMeal,
  addMealSlot,
  calculateDailyMealPlanAnalysis,
  calculateMealSlotSummary,
  clearSavedMealPlansForTesting,
  createDailyMealPlan,
  createSampleEgyptianMealPlan,
  deleteSavedMealPlan,
  formatLocalCalendarDate,
  getMealPlanStorageStatus,
  getSavedMealPlans,
  removeMealItem,
  removeMealSlot,
  replaceMealItem,
  resolveMealPlanItem,
  resolveMealPlanItemFood,
  saveMealPlan,
  saveMealPlanWithStatus,
  updateMealItemQuantity,
} from '../src/clinical/planner';
import { MealPlanTargetInputs } from '../src/clinical/planner/types';
import { MealPlannerWorkbench } from '../src/components/planner/MealPlannerWorkbench';

describe('Phase 4: Unified Daily Meal Planner Engine & UI Tests', () => {
  beforeEach(() => {
    clearSavedMealPlansForTesting();
  });

  const sampleTargets: MealPlanTargetInputs = {
    targetCalories: 2000,
    targetProteinG: 150,
    targetCarbsG: 200,
    targetFatG: 65,
    targetFiberG: 28,
  };

  describe('1. Plan Structure, Meal Organization, Editing, Replacing & Removing', () => {
    it('creates a daily meal plan with default meals and snacks and supports adding/removing slots', () => {
      let plan = createDailyMealPlan({ titleEn: 'Weight Loss Plan', planDate: '2026-11-16' });
      assert.equal(plan.meals.length, 5);
      assert.deepEqual(
        plan.meals.map((m) => m.mealType),
        ['breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner']
      );

      plan = addMealSlot(plan, {
        mealType: 'evening_snack',
        timeOfDay: '22:00',
      });
      assert.equal(plan.meals.length, 6);
      assert.equal(plan.meals[5].mealType, 'evening_snack');

      const customPlan = addMealSlot(plan, {
        mealType: 'custom',
        customNameEn: 'Pre-Workout',
        customNameAr: 'قبل التمرين',
        timeOfDay: '16:00',
      });
      assert.equal(customPlan.meals.length, 7);
      assert.equal(customPlan.meals[6].customNameEn, 'Pre-Workout');

      const trimmed = removeMealSlot(customPlan, customPlan.meals[6].id);
      assert.equal(trimmed.meals.length, 6);

      // Cannot remove the last remaining meal slot
      let oneLeft = trimmed;
      while (oneLeft.meals.length > 1) {
        oneLeft = removeMealSlot(oneLeft, oneLeft.meals[oneLeft.meals.length - 1].id);
      }
      assert.throws(() => removeMealSlot(oneLeft, oneLeft.meals[0].id), /at least one meal slot/);
    });

    it('adds catalog foods, edits quantity in portions and grams, replaces, and removes foods', () => {
      const bread = getFoodItemById('food_bread_baladi_baked')!; // 252 kcal, 9.1P, 52.8C, 1.2F per 100g
      const chicken = getFoodItemById('food_chicken_breast_grilled_skinless')!; // 165 kcal, 31.02P, 0C, 3.57F per 100g
      const oats = getFoodItemById('food_oats_rolled_dry') || getFoodItemById('food_rice_white_cooked')!;

      let plan = createDailyMealPlan();
      const breakfastId = plan.meals[0].id;

      // Add 100g bread directly
      const breadItem = resolveMealPlanItem({
        food: bread,
        selectedPortionId: 'grams',
        quantity: 100,
      });
      plan = addItemToMeal(plan, breakfastId, breadItem);
      assert.equal(plan.meals[0].items.length, 1);
      assert.equal(plan.meals[0].items[0].resolvedGramWeight, 100);
      assert.equal(plan.meals[0].items[0].nutrients.caloriesKcal, 252);

      // Edit quantity to 150g direct
      plan = updateMealItemQuantity(plan, breakfastId, breadItem.id, {
        selectedPortionId: undefined,
        quantity: 150,
      });
      assert.equal(plan.meals[0].items[0].resolvedGramWeight, 150);
      assert.equal(plan.meals[0].items[0].nutrients.caloriesKcal, 378);

      // Switch to household portion (2x half loaf = 2 * 70g = 140g -> 352.8 kcal)
      plan = updateMealItemQuantity(plan, breakfastId, breadItem.id, {
        selectedPortionId: 'portion_baladi_half_loaf',
        quantity: 2,
      });
      assert.equal(plan.meals[0].items[0].isDirectGrams, false);
      assert.equal(plan.meals[0].items[0].resolvedGramWeight, 140);
      assert.equal(plan.meals[0].items[0].nutrients.caloriesKcal, 352.8);

      // Reject non-positive quantity
      assert.throws(
        () => updateMealItemQuantity(plan, breakfastId, breadItem.id, { quantity: 0 }),
        /strictly positive finite number/
      );

      // Replace bread with chicken (200g)
      const replacement = resolveMealPlanItem({
        food: chicken,
        selectedPortionId: 'grams',
        quantity: 200,
      });
      plan = replaceMealItem(plan, breakfastId, breadItem.id, replacement);
      assert.equal(plan.meals[0].items.length, 1);
      assert.equal(plan.meals[0].items[0].foodId, chicken.id);
      assert.equal(plan.meals[0].items[0].nutrients.caloriesKcal, 330);

      // Add second item then remove it
      const extra = resolveMealPlanItem({ food: oats, selectedPortionId: 'grams', quantity: 100 });
      plan = addItemToMeal(plan, breakfastId, extra);
      assert.equal(plan.meals[0].items.length, 2);
      plan = removeMealItem(plan, breakfastId, extra.id);
      assert.equal(plan.meals[0].items.length, 1);
    });
  });

  describe('2. Meal & Daily Nutrient Totals, Remaining / Excess & Data Integrity', () => {
    it('calculates exact meal subtotals, daily totals, and remaining vs excess targets when analytical data is complete', () => {
      const bread = getFoodItemById('food_bread_baladi_baked')!; // 252 kcal, 9.1P, 52.8C, 1.2F, 4.8 fiber per 100g
      const chicken = getFoodItemById('food_chicken_breast_grilled_skinless')!; // 165 kcal, 31.02P, 0C, 3.57F, 0 fiber per 100g

      let plan = createDailyMealPlan();
      // Breakfast: 200g Baladi bread = 504 kcal, 18.2P, 105.6C, 2.4F, 9.6 fiber
      plan = addItemToMeal(
        plan,
        plan.meals[0].id,
        resolveMealPlanItem({ food: bread, selectedPortionId: 'grams', quantity: 200 })
      );
      // Lunch: 500g chicken breast = 825 kcal, 155.1P, 0C, 17.85F, 0 fiber
      plan = addItemToMeal(
        plan,
        plan.meals[2].id,
        resolveMealPlanItem({ food: chicken, selectedPortionId: 'grams', quantity: 500 })
      );

      const breakfastSummary = calculateMealSlotSummary(plan.meals[0]);
      assert.equal(breakfastSummary.nutrientSummary.caloriesKcal.completeTotal, 504);
      assert.equal(breakfastSummary.nutrientSummary.proteinG.completeTotal, 18.2);

      const analysis = calculateDailyMealPlanAnalysis(plan, sampleTargets);
      assert.equal(analysis.totalItemsCount, 2);
      assert.equal(analysis.dailySummary.caloriesKcal.completeTotal, 1329);
      assert.equal(analysis.dailySummary.proteinG.completeTotal, 173.3);
      assert.equal(analysis.dailySummary.carbsG.completeTotal, 105.6);
      assert.equal(analysis.dailySummary.fatG.completeTotal, 20.25);
      assert.equal(analysis.dailySummary.fiberG.completeTotal, 9.6);

      const energy = analysis.targetComparisons.find((c) => c.metric === 'energy')!;
      assert.equal(energy.status, 'under');
      assert.equal(energy.difference, -671);
      assert.equal(energy.remaining, 671);
      assert.equal(energy.excess, 0);
      assert.equal(energy.percentOfTarget, 66.5);

      const protein = analysis.targetComparisons.find((c) => c.metric === 'protein')!;
      assert.equal(protein.status, 'over');
      assert.equal(protein.difference, 23.3);
      assert.equal(protein.remaining, 0);
      assert.equal(protein.excess, 23.3);
      assert.equal(protein.percentOfTarget, 115.5);
    });

    it('preserves genuine analytical zero (0 kcal, 0g macros) as confirmed 0 rather than null', () => {
      const karkadeh = getFoodItemById('food_hibiscus_tea_karkadeh')!; // 0 kcal, 0P, 0C, 0F, 0 fiber
      let plan = createDailyMealPlan();
      plan = addItemToMeal(
        plan,
        plan.meals[1].id,
        resolveMealPlanItem({ food: karkadeh, selectedPortionId: 'grams', quantity: 250 })
      );

      const analysis = calculateDailyMealPlanAnalysis(plan, sampleTargets);
      assert.equal(analysis.dailySummary.caloriesKcal.isComplete, true);
      assert.equal(analysis.dailySummary.caloriesKcal.observedTotal, 0);
      assert.equal(analysis.dailySummary.caloriesKcal.completeTotal, 0);

      const energy = analysis.targetComparisons.find((c) => c.metric === 'energy')!;
      assert.equal(energy.isComplete, true);
      assert.equal(energy.plannedComplete, 0);
      assert.equal(energy.remaining, 2000);
      assert.equal(energy.excess, 0);
      assert.equal(energy.status, 'under');
    });

    it('never converts exchange_only null values to 0 and withholds remaining/excess calculations', () => {
      const fino = getFoodItemById('food_starch_rp_rp_st_008')!; // exchange_only (Sunn bread)
      assert.equal(fino.compositionBasis, 'exchange_only');

      let plan = createDailyMealPlan();
      plan = addItemToMeal(
        plan,
        plan.meals[0].id,
        resolveMealPlanItem({ food: fino, selectedPortionId: fino.portions[0].id, quantity: 2 })
      );

      const analysis = calculateDailyMealPlanAnalysis(plan, sampleTargets);
      assert.equal(analysis.dailySummary.caloriesKcal.observedTotal, null);
      assert.equal(analysis.dailySummary.caloriesKcal.completeTotal, null);
      assert.equal(analysis.dailySummary.caloriesKcal.isComplete, false);

      for (const comp of analysis.targetComparisons) {
        assert.equal(comp.status, 'unavailable_data');
        assert.equal(comp.plannedObserved, null);
        assert.equal(comp.plannedComplete, null);
        assert.equal(comp.remaining, null);
        assert.equal(comp.excess, null);
        assert.equal(comp.difference, null);
      }
    });

    it('handles mixed analytical + exchange_only items with partial observed sum and withheld remaining/excess', () => {
      const bread = getFoodItemById('food_bread_baladi_baked')!; // 252 kcal per 100g
      const fino = getFoodItemById('food_starch_rp_rp_st_008')!; // exchange_only (Sunn bread)

      let plan = createDailyMealPlan();
      plan = addItemToMeal(
        plan,
        plan.meals[0].id,
        resolveMealPlanItem({ food: bread, selectedPortionId: 'grams', quantity: 100 })
      );
      plan = addItemToMeal(
        plan,
        plan.meals[2].id,
        resolveMealPlanItem({ food: fino, selectedPortionId: fino.portions[0].id, quantity: 1 })
      );

      const analysis = calculateDailyMealPlanAnalysis(plan, sampleTargets);
      assert.equal(analysis.dailySummary.caloriesKcal.observedTotal, 252);
      assert.equal(analysis.dailySummary.caloriesKcal.completeTotal, null);
      assert.equal(analysis.dailySummary.caloriesKcal.isComplete, false);
      assert.equal(analysis.dailySummary.caloriesKcal.knownEntriesCount, 1);
      assert.equal(analysis.dailySummary.caloriesKcal.missingEntriesCount, 1);

      const energy = analysis.targetComparisons.find((c) => c.metric === 'energy')!;
      assert.equal(energy.status, 'incomplete_data');
      assert.equal(energy.plannedObserved, 252);
      assert.equal(energy.plannedComplete, null);
      assert.equal(energy.remaining, null);
      assert.equal(energy.excess, null);
      assert.equal(energy.difference, null);
    });

    it('marks missing clinical targets as target_unavailable and builds valid sample plan & local storage', () => {
      const sample = createSampleEgyptianMealPlan('Test Patient');
      assert.ok(sample.meals.some((m) => m.items.length > 0));

      const analysisNoTargets = calculateDailyMealPlanAnalysis(sample, {});
      for (const comp of analysisNoTargets.targetComparisons) {
        assert.equal(comp.status, 'target_unavailable');
        assert.equal(comp.remaining, null);
        assert.equal(comp.excess, null);
      }

      saveMealPlan(sample);
      const saved = getSavedMealPlans();
      assert.equal(saved.length, 1);
      assert.equal(saved[0].id, sample.id);
      assert.equal(deleteSavedMealPlan(sample.id), true);
      assert.equal(getSavedMealPlans().length, 0);
    });
  });

  describe('3. MealPlannerWorkbench UI Presentation (EN & AR)', () => {
    it('renders complete remaining/excess badges in EN and AR', () => {
      const bread = getFoodItemById('food_bread_baladi_baked')!;
      const chicken = getFoodItemById('food_chicken_breast_grilled_skinless')!;
      let plan = createDailyMealPlan();
      plan = addItemToMeal(
        plan,
        plan.meals[0].id,
        resolveMealPlanItem({ food: bread, selectedPortionId: 'grams', quantity: 200 })
      );
      plan = addItemToMeal(
        plan,
        plan.meals[2].id,
        resolveMealPlanItem({ food: chicken, selectedPortionId: 'grams', quantity: 500 })
      );

      const htmlEn = renderToStaticMarkup(
        React.createElement(MealPlannerWorkbench, {
          isAr: false,
          phase1Targets: sampleTargets,
          initialPlan: plan,
        })
      );
      assert.ok(htmlEn.includes('Unified Daily Meal Planner'));
      assert.ok(htmlEn.includes('671 kcal remaining'));
      assert.ok(htmlEn.includes('23.3 g excess'));
      assert.ok(htmlEn.includes('1329 kcal'));

      const htmlAr = renderToStaticMarkup(
        React.createElement(MealPlannerWorkbench, {
          isAr: true,
          phase1Targets: sampleTargets,
          initialPlan: plan,
        })
      );
      assert.ok(htmlAr.includes('مخطط الوجبات العلاجي الموحد'));
      assert.ok(htmlAr.includes('متبقي 671 kcal'));
      assert.ok(htmlAr.includes('فائض 23.3 g'));
    });

    it('renders Unavailable and Partial indicators without fabricating zeros when exchange_only items are planned', () => {
      const bread = getFoodItemById('food_bread_baladi_baked')!;
      const fino = getFoodItemById('food_starch_rp_rp_st_008')!; // exchange_only (Sunn bread)

      let exchangeOnlyPlan = createDailyMealPlan();
      exchangeOnlyPlan = addItemToMeal(
        exchangeOnlyPlan,
        exchangeOnlyPlan.meals[0].id,
        resolveMealPlanItem({ food: fino, selectedPortionId: fino.portions[0].id, quantity: 1 })
      );

      const htmlUnavailable = renderToStaticMarkup(
        React.createElement(MealPlannerWorkbench, {
          isAr: false,
          phase1Targets: sampleTargets,
          initialPlan: exchangeOnlyPlan,
        })
      );
      assert.ok(htmlUnavailable.includes('— (Unassayed)'));
      assert.ok(htmlUnavailable.includes('Unavailable'));
      assert.ok(!htmlUnavailable.includes('2000 kcal remaining'));

      const mixedPlan = addItemToMeal(
        exchangeOnlyPlan,
        exchangeOnlyPlan.meals[2].id,
        resolveMealPlanItem({ food: bread, selectedPortionId: 'grams', quantity: 100 })
      );

      const htmlPartial = renderToStaticMarkup(
        React.createElement(MealPlannerWorkbench, {
          isAr: false,
          phase1Targets: sampleTargets,
          initialPlan: mixedPlan,
        })
      );
      assert.ok(htmlPartial.includes('Partial · 1/2 items'));
      assert.ok(htmlPartial.includes('~252 kcal'));
      assert.ok(!htmlPartial.includes('1748 kcal remaining'));
    });
  });

  describe('4. Targeted Phase 4 Remediation Regression Tests', () => {
    it('keeps custom food items editable and recalculable after reload when runtime customFoodRegistry is cleared', () => {
      clearCustomFoodsForTesting();

      // Mock browser localStorage for full save -> reload roundtrip
      const store = new Map<string, string>();
      const prevWindow = (globalThis as { window?: unknown }).window;
      (globalThis as { window?: unknown }).window = {
        localStorage: {
          getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
          setItem: (k: string, v: string) => {
            store.set(k, v);
          },
          removeItem: (k: string) => {
            store.delete(k);
          },
        },
      };

      try {
        const customFood = registerCustomFoodItem({
          nameEn: 'Clinic Whey Oat Shake',
          nameAr: 'مشروب شوفان وبروتين',
          foodGroupId: 'custom',
          primaryExchangeCategoryId: 'combination_food',
          preparationState: 'ready-to-eat',
          compositionBasis: 'clinic_estimated',
          nutrients100g: {
            basisWeightG: 100,
            caloriesKcal: 200,
            proteinG: 20,
            carbsG: 30,
            fatG: 0, // genuine confirmed zero
            fiberG: null, // unknown/unassayed
            saturatedFatG: null,
            transFatG: null,
            monounsaturatedFatG: null,
            polyunsaturatedFatG: null,
            cholesterolMg: null,
            sodiumMg: null,
            potassiumMg: null,
            calciumMg: null,
            ironMg: null,
            missingNutrientKeys: ['fiberG', 'sodiumMg'],
          },
          portions: [
            {
              id: 'portion_custom_shake_50g',
              portionNameEn: '1 Scoop Shake (~50g)',
              portionNameAr: 'سكوب (~50 جم)',
              householdMeasureEn: '1 Scoop Shake (~50g)',
              householdMeasureAr: 'سكوب (~50 جم)',
              gramWeight: 50,
              exchangeCategory: 'combination_food',
              exchangeEquivalentFactor: 0,
              isDefaultServing: true,
            },
          ],
        });

        let plan = createDailyMealPlan({ planDate: '2026-11-16' });
        const snackId = plan.meals[1].id;
        const customItem = resolveMealPlanItem({
          food: customFood,
          selectedPortionId: customFood.portions[0].id,
          quantity: 1,
        });
        plan = addItemToMeal(plan, snackId, customItem);

        const saveResult = saveMealPlanWithStatus(plan);
        assert.equal(saveResult.persistenceMode, 'local_storage');
        assert.equal(saveResult.isDurable, true);

        // Simulate full application reload: runtime customFoodRegistry is wiped
        clearCustomFoodsForTesting();
        assert.equal(getFoodItemById(customFood.id), undefined);

        const reloadedPlans = getSavedMealPlans();
        assert.equal(reloadedPlans.length, 1);
        const reloadedPlan = reloadedPlans[0];
        const reloadedItem = reloadedPlan.meals[1].items[0];

        // Verify metadata and null vs 0 preservation
        assert.equal(reloadedItem.isCustomFood, true);
        assert.equal(reloadedItem.verificationStatus, 'user_custom');
        assert.equal(reloadedItem.compositionBasis, 'clinic_estimated');
        assert.equal(reloadedItem.customFoodRecord?.sourceId, 'clinic_reviewed');
        assert.equal(reloadedItem.customFoodRecord?.sourceRecordId, undefined);
        assert.equal(reloadedItem.customFoodRecord?.nutrients100g.fatG, 0);
        assert.equal(reloadedItem.customFoodRecord?.nutrients100g.fiberG, null);

        // Verify resolveMealPlanItemFood resolves snapshot without polluting standard records
        const resolvedFood = resolveMealPlanItemFood(reloadedItem);
        assert.ok(resolvedFood);
        assert.equal(resolvedFood.id, customFood.id);

        // Edit portion multiplier on reloaded plan (3 x 50g = 150g)
        const editedPortionPlan = updateMealItemQuantity(reloadedPlan, snackId, reloadedItem.id, {
          selectedPortionId: customFood.portions[0].id,
          quantity: 3,
        });
        const updatedItem = editedPortionPlan.meals[1].items[0];
        assert.equal(updatedItem.resolvedGramWeight, 150);
        assert.equal(updatedItem.nutrients.caloriesKcal, 300);
        assert.equal(updatedItem.nutrients.proteinG, 30);
        assert.equal(updatedItem.nutrients.carbsG, 45);
        assert.equal(updatedItem.nutrients.fatG, 0);
        assert.equal(updatedItem.nutrients.fiberG, null);
        assert.equal(updatedItem.nutrients.sodiumMg, null);

        // Edit direct grams on reloaded plan (200g)
        const editedGramsPlan = updateMealItemQuantity(editedPortionPlan, snackId, updatedItem.id, {
          selectedPortionId: undefined,
          quantity: 200,
        });
        const gramsItem = editedGramsPlan.meals[1].items[0];
        assert.equal(gramsItem.isDirectGrams, true);
        assert.equal(gramsItem.resolvedGramWeight, 200);
        assert.equal(gramsItem.nutrients.caloriesKcal, 400);
        assert.equal(gramsItem.nutrients.fatG, 0);
        assert.equal(gramsItem.nutrients.fiberG, null);

        // Ensure UI renders editable portion selector & quantity input for reloaded custom food
        const html = renderToStaticMarkup(
          React.createElement(MealPlannerWorkbench, {
            isAr: false,
            phase1Targets: sampleTargets,
            initialPlan: editedGramsPlan,
          })
        );
        assert.ok(html.includes(`Portion for ${customFood.nameEn}`));
        assert.ok(html.includes(`Quantity for ${customFood.nameEn}`));

        // Guard: custom snapshot can never override a standard catalog record
        const authoritativeBread = resolveMealPlanItemFood({
          ...reloadedItem,
          foodId: 'food_bread_baladi_baked',
        });
        assert.equal(authoritativeBread?.id, 'food_bread_baladi_baked');
        assert.equal(authoritativeBread?.isCustom, false);
      } finally {
        clearCustomFoodsForTesting();
        clearSavedMealPlansForTesting();
        (globalThis as { window?: unknown }).window = prevWindow;
      }
    });

    it('uses local calendar date rather than UTC date when planDate is not explicitly supplied', () => {
      // Simulate a local evening timestamp (Nov 16 local) whose UTC ISO string is already Nov 17
      const utcShiftedDate = new Date('2026-11-17T03:30:00.000Z');
      utcShiftedDate.getFullYear = () => 2026;
      utcShiftedDate.getMonth = () => 10; // 0-indexed November
      utcShiftedDate.getDate = () => 16;

      assert.equal(formatLocalCalendarDate(utcShiftedDate), '2026-11-16');

      const defaultPlan = createDailyMealPlan({ now: utcShiftedDate });
      assert.equal(defaultPlan.planDate, '2026-11-16');

      // Explicitly provided planDate must remain untouched
      const explicitPlan = createDailyMealPlan({ planDate: '2026-01-05', now: utcShiftedDate });
      assert.equal(explicitPlan.planDate, '2026-01-05');
    });

    it('reports memory_fallback honestly when localStorage is unavailable or write fails', () => {
      const plan = createDailyMealPlan({ planDate: '2026-11-16' });

      // Case A: no window/localStorage (SSR or blocked storage)
      const prevWindow = (globalThis as { window?: unknown }).window;
      (globalThis as { window?: unknown }).window = undefined;
      try {
        clearSavedMealPlansForTesting();
        const fallbackResult = saveMealPlanWithStatus(plan);
        assert.equal(fallbackResult.persistenceMode, 'memory_fallback');
        assert.equal(fallbackResult.isDurable, false);
        assert.equal(getMealPlanStorageStatus().isUsingMemoryFallback, true);
        assert.equal(getSavedMealPlans().length, 1);
      } finally {
        (globalThis as { window?: unknown }).window = prevWindow;
      }

      // Case B: localStorage exists for probe, but setItem throws QuotaExceededError on payload
      const prevWindow2 = (globalThis as { window?: unknown }).window;
      (globalThis as { window?: unknown }).window = {
        localStorage: {
          getItem: () => null,
          setItem: (key: string) => {
            if (key === 'ncp_daily_meal_plans_v1') {
              throw new Error('QuotaExceededError');
            }
          },
          removeItem: () => {},
        },
      };
      try {
        clearSavedMealPlansForTesting();
        const quotaResult = saveMealPlanWithStatus(plan);
        assert.equal(quotaResult.persistenceMode, 'memory_fallback');
        assert.equal(quotaResult.isDurable, false);
        assert.equal(getMealPlanStorageStatus().isUsingMemoryFallback, true);
        assert.equal(getSavedMealPlans().length, 1);
      } finally {
        clearSavedMealPlansForTesting();
        (globalThis as { window?: unknown }).window = prevWindow2;
      }
    });
  });
});
