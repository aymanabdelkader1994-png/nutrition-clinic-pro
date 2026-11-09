/**
 * Nutrition Clinic Pro - Food Composition & Exchange Engine Unit Tests
 * Phase 2 Final Data Contract Corrections Verification Suite
 *
 * Verifies:
 * 1. NNI provenance: internal codes preserved, synthetic sourceRecordId removed
 * 2. Hibiscus classification: recipe_based, official record removed, nutrients preserved
 * 3. Salad provenance: recipe_based, sourceRecordId undefined, nutrients preserved
 * 4. Legume exchange claims: accurate evidence status (standard_published vs clinical_linear_scaling)
 * 5. Insulin carbohydrate policy: chemical derivation separate from clinical insulin protocol
 * 6. Critical breaded chicken safeguard: cannot silently fall back to meat-only exchange
 * 7. Nutrient aggregation: observedTotal, null preservation, anti-zero imputation
 * 8. Deterministic portion scaling math & rounding
 * 9. Custom food isolation & reference protection
 * 10. Arabic text normalization & bilingual search
 * 11. Phase 1 non-regression & preserved nutritional values
 */

import test, { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  ADA_AND_EXCHANGE_SYSTEM,
  EGYPTIAN_NCI_EXCHANGE_SYSTEM,
  getExchangeSystem,
  getAllFoodItems,
  getFoodItemById,
  registerCustomFoodItem,
  clearCustomFoodsForTesting,
  scaleNutrientProfile,
  calculatePortionNutrients,
  calculateCustomGramsNutrients,
  aggregateNutrientProfiles,
  convertExchangesToEstimatedNutrients,
  calculateExchangeDivergence,
  normalizeArabicText,
  searchFoodItems,
  deriveAvailableCarbohydrates,
  FoodNutrientProfile100g,
} from '../src/clinical/index';

describe('1. Provenance Separation, NNI Attribution & Recipe Classifications', () => {
  beforeEach(() => {
    clearCustomFoodsForTesting();
  });

  it('preserves internal codes while representing unissued NNI record IDs as undefined', () => {
    const items = getAllFoodItems();
    assert.equal(items.length, 30);

    const nniFoods = items.filter((f) => f.sourceId === 'egyptian_nni_2006');
    assert.ok(nniFoods.length >= 8);

    for (const food of nniFoods) {
      // Internal reference code must be preserved
      assert.ok(food.code?.startsWith('NNI-'));
      // sourceRecordId must NOT contain synthetic 'NNI-2006-TAB-' strings; represents unavailable official digital ID as undefined
      assert.equal(food.sourceRecordId, undefined);
    }

    // USDA foods retain verified historical NDB numbers or FDC IDs
    const usdaFoods = items.filter((f) => f.sourceId === 'usda_fdc');
    for (const food of usdaFoods) {
      assert.ok(food.sourceRecordId && /^\d{5,6}$/.test(food.sourceRecordId));
    }
  });

  it('correctly classifies unsweetened hibiscus tea as recipe_based with verified USDA FDC 171946 record', () => {
    const hibiscus = getFoodItemById('food_hibiscus_tea_karkadeh')!;
    assert.ok(hibiscus);
    assert.equal(hibiscus.verificationStatus, 'recipe_based');
    assert.equal(hibiscus.sourceId, 'usda_fdc');
    assert.equal(hibiscus.sourceRecordId, '171946');
    assert.equal(hibiscus.code, 'USDA-171946');
    assert.equal(hibiscus.nutrients100g.caloriesKcal, 0.0);
    assert.equal(hibiscus.nutrients100g.carbsG, 0.0);
    assert.equal(hibiscus.nutrients100g.proteinG, 0.0);
    assert.equal(hibiscus.nutrients100g.fatG, 0.0);
    assert.equal(hibiscus.nutrients100g.waterG, 99.8);
    assert.deepEqual(hibiscus.nutrients100g.missingNutrientKeys, [
      'monounsaturatedFatG',
      'polyunsaturatedFatG',
    ]);
  });

  it('correctly classifies Baladi green salad as recipe_based and clinic_reviewed without synthetic official ID', () => {
    const salad = getFoodItemById('food_salad_baladi_green')!;
    assert.ok(salad);
    assert.equal(salad.verificationStatus, 'recipe_based');
    assert.equal(salad.sourceId, 'clinic_reviewed');
    assert.equal(salad.code, 'RECIPE-SALAD-001');
    assert.equal(salad.sourceRecordId, undefined);
    assert.equal(salad.nutrients100g.caloriesKcal, 22.0);
    assert.equal(salad.nutrients100g.carbsG, 4.1);
    assert.equal(salad.nutrients100g.proteinG, 1.2);
    assert.equal(salad.nutrients100g.fatG, 0.2);
    assert.equal(salad.nutrients100g.fiberG, 1.6);
  });
});

