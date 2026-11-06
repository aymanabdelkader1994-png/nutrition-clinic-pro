/**
 * Energy & Caloric Expenditure Engine
 * Nutrition Clinic Pro - Deterministic Clinical Engine
 * 
 * Strict deterministic calculations of Basal Metabolic Rate (BMR) and Total Daily Energy Expenditure (TDEE).
 * Every formula includes full scientific citation, target population, and clinical limitations.
 */

import {
  BiologicalSex,
  EnergyEquationId,
  ScientificCitation,
  ActivityLevel,
  ActivityLevelConfig,
  ClinicalStressCondition,
  StressConditionConfig,
  EnergyCalculationSingleResult,
  EnergyAssessmentOutput,
} from './types';

export const SCIENTIFIC_CITATIONS: Record<EnergyEquationId, ScientificCitation> = {
  mifflin_st_jeor: {
    formulaName: 'Mifflin-St Jeor (1990)',
    formulaNameAr: 'معادلة مفلين - سانت جور (1990)',
    primaryReference:
      'Mifflin MD, St Jeor ST, Hill LA, Scott BJ, Daugherty SA, Koh YO. A new predictive equation for resting energy expenditure in healthy individuals. Am J Clin Nutr. 1990;51(2):241-247.',
    year: 1990,
    applicablePopulation:
      'Healthy adults (19-78 y), non-obese and obese. Endorsed by the Academy of Nutrition and Dietetics (AND) as the most reliable predictive equation for obese individuals.',
    applicablePopulationAr:
      'البالغون الأصحاء (19-78 سنة)، حالات الوزن الطبيعي والسمنة. موصى بها من قبل أكاديمية التغذية وعلم النظم الغذائية (AND) كأكثر معادلة موثوقة لحالات السمنة.',
    limitations:
      'May underestimate REE in highly trained athletes with substantial muscular hypertrophy. Does not directly account for measured body composition.',
    limitationsAr:
      'قد تقلل من تقدير الطاقة لدى الرياضيين ذوي الكتلة العضلية الضخمة. تعتمد على الوزن الكلي دون تفريق مباشر للتركيب العضلي.',
    requiresLeanBodyMass: false,
  },
  harris_benedict_revised: {
    formulaName: 'Revised Harris-Benedict (Roza & Shizgal 1984)',
    formulaNameAr: 'معادلة هاريس - بيندكت المعدلة (روزا وشيزغال 1984)',
    primaryReference:
      'Roza AM, Shizgal HM. The Harris Benedict equation reevaluated: resting energy requirements and the body cell mass. Am J Clin Nutr. 1984;40(1):168-182.',
    year: 1984,
    applicablePopulation:
      'Adult men and women evaluated against total body potassium and body cell mass. Replaces original 1919 coefficients to avoid consistent overestimation.',
    applicablePopulationAr:
      'البالغون من الرجال والنساء. تم تدقيقها مقابل قياسات كتلة الخلايا النشطة بيولوجياً لتصحيح المبالغة التي كانت موجودة في صيغة 1919 الأصلية.',
    limitations:
      'Tends to overestimate energy expenditure by 5-15% in individuals with Class II or Class III obesity when actual weight is used.',
    limitationsAr:
      'تميل إلى المبالغة في تقدير الطاقة بنسبة 5-15% في حالات السمنة المفرطة عند استخدام الوزن الفعلي مباشرة دون تعديل.',
    requiresLeanBodyMass: false,
  },
  katch_mcardle: {
    formulaName: 'Katch-McArdle (1996)',
    formulaNameAr: 'معادلة كاتش - ماكاردل (1996)',
    primaryReference:
      'McArdle WD, Katch FI, Katch VL. Exercise Physiology: Energy, Nutrition, and Human Performance. 4th ed. Philadelphia: Lea & Febiger; 1996.',
    year: 1996,
    applicablePopulation:
      'Athletes, active adults, and individuals with accurate body composition measurements (DEXA, hydrostatic weighing, or calibrated bioimpedance).',
    applicablePopulationAr:
      'الرياضيون، والأفراد النشطون، وكل من يمتلك قياساً مخبرياً دقيقاً لنسبة الدهون والكتلة اللادهنية (LBM).',
    limitations:
      'Cannot be calculated without a valid, reliable estimate of Fat-Free Mass / Lean Body Mass (LBM).',
    limitationsAr:
      'لا يمكن حسابها نهائياً إذا لم تتوفر نسبة موثوقة للكتلة العضلية أو اللادهنية (LBM).',
    requiresLeanBodyMass: true,
  },
  cunningham: {
    formulaName: 'Cunningham (1980 / 1991)',
    formulaNameAr: 'معادلة كانينغهام (1980 / 1991)',
    primaryReference:
      'Cunningham JJ. A reanalysis of factors influencing basal metabolic rate in normal adults. Am J Clin Nutr. 1980;33(11):2372-2374. Body composition as a determinant of energy expenditure. Am J Clin Nutr. 1991;54(6):963-969.',
    year: 1991,
    applicablePopulation:
      'Athletic populations, bodybuilders, and patients with high muscle mass where metabolically active tissue drives basal expenditure.',
    applicablePopulationAr:
      'الرياضيون المحترفون، ولاعبو كمال الأجسام، وأصحاب الكتلة العضلية المرتفعة حيث تشكل الكتلة اللادهنية المحرك الأيضي الرئيسي.',
    limitations:
      'Requires accurate Fat-Free Mass. Not validated for sedentary elderly populations with sarcopenia.',
    limitationsAr:
      'تتطلب قياساً دقيقاً للكتلة اللادهنية (FFM). غير مناسبة لكبار السن الخاملين المصابين بضمور العضلات (Sarcopenia).',
    requiresLeanBodyMass: true,
  },
  schofield: {
    formulaName: 'Schofield (1985 / WHO)',
    formulaNameAr: 'معادلة شوفيلد (1985 / توصيات منظمة الصحة العالمية)',
    primaryReference:
      'Schofield WN. Predicting basal metabolic rate, new standards and review of previous work. Hum Nutr Clin Nutr. 1985;39 Suppl 1:5-41.',
    year: 1985,
    applicablePopulation:
      'Wide population age brackets (from infants, children, adolescents to adults and elderly).',
    applicablePopulationAr:
      'معتمدة لمختلف الفئات العمرية (من الأطفال والمراهقين إلى البالغين وكبار السن) ومقسمة لشرائح عمرية وجنسية دقيقة.',
    limitations:
      'Based on database with disproportionate representation of Italian military recruits; may overestimate BMR in some tropical or sedentary populations.',
    limitationsAr:
      'بُنيت على قاعدة بيانات تاريخية ضمت نسبة عالية من المجندين الأوروبيين، وقد تبالغ أحياناً في التقدير لبعض الشعوب الأقل نشاطاً.',
    requiresLeanBodyMass: false,
  },
  who_fao_unu: {
    formulaName: 'WHO / FAO / UNU (2004)',
    formulaNameAr: 'معادلة منظمة الصحة والأغذية العالمية WHO/FAO/UNU (2004)',
    primaryReference:
      'Food and Agriculture Organization, World Health Organization, United Nations University. Human energy requirements: Report of a Joint FAO/WHO/UNU Expert Consultation. Rome: FAO; 2004.',
    year: 2004,
    applicablePopulation:
      'International public health baseline standards. Tiered by age categories (18-30, 30-60, >60 years).',
    applicablePopulationAr:
      'المعيار الدولي للصحة العامة وبرامج التغذية السريرية للدول النامية والمتطورة، مقسمة لشرائح البالغين.',
    limitations:
      'Simplified linear models that rely solely on weight, which can underestimate the impact of height variations in very tall or short individuals.',
    limitationsAr:
      'تعتمد على الوزن والعمر فقط في معادلتها المبسطة دون إدراج الطول، مما قد يقلل الدقة مع قصار أو طوال القامة بشكل ملحوظ.',
    requiresLeanBodyMass: false,
  },
};

