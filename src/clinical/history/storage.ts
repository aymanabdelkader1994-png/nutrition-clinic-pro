/**
 * Nutrition Clinic Pro - LocalStorage Assessment History Engine
 * Resilient, safe persistence with in-memory fallback, export/import, and demo seeds.
 */

import { PatientAssessmentRecord } from './types';

const STORAGE_KEY = 'ncp_patient_assessments_v1';

// In-memory fallback for environments without localStorage access
let memoryFallback: PatientAssessmentRecord[] = [];

function isLocalStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const testKey = '__ncp_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Retrieves all saved patient assessment records.
 */
export function getSavedAssessments(): PatientAssessmentRecord[] {
  if (!isLocalStorageAvailable()) {
    return [...memoryFallback];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (err) {
    console.error('Failed to read assessments from localStorage:', err);
    return [...memoryFallback];
  }
}

/**
 * Persists an assessment record. If an ID already exists, it is updated; otherwise added.
 */
export function saveAssessment(
  record: Omit<PatientAssessmentRecord, 'id' | 'timestamp'> & {
    id?: string;
    timestamp?: string;
  }
): PatientAssessmentRecord {
  const current = getSavedAssessments();
  const id =
    record.id || `asmt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const timestamp = record.timestamp || new Date().toISOString();

  const finalRecord: PatientAssessmentRecord = {
    ...record,
    id,
    timestamp,
    patientName: record.patientName?.trim() || 'Patient',
    visitDate: record.visitDate || timestamp.substring(0, 10),
  };

  const existingIdx = current.findIndex((r) => r.id === id);
  let updatedList: PatientAssessmentRecord[];
  if (existingIdx >= 0) {
    updatedList = [...current];
    updatedList[existingIdx] = finalRecord;
  } else {
    updatedList = [finalRecord, ...current];
  }

  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    } catch (err) {
      console.warn('LocalStorage save failed, using memory fallback:', err);
      memoryFallback = updatedList;
    }
  } else {
    memoryFallback = updatedList;
  }

  return finalRecord;
}

/**
 * Retrieves a single assessment record by ID.
 */
export function getAssessmentById(id: string): PatientAssessmentRecord | undefined {
  const current = getSavedAssessments();
  return current.find((r) => r.id === id);
}

/**
 * Deletes an assessment record by ID.
 */
export function deleteAssessment(id: string): boolean {
  const current = getSavedAssessments();
  const filtered = current.filter((r) => r.id !== id);
  if (filtered.length === current.length) return false;

  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (err) {
      console.error('Failed to update localStorage after delete:', err);
    }
  }
  memoryFallback = filtered;
  return true;
}

/**
 * Clears all assessments.
 */
export function clearAllAssessments(): void {
  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error('Failed to clear localStorage assessments:', err);
    }
  }
  memoryFallback = [];
}

/**
 * Exports all assessments as formatted JSON string for backup/sharing.
 */
export function exportAssessmentsJson(): string {
  const data = getSavedAssessments();
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      app: 'Nutrition Clinic Pro',
      version: '1.0',
      recordCount: data.length,
      records: data,
    },
    null,
    2
  );
}

/**
 * Imports assessments from JSON string with validation.
 */
export function importAssessmentsJson(
  jsonString: string
): { importedCount: number; errors: string[] } {
  try {
    const parsed = JSON.parse(jsonString);
    const candidateList = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.records)
      ? parsed.records
      : null;

    if (!candidateList) {
      return { importedCount: 0, errors: ['Invalid JSON format: missing array of records'] };
    }

    const current = getSavedAssessments();
    const existingIds = new Set(current.map((r) => r.id));
    let count = 0;
    const errors: string[] = [];

    const toAdd: PatientAssessmentRecord[] = [];
    for (let i = 0; i < candidateList.length; i++) {
      const item = candidateList[i];
      if (
        !item ||
        typeof item !== 'object' ||
        !item.inputs ||
        typeof item.inputs.weightKg !== 'number' ||
        typeof item.inputs.heightCm !== 'number'
      ) {
        errors.push(`Record #${i + 1} skipped: invalid clinical structure`);
        continue;
      }

      const id = item.id && !existingIds.has(item.id)
        ? item.id
        : `asmt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      toAdd.push({
        ...item,
        id,
        patientName: item.patientName || 'Imported Patient',
        timestamp: item.timestamp || new Date().toISOString(),
        visitDate: item.visitDate || new Date().toISOString().substring(0, 10),
      });
      existingIds.add(id);
      count++;
    }

    const merged = [...toAdd, ...current];
    if (isLocalStorageAvailable()) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    }
    memoryFallback = merged;

    return { importedCount: count, errors };
  } catch (err) {
    return {
      importedCount: 0,
      errors: [err instanceof Error ? err.message : 'Invalid JSON file'],
    };
  }
}

/**
 * Seeds a realistic 12-week clinical progression for demo & testing purposes.
 */
export function seedDemoProgressData(patientName = 'Ahmed Mansour (أحمد منصور)'): PatientAssessmentRecord[] {
  const visits = [
    {
      date: '2026-08-15',
      weight: 96.0,
      waist: 102,
      bodyFat: 28,
      notes: 'Initial clinical assessment. Diagnosis: Class I Obesity (BMI 31.3). Caloric deficit initialized at -500 kcal.',
      equation: 'mifflin_st_jeor' as const,
      adjKcal: -500,
      targetKcal: 2050,
      tdeeKcal: 2550,
      bmrKcal: 1880,
    },
    {
      date: '2026-09-12',
      weight: 93.2,
      waist: 99,
      bodyFat: 26.5,
      notes: 'Week 4 follow-up. Satisfactory adherence. Weight down 2.8 kg. No reported hunger or fatigue.',
      equation: 'mifflin_st_jeor' as const,
      adjKcal: -500,
      targetKcal: 2010,
      tdeeKcal: 2510,
      bmrKcal: 1845,
    },
    {
      date: '2026-10-10',
      weight: 90.5,
      waist: 96,
      bodyFat: 25.0,
      notes: 'Week 8 follow-up. Sustained progress. Total loss: 5.5 kg. Patient commenced moderate aerobic resistance training.',
      equation: 'mifflin_st_jeor' as const,
      adjKcal: -500,
      targetKcal: 1980,
      tdeeKcal: 2480,
      bmrKcal: 1815,
    },
    {
      date: '2026-11-07',
      weight: 88.0,
      waist: 93,
      bodyFat: 23.5,
      notes: 'Week 12 follow-up. Weight loss milestone achieved: 8.0 kg total reduction. BMI transitioned to Overweight category (28.7).',
      equation: 'mifflin_st_jeor' as const,
      adjKcal: -450,
      targetKcal: 1990,
      tdeeKcal: 2440,
      bmrKcal: 1785,
    },
  ];

  const heightCm = 175;
  const ageYears = 35;
  const sex = 'male' as const;

  const records: PatientAssessmentRecord[] = visits.map((v, i) => {
    const bmi = Math.round((v.weight / ((heightCm / 100) ** 2)) * 10) / 10;
    const id = `demo_asmt_${i + 1}`;
    const timestamp = `${v.date}T09:00:00.000Z`;

    return {
      id,
      patientName,
      patientIdOrMrn: 'MRN-2026-089',
      timestamp,
      visitDate: v.date,
      notes: v.notes,
      inputs: {
        sex,
        ageYears,
        heightCm,
        weightKg: v.weight,
        waistCm: v.waist,
        hipCm: 104 - (i * 2),
        bodyFatPercent: v.bodyFat,
        hasBodyFat: true,
        activityLevel: 'lightly_active',
        stressCondition: 'normal',
        adjustmentKcal: v.adjKcal,
        selectedEquation: v.equation,
        selectedDietPreset: 'high_protein_weight_loss',
        carbsPercent: 35,
        proteinPercent: 35,
        fatPercent: 30,
      },
      anthropometrics: {
        bmi,
        bmiCategoryKey: bmi >= 30 ? 'obese_1' : 'overweight',
        bmiCategoryAr: bmi >= 30 ? 'سمنة من الدرجة الأولى' : 'زيادة في الوزن',
        bmiCategoryEn: bmi >= 30 ? 'Obesity Class I' : 'Overweight',
        isPediatric: false,
        ibwDevineKg: 70.6,
        ibwHamwiKg: 73.0,
        ibwRobinsonKg: 69.5,
        abwKg: 79.5,
        isAdjustedWeightNeeded: bmi >= 30,
        waistToHipRatio: Math.round((v.waist / (104 - (i * 2))) * 100) / 100,
        whrRiskAr: 'خطر أيضي معتدل',
        whrRiskEn: 'Moderate Cardiometabolic Risk',
        leanBodyMassKg: Math.round(v.weight * (1 - v.bodyFat / 100) * 10) / 10,
        fatMassKg: Math.round(v.weight * (v.bodyFat / 100) * 10) / 10,
      },
      energy: {
        equationUsed: v.equation,
        bmrKcal: v.bmrKcal,
        tdeeKcal: v.tdeeKcal,
        targetKcal: v.targetKcal,
        adjustmentKcal: v.adjKcal,
      },
      macronutrients: {
        carbsGrams: Math.round((v.targetKcal * 0.35) / 4),
        proteinGrams: Math.round((v.targetKcal * 0.35) / 4),
        fatGrams: Math.round((v.targetKcal * 0.30) / 9),
        carbsKcal: Math.round(v.targetKcal * 0.35),
        proteinKcal: Math.round(v.targetKcal * 0.35),
        fatKcal: Math.round(v.targetKcal * 0.30),
        proteinPerKgActual: Math.round(((v.targetKcal * 0.35) / 4 / v.weight) * 10) / 10,
      },
    };
  });

  if (isLocalStorageAvailable()) {
    const existing = getSavedAssessments().filter((r) => !r.id.startsWith('demo_'));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...records, ...existing]));
  }
  memoryFallback = [...records];
  return records;
}
