/**
 * Nutrition Clinic Pro - Daily Meal Plan LocalStorage Persistence
 * Matches Phase 3/History safe storage pattern with explicit in-memory fallback status.
 */

import { DailyMealPlan } from './types';

const STORAGE_KEY = 'ncp_daily_meal_plans_v1';

export type MealPlanPersistenceMode = 'local_storage' | 'memory_fallback';

export interface SaveMealPlanResult {
  plan: DailyMealPlan;
  persistenceMode: MealPlanPersistenceMode;
  isDurable: boolean;
}

export interface MealPlanStorageStatus {
  isLocalStorageAvailable: boolean;
  isUsingMemoryFallback: boolean;
  persistenceMode: MealPlanPersistenceMode;
}

let memoryFallback: DailyMealPlan[] = [];
let storageWriteFallbackActive = false;

function isLocalStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const testKey = '__ncp_planner_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export function getMealPlanStorageStatus(): MealPlanStorageStatus {
  const available = isLocalStorageAvailable();
  const usingFallback = !available || storageWriteFallbackActive;
  return {
    isLocalStorageAvailable: available,
    isUsingMemoryFallback: usingFallback,
    persistenceMode: usingFallback ? 'memory_fallback' : 'local_storage',
  };
}

export function getSavedMealPlans(): DailyMealPlan[] {
  if (!isLocalStorageAvailable() || storageWriteFallbackActive) {
    return [...memoryFallback];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [...memoryFallback];
  }
}

export function saveMealPlanWithStatus(plan: DailyMealPlan): SaveMealPlanResult {
  const current = getSavedMealPlans();
  const updatedPlan: DailyMealPlan = {
    ...plan,
    updatedAt: new Date().toISOString(),
  };

  const existingIdx = current.findIndex((p) => p.id === updatedPlan.id);
  const nextList =
    existingIdx >= 0
      ? current.map((p, i) => (i === existingIdx ? updatedPlan : p))
      : [updatedPlan, ...current];

  let persistenceMode: MealPlanPersistenceMode = 'memory_fallback';

  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextList));
      storageWriteFallbackActive = false;
      memoryFallback = nextList;
      persistenceMode = 'local_storage';
    } catch {
      storageWriteFallbackActive = true;
      memoryFallback = nextList;
      persistenceMode = 'memory_fallback';
    }
  } else {
    storageWriteFallbackActive = true;
    memoryFallback = nextList;
    persistenceMode = 'memory_fallback';
  }

  return {
    plan: updatedPlan,
    persistenceMode,
    isDurable: persistenceMode === 'local_storage',
  };
}

export function saveMealPlan(plan: DailyMealPlan): DailyMealPlan {
  return saveMealPlanWithStatus(plan).plan;
}

export function deleteSavedMealPlan(planId: string): boolean {
  const current = getSavedMealPlans();
  const filtered = current.filter((p) => p.id !== planId);
  if (filtered.length === current.length) return false;

  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      storageWriteFallbackActive = false;
      memoryFallback = filtered;
    } catch {
      storageWriteFallbackActive = true;
      memoryFallback = filtered;
    }
  } else {
    storageWriteFallbackActive = true;
    memoryFallback = filtered;
  }
  return true;
}

export function clearSavedMealPlansForTesting(): void {
  memoryFallback = [];
  storageWriteFallbackActive = false;
  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}
