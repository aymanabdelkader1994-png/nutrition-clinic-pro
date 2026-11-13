/**
 * Nutrition Clinic Pro - 24-Hour Dietary Recall Interactive Workbench
 * Phase 3 Implementation
 */

import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Scale,
  Sparkles,
  Info,
  Utensils,
  BarChart3,
  RefreshCw,
  Layers,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  FileCheck,
  Award,
} from 'lucide-react';

import {
  RecallSession,
  RecallDay,
  RecallMeal,
  RecallEntry,
  RecallPeriodDays,
  MealType,
  Phase1TargetInputs,
  STANDARD_MEAL_TYPES,
} from '../../clinical/recall/types';

import {
  createNewRecallSession,
  resolveRecallEntry,
  calculateDayNutrientSummary,
  calculateMultiDayRecallAnalysis,
  compareIntakeWithPhase1Targets,
  generateRecallSessionWarnings,
} from '../../clinical/recall/recall-engine';

import { getFoodItemById } from '../../clinical/food/food-database';
import { FoodEntryModal } from './FoodEntryModal';

interface RecallWorkbenchProps {
  isAr: boolean;
  phase1Targets?: Phase1TargetInputs;
  patientName?: string;
}

export function RecallWorkbench({
  isAr,
  phase1Targets = {},
  patientName,
}: RecallWorkbenchProps) {
  // Session State (held in memory so switching tabs/language preserves all inputs)
  const [session, setSession] = useState<RecallSession>(() =>
    createNewRecallSession({ targetDays: 1, startDate: new Date().toISOString().split('T')[0] })
  );

  // Active day index (0, 1, or 2)
  const [activeDayIdx, setActiveDayIdx] = useState<number>(0);

  // Modal State for adding food
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    dayIndex: number;
    mealId: string;
    mealNameEn: string;
    mealNameAr: string;
  }>({
    isOpen: false,
    dayIndex: 0,
    mealId: '',
    mealNameEn: '',
    mealNameAr: '',
  });

  // Target Days adjustment
  const handleSetTargetDays = (newTarget: RecallPeriodDays) => {
    if (newTarget === session.targetDays) return;

    const currentDays = [...session.days];
    if (newTarget > currentDays.length) {
      // Add missing days
      const lastDate = new Date(currentDays[currentDays.length - 1].date);
      for (let i = currentDays.length + 1; i <= newTarget; i++) {
        const nextDate = new Date(lastDate);
        nextDate.setDate(lastDate.getDate() + 1);
        const dateStr = nextDate.toISOString().split('T')[0];

        currentDays.push({
          id: `day_${i}_${Date.now()}`,
          dayIndex: i,
          date: dateStr,
          meals: [
            { id: `meal_breakfast_${i}_${Date.now()}`, mealType: 'breakfast', timeOfDay: '08:30', entries: [] },
            { id: `meal_lunch_${i}_${Date.now()}`, mealType: 'lunch', timeOfDay: '14:30', entries: [] },
            { id: `meal_dinner_${i}_${Date.now()}`, mealType: 'dinner', timeOfDay: '20:30', entries: [] },
            { id: `meal_snack_${i}_${Date.now()}`, mealType: 'afternoon_snack', timeOfDay: '17:30', entries: [] },
          ],
        });
      }
    }

    setSession({
      ...session,
      targetDays: newTarget,
      days: currentDays,
      updatedAt: new Date().toISOString(),
    });

    if (activeDayIdx >= newTarget) {
      setActiveDayIdx(newTarget - 1);
    }
  };

  // Add an entry to a meal
  const handleAddEntryToMeal = (entry: RecallEntry) => {
    const updatedDays = session.days.map((day, dIdx) => {
      if (dIdx !== modalState.dayIndex) return day;
      const updatedMeals = day.meals.map((meal) => {
        if (meal.id !== modalState.mealId) return meal;
        return {
          ...meal,
          entries: [...meal.entries, entry],
        };
      });
      return { ...day, meals: updatedMeals };
    });

    setSession({
      ...session,
      days: updatedDays,
      updatedAt: new Date().toISOString(),
    });
  };

  // Delete an entry from a meal
  const handleDeleteEntry = (dayIdx: number, mealId: string, entryId: string) => {
    const updatedDays = session.days.map((day, dIdx) => {
      if (dIdx !== dayIdx) return day;
      const updatedMeals = day.meals.map((meal) => {
        if (meal.id !== mealId) return meal;
        return {
          ...meal,
          entries: meal.entries.filter((e) => e.id !== entryId),
        };
      });
      return { ...day, meals: updatedMeals };
    });

    setSession({
      ...session,
      days: updatedDays,
      updatedAt: new Date().toISOString(),
    });
  };

  // Add a new custom meal to the active day
  const handleAddCustomMeal = () => {
    const activeDay = session.days[activeDayIdx];
    if (!activeDay) return;

    const newMeal: RecallMeal = {
      id: `meal_custom_${Date.now()}`,
      mealType: 'custom',
      customNameEn: `Extra Snack / Meal ${activeDay.meals.length + 1}`,
      customNameAr: `وجبة إضافية ${activeDay.meals.length + 1}`,
      timeOfDay: '16:00',
      entries: [],
    };

    const updatedDays = session.days.map((day, idx) =>
      idx === activeDayIdx ? { ...day, meals: [...day.meals, newMeal] } : day
    );

    setSession({
      ...session,
      days: updatedDays,
      updatedAt: new Date().toISOString(),
    });
  };

  // Remove an empty custom meal
  const handleDeleteMeal = (dayIdx: number, mealId: string) => {
    const updatedDays = session.days.map((day, dIdx) => {
      if (dIdx !== dayIdx) return day;
      return {
        ...day,
        meals: day.meals.filter((m) => m.id !== mealId),
      };
    });

    setSession({
      ...session,
      days: updatedDays,
      updatedAt: new Date().toISOString(),
    });
  };

  // Quick Seed Sample Recall for immediate testing
  const handleLoadSampleRecall = () => {
    const bread = getFoodItemById('food_bread_baladi_baked');
    const egg = getFoodItemById('food_egg_whole_boiled');
    const chicken = getFoodItemById('food_chicken_breast_grilled_skinless');
    const rice = getFoodItemById('food_rice_white_cooked');
    const salad = getFoodItemById('food_salad_baladi_green');
    const oil = getFoodItemById('food_oil_olive_extra_virgin');
    const apple = getFoodItemById('food_apple_raw_skin');
    const yogurt = getFoodItemById('food_yogurt_lowfat_plain');

    const s = createNewRecallSession({ targetDays: 2, startDate: '2026-11-08' });

    // Day 1:
    // Breakfast: 1 Baladi bread loaf (140g) + 2 Eggs (100g)
    const d1Meals: RecallMeal[] = [
      {
        id: 'd1_b',
        mealType: 'breakfast',
        timeOfDay: '08:00',
        entries: [
          bread ? resolveRecallEntry({ food: bread, selectedPortionId: 'portion_baladi_full_loaf', quantity: 1 }) : null,
          egg ? resolveRecallEntry({ food: egg, selectedPortionId: 'portion_egg_large', quantity: 2 }) : null,
        ].filter(Boolean) as RecallEntry[],
      },
      {
        id: 'd1_l',
        mealType: 'lunch',
        timeOfDay: '14:30',
        entries: [
          chicken ? resolveRecallEntry({ food: chicken, selectedPortionId: 'portion_chicken_grilled_serving', quantity: 1 }) : null,
          rice ? resolveRecallEntry({ food: rice, selectedPortionId: 'portion_rice_cooked_half_cup', quantity: 2 }) : null, // 1 cup rice
          salad ? resolveRecallEntry({ food: salad, selectedPortionId: 'portion_salad_bowl_cup', quantity: 1 }) : null,
          oil ? resolveRecallEntry({ food: oil, selectedPortionId: 'portion_olive_oil_tbsp', quantity: 1 }) : null,
        ].filter(Boolean) as RecallEntry[],
      },
      {
        id: 'd1_s',
        mealType: 'afternoon_snack',
        timeOfDay: '17:30',
        entries: [
          apple ? resolveRecallEntry({ food: apple, selectedPortionId: 'portion_apple_medium', quantity: 1 }) : null,
        ].filter(Boolean) as RecallEntry[],
      },
      {
        id: 'd1_d',
        mealType: 'dinner',
        timeOfDay: '20:30',
        entries: [
          yogurt ? resolveRecallEntry({ food: yogurt, selectedPortionId: 'portion_yogurt_egypt_pot', quantity: 1 }) : null,
        ].filter(Boolean) as RecallEntry[],
      },
    ];

    // Day 2:
    const d2Meals: RecallMeal[] = [
      {
        id: 'd2_b',
        mealType: 'breakfast',
        timeOfDay: '08:30',
        entries: [
          bread ? resolveRecallEntry({ food: bread, selectedPortionId: 'portion_baladi_half_loaf', quantity: 1 }) : null,
        ].filter(Boolean) as RecallEntry[],
      },
      {
        id: 'd2_l',
        mealType: 'lunch',
        timeOfDay: '15:00',
        entries: [
          chicken ? resolveRecallEntry({ food: chicken, selectedPortionId: 'portion_chicken_grilled_serving', quantity: 1 }) : null,
          rice ? resolveRecallEntry({ food: rice, selectedPortionId: 'portion_rice_cooked_half_cup', quantity: 1 }) : null,
        ].filter(Boolean) as RecallEntry[],
      },
    ];

    s.days[0].meals = d1Meals;
    if (s.days[1]) {
      s.days[1].meals = d2Meals;
    }

    setSession(s);
    setActiveDayIdx(0);
  };

  // Reset Session
  const handleResetSession = () => {
    if (window.confirm(isAr ? 'هل أنت متأكد من رغبتك في إعادة ضبط جلسة الاسترجاع الحالية؟' : 'Are you sure you want to start a fresh recall session?')) {
      setSession(createNewRecallSession({ targetDays: 1, startDate: new Date().toISOString().split('T')[0] }));
      setActiveDayIdx(0);
    }
  };

  // Calculations
  const activeDay = session.days[activeDayIdx] || session.days[0];

  // Daily Summary for Active Day
  const activeDaySummary = useMemo(() => {
    if (!activeDay) return null;
    return calculateDayNutrientSummary(activeDay);
  }, [activeDay]);

  // Multi-Day Analysis
  const multiDayAnalysis = useMemo(() => {
    return calculateMultiDayRecallAnalysis(session);
  }, [session]);

  // Target Comparisons
  const targetComparisons = useMemo(() => {
    return compareIntakeWithPhase1Targets({
      actualAverages: multiDayAnalysis.averages,
      targets: phase1Targets,
    });
  }, [multiDayAnalysis, phase1Targets]);

  // Clinical Warnings
  const warnings = useMemo(() => {
    return generateRecallSessionWarnings(session, phase1Targets);
  }, [session, phase1Targets]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Session Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-200">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                  {isAr ? 'الاسترجاع الغذائي 24 ساعة (24-Hour Dietary Recall)' : '24-Hour Dietary Recall'}
                </h2>
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                  Phase 3 Module
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {isAr
                  ? 'رصد المأخوذ الفعلي للمريض عبر 1–3 أيام وحساب العناصر الغذائية ومقارنتها بأهداف المرحلة الأولى'
                  : 'Multi-day actual intake evaluation, deterministic nutrient scaling, and Phase 1 target tracking'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Days Selector */}
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
              <span className="px-2 text-xs font-bold text-slate-500">
                {isAr ? 'عدد الأيام:' : 'Period:'}
              </span>
              {([1, 2, 3] as RecallPeriodDays[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleSetTargetDays(d)}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                    session.targetDays === d
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {d} {isAr ? (d === 1 ? 'يوم' : 'أيام') : d === 1 ? 'Day' : 'Days'}
                </button>
              ))}
            </div>

            {/* Quick Demo Button */}
            <button
              type="button"
              onClick={handleLoadSampleRecall}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
              title="Populates authentic clinical recall intake data for rapid verification"
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              <span>{isAr ? 'تحميل نموذج تجريبي' : 'Load Sample'}</span>
            </button>

            {/* Reset Button */}
            <button
              type="button"
              onClick={handleResetSession}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
              <span>{isAr ? 'جلسة جديدة' : 'New Session'}</span>
            </button>
          </div>
        </div>

        {/* Phase 1 Target Link Status */}
        <div className="mt-4 flex flex-wrap items-center justify-between border-t border-slate-100 pt-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">
              {isAr ? 'أهداف المرحلة الأولى المرتبطة:' : 'Phase 1 Assessment Targets:'}
            </span>
            {phase1Targets.targetCalories ? (
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">
                  {phase1Targets.targetCalories} kcal
                </span>
                <span className="text-slate-500">
                  (P: {phase1Targets.targetProteinG ?? '—'}g • C: {phase1Targets.targetCarbsG ?? '—'}g • F: {phase1Targets.targetFatG ?? '—'}g)
                </span>
              </div>
            ) : (
              <span className="rounded-md bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">
                {isAr ? 'الهدف غير محدد (أدخل بيانات المريض في تبويب الحاسبة)' : 'Target unavailable (Complete Phase 1 Anthropometrics)'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-slate-500">
            <span>{isAr ? 'حالة الجلسة:' : 'Session Status:'}</span>
            <span
              className={`rounded-full px-2.5 py-0.5 font-bold text-[11px] ${
                multiDayAnalysis.isSessionComplete
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {multiDayAnalysis.isSessionComplete
                ? isAr ? 'مكتملة الأيام' : 'Complete'
                : isAr ? 'قيد الإدخال' : 'In Progress'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Days Navigation & Details */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Columns: Day Meals & Entries */}
        <div className="space-y-4 lg:col-span-2">
          {/* Day Navigation Tabs */}
          <div className="flex rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xs">
            {session.days.slice(0, session.targetDays).map((day, idx) => {
              const isActive = idx === activeDayIdx;
              const daySummary = calculateDayNutrientSummary(day);
              return (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => setActiveDayIdx(idx)}
                  className={`flex flex-1 items-center justify-between rounded-xl px-4 py-2.5 text-start transition ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold">
                      {isAr ? `اليوم ${day.dayIndex}` : `Day ${day.dayIndex}`}
                    </div>
                    <div className={`text-[10px] ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>
                      {day.date}
                    </div>
                  </div>
                  <span
                    className={`rounded-lg px-2 py-0.5 text-xs font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {daySummary.caloriesKcal.observedTotal} kcal
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Day Header */}
          {activeDay && (
            <div className="flex items-center justify-between rounded-xl bg-slate-100/70 px-4 py-2 text-xs">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-600" />
                <span className="font-bold text-slate-700">
                  {isAr ? `تاريخ اليوم ${activeDay.dayIndex}:` : `Day ${activeDay.dayIndex} Date:`}
                </span>
                <input
                  type="date"
                  value={activeDay.date}
                  onChange={(e) => {
                    const updated = session.days.map((d, i) =>
                      i === activeDayIdx ? { ...d, date: e.target.value } : d
                    );
                    setSession({ ...session, days: updated });
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-800"
                />
              </div>

              <button
                type="button"
                onClick={handleAddCustomMeal}
                className="flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{isAr ? 'إضافة وجبة مخصصة' : 'Add Custom Meal'}</span>
              </button>
            </div>
          )}

          {/* Meals List for Active Day */}
          {activeDay && activeDay.meals.map((meal) => {
            const def = STANDARD_MEAL_TYPES[meal.mealType];
            const mealName = isAr
              ? meal.customNameAr || def?.defaultNameAr || 'وجبة'
              : meal.customNameEn || def?.defaultNameEn || 'Meal';

            // Calculate meal subtotals
            let mealKcal = 0;
            let mealPro = 0;
            let mealCarb = 0;
            let mealFat = 0;
            meal.entries.forEach((e) => {
              mealKcal += e.nutrients.caloriesKcal;
              mealPro += e.nutrients.proteinG;
              mealCarb += e.nutrients.carbsG;
              mealFat += e.nutrients.fatG;
            });

            return (
              <div
                key={meal.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
              >
                {/* Meal Title & Subtotal */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                      <Utensils className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{mealName}</span>
                        {meal.timeOfDay && (
                          <span className="text-[11px] text-slate-400">({meal.timeOfDay})</span>
                        )}
                        <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-semibold text-slate-600">
                          {meal.entries.length} {isAr ? 'أصناف' : 'items'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Meal Macro Subtotals */}
                    <div className="hidden text-end text-[11px] sm:block">
                      <span className="font-bold text-slate-900">{Math.round(mealKcal)} kcal</span>
                      <span className="text-slate-400 ms-1.5">
                        (P: {mealPro.toFixed(1)}g • C: {mealCarb.toFixed(1)}g • F: {mealFat.toFixed(1)}g)
                      </span>
                    </div>

                    {/* Add Food Button */}
                    <button
                      type="button"
                      onClick={() =>
                        setModalState({
                          isOpen: true,
                          dayIndex: activeDayIdx,
                          mealId: meal.id,
                          mealNameEn: meal.customNameEn || def?.defaultNameEn || 'Meal',
                          mealNameAr: meal.customNameAr || def?.defaultNameAr || 'وجبة',
                        })
                      }
                      className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>{isAr ? 'إضافة طعام' : 'Add Food'}</span>
                    </button>

                    {/* Delete Meal if custom and empty */}
                    {meal.mealType === 'custom' && meal.entries.length === 0 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteMeal(activeDayIdx, meal.id)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        title={isAr ? 'حذف هذه الوجبة المخصصة' : 'Delete custom meal'}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Entries Table / List */}
                {meal.entries.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    {isAr ? 'لا توجد أطعمة مسجلة في هذه الوجبة بعد.' : 'No foods recorded in this meal yet.'}
                  </div>
                ) : (
                  <div className="mt-3 divide-y divide-slate-100">
                    {meal.entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between text-xs"
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5 rounded-full bg-slate-100 p-1 text-slate-500">
                            <Scale className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">
                                {isAr ? entry.foodNameAr : entry.foodNameEn}
                              </span>
                              {entry.isCustomFood && (
                                <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[9px] font-bold text-amber-800">
                                  {isAr ? 'مخصص' : 'Custom'}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                              <span>
                                {isAr ? entry.portionNameAr : entry.portionNameEn}
                              </span>
                              <span>•</span>
                              <span className="font-medium text-emerald-700">
                                {entry.resolvedGramWeight}g
                              </span>
                              {entry.notes && (
                                <>
                                  <span>•</span>
                                  <span className="italic text-slate-400">{entry.notes}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 sm:justify-end">
                          {/* Nutrients chips */}
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="rounded bg-slate-50 px-2 py-0.5 font-bold text-slate-800">
                              {entry.nutrients.caloriesKcal} kcal
                            </span>
                            <span className="text-slate-500">
                              P: <strong className="text-slate-800">{entry.nutrients.proteinG}g</strong>
                            </span>
                            <span className="text-slate-500">
                              C: <strong className="text-slate-800">{entry.nutrients.carbsG}g</strong>
                            </span>
                            <span className="text-slate-500">
                              F: <strong className="text-slate-800">{entry.nutrients.fatG}g</strong>
                            </span>
                            {entry.nutrients.sodiumMg !== null && (
                              <span className="text-slate-500 hidden md:inline">
                                Na: {entry.nutrients.sodiumMg}mg
                              </span>
                            )}
                          </div>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteEntry(activeDayIdx, meal.id, entry.id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            aria-label="Delete entry"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Active Day Nutrient Summary Card */}
          {activeDaySummary && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-xs font-bold text-slate-900">
                    {isAr
                      ? `الإجمالي الغذائي الفعلي لليوم ${activeDay?.dayIndex} (${activeDay?.date}):`
                      : `Daily Actual Intake Summary - Day ${activeDay?.dayIndex} (${activeDay?.date}):`}
                  </h3>
                </div>
                {activeDaySummary.hasIncompleteNutrients ? (
                  <span className="flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                    <AlertTriangle className="h-3 w-3" />
                    {isAr ? 'بيانات معملية جزئية' : 'Partial Lab Assay Data'}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="h-3 w-3" />
                    {isAr ? 'عناصر مكتملة 100%' : '100% Complete Assays'}
                  </span>
                )}
              </div>

              {/* Nutrients Grid */}
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <span className="text-[10px] font-medium text-slate-500">
                    {isAr ? 'السعرات الفعلية' : 'Energy (Calories)'}
                  </span>
                  <div className="mt-0.5 text-lg font-bold text-slate-900">
                    {activeDaySummary.caloriesKcal.observedTotal}{' '}
                    <span className="text-xs font-normal text-slate-400">kcal</span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <span className="text-[10px] font-medium text-slate-500">
                    {isAr ? 'البروتين' : 'Protein'}
                  </span>
                  <div className="mt-0.5 text-lg font-bold text-slate-900">
                    {activeDaySummary.proteinG.observedTotal}{' '}
                    <span className="text-xs font-normal text-slate-400">g</span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <span className="text-[10px] font-medium text-slate-500">
                    {isAr ? 'إجمالي الكربوهيدرات' : 'Total Carbohydrates'}
                  </span>
                  <div className="mt-0.5 text-lg font-bold text-slate-900">
                    {activeDaySummary.carbsG.observedTotal}{' '}
                    <span className="text-xs font-normal text-slate-400">g</span>
                  </div>
                  {activeDaySummary.availableCarbsG.observedTotal > 0 && (
                    <span className="text-[10px] text-slate-400">
                      {isAr ? 'المتاحة:' : 'Avail:'} {activeDaySummary.availableCarbsG.observedTotal}g
                    </span>
                  )}
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <span className="text-[10px] font-medium text-slate-500">
                    {isAr ? 'الدهون الكلية' : 'Total Fat'}
                  </span>
                  <div className="mt-0.5 text-lg font-bold text-slate-900">
                    {activeDaySummary.fatG.observedTotal}{' '}
                    <span className="text-xs font-normal text-slate-400">g</span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-slate-500">
                      {isAr ? 'الألياف الغذائية' : 'Dietary Fiber'}
                    </span>
                    {!activeDaySummary.fiberG.isComplete && (
                      <span className="text-[9px] font-bold text-amber-600">
                        {isAr ? 'جزئي' : 'Partial'}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-base font-bold text-slate-900">
                    {activeDaySummary.fiberG.observedTotal}{' '}
                    <span className="text-xs font-normal text-slate-400">g</span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-slate-500">
                      {isAr ? 'الصوديوم' : 'Sodium'}
                    </span>
                    {!activeDaySummary.sodiumMg.isComplete && (
                      <span className="text-[9px] font-bold text-amber-600">
                        {isAr ? 'جزئي' : 'Partial'}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-base font-bold text-slate-900">
                    {activeDaySummary.sodiumMg.observedTotal}{' '}
                    <span className="text-xs font-normal text-slate-400">mg</span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-slate-500">
                      {isAr ? 'البوتاسيوم' : 'Potassium'}
                    </span>
                    {!activeDaySummary.potassiumMg.isComplete && (
                      <span className="text-[9px] font-bold text-amber-600">
                        {isAr ? 'جزئي' : 'Partial'}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-base font-bold text-slate-900">
                    {activeDaySummary.potassiumMg.observedTotal}{' '}
                    <span className="text-xs font-normal text-slate-400">mg</span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-slate-500">
                      {isAr ? 'الحديد' : 'Iron'}
                    </span>
                    {!activeDaySummary.ironMg.isComplete && (
                      <span className="text-[9px] font-bold text-amber-600">
                        {isAr ? 'جزئي' : 'Partial'}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-base font-bold text-slate-900">
                    {activeDaySummary.ironMg.observedTotal}{' '}
                    <span className="text-xs font-normal text-slate-400">mg</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Multi-Day Average & Phase 1 Target Comparison */}
        <div className="space-y-6">
          {/* Target Comparison Panel */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Award className="h-5 w-5 text-emerald-600" />
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  {isAr ? 'مقارنة المأخوذ مع أهداف المرحلة الأولى' : 'Intake vs Phase 1 Targets'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {isAr
                    ? `مبني على متوسط ${multiDayAnalysis.recordedDaysCount} يوم مسجل`
                    : `Based on ${multiDayAnalysis.recordedDaysCount}-day recorded average`}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {targetComparisons.map((c) => {
                const isUnavailable = c.status === 'target_unavailable';
                const percent = c.percentAchieved ?? 0;
                const barColor =
                  isUnavailable
                    ? 'bg-slate-300'
                    : percent >= 90 && percent <= 110
                    ? 'bg-emerald-500'
                    : percent < 90
                    ? 'bg-amber-500'
                    : 'bg-rose-500';

                return (
                  <div key={c.metric} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">
                        {isAr ? c.labelAr : c.labelEn}
                      </span>
                      {isUnavailable ? (
                        <span className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          {isAr ? 'الهدف غير متوفر' : 'Target unavailable'}
                        </span>
                      ) : (
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            c.status === 'achieved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : c.status === 'under'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {percent}% {isAr ? 'من المستهدف' : 'of target'}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[11px] text-slate-500">{isAr ? 'الفعلي:' : 'Actual:'}</span>{' '}
                        <strong className="text-slate-900">{c.actualIntake}</strong>{' '}
                        <span className="text-[10px] text-slate-400">{c.unit}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-500">{isAr ? 'الهدف:' : 'Target:'}</span>{' '}
                        <strong className="text-slate-900">
                          {c.targetValue !== null ? `${c.targetValue} ${c.unit}` : '—'}
                        </strong>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {!isUnavailable && (
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={`h-full ${barColor} transition-all duration-300`}
                          style={{ width: `${Math.min(100, percent)}%` }}
                        />
                      </div>
                    )}

                    <div className="mt-1.5 text-[10px] text-slate-500">
                      {isAr ? c.clinicalNoteAr : c.clinicalNoteEn}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Multi-Day Average Details */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Layers className="h-4 w-4 text-emerald-600" />
              <h3 className="text-xs font-bold text-slate-900">
                {isAr
                  ? `المتوسط اليومي (${session.targetDays} أيام):`
                  : `Multi-Day Average (${session.targetDays} Days):`}
              </h3>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">{isAr ? 'عدد الأيام المسجلة فعلياً:' : 'Recorded Days Denominator:'}</span>
                <strong className="text-slate-900">
                  {multiDayAnalysis.recordedDaysCount} / {multiDayAnalysis.sessionTargetDays}
                </strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">{isAr ? 'متوسط السعرات:' : 'Average Calories:'}</span>
                <strong className="text-slate-900">
                  {multiDayAnalysis.averages.caloriesKcal?.observedAverage} kcal/day
                </strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">{isAr ? 'متوسط البروتين:' : 'Average Protein:'}</span>
                <strong className="text-slate-900">
                  {multiDayAnalysis.averages.proteinG?.observedAverage} g/day
                </strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">{isAr ? 'متوسط الكربوهيدرات:' : 'Average Carbs:'}</span>
                <strong className="text-slate-900">
                  {multiDayAnalysis.averages.carbsG?.observedAverage} g/day
                </strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">{isAr ? 'متوسط الدهون:' : 'Average Fat:'}</span>
                <strong className="text-slate-900">
                  {multiDayAnalysis.averages.fatG?.observedAverage} g/day
                </strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">
                  {isAr ? 'متوسط الألياف:' : 'Average Fiber:'}{' '}
                  {multiDayAnalysis.averages.fiberG && !multiDayAnalysis.averages.fiberG.isComplete && (
                    <span className="text-[10px] font-bold text-amber-600">
                      ({isAr ? 'جزئي' : 'Partial'})
                    </span>
                  )}
                </span>
                <strong className="text-slate-900">
                  {multiDayAnalysis.averages.fiberG?.observedAverage} g/day
                </strong>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">
                  {isAr ? 'متوسط الصوديوم:' : 'Average Sodium:'}{' '}
                  {multiDayAnalysis.averages.sodiumMg && !multiDayAnalysis.averages.sodiumMg.isComplete && (
                    <span className="text-[10px] font-bold text-amber-600">
                      ({isAr ? 'جزئي' : 'Partial'})
                    </span>
                  )}
                </span>
                <strong className="text-slate-900">
                  {multiDayAnalysis.averages.sodiumMg?.observedAverage} mg/day
                </strong>
              </div>
            </div>
          </div>

          {/* Clinical Warnings & Notices */}
          {warnings.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <h3 className="text-xs font-bold text-slate-900">
                  {isAr ? 'التنبيهات السريرية وملاحظات الاكتمال:' : 'Clinical Notices & Data Completeness:'}
                </h3>
              </div>

              <div className="mt-3 space-y-2">
                {warnings.map((w) => (
                  <div
                    key={w.id}
                    className={`rounded-xl p-2.5 text-[11px] flex items-start gap-2 border ${
                      w.severity === 'danger'
                        ? 'border-rose-200 bg-rose-50 text-rose-800'
                        : w.severity === 'warning'
                        ? 'border-amber-200 bg-amber-50 text-amber-800'
                        : 'border-blue-200 bg-blue-50 text-blue-800'
                    }`}
                  >
                    <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>{isAr ? w.messageAr : w.messageEn}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Food Entry Modal */}
      <FoodEntryModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        onAddEntry={handleAddEntryToMeal}
        isAr={isAr}
        mealNameEn={modalState.mealNameEn}
        mealNameAr={modalState.mealNameAr}
      />
    </div>
  );
}
