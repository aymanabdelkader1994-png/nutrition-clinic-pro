/**
 * Nutrition Clinic Pro - Daily Meal Plan LocalStorage Persistence
 * Matches Phase 3/History safe storage pattern with in-memory fallback.
 */

import { DailyMealPlan } from './types';

const STORAGE_KEY = 'ncp_daily_meal_plans_v1';

let memoryFallback: DailyMealPlan[] = [];

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

export function getSavedMealPlans(): DailyMealPlan[] {
  if (!isLocalStorageAvailable()) {
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

export function saveMealPlan(plan: DailyMealPlan): DailyMealPlan {
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

  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextList));
    } catch {
      memoryFallback = nextList;
    }
  } else {
    memoryFallback = nextList;
  }

  return updatedPlan;
}

export function deleteSavedMealPlan(planId: string): boolean {
  const current = getSavedMealPlans();
  const filtered = current.filter((p) => p.id !== planId);
  if (filtered.length === current.length) return false;

  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch {
      memoryFallback = filtered;
    }
  } else {
    memoryFallback = filtered;
  }
  return true;
}

export function clearSavedMealPlansForTesting(): void {
  memoryFallback = [];
  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}
