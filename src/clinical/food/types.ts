/**
 * Nutrition Clinic Pro - Food Composition & Exchange System Types
 * Phase 2 Foundation & Controlled Remediation
 *
 * Strongly typed, bilingual domain models for:
 * - Data sources, provenance & record separation
 * - Verification tiers (verified standard, clinic reviewed, recipe-based, user custom)
 * - Food nutrient profiles (Total Carbohydrate by difference vs Available Carbohydrate)
 * - Portion & household measurement definitions with multi-exchange breakdowns
 * - Exchange systems & configurable reference values
 */

export type VerificationStatus =
  | 'verified_standard'  // Matched directly to recognized institutional food tables with official record IDs (e.g. USDA FDC, NNI)
  | 'clinic_reviewed'     // Reviewed by clinic dietetic committee or scientific peer-reviewed literature
  | 'recipe_based'       // Culinary composite recipe based on standardized preparation/proportions (not a single chemical assay)
  | 'user_custom';        // Created by clinic staff or patient; unverified against official laboratory tables

export type PreparationState =
  | 'raw'
  | 'cooked'
  | 'boiled'
  | 'grilled'
  | 'baked'
  | 'roasted'
  | 'fried'
  | 'canned'
  | 'dried'
  | 'ready-to-eat';

export type ExchangeSystemId = 'ada_and' | 'egyptian_nci' | 'custom';

export type ExchangeCategoryId =
  | 'starch'
  | 'fruit'
  | 'milk_skim'
  | 'milk_lowfat'
  | 'milk_whole'
  | 'vegetable_non_starchy'
  | 'meat_lean'
  | 'meat_medium_fat'
  | 'meat_high_fat'
  | 'plant_protein_legumes'
  | 'fat'
  | 'free_food'
  | 'combination_food';

/**
 * Basis of carbohydrate quantification in the underlying nutritional assay.
 */
export type CarbohydrateCalculationBasis =
  | 'total_by_difference'       // Total Carbohydrate calculated by difference: 100 - (protein + fat + water + ash). Includes dietary fiber. Standard in USDA SR Legacy / FoodData Central & Egyptian NNI.
  | 'available_carbohydrate'    // Available/Glycemic Carbohydrate analyzed directly or with dietary fiber excluded. Standard in FAO/INFOODS & European food tables.
  | 'unspecified';

export interface FoodDataSource {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  citation: string;
  countryOrRegion: string;
  publicationYear?: number;
  isStandardReference: boolean;
}

/**
 * Standard reference nutritional values for an exchange group within a specific exchange system.
 */
export interface ExchangeReferenceValue {
  categoryId: ExchangeCategoryId;
  nameEn: string;
  nameAr: string;
  carbsG: number;
  proteinG: number;
  fatG: number;
  caloriesKcal: number;
  clinicalDescriptionAr: string;
  clinicalDescriptionEn: string;
}

/**
 * Configuration and rules for an exchange system (e.g. ADA/AND vs Egyptian NCI).
 */
export interface ExchangeSystemDefinition {
  systemId: ExchangeSystemId;
  nameEn: string;
  nameAr: string;
  citation: string;
  exchangeValues: Record<ExchangeCategoryId, ExchangeReferenceValue>;
  notesAr: string;
  notesEn: string;
}

/**
 * Chemical composition of edible portion strictly standardized per 100.0 grams.
 * 
 * Clinical Rule:
 * Unknown or unmeasured nutrients MUST be represented as null.
 * NEVER substitute missing values with 0, as this leads to false clinical assumptions.
 */
export interface FoodNutrientProfile100g {
  basisWeightG: 100;
  caloriesKcal: number;
  /**
   * Carbohydrates per 100g.
   * CLINICAL NOTICE: In USDA SR Legacy and Egyptian NNI tables, this represents
   * "Total Carbohydrates by Difference" (100 - [water + protein + fat + ash]),
   * which includes dietary fiber.
   */
  carbsG: number;
  /**
   * Available / Glycemic Carbohydrates per 100g (chemically available carbohydrates:
   * Total Carbohydrates by Difference minus Dietary Fiber, per FAO/INFOODS guidelines).
   * Optional and nullable. MUST only be populated when explicitly reported by analytical sources
   * or when calculated according to a verified method where carbCalculationBasis === 'total_by_difference'.
   * Never blindly subtract fiber unless the source definition confirms it is total carbohydrate by difference.
   */
  availableCarbsG?: number | null;
  /**
   * Documented basis of carbohydrate quantification for this record.
   */
  carbCalculationBasis?: CarbohydrateCalculationBasis;
  proteinG: number;
  fatG: number;
  fiberG: number | null;
  saturatedFatG: number | null;
  transFatG: number | null;
  monounsaturatedFatG: number | null;
  polyunsaturatedFatG: number | null;
  cholesterolMg: number | null;
  sodiumMg: number | null;
  potassiumMg: number | null;
  calciumMg: number | null;
  ironMg: number | null;
  waterG?: number | null;
  missingNutrientKeys: string[];
}