export const ACTIVITY_LEVELS: Record<ActivityLevel, ActivityLevelConfig> = {
  sedentary: {
    level: 'sedentary',
    palFactor: 1.2,
    labelEn: 'Sedentary (desk job, minimal movement)',
    labelAr: 'خامل (عمل مكتبي، حركة يومية محدودة جداً)',
    descriptionAr: 'معامل النشاط 1.20 - أنشطة الجلوس اليومية والقيادة دون تمارين مجدولة.',
  },
  lightly_active: {
    level: 'lightly_active',
    palFactor: 1.375,
    labelEn: 'Lightly Active (light exercise 1-3 days/wk)',
    labelAr: 'نشاط خفيف (تمارين خفيفة أو مشي 1-3 أيام أسبوعياً)',
    descriptionAr: 'معامل النشاط 1.375 - ممارسة المشي أو الرياضات الخفيفة 1-3 مرات في الأسبوع.',
  },
  moderately_active: {
    level: 'moderately_active',
    palFactor: 1.55,
    labelEn: 'Moderately Active (moderate exercise 3-5 days/wk)',
    labelAr: 'نشاط معتدل (تمارين رياضية متوسطة 3-5 أيام أسبوعياً)',
    descriptionAr: 'معامل النشاط 1.55 - نمط حياة نشط أو تمارين لياقة منتظمة 3 إلى 5 مرات أسبوعياً.',
  },
  very_active: {
    level: 'very_active',
    palFactor: 1.725,
    labelEn: 'Very Active (hard exercise 6-7 days/wk)',
    labelAr: 'نشط جداً (تمارين شاقة أو عمل بدني مجهد 6-7 أيام أسبوعياً)',
    descriptionAr: 'معامل النشاط 1.725 - رياضة مكثفة أو مهن يدوية شاقة طوال الأسبوع.',
  },
  extra_active: {
    level: 'extra_active',
    palFactor: 1.9,
    labelEn: 'Extra Active (intense training, physical labor)',
    labelAr: 'نشط للغاية (رياضيون محترفون أو عمالة بدنية قاسية مرتين يومياً)',
    descriptionAr: 'معامل النشاط 1.90 - رياضيون محترفون يخوضون تدريبات مضاعفة يومياً.',
  },
};

