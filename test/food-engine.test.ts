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
  searchFoodCatalog,
  deriveAvailableCarbohydrates,
  FoodNutrientProfile100g,
} from '../src/clinical/index';

describe('1. Provenance Separation, NNI Attribution & Recipe Classifications', () => {
  beforeEach(() => {
    clearCustomFoodsForTesting();
  });

  it('preserves internal codes while representing unissued NNI record IDs as undefined', () => {
    const items = getAllFoodItems();
    assert.ok(items.length >= 650, `Expected catalog >= 650 items, got ${items.length}`);

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

describe('10. Phase 4 Catalog Expansion & Cottage Cheese Verification', () => {
  it('confirms the expanded catalog contains >= 650 items with strictly unique IDs', () => {
    const allItems = getAllFoodItems();
    assert.ok(allItems.length >= 650, `Catalog has ${allItems.length} items`);

    const ids = new Set<string>();
    for (const item of allItems) {
      assert.ok(!ids.has(item.id), `Duplicate food ID detected: ${item.id}`);
      ids.add(item.id);
      assert.ok(item.nameAr && item.nameAr.length > 0);
      assert.ok(item.nameEn && item.nameEn.length > 0);
      assert.ok(item.portions && item.portions.length > 0);
      for (const p of item.portions) {
        assert.ok(p.gramWeight > 0, `Non-positive portion weight for ${item.id}: ${p.gramWeight}`);
      }
    }
  });

  it('verifies Egyptian Quraish cheese classification and multi-reference portions', () => {
    const quraish = getFoodItemById('food_cheese_quraish_egyptian')!;
    assert.ok(quraish, 'Egyptian Quraish cheese must exist in catalog');
    assert.equal(quraish.foodGroupId, 'meats', 'Quraish cheese must be classified under meats (Meat Substitutes)');
    assert.equal(quraish.primaryExchangeCategoryId, 'meat_lean', 'Quraish cheese primary exchange category must be meat_lean');

    // Portions: 50g clinic piece, 100g, 56g RegimePlan, 30g Image Guide
    const p50 = quraish.portions.find((p) => p.id === 'portion_quraish_piece');
    const p100 = quraish.portions.find((p) => p.id === 'portion_quraish_100g');
    const p56 = quraish.portions.find((p) => p.id === 'portion_quraish_quarter_cup_regimeplan');
    const p30 = quraish.portions.find((p) => p.id === 'portion_quraish_serving_image');

    assert.ok(p50, 'Standard 50g portion must exist');
    assert.equal(p50?.gramWeight, 50);
    assert.ok(p100, '100g portion must exist');
    assert.equal(p100?.gramWeight, 100);
    assert.ok(p56, 'RegimePlan 56g portion must exist');
    assert.equal(p56?.gramWeight, 56);
    assert.ok(p30, 'Exchange Guide 30g portion must exist');
    assert.equal(p30?.gramWeight, 30);

    // Documented discrepancy in notes
    assert.ok(quraish.notesAr?.includes('56') && quraish.notesAr?.includes('30'));
  });

  it('ensures unassayed micronutrients are preserved as null without zero imputation', () => {
    const allItems = getAllFoodItems();
    const regimePlanItems = allItems.filter((f) => f.sourceId === 'regimeplan_2026');
    assert.ok(regimePlanItems.length >= 600);

    // Verify unassayed nutrients are explicitly null and in missingNutrientKeys
    for (const item of regimePlanItems) {
      assert.equal(item.nutrients100g.availableCarbsG, null);
      assert.equal(item.nutrients100g.fiberG, null);
      assert.equal(item.nutrients100g.sodiumMg, null);
      assert.equal(item.nutrients100g.potassiumMg, null);
      assert.ok(item.nutrients100g.missingNutrientKeys.includes('fiberG'));
      assert.ok(item.nutrients100g.missingNutrientKeys.includes('sodiumMg'));
    }
  });

  it('verifies bilingual search across newly added foods in Arabic and English', () => {
    const allItems = getAllFoodItems();
    const soyMilkSearch = searchFoodItems(allItems, 'لبن صويا');
    assert.ok(soyMilkSearch.length >= 1, 'Should find soy milk in Arabic');

    const tortillaSearch = searchFoodItems(allItems, 'tortilla');
    assert.ok(tortillaSearch.length >= 1, 'Should find tortilla in English');

    const oatSearch = searchFoodItems(allItems, 'شوفان');
    assert.ok(oatSearch.length >= 1, 'Should find oat items in Arabic');
  });
});

describe('11. Catalog Integrity Repair & Analytical Composition Verification', () => {
  it('strictly validates Powdered Sugar (RP-ST-128) analytical composition and starch exchange', () => {
    const allItems = getAllFoodItems();
    const powderedSugar = allItems.find((f) => f.id === 'food_starch_rp_rp_st_128');
    assert.ok(powderedSugar, 'Powdered sugar must exist in the catalog');
    assert.equal(powderedSugar?.code, 'RP-ST-128');
    assert.equal(powderedSugar?.primaryExchangeCategoryId, 'starch');

    // 100g profile verification: ~389 kcal, 99.5g carbs, 0g protein, 0g fat
    const n100 = powderedSugar!.nutrients100g;
    assert.equal(n100.caloriesKcal, 389.0);
    assert.equal(n100.carbsG, 99.5);
    assert.equal(n100.proteinG, 0.0);
    assert.equal(n100.fatG, 0.0);
    assert.equal(n100.waterG, 0.5);

    // Serving portion verification: 15g serving
    const serving = powderedSugar!.portions.find((p) => p.isDefaultServing);
    assert.ok(serving, 'Default serving portion must exist');
    assert.equal(serving?.gramWeight, 15.0);
    assert.equal(serving?.exchangeCategory, 'starch');
    assert.equal(serving?.exchangeEquivalentFactor, 1);

    // Scaled nutrients for 15g portion
    const scaled = scaleNutrientProfile(n100, 15.0);
    assert.equal(scaled.caloriesKcal, 58.4);
    assert.equal(scaled.carbsG, 14.93); // 99.5 * 0.15 = 14.925 -> rounded to 2 decimal places
    assert.equal(scaled.proteinG, 0.0);
    assert.equal(scaled.fatG, 0.0);
  });

  it('verifies pure sugars, syrups, and starches have defensible analytical composition', () => {
    const allItems = getAllFoodItems();
    
    // Granulated sugar (RP-ST-121)
    const whiteSugar = allItems.find((f) => f.id === 'food_starch_rp_rp_st_121');
    assert.ok(whiteSugar);
    assert.equal(whiteSugar?.nutrients100g.carbsG, 100.0);
    assert.equal(whiteSugar?.nutrients100g.proteinG, 0.0);
    assert.equal(whiteSugar?.nutrients100g.fatG, 0.0);
    assert.equal(whiteSugar?.nutrients100g.caloriesKcal, 387.0);

    // Brown sugar (RP-ST-127)
    const brownSugar = allItems.find((f) => f.id === 'food_starch_rp_rp_st_127');
    assert.ok(brownSugar);
    assert.equal(brownSugar?.nutrients100g.carbsG, 98.1);
    assert.equal(brownSugar?.nutrients100g.proteinG, 0.1);
    assert.equal(brownSugar?.nutrients100g.fatG, 0.0);

    // Pure Bee Honey (RP-ST-122)
    const honey = allItems.find((f) => f.id === 'food_starch_rp_rp_st_122');
    assert.ok(honey);
    assert.equal(honey?.nutrients100g.carbsG, 82.4);
    assert.equal(honey?.nutrients100g.proteinG, 0.3);
    assert.equal(honey?.nutrients100g.fatG, 0.0);
    assert.equal(honey?.nutrients100g.caloriesKcal, 304.0);

    // Maple Syrup (RP-ST-123)
    const maple = allItems.find((f) => f.id === 'food_starch_rp_rp_st_123');
    assert.ok(maple);
    assert.equal(maple?.nutrients100g.carbsG, 67.0);
    assert.equal(maple?.nutrients100g.proteinG, 0.0);
    assert.equal(maple?.nutrients100g.fatG, 0.1);

    // Agave (RP-ST-124)
    const agave = allItems.find((f) => f.id === 'food_starch_rp_rp_st_124');
    assert.ok(agave);
    assert.equal(agave?.nutrients100g.carbsG, 76.4);
    assert.equal(agave?.nutrients100g.proteinG, 0.1);

    // Egyptian Black Honey / Molasses (RP-ST-125)
    const molasses = allItems.find((f) => f.id === 'food_starch_rp_rp_st_125');
    assert.ok(molasses);
    assert.equal(molasses?.nutrients100g.carbsG, 74.7);
    assert.equal(molasses?.nutrients100g.proteinG, 0.0);

    // Coconut Palm Sugar (RP-ST-126)
    const coconutSugar = allItems.find((f) => f.id === 'food_starch_rp_rp_st_126');
    assert.ok(coconutSugar);
    assert.equal(coconutSugar?.nutrients100g.carbsG, 93.4);
    assert.equal(coconutSugar?.nutrients100g.proteinG, 1.1);

    // Pomegranate Molasses (RP-ST-120)
    const pomeMolasses = allItems.find((f) => f.id === 'food_starch_rp_rp_st_120');
    assert.ok(pomeMolasses);
    assert.equal(pomeMolasses?.nutrients100g.carbsG, 65.0);
    assert.equal(pomeMolasses?.nutrients100g.proteinG, 0.0);

    // Cornstarch (RP-ST-071)
    const cornstarch = allItems.find((f) => f.id === 'food_starch_rp_rp_st_071');
    assert.ok(cornstarch);
    assert.equal(cornstarch?.nutrients100g.carbsG, 91.3);
    assert.equal(cornstarch?.nutrients100g.proteinG, 0.3);
    assert.equal(cornstarch?.nutrients100g.fatG, 0.1);

    // Potato Starch (RP-ST-081)
    const potatoStarch = allItems.find((f) => f.id === 'food_starch_rp_rp_st_081');
    assert.ok(potatoStarch);
    assert.equal(potatoStarch?.nutrients100g.carbsG, 83.1);
    assert.equal(potatoStarch?.nutrients100g.proteinG, 6.9);
    assert.equal(potatoStarch?.nutrients100g.fatG, 0.3);

    // Dry Roqaq Flatbread (RP-ST-020)
    const roqaq = allItems.find((f) => f.id === 'food_starch_rp_rp_st_020');
    assert.ok(roqaq);
    assert.equal(roqaq?.nutrients100g.carbsG, 76.5);
    assert.equal(roqaq?.nutrients100g.proteinG, 11.2);
    assert.equal(roqaq?.nutrients100g.fatG, 1.8);

    // Cornflakes (RP-ST-049)
    const cornflakes = allItems.find((f) => f.id === 'food_starch_rp_rp_st_049');
    assert.ok(cornflakes);
    assert.equal(cornflakes?.nutrients100g.carbsG, 84.0);
    assert.equal(cornflakes?.nutrients100g.proteinG, 7.5);
    assert.equal(cornflakes?.nutrients100g.fatG, 0.4);

    // Puffed Rice Cakes (RP-ST-104)
    const riceCakes = allItems.find((f) => f.id === 'food_starch_rp_rp_st_104');
    assert.ok(riceCakes);
    assert.equal(riceCakes?.nutrients100g.carbsG, 81.5);
    assert.equal(riceCakes?.nutrients100g.proteinG, 8.2);
    assert.equal(riceCakes?.nutrients100g.fatG, 2.8);
  });

  it('verifies Confectioneries in fruits category reflect authentic lipids and proteins', () => {
    const allItems = getAllFoodItems();
    
    // Hazelnut Cocoa Spread (RP-FR-008)
    const hazelnut = allItems.find((f) => f.id === 'food_fruit_rp_rp_fr_008');
    assert.ok(hazelnut);
    assert.equal(hazelnut?.nutrients100g.fatG, 30.9);
    assert.equal(hazelnut?.nutrients100g.proteinG, 6.0);
    assert.equal(hazelnut?.nutrients100g.caloriesKcal, 541.0);

    // Dark Chocolate 70% (RP-FR-002)
    const darkChoc = allItems.find((f) => f.id === 'food_fruit_rp_rp_fr_002');
    assert.ok(darkChoc);
    assert.equal(darkChoc?.nutrients100g.fatG, 42.6);
    assert.equal(darkChoc?.nutrients100g.proteinG, 7.8);
    assert.equal(darkChoc?.nutrients100g.caloriesKcal, 598.0);

    // Milk Chocolate (RP-FR-003)
    const milkChoc = allItems.find((f) => f.id === 'food_fruit_rp_rp_fr_003');
    assert.ok(milkChoc);
    assert.equal(milkChoc?.nutrients100g.fatG, 29.7);
    assert.equal(milkChoc?.nutrients100g.proteinG, 7.7);

    // Sesame Halva (RP-FR-012)
    const halva = allItems.find((f) => f.id === 'food_fruit_rp_rp_fr_012');
    assert.ok(halva);
    assert.equal(halva?.nutrients100g.fatG, 26.0);
    assert.equal(halva?.nutrients100g.proteinG, 12.0);

    // Almond Marzipan (RP-FR-007)
    const marzipan = allItems.find((f) => f.id === 'food_fruit_rp_rp_fr_007');
    assert.ok(marzipan);
    assert.equal(marzipan?.nutrients100g.fatG, 25.5);
    assert.equal(marzipan?.nutrients100g.proteinG, 8.5);

    // Corn Syrup (RP-FR-009)
    const cornSyrup = allItems.find((f) => f.id === 'food_fruit_rp_rp_fr_009');
    assert.ok(cornSyrup);
    assert.equal(cornSyrup?.nutrients100g.carbsG, 77.4);
    assert.equal(cornSyrup?.nutrients100g.proteinG, 0.0);
    assert.equal(cornSyrup?.nutrients100g.fatG, 0.0);
  });

  it('verifies Plant Milks reflect authentic analytical composition across variants', () => {
    const allItems = getAllFoodItems();
    
    // Unsweetened Almond Milk (RP-DA-016)
    const almondMilk = allItems.find((f) => f.id === 'food_dairy_rp_da_016');
    assert.ok(almondMilk);
    assert.equal(almondMilk?.nutrients100g.caloriesKcal, 15.0);
    assert.equal(almondMilk?.nutrients100g.carbsG, 0.3);
    assert.equal(almondMilk?.nutrients100g.proteinG, 0.6);
    assert.equal(almondMilk?.nutrients100g.fatG, 1.1);

    // Unsweetened Oat Milk (RP-DA-017)
    const oatMilk = allItems.find((f) => f.id === 'food_dairy_rp_da_017');
    assert.ok(oatMilk);
    assert.equal(oatMilk?.nutrients100g.caloriesKcal, 48.0);
    assert.equal(oatMilk?.nutrients100g.carbsG, 6.7);
    assert.equal(oatMilk?.nutrients100g.proteinG, 0.8);
    assert.equal(oatMilk?.nutrients100g.fatG, 1.5);

    // Unsweetened Soy Milk (RP-DA-018)
    const soyMilk = allItems.find((f) => f.id === 'food_dairy_rp_da_018');
    assert.ok(soyMilk);
    assert.equal(soyMilk?.nutrients100g.caloriesKcal, 33.0);
    assert.equal(soyMilk?.nutrients100g.carbsG, 1.7);
    assert.equal(soyMilk?.nutrients100g.proteinG, 2.8);
    assert.equal(soyMilk?.nutrients100g.fatG, 1.6);

    // Sweetened Almond Milk (RP-DA-026)
    const sweetAlmond = allItems.find((f) => f.id === 'food_dairy_rp_da_026');
    assert.ok(sweetAlmond);
    assert.equal(sweetAlmond?.nutrients100g.caloriesKcal, 30.0);
    assert.equal(sweetAlmond?.nutrients100g.carbsG, 3.4);

    // Sweetened Oat Milk (RP-DA-027)
    const sweetOat = allItems.find((f) => f.id === 'food_dairy_rp_da_027');
    assert.ok(sweetOat);
    assert.equal(sweetOat?.nutrients100g.caloriesKcal, 60.0);
    assert.equal(sweetOat?.nutrients100g.carbsG, 9.2);
  });

  it('ensures all pagination artifacts are eliminated and catalog has 676 valid items', () => {
    const allItems = getAllFoodItems();
    assert.equal(allItems.length, 676, 'Expected exactly 676 valid catalog records');

    const artifactItems = allItems.filter(
      (f) => f.nameAr.includes('صفحة') || f.nameEn.includes('صفحة')
    );
    assert.equal(artifactItems.length, 0, 'No pagination artifacts should remain in catalog');

    // Check specific purged IDs
    const purgedIds = ['food_meat_rp_mt_024', 'food_meat_rp_mt_076', 'food_meat_rp_mt_135', 'food_meat_rp_mt_197', 'food_fat_rp_ft_063'];
    for (const pid of purgedIds) {
      assert.strictEqual(allItems.find((f) => f.id === pid), undefined, `Artifact ID ${pid} must be removed`);
    }

    // Check unique IDs
    const idSet = new Set(allItems.map((f) => f.id));
    assert.equal(idSet.size, 676, 'All 676 items must have strictly unique IDs');

    // Check non-empty bilingual names
    for (const item of allItems) {
      assert.ok(item.nameEn && item.nameEn.trim().length > 0, `Item ${item.id} must have English name`);
      assert.ok(item.nameAr && item.nameAr.trim().length > 0, `Item ${item.id} must have Arabic name`);
    }

    // Check macro sums <= 100.5g
    for (const item of allItems) {
      const sum = (item.nutrients100g.carbsG || 0) + (item.nutrients100g.proteinG || 0) + (item.nutrients100g.fatG || 0);
      assert.ok(sum <= 100.5, `Item ${item.id} (${item.nameEn}) macro sum ${sum} must not exceed 100g`);
    }
  });

  it('validates Occasions food group items are present and searchable', () => {
    const allItems = getAllFoodItems();
    const occasionsItems = allItems.filter((f) => f.foodGroupId === 'occasions');
    assert.ok(occasionsItems.length >= 20, 'Occasions category should contain holiday and traditional foods');
    
    // Check traditional Eid Kahk exists
    const kahk = allItems.find((f) => f.nameAr.includes('كحك'));
    assert.ok(kahk, 'Eid Kahk should be present in catalog');
    assert.equal(kahk?.foodGroupId, 'occasions');
  });
});

describe('12. Phase 1 Critical Food Catalog & UI Integrity Repair', () => {
  it('strictly validates code and ID uniqueness across all catalog records', () => {
    const allItems = getAllFoodItems();
    assert.equal(allItems.length, 676);

    const idSet = new Set<string>();
    const codeSet = new Set<string>();

    for (const item of allItems) {
      assert.ok(item.id, 'Every food must have an ID');
      assert.strictEqual(idSet.has(item.id), false, `Duplicate food ID detected: ${item.id}`);
      idSet.add(item.id);

      if (item.code && item.code.trim()) {
        assert.strictEqual(codeSet.has(item.code), false, `Duplicate food code detected: ${item.code}`);
        codeSet.add(item.code);
      }
    }

    assert.equal(idSet.size, 676, 'Expected 676 unique food IDs');
    assert.equal(codeSet.size, 676, 'Expected 676 unique food codes');
  });

  it('verifies Pineapple and Kunafa codes are strictly disambiguated with stable IDs', () => {
    const allItems = getAllFoodItems();

    // Fresh Pineapple
    const pineapple = allItems.find((f) => f.id === 'food_fruit_rp_rp_st_019');
    assert.ok(pineapple, 'Pineapple record must exist with its stable ID');
    assert.equal(pineapple?.code, 'RP-FR-019', 'Pineapple code must be corrected to RP-FR-019');
    assert.equal(pineapple?.nameEn, 'Fresh Pineapple');

    // Kunafa dough
    const kunafa = allItems.find((f) => f.id === 'food_starch_rp_rp_st_019');
    assert.ok(kunafa, 'Kunafa dough record must exist with its stable ID');
    assert.equal(kunafa?.code, 'RP-ST-019', 'Kunafa dough must retain RP-ST-019');
    assert.equal(kunafa?.nameEn, 'Raw Kunafa Pastry Threads');

    // Cross-check: No collision
    assert.notEqual(pineapple?.code, kunafa?.code);
  });

  it('ensures confectionery products are not classified as fruit exchanges', () => {
    const allItems = getAllFoodItems();
    const confectioneryCodes = [
      'RP-FR-002', // Dark Chocolate 70%
      'RP-FR-003', // Milk Chocolate
      'RP-FR-007', // Almond Marzipan
      'RP-FR-008', // Hazelnut Cocoa Spread
      'RP-FR-012', // Sesame Halva
      'RP-FR-013', // Semi-Sweet Chocolate Chips
    ];

    for (const code of confectioneryCodes) {
      const item = allItems.find((f) => f.code === code);
      assert.ok(item, `Confectionery food ${code} must exist in catalog`);
      
      // Must not be primaryExchangeCategoryId: fruit
      assert.notEqual(item?.primaryExchangeCategoryId, 'fruit', `${code} must not have fruit primary exchange`);
      assert.equal(item?.primaryExchangeCategoryId, 'combination_food', `${code} must be combination_food`);
      assert.equal(item?.foodGroupId, 'occasions', `${code} should be grouped under occasions/sweets`);

      // Portion scaling check
      assert.ok(item?.portions && item.portions.length > 0);
      const defaultPortion = item.portions[0];
      assert.notEqual(defaultPortion.exchangeCategory, 'fruit', `${code} portion must not be fruit exchange`);
      assert.equal(defaultPortion.exchangeCategory, 'combination_food');
      assert.equal(defaultPortion.exchangeEquivalentFactor, 0);
      assert.equal(defaultPortion.isUnclassifiedExchange, true);
      assert.equal(defaultPortion.exchangeEvidenceStatus, 'unclassified_composite');

      // Scaled nutrients via calculation engine
      const scaled = calculatePortionNutrients(item, defaultPortion.id, 1);
      assert.notEqual(scaled.exchangeCategory, 'fruit');
      assert.equal(scaled.exchangeCategory, 'combination_food');
      assert.equal(scaled.isUnclassifiedExchange, true);
      assert.strictEqual(scaled.calculatedExchangeCount, undefined, 'Unclassified composite must not produce a nominal exchange count');
      assert.ok(scaled.caloriesKcal > 50, `${code} portion must preserve its authentic caloric content`);
    }
  });

  it('ensures Occasion foods are not globally assigned free_food and RP-OCC-001 calculates accurately', () => {
    const allItems = getAllFoodItems();
    const rpOccasions = allItems.filter((f) => f.code && f.code.startsWith('RP-OCC-'));
    assert.equal(rpOccasions.length, 36, 'Expected exactly 36 RP-OCC occasion items');

    for (const item of rpOccasions) {
      assert.notEqual(
        item.primaryExchangeCategoryId,
        'free_food',
        `Occasion item ${item.code} (${item.nameEn}) must not be primary free_food`
      );
      assert.notEqual(
        item.portions[0].exchangeCategory,
        'free_food',
        `Occasion item ${item.code} (${item.nameEn}) portion must not be free_food`
      );
      assert.equal(item.primaryExchangeCategoryId, 'combination_food');
      assert.equal(item.portions[0].isUnclassifiedExchange, true);
    }

    // Specific test for RP-OCC-001 (Ramadan Dates with Milk Drink)
    const datesMilk = allItems.find((f) => f.code === 'RP-OCC-001')!;
    assert.ok(datesMilk);
    const scaledPortion = calculatePortionNutrients(datesMilk, datesMilk.portions[0].id, 1);
    assert.equal(scaledPortion.netWeightG, 250);
    assert.equal(scaledPortion.caloriesKcal, 200.0, '250g serving must scale to exactly 200 kcal');
    assert.equal(scaledPortion.carbsG, 38.0, '250g serving must scale to exactly 38g carbs');
    assert.equal(scaledPortion.proteinG, 6.0, '250g serving must scale to exactly 6g protein');
    assert.equal(scaledPortion.fatG, 3.0, '250g serving must scale to exactly 3g fat');
    assert.notEqual(scaledPortion.exchangeCategory, 'free_food');
    assert.equal(scaledPortion.exchangeCategory, 'combination_food');
    assert.equal(scaledPortion.isUnclassifiedExchange, true);

    // Verify true free foods retain free_food exchange
    const lemon = allItems.find((f) => f.id === 'food_lemon_juice_fresh')!;
    assert.ok(lemon);
    assert.equal(lemon.primaryExchangeCategoryId, 'free_food');

    const karkadeh = allItems.find((f) => f.id === 'food_hibiscus_tea_karkadeh')!;
    assert.ok(karkadeh);
    assert.equal(karkadeh.primaryExchangeCategoryId, 'free_food');
  });

  it('validates catalog-wide consistency between nutrient fields and missingNutrientKeys', () => {
    const allItems = getAllFoodItems();
    const coreTrackedKeys = [
      'fiberG',
      'saturatedFatG',
      'transFatG',
      'monounsaturatedFatG',
      'polyunsaturatedFatG',
      'cholesterolMg',
      'sodiumMg',
      'potassiumMg',
      'calciumMg',
      'ironMg',
      'waterG',
    ];

    for (const item of allItems) {
      const nutrients = item.nutrients100g as Record<string, any>;
      const missingKeys = new Set(item.nutrients100g.missingNutrientKeys || []);

      for (const key of coreTrackedKeys) {
        const val = nutrients[key];
        const isDeclaredMissing = missingKeys.has(key);

        // Rule 1: A nutrient cannot have a numeric value and simultaneously appear in missingNutrientKeys
        if (typeof val === 'number') {
          assert.strictEqual(
            isDeclaredMissing,
            false,
            `Contradiction in ${item.id} (${item.code}): ${key} has numeric value ${val} but is in missingNutrientKeys`
          );
        }

        // Rule 2: If a nutrient is null or undefined, it must appear in missingNutrientKeys
        if (val === null || val === undefined) {
          assert.strictEqual(
            isDeclaredMissing,
            true,
            `Contradiction in ${item.id} (${item.code}): ${key} is null/undefined but NOT in missingNutrientKeys`
          );
        }
      }
    }

    // Specific regression check for food_hibiscus_tea_karkadeh
    const karkadeh = allItems.find((f) => f.id === 'food_hibiscus_tea_karkadeh')!;
    assert.ok(karkadeh);
    assert.strictEqual(karkadeh.nutrients100g.monounsaturatedFatG, null);
    assert.strictEqual(karkadeh.nutrients100g.polyunsaturatedFatG, null);
    assert.ok(karkadeh.nutrients100g.missingNutrientKeys.includes('monounsaturatedFatG'));
    assert.ok(karkadeh.nutrients100g.missingNutrientKeys.includes('polyunsaturatedFatG'));
  });

  it('strictly validates Powdered Sugar RP-ST-128 preserves waterG override and analytical profile', () => {
    const allItems = getAllFoodItems();
    const powderedSugar = allItems.find((f) => f.code === 'RP-ST-128');
    assert.ok(powderedSugar, 'Powdered sugar RP-ST-128 must exist');

    assert.equal(powderedSugar?.nutrients100g.caloriesKcal, 389.0);
    assert.equal(powderedSugar?.nutrients100g.carbsG, 99.5);
    assert.equal(powderedSugar?.nutrients100g.proteinG, 0.0);
    assert.equal(powderedSugar?.nutrients100g.fatG, 0.0);
    assert.equal(powderedSugar?.nutrients100g.waterG, 0.5, 'waterG must be preserved as 0.5');
    assert.strictEqual(
      powderedSugar?.nutrients100g.missingNutrientKeys.includes('waterG'),
      false,
      'waterG must NOT be in missingNutrientKeys when value is 0.5'
    );
  });

  it('validates nutritional plausibility across catalog: all nutrients are finite and non-negative, portion weights positive', () => {
    const allItems = getAllFoodItems();
    for (const item of allItems) {
      assert.ok(item.id, 'Food item must have valid ID');
      assert.ok(item.nutrients100g.basisWeightG > 0, `${item.id}: basisWeightG must be positive`);
      assert.ok(Number.isFinite(item.nutrients100g.caloriesKcal) && item.nutrients100g.caloriesKcal >= 0, `${item.id}: calories must be finite and >= 0`);
      assert.ok(Number.isFinite(item.nutrients100g.carbsG) && item.nutrients100g.carbsG >= 0, `${item.id}: carbs must be finite and >= 0`);
      assert.ok(Number.isFinite(item.nutrients100g.proteinG) && item.nutrients100g.proteinG >= 0, `${item.id}: protein must be finite and >= 0`);
      assert.ok(Number.isFinite(item.nutrients100g.fatG) && item.nutrients100g.fatG >= 0, `${item.id}: fat must be finite and >= 0`);

      // Verify portions
      assert.ok(item.portions.length > 0, `${item.id}: must have at least one portion`);
      for (const p of item.portions) {
        assert.ok(p.id, `${item.id}: portion must have ID`);
        assert.ok(Number.isFinite(p.gramWeight) && p.gramWeight > 0, `${item.id} portion ${p.id}: gramWeight must be finite and > 0`);
      }
    }
  });

  it('verifies custom food registration dynamically updates catalog search without mutating standard items', () => {
    const initialCount = getAllFoodItems().length;
    const testCustom = registerCustomFoodItem({
      nameEn: 'QA Test Nutrient Fortified Smoothie',
      nameAr: 'سموذي تجريبي مدعم سريرياً',
      foodGroupId: 'occasions',
      primaryExchangeCategoryId: 'combination_food',
      preparationState: 'ready-to-eat',
      nutrients100g: {
        basisWeightG: 100,
        caloriesKcal: 110,
        carbsG: 18,
        proteinG: 4,
        fatG: 2,
        fiberG: 2,
        saturatedFatG: null,
        transFatG: null,
        monounsaturatedFatG: null,
        polyunsaturatedFatG: null,
        cholesterolMg: null,
        sodiumMg: 35,
        potassiumMg: null,
        calciumMg: null,
        ironMg: null,
        missingNutrientKeys: ['saturatedFatG', 'transFatG', 'monounsaturatedFatG', 'polyunsaturatedFatG', 'cholesterolMg', 'potassiumMg', 'calciumMg', 'ironMg'],
      },
      portions: [{
        id: 'portion_qa_test_smoothie',
        portionNameEn: '1 Glass (~250g)',
        portionNameAr: 'كوب (~250 جم)',
        householdMeasureEn: '1 glass',
        householdMeasureAr: 'كوب',
        gramWeight: 250,
        exchangeCategory: 'combination_food',
        exchangeEquivalentFactor: 0,
        isDefaultServing: true,
      }],
      tags: ['smoothie', 'qa_test'],
    });

    try {
      assert.equal(getAllFoodItems().length, initialCount + 1, 'Catalog length must increase by exactly 1');
      const searchResEn = searchFoodCatalog('Fortified Smoothie');
      assert.ok(searchResEn.some((f) => f.id === testCustom.id), 'Search by English name must find custom food');
      const searchResAr = searchFoodCatalog('سموذي تجريبي');
      assert.ok(searchResAr.some((f) => f.id === testCustom.id), 'Search by Arabic name must find custom food');
    } finally {
      clearCustomFoodsForTesting();
      assert.equal(getAllFoodItems().length, initialCount, 'teardown must restore exact standard catalog count');
    }
  });
});



