/**
 * Anthropometrics & Physical Classification Engine
 * Nutrition Clinic Pro - Deterministic Clinical Engine
 * 
 * All formulas here are strictly deterministic, independently tested,
 * and mapped to peer-reviewed scientific literature.
 */

import {
  BiologicalSex,
  AdultBMICategory,
  BMIClassificationResult,
  IdealBodyWeightResults,
  BodyCompositionResult,
  CardioMetabolicRiskResult,
  AnthropometricAssessmentOutput,
} from './types';

/**
 * Calculates Body Mass Index (BMI in kg/m²) and classifies status.
 * CRITICAL CLINICAL RULE: Adult cutoffs are NEVER applied to individuals under 19 years old.
 * For pediatric patients (age < 19), an explicit pediatric growth standard indicator is returned.
 *
 * @param weightKg Actual body weight in kilograms (must be finite positive number)
 * @param heightCm Height in centimeters (must be finite positive number)
 * @param ageYears Age in decimal or integer years (must be finite non-negative number)
 * @param sex Biological sex
 */
export function calculateBMI(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  sex: BiologicalSex
): BMIClassificationResult {
  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    throw new Error('Weight must be a valid strictly positive number.');
  }
  if (!Number.isFinite(heightCm) || heightCm <= 0) {
    throw new Error('Height must be a valid strictly positive number.');
  }
  if (!Number.isFinite(ageYears) || ageYears < 0) {
    throw new Error('Age must be a valid non-negative number.');
  }

  const heightMeters = heightCm / 100;
  const bmiRaw = weightKg / (heightMeters * heightMeters);
  const bmi = Math.round(bmiRaw * 100) / 100; // Round to 2 decimal places for display

  // Pediatric safety check (Under 19 years of age: WHO 0-5y Standards and 5-19y Reference)
  if (ageYears < 19) {
    return {
      bmi,
      isPediatric: true,
      colorClass: 'text-amber-600 bg-amber-50 border-amber-200',
      pediatricGuidance: {
        warningEn:
          'Adult BMI cutoffs cannot be applied to children or adolescents under 19 years. Growth must be interpreted via WHO age- and sex-specific growth percentiles or z-scores.',
        warningAr:
          'لا يجوز سريرياً تطبيق تصنيفات مؤشر كتلة الجسم الخاصة بالبالغين لمن هم دون سن 19 عاماً. يجب تقييم نمو الطفل بالرجوع لمخططات منظمة الصحة العالمية (WHO Growth Charts) وفق العمر والنوع (Z-score / Percentiles).',
        whoGrowthStandardRef:
          'WHO Growth reference data for 5-19 years / WHO Child Growth Standards (0-5 years)',
        suggestedActionAr:
          'استخدم مخططات النطاق المئوي للنمو (Percentile Curves) المخصصة لعمر وجنس المريض.',
      },
    };
  }

  // Adult WHO International BMI Cutoffs (WHO Technical Report Series 854 & Consultation on Obesity)
  // Evaluated on raw unrounded BMI to prevent edge-case rounding misclassification
  let category: AdultBMICategory;
  let categoryLabelEn: string;
  let categoryLabelAr: string;
  let colorClass: string;

  if (bmiRaw < 16.0) {
    category = 'severe_underweight';
    categoryLabelEn = 'Severe Underweight (Thinness Grade 3)';
    categoryLabelAr = 'نقص حاد وشديد في الوزن (نحافة من الدرجة الثالثة)';
    colorClass = 'text-red-700 bg-red-50 border-red-200';
  } else if (bmiRaw < 17.0) {
    category = 'moderate_underweight';
    categoryLabelEn = 'Moderate Underweight (Thinness Grade 2)';
    categoryLabelAr = 'نقص معتدل في الوزن (نحافة من الدرجة الثانية)';
    colorClass = 'text-orange-700 bg-orange-50 border-orange-200';
  } else if (bmiRaw < 18.5) {
    category = 'mild_underweight';
    categoryLabelEn = 'Mild Underweight (Thinness Grade 1)';
    categoryLabelAr = 'نقص طفيف في الوزن (نحافة من الدرجة الأولى)';
    colorClass = 'text-yellow-700 bg-yellow-50 border-yellow-200';
  } else if (bmiRaw < 25.0) {
    category = 'normal';
    categoryLabelEn = 'Normal Weight (Eutrophic)';
    categoryLabelAr = 'وزن طبيعي وصحي';
    colorClass = 'text-emerald-700 bg-emerald-50 border-emerald-200';
  } else if (bmiRaw < 30.0) {
    category = 'overweight';
    categoryLabelEn = 'Overweight / Pre-obesity';
    categoryLabelAr = 'زيادة في الوزن (ما قبل السمنة)';
    colorClass = 'text-amber-700 bg-amber-50 border-amber-200';
  } else if (bmiRaw < 35.0) {
    category = 'obese_class_1';
    categoryLabelEn = 'Obesity Class I';
    categoryLabelAr = 'سمنة من الدرجة الأولى';
    colorClass = 'text-orange-800 bg-orange-50 border-orange-200';
  } else if (bmiRaw < 40.0) {
    category = 'obese_class_2';
    categoryLabelEn = 'Obesity Class II';
    categoryLabelAr = 'سمنة من الدرجة الثانية (شديدة)';
    colorClass = 'text-rose-800 bg-rose-50 border-rose-200';
  } else {
    category = 'obese_class_3';
    categoryLabelEn = 'Obesity Class III (Severe / Morbid)';
    categoryLabelAr = 'سمنة مفرطة من الدرجة الثالثة';
    colorClass = 'text-red-900 bg-red-100 border-red-300';
  }

  return {
    bmi,
    isPediatric: false,
    category,
    categoryLabelEn,
    categoryLabelAr,
    colorClass,
  };
}

