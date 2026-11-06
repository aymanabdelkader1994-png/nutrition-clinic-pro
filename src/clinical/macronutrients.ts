/**
 * Macronutrient & Dietary Target Engine
 * Nutrition Clinic Pro - Deterministic Clinical Engine
 * 
 * Computes deterministic macronutrient distribution, grams-per-kilogram validation,
 * fiber recommendations, and fluid requirements.
 */

import { MacronutrientTarget } from './types';

export interface MacroDistributionRatio {
  carbsPercent: number;
  proteinPercent: number;
  fatPercent: number;
}

export type DietaryApproachPresetId =
  | 'balanced_clinical'
  | 'mediterranean'
  | 'high_protein_weight_loss'
  | 'low_carb'
  | 'ketogenic'
  | 'endurance_athlete';

export interface DietaryApproachConfig {
  id: DietaryApproachPresetId;
  nameEn: string;
  nameAr: string;
  descriptionAr: string;
  defaultRatio: MacroDistributionRatio;
  typicalProteinGPerKg: string;
}

export const DIETARY_APPROACH_PRESETS: Record<DietaryApproachPresetId, DietaryApproachConfig> = {
  balanced_clinical: {
    id: 'balanced_clinical',
    nameEn: 'Balanced Clinical (AMDR)',
    nameAr: 'نظام متوازن علاجي (توصيات AMDR القياسية)',
    descriptionAr: 'كربوهيدرات معتدلة 50%، بروتين 20%، دهون صحية 30%. نطاق التوزيع المقبول للمغذيات (AMDR) للمحافظة والتغذية العامة.',
    defaultRatio: { carbsPercent: 50, proteinPercent: 20, fatPercent: 30 },
    typicalProteinGPerKg: '0.8 - 1.2 جم/كجم',
  },
  mediterranean: {
    id: 'mediterranean',
    nameEn: 'Mediterranean Diet',
    nameAr: 'حمية البحر الأبيض المتوسط الصحية',
    descriptionAr: 'كربوهيدرات معقدة 45%، بروتين 20%، دهون أحادية غير مشبعة 35%. نمط وقائي لصحة القلب وضبط التمثيل الغذائي.',
    defaultRatio: { carbsPercent: 45, proteinPercent: 20, fatPercent: 35 },
    typicalProteinGPerKg: '1.0 - 1.3 جم/كجم',
  },
  high_protein_weight_loss: {
    id: 'high_protein_weight_loss',
    nameEn: 'High Protein / Satiety (Weight Management)',
    nameAr: 'عالي البروتين لإنقاص الوزن والحفاظ على العضلات',
    descriptionAr: 'بروتين 35%، كربوهيدرات 35%، دهون 30%. يعزز الشبع ويحمي الكتلة العضلية أثناء عجز السعرات تحت إشراف أخصائي.',
    defaultRatio: { carbsPercent: 35, proteinPercent: 35, fatPercent: 30 },
    typicalProteinGPerKg: '1.6 - 2.2 جم/كجم',
  },
  low_carb: {
    id: 'low_carb',
    nameEn: 'Low Carbohydrate Diet',
    nameAr: 'منخفض الكربوهيدرات (Low Carb)',
    descriptionAr: 'كربوهيدرات 20%، بروتين 30%، دهون 50%. يهدف لتقليل الحمل الجلايسيمي، يتطلب تقييماً طبياً وتعديل جرعات أدوية السكري.',
    defaultRatio: { carbsPercent: 20, proteinPercent: 30, fatPercent: 50 },
    typicalProteinGPerKg: '1.4 - 1.8 جم/كجم',
  },
  ketogenic: {
    id: 'ketogenic',
    nameEn: 'Standard Ketogenic (LCHF)',
    nameAr: 'حمية كيتوجينيك قياسية (قليلة الكربوهيدرات عالية الدهون)',
    descriptionAr: 'كربوهيدرات 5%، بروتين 25%، دهون 70%. نمط كيتوني عام لإدارة الوزن، وليس بروتوكولاً طبياً لعلاج الصرع المستعصي (الذي يتطلب 3:1 أو 4:1 دهون).',
    defaultRatio: { carbsPercent: 5, proteinPercent: 25, fatPercent: 70 },
    typicalProteinGPerKg: '1.2 - 1.6 جم/كجم',
  },
  endurance_athlete: {
    id: 'endurance_athlete',
    nameEn: 'Endurance Athletic Protocol',
    nameAr: 'بروتوكول التحمل والرياضيين',
    descriptionAr: 'كربوهيدرات مرتفعة 60% لإعادة شحن الجليكوجين العضلي، بروتين 18%، دهون 22%.',
    defaultRatio: { carbsPercent: 60, proteinPercent: 18, fatPercent: 22 },
    typicalProteinGPerKg: '1.2 - 1.6 جم/كجم',
  },
};