export type ExchangeEvidenceStatus =
  | 'standard_published'       // Directly published in official exchange list table (e.g. ADA Choose Your Foods)
  | 'clinic_reviewed'          // Clinically reviewed standard practice portion (e.g. traditional clinical household measures without a discrete single-cell table entry)
  | 'clinical_linear_scaling'  // Derived by mathematical linear scaling of a published standard serving (e.g. 180g = 1.8x of 100g serving)
  | 'unclassified_composite';  // Composite recipe with unclassified multi-component exchanges (e.g. breaded meats, mixed casseroles)

/**
 * Calculated nutrients scaled to a specific food portion or net consumed weight.
 */
export interface ScaledNutrientProfile {
  netWeightG: number;
  caloriesKcal: number;
  carbsG: number;
  availableCarbsG?: number | null;
  carbCalculationBasis?: CarbohydrateCalculationBasis;
  proteinG: number;
  fatG: number;
  fiberG: number | null;
  saturatedFatG: number | null;
  transFatG: number | null;
  monounsaturatedFatG: number | null;
  polyunsaturatedFatG: number | null;
  cholesterolMg: number | null;
  sodiumMg: number | null;
  potassiumMg: number | null;
  calciumMg: number | null;
  ironMg: number | null;
  missingNutrientKeys: string[];
  exchangeCategory?: ExchangeCategoryId;
  calculatedExchangeCount?: number;
  /**
   * Multi-component exchange breakdown scaled to portion weight if defined.
   */
  exchangeBreakdown?: Partial<Record<ExchangeCategoryId, number>>;
  isUnclassifiedExchange?: boolean;
  unclassifiedExchangeNoticeEn?: string;
  unclassifiedExchangeNoticeAr?: string;
}

/**
 * Serving portion with household measurement and gram equivalent.
 * Supports both legacy single-category exchange mapping and modern multi-component breakdowns.
 */
export interface FoodPortion {
  id: string;
  portionNameEn: string;
  portionNameAr: string;
  householdMeasureEn: string;
  householdMeasureAr: string;
  gramWeight: number;
  /**
   * Primary nominal exchange category (maintained for backwards compatibility).
   */
  exchangeCategory: ExchangeCategoryId;
  /**
   * Primary nominal exchange factor (maintained for backwards compatibility).
   */
  exchangeEquivalentFactor: number;
  /**
   * Multi-component exchange allocation breakdown.
   * Maps each exchange category to its documented portion factor.
   * e.g. For cooked legumes: { starch: 1.0, meat_lean: 1.0 }
   * e.g. For a standardized composite dish: { starch: 2.0, meat_lean: 1.0, fat: 1.0 }
   * CLINICAL RULE: Never infer exchange breakdown automatically from macronutrients.
   * If a composite food is undocumented or unstandardized, it must remain unclassified or recipe-based.
   */
  exchangeBreakdown?: Partial<Record<ExchangeCategoryId, number>>;
  /** Evidence status documenting the provenance of the exchange allocation */
  exchangeEvidenceStatus?: ExchangeEvidenceStatus;
  /** True if this portion contains unclassified exchange contributions (e.g. breading starch in fried meats) */
  isUnclassifiedExchange?: boolean;
  unclassifiedExchangeNoticeEn?: string;
  unclassifiedExchangeNoticeAr?: string;
  notesAr?: string;
  notesEn?: string;
  isDefaultServing: boolean;
}

/**
 * Master Food Item record with clear provenance separation.
 */
export interface FoodItemRecord {
  id: string;
  code?: string; // Internal application reference code within Nutrition Clinic Pro
  sourceId: string; // ID of the FoodDataSource (e.g. 'usda_fdc', 'egyptian_nni_2006', 'clinic_reviewed')
  sourceRecordId?: string; // Verifiable official external publication record ID (e.g. USDA SR Legacy NDB number). Set to undefined when unavailable or not issued.
  /** @deprecated Kept for backwards compatibility with legacy callers */
  dataSourceId?: string;
  nameEn: string;
  nameAr: string;
  scientificName?: string;
  foodGroupId: string;
  primaryExchangeCategoryId: ExchangeCategoryId;
  preparationState: PreparationState;
  verificationStatus: VerificationStatus;
  isCustom: boolean;
  nutrients100g: FoodNutrientProfile100g;
  portions: FoodPortion[];
  tags?: string[];
  notesAr?: string;
  notesEn?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Difference between nominal exchange group estimate and actual food composition.
 */
export interface ExchangeDivergenceResult {
  foodId: string;
  foodNameEn: string;
  foodNameAr: string;
  portionNameEn: string;
  portionNameAr: string;
  gramWeight: number;
  exchangeCategory: ExchangeCategoryId;
  exchangeCount: number;
  
  // Nominal exchange expected nutrients
  nominalKcal: number;
  nominalCarbsG: number;
  nominalProteinG: number;
  nominalFatG: number;

  // Actual food analytical/table composition for this portion
  actualKcal: number;
  actualCarbsG: number;
  actualProteinG: number;
  actualFatG: number;

  // Divergence = Actual - Nominal
  deltaKcal: number;
  deltaCarbsG: number;
  deltaProteinG: number;
  deltaFatG: number;
  divergencePercentageKcal: number;
}