/**
 * Calculates Body Surface Area (BSA in m²) using Mosteller and DuBois formulas.
 * Mosteller RD. Simplified calculation of body-surface area. N Engl J Med 1987; 317:1098.
 */
export function calculateBSA(heightCm: number, weightKg: number): { mostellerM2: number; duboisM2: number } {
  if (!Number.isFinite(heightCm) || heightCm <= 0) {
    throw new Error('Height must be a valid strictly positive number.');
  }
  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    throw new Error('Weight must be a valid strictly positive number.');
  }

  // Mosteller: sqrt((height_cm * weight_kg) / 3600)
  const mosteller = Math.sqrt((heightCm * weightKg) / 3600);

  // DuBois & DuBois: 0.007184 * (height_cm ^ 0.725) * (weight_kg ^ 0.425)
  const dubois = 0.007184 * Math.pow(heightCm, 0.725) * Math.pow(weightKg, 0.425);

  return {
    mostellerM2: Math.round(mosteller * 100) / 100,
    duboisM2: Math.round(dubois * 100) / 100,
  };
}

/**
 * Calculates Ideal Body Weight (IBW) using standard clinical formulas:
 * 1. Hamwi (1964)
 * 2. Devine (1974) - Widely used in pharmacokinetics & clinical nutrition
 * 3. Robinson (1983)
 * 4. Broca Index (1871)
 *
 * In addition, evaluates if Adjusted Body Weight (ABW) is clinically required:
 * Recommended when Actual Weight > 120% of IBW or BMI >= 30.
 * Formula: ABW = IBW + 0.4 * (Actual - IBW)
 */