export const STRESS_CONDITIONS: Record<ClinicalStressCondition, StressConditionConfig> = {
  normal: {
    condition: 'normal',
    factor: 1.0,
    labelEn: 'Normal / Non-stressed',
    labelAr: 'حالة اعتيادية (بدون إجهاد مرضي أو جراحي)',
    notesAr: 'لا يوجد عامل زيادة سريري.',
  },
  minor_surgery: {
    condition: 'minor_surgery',
    factor: 1.1,
    labelEn: 'Minor Surgery (post-op elective)',
    labelAr: 'جراحة صغرى اختيارية (مرحلة ما بعد الجراحة)',
    notesAr: 'معامل إجهاد خفيف 1.10.',
  },
  major_surgery: {
    condition: 'major_surgery',
    factor: 1.25,
    labelEn: 'Major Surgery',
    labelAr: 'جراحة كبرى (استئصال، عمليات صدر وبطن)',
    notesAr: 'معامل إجهاد متوسط 1.25.',
  },
  mild_infection: {
    condition: 'mild_infection',
    factor: 1.15,
    labelEn: 'Mild Infection',
    labelAr: 'عدوى خفيفة مصحوبة بارتفاع طفيف بالحرارة',
    notesAr: 'زيادة متواضعة في الأيض 1.15.',
  },
  moderate_infection: {
    condition: 'moderate_infection',
    factor: 1.3,
    labelEn: 'Moderate Infection',
    labelAr: 'عدوى متوسطة / التهاب رئوي / خراجات نشطة',
    notesAr: 'معامل إجهاد 1.30.',
  },
  severe_infection_sepsis: {
    condition: 'severe_infection_sepsis',
    factor: 1.5,
    labelEn: 'Severe Infection / Sepsis',
    labelAr: 'إنتان دموي حاد أو عدوى شديدة السميّة (Sepsis)',
    notesAr: 'معامل إجهاد حرج 1.50 تحت إشراف العناية المركزة.',
  },
  skeletal_trauma: {
    condition: 'skeletal_trauma',
    factor: 1.35,
    labelEn: 'Skeletal Trauma / Multiple Fractures',
    labelAr: 'كسور متعددة أو إصابات عظمية رضية',
    notesAr: 'معامل استشفاء عظمي وأنسجة 1.35.',
  },
  head_trauma: {
    condition: 'head_trauma',
    factor: 1.4,
    labelEn: 'Severe Head Trauma',
    labelAr: 'رضوض دماغية وإصابات حادة بالرأس',
    notesAr: 'معامل هدمي حاد 1.40.',
  },
  burn_under_20_percent: {
    condition: 'burn_under_20_percent',
    factor: 1.5,
    labelEn: 'Burn (< 20% TBSA)',
    labelAr: 'حروق جلدية (أقل من 20% من مساحة الجسم)',
    notesAr: 'حالة هدمية عالية 1.50.',
  },
  burn_over_40_percent: {
    condition: 'burn_over_40_percent',
    factor: 1.9,
    labelEn: 'Burn (> 40% TBSA)',
    labelAr: 'حروق واسعة (أكثر من 40% من مساحة الجسم)',
    notesAr: 'فرط استقلاب شديد جداً 1.90 يتطلب بروتوكولات حروق خاصة.',
  },
};

