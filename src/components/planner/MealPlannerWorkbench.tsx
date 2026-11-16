/**
 * Nutrition Clinic Pro - Phase 4: Unified Daily Meal Planner Workbench
 *
 * Allows clinicians to organize meals and snacks, add/edit/replace/remove catalog foods,
 * adjust quantities by household portions or direct gram weights, inspect meal & daily
 * nutrient totals, and track remaining/excess calories & macros against Phase 1 targets.
 *
 * Strict Data Integrity Rules:
 * - 0 = confirmed zero
 * - null = unknown / unavailable (never coerced to zero)
 * - exchange_only records remain unassayed for nutrients and withhold authoritative target/remaining math
 */

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  BarChart3,
  CalendarDays,
  Check,
  CheckCircle2,
  FolderOpen,
  Info,
  Layers,
  Plus,
  RefreshCw,
  Replace,
  Save,
  Scale,
  Sparkles,
  Trash2,
  Utensils,
} from 'lucide-react';

import { ADA_AND_EXCHANGE_SYSTEM } from '../../clinical/food/exchange-systems';
import { getFoodItemById } from '../../clinical/food/food-database';
import { ExchangeCategoryId } from '../../clinical/food/types';
import {
  addItemToMeal,
  addMealSlot,
  calculateDailyMealPlanAnalysis,
  createDailyMealPlan,
  createSampleEgyptianMealPlan,
  deleteSavedMealPlan,
  getSavedMealPlans,
  mealPlanItemFromEntry,
  removeMealItem,
  removeMealSlot,
  replaceMealItem,
  saveMealPlan,
  updateMealItemQuantity,
  updateMealSlotMeta,
} from '../../clinical/planner';
import { DailyMealPlan, MealPlanTargetInputs } from '../../clinical/planner/types';
import { MealType, RecallEntry, RecallNutrientSummary, STANDARD_MEAL_TYPES } from '../../clinical/recall/types';
import { FoodEntryModal } from '../recall/FoodEntryModal';

interface MealPlannerWorkbenchProps {
  isAr: boolean;
  phase1Targets?: MealPlanTargetInputs;
  patientName?: string;
  initialPlan?: DailyMealPlan;
}

const DAILY_NUTRIENT_ROWS: Array<{
  key: keyof RecallNutrientSummary;
  labelEn: string;
  labelAr: string;
  unit: string;
}> = [
  { key: 'caloriesKcal', labelEn: 'Energy (Calories)', labelAr: 'السعرات الحرارية', unit: 'kcal' },
  { key: 'proteinG', labelEn: 'Protein', labelAr: 'البروتين', unit: 'g' },
  { key: 'carbsG', labelEn: 'Total Carbohydrates', labelAr: 'إجمالي الكربوهيدرات', unit: 'g' },
  { key: 'fatG', labelEn: 'Total Fat', labelAr: 'الدهون الكلية', unit: 'g' },
  { key: 'fiberG', labelEn: 'Dietary Fiber', labelAr: 'الألياف الغذائية', unit: 'g' },
  { key: 'saturatedFatG', labelEn: 'Saturated Fat', labelAr: 'الدهون المشبعة', unit: 'g' },
  { key: 'sodiumMg', labelEn: 'Sodium', labelAr: 'الصوديوم', unit: 'mg' },
  { key: 'potassiumMg', labelEn: 'Potassium', labelAr: 'البوتاسيوم', unit: 'mg' },
  { key: 'calciumMg', labelEn: 'Calcium', labelAr: 'الكالسيوم', unit: 'mg' },
  { key: 'ironMg', labelEn: 'Iron', labelAr: 'الحديد', unit: 'mg' },
];