export function calculateIdealBodyWeight(
  heightCm: number,
  actualWeightKg: number,
  sex: BiologicalSex
): IdealBodyWeightResults {
  if (!Number.isFinite(heightCm) || heightCm <= 0) {
    throw new Error('Height must be a valid strictly positive number.');
  }
  if (!Number.isFinite(actualWeightKg) || actualWeightKg <= 0) {
    throw new Error('Actual weight must be a valid strictly positive number.');
  }

  const heightInches = heightCm / 2.54;
  const inchesOver60 = Math.max(0, heightInches - 60);

  // 1. Hamwi Formula (1964)
  // Male: 48.0 kg for 5ft + 2.7 kg per inch over 5ft
  // Female: 45.5 kg for 5ft + 2.27 kg per inch over 5ft
  const hamwiRaw =
    sex === 'male'
      ? 48.0 + 2.7 * inchesOver60
      : 45.5 + 2.27 * inchesOver60;

  // 2. Devine Formula (1974)
  // Male: 50.0 kg + 2.3 kg per inch over 5ft
  // Female: 45.5 kg + 2.3 kg per inch over 5ft
  const devineRaw =
    sex === 'male'
      ? 50.0 + 2.3 * inchesOver60
      : 45.5 + 2.3 * inchesOver60;

  // 3. Robinson Formula (1983)
  // Male: 52 kg + 1.9 kg per inch over 5ft
  // Female: 49 kg + 1.7 kg per inch over 5ft
  const robinsonRaw =
    sex === 'male'
      ? 52.0 + 1.9 * inchesOver60
      : 49.0 + 1.7 * inchesOver60;

  // 4. Broca Index (1871)
  // Male: Height(cm) - 100
  // Female: Height(cm) - 105
  const brocaRaw = sex === 'male' ? heightCm - 100 : heightCm - 105;

  // Devine is considered the clinical standard benchmark
  const recommendedIBW = Math.round(devineRaw * 10) / 10;
  const heightM = heightCm / 100;
  const bmi = actualWeightKg / (heightM * heightM);

  const percentOfIBW = (actualWeightKg / recommendedIBW) * 100;
  const isAdjustedWeightNeeded = bmi >= 30 || percentOfIBW > 120;

  let adjustedBodyWeightKg: number | undefined;
  let rationaleAr = 'الوزن الحالي ضمن نطاق لا يتطلب استخدام الوزن المعدل.';

  if (isAdjustedWeightNeeded) {
    // ABW = IBW + 0.4 * (Actual - IBW)
    const abwRaw = recommendedIBW + 0.4 * (actualWeightKg - recommendedIBW);
    adjustedBodyWeightKg = Math.round(abwRaw * 10) / 10;
    rationaleAr = `نظراً لوجود سمنة (مؤشر كتلة الجسم ${bmi.toFixed(1)} كجم/م² أو الوزن الفعلي يمثل ${percentOfIBW.toFixed(0)}% من المثالي)، يُعد الوزن المعدل (Adjusted Body Weight) قيمة استرشادية يعتمد استخدامها على السياق السريري التقديري والبروتوكول المتبع وليست توصية إلزامية عامة؛ بينما توصي إرشادات أكاديمية التغذية وعلم النظم الغذائية (AND) باستخدام معادلة Mifflin-St Jeor مع الوزن الفعلي لتقدير الاحتياجات في البالغين ذوي زيادة الوزن والسمنة.`;
  }

  // Clinical limitation notice for heights below 152.4 cm (5 feet)
  if (heightCm < 152.4) {
    rationaleAr += ' تنبيه سريري: معادلات الوزن المثالي الكلاسيكية (ديفاين، هاموي، روبنسون) تمت معايرتها إحصائياً للبالغين بطول 152.4 سم فما فوق؛ استخدامها لمن هم دون هذا الطول يمثل استقراءً غير مسند سريرياً، ويُفضل الاسترشاد بنطاق BMI الطبيعي (18.5 - 24.9).';
  }

  return {
    hamwiKg: Math.round(hamwiRaw * 10) / 10,
    devineKg: Math.round(devineRaw * 10) / 10,
    robinsonKg: Math.round(robinsonRaw * 10) / 10,
    brocaKg: Math.round(brocaRaw * 10) / 10,
    recommendedIBWKg: recommendedIBW,
    isAdjustedWeightNeeded,
    adjustedBodyWeightKg,
    rationaleAr,
  };
}

