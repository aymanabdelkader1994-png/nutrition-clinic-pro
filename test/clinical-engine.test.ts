/**
 * Deterministic Clinical Engine - Unit Tests & Literature Verification
 * 
 * Verifies all formulas against published scientific literature benchmarks.
 * Uses Node.js built-in test runner (node:test and node:assert/strict).
 */

import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateBMI,
  calculateBSA,
  calculateIdealBodyWeight,
  calculateBodyComposition,
  calculateCardioMetabolicRisk,
  calculateMifflinStJeor,
  calculateHarrisBenedictRevised,
  calculateKatchMcArdle,
  calculateCunningham,
  calculateSchofield,
  calculateWhoFaoUnu,
  runCompleteEnergyAssessment,
  calculateMacronutrientTargets,
  DIETARY_APPROACH_PRESETS,
} from '../src/clinical/index';

describe('1. Anthropometrics & Adult BMI Classification', () => {
  it('correctly calculates and classifies normal adult BMI', () => {
    // 70 kg, 175 cm (1.75 m) -> 70 / (1.75^2) = 22.857... -> 22.86
    const res = calculateBMI(70, 175, 30, 'male');
    assert.equal(res.bmi, 22.86);
    assert.equal(res.isPediatric, false);
    assert.equal(res.category, 'normal');
  });

  it('correctly classifies overweight status', () => {
    // 80 kg, 170 cm (1.70 m) -> 80 / (1.70^2) = 27.681... -> 27.68
    const res = calculateBMI(80, 170, 42, 'female');
    assert.equal(res.bmi, 27.68);
    assert.equal(res.isPediatric, false);
    assert.equal(res.category, 'overweight');
  });

  it('correctly classifies Obesity Class I, II, and III', () => {
    // Class 1 (30.0 - 34.99): 95 kg, 172 cm -> 32.11
    const class1 = calculateBMI(95, 172, 45, 'male');
    assert.equal(class1.category, 'obese_class_1');

    // Class 2 (35.0 - 39.99): 110 kg, 172 cm -> 37.18
    const class2 = calculateBMI(110, 172, 45, 'female');
    assert.equal(class2.category, 'obese_class_2');

    // Class 3 (>= 40.0): 130 kg, 170 cm -> 44.98
    const class3 = calculateBMI(130, 170, 45, 'male');
    assert.equal(class3.category, 'obese_class_3');
  });

  it('correctly classifies severe underweight (< 16.0)', () => {
    // 42 kg, 168 cm -> 42 / (1.68^2) = 14.88
    const underweight = calculateBMI(42, 168, 24, 'female');
    assert.equal(underweight.bmi, 14.88);
    assert.equal(underweight.category, 'severe_underweight');
  });

  it('CRITICAL CLINICAL RULE: Rejects adult BMI classification for pediatric patients (< 19 years)', () => {
    // A 14-year-old adolescent with 65 kg and 160 cm has a raw BMI of 25.39.
    // In an adult, 25.39 is overweight, but in a 14-year-old, adult thresholds must NEVER be applied.
    const res = calculateBMI(65, 160, 14, 'male');
    assert.equal(res.isPediatric, true);
    assert.equal(res.category, undefined); // Adult category must be undefined
    assert.ok(res.pediatricGuidance);
    assert.match(res.pediatricGuidance.warningEn, /cannot be applied to children or adolescents/);
    assert.match(res.pediatricGuidance.warningAr, /لا يجوز سريرياً تطبيق تصنيفات مؤشر كتلة الجسم الخاصة بالبالغين/);
  });
});

