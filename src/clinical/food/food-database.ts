/**
 * Nutrition Clinic Pro - Food Composition & Exchange Catalog
 * Phase 2 Foundation, Remediation & Expansion Catalog
 *
 * Provides source-supported and clinically reviewed nutritional records per 100g edible portion.
 * Strictly distinguishes composition provenance across tiers:
 * - verified_standard: Analytically sourced institutional food composition tables (USDA FoodData Central, Egyptian NNI 2006)
 * - clinic_reviewed: Clinic-reviewed reference estimates and explicit exchange-only RegimePlan 2026 records (unassayed nutrients kept null)
 * - recipe_based: Standardized culinary composite recipes estimated from constituent ingredients (not chemical assays)
 * - user_custom: Clinic/patient custom entries without official institutional reference verification
 *
 * Enforces provenance separation:
 * - sourceId: Data source identifier (e.g. usda_fdc, egyptian_nni_2006, regimeplan_2026, clinic_reviewed)
 * - sourceRecordId: Official institutional publication/table identifier (undefined when not issued)
 * - compositionBasis: 'analytical_table' | 'clinic_estimated' | 'recipe_based' | 'exchange_only'
 * - code: Internal application reference code
 * - verificationStatus: 'verified_standard' | 'clinic_reviewed' | 'recipe_based' | 'user_custom'
 * - carbCalculationBasis: 'total_by_difference' (USDA & Egyptian NNI standard)
 * - portions: support multi-component exchangeBreakdown and exchangeEvidenceStatus
 */

import { FoodDataSource, FoodItemRecord, VerificationStatus } from './types';
import { ALL_EXPANDED_FOOD_ITEMS } from './data/index';
import { searchFoodItems as baseSearchFoodItems, FoodFilterOptions } from './scaling-engine';

export const DATA_SOURCES: Record<string, FoodDataSource> = {
  usda_fdc: {
    id: 'usda_fdc',
    code: 'USDA-FDC',
    nameEn: 'USDA FoodData Central / Standard Reference Legacy',
    nameAr: 'قاعدة بيانات وزارة الزراعة الأمريكية (USDA FoodData Central)',
    citation: 'U.S. Department of Agriculture, Agricultural Research Service. FoodData Central, 2019. fdc.nal.usda.gov.',
    countryOrRegion: 'United States / International',
    publicationYear: 2019,
    isStandardReference: true,
  },
  egyptian_nni_2006: {
    id: 'egyptian_nni_2006',
    code: 'NNI-EGY-2006',
    nameEn: 'National Nutrition Institute (NNI) Food Composition Tables for Egypt',
    nameAr: 'جداول تحليل الأطعمة للمعهد القومي للتغذية بمصر (NNI)',
    citation: 'National Nutrition Institute (NNI), General Organization for Teaching Hospitals and Institutes, Cairo, Egypt, 2006.',
    countryOrRegion: 'Egypt & Middle East',
    publicationYear: 2006,
    isStandardReference: true,
  },
  regimeplan_2026: {
    id: 'regimeplan_2026',
    code: 'REGIMEPLAN-2026',
    nameEn: 'RegimePlan Food Exchange System (Arabic Edition, 2026)',
    nameAr: 'قوائم البدائل الغذائية ريجيم بلان (الطبعة العربية 2026)',
    citation: 'RegimePlan Clinical Nutrition Practice Food Exchange Lists (2026). regimeplan.com/ar/food-exchange-list. Exchange portion weights and household measures; unassayed foods carry explicit exchange_only null nutrient profiles.',
    countryOrRegion: 'Egypt & Arab Region',
    publicationYear: 2026,
    isStandardReference: true,
  },
  clinic_reviewed: {
    id: 'clinic_reviewed',
    code: 'NCP-CLINIC-REV',
    nameEn: 'Nutrition Clinic Pro Dietetic Review Committee',
    nameAr: 'اللجنة الاستشارية السريرية للعيادة',
    citation: 'Internal Dietetic Review Protocol (clinic-reviewed reference and recipe-based composition estimates), Nutrition Clinic Pro.',
    countryOrRegion: 'Clinical Practice Standard',
    isStandardReference: false,
  },
};

/**
 * The standard compiled database containing 676 food records across analytical food tables
 * (verified_standard), clinic-reviewed / exchange-only records (clinic_reviewed),
 * and standardized composite recipes (recipe_based).
 */
export const STANDARD_FOOD_DATABASE: FoodItemRecord[] = ALL_EXPANDED_FOOD_ITEMS;

/**
 * Backward-compatible alias for the standard food database.
 */
export const VERIFIED_FOOD_SEED: FoodItemRecord[] = ALL_EXPANDED_FOOD_ITEMS;

let customFoodRegistry: FoodItemRecord[] = [];

/**
 * Retrieves all food records (standard catalog + registered user custom foods).
 */
export function getAllFoodItems(): FoodItemRecord[] {
  return [...ALL_EXPANDED_FOOD_ITEMS, ...customFoodRegistry];
}

/**
 * Retrieves a single food record by its unique ID.
 */
export function getFoodItemById(id: string): FoodItemRecord | undefined {
  return getAllFoodItems().find((f) => f.id === id);
}

/**
 * Registers a user custom food item in runtime memory.
 */
export function registerCustomFoodItem(
  item: Omit<FoodItemRecord, 'id' | 'isCustom' | 'verificationStatus' | 'sourceId'> & {
    id?: string;
    sourceId?: string;
    sourceRecordId?: string;
    verificationStatus?: VerificationStatus;
  }
): FoodItemRecord {
  const newId = item.id || `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  if (ALL_EXPANDED_FOOD_ITEMS.some((v) => v.id === newId)) {
    throw new Error(`Cannot register custom food with reserved standard ID ${newId}.`);
  }

  const sourceId = item.sourceId || item.dataSourceId || 'clinic_reviewed';

  const customRecord: FoodItemRecord = {
    ...item,
    id: newId,
    sourceId,
    sourceRecordId: item.sourceRecordId,
    dataSourceId: sourceId,
    isCustom: true,
    verificationStatus: item.verificationStatus || 'user_custom',
    compositionBasis: item.compositionBasis ?? 'clinic_estimated',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const existingIdx = customFoodRegistry.findIndex((c) => c.id === newId);
  if (existingIdx >= 0) {
    customFoodRegistry[existingIdx] = customRecord;
  } else {
    customFoodRegistry.push(customRecord);
  }

  return customRecord;
}

/**
 * Clears custom runtime foods (primarily used for unit test teardown).
 */
export function clearCustomFoodsForTesting(): void {
  customFoodRegistry = [];
}

/**
 * Bilingual search across the food catalog with optional filtering.
 */
export function searchFoodCatalog(query: string, options?: FoodFilterOptions): FoodItemRecord[] {
  return baseSearchFoodItems(getAllFoodItems(), query, options);
}
