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
  DATA_SOURCES,
  registerCustomFoodItem,
  clearCustomFoodsForTesting,
  scaleNutrientProfile,
  hasAnalyticalMacros,
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
  FoodItemRecord,
} from '../src/clinical/index';
import { resolveRecallEntry, aggregateRecallEntries } from '../src/clinical/recall/recall-engine';

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

  it('ensures exchange_only items preserve null macros & micronutrients without zero or exchange-macro imputation', () => {
    const allItems = getAllFoodItems();
    const regimePlanItems = allItems.filter((f) => f.sourceId === 'regimeplan_2026');
    const analyticalOrReviewedItems = allItems.filter(
      (f) => f.sourceId === 'usda_fdc' || f.sourceId === 'egyptian_nni_2006' || f.sourceId === 'clinic_reviewed'
    );
    assert.equal(regimePlanItems.length, 117, `Expected strictly 117 exchange_only items, got ${regimePlanItems.length}`);
    assert.equal(analyticalOrReviewedItems.length, 559, `Expected 559 analytical/reviewed items, got ${analyticalOrReviewedItems.length}`);

    // Verify all 4 macros, availableCarbsG, and micronutrients are strictly null on exchange_only items
    for (const item of regimePlanItems) {
      assert.equal(item.compositionBasis, 'exchange_only');
      assert.equal(item.nutrients100g.caloriesKcal, null);
      assert.equal(item.nutrients100g.carbsG, null);
      assert.equal(item.nutrients100g.proteinG, null);
      assert.equal(item.nutrients100g.fatG, null);
      assert.equal(item.nutrients100g.availableCarbsG, null);
      assert.equal(item.nutrients100g.fiberG, null);
      assert.equal(item.nutrients100g.sodiumMg, null);
      assert.equal(item.nutrients100g.potassiumMg, null);
      assert.ok(item.nutrients100g.missingNutrientKeys.includes('caloriesKcal'));
      assert.ok(item.nutrients100g.missingNutrientKeys.includes('carbsG'));
      assert.ok(item.nutrients100g.missingNutrientKeys.includes('proteinG'));
      assert.ok(item.nutrients100g.missingNutrientKeys.includes('fatG'));
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

    // Check macro sums <= 100.5g for items with assayed macros (and nulls for exchange_only)
    for (const item of allItems) {
      if (item.compositionBasis === 'exchange_only') {
        assert.equal(item.nutrients100g.caloriesKcal, null);
        assert.equal(item.nutrients100g.carbsG, null);
        assert.equal(item.nutrients100g.proteinG, null);
        assert.equal(item.nutrients100g.fatG, null);
      } else {
        const sum = (item.nutrients100g.carbsG || 0) + (item.nutrients100g.proteinG || 0) + (item.nutrients100g.fatG || 0);
        assert.ok(sum <= 100.5, `Item ${item.id} (${item.nameEn}) macro sum ${sum} must not exceed 100g`);
      }
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
      assert.ok(scaled.caloriesKcal !== null && scaled.caloriesKcal > 50, `${code} portion must preserve its authentic caloric content`);
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

  it('validates nutritional plausibility across catalog: assayed nutrients are finite and non-negative, exchange_only remain null', () => {
    const allItems = getAllFoodItems();
    for (const item of allItems) {
      assert.ok(item.id, 'Food item must have valid ID');
      assert.ok(item.nutrients100g.basisWeightG > 0, `${item.id}: basisWeightG must be positive`);
      if (item.compositionBasis === 'exchange_only') {
        assert.equal(item.nutrients100g.caloriesKcal, null, `${item.id}: exchange_only calories must be null`);
        assert.equal(item.nutrients100g.carbsG, null, `${item.id}: exchange_only carbs must be null`);
        assert.equal(item.nutrients100g.proteinG, null, `${item.id}: exchange_only protein must be null`);
        assert.equal(item.nutrients100g.fatG, null, `${item.id}: exchange_only fat must be null`);
      } else {
        assert.ok(item.nutrients100g.caloriesKcal !== null && Number.isFinite(item.nutrients100g.caloriesKcal) && item.nutrients100g.caloriesKcal >= 0, `${item.id}: calories must be finite and >= 0`);
        assert.ok(item.nutrients100g.carbsG !== null && Number.isFinite(item.nutrients100g.carbsG) && item.nutrients100g.carbsG >= 0, `${item.id}: carbs must be finite and >= 0`);
        assert.ok(item.nutrients100g.proteinG !== null && Number.isFinite(item.nutrients100g.proteinG) && item.nutrients100g.proteinG >= 0, `${item.id}: protein must be finite and >= 0`);
        assert.ok(item.nutrients100g.fatG !== null && Number.isFinite(item.nutrients100g.fatG) && item.nutrients100g.fatG >= 0, `${item.id}: fat must be finite and >= 0`);
      }

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

  it('asserts deterministic master catalog partition across all 8 modules totaling 676 items', () => {
    const all = getAllFoodItems();
    assert.equal(all.length, 676, 'Standard compiled catalog must contain exactly 676 items');

    const groupCounts: Record<string, number> = {};
    for (const item of all) {
      groupCounts[item.foodGroupId] = (groupCounts[item.foodGroupId] || 0) + 1;
    }

    assert.equal(groupCounts['starches'], 133, 'Starches module must contain exactly 133 items');
    assert.equal(groupCounts['fruits'], 60, 'Fruits module (excluding 6 confectionery items) must contain exactly 60 items');
    assert.equal(groupCounts['occasions'], 42, 'Occasions group (36 occasion items + 6 reclassified confectionery) must contain exactly 42 items');
    assert.equal(groupCounts['free_foods'], 2, 'Free foods group (original lemon & karkadeh) must contain exactly 2 items');
    assert.equal(groupCounts['dairy'], 31, 'Dairy module must contain exactly 31 items');
    assert.equal(groupCounts['vegetables'], 91, 'Vegetables module must contain exactly 91 items');
    assert.equal(groupCounts['legumes'], 31, 'Legumes module must contain exactly 31 items');
    assert.equal(groupCounts['meats'], 200, 'Meats module must contain exactly 200 items');
    assert.equal(groupCounts['fats'], 86, 'Fats module must contain exactly 86 items');
  });

  it('enforces portion ID uniqueness, missingNutrientKeys deduplication, and accurate provenance separation', () => {
    const all = getAllFoodItems();
    const globalPortionIds = new Set<string>();

    assert.equal(DATA_SOURCES.clinic_reviewed.isStandardReference, false);
    assert.equal(
      DATA_SOURCES.clinic_reviewed.citation.toLowerCase().includes('laboratory'),
      false,
      'clinic_reviewed provenance must not claim laboratory assay verification'
    );

    for (const item of all) {
      assert.ok(DATA_SOURCES[item.sourceId], `${item.id}: sourceId "${item.sourceId}" must exist in DATA_SOURCES`);

      // Exchange-list items from RegimePlan must not masquerade as verified_standard institutional assays
      if (item.sourceId === 'regimeplan_2026') {
        assert.equal(
          item.verificationStatus,
          'clinic_reviewed',
          `${item.id}: RegimePlan item must carry clinic_reviewed status, not verified_standard`
        );
      }

      // No duplicate missingNutrientKeys
      const missingList = item.nutrients100g.missingNutrientKeys || [];
      assert.equal(
        new Set(missingList).size,
        missingList.length,
        `${item.id}: missingNutrientKeys must not contain duplicate entries`
      );

      // Unique portion IDs globally and per-item
      const localPortionIds = new Set<string>();
      for (const p of item.portions) {
        assert.strictEqual(localPortionIds.has(p.id), false, `${item.id}: duplicate local portion ID ${p.id}`);
        assert.strictEqual(globalPortionIds.has(p.id), false, `Global duplicate portion ID ${p.id} in ${item.id}`);
        localPortionIds.add(p.id);
        globalPortionIds.add(p.id);

        if (item.code?.startsWith('RP-OCC-')) {
          assert.equal(
            (p.unclassifiedExchangeNoticeEn || '').toLowerCase().includes('exact analytical'),
            false,
            `${item.id}: recipe-estimated occasion item must not claim exact analytical nutrients`
          );
        }
      }
    }
  });
});

describe('13. Critical Analytical Composition & Exchange Classification Separation', () => {
  it('verifies nutrient scaling depends purely on nutrients100g and is independent of exchange classification', () => {
    const rawPeanuts = getFoodItemById('food_fat_rp_ft_082')!;
    assert.ok(rawPeanuts, 'Raw peanuts (RP-FT-082) must exist');

    // Clone with altered exchange classification & zero factor (must NOT affect calorie/macro scaling)
    const mutatedExchangeFood: FoodItemRecord = {
      ...rawPeanuts,
      primaryExchangeCategoryId: 'combination_food',
      portions: [
        {
          ...rawPeanuts.portions[0],
          exchangeCategory: 'combination_food',
          exchangeEquivalentFactor: 0,
          isUnclassifiedExchange: true,
          unclassifiedExchangeNoticeEn: 'Reclassified synthetic test',
        },
      ],
    };

    const origPortion = calculatePortionNutrients(rawPeanuts, rawPeanuts.portions[0].id, 1);
    const alteredPortion = calculatePortionNutrients(mutatedExchangeFood, mutatedExchangeFood.portions[0].id, 1);

    assert.equal(alteredPortion.caloriesKcal, origPortion.caloriesKcal);
    assert.equal(alteredPortion.proteinG, origPortion.proteinG);
    assert.equal(alteredPortion.carbsG, origPortion.carbsG);
    assert.equal(alteredPortion.fatG, origPortion.fatG);
    assert.equal(alteredPortion.calculatedExchangeCount, undefined);
    assert.equal(alteredPortion.isUnclassifiedExchange, true);

    // Custom grams scaling must also propagate unclassified flags while preserving exact 100g-based scaling
    const customScaled = calculateCustomGramsNutrients(mutatedExchangeFood, 25);
    const expected25g = scaleNutrientProfile(rawPeanuts.nutrients100g, 25);
    assert.equal(customScaled.caloriesKcal, expected25g.caloriesKcal);
    assert.equal(customScaled.proteinG, expected25g.proteinG);
    assert.equal(customScaled.carbsG, expected25g.carbsG);
    assert.equal(customScaled.fatG, expected25g.fatG);
    assert.equal(customScaled.isUnclassifiedExchange, true);
    assert.equal(customScaled.calculatedExchangeCount, undefined);
  });

  it('verifies nuts, seeds, spreads, and cheeses in Fats carry authentic analytical composition without FAT_MACRO distortion', () => {
    const peanutsRaw = getFoodItemById('food_fat_rp_ft_082')!;
    const peanutsRoasted = getFoodItemById('food_fat_rp_ft_081')!;
    const peanutsSalted = getFoodItemById('food_fat_rp_ft_080')!;
    const almondsRaw = getFoodItemById('food_fat_rp_ft_033')!;
    const almondsRoasted = getFoodItemById('food_fat_rp_ft_032')!;
    const peanutButter = getFoodItemById('food_fat_rp_ft_035')!;
    const tahini = getFoodItemById('food_fat_rp_ft_014')!;
    const sesameSeeds = getFoodItemById('food_fat_rp_ft_010')!;
    const chiaSeeds = getFoodItemById('food_fat_rp_ft_012')!;
    const fetaInFats = getFoodItemById('food_fat_rp_ft_028')!;
    const cheddarInFats = getFoodItemById('food_fat_rp_ft_025')!;

    for (const item of [
      peanutsRaw, peanutsRoasted, peanutsSalted, almondsRaw, almondsRoasted,
      peanutButter, tahini, sesameSeeds, chiaSeeds, fetaInFats, cheddarInFats,
    ]) {
      assert.ok(item, 'Repaired fats-group record must exist');
      assert.ok(item.nutrients100g.caloriesKcal !== null && item.nutrients100g.caloriesKcal < 850, `${item.code} must not carry 900 kcal pure-oil distortion`);
      assert.ok(item.nutrients100g.proteinG !== null && item.nutrients100g.proteinG > 0, `${item.code} must carry non-zero protein`);
      assert.ok(item.nutrients100g.carbsG !== null && item.nutrients100g.carbsG > 0, `${item.code} must carry non-zero carbohydrates`);
      assert.equal(item.portions[0].exchangeCategory, 'fat', `${item.code} keeps its fat exchange classification`);
    }

    // Specific analytical profiles (USDA SR Legacy verified)
    assert.equal(peanutsRaw.sourceId, 'usda_fdc');
    assert.equal(peanutsRaw.sourceRecordId, '16087');
    assert.equal(peanutsRaw.nutrients100g.caloriesKcal, 567.0);
    assert.equal(peanutsRaw.nutrients100g.proteinG, 25.8);
    assert.equal(peanutsRaw.nutrients100g.carbsG, 16.1);
    assert.equal(peanutsRaw.nutrients100g.fatG, 49.2);

    // Distinct raw vs roasted vs salted peanut sodium/calorie variants
    assert.ok((peanutsSalted.nutrients100g.sodiumMg || 0) > (peanutsRaw.nutrients100g.sodiumMg || 0) * 10);
    assert.notEqual(peanutsRaw.nutrients100g.caloriesKcal, peanutsRoasted.nutrients100g.caloriesKcal);

    // 10g raw peanuts must scale cleanly to ~56.7 kcal, 2.58g protein, 1.61g carbs, 4.92g fat (not 45 kcal / 0P / 0C!)
    const scaledPeanut = calculatePortionNutrients(peanutsRaw, peanutsRaw.portions[0].id, 1);
    assert.equal(scaledPeanut.netWeightG, 10);
    assert.equal(scaledPeanut.caloriesKcal, 56.7);
    assert.equal(scaledPeanut.proteinG, 2.58);
    assert.equal(scaledPeanut.carbsG, 1.61);
    assert.equal(scaledPeanut.fatG, 4.92);
    assert.equal(scaledPeanut.calculatedExchangeCount, 1);

    // Pure oils retain genuine ~884 kcal / 100g fat profiles
    const oliveOil = getFoodItemById('food_fat_rp_ft_067')!;
    const avocadoOil = getFoodItemById('food_fat_rp_ft_065')!;
    assert.equal(oliveOil.sourceId, 'usda_fdc');
    assert.equal(oliveOil.nutrients100g.caloriesKcal, 884.0);
    assert.equal(oliveOil.nutrients100g.fatG, 100.0);
    assert.equal(oliveOil.nutrients100g.proteinG, 0.0);
    assert.equal(oliveOil.nutrients100g.carbsG, 0.0);
    assert.equal(avocadoOil.nutrients100g.caloriesKcal, 884.0);
    assert.equal(avocadoOil.nutrients100g.fatG, 100.0);
  });

  it('verifies multi-category analytical repairs across Dairy, Legumes, Vegetables, Starches, Fruits, and Meats', () => {
    // Dairy: Nonfat dry milk powder (RP-DA-013) & Nonfat Greek yogurt (RP-DA-015)
    const skimMilkPowder = getFoodItemById('food_dairy_rp_da_013')!;
    assert.equal(skimMilkPowder.sourceId, 'usda_fdc');
    assert.ok(skimMilkPowder.nutrients100g.fatG !== null && skimMilkPowder.nutrients100g.fatG < 1.5, 'Skim milk powder must not have whole-milk 8.7g fat');
    assert.ok(skimMilkPowder.nutrients100g.proteinG !== null && skimMilkPowder.nutrients100g.proteinG >= 35);

    const nonfatGreek = getFoodItemById('food_dairy_rp_da_015')!;
    assert.ok(nonfatGreek.nutrients100g.proteinG !== null && nonfatGreek.nutrients100g.proteinG >= 10.0, 'Nonfat Greek yogurt must reflect concentrated protein');

    // Legumes: Soybeans (RP-LEG-006) & Edamame (RP-LEG-011)
    const soybeans = getFoodItemById('food_legume_rp_leg_006')!;
    assert.equal(soybeans.sourceId, 'usda_fdc');
    assert.ok(soybeans.nutrients100g.fatG !== null && soybeans.nutrients100g.fatG >= 8.0 && soybeans.nutrients100g.proteinG !== null && soybeans.nutrients100g.proteinG >= 15.0);

    // Vegetables: Low-gram leafy greens (Arugula RP-VG-036, Spinach RP-VG-007) & sun-dried tomatoes (RP-VG-079)
    const arugula = getFoodItemById('food_veg_rp_rp_vg_036')!;
    const spinach = getFoodItemById('food_veg_rp_rp_vg_007')!;
    const sunDriedTomato = getFoodItemById('food_veg_rp_rp_vg_079')!;
    assert.ok(arugula.nutrients100g.caloriesKcal !== null && arugula.nutrients100g.caloriesKcal <= 30, 'Arugula must not carry 140 kcal/100g distortion');
    assert.ok(spinach.nutrients100g.caloriesKcal !== null && spinach.nutrients100g.caloriesKcal <= 30, 'Spinach must not carry 93.3 kcal/100g distortion');
    assert.ok(sunDriedTomato.nutrients100g.carbsG !== null && sunDriedTomato.nutrients100g.carbsG > 50);

    // Starches: Sweetened condensed milk (RP-ST-116), Teriyaki (RP-ST-118), BBQ (RP-ST-119)
    const condensedMilk = getFoodItemById('food_starch_rp_rp_st_116')!;
    assert.equal(condensedMilk.sourceId, 'usda_fdc');
    assert.ok(condensedMilk.nutrients100g.fatG !== null && condensedMilk.nutrients100g.fatG > 8 && condensedMilk.nutrients100g.proteinG !== null && condensedMilk.nutrients100g.proteinG > 7);

    // Fruits: Medjool dates (RP-FR-014) & Raisins (RP-FR-021)
    const medjool = getFoodItemById('food_fruit_rp_rp_fr_014')!;
    assert.equal(medjool.sourceId, 'usda_fdc');
    assert.equal(medjool.nutrients100g.caloriesKcal, 277.0);
    assert.equal(medjool.nutrients100g.fiberG, 6.7);

    // Meats: TVP (RP-MT-118), Boiled egg (RP-MT-191), Breaded chicken (RP-MT-165), Feta (RP-MT-184), Firm tofu (RP-MT-179)
    const tvp = getFoodItemById('food_meat_rp_mt_118')!;
    const boiledEgg = getFoodItemById('food_meat_rp_mt_191')!;
    const breadedChicken = getFoodItemById('food_meat_rp_mt_165')!;
    const fetaMeat = getFoodItemById('food_meat_rp_mt_184')!;
    const firmTofu = getFoodItemById('food_meat_rp_mt_179')!;

    assert.ok(tvp.nutrients100g.carbsG !== null && tvp.nutrients100g.carbsG > 30 && tvp.nutrients100g.fatG !== null && tvp.nutrients100g.fatG < 3);
    assert.ok(boiledEgg.nutrients100g.carbsG !== null && boiledEgg.nutrients100g.carbsG > 0.5 && boiledEgg.nutrients100g.fatG !== null && boiledEgg.nutrients100g.fatG < 12);
    assert.ok(breadedChicken.nutrients100g.carbsG !== null && breadedChicken.nutrients100g.carbsG > 10);
    assert.ok(fetaMeat.nutrients100g.carbsG !== null && fetaMeat.nutrients100g.carbsG > 2);
    assert.ok(firmTofu.nutrients100g.carbsG !== null && firmTofu.nutrients100g.carbsG > 1 && firmTofu.nutrients100g.fatG !== null && firmTofu.nutrients100g.fatG < 12);
  });

  it('finds PDF CMap-affected Arabic foods cleanly via normalized bilingual search tags', () => {
    const all = getAllFoodItems();
    for (const query of ['سوداني', 'لوز', 'طحينة', 'سمسم', 'مكسرات', 'حمص', 'طعمية', 'جمبري', 'سلمون', 'Peanut']) {
      const results = searchFoodItems(all, query);
      assert.ok(results.length >= 1, `Search query "${query}" must match at least one item`);
    }
  });

  it('propagates repaired analytical macros through 24-Hour Dietary Recall entries and meal totals', () => {
    const peanutsRaw = getFoodItemById('food_fat_rp_ft_082')!;
    const almondsRaw = getFoodItemById('food_fat_rp_ft_033')!;
    const tahini = getFoodItemById('food_fat_rp_ft_014')!;

    // Add 3x portion (30g) raw peanuts + 2x portion (22g) almonds + 1x portion (9g) tahini
    const entry1 = resolveRecallEntry({
      food: peanutsRaw,
      selectedPortionId: peanutsRaw.portions[0].id,
      quantity: 3, // 30g
    });
    const entry2 = resolveRecallEntry({
      food: almondsRaw,
      selectedPortionId: almondsRaw.portions[0].id,
      quantity: 2, // 22g
    });
    const entry3 = resolveRecallEntry({
      food: tahini,
      selectedPortionId: tahini.portions[0].id,
      quantity: 1, // 9g
    });

    const summary = aggregateRecallEntries([entry1, entry2, entry3]);
    assert.ok(summary.proteinG.observedTotal > 10, `Expected combined nut/seed snack protein > 10g, got ${summary.proteinG.observedTotal}`);
    assert.ok(summary.carbsG.observedTotal > 8, `Expected combined nut/seed snack carbs > 8g, got ${summary.carbsG.observedTotal}`);
    assert.ok(summary.fiberG.observedTotal !== null && summary.fiberG.observedTotal > 4, 'Complete fiber data should aggregate cleanly without null');
    assert.ok(summary.caloriesKcal.observedTotal > 300 && summary.caloriesKcal.observedTotal < 450);
  });
});

describe('14. Release-Gate USDA Provenance & Preparation State Integrity', () => {
  it('ensures corrected USDA NDB identifiers match verified food identities', () => {
    const oats = getFoodItemById('food_oats_rolled_cooked')!;
    assert.equal(oats.sourceId, 'usda_fdc');
    assert.equal(oats.sourceRecordId, '08121');

    const avocadoOil = getFoodItemById('food_fat_rp_ft_065')!;
    assert.equal(avocadoOil.sourceId, 'usda_fdc');
    assert.equal(avocadoOil.sourceRecordId, '04581');

    const blackBeans = getFoodItemById('food_legume_rp_leg_004')!;
    assert.equal(blackBeans.sourceId, 'usda_fdc');
    assert.equal(blackBeans.sourceRecordId, '16015');

    const flankSteak = getFoodItemById('food_beef_flank_lean_cooked')!;
    assert.equal(flankSteak.sourceId, 'usda_fdc');
    assert.equal(flankSteak.sourceRecordId, '23654');

    const firmTofu = getFoodItemById('food_meat_rp_mt_179')!;
    assert.equal(firmTofu.sourceId, 'usda_fdc');
    assert.equal(firmTofu.sourceRecordId, '16426');
  });

  it('downgrades unverified commercial-label or conflicting USDA claims to clinic_reviewed without sourceRecordId', () => {
    for (const id of ['food_fat_rp_ft_064', 'food_meat_rp_mt_177', 'food_meat_rp_mt_161']) {
      const rec = getFoodItemById(id)!;
      assert.ok(rec, `Missing ${id}`);
      assert.equal(rec.sourceId, 'clinic_reviewed');
      assert.equal(rec.verificationStatus, 'clinic_reviewed');
      assert.equal(rec.sourceRecordId, undefined);
    }
  });

  it('ensures raw egg white and egg yolk records declare preparationState=raw', () => {
    const eggWhite = getFoodItemById('food_meat_rp_mt_122')!;
    assert.equal(eggWhite.preparationState, 'raw');

    const eggYolk = getFoodItemById('food_meat_rp_mt_166')!;
    assert.equal(eggYolk.preparationState, 'raw');
  });

  it('ensures dry Chickpea Flour (RP-MT-016) is raw, dry TVP (RP-MT-118) is dried, and no catalog item uses a bare prep-only English name', () => {
    const besanMeat = getFoodItemById('food_meat_rp_mt_016')!;
    assert.equal(besanMeat.preparationState, 'raw');

    const dryTvp = getFoodItemById('food_meat_rp_mt_118')!;
    assert.equal(dryTvp.preparationState, 'dried');

    const flaxOil = getFoodItemById('food_flaxseed_oil_zait_har')!;
    assert.ok(flaxOil);
    assert.equal(flaxOil.nutrients100g.caloriesKcal, 884);
    assert.equal(flaxOil.nutrients100g.fatG, 100);
    assert.equal(flaxOil.nutrients100g.proteinG, 0);
    assert.equal(flaxOil.nutrients100g.carbsG, 0);

    const prepOnlyWords = new Set(['raw', 'cooked', 'boiled', 'grilled', 'baked', 'roasted', 'fried', 'canned', 'dried', 'smoked', 'minced', 'ground', '/', 'skinless']);
    const all = getAllFoodItems();
    for (const item of all) {
      const words = item.nameEn.toLowerCase().split(/\s+/).filter(Boolean);
      assert.equal(words.every((w) => prepOnlyWords.has(w)), false, `${item.code}: nameEn "${item.nameEn}" must include food noun`);
      assert.equal(item.nameEn.includes('Meat Product ('), false, `${item.code}: must have proper English translation, got "${item.nameEn}"`);
    }

    // Searchable in English for newly translated seafood & poultry cuts
    assert.ok(searchFoodCatalog('cod').some((f) => f.code === 'RP-MT-051'));
    assert.ok(searchFoodCatalog('kofta').some((f) => f.code === 'RP-MT-173'));
    assert.ok(searchFoodCatalog('lobster').some((f) => f.code === 'RP-MT-091'));
  });
});

describe('15. Exchange-Only Null Propagation & Integrity Repair Gate', () => {
  it('enforces strict separation between compositionBasis=exchange_only and assayed records', () => {
    const all = getAllFoodItems();
    for (const item of all) {
      if (item.sourceId === 'regimeplan_2026') {
        assert.equal(item.compositionBasis, 'exchange_only', `${item.code} regimeplan_2026 must be exchange_only`);
        assert.equal(hasAnalyticalMacros(item.nutrients100g), false);
      } else {
        assert.notEqual(item.compositionBasis, 'exchange_only', `${item.code} non-regimeplan item cannot be exchange_only`);
        assert.equal(hasAnalyticalMacros(item.nutrients100g), true, `${item.code} assayed item must have complete finite macros`);
      }
    }

    // Spot-check freshly promoted USDA SR items (leek, brown shami, skinless chicken breast, lima beans, sweet cherries)
    const chickenBreast = getFoodItemById('food_meat_rp_mt_013')!;
    assert.equal(chickenBreast.sourceId, 'usda_fdc');
    assert.equal(chickenBreast.sourceRecordId, '05062');
    assert.equal(chickenBreast.compositionBasis, 'analytical_table');

    const freshOrange = getFoodItemById('food_fruit_rp_rp_fr_015')!;
    assert.equal(freshOrange.sourceId, 'usda_fdc');
    assert.equal(freshOrange.sourceRecordId, '09200');
    assert.equal(freshOrange.compositionBasis, 'analytical_table');
  });

  it('preserves null macros across scaling, mixed composite aggregation, carb derivation, and rejects exchange divergence', () => {
    const finoBread = getFoodItemById('food_starch_rp_rp_st_007')!; // exchange_only
    const chickenBreast = getFoodItemById('food_meat_rp_mt_013')!; // USDA 05062

    const scaledEx = scaleNutrientProfile(finoBread.nutrients100g, 27);
    assert.equal(scaledEx.caloriesKcal, null);
    assert.equal(scaledEx.carbsG, null);
    assert.equal(scaledEx.proteinG, null);
    assert.equal(scaledEx.fatG, null);
    assert.equal(scaledEx.fiberG, null);

    assert.equal(deriveAvailableCarbohydrates(finoBread.nutrients100g), null);
    assert.throws(() => calculateExchangeDivergence(finoBread, finoBread.portions[0]), /analytical macronutrient composition is unavailable/);

    const scaledChicken = scaleNutrientProfile(chickenBreast.nutrients100g, 100);
    const mixedComposite = aggregateNutrientProfiles([scaledChicken, scaledEx]);

    assert.equal(mixedComposite.totalCaloriesKcal, null);
    assert.equal(mixedComposite.totalCarbsG, null);
    assert.equal(mixedComposite.totalProteinG, null);
    assert.equal(mixedComposite.totalFatG, null);
    assert.equal(mixedComposite.completeness.caloriesKcal, false);
    assert.equal(mixedComposite.completeness.carbsG, false);
    assert.equal(mixedComposite.completeness.proteinG, false);
    assert.equal(mixedComposite.completeness.fatG, false);
    assert.equal(mixedComposite.observedTotals.caloriesKcal, scaledChicken.caloriesKcal);
    assert.equal(mixedComposite.observedTotals.proteinG, scaledChicken.proteinG);
  });
});