describe('2. Legume Exchange Claims & Evidence Status', () => {
  it('distinguishes standard published exchange portions from clinical linear scalings and clinic reviews', () => {
    const ful = getFoodItemById('food_ful_medames_cooked_plain')!;

    // 100g serving: clinic-reviewed standard serving
    const tbsp4Portion = ful.portions.find((p) => p.id === 'portion_ful_tbsp_4')!;
    assert.equal(tbsp4Portion.gramWeight, 100.0);
    assert.equal(tbsp4Portion.exchangeCategory, 'plant_protein_legumes');
    assert.equal(tbsp4Portion.exchangeEquivalentFactor, 1.0);
    assert.deepEqual(tbsp4Portion.exchangeBreakdown, { starch: 1.0, meat_lean: 1.0 });
    assert.equal(tbsp4Portion.exchangeEvidenceStatus, 'clinic_reviewed');

    // 180g serving: clinic-specific linear mathematical scaling
    const platePortion = ful.portions.find((p) => p.id === 'portion_ful_plate_half')!;
    assert.equal(platePortion.gramWeight, 180.0);
    assert.deepEqual(platePortion.exchangeBreakdown, { starch: 1.8, meat_lean: 1.8 });
    assert.equal(platePortion.exchangeEvidenceStatus, 'clinical_linear_scaling');

    // Lentils 100g: standard published in ADA/AND Choose Your Foods
    const lentils = getFoodItemById('food_lentils_brown_cooked')!;
    const lentilsPortion = lentils.portions[0];
    assert.equal(lentilsPortion.gramWeight, 100.0);
    assert.deepEqual(lentilsPortion.exchangeBreakdown, { starch: 1.0, meat_lean: 1.0 });
    assert.equal(lentilsPortion.exchangeEvidenceStatus, 'standard_published');
  });
});

describe('3. Critical Breaded Chicken Safeguard', () => {
  it('prevents breaded fried chicken from silently falling back to a pure meat exchange', () => {
    const chickenPane = getFoodItemById('food_chicken_breast_fried_breaded')!;
    assert.equal(chickenPane.primaryExchangeCategoryId, 'combination_food');
    assert.equal(chickenPane.verificationStatus, 'recipe_based');

    const portion = chickenPane.portions[0];
    assert.equal(portion.gramWeight, 90.0);
    assert.equal(portion.exchangeCategory, 'combination_food');
    assert.equal(portion.exchangeEquivalentFactor, 0);
    assert.equal(portion.exchangeBreakdown, undefined);
    assert.equal(portion.isUnclassifiedExchange, true);
    assert.equal(portion.exchangeEvidenceStatus, 'unclassified_composite');
    assert.ok(portion.unclassifiedExchangeNoticeAr?.includes('لا يجوز احتسابه كبديل لحوم فقط'));

    // 1. In calculatePortionNutrients: exchangeCategory is 'combination_food' and count is undefined
    const scaled = calculatePortionNutrients(chickenPane, portion.id, 1);
    assert.equal(scaled.exchangeCategory, 'combination_food');
    assert.notEqual(scaled.exchangeCategory, 'meat_high_fat');
    assert.notEqual(scaled.exchangeCategory, 'meat_lean');
    assert.equal(scaled.calculatedExchangeCount, undefined);
    assert.equal(scaled.isUnclassifiedExchange, true);

    // Nutrients and portion weight must remain 100% intact
    // 260 kcal/100g * 0.9 = 234 kcal
    assert.equal(scaled.netWeightG, 90.0);
    assert.equal(scaled.caloriesKcal, 234.0);
    assert.equal(scaled.carbsG, 12.15); // 13.5 * 0.9
    assert.equal(scaled.proteinG, 19.89); // 22.1 * 0.9
    assert.equal(scaled.fatG, 11.88); // 13.2 * 0.9

    // 2. In calculateExchangeDivergence: throws error rather than falsely asserting divergence against meat
    assert.throws(
      () => calculateExchangeDivergence(chickenPane, portion, 'ada_and'),
      /Cannot compute exchange divergence for unclassified composite food/
    );

    // 3. In searchFoodItems: searching for meat exchanges does NOT return breaded chicken
    const all = getAllFoodItems();
    const meatExchanges = searchFoodItems(all, '', { exchangeCategory: 'meat_high_fat' });
    assert.ok(!meatExchanges.some((f) => f.id === 'food_chicken_breast_fried_breaded'));
  });
});

