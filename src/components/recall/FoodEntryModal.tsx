/**
 * Nutrition Clinic Pro - Food Entry & Portion Selection Modal
 * Phase 3 Implementation
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  X,
  Check,
  AlertCircle,
  Scale,
  Sparkles,
  Info,
  Utensils,
  Wheat,
  ShieldAlert,
} from 'lucide-react';

import {
  FoodItemRecord,
  VerificationStatus,
  getAllFoodItems,
  searchFoodItems,
  registerCustomFoodItem,
  roundToPrecision,
} from '../../clinical/food/index';

import { resolveRecallEntry } from '../../clinical/recall/recall-engine';
import { RecallEntry } from '../../clinical/recall/types';

interface FoodEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddEntry: (entry: RecallEntry) => void;
  isAr: boolean;
  mealNameEn: string;
  mealNameAr: string;
}

export function FoodEntryModal({
  isOpen,
  onClose,
  onAddEntry,
  isAr,
  mealNameEn,
  mealNameAr,
}: FoodEntryModalProps) {
  // Tabs: 'search_database' | 'custom_food'
  const [activeTab, setActiveTab] = useState<'database' | 'custom'>('database');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedFood, setSelectedFood] = useState<FoodItemRecord | null>(null);

  // Portion selection state
  const [selectedPortionId, setSelectedPortionId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [entryNotes, setEntryNotes] = useState<string>('');

  // Custom Food Form State
  const [customNameEn, setCustomNameEn] = useState('');
  const [customNameAr, setCustomNameAr] = useState('');
  const [customCalories, setCustomCalories] = useState<number | ''>(100);
  const [customProtein, setCustomProtein] = useState<number | ''>(5);
  const [customCarbs, setCustomCarbs] = useState<number | ''>(15);
  const [customFat, setCustomFat] = useState<number | ''>(2);
  const [customFiber, setCustomFiber] = useState<number | ''>(1);
  const [customSodium, setCustomSodium] = useState<number | ''>('');
  const [customPortionNameEn, setCustomPortionNameEn] = useState('1 Serving');
  const [customPortionNameAr, setCustomPortionNameAr] = useState('حصة واحدة');
  const [customPortionGrams, setCustomPortionGrams] = useState<number | ''>(100);
  const [customError, setCustomError] = useState<string | null>(null);

  // Search results
  const searchResults = useMemo(() => {
    let items = searchQuery.trim() ? searchFoodItems(getAllFoodItems(), searchQuery) : getAllFoodItems();
    if (selectedGroup !== 'all') {
      items = items.filter((item) => item.foodGroupId === selectedGroup);
    }
    return items;
  }, [searchQuery, selectedGroup]);

  // When a food is selected, initialize portion
  const handleSelectFood = (food: FoodItemRecord) => {
    setSelectedFood(food);
    if (food.portions.length > 0) {
      const defaultPortion = food.portions.find((p) => p.isDefaultServing) || food.portions[0];
      setSelectedPortionId(defaultPortion.id);
    } else {
      setSelectedPortionId('grams');
    }
    setQuantity(1);
  };

  // Preview resolved nutrients in real-time
  const previewEntry = useMemo(() => {
    if (!selectedFood || quantity <= 0) return null;
    try {
      return resolveRecallEntry({
        food: selectedFood,
        selectedPortionId: selectedPortionId || 'grams',
        quantity,
        notes: entryNotes,
      });
    } catch {
      return null;
    }
  }, [selectedFood, selectedPortionId, quantity, entryNotes]);

  const handleConfirmAdd = () => {
    if (!previewEntry) return;
    onAddEntry(previewEntry);
    onClose();
  };

  // Handle registering and adding custom food
  const handleCreateCustomFood = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomError(null);

    if (!customNameEn.trim() && !customNameAr.trim()) {
      setCustomError(isAr ? 'يرجى إدخال اسم الطعام المخصص.' : 'Please enter a name for the custom food.');
      return;
    }
    if (customCalories === '' || customCalories < 0) {
      setCustomError(isAr ? 'يرجى إدخال سعرات حرارية صالحة.' : 'Please enter a valid calorie value.');
      return;
    }
    if (customProtein === '' || customProtein < 0) {
      setCustomError(isAr ? 'يرجى إدخال بروتين صالح.' : 'Please enter a valid protein value.');
      return;
    }
    if (customCarbs === '' || customCarbs < 0) {
      setCustomError(isAr ? 'يرجى إدخال كربوهيدرات صالحة.' : 'Please enter valid carbohydrates.');
      return;
    }
    if (customFat === '' || customFat < 0) {
      setCustomError(isAr ? 'يرجى إدخال دهون صالحة.' : 'Please enter valid fat.');
      return;
    }

    const portionGrams = Number(customPortionGrams) > 0 ? Number(customPortionGrams) : 100;
    const fiberVal = customFiber !== '' && Number(customFiber) >= 0 ? Number(customFiber) : null;
    const sodiumVal = customSodium !== '' && Number(customSodium) >= 0 ? Number(customSodium) : null;

    try {
      const newCustomRecord = registerCustomFoodItem({
        nameEn: customNameEn.trim() || customNameAr.trim(),
        nameAr: customNameAr.trim() || customNameEn.trim(),
        foodGroupId: 'custom',
        primaryExchangeCategoryId: 'combination_food',
        preparationState: 'cooked',
        nutrients100g: {
          basisWeightG: 100,
          caloriesKcal: Number(customCalories),
          proteinG: Number(customProtein),
          carbsG: Number(customCarbs),
          fatG: Number(customFat),
          fiberG: fiberVal,
          saturatedFatG: null,
          transFatG: null,
          monounsaturatedFatG: null,
          polyunsaturatedFatG: null,
          cholesterolMg: null,
          sodiumMg: sodiumVal,
          potassiumMg: null,
          calciumMg: null,
          ironMg: null,
          missingNutrientKeys: sodiumVal === null ? ['sodiumMg'] : [],
        },
        portions: [
          {
            id: `portion_custom_${Date.now()}`,
            portionNameEn: `${customPortionNameEn.trim() || '1 Serving'} (~${portionGrams}g)`,
            portionNameAr: `${customPortionNameAr.trim() || 'حصة واحدة'} (~${portionGrams} جم)`,
            householdMeasureEn: `${customPortionNameEn.trim() || '1 Serving'} (~${portionGrams}g)`,
            householdMeasureAr: `${customPortionNameAr.trim() || 'حصة واحدة'} (~${portionGrams} جم)`,
            gramWeight: portionGrams,
            exchangeCategory: 'combination_food',
            exchangeEquivalentFactor: 0,
            isDefaultServing: true,
          },
        ],
        tags: ['custom', 'clinic entry'],
      });

      const entry = resolveRecallEntry({
        food: newCustomRecord,
        selectedPortionId: newCustomRecord.portions[0].id,
        quantity: 1,
        notes: isAr ? 'طعام مخصص مُدخل بواسطة العيادة' : 'Custom food entered by clinic',
      });

      onAddEntry(entry);
      onClose();
    } catch (err) {
      setCustomError(err instanceof Error ? err.message : String(err));
    }
  };

  const totalFoodCount = useMemo(() => getAllFoodItems().length, []);

  const foodGroups: Array<{ id: string; labelEn: string; labelAr: string }> = [
    { id: 'all', labelEn: 'All Foods', labelAr: 'كل الأطعمة' },
    { id: 'starches', labelEn: 'Starches / Grains', labelAr: 'النشويات والحبوب' },
    { id: 'meats', labelEn: 'Meats & Poultry', labelAr: 'اللحوم والدواجن' },
    { id: 'dairy', labelEn: 'Dairy & Milk', labelAr: 'الألبان ومنتجاتها' },
    { id: 'fruits', labelEn: 'Fruits', labelAr: 'الفواكه' },
    { id: 'vegetables', labelEn: 'Vegetables', labelAr: 'الخضروات' },
    { id: 'legumes', labelEn: 'Legumes', labelAr: 'البقوليات' },
    { id: 'fats', labelEn: 'Fats & Oils', labelAr: 'الدهون والزيوت' },
    { id: 'occasions', labelEn: 'Occasion & Traditional Foods', labelAr: 'أطعمة المناسبات والأعياد' },
    { id: 'free_foods', labelEn: 'Free Foods & Beverages', labelAr: 'الأطعمة الحرة والمشروبات' },
  ];

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
    >
      <div className="flex h-[90vh] max-h-[800px] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-200">
              <Utensils className="h-5 w-5" />
            </div>
            <div>
              <h2 id="modal-title" className="text-base font-bold text-slate-900 sm:text-lg">
                {isAr ? `إضافة طعام إلى: ${mealNameAr}` : `Add Food to: ${mealNameEn}`}
              </h2>
              <p className="text-xs text-slate-500">
                {isAr
                  ? 'اختر صنفاً من قاعدة الأطعمة المعتمدة أو أضف صنفاً مخصصاً'
                  : 'Select from verified food composition database or enter custom item'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-slate-200 bg-white px-6 pt-3">
          <button
            type="button"
            onClick={() => setActiveTab('database')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
              activeTab === 'database'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Search className="h-4 w-4" />
            {isAr
              ? `قاعدة الأطعمة المعيارية (${totalFoodCount} صنفاً موثقاً)`
              : `Standard Food Database (${totalFoodCount} items)`}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
              activeTab === 'custom'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Plus className="h-4 w-4" />
            {isAr ? 'إدخال طعام مخصص (Custom Food)' : 'Add Custom Food'}
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex flex-1 overflow-hidden">
          {activeTab === 'database' ? (
            <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
              {/* Left Column: Search & List */}
              <div className="flex flex-1 flex-col border-r border-slate-200 p-4 overflow-hidden">
                {/* Search Bar */}
                <div className="relative mb-3">
                  <Search className="absolute top-3 left-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      isAr
                        ? 'ابحث بالاسم العربي أو الإنجليزي (مثل: خبز بلدي، عدس، أرز، تونة)...'
                        : 'Search food name or alias (e.g. Baladi bread, lentils, tuna, chicken)...'
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-4 pl-9 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute top-2.5 right-3 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Group Filter Chips */}
                <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 text-xs">
                  {foodGroups.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setSelectedGroup(g.id)}
                      className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                        selectedGroup === g.id
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {isAr ? g.labelAr : g.labelEn}
                    </button>
                  ))}
                </div>

                {/* Results List */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {searchResults.length === 0 ? (
                    <div className="flex h-40 flex-col items-center justify-center text-slate-400">
                      <p className="text-xs">{isAr ? 'لم يتم العثور على أطعمة مطابقة.' : 'No foods found.'}</p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('custom')}
                        className="mt-2 text-xs font-semibold text-emerald-600 hover:underline"
                      >
                        {isAr ? 'إدخال هذا الصنف كطعام مخصص' : 'Create as custom food'}
                      </button>
                    </div>
                  ) : (
                    searchResults.map((food) => {
                      const isSelected = selectedFood?.id === food.id;
                      return (
                        <button
                          key={food.id}
                          type="button"
                          onClick={() => handleSelectFood(food)}
                          className={`flex w-full items-start justify-between rounded-xl border p-3 text-start transition ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                              : 'border-slate-200 bg-white hover:border-emerald-200 hover:bg-slate-50'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">
                                {isAr ? food.nameAr : food.nameEn}
                              </span>
                              {food.isCustom && (
                                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                                  {isAr ? 'مخصص' : 'Custom'}
                                </span>
                              )}
                            </div>
                            <span className="block text-[11px] text-slate-500">
                              {isAr ? food.nameEn : food.nameAr}
                            </span>
                            <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                              <span>
                                {food.nutrients100g.caloriesKcal} kcal / 100g
                              </span>
                              <span>•</span>
                              <span>P: {food.nutrients100g.proteinG}g</span>
                              <span>•</span>
                              <span>C: {food.nutrients100g.carbsG}g</span>
                              <span>•</span>
                              <span>F: {food.nutrients100g.fatG}g</span>
                            </div>
                          </div>
                          {isSelected && (
                            <div className="rounded-full bg-emerald-600 p-1 text-white">
                              <Check className="h-3.5 w-3.5" />
                            </div>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Portion & Quantity Configuration */}
              <div className="flex w-full md:w-80 flex-col bg-slate-50 p-4 overflow-y-auto">
                {selectedFood ? (
                  <div className="flex flex-col gap-4">
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                      <div className="text-xs font-bold text-emerald-900">
                        {isAr ? selectedFood.nameAr : selectedFood.nameEn}
                      </div>
                      <div className="text-[11px] text-emerald-700">
                        {isAr ? selectedFood.nameEn : selectedFood.nameAr}
                      </div>
                      <div className="mt-1 text-[10px] text-emerald-800">
                        {isAr
                          ? `التحضير: ${selectedFood.preparationState} | المصدر: ${selectedFood.sourceId}`
                          : `Prep: ${selectedFood.preparationState} | Source: ${selectedFood.sourceId}`}
                      </div>
                    </div>

                    {/* Portion Selector */}
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        {isAr ? 'وحدة القياس / الحصة المنزلية:' : 'Measurement / Portion:'}
                      </label>
                      <select
                        value={selectedPortionId}
                        onChange={(e) => setSelectedPortionId(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                      >
                        {selectedFood.portions.map((p) => (
                          <option key={p.id} value={p.id}>
                            {isAr ? p.portionNameAr : p.portionNameEn} ({p.gramWeight}g)
                          </option>
                        ))}
                        <option value="grams">
                          {isAr ? 'وزن مباشر بالجرامات (Direct Grams)' : 'Direct Gram Weight (g)'}
                        </option>
                      </select>
                    </div>

                    {/* Quantity Input */}
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        {selectedPortionId === 'grams'
                          ? isAr
                            ? 'الوزن الصافي المستهلك (جرام):'
                            : 'Consumed Weight (Grams):'
                          : isAr
                          ? 'الكمية المستهلكة (عدد الحصص):'
                          : 'Quantity Consumed (Portions):'}
                      </label>
                      <input
                        type="number"
                        min="0.1"
                        step={selectedPortionId === 'grams' ? '1' : '0.25'}
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(0.1, Number(e.target.value) || 0))}
                        className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    {/* Notes Input */}
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        {isAr ? 'ملاحظات سريرية اختيارية:' : 'Optional Clinical Notes:'}
                      </label>
                      <input
                        type="text"
                        value={entryNotes}
                        onChange={(e) => setEntryNotes(e.target.value)}
                        placeholder={isAr ? 'مثال: بدون سكر، بدون زيت، نصف مطبوخ' : 'e.g. without sugar, unskinned'}
                        className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    {/* Real-time preview card */}
                    {previewEntry && (
                      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-[11px] font-bold text-slate-600">
                            {isAr ? 'الوزن المحسوب:' : 'Resolved Weight:'}
                          </span>
                          <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                            {previewEntry.resolvedGramWeight} g
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-slate-500">{isAr ? 'السعرات:' : 'Calories:'}</span>
                            <span className="font-bold text-slate-800 ms-1">
                              {previewEntry.nutrients.caloriesKcal} kcal
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">{isAr ? 'البروتين:' : 'Protein:'}</span>
                            <span className="font-bold text-slate-800 ms-1">
                              {previewEntry.nutrients.proteinG} g
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">{isAr ? 'الكربوهيدرات:' : 'Carbs:'}</span>
                            <span className="font-bold text-slate-800 ms-1">
                              {previewEntry.nutrients.carbsG} g
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">{isAr ? 'الدهون:' : 'Fat:'}</span>
                            <span className="font-bold text-slate-800 ms-1">
                              {previewEntry.nutrients.fatG} g
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">{isAr ? 'الألياف:' : 'Fiber:'}</span>
                            <span className="font-bold text-slate-800 ms-1">
                              {previewEntry.nutrients.fiberG !== null ? `${previewEntry.nutrients.fiberG} g` : 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">{isAr ? 'الصوديوم:' : 'Sodium:'}</span>
                            <span className="font-bold text-slate-800 ms-1">
                              {previewEntry.nutrients.sodiumMg !== null ? `${previewEntry.nutrients.sodiumMg} mg` : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Button */}
                    <button
                      type="button"
                      onClick={handleConfirmAdd}
                      disabled={!previewEntry}
                      className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-md shadow-emerald-200 hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" />
                      {isAr ? 'تأكيد إضافة الصنف للوجبة' : 'Confirm Add to Meal'}
                    </button>
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
                    <Scale className="h-8 w-8 mb-2 text-slate-300" />
                    <p className="text-xs">
                      {isAr ? 'حدد صنفاً من القائمة لضبط الحصة' : 'Select a food from the list to configure portion'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Custom Food Entry Form */
            <form onSubmit={handleCreateCustomFood} className="flex-1 overflow-y-auto p-6">
              <div className="max-w-xl mx-auto space-y-4">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <span className="font-bold">
                      {isAr ? 'تنبيه سريري للأطعمة المخصصة:' : 'Clinical Custom Food Notice:'}
                    </span>{' '}
                    {isAr
                      ? 'الأطعمة المخصصة تُحفظ كبيانات عيادة غير معيارية (User Custom) ولا تُسند إليها معرفات مرجعية رسمية للحفاظ على نزاهة قاعدة البيانات.'
                      : 'Custom food items are tagged as unverified clinic entries and isolated from official reference standards.'}
                  </div>
                </div>

                {customError && (
                  <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
                    {customError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isAr ? 'اسم الطعام بالإنجليزية:' : 'Food Name (English):'} *
                    </label>
                    <input
                      type="text"
                      value={customNameEn}
                      onChange={(e) => setCustomNameEn(e.target.value)}
                      placeholder="e.g. Protein Granola Bar"
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isAr ? 'اسم الطعام بالعربية:' : 'Food Name (Arabic):'} *
                    </label>
                    <input
                      type="text"
                      value={customNameAr}
                      onChange={(e) => setCustomNameAr(e.target.value)}
                      placeholder="مثال: لوح جرانولا بروتين"
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <h3 className="text-xs font-bold text-slate-800 mb-2">
                    {isAr ? 'القيم الغذائية لكل 100 جرام صالحة للأكل:' : 'Nutritional Composition per 100g Edible Portion:'}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        {isAr ? 'السعرات (kcal):' : 'Calories (kcal):'} *
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={customCalories}
                        onChange={(e) => setCustomCalories(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-200 p-2 text-xs font-bold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        {isAr ? 'البروتين (جم):' : 'Protein (g):'} *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={customProtein}
                        onChange={(e) => setCustomProtein(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-200 p-2 text-xs font-bold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        {isAr ? 'الكربوهيدرات (جم):' : 'Carbs (g):'} *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={customCarbs}
                        onChange={(e) => setCustomCarbs(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-200 p-2 text-xs font-bold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        {isAr ? 'الدهون الكلية (جم):' : 'Total Fat (g):'} *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={customFat}
                        onChange={(e) => setCustomFat(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-200 p-2 text-xs font-bold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        {isAr ? 'الألياف (جم):' : 'Fiber (g):'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={customFiber}
                        onChange={(e) => setCustomFiber(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="null if unknown"
                        className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        {isAr ? 'الصوديوم (مجم):' : 'Sodium (mg):'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={customSodium}
                        onChange={(e) => setCustomSodium(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="null if unassayed"
                        className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <h3 className="text-xs font-bold text-slate-800 mb-2">
                    {isAr ? 'الحصة المنزلية الافتراضية:' : 'Default Serving Size:'}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        {isAr ? 'اسم الحصة (En):' : 'Serving Label (En):'}
                      </label>
                      <input
                        type="text"
                        value={customPortionNameEn}
                        onChange={(e) => setCustomPortionNameEn(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        {isAr ? 'اسم الحصة (Ar):' : 'Serving Label (Ar):'}
                      </label>
                      <input
                        type="text"
                        value={customPortionNameAr}
                        onChange={(e) => setCustomPortionNameAr(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        {isAr ? 'الوزن بالجرامات:' : 'Weight in Grams:'} *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={customPortionGrams}
                        onChange={(e) => setCustomPortionGrams(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-200 p-2 text-xs font-bold text-slate-800"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab('database')}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-200 hover:bg-emerald-700"
                  >
                    <Plus className="h-4 w-4" />
                    {isAr ? 'تسجيل وإضافة للطعام' : 'Register & Add Food'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