describe('2. Ideal Body Weight (IBW) & Adjusted Body Weight (ABW)', () => {
  it('calculates Hamwi, Devine, and Robinson for standard height benchmarks', () => {
    // Height: 177.8 cm = 70 inches = 5 ft 10 in. Inches over 60 = 10 inches.
    // Hamwi male: 48.0 + (2.7 * 10) = 75.0 kg
    // Devine male: 50.0 + (2.3 * 10) = 73.0 kg
    // Robinson male: 52.0 + (1.9 * 10) = 71.0 kg
    const resMale = calculateIdealBodyWeight(177.8, 75, 'male');
    assert.equal(resMale.hamwiKg, 75.0);
    assert.equal(resMale.devineKg, 73.0);
    assert.equal(resMale.robinsonKg, 71.0);
    assert.equal(resMale.isAdjustedWeightNeeded, false);

    // Height: 165.1 cm = 65 inches = 5 ft 5 in. Inches over 60 = 5 inches.
    // Devine female: 45.5 + (2.3 * 5) = 57.0 kg
    const resFemale = calculateIdealBodyWeight(165.1, 58, 'female');
    assert.equal(resFemale.devineKg, 57.0);
    assert.equal(resFemale.isAdjustedWeightNeeded, false);
  });

  it('triggers Adjusted Body Weight (ABW) when BMI >= 30 or weight > 120% of IBW', () => {
    // Male 175 cm (68.9 inches -> 8.9 inches over 60)
    // Devine IBW = 50 + 2.3 * 8.9 = 70.47 -> 70.5 kg
    // Actual weight 115 kg -> BMI = 115 / (1.75^2) = 37.55 (Obese Class II)
    // ABW = IBW + 0.4 * (Actual - IBW) = 70.5 + 0.4 * (115 - 70.5) = 70.5 + 17.8 = 88.3 kg
    const res = calculateIdealBodyWeight(175, 115, 'male');
    assert.equal(res.isAdjustedWeightNeeded, true);
    assert.ok(res.adjustedBodyWeightKg);
    assert.ok(Math.abs(res.adjustedBodyWeightKg - 88.3) <= 0.2);
    assert.match(res.rationaleAr, /الوزن المعدل \(Adjusted Body Weight\) قيمة استرشادية/);
    assert.match(res.rationaleAr, /أكاديمية التغذية وعلم النظم الغذائية \(AND\).*Mifflin-St Jeor مع الوزن الفعلي/);
  });
});

describe('3. Body Surface Area (BSA) & Body Composition', () => {
  it('calculates Mosteller and DuBois BSA accurately', () => {
    // Height: 170 cm, Weight: 70 kg
    // Mosteller: sqrt((170 * 70) / 3600) = sqrt(3.30555) = 1.818 m² -> 1.82 m²
    const bsa = calculateBSA(170, 70);
    assert.equal(bsa.mostellerM2, 1.82);
    assert.equal(bsa.duboisM2, 1.81);
  });

  it('calculates Lean Body Mass (LBM), Fat Mass, and FFMI correctly', () => {
    // Weight: 80 kg, Height: 175 cm, Body Fat: 20%
    // Fat Mass = 80 * 0.20 = 16.0 kg
    // LBM = 80 - 16 = 64.0 kg
    // FFMI = 64 / (1.75^2) = 64 / 3.0625 = 20.89 -> 20.9 kg/m²
    const comp = calculateBodyComposition(80, 175, 20);
    assert.equal(comp.fatMassKg, 16.0);
    assert.equal(comp.leanBodyMassKg, 64.0);
    assert.equal(comp.ffmi, 20.9);
  });

  it('supports calling calculateBodyComposition with optional bodyFatPercentage omitted or undefined', () => {
    // Calling without 3rd argument
    const resNoArg = calculateBodyComposition(70, 175);
    assert.deepEqual(resNoArg, { weightKg: 70 });

    // Calling with explicit undefined
    const resUndefined = calculateBodyComposition(70, 175, undefined);
    assert.deepEqual(resUndefined, { weightKg: 70 });
  });
});

describe('4. Cardio-Metabolic Risk (WHR & WHtR)', () => {
  it('detects high-risk android abdominal obesity in men (WHR >= 0.90)', () => {
    const risk = calculateCardioMetabolicRisk('male', 175, 98, 100);
    assert.equal(risk.whr, 0.98);
    assert.equal(risk.whrRiskLevel, 'high');
  });

  it('detects high-risk abdominal obesity in women (WHR >= 0.85)', () => {
    const risk = calculateCardioMetabolicRisk('female', 165, 88, 98);
    assert.equal(risk.whr, 0.9);
    assert.equal(risk.whrRiskLevel, 'high');
  });

  it('identifies Waist-to-Height Ratio (WHtR) risk threshold of 0.50', () => {
    // 95 cm waist / 180 cm height = 0.527 -> 0.53 (>= 0.50 -> increased_risk)
    const risk = calculateCardioMetabolicRisk('male', 180, 95);
    assert.equal(risk.whtr, 0.53);
    assert.equal(risk.whtrRiskLevel, 'increased_risk');
  });
});