/**
 * Calculates macronutrient target breakdown deterministically.
 * 
 * Scientific conversion constants:
 * - Protein: 4 kcal / gram
 * - Carbohydrate: 4 kcal / gram
 * - Fat: 9 kcal / gram
 * 
 * Fiber guideline: 14 g per 1000 kcal (WHO / Dietary Guidelines for Americans).
 * Fluid guideline: General oral estimation (35 ml/kg or 1 ml/kcal).
 * NOTE: This is an empirical oral estimate for healthy adults, not a clinical prescription
 * for patients with medical fluid restrictions (e.g. heart failure, end-stage kidney disease).
 */
export function calculateMacronutrientTargets(params: {
  targetCalories: number;
  ratio: MacroDistributionRatio;
  bodyWeightKg: number;
}): MacronutrientTarget {
  const { targetCalories, ratio, bodyWeightKg } = params;

  if (!Number.isFinite(targetCalories) || targetCalories <= 0) {
    throw new Error('Target calories must be a valid strictly positive number.');
  }
  if (!Number.isFinite(bodyWeightKg) || bodyWeightKg <= 0) {
    throw new Error('Body weight must be a valid strictly positive number.');
  }

  const { carbsPercent, proteinPercent, fatPercent } = ratio;

  // Validate each percentage: must be finite and within [0, 100]
  if (
    !Number.isFinite(carbsPercent) ||
    !Number.isFinite(proteinPercent) ||
    !Number.isFinite(fatPercent) ||
    carbsPercent < 0 ||
    carbsPercent > 100 ||
    proteinPercent < 0 ||
    proteinPercent > 100 ||
    fatPercent < 0 ||
    fatPercent > 100
  ) {
    throw new Error('Each macronutrient percentage must be a finite number between 0 and 100.');
  }

  const sumPercent = carbsPercent + proteinPercent + fatPercent;
  if (Math.abs(sumPercent - 100) > 0.01) {
    throw new Error(`Macronutrient percentages must sum to 100%. Current sum: ${sumPercent}%`);
  }

  // Calculate calories per macro
  const carbsKcal = Math.round(targetCalories * (carbsPercent / 100));
  const proteinKcal = Math.round(targetCalories * (proteinPercent / 100));
  // Deduce fat kcal from remaining calories to guarantee 100% mathematical equality
  const fatKcal = targetCalories - carbsKcal - proteinKcal;

  // Convert to grams
  const carbsGrams = Math.round((carbsKcal / 4) * 10) / 10;
  const proteinGrams = Math.round((proteinKcal / 4) * 10) / 10;
  const fatGrams = Math.round((fatKcal / 9) * 10) / 10;

  // Protein grams per kg body weight
  const proteinGramsPerKg = Math.round((proteinGrams / bodyWeightKg) * 100) / 100;

  // Fiber: 14 grams per 1000 kcal
  const fiberGramsTarget = Math.round((targetCalories / 1000) * 14);

  // Fluid requirement: General oral estimation (35 ml/kg or 1 ml/kcal)
  const fluidFromWeight = bodyWeightKg * 35;
  const fluidFromCalories = targetCalories * 1.0;
  const fluidRequirementMl = Math.round(Math.max(fluidFromWeight, fluidFromCalories));

  return {
    proteinGrams,
    proteinKcal,
    proteinPercentage: ratio.proteinPercent,
    proteinGramsPerKg,

    carbsGrams,
    carbsKcal,
    carbsPercentage: ratio.carbsPercent,

    fatGrams,
    fatKcal,
    fatPercentage: Math.round((fatKcal / targetCalories) * 1000) / 10,

    fiberGramsTarget,
    totalCalories: targetCalories,
    fluidRequirementMl,
  };
}