/**
 * 1. Mifflin-St Jeor Equation (1990)
 * Male: 10 * W + 6.25 * H - 5 * A + 5
 * Female: 10 * W + 6.25 * H - 5 * A - 161
 */
export function calculateMifflinStJeor(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  sex: BiologicalSex
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  const bmr = sex === 'male' ? base + 5 : base - 161;
  return Math.round(bmr);
}

/**
 * 2. Revised Harris-Benedict Equation (Roza & Shizgal 1984)
 * Male: 88.362 + (13.397 * W) + (4.799 * H) - (5.677 * A)
 * Female: 447.593 + (9.247 * W) + (3.098 * H) - (4.330 * A)
 */
export function calculateHarrisBenedictRevised(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  sex: BiologicalSex
): number {
  let bmr: number;
  if (sex === 'male') {
    bmr = 88.362 + 13.397 * weightKg + 4.799 * heightCm - 5.677 * ageYears;
  } else {
    bmr = 447.593 + 9.247 * weightKg + 3.098 * heightCm - 4.33 * ageYears;
  }
  return Math.round(bmr);
}

/**
 * 3. Katch-McArdle Equation (1996)
 * BMR = 370 + (21.6 * LeanBodyMassKg)
 */
export function calculateKatchMcArdle(leanBodyMassKg: number): number {
  if (leanBodyMassKg <= 0) {
    throw new Error('Lean Body Mass must be positive for Katch-McArdle.');
  }
  const bmr = 370 + 21.6 * leanBodyMassKg;
  return Math.round(bmr);
}

/**
 * 4. Cunningham Equation (1980/1991)
 * BMR = 500 + (22 * FatFreeMassKg)
 */
export function calculateCunningham(fatFreeMassKg: number): number {
  if (fatFreeMassKg <= 0) {
    throw new Error('Fat-Free Mass must be positive for Cunningham equation.');
  }
  const bmr = 500 + 22 * fatFreeMassKg;
  return Math.round(bmr);
}

/**
 * 5. Schofield Equation (1985 / WHO)
 * Stratified by sex and specific age brackets.
 */
export function calculateSchofield(
  weightKg: number,
  ageYears: number,
  sex: BiologicalSex
): number {
  let bmr: number;

  if (sex === 'male') {
    if (ageYears < 3) {
      bmr = 59.512 * weightKg - 30.4;
    } else if (ageYears < 10) {
      bmr = 22.706 * weightKg + 504.3;
    } else if (ageYears < 18) {
      bmr = 17.686 * weightKg + 658.2;
    } else if (ageYears < 30) {
      bmr = 15.057 * weightKg + 692.2;
    } else if (ageYears < 60) {
      bmr = 11.472 * weightKg + 873.1;
    } else {
      bmr = 11.711 * weightKg + 587.7;
    }
  } else {
    if (ageYears < 3) {
      bmr = 58.317 * weightKg - 31.1;
    } else if (ageYears < 10) {
      bmr = 20.315 * weightKg + 485.9;
    } else if (ageYears < 18) {
      bmr = 13.384 * weightKg + 692.6;
    } else if (ageYears < 30) {
      bmr = 14.818 * weightKg + 486.6;
    } else if (ageYears < 60) {
      bmr = 8.126 * weightKg + 845.6;
    } else {
      bmr = 9.082 * weightKg + 658.5;
    }
  }

  return Math.round(bmr);
}