describe('5. Deterministic Energy Equations (Literature Benchmarks)', () => {
  it('Mifflin-St Jeor (1990) matches published benchmark calculations', () => {
    // Male: 10 * 80 + 6.25 * 180 - 5 * 30 + 5
    // = 800 + 1125 - 150 + 5 = 1780 kcal
    const maleBmr = calculateMifflinStJeor(80, 180, 30, 'male');
    assert.equal(maleBmr, 1780);

    // Female: 10 * 65 + 6.25 * 165 - 5 * 28 - 161
    // = 650 + 1031.25 - 140 - 161 = 1380.25 -> 1380 kcal
    const femaleBmr = calculateMifflinStJeor(65, 165, 28, 'female');
    assert.equal(femaleBmr, 1380);
  });

  it('Revised Harris-Benedict (Roza & Shizgal 1984) matches benchmark coefficients', () => {
    // Male: 75 kg, 175 cm, 35 y
    // BMR = 88.362 + (13.397 * 75) + (4.799 * 175) - (5.677 * 35)
    // = 88.362 + 1004.775 + 839.825 - 198.695 = 1734.267 -> 1734 kcal
    const maleBmr = calculateHarrisBenedictRevised(75, 175, 35, 'male');
    assert.equal(maleBmr, 1734);

    // Female: 60 kg, 160 cm, 40 y
    // BMR = 447.593 + (9.247 * 60) + (3.098 * 160) - (4.330 * 40)
    // = 447.593 + 554.82 + 495.68 - 173.2 = 1324.893 -> 1325 kcal
    const femaleBmr = calculateHarrisBenedictRevised(60, 160, 40, 'female');
    assert.equal(femaleBmr, 1325);
  });

  it('Katch-McArdle (1996) accurately computes BMR from Lean Body Mass', () => {
    // LBM = 60 kg -> BMR = 370 + (21.6 * 60) = 370 + 1296 = 1666 kcal
    const bmr = calculateKatchMcArdle(60);
    assert.equal(bmr, 1666);
  });

  it('Cunningham (1980/1991) computes BMR for athletic fat-free mass', () => {
    // FFM = 65 kg -> BMR = 500 + (22 * 65) = 500 + 1430 = 1930 kcal
    const bmr = calculateCunningham(65);
    assert.equal(bmr, 1930);
  });

  it('Schofield (1985 / WHO) evaluates correct age and sex brackets', () => {
    // Male 25 y (bracket 18-29 y), 70 kg: 15.057 * 70 + 692.2 = 1053.99 + 692.2 = 1746.19 -> 1746 kcal
    const bmrYoungMale = calculateSchofield(70, 25, 'male');
    assert.equal(bmrYoungMale, 1746);

    // Female 45 y (bracket 30-59 y), 60 kg: 8.126 * 60 + 845.6 = 487.56 + 845.6 = 1333.16 -> 1333 kcal
    const bmrMidFemale = calculateSchofield(60, 45, 'female');
    assert.equal(bmrMidFemale, 1333);
  });

  it('WHO/FAO/UNU (2004) computes age-tiered energy requirements', () => {
    // Male 25 y (18-30 y), 70 kg: 15.3 * 70 + 679 = 1071 + 679 = 1750 kcal
    const bmrMale = calculateWhoFaoUnu(70, 25, 'male');
    assert.equal(bmrMale, 1750);

    // Female 35 y (30-60 y), 60 kg: 8.7 * 60 + 829 = 522 + 829 = 1351 kcal
    const bmrFemale = calculateWhoFaoUnu(60, 35, 'female');
    assert.equal(bmrFemale, 1351);
  });
});

describe('6. Total Energy Assessment, Clinical Multipliers & Safety Alerts', () => {
  it('applies PAL and Clinical Stress Factor deterministically', () => {
    // Male 80kg, 180cm, 30y -> Mifflin BMR = 1780 kcal
    // Activity: Lightly active (PAL = 1.375)
    // Stress: Minor surgery (factor = 1.1)
    // Total multiplier = 1.375 * 1.1 = 1.5125
    // TDEE = 1780 * 1.5125 = 2692.25 -> 2692 kcal
    const assessment = runCompleteEnergyAssessment({
      actualWeightKg: 80,
      heightCm: 180,
      ageYears: 30,
      sex: 'male',
      activityLevel: 'lightly_active',
      stressCondition: 'minor_surgery',
      adjustmentKcal: 0,
    });

    assert.equal(assessment.recommendedBmrKcal, 1780);
    assert.equal(assessment.recommendedTdeeKcal, 2692);
    assert.equal(assessment.targetKcal, 2692);
  });

  it('triggers Danger Alert when planned calories fall below the clinical safety threshold', () => {
    // Female with target < 1200 kcal
    const assessment = runCompleteEnergyAssessment({
      actualWeightKg: 55,
      heightCm: 160,
      ageYears: 35,
      sex: 'female',
      activityLevel: 'sedentary',
      adjustmentKcal: -800, // Excessive deficit dropping intake below 1200
    });

    assert.ok(assessment.targetKcal < 1200);
    const dangerAlert = assessment.safetyAlerts.find((a) => a.severity === 'danger');
    assert.ok(dangerAlert, 'Expected danger safety alert for calorie intake below 1200 kcal');
    assert.match(dangerAlert.messageAr, /تقل عن الحد السريري الآمن/);
  });

  it('triggers Warning Alert when daily calorie deficit exceeds 1000 kcal', () => {
    const assessment = runCompleteEnergyAssessment({
      actualWeightKg: 90,
      heightCm: 180,
      ageYears: 30,
      sex: 'male',
      activityLevel: 'moderately_active',
      adjustmentKcal: -1200,
    });

    const deficitWarning = assessment.safetyAlerts.find(
      (a) => a.severity === 'warning' && a.messageEn.includes('1000 kcal/day')
    );
    assert.ok(deficitWarning, 'Expected warning for deficit exceeding 1000 kcal/day');
  });
});

