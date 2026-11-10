const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../src/clinical/food/data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function round1(val) {
  return Math.round(val * 10) / 10;
}

function round2(val) {
  return Math.round(val * 100) / 100;
}

// Helper to construct a standard exchange food item
function createExchangeFood({
  id,
  code,
  nameEn,
  nameAr,
  foodGroupId,
  primaryExchangeCategoryId,
  preparationState = 'cooked',
  gramWeight,
  portionNameEn,
  portionNameAr,
  householdMeasureEn,
  householdMeasureAr,
  exchangeMacros, // { carbsG, proteinG, fatG, caloriesKcal }
  sourcePage = 1,
  notesAr = '',
  notesEn = '',
  tags = [],
  customNutrients100g = null,
  verificationStatus = 'clinic_reviewed',
  sourceId = 'regimeplan_2026',
  sourceRecordId = undefined,
}) {
  const W = gramWeight;
  const Kcal100 = round1((exchangeMacros.caloriesKcal / W) * 100);
  const C100 = round1((exchangeMacros.carbsG / W) * 100);
  const P100 = round1((exchangeMacros.proteinG / W) * 100);
  const F100 = round1((exchangeMacros.fatG / W) * 100);

  const nutrients100g = customNutrients100g || {
    basisWeightG: 100,
    caloriesKcal: Kcal100,
    carbsG: C100,
    availableCarbsG: null,
    carbCalculationBasis: 'total_by_difference',
    proteinG: P100,
    fatG: F100,
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
    waterG: null,
    missingNutrientKeys: [
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
    ],
  };

  const portion = {
    id: `portion_${id.replace('food_', '')}_standard`,
    portionNameEn: portionNameEn || `1 Exchange Serving (~${W}g)`,
    portionNameAr: portionNameAr || `حصة بديل واحدة (~${W} جم)`,
    householdMeasureEn: householdMeasureEn || `${W}g`,
    householdMeasureAr: householdMeasureAr || `${W} جم`,
    gramWeight: W,
    exchangeCategory: primaryExchangeCategoryId,
    exchangeEquivalentFactor: 1,
    isDefaultServing: true,
  };

  return {
    id,
    code,
    sourceId,
    sourceRecordId,
    nameEn,
    nameAr,
    foodGroupId,
    primaryExchangeCategoryId,
    preparationState,
    verificationStatus,
    isCustom: false,
    nutrients100g,
    portions: [portion],
    tags: tags.length ? tags : [foodGroupId, primaryExchangeCategoryId],
    notesAr: notesAr || `قوائم البدائل الغذائية RegimePlan 2026 (ص ${sourcePage}). وزن الحصة البديلة: ${W} جم.`,
    notesEn: notesEn || `RegimePlan Food Exchange Lists (2026, p. ${sourcePage}). Standard exchange serving weight: ${W}g.`,
  };
}

module.exports = {
  DATA_DIR,
  createExchangeFood,
  round1,
  round2,
};