/**
 * 6. WHO / FAO / UNU (2004)
 * Standard adult tiers: 18-30, 30-60, >60 years.
 */
export function calculateWhoFaoUnu(
  weightKg: number,
  ageYears: number,
  sex: BiologicalSex
): number {
  let bmr: number;

  if (sex === 'male') {
    if (ageYears < 3) {
      bmr = 60.9 * weightKg - 54;
    } else if (ageYears < 10) {
      bmr = 22.7 * weightKg + 495;
    } else if (ageYears < 18) {
      bmr = 17.5 * weightKg + 651;
    } else if (ageYears <= 30) {
      bmr = 15.3 * weightKg + 679;
    } else if (ageYears <= 60) {
      bmr = 11.6 * weightKg + 879;
    } else {
      bmr = 13.5 * weightKg + 487;
    }
  } else {
    if (ageYears < 3) {
      bmr = 61.0 * weightKg - 51;
    } else if (ageYears < 10) {
      bmr = 22.5 * weightKg + 499;
    } else if (ageYears < 18) {
      bmr = 12.2 * weightKg + 746;
    } else if (ageYears <= 30) {
      bmr = 14.7 * weightKg + 496;
    } else if (ageYears <= 60) {
      bmr = 8.7 * weightKg + 829;
    } else {
      bmr = 10.5 * weightKg + 596;
    }
  }

  return Math.round(bmr);
}

/**
 * Complete Energy Assessment Suite.
 * Evaluates all 6 equations, checks obesity threshold and applicability,
 * and compiles comprehensive results and safety warnings.
 */