describe('7. Deterministic Macronutrient Distribution & Balancing', () => {
  it('correctly calculates macros for a Balanced 2000 kcal Diet', () => {
    const targetCalories = 2000;
    const bodyWeightKg = 70;
    const ratio = { carbsPercent: 50, proteinPercent: 20, fatPercent: 30 };

    const macro = calculateMacronutrientTargets({
      targetCalories,
      ratio,
      bodyWeightKg,
    });

    // Carbs: 50% of 2000 = 1000 kcal / 4 = 250 g
    assert.equal(macro.carbsKcal, 1000);
    assert.equal(macro.carbsGrams, 250);

    // Protein: 20% of 2000 = 400 kcal / 4 = 100 g -> 100 / 70 = 1.43 g/kg
    assert.equal(macro.proteinKcal, 400);
    assert.equal(macro.proteinGrams, 100);
    assert.equal(macro.proteinGramsPerKg, 1.43);

    // Fat: 30% of 2000 = 600 kcal / 9 = 66.7 g
    assert.equal(macro.fatKcal, 600);
    assert.equal(macro.fatGrams, 66.7);

    // Fiber: 14 g per 1000 kcal -> (2000 / 1000) * 14 = 28 g
    assert.equal(macro.fiberGramsTarget, 28);

    // Fluid: max of (70 * 35 = 2450 ml) and (2000 * 1 = 2000 ml) -> 2450 ml
    assert.equal(macro.fluidRequirementMl, 2450);

    // Mathematical integrity check
    assert.equal(macro.carbsKcal + macro.proteinKcal + macro.fatKcal, targetCalories);
  });

  it('throws an error if macronutrient percentages do not sum to 100%', () => {
    assert.throws(
      () =>
        calculateMacronutrientTargets({
          targetCalories: 2000,
          ratio: { carbsPercent: 50, proteinPercent: 20, fatPercent: 40 }, // sums to 110%
          bodyWeightKg: 70,
        }),
      /percentages must sum to 100%/
    );
  });
});

describe('8. Input Robustness & NaN/Infinity Guards (Second-Pass Fixes)', () => {
  it('rejects NaN, Infinity, negative, and zero values in calculateBMI', () => {
    assert.throws(() => calculateBMI(NaN, 175, 30, 'male'), /valid strictly positive number/);
    assert.throws(() => calculateBMI(70, NaN, 30, 'male'), /valid strictly positive number/);
    assert.throws(() => calculateBMI(70, 175, NaN, 'male'), /valid non-negative number/);
    assert.throws(() => calculateBMI(Infinity, 175, 30, 'male'), /valid strictly positive number/);
    assert.throws(() => calculateBMI(70, -170, 30, 'male'), /valid strictly positive number/);
    assert.throws(() => calculateBMI(70, 175, -5, 'male'), /valid non-negative number/);
  });

  it('rejects invalid height in calculateCardioMetabolicRisk preventing division by zero', () => {
    assert.throws(() => calculateCardioMetabolicRisk('male', 0, 90, 100), /valid strictly positive number/);
    assert.throws(() => calculateCardioMetabolicRisk('male', NaN, 90, 100), /valid strictly positive number/);
  });

  it('handles missing or non-positive waistCm gracefully returning empty object', () => {
    assert.deepEqual(calculateCardioMetabolicRisk('male', 175, undefined), {});
    assert.deepEqual(calculateCardioMetabolicRisk('male', 175, 0), {});
    assert.deepEqual(calculateCardioMetabolicRisk('male', 175, NaN), {});
  });

  it('rejects NaN and non-positive values in calculateBSA and calculateBodyComposition', () => {
    assert.throws(() => calculateBSA(NaN, 70), /valid strictly positive number/);
    assert.throws(() => calculateBSA(175, Infinity), /valid strictly positive number/);
    assert.throws(() => calculateBodyComposition(NaN, 175), /valid strictly positive number/);
    assert.throws(() => calculateBodyComposition(70, NaN), /valid strictly positive number/);
    assert.throws(() => calculateBodyComposition(70, 175, NaN), /physiologically plausible/);
  });
});