/**
 * Calculates Body Composition parameters:
 * Fat Mass, Lean Body Mass (LBM / FFM), Fat Mass Index (FMI), Fat Free Mass Index (FFMI).
 */
export function calculateBodyComposition(
  weightKg: number,
  heightCm: number,
  bodyFatPercentage?: number
): BodyCompositionResult {
  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    throw new Error('Weight must be a valid strictly positive number.');
  }
  if (!Number.isFinite(heightCm) || heightCm <= 0) {
    throw new Error('Height must be a valid strictly positive number.');
  }

  if (bodyFatPercentage === undefined || bodyFatPercentage === null) {
    return { weightKg };
  }

  if (!Number.isFinite(bodyFatPercentage) || bodyFatPercentage < 2 || bodyFatPercentage > 75) {
    throw new Error('Body fat percentage is out of physiologically plausible range (2% - 75%).');
  }

  const heightM = heightCm / 100;
  const fatMassKg = weightKg * (bodyFatPercentage / 100);
  const leanBodyMassKg = weightKg - fatMassKg;

  // FFMI = LBM (kg) / Height (m)²
  const ffmi = leanBodyMassKg / (heightM * heightM);
  // FMI = Fat Mass (kg) / Height (m)²
  const fmi = fatMassKg / (heightM * heightM);

  return {
    weightKg,
    bodyFatPercentage: Math.round(bodyFatPercentage * 10) / 10,
    fatMassKg: Math.round(fatMassKg * 10) / 10,
    leanBodyMassKg: Math.round(leanBodyMassKg * 10) / 10,
    ffmi: Math.round(ffmi * 10) / 10,
    fmi: Math.round(fmi * 10) / 10,
  };
}

/**
 * Calculates Cardio-Metabolic Risk from waist circumference, Waist-to-Hip Ratio (WHR),
 * and Waist-to-Height Ratio (WHtR).
 * References:
 * - WHO Waist Circumference and Waist-Hip Ratio Report of a WHO Expert Consultation 2008.
 * - IDF Consensus Worldwide Definition of the Metabolic Syndrome (European cutoffs for Middle East / Arab populations).
 * - NICE Clinical Guideline [NG226] 2022 (WHtR keeping waist to less than half height).
 */