export function runCompleteEnergyAssessment(params: {
  actualWeightKg: number;
  heightCm: number;
  ageYears: number;
  sex: BiologicalSex;
  activityLevel: ActivityLevel;
  stressCondition?: ClinicalStressCondition;
  leanBodyMassKg?: number;
  isObese?: boolean;
  adjustedWeightKg?: number;
  adjustmentKcal?: number; // e.g. -500 for weight loss, +300 for gain
  preferredEquation?: EnergyEquationId;
}): EnergyAssessmentOutput {
  const {
    actualWeightKg,
    heightCm,
    ageYears,
    sex,
    activityLevel,
    stressCondition = 'normal',
    leanBodyMassKg,
    isObese = false,
    adjustedWeightKg,
    adjustmentKcal = 0,
    preferredEquation,
  } = params;

  const actConfig = ACTIVITY_LEVELS[activityLevel];
  const stressConfig = STRESS_CONDITIONS[stressCondition];
  const multiplier = actConfig.palFactor * stressConfig.factor;

  // Decide weight for equations: Mifflin-St Jeor works on actual weight in obesity,
  // whereas older equations like Harris-Benedict often warrant ABW or an alert.
  const weightForStandard = isObese && adjustedWeightKg ? adjustedWeightKg : actualWeightKg;

  const results: Partial<Record<EnergyEquationId, EnergyCalculationSingleResult>> = {};

  // 1. Mifflin-St Jeor
  // In obesity, Mifflin with actual weight is the gold standard (AND guideline).
  const mifflinBmr = calculateMifflinStJeor(actualWeightKg, heightCm, ageYears, sex);
  results.mifflin_st_jeor = {
    equationId: 'mifflin_st_jeor',
    bmrKcal: mifflinBmr,
    tdeeKcal: Math.round(mifflinBmr * multiplier),
    citation: SCIENTIFIC_CITATIONS.mifflin_st_jeor,
    weightUsedType: 'actual',
    weightUsedKg: actualWeightKg,
    isAppropriate: true,
    suitabilityNoteAr: isObese
      ? 'الخيار الأول الموصى به سريرياً لحالات السمنة بالوزن الفعلي وفق دراسات AND/ADA.'
      : 'دقيقة للغاية ومثالية للبالغين الأصحاء.',
    suitabilityNoteEn: isObese
      ? 'Primary recommended equation for obesity with actual weight (AND evidence-based library).'
      : 'Highly accurate for standard healthy adults.',
  };

  // 2. Revised Harris-Benedict
  const hbWeight = isObese && adjustedWeightKg ? adjustedWeightKg : actualWeightKg;
  const hbBmr = calculateHarrisBenedictRevised(hbWeight, heightCm, ageYears, sex);
  results.harris_benedict_revised = {
    equationId: 'harris_benedict_revised',
    bmrKcal: hbBmr,
    tdeeKcal: Math.round(hbBmr * multiplier),
    citation: SCIENTIFIC_CITATIONS.harris_benedict_revised,
    weightUsedType: isObese && adjustedWeightKg ? 'adjusted' : 'actual',
    weightUsedKg: hbWeight,
    isAppropriate: !isObese || Boolean(adjustedWeightKg),
    suitabilityNoteAr: isObese
      ? 'في السمنة المفرطة، يفضل استخدام الوزن المعدل (Adjusted Weight) لتفادي المبالغة بالتقدير.'
      : 'معادلة كلاسيكية موثوقة عند مراجعة 1984.',
    suitabilityNoteEn: isObese
      ? 'In obesity, Adjusted Body Weight is clinically utilized to prevent overestimation.'
      : 'Classic validated equation after 1984 re-evaluation.',
  };

  // 3. Katch-McArdle
  if (leanBodyMassKg && leanBodyMassKg > 0) {
    const katchBmr = calculateKatchMcArdle(leanBodyMassKg);
    results.katch_mcardle = {
      equationId: 'katch_mcardle',
      bmrKcal: katchBmr,
      tdeeKcal: Math.round(katchBmr * multiplier),
      citation: SCIENTIFIC_CITATIONS.katch_mcardle,
      weightUsedType: 'lean_mass',
      weightUsedKg: leanBodyMassKg,
      isAppropriate: true,
      suitabilityNoteAr: 'مثالية إذا كانت نسبة الدهون والكتلة اللادهنية مقاسة بجهاز موثوق.',
      suitabilityNoteEn: 'Ideal when measured Lean Body Mass is available.',
    };
  } else {
    results.katch_mcardle = {
      equationId: 'katch_mcardle',
      bmrKcal: 0,
      tdeeKcal: 0,
      citation: SCIENTIFIC_CITATIONS.katch_mcardle,
      weightUsedType: 'lean_mass',
      weightUsedKg: 0,
      isAppropriate: false,
      suitabilityNoteAr: 'غير متاحة لعدم توفر قياس الكتلة اللادهنية (LBM).',
      suitabilityNoteEn: 'Unavailable: requires verified Lean Body Mass (LBM).',
    };
  }

  // 4. Cunningham
  if (leanBodyMassKg && leanBodyMassKg > 0) {
    const cunninghamBmr = calculateCunningham(leanBodyMassKg);
    results.cunningham = {
      equationId: 'cunningham',
      bmrKcal: cunninghamBmr,
      tdeeKcal: Math.round(cunninghamBmr * multiplier),
      citation: SCIENTIFIC_CITATIONS.cunningham,
      weightUsedType: 'lean_mass',
      weightUsedKg: leanBodyMassKg,
      isAppropriate: true,
      suitabilityNoteAr: 'الأفضل للرياضيين وذوي الكتل العضلية البارزة.',
      suitabilityNoteEn: 'Best suited for athletes and muscular individuals.',
    };
  } else {
    results.cunningham = {
      equationId: 'cunningham',
      bmrKcal: 0,
      tdeeKcal: 0,
      citation: SCIENTIFIC_CITATIONS.cunningham,
      weightUsedType: 'lean_mass',
      weightUsedKg: 0,
      isAppropriate: false,
      suitabilityNoteAr: 'غير متاحة لعدم توفر قياس الكتلة اللادهنية (FFM).',
      suitabilityNoteEn: 'Unavailable: requires verified Fat-Free Mass (FFM).',
    };
  }

  // 5. Schofield
  const schofieldBmr = calculateSchofield(weightForStandard, ageYears, sex);
  results.schofield = {
    equationId: 'schofield',
    bmrKcal: schofieldBmr,
    tdeeKcal: Math.round(schofieldBmr * multiplier),
    citation: SCIENTIFIC_CITATIONS.schofield,
    weightUsedType: isObese && adjustedWeightKg ? 'adjusted' : 'actual',
    weightUsedKg: weightForStandard,
    isAppropriate: true,
    suitabilityNoteAr: 'مناسبة للمقارنة المعيارية وتغطي الفئات العمرية المتنوعة.',
    suitabilityNoteEn: 'Validated across wide chronological age cohorts.',
  };

  // 6. WHO / FAO / UNU
  const whoBmr = calculateWhoFaoUnu(weightForStandard, ageYears, sex);
  results.who_fao_unu = {
    equationId: 'who_fao_unu',
    bmrKcal: whoBmr,
    tdeeKcal: Math.round(whoBmr * multiplier),
    citation: SCIENTIFIC_CITATIONS.who_fao_unu,
    weightUsedType: isObese && adjustedWeightKg ? 'adjusted' : 'actual',
    weightUsedKg: weightForStandard,
    isAppropriate: true,
    suitabilityNoteAr: 'معيار منظمة الصحة العالمية للصحة المجتمعية والعيادات العامة.',
    suitabilityNoteEn: 'WHO international baseline standard.',
  };

  // Select primary recommended equation:
  // If muscular with LBM -> Cunningham or Katch-McArdle
  // Default general & obesity -> Mifflin-St Jeor
  let primaryRecommended: EnergyEquationId = 'mifflin_st_jeor';
  if (preferredEquation && results[preferredEquation]?.isAppropriate) {
    primaryRecommended = preferredEquation;
  } else if (leanBodyMassKg && leanBodyMassKg > 0 && results.cunningham?.isAppropriate) {
    primaryRecommended = 'mifflin_st_jeor'; // Still keep Mifflin as primary clinical default unless preferred
  }

  const primaryObj = results[primaryRecommended]!;
  const recommendedBmr = primaryObj.bmrKcal;
  const recommendedTdee = primaryObj.tdeeKcal;
  const targetKcal = recommendedTdee + adjustmentKcal;

  // Compile clinical safety alerts
  const safetyAlerts: Array<{
    severity: 'warning' | 'danger' | 'info';
    messageEn: string;
    messageAr: string;
  }> = [];

  // Low calorie intake alert
  const minimumSafeKcal = sex === 'male' ? 1500 : 1200;
  if (targetKcal < minimumSafeKcal) {
    safetyAlerts.push({
      severity: 'danger',
      messageEn: `Prescribed calories (${targetKcal} kcal) are below the conventional safety floor (${minimumSafeKcal} kcal/day for ${sex}). Diets below this threshold require specialized clinical VLCD monitoring for micronutrient adequacy and electrolyte preservation.`,
      messageAr: `السعرات المحددة (${targetKcal} سعرة) تقل عن الحد السريري الآمن (${minimumSafeKcal} سعرة/يوم للـ${sex === 'male' ? 'رجال' : 'نساء'}). الحميات شديدة الانخفاض تتطلب إشرافاً طبياً خاصاً ومكملات دقيقة لمنع فقدان المعادن والمشاكل الحصوية.`,
    });
  }

  // Excessive calorie deficit alert
  if (adjustmentKcal <= -1000) {
    safetyAlerts.push({
      severity: 'warning',
      messageEn: `Caloric deficit is high (${Math.abs(adjustmentKcal)} kcal/day). Deficits exceeding 1000 kcal/day carry risks of accelerated lean muscle loss and adaptive thermogenesis reduction.`,
      messageAr: `عجز السعرات كبير (${Math.abs(adjustmentKcal)} سعرة/يوم). العجز المتجاوز لـ 1000 سعرة يومياً يزيد من احتمالية هدم الكتلة العضلية وانخفاض معدل الأيض التكيفي.`,
    });
  }

  // Obesity alert
  if (isObese) {
    safetyAlerts.push({
      severity: 'info',
      messageEn:
        'Obesity detected: Mifflin-St Jeor using actual weight is utilized as the primary evidence-based benchmark.',
      messageAr:
        'تم رصد سمنة سريرية: يتم اعتماد معادلة مفلين - سانت جور بالوزن الفعلي كمعيار استرشادي رئيسي.',
    });
  }

  return {
    calculatedEquations: results as Record<EnergyEquationId, EnergyCalculationSingleResult>,
    primaryRecommendedEquation: primaryRecommended,
    recommendedBmrKcal: recommendedBmr,
    recommendedTdeeKcal: recommendedTdee,
    activityLevel: actConfig,
    stressCondition: stressConfig,
    targetKcal,
    adjustmentKcal,
    safetyAlerts,
  };
}