describe('9. Macronutrient Percentage Integrity & Preset Accuracy', () => {
  it('rejects negative macro percentages even if the total sum is 100%', () => {
    // 120 + (-30) + 10 = 100, but protein is negative!
    assert.throws(
      () =>
        calculateMacronutrientTargets({
          targetCalories: 2000,
          ratio: { carbsPercent: 120, proteinPercent: -30, fatPercent: 10 },
          bodyWeightKg: 70,
        }),
      /between 0 and 100/
    );
  });

  it('rejects percentages exceeding 100% or containing NaN', () => {
    assert.throws(
      () =>
        calculateMacronutrientTargets({
          targetCalories: 2000,
          ratio: { carbsPercent: 110, proteinPercent: 0, fatPercent: -10 },
          bodyWeightKg: 70,
        }),
      /between 0 and 100/
    );
    assert.throws(
      () =>
        calculateMacronutrientTargets({
          targetCalories: 2000,
          ratio: { carbsPercent: NaN, proteinPercent: 20, fatPercent: 30 },
          bodyWeightKg: 70,
        }),
      /between 0 and 100/
    );
  });

  it('verifies ketogenic preset is imported from presets and labeled as standard LCHF, not clinical epilepsy protocol', () => {
    const keto = DIETARY_APPROACH_PRESETS.ketogenic;
    assert.ok(keto, 'Ketogenic preset should exist');
    assert.equal(keto.nameEn, 'Standard Ketogenic (LCHF)');
    assert.equal(keto.nameAr, 'حمية كيتوجينيك قياسية (قليلة الكربوهيدرات عالية الدهون)');
    assert.equal(keto.defaultRatio.carbsPercent, 5);
    assert.equal(keto.defaultRatio.proteinPercent, 25);
    assert.equal(keto.defaultRatio.fatPercent, 70);
    assert.match(keto.descriptionAr, /وليس بروتوكولاً طبياً لعلاج الصرع/);

    const target = calculateMacronutrientTargets({
      targetCalories: 2000,
      ratio: keto.defaultRatio,
      bodyWeightKg: 70,
    });
    assert.equal(target.fatPercentage, 70);
    assert.equal(target.carbsPercentage, 5);
    assert.equal(target.proteinPercentage, 25);
  });
});

describe('10. Edge Cases: Short Stature (< 152.4 cm) & Raw Value Classification', () => {
  it('includes clinical limitation notice for individuals shorter than 152.4 cm (5 feet)', () => {
    // Height: 140 cm (< 152.4 cm)
    const ibw = calculateIdealBodyWeight(140, 50, 'female');
    assert.ok(ibw.devineKg > 0);
    assert.match(ibw.rationaleAr, /تمت معايرتها إحصائياً للبالغين بطول 152.4 سم فما فوق/);
  });

  it('classifies WHR and WHtR using raw unrounded values', () => {
    // Height 180 cm, Waist 89.6 cm -> raw WHtR = 89.6 / 180 = 0.4977 (< 0.50)
    // Rounding to 2 decimal places would yield 0.50, but raw is strictly < 0.50
    const risk = calculateCardioMetabolicRisk('male', 180, 89.6);
    assert.equal(risk.whtrRiskLevel, 'low');
    assert.equal(risk.whtr, 0.5); // Display rounded to 0.50, but classification was evaluated on raw value
  });

  it('classifies adult BMI boundaries using raw unrounded values', () => {
    // Raw BMI just below 25.0: Weight = 80.987 kg, Height = 180 cm
    // Raw BMI = 80.987 / 3.24 = 24.995987... (< 25.0) -> normal
    // Rounded display BMI is 25.00
    const normalEdge = calculateBMI(80.987, 180, 30, 'male');
    assert.equal(normalEdge.category, 'normal');
    assert.equal(normalEdge.bmi, 25);

    // Raw BMI just above 25.0: Weight = 81.001 kg, Height = 180 cm
    // Raw BMI = 81.001 / 3.24 = 25.000308... (>= 25.0) -> overweight
    const overweightEdge = calculateBMI(81.001, 180, 30, 'male');
    assert.equal(overweightEdge.category, 'overweight');
  });
});