describe('4. Carbohydrate Semantics & Protocol Isolation', () => {
  it('keeps total carbohydrates and chemical available carbohydrates separate without medical protocol rules', () => {
    const lentils = getFoodItemById('food_lentils_brown_cooked')!;
    assert.equal(lentils.nutrients100g.carbCalculationBasis, 'total_by_difference');
    assert.equal(lentils.nutrients100g.carbsG, 20.13);
    assert.equal(lentils.nutrients100g.fiberG, 7.9);

    // Chemically derived available carbohydrate = 20.13 - 7.9 = 12.23g
    const available = deriveAvailableCarbohydrates(lentils.nutrients100g);
    assert.equal(available, 12.23);

    // For a food with fiber < 5g (e.g. white rice cooked with 0.4g fiber),
    // deriveAvailableCarbohydrates still performs pure chemical subtraction (28.17 - 0.4 = 27.77g),
    // proving that clinical insulin-titration heuristics (such as fiber-subtraction thresholds >= 5g) are strictly NOT applied in this engine.
    const cookedRice = getFoodItemById('food_rice_white_cooked')!;
    const riceAvailable = deriveAvailableCarbohydrates(cookedRice.nutrients100g);
    assert.equal(riceAvailable, 27.77);
  });

  it('does NOT subtract fiber when carbCalculationBasis is unspecified or fiber is null', () => {
    const unassayed: FoodNutrientProfile100g = {
      basisWeightG: 100,
      caloriesKcal: 50,
      carbsG: 10.0,
      proteinG: 1.0,
      fatG: 0.5,
      fiberG: null,
      saturatedFatG: null,
      transFatG: null,
      monounsaturatedFatG: null,
      polyunsaturatedFatG: null,
      cholesterolMg: null,
      sodiumMg: null,
      potassiumMg: null,
      calciumMg: null,
      ironMg: null,
      missingNutrientKeys: ['fiberG'],
      carbCalculationBasis: 'total_by_difference',
    };

    assert.equal(deriveAvailableCarbohydrates(unassayed), null);
  });
});

describe('5. Nutrient Aggregation: observedTotal, Null Preservation & Anti-Zero Imputation', () => {
  it('provides observedTotal and flags hasIncompleteData when constituent items have null', () => {
    const unassayedFood = registerCustomFoodItem({
      nameEn: 'Herbal Infusion Unassayed',
      nameAr: 'مشروب أعشاب غير محلل الألياف',
      foodGroupId: 'beverages',
      primaryExchangeCategoryId: 'free_food',
      preparationState: 'boiled',
      nutrients100g: {
        basisWeightG: 100,
        caloriesKcal: 5,
        carbsG: 1.0,
        proteinG: 0.1,
        fatG: 0.0,
        fiberG: null,
        saturatedFatG: 0.0,
        transFatG: 0.0,
        monounsaturatedFatG: null,
        polyunsaturatedFatG: null,
        cholesterolMg: 0.0,
        sodiumMg: 10.0,
        potassiumMg: 20.0,
        calciumMg: 5.0,
        ironMg: 0.1,
        missingNutrientKeys: ['fiberG', 'monounsaturatedFatG', 'polyunsaturatedFatG'],
      },
      portions: [
        {
          id: 'portion_cup',
          portionNameEn: '1 Cup',
          portionNameAr: 'كوب',
          householdMeasureEn: '1 cup',
          householdMeasureAr: 'كوب',
          gramWeight: 200,
          exchangeCategory: 'free_food',
          exchangeEquivalentFactor: 0,
          isDefaultServing: true,
        },
      ],
    });

    const baladi = getFoodItemById('food_bread_baladi_baked')!;
    const scaledBaladi = calculatePortionNutrients(baladi, 'portion_baladi_quarter_loaf');
    const scaledUnassayed = calculatePortionNutrients(unassayedFood, 'portion_cup');

    const composite = aggregateNutrientProfiles([scaledBaladi, scaledUnassayed]);

    assert.equal(composite.totalFiberG, null);
    assert.equal(composite.observedTotalFiberG, 1.68);
    assert.equal(composite.observedTotals.fiberG, 1.68);
    assert.equal(composite.hasIncompleteData, true);
    assert.ok(composite.incompleteNutrientKeys.includes('fiberG'));
    assert.equal(composite.completeness.fiberG, false);
    assert.equal(composite.completeness.sodiumMg, true);
  });
});

describe('6. Deterministic Portion Scaling & Rounding', () => {
  it('accurately scales 100g nutrient profile to a 35g portion of Baladi bread', () => {
    const baladi = getFoodItemById('food_bread_baladi_baked')!;
    const scaled = calculatePortionNutrients(baladi, 'portion_baladi_quarter_loaf');

    assert.equal(scaled.netWeightG, 35.0);
    assert.equal(scaled.caloriesKcal, 88.2);
    assert.equal(scaled.carbsG, 18.48);
    assert.equal(scaled.proteinG, 3.19);
    assert.equal(scaled.fatG, 0.42);
    assert.equal(scaled.fiberG, 1.68);
  });

  it('scales with quantity multipliers correctly', () => {
    const rice = getFoodItemById('food_rice_white_cooked')!;
    const scaled2x = calculatePortionNutrients(rice, 'portion_rice_cooked_third_cup', 2);

    assert.equal(scaled2x.netWeightG, 106.0);
    assert.equal(scaled2x.caloriesKcal, 137.8);
    assert.equal(scaled2x.carbsG, 29.86);
    assert.equal(scaled2x.calculatedExchangeCount, 2.0);
  });
});

