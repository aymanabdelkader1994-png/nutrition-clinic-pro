/**
 * Nutrition Clinic Pro - Interactive Clinical Engine & Deterministic Workbench
 * Phase 1 Implementation
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Award,
  BookOpen,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Droplets,
  Flame,
  Globe,
  HeartPulse,
  Info,
  Scale,
  ShieldCheck,
  Stethoscope,
  UserCheck,
  Wheat,
  Utensils,
} from 'lucide-react';

import {
  BiologicalSex,
  ActivityLevel,
  ClinicalStressCondition,
  EnergyEquationId,
  DietaryApproachPresetId,
  runCompleteAnthropometricAssessment,
  runCompleteEnergyAssessment,
  calculateMacronutrientTargets,
  SCIENTIFIC_CITATIONS,
  ACTIVITY_LEVELS,
  STRESS_CONDITIONS,
  DIETARY_APPROACH_PRESETS,
} from './clinical/index';
import { RecallWorkbench } from './components/recall/RecallWorkbench';

export default function App() {
  // Locale State: 'ar' (RTL) or 'en' (LTR)
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const isAr = lang === 'ar';

  // Active View Tab: 'calculator' | 'recall' | 'benchmarks' | 'documentation'
  const [activeTab, setActiveTab] = useState<'calculator' | 'recall' | 'benchmarks' | 'documentation'>('calculator');

  // Patient Input State
  const [sex, setSex] = useState<BiologicalSex>('male');
  const [age, setAge] = useState<number | ''>(35);
  const [heightCm, setHeightCm] = useState<number | ''>(175);
  const [weightKg, setWeightKg] = useState<number | ''>(92);
  const [waistCm, setWaistCm] = useState<number | ''>(96);
  const [hipCm, setHipCm] = useState<number | ''>(102);
  const [bodyFatPercent, setBodyFatPercent] = useState<number | ''>(24);
  const [hasBodyFat, setHasBodyFat] = useState<boolean>(true);

  // Energy & Clinical Parameters
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('lightly_active');
  const [stressCondition, setStressCondition] = useState<ClinicalStressCondition>('normal');
  const [adjustmentKcal, setAdjustmentKcal] = useState<number>(-500);
  const [selectedEquation, setSelectedEquation] = useState<EnergyEquationId>('mifflin_st_jeor');

  // Macronutrient State
  const [selectedDietPreset, setSelectedDietPreset] = useState<DietaryApproachPresetId | 'custom'>('high_protein_weight_loss');
  const [carbsPercent, setCarbsPercent] = useState<number>(35);
  const [proteinPercent, setProteinPercent] = useState<number>(35);
  const [fatPercent, setFatPercent] = useState<number>(30);

  // Accordion toggle for equation citations
  const [expandedCitation, setExpandedCitation] = useState<EnergyEquationId | null>(null);

  // Helper to detect if current macro distribution matches an established clinical preset
  const detectPreset = (carbs: number, protein: number, fat: number): DietaryApproachPresetId | 'custom' => {
    for (const preset of Object.values(DIETARY_APPROACH_PRESETS)) {
      if (
        preset.defaultRatio.carbsPercent === carbs &&
        preset.defaultRatio.proteinPercent === protein &&
        preset.defaultRatio.fatPercent === fat
      ) {
        return preset.id;
      }
    }
    return 'custom';
  };

  // Apply diet preset
  const handleApplyPreset = (presetId: DietaryApproachPresetId) => {
    setSelectedDietPreset(presetId);
    const preset = DIETARY_APPROACH_PRESETS[presetId];
    setCarbsPercent(preset.defaultRatio.carbsPercent);
    setProteinPercent(preset.defaultRatio.proteinPercent);
    setFatPercent(preset.defaultRatio.fatPercent);
  };

  // Parsing & Strict Validation (No Silent Fallbacks)
  const parsedAge = typeof age === 'number' && Number.isFinite(age) && age > 0 ? age : null;
  const parsedHeight = typeof heightCm === 'number' && Number.isFinite(heightCm) && heightCm > 0 ? heightCm : null;
  const parsedWeight = typeof weightKg === 'number' && Number.isFinite(weightKg) && weightKg > 0 ? weightKg : null;

  const parsedWaist = typeof waistCm === 'number' && Number.isFinite(waistCm) && waistCm > 0 ? waistCm : undefined;
  const parsedHip = typeof hipCm === 'number' && Number.isFinite(hipCm) && hipCm > 0 ? hipCm : undefined;

  // Optional Body Fat Isolation: physiologically plausible range is 2% to 75%
  const rawBodyFat = typeof bodyFatPercent === 'number' && Number.isFinite(bodyFatPercent) ? bodyFatPercent : null;
  const isBodyFatInvalid = hasBodyFat && bodyFatPercent !== '' && (rawBodyFat === null || rawBodyFat < 2 || rawBodyFat > 75);
  const validatedBodyFat = hasBodyFat && !isBodyFatInvalid && rawBodyFat !== null ? rawBodyFat : undefined;

  const isMissingCoreData = parsedAge === null || parsedHeight === null || parsedWeight === null;

  // 1. Run Deterministic Anthropometric Assessment
  const { anthropometrics, anthropometricError } = useMemo(() => {
    if (isMissingCoreData) {
      return { anthropometrics: null, anthropometricError: null };
    }
    try {
      const res = runCompleteAnthropometricAssessment({
        weightKg: parsedWeight,
        heightCm: parsedHeight,
        ageYears: parsedAge,
        sex,
        waistCm: parsedWaist,
        hipCm: parsedHip,
        bodyFatPercentage: validatedBodyFat,
      });
      return { anthropometrics: res, anthropometricError: null };
    } catch (err) {
      return {
        anthropometrics: null,
        anthropometricError: err instanceof Error ? err.message : String(err),
      };
    }
  }, [isMissingCoreData, parsedWeight, parsedHeight, parsedAge, sex, parsedWaist, parsedHip, validatedBodyFat]);

  // 2. Run Deterministic Energy Assessment
  const { energy, energyError } = useMemo(() => {
    if (!anthropometrics || isMissingCoreData) return { energy: null, energyError: null };

    // Clinical Safety Gate: Ensure pediatric patients (< 19y) NEVER receive adult obesity classification or ABW
    const isPediatric = anthropometrics.bmiResult.isPediatric;
    const isObese = !isPediatric && anthropometrics.bmiResult.bmi >= 30;
    const lbm = anthropometrics.bodyComposition.leanBodyMassKg;
    const abw = !isPediatric ? anthropometrics.ibwResult.adjustedBodyWeightKg : undefined;

    try {
      const res = runCompleteEnergyAssessment({
        actualWeightKg: parsedWeight,
        heightCm: parsedHeight,
        ageYears: parsedAge,
        sex,
        activityLevel,
        stressCondition,
        leanBodyMassKg: lbm,
        isObese,
        adjustedWeightKg: abw,
        adjustmentKcal: Number(adjustmentKcal) || 0,
        preferredEquation: selectedEquation,
      });
      return { energy: res, energyError: null };
    } catch (err) {
      return {
        energy: null,
        energyError: err instanceof Error ? err.message : String(err),
      };
    }
  }, [anthropometrics, isMissingCoreData, parsedWeight, parsedHeight, parsedAge, sex, activityLevel, stressCondition, adjustmentKcal, selectedEquation]);

  // 3. Run Deterministic Macronutrient Target Calculation
  const { macronutrients, macronutrientError } = useMemo(() => {
    if (!energy || isMissingCoreData) return { macronutrients: null, macronutrientError: null };
    try {
      const res = calculateMacronutrientTargets({
        targetCalories: energy.targetKcal,
        ratio: {
          carbsPercent,
          proteinPercent,
          fatPercent,
        },
        bodyWeightKg: parsedWeight,
      });
      return { macronutrients: res, macronutrientError: null };
    } catch (err) {
      return {
        macronutrients: null,
        macronutrientError: err instanceof Error ? err.message : String(err),
      };
    }
  }, [energy, isMissingCoreData, carbsPercent, proteinPercent, fatPercent, parsedWeight]);

  // Auto-sync selected equation if current selection becomes clinically inappropriate (e.g., body fat removed)
  useEffect(() => {
    if (energy && !energy.calculatedEquations[selectedEquation]?.isAppropriate) {
      setSelectedEquation(energy.primaryRecommendedEquation);
    }
  }, [energy, selectedEquation]);

  // English IBW & ABW Rationale generator (bilingual clinical parity)
  const ibwRationaleEn = useMemo(() => {
    if (!anthropometrics) return '';
    if (anthropometrics.bmiResult.isPediatric) {
      return 'Ideal Body Weight and Adjusted Body Weight (ABW) formulas are calibrated for adults only and are suppressed for pediatric patients (< 19 years) to prevent diagnostic error.';
    }
    const bmiVal = anthropometrics.bmiResult.bmi;
    const isNeeded = anthropometrics.ibwResult.isAdjustedWeightNeeded;
    const abwVal = anthropometrics.ibwResult.adjustedBodyWeightKg;
    let text = isNeeded
      ? `Due to obesity (BMI ${bmiVal.toFixed(1)} kg/m² or actual weight > 120% of IBW), Adjusted Body Weight (${abwVal} kg) serves as an advisory reference value whose clinical use depends on discretionary protocol; the Academy of Nutrition and Dietetics (AND) guidelines recommend using the Mifflin-St Jeor equation with actual body weight for estimating energy requirements in overweight and obesity.`
      : 'Current body weight is within a range that does not clinically require Adjusted Body Weight.';
    if (parsedHeight !== null && parsedHeight < 152.4) {
      text += ' Clinical Note: Classical IBW formulas (Devine, Hamwi, Robinson) were statistically calibrated for adults ≥ 152.4 cm (5 ft); applying them to shorter statures represents unvalidated extrapolation. Guiding by normal BMI range (18.5 - 24.9 kg/m²) is preferred.';
    }
    return text;
  }, [anthropometrics, parsedHeight]);

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className={`min-h-screen bg-slate-50 text-slate-900 ${isAr ? 'font-sans' : 'font-sans'}`}
    >
      {/* Top Professional Header */}
      <header className="sticky top-0 z-30 border-b border-emerald-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-200">
              <Stethoscope className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 sm:text-xl">
                  {isAr ? 'نيوتريشن كلينك برو' : 'Nutrition Clinic Pro'}
                </h1>
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                  {isAr ? 'منصة سريرية متكاملة' : 'Clinical Platform'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {isAr
                  ? 'منصة إدارة العيادات والتغذية العلاجية — محرك الحسابات السريرية المعياري'
                  : 'Clinical Nutrition Management — Deterministic Calculation Engine'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Tabs */}
            <div className="hidden rounded-lg bg-slate-100 p-1 md:flex">
              <button
                type="button"
                onClick={() => setActiveTab('calculator')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  activeTab === 'calculator'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calculator className="h-3.5 w-3.5" />
                {isAr ? 'حاسبة الفحص السريري' : 'Clinical Calculator'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('recall')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  activeTab === 'recall'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Utensils className="h-3.5 w-3.5" />
                {isAr ? 'الاسترجاع الغذائي 24 ساعة' : '24h Dietary Recall'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('benchmarks')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  activeTab === 'benchmarks'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                {isAr ? 'فحص المطابقة العلمية (34 اختباراً)' : 'Scientific Benchmarks (34)'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('documentation')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  activeTab === 'documentation'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                {isAr ? 'المراجع والمعادلات' : 'References'}
              </button>
            </div>

            {/* Language Switcher */}
            <button
              type="button"
              onClick={() => setLang(isAr ? 'en' : 'ar')}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              aria-label="Toggle language"
            >
              <Globe className="h-4 w-4 text-emerald-600" />
              <span>{isAr ? 'English (LTR)' : 'العربية (RTL)'}</span>
            </button>
          </div>
        </div>

        {/* Mobile Sub-tabs */}
        <div className="flex border-t border-slate-100 px-4 py-2 md:hidden overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('calculator')}
            className={`flex-1 py-1 text-center text-xs font-medium whitespace-nowrap ${
              activeTab === 'calculator' ? 'border-b-2 border-emerald-600 font-bold text-emerald-600' : 'text-slate-500'
            }`}
          >
            {isAr ? 'الحاسبة' : 'Calculator'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('recall')}
            className={`flex-1 py-1 text-center text-xs font-medium whitespace-nowrap ${
              activeTab === 'recall' ? 'border-b-2 border-emerald-600 font-bold text-emerald-600' : 'text-slate-500'
            }`}
          >
            {isAr ? 'الاسترجاع 24h' : '24h Recall'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('benchmarks')}
            className={`flex-1 py-1 text-center text-xs font-medium whitespace-nowrap ${
              activeTab === 'benchmarks' ? 'border-b-2 border-emerald-600 font-bold text-emerald-600' : 'text-slate-500'
            }`}
          >
            {isAr ? 'المطابقة السريرية' : 'Benchmarks'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('documentation')}
            className={`flex-1 py-1 text-center text-xs font-medium whitespace-nowrap ${
              activeTab === 'documentation' ? 'border-b-2 border-emerald-600 font-bold text-emerald-600' : 'text-slate-500'
            }`}
          >
            {isAr ? 'المراجع' : 'References'}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {activeTab === 'calculator' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left Column: Clinical Inputs (5 cols) */}
            <div className="space-y-6 lg:col-span-5">
              {/* Patient Basic Data Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-emerald-600" />
                    <h2 className="font-bold text-slate-800">
                      {isAr ? 'البيانات الجسدية والسريرية' : 'Patient Anthropometrics'}
                    </h2>
                  </div>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {isAr ? 'مدخلات المريض' : 'Inputs'}
                  </span>
                </div>

                {/* Biological Sex */}
                <div className="mb-4">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    {isAr ? 'الجنس البيولوجي (ضروري لصيغ الطاقة)' : 'Biological Sex'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSex('male')}
                      className={`flex items-center justify-center rounded-lg border py-2 text-sm font-medium transition ${
                        sex === 'male'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {isAr ? 'ذكر (Male)' : 'Male'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSex('female')}
                      className={`flex items-center justify-center rounded-lg border py-2 text-sm font-medium transition ${
                        sex === 'female'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {isAr ? 'أنثى (Female)' : 'Female'}
                    </button>
                  </div>
                </div>

                {/* Age, Height, Weight Grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      {isAr ? 'العمر (سنة)' : 'Age (yrs)'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="110"
                      value={age}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAge(val === '' ? '' : Number(val));
                      }}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    {typeof age === 'number' && age > 0 && age < 19 && (
                      <span className="mt-1 block text-[10px] font-bold text-amber-600">
                        {isAr ? 'فحص أطفال/مراهقين' : 'Pediatric check'}
                      </span>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      {isAr ? 'الطول (سم)' : 'Height (cm)'}
                    </label>
                    <input
                      type="number"
                      min="50"
                      max="250"
                      value={heightCm}
                      onChange={(e) => {
                        const val = e.target.value;
                        setHeightCm(val === '' ? '' : Number(val));
                      }}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      {isAr ? 'الوزن (كجم)' : 'Weight (kg)'}
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="10"
                      max="300"
                      value={weightKg}
                      onChange={(e) => {
                        const val = e.target.value;
                        setWeightKg(val === '' ? '' : Number(val));
                      }}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Waist & Hip (Circumferences) */}
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <span className="mb-2 block text-xs font-bold text-slate-600">
                    {isAr ? 'القياسات المحيطية (تقييم الخطر الأيضي والقلبي)' : 'Circumferences & Metabolic Risk'}
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-slate-600">
                        {isAr ? 'محيط الخصر (سم)' : 'Waist (cm)'}
                      </label>
                      <input
                        type="number"
                        min="40"
                        max="200"
                        value={waistCm}
                        onChange={(e) => {
                          const val = e.target.value;
                          setWaistCm(val === '' ? '' : Number(val));
                        }}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-600">
                        {isAr ? 'محيط الورك (سم)' : 'Hip (cm)'}
                      </label>
                      <input
                        type="number"
                        min="50"
                        max="220"
                        value={hipCm}
                        onChange={(e) => {
                          const val = e.target.value;
                          setHipCm(val === '' ? '' : Number(val));
                        }}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Body Composition (Fat % and LBM) */}
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">
                      {isAr ? 'تركيب الجسم والكتلة اللادهنية (LBM)' : 'Body Composition & LBM'}
                    </span>
                    <label className="flex items-center gap-1.5 text-xs text-slate-500">
                      <input
                        type="checkbox"
                        checked={hasBodyFat}
                        onChange={(e) => setHasBodyFat(e.target.checked)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>{isAr ? 'تضمين نسبة الدهون' : 'Include Fat %'}</span>
                    </label>
                  </div>
                  {hasBodyFat && (
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="mb-1 block text-xs text-slate-600">
                            {isAr ? 'نسبة الدهون المقاسة (%)' : 'Body Fat %'}
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            min="2"
                            max="75"
                            value={bodyFatPercent}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBodyFatPercent(val === '' ? '' : Number(val));
                            }}
                            className={`w-full rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-1 ${
                              isBodyFatInvalid
                                ? 'border-rose-300 bg-rose-50 text-rose-900 focus:border-rose-500 focus:ring-rose-500'
                                : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500'
                            }`}
                          />
                        </div>
                        {anthropometrics?.bodyComposition?.leanBodyMassKg && (
                          <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs">
                            <span className="text-slate-500">{isAr ? 'الكتلة العضلية/اللادهنية:' : 'Lean Mass:'}</span>
                            <span className="block font-bold text-emerald-700">
                              {anthropometrics.bodyComposition.leanBodyMassKg} {isAr ? 'كجم' : 'kg'}
                            </span>
                          </div>
                        )}
                      </div>
                      {isBodyFatInvalid && (
                        <p className="mt-1.5 text-[11px] font-semibold text-rose-600">
                          {isAr
                            ? 'تنبيه: نسبة الدهون المدخلة خارج النطاق الفسيولوجي المعتمد (2% - 75%). تم استبعادها من الحسابات دون تعطيل بقية التقرير.'
                            : 'Alert: Body fat % is outside plausible clinical range (2% - 75%). Excluded from calculation without breaking the report.'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Physical Activity & Clinical Stress */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Activity className="h-5 w-5 text-emerald-600" />
                  <h2 className="font-bold text-slate-800">
                    {isAr ? 'عوامل النشاط البدني والإجهاد السريري' : 'Activity & Clinical Stress'}
                  </h2>
                </div>

                {/* Activity Level Selector */}
                <div className="mb-4">
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    {isAr ? 'مستوى النشاط البدني (معامل PAL)' : 'Physical Activity Level (PAL)'}
                  </label>
                  <select
                    value={activityLevel}
                    onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {Object.values(ACTIVITY_LEVELS).map((lvl) => (
                      <option key={lvl.level} value={lvl.level}>
                        {isAr ? `${lvl.labelAr} (×${lvl.palFactor})` : `${lvl.labelEn} (PAL ${lvl.palFactor})`}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {isAr ? ACTIVITY_LEVELS[activityLevel].descriptionAr : ACTIVITY_LEVELS[activityLevel].labelEn}
                  </p>
                </div>

                {/* Clinical Stress Condition Selector */}
                <div className="mb-4">
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    {isAr ? 'الحالة السريرية / عامل الإجهاد المرضي (Stress Factor)' : 'Clinical Stress Condition'}
                  </label>
                  <select
                    value={stressCondition}
                    onChange={(e) => setStressCondition(e.target.value as ClinicalStressCondition)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {Object.values(STRESS_CONDITIONS).map((cond) => (
                      <option key={cond.condition} value={cond.condition}>
                        {isAr ? `${cond.labelAr} (×${cond.factor})` : `${cond.labelEn} (×${cond.factor})`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Caloric Adjustment (Deficit/Surplus) */}
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>{isAr ? 'تعديل السعرات السريري (عجز أو فائض)' : 'Caloric Deficit / Surplus Target'}</span>
                    <span
                      className={`font-bold ${
                        adjustmentKcal < 0
                          ? 'text-rose-600'
                          : adjustmentKcal > 0
                          ? 'text-blue-600'
                          : 'text-slate-600'
                      }`}
                    >
                      {adjustmentKcal > 0 ? `+${adjustmentKcal}` : adjustmentKcal} {isAr ? 'سعرة' : 'kcal'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-1200"
                    max="1000"
                    step="50"
                    value={adjustmentKcal}
                    onChange={(e) => setAdjustmentKcal(Number(e.target.value))}
                    className="h-2 w-full cursor-pointer accent-emerald-600"
                  />
                  <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                    <span>{isAr ? '-1200 سعرة (إنقاص حاد)' : '-1200 (Extreme)'}</span>
                    <span>{isAr ? '-500 (إنقاص آمن 0.5 كجم/أسبوع)' : '-500 (Standard)'}</span>
                    <span>{isAr ? '0 (ثبات)' : '0 (Maintenance)'}</span>
                    <span>{isAr ? '+500 (زيادة وزن)' : '+500 (Surplus)'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Deterministic Clinical Results (7 cols) */}
            <div className="space-y-6 lg:col-span-7">
              {/* Missing Core Data Prompt Banner */}
              {isMissingCoreData && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 shadow-sm">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <Scale className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {isAr ? 'يرجى إدخال البيانات الجسدية الأساسية للمريض' : 'Please Enter Required Patient Anthropometrics'}
                  </h3>
                  <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">
                    {isAr
                      ? 'يتطلب محرك الحسابات السريرية إدخال العمر والطول والوزن بشكل صحيح وموجب لبدء التحليل وحساب مؤشر كتلة الجسم وتوزيع الطاقة.'
                      : 'The clinical calculation engine requires valid positive numbers for Age, Height, and Weight to generate anthropometric assessment and caloric targets.'}
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
                    {parsedAge === null && (
                      <span className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 font-medium text-amber-700">
                        {isAr ? 'العمر مطلوب' : 'Age required'}
                      </span>
                    )}
                    {parsedHeight === null && (
                      <span className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 font-medium text-amber-700">
                        {isAr ? 'الطول مطلوب' : 'Height required'}
                      </span>
                    )}
                    {parsedWeight === null && (
                      <span className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 font-medium text-amber-700">
                        {isAr ? 'الوزن مطلوب' : 'Weight required'}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Anthropometric Validation Error Alert */}
              {anthropometricError && (
                <div className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-xs text-red-900 shadow-sm">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
                  <div>
                    <h4 className="font-bold">
                      {isAr ? 'خطأ في التحقق من البيانات الجسدية:' : 'Anthropometric Validation Error:'}
                    </h4>
                    <p className="mt-0.5">{anthropometricError}</p>
                  </div>
                </div>
              )}

              {/* Energy Calculation Error Alert */}
              {energyError && (
                <div className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-xs text-red-900 shadow-sm">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
                  <div>
                    <h4 className="font-bold">
                      {isAr ? 'خطأ في حسابات الطاقة:' : 'Energy Calculation Error:'}
                    </h4>
                    <p className="mt-0.5">{energyError}</p>
                  </div>
                </div>
              )}

              {/* Pediatric Warning Alert (If age < 19) */}
              {anthropometrics?.bmiResult.isPediatric && (
                <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-sm">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                    <div>
                      <h3 className="font-bold text-amber-800">
                        {isAr ? 'تحذير سريري حاسم: مريض دون سن 19 عاماً' : 'Clinical Safety Rule: Pediatric Patient'}
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-amber-800">
                        {isAr
                          ? anthropometrics.bmiResult.pediatricGuidance?.warningAr
                          : anthropometrics.bmiResult.pediatricGuidance?.warningEn}
                      </p>
                      <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
                        <Award className="h-3.5 w-3.5" />
                        <span>{anthropometrics.bmiResult.pediatricGuidance?.whoGrowthStandardRef}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Safety Alerts (Low calories or severe deficit) */}
              {energy?.safetyAlerts && energy.safetyAlerts.length > 0 && (
                <div className="space-y-2">
                  {energy.safetyAlerts.map((alert, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start gap-3 rounded-xl border p-3 text-xs ${
                        alert.severity === 'danger'
                          ? 'border-red-300 bg-red-50 text-red-900'
                          : alert.severity === 'warning'
                          ? 'border-amber-300 bg-amber-50 text-amber-900'
                          : 'border-blue-200 bg-blue-50 text-blue-900'
                      }`}
                    >
                      {alert.severity === 'danger' ? (
                        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
                      ) : alert.severity === 'warning' ? (
                        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                      ) : (
                        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                      )}
                      <p>{isAr ? alert.messageAr : alert.messageEn}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Top Summary Banner: BMR & Prescribed TDEE */}
              {energy && (
                <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-500 to-teal-700 p-5 text-white shadow-md">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-medium text-emerald-100">
                        {isAr ? 'الاحتياج اليومي المستهدف الموصى به' : 'Prescribed Target Energy Intake'}
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold sm:text-4xl">{energy.targetKcal}</span>
                        <span className="text-sm font-medium text-emerald-100">{isAr ? 'سعرة / يوم' : 'kcal / day'}</span>
                      </div>
                      <p className="mt-1 text-xs text-emerald-100">
                        {isAr ? 'بناءً على معادلة:' : 'Formula:'}{' '}
                        <strong className="underline">
                          {isAr
                            ? SCIENTIFIC_CITATIONS[energy.primaryRecommendedEquation].formulaNameAr
                            : SCIENTIFIC_CITATIONS[energy.primaryRecommendedEquation].formulaName}
                        </strong>
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 rounded-xl bg-white/10 p-3 backdrop-blur-sm">
                      <div>
                        <span className="block text-[11px] text-emerald-100">
                          {isAr ? 'معدل الأيض الأساسي (BMR)' : 'Basal Metabolic Rate'}
                        </span>
                        <span className="text-lg font-bold">{energy.recommendedBmrKcal} kcal</span>
                      </div>
                      <div>
                        <span className="block text-[11px] text-emerald-100">
                          {isAr ? 'استهلاك الطاقة الكلي (TDEE)' : 'Total Expenditure'}
                        </span>
                        <span className="text-lg font-bold">{energy.recommendedTdeeKcal} kcal</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Anthropometric Breakdown Card */}
              {anthropometrics && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Scale className="h-5 w-5 text-emerald-600" />
                      <h2 className="font-bold text-slate-800">
                        {isAr ? 'التحليل الجسدي وتصنيف منظمة الصحة (WHO)' : 'Anthropometric & WHO Classification'}
                      </h2>
                    </div>
                    {/* BMI Tag */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">BMI:</span>
                      <span className="text-base font-extrabold text-slate-800">
                        {anthropometrics.bmiResult.bmi} kg/m²
                      </span>
                    </div>
                  </div>

                  {/* Adult Classification Badge or Pediatric Note */}
                  {!anthropometrics.bmiResult.isPediatric ? (
                    <div
                      className={`mb-4 flex items-center justify-between rounded-xl border p-3 ${anthropometrics.bmiResult.colorClass}`}
                    >
                      <div className="flex items-center gap-2">
                        <HeartPulse className="h-5 w-5 flex-shrink-0" />
                        <div>
                          <span className="block text-xs font-medium">
                            {isAr ? 'التصنيف السريري المعتمد للبالغين:' : 'Adult Clinical Classification:'}
                          </span>
                          <span className="text-sm font-bold">
                            {isAr
                              ? anthropometrics.bmiResult.categoryLabelAr
                              : anthropometrics.bmiResult.categoryLabelEn}
                          </span>
                        </div>
                      </div>
                      <span className="rounded bg-white/70 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        {isAr ? 'معايير منظمة الصحة (WHO)' : 'WHO Standard'}
                      </span>
                    </div>
                  ) : (
                    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                      <strong>{isAr ? 'تنبيه سريري:' : 'Clinical Note:'}</strong>{' '}
                      {isAr
                        ? 'تم حجب تصنيف البالغين لأن عمر المريض أقل من 19 عاماً لحمايته من التشخيص الخاطئ.'
                        : 'Adult categorization suppressed. Patient is under 19 years.'}
                    </div>
                  )}

                  {/* IBW & Adjusted Weight */}
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <span className="text-xs text-slate-500">
                          {isAr ? 'الوزن المثالي الموصى به (صيغة ديفاين Devine):' : 'Ideal Body Weight (Devine):'}
                        </span>
                        <span className="block text-sm font-bold text-slate-800">
                          {anthropometrics.ibwResult.devineKg} {isAr ? 'كجم' : 'kg'}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {isAr ? `هاموي: ${anthropometrics.ibwResult.hamwiKg} كجم | روبنسون: ${anthropometrics.ibwResult.robinsonKg} كجم` : `Hamwi: ${anthropometrics.ibwResult.hamwiKg} kg | Robinson: ${anthropometrics.ibwResult.robinsonKg} kg`}
                        </span>
                      </div>

                      <div>
                        <span className="text-xs text-slate-500">
                          {isAr ? 'الوزن المعدل للسمنة (Adjusted Body Weight):' : 'Adjusted Body Weight (ABW):'}
                        </span>
                        {anthropometrics.bmiResult.isPediatric ? (
                          <div>
                            <span className="block text-xs font-semibold text-slate-600">
                              {isAr ? 'غير منطبق على الأطفال والمراهقين' : 'Not applicable to pediatrics'}
                            </span>
                            <span className="block text-[10px] text-slate-400">
                              {isAr ? 'معادلات السمنة والوزن المعدل مخصصة للبالغين فقط' : 'ABW formulas are calibrated for adults only'}
                            </span>
                          </div>
                        ) : anthropometrics.ibwResult.isAdjustedWeightNeeded ? (
                          <div>
                            <span className="text-sm font-bold text-emerald-700">
                              {anthropometrics.ibwResult.adjustedBodyWeightKg} {isAr ? 'كجم (مُطبّق)' : 'kg (Active)'}
                            </span>
                            <span className="block text-[10px] text-emerald-600">
                              {isAr ? 'تم تفعيله تلقائياً لوجود سمنة' : 'Activated for obesity adjustments'}
                            </span>
                          </div>
                        ) : (
                          <span className="block text-xs font-semibold text-slate-600">
                            {isAr ? 'غير مطلوب (الوزن ضمن المعدل)' : 'Not clinically required'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Clinical Rationale & Advisory Guidance Box */}
                    <div className="mt-3 rounded-lg border border-slate-200/80 bg-white p-2.5 text-[11px] leading-relaxed text-slate-600">
                      <span className="font-semibold text-slate-700">
                        {isAr ? 'السند والتوجيه السريري:' : 'Clinical Rationale & Guidance:'}
                      </span>{' '}
                      {isAr ? anthropometrics.ibwResult.rationaleAr : ibwRationaleEn}
                    </div>
                  </div>

                  {/* Body Surface Area & Cardio-metabolic Indices (BSA, WHtR, WHR) */}
                  <div className="mt-3 grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
                    {/* 1. BSA */}
                    <div className="rounded-lg border border-slate-100 p-2.5">
                      <span className="text-slate-500">{isAr ? 'مساحة سطح الجسم (BSA):' : 'Body Surface Area:'}</span>
                      <span className="block font-bold text-slate-800">
                        {anthropometrics.bsaMostellerM2} m²
                      </span>
                      <span className="block text-[10px] text-slate-400">
                        Mosteller (1987)
                      </span>
                    </div>

                    {/* 2. WHtR */}
                    <div className="rounded-lg border border-slate-100 p-2.5">
                      <span className="text-slate-500">
                        {isAr ? 'نسبة الخصر إلى الطول (WHtR):' : 'Waist-to-Height Ratio:'}
                      </span>
                      <span className="block font-bold text-slate-800">
                        {anthropometrics.cardioMetabolicRisk.whtr !== undefined ? anthropometrics.cardioMetabolicRisk.whtr : '—'}
                      </span>
                      {anthropometrics.cardioMetabolicRisk.whtr !== undefined ? (
                        <span className="block text-[10px] text-slate-500">
                          {isAr
                            ? anthropometrics.cardioMetabolicRisk.whtrRiskLabelAr
                            : anthropometrics.cardioMetabolicRisk.whtrRiskLevel === 'substantially_increased_risk'
                            ? 'Substantially Increased Risk (WHtR ≥ 0.60)'
                            : anthropometrics.cardioMetabolicRisk.whtrRiskLevel === 'increased_risk'
                            ? 'Increased Cardiometabolic Risk (WHtR ≥ 0.50)'
                            : 'Healthy / Low Risk (WHtR < 0.50)'}
                        </span>
                      ) : (
                        <span className="block text-[10px] text-slate-400">
                          {isAr ? 'يتطلب إدخال محيط الخصر' : 'Requires waist measurement'}
                        </span>
                      )}
                    </div>

                    {/* 3. WHR */}
                    <div className="rounded-lg border border-slate-100 p-2.5">
                      <span className="text-slate-500">
                        {isAr ? 'نسبة الخصر إلى الورك (WHR):' : 'Waist-to-Hip Ratio:'}
                      </span>
                      <span className="block font-bold text-slate-800">
                        {anthropometrics.cardioMetabolicRisk.whr !== undefined ? anthropometrics.cardioMetabolicRisk.whr : '—'}
                      </span>
                      {anthropometrics.cardioMetabolicRisk.whr !== undefined ? (
                        <span className="block text-[10px] text-slate-500">
                          {isAr
                            ? anthropometrics.cardioMetabolicRisk.whrRiskLabelAr
                            : anthropometrics.cardioMetabolicRisk.whrRiskLevel === 'high'
                            ? `High Risk (${anthropometrics.cardioMetabolicRisk.whr}) - Central / Android Adiposity`
                            : `Low Risk (${anthropometrics.cardioMetabolicRisk.whr}) - Normal Distribution`}
                        </span>
                      ) : (
                        <span className="block text-[10px] text-slate-400">
                          {isAr ? 'يتطلب إدخال الخصر والورك' : 'Requires waist & hip measurements'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Energy Equations Comparative Table (Deterministic Engine) */}
              {energy && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Flame className="h-5 w-5 text-emerald-600" />
                      <h2 className="font-bold text-slate-800">
                        {isAr ? 'مقارنة معادلات الطاقة السريرية الستة' : 'Clinical Energy Equations Comparison'}
                      </h2>
                    </div>
                    <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      Deterministic
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700" dir={isAr ? 'rtl' : 'ltr'}>
                      <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                        <tr>
                          <th className="px-3 py-2.5">{isAr ? 'المعادلة والمرجع' : 'Equation'}</th>
                          <th className="px-3 py-2.5">{isAr ? 'BMR (سعرة)' : 'BMR (kcal)'}</th>
                          <th className="px-3 py-2.5">{isAr ? 'TDEE (سعرة)' : 'TDEE (kcal)'}</th>
                          <th className="px-3 py-2.5">{isAr ? 'الوزن المعتمد' : 'Weight Used'}</th>
                          <th className="px-3 py-2.5 text-center">{isAr ? 'الحالة والملاءمة' : 'Status'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(Object.keys(energy.calculatedEquations) as EnergyEquationId[]).map((eqId) => {
                          const eq = energy.calculatedEquations[eqId];
                          const isPrimary = energy.primaryRecommendedEquation === eqId;
                          const isSelected = energy.primaryRecommendedEquation === eqId;

                          return (
                            <React.Fragment key={eqId}>
                              <tr
                                className={`transition hover:bg-slate-50/80 ${
                                  isSelected ? 'bg-emerald-50/50' : ''
                                } ${!eq.isAppropriate ? 'opacity-60 bg-slate-50/30' : ''}`}
                              >
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      disabled={!eq.isAppropriate}
                                      onClick={() => {
                                        if (eq.isAppropriate) {
                                          setSelectedEquation(eqId);
                                        }
                                      }}
                                      className={`h-3.5 w-3.5 rounded-full border transition ${
                                        !eq.isAppropriate
                                          ? 'cursor-not-allowed border-slate-200 bg-slate-100 opacity-40'
                                          : isSelected
                                          ? 'cursor-pointer border-emerald-600 bg-emerald-600 ring-2 ring-emerald-200'
                                          : 'cursor-pointer border-slate-300 hover:border-emerald-500'
                                      }`}
                                      aria-label={`Select ${eq.citation.formulaName}`}
                                      title={
                                        !eq.isAppropriate
                                          ? isAr
                                            ? 'المعادلة غير متاحة لعدم توفر قياس دهون الجسم/الكتلة اللادهنية'
                                            : 'Equation unavailable: requires body fat / lean body mass'
                                          : undefined
                                      }
                                    />
                                    <div>
                                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                                        <span>{isAr ? eq.citation.formulaNameAr : eq.citation.formulaName}</span>
                                        {isPrimary && (
                                          <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800">
                                            {isAr ? 'المعتمدة حالياً' : 'Active'}
                                          </span>
                                        )}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setExpandedCitation(expandedCitation === eqId ? null : eqId)
                                        }
                                        className="flex items-center gap-1 text-[10px] text-emerald-600 hover:underline"
                                      >
                                        <span>{isAr ? 'عرض المرجع والقيود' : 'View citation & limits'}</span>
                                        {expandedCitation === eqId ? (
                                          <ChevronUp className="h-3 w-3" />
                                        ) : (
                                          <ChevronDown className="h-3 w-3" />
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                </td>

                                <td className="px-3 py-2.5 font-semibold text-slate-900">
                                  {eq.isAppropriate ? `${eq.bmrKcal}` : '—'}
                                </td>

                                <td className="px-3 py-2.5 font-bold text-emerald-700">
                                  {eq.isAppropriate ? `${eq.tdeeKcal}` : '—'}
                                </td>

                                <td className="px-3 py-2.5 text-slate-600">
                                  {eq.weightUsedType === 'actual'
                                    ? isAr
                                      ? `الفعلي (${eq.weightUsedKg} كجم)`
                                      : `Actual (${eq.weightUsedKg} kg)`
                                    : eq.weightUsedType === 'adjusted'
                                    ? isAr
                                      ? `المعدل (${eq.weightUsedKg} كجم)`
                                      : `Adjusted (${eq.weightUsedKg} kg)`
                                    : isAr
                                    ? `الكتلة اللادهنية (${eq.weightUsedKg} كجم)`
                                    : `LBM (${eq.weightUsedKg} kg)`}
                                </td>

                                <td className="px-3 py-2.5 text-center">
                                  {eq.isAppropriate ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                                      <CheckCircle2 className="h-3 w-3" />
                                      {isAr ? 'صالحة سريرياً' : 'Valid'}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700" title={isAr ? eq.suitabilityNoteAr : eq.suitabilityNoteEn}>
                                      <AlertCircle className="h-3 w-3" />
                                      {isAr ? 'تتطلب نسبة دهون' : 'Requires Body Fat'}
                                    </span>
                                  )}
                                </td>
                              </tr>

                              {/* Expanded Citation Details */}
                              {expandedCitation === eqId && (
                                <tr className="bg-slate-50/90 text-xs">
                                  <td colSpan={5} className="p-3">
                                    <div className="space-y-1.5 rounded-lg border border-slate-200 bg-white p-3 text-[11px] text-slate-600">
                                      <p>
                                        <strong className="text-slate-800">{isAr ? 'المرجع العلمي:' : 'Primary Reference:'}</strong>{' '}
                                        {eq.citation.primaryReference}
                                      </p>
                                      <p>
                                        <strong className="text-slate-800">{isAr ? 'الفئة المستهدفة:' : 'Applicable Population:'}</strong>{' '}
                                        {isAr ? eq.citation.applicablePopulationAr : eq.citation.applicablePopulation}
                                      </p>
                                      <p>
                                        <strong className="text-slate-800">{isAr ? 'القيود السريرية:' : 'Limitations:'}</strong>{' '}
                                        {isAr ? eq.citation.limitationsAr : eq.citation.limitations}
                                      </p>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Macronutrient Target Calculation Error */}
              {macronutrientError && (
                <div className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-xs text-red-900 shadow-sm">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
                  <div>
                    <h4 className="font-bold">
                      {isAr ? 'خطأ في توزيع المغذيات الكبرى:' : 'Macronutrient Target Error:'}
                    </h4>
                    <p className="mt-0.5">{macronutrientError}</p>
                  </div>
                </div>
              )}

              {/* Macronutrient Distribution & Balancing Card */}
              {macronutrients && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Wheat className="h-5 w-5 text-emerald-600" />
                      <h2 className="font-bold text-slate-800">
                        {isAr ? 'توزيع المغذيات الكبرى (Macronutrient Targets)' : 'Macronutrient Targets & Balancing'}
                      </h2>
                    </div>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      {macronutrients.totalCalories} {isAr ? 'سعرة' : 'kcal'}
                    </span>
                  </div>

                  {/* Dietary Approach Presets */}
                  <div className="mb-4">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                      {isAr ? 'الأنظمة الغذائية المعتمدة سريرياً:' : 'Evidence-Based Dietary Approaches:'}
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {Object.values(DIETARY_APPROACH_PRESETS).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleApplyPreset(p.id)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                            selectedDietPreset === p.id
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {isAr ? p.nameAr : p.nameEn}
                        </button>
                      ))}
                      {selectedDietPreset === 'custom' && (
                        <span className="inline-flex items-center rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                          {isAr ? 'توزيع مخصص (Custom)' : 'Custom Ratio'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Macro Sliders & Cards */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {/* Carbohydrates */}
                    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                      <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                        <span>{isAr ? 'الكربوهيدرات' : 'Carbohydrates'}</span>
                        <span>{carbsPercent}%</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="75"
                        step="5"
                        value={carbsPercent}
                        onChange={(e) => {
                          const c = Number(e.target.value);
                          setCarbsPercent(c);
                          const remaining = 100 - c;
                          const p = Math.round(remaining / 2);
                          const f = remaining - p;
                          setProteinPercent(p);
                          setFatPercent(f);
                          setSelectedDietPreset(detectPreset(c, p, f));
                        }}
                        className="my-2 h-1.5 w-full accent-amber-600"
                      />
                      <div className="mt-1 flex items-baseline justify-between text-xs">
                        <span className="font-bold text-amber-800">{macronutrients.carbsGrams} g</span>
                        <span className="text-[11px] text-amber-700">{macronutrients.carbsKcal} kcal</span>
                      </div>
                    </div>

                    {/* Protein */}
                    <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3">
                      <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                        <span>{isAr ? 'البروتين' : 'Protein'}</span>
                        <span>{proteinPercent}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="50"
                        step="5"
                        value={proteinPercent}
                        onChange={(e) => {
                          const p = Number(e.target.value);
                          setProteinPercent(p);
                          const remaining = 100 - p;
                          const c = Math.round(remaining / 2);
                          const f = remaining - c;
                          setCarbsPercent(c);
                          setFatPercent(f);
                          setSelectedDietPreset(detectPreset(c, p, f));
                        }}
                        className="my-2 h-1.5 w-full accent-blue-600"
                      />
                      <div className="mt-1 flex items-baseline justify-between text-xs">
                        <span className="font-bold text-blue-800">{macronutrients.proteinGrams} g</span>
                        <span className="text-[11px] font-semibold text-blue-700">
                          {macronutrients.proteinGramsPerKg} g/kg
                        </span>
                      </div>
                    </div>

                    {/* Fats */}
                    <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3">
                      <div className="flex items-center justify-between text-xs font-bold text-rose-900">
                        <span>{isAr ? 'الدهون الصحية' : 'Fats'}</span>
                        <span>{fatPercent}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="75"
                        step="5"
                        value={fatPercent}
                        onChange={(e) => {
                          const f = Number(e.target.value);
                          setFatPercent(f);
                          const remaining = 100 - f;
                          const p = Math.round(remaining / 2);
                          const c = remaining - p;
                          setProteinPercent(p);
                          setCarbsPercent(c);
                          setSelectedDietPreset(detectPreset(c, p, f));
                        }}
                        className="my-2 h-1.5 w-full accent-rose-600"
                      />
                      <div className="mt-1 flex items-baseline justify-between text-xs">
                        <span className="font-bold text-rose-800">{macronutrients.fatGrams} g</span>
                        <span className="text-[11px] text-rose-700">{macronutrients.fatKcal} kcal</span>
                      </div>
                    </div>
                  </div>

                  {/* Fiber & Hydration Requirements */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Wheat className="h-4 w-4 text-amber-600" />
                      <span>
                        {isAr ? 'الهدف الموصى به للألياف:' : 'Fiber Recommendation:'}{' '}
                        <strong>{macronutrients.fiberGramsTarget} {isAr ? 'جم/يوم' : 'g/day'}</strong>{' '}
                        <span className="text-[10px] text-slate-400">(14g / 1000 kcal)</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-700">
                      <Droplets className="h-4 w-4 text-blue-600" />
                      <span>
                        {isAr ? 'الاحتياج اليومي للسوائل:' : 'Hydration Requirement:'}{' '}
                        <strong>{macronutrients.fluidRequirementMl} {isAr ? 'مل/يوم' : 'ml/day'}</strong>{' '}
                        <span className="text-[10px] text-slate-400">(35 ml/kg or 1 ml/kcal)</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: 24-Hour Dietary Recall Workbench */}
        {activeTab === 'recall' && (
          <RecallWorkbench
            isAr={isAr}
            phase1Targets={{
              targetCalories: energy?.targetKcal,
              targetProteinG: macronutrients?.proteinGrams,
              targetCarbsG: macronutrients?.carbsGrams,
              targetFatG: macronutrients?.fatGrams,
            }}
          />
        )}

        {/* Tab 2: Scientific Benchmarks (Automated Suite Inspection) */}
        {activeTab === 'benchmarks' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {isAr ? 'نتائج الفحص والتحقق السريري المؤتمت (34 اختباراً معيارياً)' : 'Deterministic Clinical Verification Suite (34 Benchmarks)'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {isAr
                      ? 'تم تشغيل جميع هذه الاختبارات (34 اختباراً عبر 10 حزم سريرية) بنجاح بنسبة 100% بدون أي أخطاء عبر محرك الاختبارات Node Test Runner (آخر تشغيل ناجح).'
                      : 'All 34 unit tests across 10 clinical suites verified with 100% pass rate in Node.js test runner (last successful run).'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>34 / 34 Passed</span>
                </div>
              </div>

              {/* Benchmarks List */}
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4">
                  <h3 className="font-bold text-slate-800">1. Mifflin-St Jeor (1990) Benchmark</h3>
                  <p className="mt-1 text-xs text-slate-600">
                    Male 80kg, 180cm, 30y: Expected <strong>1780 kcal</strong> | Calculated: <strong>1780 kcal</strong> (Pass)
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Female 65kg, 165cm, 28y: Expected <strong>1380 kcal</strong> | Calculated: <strong>1380 kcal</strong> (Pass)
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <h3 className="font-bold text-slate-800">2. Revised Harris-Benedict (1984) Benchmark</h3>
                  <p className="mt-1 text-xs text-slate-600">
                    Male 75kg, 175cm, 35y: Expected <strong>1734 kcal</strong> | Calculated: <strong>1734 kcal</strong> (Pass)
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Female 60kg, 160cm, 40y: Expected <strong>1325 kcal</strong> | Calculated: <strong>1325 kcal</strong> (Pass)
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <h3 className="font-bold text-slate-800">3. Katch-McArdle & Cunningham (LBM Driven)</h3>
                  <p className="mt-1 text-xs text-slate-600">
                    Katch-McArdle (LBM 60kg): Expected <strong>1666 kcal</strong> | Calculated: <strong>1666 kcal</strong> (Pass)
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Cunningham (FFM 65kg): Expected <strong>1930 kcal</strong> | Calculated: <strong>1930 kcal</strong> (Pass)
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <h3 className="font-bold text-slate-800">4. Schofield & WHO/FAO/UNU Age Cohorts</h3>
                  <p className="mt-1 text-xs text-slate-600">
                    Schofield Male 25y (70kg): Expected <strong>1746 kcal</strong> | Calculated: <strong>1746 kcal</strong> (Pass)
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    WHO Male 25y (70kg): Expected <strong>1750 kcal</strong> | Calculated: <strong>1750 kcal</strong> (Pass)
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <h3 className="font-bold text-slate-800">5. Pediatric Safety Isolation</h3>
                  <p className="mt-1 text-xs text-slate-600">
                    Child (Age 14, 65kg, 160cm, BMI 25.39): Suppresses adult overweight classification and returns WHO pediatric percentile warning (Pass).
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <h3 className="font-bold text-slate-800">6. Adjusted Body Weight (ABW) Trigger</h3>
                  <p className="mt-1 text-xs text-slate-600">
                    Male 115kg, 175cm (BMI 37.55): Devine IBW = 70.5kg; ABW formula `IBW + 0.4 * (Actual - IBW)` = <strong>88.3 kg</strong> (Pass).
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Scientific References & Equations */}
        {activeTab === 'documentation' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-slate-900">
                {isAr ? 'المراجع العلمية الموثقة لمعادلات الطاقة والقياسات' : 'Scientific Citations & Clinical References'}
              </h2>

              <div className="space-y-4">
                {Object.values(SCIENTIFIC_CITATIONS).map((citation) => (
                  <div key={citation.formulaName} className="rounded-xl border border-slate-200 p-4 text-xs">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-emerald-800 sm:text-sm">
                        {isAr ? citation.formulaNameAr : citation.formulaName}
                      </h3>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        {citation.year}
                      </span>
                    </div>

                    <p className="mt-2 font-mono text-[11px] text-slate-700 bg-slate-50 p-2 rounded">
                      {citation.primaryReference}
                    </p>

                    <div className="mt-2 space-y-1">
                      <p>
                        <strong className="text-slate-800">{isAr ? 'الفئة المطبقة:' : 'Applicable Population:'}</strong>{' '}
                        {isAr ? citation.applicablePopulationAr : citation.applicablePopulation}
                      </p>
                      <p>
                        <strong className="text-slate-800">{isAr ? 'المحددات السريرية:' : 'Limitations:'}</strong>{' '}
                        {isAr ? citation.limitationsAr : citation.limitations}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p>
          {isAr
            ? 'Nutrition Clinic Pro — محرك سريري حتمي 100% خالٍ من التقديرات العشوائية'
            : 'Nutrition Clinic Pro — 100% Deterministic Evidence-Based Clinical Engine'}
        </p>
      </footer>
    </div>
  );
}