export function calculateCardioMetabolicRisk(
  sex: BiologicalSex,
  heightCm: number,
  waistCm?: number,
  hipCm?: number
): CardioMetabolicRiskResult {
  if (!Number.isFinite(heightCm) || heightCm <= 0) {
    throw new Error('Height must be a valid strictly positive number.');
  }

  if (waistCm === undefined || waistCm === null || !Number.isFinite(waistCm) || waistCm <= 0) {
    return {};
  }

  let waistRiskLabelAr = 'محيط خصر طبيعي';
  // WHO & IDF (Europid / Middle Eastern standard cutoffs):
  // Men: >= 94 cm increased risk, >= 102 cm substantially increased
  // Women: >= 80 cm increased risk, >= 88 cm substantially increased
  if (sex === 'male') {
    if (waistCm >= 102) {
      waistRiskLabelAr = 'محيط خصر مرتفع جداً (خطر أيضي وقلبي مرتفع بشكل جوهري >= 102 سم)';
    } else if (waistCm >= 94) {
      waistRiskLabelAr = 'محيط خصر مرتفع (زيادة في الخطر القلبي والوعائي >= 94 سم)';
    }
  } else {
    if (waistCm >= 88) {
      waistRiskLabelAr = 'محيط خصر مرتفع جداً (خطر أيضي وقلبي مرتفع بشكل جوهري >= 88 سم)';
    } else if (waistCm >= 80) {
      waistRiskLabelAr = 'محيط خصر مرتفع (زيادة في الخطر القلبي والوعائي >= 80 سم)';
    }
  }

  let rawWhr: number | undefined;
  let whr: number | undefined;
  let whrRiskLevel: 'low' | 'moderate' | 'high' | undefined;
  let whrRiskLabelAr: string | undefined;

  if (hipCm !== undefined && hipCm !== null && Number.isFinite(hipCm) && hipCm > 0) {
    rawWhr = waistCm / hipCm;
    whr = Math.round(rawWhr * 100) / 100;
    // WHO: Abdominal obesity is WHR >= 0.90 in men, >= 0.85 in women
    // Evaluated on raw unrounded ratio to avoid rounding misclassification
    if (sex === 'male') {
      if (rawWhr >= 0.90) {
        whrRiskLevel = 'high';
        whrRiskLabelAr = `مرتفع (${whr}) - تراكم دهون مركزي (أندرويدي) وزيادة خطر متلازمة التمثيل الغذائي`;
      } else {
        whrRiskLevel = 'low';
        whrRiskLabelAr = `طبيعي (${whr}) - توزيع دهون منخفض الخطورة`;
      }
    } else {
      if (rawWhr >= 0.85) {
        whrRiskLevel = 'high';
        whrRiskLabelAr = `مرتفع (${whr}) - سمنة حشوية وتراكم دهون مركزي`;
      } else {
        whrRiskLevel = 'low';
        whrRiskLabelAr = `طبيعي (${whr}) - توزيع دهون محيطي سليم`;
      }
    }
  }

  // Waist-to-Height Ratio (WHtR) evaluated on raw unrounded ratio
  const rawWhtr = waistCm / heightCm;
  const whtr = Math.round(rawWhtr * 100) / 100;
  let whtrRiskLevel: 'low' | 'increased_risk' | 'substantially_increased_risk';
  let whtrRiskLabelAr: string;

  if (rawWhtr >= 0.60) {
    whtrRiskLevel = 'substantially_increased_risk';
    whtrRiskLabelAr = `خطر شديد الارتفاع (${whtr}) - نسبة الخصر إلى الطول تتجاوز 0.60`;
  } else if (rawWhtr >= 0.50) {
    whtrRiskLevel = 'increased_risk';
    whtrRiskLabelAr = `خطر متزايد (${whtr}) - الخصر يتجاوز نصف طول القامة`;
  } else {
    whtrRiskLevel = 'low';
    whtrRiskLabelAr = `خطر منخفض ومثالي (${whtr}) - الخصر أقل من نصف الطول`;
  }

  return {
    whr,
    whrRiskLevel,
    whrRiskLabelAr,
    whtr,
    whtrRiskLevel,
    whtrRiskLabelAr,
    waistRiskLabelAr,
  };
}

/**
 * Aggregates all anthropometric metrics into a single traceable report.
 */
export function runCompleteAnthropometricAssessment(params: {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  sex: BiologicalSex;
  waistCm?: number;
  hipCm?: number;
  bodyFatPercentage?: number;
}): AnthropometricAssessmentOutput {
  const bmiResult = calculateBMI(params.weightKg, params.heightCm, params.ageYears, params.sex);
  const bsa = calculateBSA(params.heightCm, params.weightKg);
  const ibwResult = calculateIdealBodyWeight(params.heightCm, params.weightKg, params.sex);
  const bodyComposition = calculateBodyComposition(params.weightKg, params.heightCm, params.bodyFatPercentage);
  const cardioMetabolicRisk = calculateCardioMetabolicRisk(
    params.sex,
    params.heightCm,
    params.waistCm,
    params.hipCm
  );

  return {
    bmiResult,
    bsaMostellerM2: bsa.mostellerM2,
    bsaDuboisM2: bsa.duboisM2,
    ibwResult,
    bodyComposition,
    cardioMetabolicRisk,
  };
}