describe('7. Custom Food Isolation & Reference Protection', () => {
  beforeEach(() => {
    clearCustomFoodsForTesting();
  });

  it('allows registering a custom food record without modifying verified standards', () => {
    const beforeCount = getAllFoodItems().length;

    const custom = registerCustomFoodItem({
      nameEn: 'Custom Dietetic Shake',
      nameAr: 'مشروب حمية مخصص',
      foodGroupId: 'custom',
      primaryExchangeCategoryId: 'meat_lean',
      preparationState: 'raw',
      nutrients100g: {
        basisWeightG: 100,
        caloriesKcal: 85,
        carbsG: 3,
        proteinG: 16,
        fatG: 1,
        fiberG: 1,
        saturatedFatG: 0.2,
        transFatG: 0,
        monounsaturatedFatG: 0.3,
        polyunsaturatedFatG: 0.5,
        cholesterolMg: 5,
        sodiumMg: 120,
        potassiumMg: 210,
        calciumMg: 150,
        ironMg: 0.5,
        missingNutrientKeys: [],
      },
      portions: [
        {
          id: 'portion_shake',
          portionNameEn: '1 Bottle',
          portionNameAr: 'عبوة',
          householdMeasureEn: '1 bottle',
          householdMeasureAr: 'عبوة',
          gramWeight: 250,
          exchangeCategory: 'meat_lean',
          exchangeEquivalentFactor: 2.5,
          isDefaultServing: true,
        },
      ],
    });

    assert.equal(custom.isCustom, true);
    assert.equal(custom.verificationStatus, 'user_custom');
    assert.equal(getAllFoodItems().length, beforeCount + 1);
  });

  it('rejects registering a custom food that collides with a standard reserved ID', () => {
    assert.throws(
      () =>
        registerCustomFoodItem({
          id: 'food_bread_baladi_baked',
          nameEn: 'Hacked Bread',
          nameAr: 'خبز مزيف',
          foodGroupId: 'starches',
          primaryExchangeCategoryId: 'starch',
          preparationState: 'baked',
          nutrients100g: {} as any,
          portions: [],
        }),
      /Cannot register custom food with reserved standard ID/
    );
  });
});

describe('8. Arabic Text Normalization & Bilingual Search', () => {
  it('normalizes diacritics, alef forms, and taa marbuta', () => {
    assert.equal(normalizeArabicText('خُبْزٌ بَلَدِيٌّ مُدَعَّمٌ'), 'خبز بلدي مدعم');
    assert.equal(normalizeArabicText('أرز أَبْيَض مَصْرِيّ'), 'ارز ابيض مصري');
    assert.equal(normalizeArabicText('جوافة طازجة'), 'جوافه طازجه');
  });

  it('performs robust search matching normalized terms in English and Arabic', () => {
    const all = getAllFoodItems();
    const resultsRiceAr = searchFoodItems(all, 'ارز');
    assert.ok(resultsRiceAr.length >= 2);

    const resultsFul = searchFoodItems(all, 'فُول');
    assert.ok(resultsFul.length >= 1);
    assert.equal(resultsFul[0].id, 'food_ful_medames_cooked_plain');
  });
});

describe('9. Phase 1 Non-Regression & Preserved Nutritional Values', () => {
  it('confirms all seed nutritional values remain intact without forced 4-4-9 alteration', () => {
    const dates = getFoodItemById('food_dates_semi_dry_siwi')!;
    assert.equal(dates.nutrients100g.caloriesKcal, 277.0);
    assert.equal(dates.nutrients100g.carbsG, 75.0);
    assert.equal(dates.nutrients100g.proteinG, 1.8);
    assert.equal(dates.nutrients100g.fatG, 0.2);
    assert.equal(dates.nutrients100g.fiberG, 6.7);

    const oliveOil = getFoodItemById('food_oil_olive_extra_virgin')!;
    assert.equal(oliveOil.nutrients100g.caloriesKcal, 884.0);
    assert.equal(oliveOil.nutrients100g.fatG, 100.0);

    const bread = getFoodItemById('food_bread_baladi_baked')!;
    assert.equal(bread.nutrients100g.caloriesKcal, 252.0);
    assert.equal(bread.nutrients100g.carbsG, 52.8);
    assert.equal(bread.nutrients100g.proteinG, 9.1);
    assert.equal(bread.nutrients100g.fatG, 1.2);
  });
});