export function MealPlannerWorkbench({
  isAr,
  phase1Targets = {},
  patientName,
  initialPlan,
}: MealPlannerWorkbenchProps) {
  const [plan, setPlan] = useState<DailyMealPlan>(
    () => initialPlan ?? createDailyMealPlan({ patientName })
  );
  const [savedPlans, setSavedPlans] = useState<DailyMealPlan[]>(() => getSavedMealPlans());
  const [showSavedDrawer, setShowSavedDrawer] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Add Meal / Snack state
  const [newMealType, setNewMealType] = useState<MealType>('evening_snack');
  const [newMealCustomName, setNewMealCustomName] = useState('');
  const [newMealTime, setNewMealTime] = useState('22:00');

  // Food Modal (supports both 'add' and 'replace')
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: 'add' | 'replace';
    mealId: string;
    itemId?: string;
    replacingFoodName?: string;
    mealNameEn: string;
    mealNameAr: string;
  }>({
    isOpen: false,
    mode: 'add',
    mealId: '',
    mealNameEn: '',
    mealNameAr: '',
  });

  // Compute deterministic analysis
  const analysis = useMemo(
    () => calculateDailyMealPlanAnalysis(plan, phase1Targets),
    [plan, phase1Targets]
  );

  const summaryByMealId = useMemo(() => {
    const map = new Map<string, (typeof analysis.mealsSummaries)[number]>();
    for (const s of analysis.mealsSummaries) {
      map.set(s.mealId, s);
    }
    return map;
  }, [analysis]);

  const showNotice = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Handlers
  const handleModalConfirm = (entry: RecallEntry) => {
    setErrorBanner(null);
    const item = mealPlanItemFromEntry(entry);
    try {
      if (modalState.mode === 'replace' && modalState.itemId) {
        setPlan((prev) => replaceMealItem(prev, modalState.mealId, modalState.itemId!, item));
      } else {
        setPlan((prev) => addItemToMeal(prev, modalState.mealId, item));
      }
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : String(err));
    }
  };

  const handleInlinePortionChange = (mealId: string, itemId: string, newPortionId: string, currentQuantity: number) => {
    setErrorBanner(null);
    const meal = plan.meals.find((m) => m.id === mealId);
    const item = meal?.items.find((it) => it.id === itemId);
    if (!item) return;

    const food = getFoodItemById(item.foodId);
    if (!food) return;

    let nextQty = currentQuantity;
    if (newPortionId === 'grams' && !item.isDirectGrams) {
      // Preserve current resolved gram weight when switching from portions to grams
      nextQty = item.resolvedGramWeight > 0 ? item.resolvedGramWeight : 100;
    } else if (newPortionId !== 'grams' && item.isDirectGrams) {
      // Convert current gram weight proportionally into selected portion multiplier (min 0.25)
      const targetPortion = food.portions.find((p) => p.id === newPortionId);
      if (targetPortion && targetPortion.gramWeight > 0) {
        nextQty = Math.max(0.25, Math.round((item.resolvedGramWeight / targetPortion.gramWeight) * 4) / 4);
      } else {
        nextQty = 1;
      }
    }

    try {
      setPlan((prev) =>
        updateMealItemQuantity(prev, mealId, itemId, {
          selectedPortionId: newPortionId === 'grams' ? undefined : newPortionId,
          quantity: nextQty,
        })
      );
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : String(err));
    }
  };

  const handleInlineQuantityChange = (
    mealId: string,
    itemId: string,
    selectedPortionId: string | undefined,
    rawVal: string
  ) => {
    const num = Number(rawVal);
    if (!Number.isFinite(num) || num <= 0) return;
    setErrorBanner(null);
    try {
      setPlan((prev) =>
        updateMealItemQuantity(prev, mealId, itemId, {
          selectedPortionId,
          quantity: num,
        })
      );
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : String(err));
    }
  };

  const handleRemoveItem = (mealId: string, itemId: string) => {
    setErrorBanner(null);
    setPlan((prev) => removeMealItem(prev, mealId, itemId));
  };

  const handleAddMealSlot = () => {
    setErrorBanner(null);
    setPlan((prev) =>
      addMealSlot(prev, {
        mealType: newMealType,
        customNameEn: newMealType === 'custom' ? newMealCustomName.trim() || undefined : undefined,
        customNameAr: newMealType === 'custom' ? newMealCustomName.trim() || undefined : undefined,
        timeOfDay: newMealTime || undefined,
      })
    );
    setNewMealCustomName('');
  };

  const handleRemoveMealSlot = (mealId: string) => {
    setErrorBanner(null);
    try {
      setPlan((prev) => removeMealSlot(prev, mealId));
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : String(err));
    }
  };

  const handleLoadSample = () => {
    setErrorBanner(null);
    setPlan(createSampleEgyptianMealPlan(patientName));
    showNotice(isAr ? 'تم تحميل نموذج الخطة الغذائية بنجاح' : 'Sample balanced meal plan loaded.');
  };

  const handleNewBlankPlan = () => {
    setErrorBanner(null);
    setPlan(createDailyMealPlan({ patientName }));
    showNotice(isAr ? 'تم إنشاء خطة وجبات يومية جديدة فارغة' : 'Started a new blank daily meal plan.');
  };

  const handleSavePlan = () => {
    const saved = saveMealPlan(plan);
    setPlan(saved);
    setSavedPlans(getSavedMealPlans());
    showNotice(isAr ? 'تم حفظ خطة الوجبات محلياً بنجاح' : 'Meal plan saved locally.');
  };

  const handleLoadSavedPlan = (loaded: DailyMealPlan) => {
    setPlan(loaded);
    setShowSavedDrawer(false);
    showNotice(isAr ? 'تم تحميل الخطة المحفوظة' : 'Loaded saved meal plan.');
  };

  const handleDeleteSavedPlan = (planId: string) => {
    deleteSavedMealPlan(planId);
    setSavedPlans(getSavedMealPlans());
  };

  const exchangeEntries = Object.entries(analysis.exchangeSummary) as Array<[ExchangeCategoryId, number]>;

  return (
    <div className="space-y-6">
      {/* Header Banner & Plan Controls */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-200">
              <Utensils className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                  {isAr ? 'مخطط الوجبات العلاجي الموحد' : 'Unified Daily Meal Planner'}
                </h2>
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                  Phase 4 Module
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {isAr
                  ? 'تنظيم الوجبات والوجبات الخفيفة وحساب العناصر الغذائية وتتبع المتبقي/الفائض مقابل أهداف المرحلة الأولى'
                  : 'Organize daily meals & snacks, scale portions deterministically, and track remaining/excess vs Phase 1 targets'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleLoadSample}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{isAr ? 'تحميل نموذج خطة' : 'Load Sample Plan'}</span>
            </button>

            <button
              type="button"
              onClick={handleSavePlan}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isAr ? 'حفظ الخطة' : 'Save Plan'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSavedDrawer((v) => !v)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <FolderOpen className="h-3.5 w-3.5 text-slate-500" />
              <span>
                {isAr ? `الخطط المحفوظة (${savedPlans.length})` : `Saved (${savedPlans.length})`}
              </span>
            </button>

            <button
              type="button"
              onClick={handleNewBlankPlan}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>{isAr ? 'خطة جديدة' : 'New Blank Plan'}</span>
            </button>
          </div>
        </div>

        {/* Plan Metadata + Phase 1 Target Strip */}
        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 md:grid-cols-12 md:items-center">
          <div className="md:col-span-5">
            <label htmlFor="meal-plan-title" className="mb-1 block text-[11px] font-semibold text-slate-500">
              {isAr ? 'اسم الخطة الغذائية:' : 'Plan Name:'}
            </label>
            <input
              id="meal-plan-title"
              type="text"
              value={isAr ? plan.titleAr : plan.titleEn}
              onChange={(e) => {
                const val = e.target.value;
                setPlan((prev) => ({
                  ...prev,
                  ...(isAr ? { titleAr: val } : { titleEn: val }),
                }));
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="md:col-span-3">
            <label htmlFor="meal-plan-date" className="mb-1 block text-[11px] font-semibold text-slate-500">
              {isAr ? 'تاريخ الخطة:' : 'Plan Date:'}
            </label>
            <div className="relative flex items-center">
              <CalendarDays className="pointer-events-none absolute start-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                id="meal-plan-date"
                type="date"
                value={plan.planDate}
                onChange={(e) => setPlan((prev) => ({ ...prev, planDate: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 ps-8 pe-2.5 text-xs font-medium text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="md:col-span-4">
            <span className="mb-1 block text-[11px] font-semibold text-slate-500">
              {isAr ? 'أهداف المرحلة الأولى المرجعية:' : 'Active Phase 1 Clinical Targets:'}
            </span>
            {phase1Targets.targetCalories && phase1Targets.targetCalories > 0 ? (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-1.5 text-xs text-slate-700">
                <strong className="text-emerald-800">{Math.round(phase1Targets.targetCalories)} kcal</strong>
                <span className="ms-2 text-[11px] text-slate-600">
                  (P: {phase1Targets.targetProteinG ?? '—'}g • C: {phase1Targets.targetCarbsG ?? '—'}g • F:{' '}
                  {phase1Targets.targetFatG ?? '—'}g
                  {phase1Targets.targetFiberG ? ` • Fiber: ${phase1Targets.targetFiberG}g` : ''})
                </span>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-medium text-amber-800">
                {isAr
                  ? 'غير محسوبة بعد (أدخل القياسات في الحاسبة السريرية)'
                  : 'Targets not set yet (configure patient in Calculator)'}
              </div>
            )}
          </div>
        </div>

        {/* Status / Error notifications */}
        {statusMessage && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
            <Check className="h-4 w-4 text-emerald-600" />
            <span>{statusMessage}</span>
          </div>
        )}
        {errorBanner && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            <span>{errorBanner}</span>
          </div>
        )}

        {/* Saved Plans Collapsible Panel */}
        {showSavedDrawer && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800">
                {isAr ? 'خطط الوجبات المحفوظة محلياً:' : 'Locally Saved Daily Meal Plans:'}
              </h3>
              <button
                type="button"
                onClick={() => setShowSavedDrawer(false)}
                className="text-xs font-medium text-slate-500 hover:text-slate-800"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>
            {savedPlans.length === 0 ? (
              <p className="text-xs text-slate-500">
                {isAr ? 'لا توجد خطط محفوظة بعد.' : 'No saved meal plans yet.'}
              </p>
            ) : (
              <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
                {savedPlans.map((sp) => (
                  <div key={sp.id} className="flex items-center justify-between px-3 py-2 text-xs">
                    <div>
                      <div className="font-bold text-slate-800">{isAr ? sp.titleAr : sp.titleEn}</div>
                      <div className="text-[11px] text-slate-400">
                        {sp.planDate} • {sp.meals.reduce((acc, m) => acc + m.items.length, 0)}{' '}
                        {isAr ? 'أصناف' : 'items'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleLoadSavedPlan(sp)}
                        className="rounded-lg bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 hover:bg-emerald-100"
                      >
                        {isAr ? 'فتح' : 'Load'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSavedPlan(sp.id)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        aria-label={`Delete saved plan ${isAr ? sp.titleAr : sp.titleEn}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Columns: Meal Slots & Food Items */}
        <div className="space-y-4 lg:col-span-2">
          {plan.meals.map((meal) => {
            const def = STANDARD_MEAL_TYPES[meal.mealType];
            const mealNameEn = meal.customNameEn || def?.defaultNameEn || 'Meal';
            const mealNameAr = meal.customNameAr || def?.defaultNameAr || 'وجبة';
            const mealName = isAr ? mealNameAr : mealNameEn;

            const slotSummary = summaryByMealId.get(meal.id);
            const ns = slotSummary?.nutrientSummary;
            const mealHasIncompleteMacros =
              meal.items.length > 0 &&
              ns !== undefined &&
              (!ns.caloriesKcal.isComplete ||
                !ns.proteinG.isComplete ||
                !ns.carbsG.isComplete ||
                !ns.fatG.isComplete);
            const mealHasAnyMacro =
              ns !== undefined &&
              (ns.caloriesKcal.observedTotal !== null ||
                ns.proteinG.observedTotal !== null ||
                ns.carbsG.observedTotal !== null ||
                ns.fatG.observedTotal !== null);

            return (
              <section
                key={meal.id}
                aria-label={mealName}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
              >
                {/* Meal Slot Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                      <Utensils className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xs font-bold text-slate-900 sm:text-sm">{mealName}</h3>
                        <label className="sr-only" htmlFor={`time-${meal.id}`}>
                          {isAr ? `وقت ${mealName}` : `${mealName} time`}
                        </label>
                        <div className="flex items-center rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-600">
                          <input
                            id={`time-${meal.id}`}
                            type="time"
                            value={meal.timeOfDay || ''}
                            onChange={(e) =>
                              setPlan((prev) =>
                                updateMealSlotMeta(prev, meal.id, { timeOfDay: e.target.value })
                              )
                            }
                            className="bg-transparent text-[11px] font-medium text-slate-700 focus:outline-none"
                          />
                        </div>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                          {meal.items.length} {isAr ? 'أصناف' : 'items'}
                        </span>
                        {mealHasIncompleteMacros && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                            {isAr ? 'جزئي' : 'Partial'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2.5 sm:gap-3">
                    {/* Meal Macro Subtotals */}
                    <div className="text-end text-[11px]">
                      {meal.items.length === 0 || !ns || !mealHasAnyMacro ? (
                        <span className={`font-bold ${meal.items.length > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                          {meal.items.length > 0 ? (isAr ? '— (غير محلل)' : '— (Unassayed)') : '—'}
                        </span>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-slate-900">
                            {ns.caloriesKcal.observedTotal !== null
                              ? `${ns.caloriesKcal.observedTotal} kcal`
                              : '—'}
                          </span>
                          <span className="text-slate-500">
                            (P: {ns.proteinG.observedTotal !== null ? `${ns.proteinG.observedTotal}g` : '—'} • C:{' '}
                            {ns.carbsG.observedTotal !== null ? `${ns.carbsG.observedTotal}g` : '—'} • F:{' '}
                            {ns.fatG.observedTotal !== null ? `${ns.fatG.observedTotal}g` : '—'}
                            {ns.fiberG.observedTotal !== null ? ` • Fib: ${ns.fiberG.observedTotal}g` : ''})
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setModalState({
                          isOpen: true,
                          mode: 'add',
                          mealId: meal.id,
                          mealNameEn,
                          mealNameAr,
                        })
                      }
                      aria-label={isAr ? `إضافة طعام إلى ${mealName}` : `Add food to ${mealName}`}
                      className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
                    >
                      <Plus className="h-3.5 w-3.5 shrink-0" />
                      <span>{isAr ? 'إضافة طعام' : 'Add Food'}</span>
                    </button>

                    {plan.meals.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMealSlot(meal.id)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        aria-label={isAr ? `حذف وجبة ${mealName}` : `Remove ${mealName} slot`}
                        title={isAr ? 'حذف هذه الوجبة' : 'Remove meal slot'}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Meal Food Items */}
                {meal.items.length === 0 ? (
                  <div className="py-5 text-center text-xs text-slate-400">
                    {isAr
                      ? 'لا توجد أطعمة في هذه الوجبة بعد. اضغط "إضافة طعام" للاختيار من قاعدة البيانات.'
                      : 'No foods in this meal yet. Click "Add Food" to choose from the catalog.'}
                  </div>
                ) : (
                  <div className="mt-2 divide-y divide-slate-100">
                    {meal.items.map((item) => {
                      const food = getFoodItemById(item.foodId);
                      const foodLabel = isAr ? item.foodNameAr : item.foodNameEn;
                      const isExchangeOnly = item.compositionBasis === 'exchange_only';
                      const selectValue = item.isDirectGrams ? 'grams' : item.selectedPortionId || 'grams';

                      return (
                        <div
                          key={item.id}
                          className="flex flex-col gap-3 py-3 text-xs xl:flex-row xl:items-center xl:justify-between"
                        >
                          {/* Food Identity + Badges */}
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className="mt-0.5 rounded-full bg-slate-100 p-1 text-slate-500">
                              <Scale className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-bold text-slate-900">{foodLabel}</span>
                                {item.isCustomFood && (
                                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                                    {isAr ? 'مخصص' : 'Custom'}
                                  </span>
                                )}
                                {!item.isCustomFood && item.compositionBasis === 'clinic_estimated' && (
                                  <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[9px] font-bold text-sky-800">
                                    {isAr ? 'تقديري' : 'Estimated'}
                                  </span>
                                )}
                                {(item.compositionBasis === 'recipe_based' ||
                                  item.verificationStatus === 'recipe_based') && (
                                  <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[9px] font-bold text-purple-800">
                                    {isAr ? 'تقدير وصفي' : 'Recipe Estimate'}
                                  </span>
                                )}
                                {isExchangeOnly && (
                                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                                    {isAr ? 'بديل فقط (غير محلل)' : 'Exchange-Only'}
                                  </span>
                                )}
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                                <span className="font-semibold text-emerald-700">
                                  {item.resolvedGramWeight}g
                                </span>
                                {!isExchangeOnly && item.nutrients.calculatedExchangeCount !== undefined && item.nutrients.exchangeCategory && (
                                  <span>
                                    • {item.nutrients.calculatedExchangeCount}×{' '}
                                    {isAr
                                      ? ADA_AND_EXCHANGE_SYSTEM.exchangeValues[item.nutrients.exchangeCategory]?.nameAr
                                      : ADA_AND_EXCHANGE_SYSTEM.exchangeValues[item.nutrients.exchangeCategory]?.nameEn}
                                  </span>
                                )}
                                {item.notes && <span className="italic text-slate-400">• {item.notes}</span>}
                              </div>
                            </div>
                          </div>

                          {/* Inline Quantity / Portion Controls + Nutrients + Replace / Remove */}
                          <div className="flex flex-wrap items-center justify-between gap-2 xl:justify-end">
                            {/* Portion / Grams Editor */}
                            {food ? (
                              <div className="flex items-center gap-1.5">
                                <select
                                  aria-label={isAr ? `وحدة القياس لـ ${foodLabel}` : `Portion for ${foodLabel}`}
                                  value={selectValue}
                                  onChange={(e) =>
                                    handleInlinePortionChange(meal.id, item.id, e.target.value, item.quantity)
                                  }
                                  className="max-w-[180px] rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                                >
                                  {food.portions.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {isAr ? p.portionNameAr : p.portionNameEn} ({p.gramWeight}g)
                                    </option>
                                  ))}
                                  <option value="grams">{isAr ? 'جرام مباشر (g)' : 'Direct Grams (g)'}</option>
                                </select>

                                <input
                                  type="number"
                                  aria-label={isAr ? `كمية ${foodLabel}` : `Quantity for ${foodLabel}`}
                                  min={item.isDirectGrams ? 1 : 0.25}
                                  step={item.isDirectGrams ? 5 : 0.25}
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleInlineQuantityChange(
                                      meal.id,
                                      item.id,
                                      item.isDirectGrams ? undefined : item.selectedPortionId,
                                      e.target.value
                                    )
                                  }
                                  className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 text-center text-[11px] font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                                />
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-500">
                                {isAr ? item.portionNameAr : item.portionNameEn}
                              </span>
                            )}

                            {/* Nutrient Chips */}
                            <div className="flex items-center gap-2 text-[11px]">
                              <span className="rounded bg-slate-50 px-2 py-0.5 font-bold text-slate-800">
                                {!isExchangeOnly && item.nutrients.caloriesKcal !== null
                                  ? `${item.nutrients.caloriesKcal} kcal`
                                  : '—'}
                              </span>
                              <span className="text-slate-500">
                                P:{' '}
                                <strong className="text-slate-800">
                                  {!isExchangeOnly && item.nutrients.proteinG !== null
                                    ? `${item.nutrients.proteinG}g`
                                    : '—'}
                                </strong>
                              </span>
                              <span className="text-slate-500">
                                C:{' '}
                                <strong className="text-slate-800">
                                  {!isExchangeOnly && item.nutrients.carbsG !== null
                                    ? `${item.nutrients.carbsG}g`
                                    : '—'}
                                </strong>
                              </span>
                              <span className="text-slate-500">
                                F:{' '}
                                <strong className="text-slate-800">
                                  {!isExchangeOnly && item.nutrients.fatG !== null
                                    ? `${item.nutrients.fatG}g`
                                    : '—'}
                                </strong>
                              </span>
                            </div>

                            {/* Replace & Remove Actions */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setModalState({
                                    isOpen: true,
                                    mode: 'replace',
                                    mealId: meal.id,
                                    itemId: item.id,
                                    replacingFoodName: foodLabel,
                                    mealNameEn,
                                    mealNameAr,
                                  })
                                }
                                aria-label={isAr ? `استبدال ${foodLabel}` : `Replace ${foodLabel}`}
                                title={isAr ? 'استبدال الصنف' : 'Replace food'}
                                className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                              >
                                <Replace className="h-3 w-3" />
                                <span>{isAr ? 'استبدال' : 'Replace'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(meal.id, item.id)}
                                aria-label={isAr ? `حذف ${foodLabel}` : `Remove ${foodLabel}`}
                                title={isAr ? 'حذف الصنف' : 'Remove food'}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}

          {/* Add Additional Meal / Snack Control */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-300 bg-white/70 p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-slate-700">
                {isAr ? 'إضافة وجبة أو سناك:' : 'Add Meal or Snack Slot:'}
              </span>
              <select
                aria-label={isAr ? 'نوع الوجبة المضافة' : 'New meal slot type'}
                value={newMealType}
                onChange={(e) => setNewMealType(e.target.value as MealType)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800"
              >
                {(Object.keys(STANDARD_MEAL_TYPES) as MealType[]).map((mt) => (
                  <option key={mt} value={mt}>
                    {isAr ? STANDARD_MEAL_TYPES[mt].defaultNameAr : STANDARD_MEAL_TYPES[mt].defaultNameEn}
                  </option>
                ))}
              </select>
              {newMealType === 'custom' && (
                <input
                  type="text"
                  value={newMealCustomName}
                  onChange={(e) => setNewMealCustomName(e.target.value)}
                  placeholder={isAr ? 'اسم الوجبة (مثلاً: قبل التمرين)' : 'Custom name (e.g. Pre-workout)'}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800"
                />
              )}
              <input
                type="time"
                aria-label={isAr ? 'وقت الوجبة الجديدة' : 'New meal time'}
                value={newMealTime}
                onChange={(e) => setNewMealTime(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700"
              />
            </div>

            <button
              type="button"
              onClick={handleAddMealSlot}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{isAr ? 'إضافة للخطة' : 'Add Meal Slot'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Daily Targets Comparison (Remaining / Excess) + Daily Nutrients + Exchanges */}
        <div className="space-y-6">
          {/* Targets Comparison & Remaining / Excess Panel */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Award className="h-5 w-5 text-emerald-600" />
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  {isAr ? 'مقارنة الخطة بأهداف المرحلة الأولى' : 'Daily Plan vs Phase 1 Targets'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {analysis.totalItemsCount === 0
                    ? isAr
                      ? 'لا توجد أصناف مخططة بعد'
                      : 'No foods added to plan yet'
                    : isAr
                    ? `إجمالي الأصناف المخططة: ${analysis.totalItemsCount}`
                    : `${analysis.totalItemsCount} food item(s) across ${plan.meals.length} meal slots`}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3.5">
              {analysis.targetComparisons.map((c) => {
                const isTargetUnavailable = c.status === 'target_unavailable';
                const isWithheld =
                  isTargetUnavailable ||
                  c.status === 'empty_plan' ||
                  c.status === 'incomplete_data' ||
                  c.status === 'unavailable_data';
                const percent = c.percentOfTarget ?? 0;

                const barColor = isWithheld
                  ? 'bg-slate-300'
                  : c.status === 'achieved'
                  ? 'bg-emerald-500'
                  : c.status === 'under'
                  ? 'bg-amber-500'
                  : 'bg-rose-500';

                return (
                  <div key={c.metric} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                      <span className="font-bold text-slate-800">{isAr ? c.labelAr : c.labelEn}</span>

                      {c.status === 'target_unavailable' ? (
                        <span className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          {isAr ? 'الهدف غير متوفر' : 'Target unavailable'}
                        </span>
                      ) : c.status === 'empty_plan' ? (
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                          {isAr ? 'خطة فارغة' : 'No foods yet'}
                        </span>
                      ) : c.status === 'unavailable_data' ? (
                        <span className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          {isAr ? 'بيانات غير متوفرة' : 'Unavailable'}
                        </span>
                      ) : c.status === 'incomplete_data' ? (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          {isAr
                            ? `جزئي · ${c.knownItemsCount}/${c.totalItemsCount} أصناف`
                            : `Partial · ${c.knownItemsCount}/${c.totalItemsCount} items`}
                        </span>
                      ) : c.excess !== null && c.excess > 0 ? (
                        <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                          {isAr
                            ? `فائض ${c.excess} ${c.unit}`
                            : `${c.excess} ${c.unit} excess`}
                        </span>
                      ) : c.remaining !== null && c.remaining > 0 ? (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          {isAr
                            ? `متبقي ${c.remaining} ${c.unit}`
                            : `${c.remaining} ${c.unit} remaining`}
                        </span>
                      ) : (
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          {isAr ? 'مطابق للهدف' : 'Exact Match'}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="text-[11px] text-slate-500">{isAr ? 'المخطط:' : 'Planned:'}</span>{' '}
                        {c.plannedObserved === null ? (
                          <strong className="text-slate-900">—</strong>
                        ) : !c.isComplete ? (
                          <strong className="text-amber-800">
                            ~{c.plannedObserved} {c.unit}
                          </strong>
                        ) : (
                          <strong className="text-slate-900">
                            {c.plannedComplete} {c.unit}
                          </strong>
                        )}
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-500">{isAr ? 'الهدف:' : 'Target:'}</span>{' '}
                        <strong className="text-slate-900">
                          {c.targetValue !== null ? `${c.targetValue} ${c.unit}` : '—'}
                        </strong>
                      </div>
                    </div>

                    {c.isComplete && c.targetValue !== null && (
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

          {/* Daily Analytical Nutrient Totals */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-900">
                  {isAr ? 'إجمالي المغذيات اليومية المخططة' : 'Daily Planned Nutrient Totals'}
                </h3>
              </div>
              {(() => {
                const allDisplayedComplete =
                  analysis.totalItemsCount > 0 &&
                  DAILY_NUTRIENT_ROWS.every((row) => {
                    const m = analysis.dailySummary[row.key];
                    return typeof m !== 'number' && typeof m !== 'boolean' && m.isComplete;
                  });
                if (analysis.totalItemsCount === 0) return null;
                return allDisplayedComplete ? (
                  <span className="flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" />
                    {isAr ? 'تحليل مكتمل' : 'Complete'}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                    <AlertTriangle className="h-3 w-3" />
                    {isAr ? 'تغطية جزئية' : 'Partial Data'}
                  </span>
                );
              })()}
            </div>

            <div className="mt-3 space-y-2 text-xs">
              {DAILY_NUTRIENT_ROWS.map((row) => {
                const metric = analysis.dailySummary[row.key];
                if (typeof metric === 'number' || typeof metric === 'boolean') return null;
                const isUnavailable = analysis.totalItemsCount > 0 && metric.observedTotal === null;
                const isPartial =
                  analysis.totalItemsCount > 0 && metric.observedTotal !== null && !metric.isComplete;

                return (
                  <div
                    key={row.key}
                    className="flex items-center justify-between border-b border-slate-50 py-1 last:border-b-0"
                  >
                    <span className="text-slate-500">
                      {isAr ? row.labelAr : row.labelEn}{' '}
                      {isUnavailable && (
                        <span className="text-[10px] font-bold text-slate-500">
                          ({isAr ? 'غير متوفر' : 'Unavailable'})
                        </span>
                      )}
                      {isPartial && (
                        <span className="text-[10px] font-bold text-amber-600">
                          ({isAr
                            ? `جزئي · ${metric.knownEntriesCount}/${analysis.totalItemsCount}`
                            : `Partial · ${metric.knownEntriesCount}/${analysis.totalItemsCount}`}
                          )
                        </span>
                      )}
                    </span>
                    <strong className="text-slate-900">
                      {analysis.totalItemsCount === 0 || metric.observedTotal === null
                        ? '—'
                        : `${isPartial ? '~' : ''}${metric.observedTotal} ${row.unit}`}
                    </strong>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Separate Documented Exchange Summary (never substituted for analytical composition) */}
          {(exchangeEntries.length > 0 || analysis.hasUnclassifiedExchanges) && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Layers className="h-4 w-4 text-emerald-600" />
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    {isAr ? 'ملخص البدائل الغذائية الموثقة' : 'Documented Food Exchanges'}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {isAr
                      ? 'توزيع مرجعي فقط — لا يُستخدم لتوليد القيم الغذائية'
                      : 'Reference breakdown only — never substituted for analytical nutrients'}
                  </p>
                </div>
              </div>

              {exchangeEntries.length > 0 && (
                <div className="mt-3 space-y-1.5 text-xs">
                  {exchangeEntries.map(([cat, count]) => (
                    <div key={cat} className="flex items-center justify-between py-0.5">
                      <span className="text-slate-600">
                        {isAr
                          ? ADA_AND_EXCHANGE_SYSTEM.exchangeValues[cat]?.nameAr || cat
                          : ADA_AND_EXCHANGE_SYSTEM.exchangeValues[cat]?.nameEn || cat}
                      </span>
                      <strong className="text-slate-900">{count}</strong>
                    </div>
                  ))}
                </div>
              )}

              {analysis.hasUnclassifiedExchanges && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-800">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    {isAr
                      ? 'تحتوي الخطة على أصناف مركبة بدون تقسيم بدائل معياري موثق.'
                      : 'Plan includes composite item(s) without a standardized exchange breakdown.'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Shared Food Selection / Replacement Modal */}
      <FoodEntryModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
        onAddEntry={handleModalConfirm}
        isAr={isAr}
        mealNameEn={modalState.mealNameEn}
        mealNameAr={modalState.mealNameAr}
        mode={modalState.mode}
        replacingFoodName={modalState.replacingFoodName}
      />
    </div>
  );
}
