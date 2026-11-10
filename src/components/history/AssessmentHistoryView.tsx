/**
 * Nutrition Clinic Pro - Patient Assessment History & Progress Trends View
 * Clinical-grade visualization of weight, BMI, and caloric requirement trajectories over time.
 */

import React, { useState, useMemo } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Filter,
  Flame,
  History,
  Info,
  Layers,
  LineChart,
  Plus,
  RefreshCw,
  RotateCcw,
  Scale,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
  User,
  X,
} from 'lucide-react';

import {
  PatientAssessmentRecord,
  getSavedAssessments,
  deleteAssessment,
  clearAllAssessments,
  exportAssessmentsJson,
  importAssessmentsJson,
  seedDemoProgressData,
  calculateProgressTrends,
  getDistinctPatients,
} from '../../clinical/history/index';

interface AssessmentHistoryViewProps {
  isAr: boolean;
  onLoadAssessment: (record: PatientAssessmentRecord) => void;
  onNavigateToCalculator: () => void;
  refreshTrigger?: number;
}

export function AssessmentHistoryView({
  isAr,
  onLoadAssessment,
  onNavigateToCalculator,
  refreshTrigger,
}: AssessmentHistoryViewProps) {
  // Re-read records whenever refreshTrigger changes or local operations occur
  const [internalVersion, setInternalVersion] = useState(0);
  const records = useMemo(() => {
    return getSavedAssessments();
  }, [refreshTrigger, internalVersion]);

  // Selected Patient filter ('all' or specific patient name)
  const [selectedPatient, setSelectedPatient] = useState<string>('all');
  const patientsList = useMemo(() => getDistinctPatients(records), [records]);

  // Selected metric tab for the trend chart
  const [activeMetric, setActiveMetric] = useState<'weight' | 'bmi' | 'calories'>('weight');

  // Selected record for full modal inspection
  const [inspectRecord, setInspectRecord] = useState<PatientAssessmentRecord | null>(null);

  // Status message for import/export
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Compute trends and summary statistics
  const { points, stats } = useMemo(() => {
    return calculateProgressTrends(records, selectedPatient);
  }, [records, selectedPatient]);

  const handleSeedDemo = () => {
    seedDemoProgressData(isAr ? 'أحمد منصور (مريض متابعة)' : 'Ahmed Mansour (Follow-up)');
    setInternalVersion((v) => v + 1);
    setStatusMessage({
      text: isAr ? 'تم تحميل سجل متابعة تجريبي لمدة 12 أسبوعاً بنجاح' : 'Demo 12-week progression loaded successfully',
      type: 'success',
    });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleDelete = (id: string, name: string) => {
    const confirmText = isAr
      ? `هل أنت متأكد من حذف فحص ${name}؟`
      : `Are you sure you want to delete the assessment for ${name}?`;
    if (window.confirm(confirmText)) {
      deleteAssessment(id);
      setInternalVersion((v) => v + 1);
      if (inspectRecord?.id === id) setInspectRecord(null);
    }
  };

  const handleClearAll = () => {
    const confirmText = isAr
      ? 'تحذير: هل أنت متأكد من مسح جميع سجلات الفحص المحفوظة؟'
      : 'Warning: Are you sure you want to clear all saved assessments?';
    if (window.confirm(confirmText)) {
      clearAllAssessments();
      setInternalVersion((v) => v + 1);
      setInspectRecord(null);
    }
  };

  const handleExport = () => {
    const jsonStr = exportAssessmentsJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nutrition-clinic-pro-history-${new Date().toISOString().substring(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage({
      text: isAr ? 'تم تصدير ملف السجلات بنجاح' : 'Assessment history exported successfully',
      type: 'success',
    });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importAssessmentsJson(content);
      if (res.importedCount > 0) {
        setInternalVersion((v) => v + 1);
        setStatusMessage({
          text: isAr
            ? `تم استيراد ${res.importedCount} سجل بنجاح`
            : `Successfully imported ${res.importedCount} records`,
          type: 'success',
        });
      } else {
        setStatusMessage({
          text: res.errors.join(', ') || (isAr ? 'فشل استيراد الملف' : 'Import failed'),
          type: 'error',
        });
      }
      setTimeout(() => setStatusMessage(null), 4000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // SVG Chart Geometry calculations
  const chartData = useMemo(() => {
    if (points.length < 2) return null;

    const width = 800;
    const height = 280;
    const padding = { top: 25, right: 35, bottom: 45, left: 55 };

    const innerW = width - padding.left - padding.right;
    const innerH = height - padding.top - padding.bottom;

    let values: number[] = [];
    if (activeMetric === 'weight') {
      values = points.map((p) => p.weightKg);
    } else if (activeMetric === 'bmi') {
      values = points.map((p) => p.bmi);
    } else {
      values = points.map((p) => p.targetKcal);
    }

    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const valRange = maxVal - minVal || 1;
    // Add 10% breathing room to min and max
    const yMin = Math.max(0, Math.floor(minVal - valRange * 0.15));
    const yMax = Math.ceil(maxVal + valRange * 0.15);
    const ySpan = yMax - yMin || 1;

    const coords = points.map((pt, i) => {
      const x = padding.left + (i / (points.length - 1)) * innerW;
      const val = activeMetric === 'weight' ? pt.weightKg : activeMetric === 'bmi' ? pt.bmi : pt.targetKcal;
      const y = padding.top + innerH - ((val - yMin) / ySpan) * innerH;
      return { x, y, val, point: pt };
    });

    // Generate smooth or polyline path
    const pathD = coords.reduce((acc, c, i) => {
      return i === 0 ? `M ${c.x} ${c.y}` : `${acc} L ${c.x} ${c.y}`;
    }, '');

    // Area fill path closing at bottom
    const areaD = `${pathD} L ${coords[coords.length - 1].x} ${padding.top + innerH} L ${coords[0].x} ${padding.top + innerH} Z`;

    // Horizontal grid ticks (4 ticks)
    const yTicks = [0, 0.33, 0.66, 1].map((pct) => {
      const val = Math.round(yMin + pct * ySpan);
      const y = padding.top + innerH - pct * innerH;
      return { val, y };
    });

    // Healthy BMI reference line if viewing BMI
    let healthyBmiZone: { yUpper: number; yLower: number } | null = null;
    if (activeMetric === 'bmi') {
      const yUpper = padding.top + innerH - ((24.9 - yMin) / ySpan) * innerH;
      const yLower = padding.top + innerH - ((18.5 - yMin) / ySpan) * innerH;
      healthyBmiZone = { yUpper, yLower };
    }

    return {
      width,
      height,
      padding,
      innerW,
      innerH,
      coords,
      pathD,
      areaD,
      yTicks,
      yMin,
      yMax,
      healthyBmiZone,
    };
  }, [points, activeMetric]);

  return (
    <div className="space-y-6">
      {/* View Header & Action Bar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-200">
            <History className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
                {isAr ? 'سجل متابعة المرضى وتطور القياسات' : 'Patient Progress & Assessment History'}
              </h2>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                {records.length} {isAr ? 'فحص محفوظ' : 'Records'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {isAr
                ? 'تتبع التغير الزمني في الوزن، مؤشر كتلة الجسم (BMI)، والاحتياجات اليومية من السعرات الحرارية عبر التخزين المحلي (LocalStorage)'
                : 'Track trajectories in weight, BMI, and caloric requirements over time using secure browser LocalStorage'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Patient Selector Filter */}
          {patientsList.length > 1 && (
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700">
              <Filter className="h-3.5 w-3.5 text-slate-500" />
              <select
                value={selectedPatient}
                onChange={(e) => setSelectedPatient(e.target.value)}
                className="bg-transparent font-medium outline-none"
              >
                <option value="all">{isAr ? 'جميع المرضى' : 'All Patients'}</option>
                {patientsList.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* New Assessment in Calculator */}
          <button
            type="button"
            onClick={onNavigateToCalculator}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{isAr ? 'فحص جديد' : 'New Assessment'}</span>
          </button>

          {/* Seed Demo Progression */}
          <button
            type="button"
            onClick={handleSeedDemo}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-700 transition"
            title={isAr ? 'تحميل بيانات تجريبية 12 أسبوعاً' : 'Load 12-week sample follow-up data'}
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>{isAr ? 'نموذج 12 أسبوعاً' : 'Sample Demo'}</span>
          </button>

          {/* Export JSON */}
          <button
            type="button"
            onClick={handleExport}
            disabled={records.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
            title={isAr ? 'تصدير السجلات بصيغة JSON' : 'Export JSON file'}
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>{isAr ? 'تصدير' : 'Export'}</span>
          </button>

          {/* Import JSON */}
          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition">
            <Upload className="h-3.5 w-3.5 text-slate-500" />
            <span>{isAr ? 'استيراد' : 'Import'}</span>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>

          {/* Clear all */}
          {records.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 transition"
              title={isAr ? 'مسح كل السجلات' : 'Clear all'}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div
          className={`rounded-xl border p-3 text-xs font-medium transition ${
            statusMessage.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Main Content: If no records, show instructive empty state */}
      {records.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 px-6 text-center shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-4 shadow-inner">
            <LineChart className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800 sm:text-lg">
            {isAr ? 'لا توجد فحوصات سريرية محفوظة بعد' : 'No Patient Assessments Saved Yet'}
          </h3>
          <p className="mt-1.5 max-w-md text-xs text-slate-500">
            {isAr
              ? 'يمكنك إجراء فحص سريري في حاسبة العيادة والضغط على "حفظ التقييم في سجل المتابعة"، أو تحميل نموذج تجريبي جاهز لمشاهدة منحنى التطور الإكلينيكي فوراً.'
              : 'Run an assessment in the Clinical Calculator and click "Save Assessment to History", or load a 12-week sample patient progression to see trend visualizations in action.'}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleSeedDemo}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-200 hover:bg-emerald-700 transition"
            >
              <Sparkles className="h-4 w-4" />
              <span>{isAr ? 'تحميل نموذج متابعة 12 أسبوعاً (أحمد منصور)' : 'Load 12-Week Sample (Ahmed Mansour)'}</span>
            </button>
            <button
              type="button"
              onClick={onNavigateToCalculator}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <span>{isAr ? 'الذهاب إلى الحاسبة السريرية' : 'Go to Clinical Calculator'}</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Top KPI Cards: Delta Analytics */}
          {stats && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* 1. Weight Progress Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    {isAr ? 'تطور وزن الجسم' : 'Body Weight'}
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                    <Scale className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-slate-900">
                    {stats.latestWeightKg}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">{isAr ? 'كجم' : 'kg'}</span>
                  {stats.weightDeltaKg !== 0 && (
                    <span
                      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold ${
                        stats.weightDeltaKg < 0
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {stats.weightDeltaKg < 0 ? (
                        <ArrowDownRight className="h-3 w-3" />
                      ) : (
                        <ArrowUpRight className="h-3 w-3" />
                      )}
                      {stats.weightDeltaKg > 0 ? `+${stats.weightDeltaKg}` : stats.weightDeltaKg} {isAr ? 'كجم' : 'kg'}
                    </span>
                  )}
                </div>
                <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-500">
                  <span>
                    {isAr ? 'البداية:' : 'Initial:'} {stats.initialWeightKg} {isAr ? 'كجم' : 'kg'}
                  </span>
                  <span>
                    {stats.weightChangePercent > 0 ? `+${stats.weightChangePercent}` : stats.weightChangePercent}%
                  </span>
                </div>
                {stats.averageWeeklyWeightDeltaKg !== undefined && (
                  <p className="mt-1 text-[11px] text-slate-400">
                    {isAr ? 'المعدل الأسبوعي:' : 'Pace:'}{' '}
                    <span className="font-semibold text-slate-600">
                      {stats.averageWeeklyWeightDeltaKg > 0
                        ? `+${stats.averageWeeklyWeightDeltaKg}`
                        : stats.averageWeeklyWeightDeltaKg}{' '}
                      {isAr ? 'كجم/أسبوع' : 'kg/wk'}
                    </span>
                  </p>
                )}
              </div>

              {/* 2. BMI Progress Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    {isAr ? 'مؤشر كتلة الجسم (BMI)' : 'BMI Trajectory'}
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                    <Activity className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-slate-900">
                    {stats.latestBmi}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">{isAr ? 'كجم/م²' : 'kg/m²'}</span>
                  {stats.bmiDelta !== 0 && (
                    <span
                      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold ${
                        stats.bmiDelta < 0
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {stats.bmiDelta > 0 ? `+${stats.bmiDelta}` : stats.bmiDelta}
                    </span>
                  )}
                </div>
                <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-500">
                  <span>
                    {isAr ? 'البداية:' : 'Initial:'} {stats.initialBmi}
                  </span>
                  <span className="font-medium text-emerald-700">
                    {isAr ? 'المدى الطبيعي 18.5 - 24.9' : 'Normal: 18.5 - 24.9'}
                  </span>
                </div>
              </div>

              {/* 3. Caloric Requirements Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    {isAr ? 'الاحتياج الحراري المستهدف' : 'Prescribed Target'}
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                    <Flame className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-slate-900">
                    {stats.latestTargetKcal}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">{isAr ? 'سعرة' : 'kcal'}</span>
                  {stats.caloricDeltaKcal !== 0 && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                      {stats.caloricDeltaKcal > 0 ? `+${stats.caloricDeltaKcal}` : stats.caloricDeltaKcal} {isAr ? 'سعرة' : 'kcal'}
                    </span>
                  )}
                </div>
                <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-500">
                  <span>
                    {isAr ? 'البداية:' : 'Initial:'} {stats.initialTargetKcal} {isAr ? 'سعرة' : 'kcal'}
                  </span>
                  <span className="text-slate-600">
                    {isAr ? 'TDEE الحالي:' : 'Current TDEE:'} {points[points.length - 1].tdeeKcal}
                  </span>
                </div>
              </div>

              {/* 4. Follow-up Timeline Summary */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    {isAr ? 'فترة المتابعة السريرية' : 'Clinical Timeframe'}
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-700">
                    <Calendar className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-slate-900">
                    {stats.totalDays}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">{isAr ? 'يوماً' : 'days'}</span>
                  <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-800">
                    {stats.recordsCount} {isAr ? 'زيارات' : 'visits'}
                  </span>
                </div>
                <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-500">
                  <span>{stats.firstDate}</span>
                  <span>←</span>
                  <span>{stats.latestDate}</span>
                </div>
              </div>
            </div>
          )}

          {/* Progress Trends Chart Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <LineChart className="h-5 w-5 text-emerald-600" />
                <h3 className="font-bold text-slate-800">
                  {isAr ? 'منحنى التطور الزمني السريري' : 'Progress Trajectory Trendlines'}
                </h3>
              </div>

              {/* Metric Switcher Tabs */}
              <div className="flex rounded-lg bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setActiveMetric('weight')}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                    activeMetric === 'weight'
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isAr ? 'الوزن (كجم)' : 'Weight (kg)'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMetric('bmi')}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                    activeMetric === 'bmi'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isAr ? 'مؤشر الكتلة (BMI)' : 'BMI (kg/m²)'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMetric('calories')}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                    activeMetric === 'calories'
                      ? 'bg-white text-amber-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isAr ? 'السعرات المستهدفة (سعرة)' : 'Target Calories (kcal)'}
                </button>
              </div>
            </div>

            {/* SVG Visual Graph */}
            {chartData ? (
              <div className="relative w-full overflow-x-auto">
                <svg
                  viewBox={`0 0 ${chartData.width} ${chartData.height}`}
                  className="w-full min-w-[500px] h-auto select-none"
                >
                  <defs>
                    <linearGradient id="metricGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={
                          activeMetric === 'weight'
                            ? '#10b981'
                            : activeMetric === 'bmi'
                            ? '#3b82f6'
                            : '#f59e0b'
                        }
                        stopOpacity="0.25"
                      />
                      <stop
                        offset="100%"
                        stopColor={
                          activeMetric === 'weight'
                            ? '#10b981'
                            : activeMetric === 'bmi'
                            ? '#3b82f6'
                            : '#f59e0b'
                        }
                        stopOpacity="0.0"
                      />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines and Y-axis labels */}
                  {chartData.yTicks.map((t, idx) => (
                    <g key={idx}>
                      <line
                        x1={chartData.padding.left}
                        y1={t.y}
                        x2={chartData.width - chartData.padding.right}
                        y2={t.y}
                        stroke="#e2e8f0"
                        strokeDasharray="4 4"
                      />
                      <text
                        x={chartData.padding.left - 10}
                        y={t.y + 4}
                        textAnchor="end"
                        fontSize="11"
                        fill="#64748b"
                        fontFamily="sans-serif"
                      >
                        {t.val}
                      </text>
                    </g>
                  ))}

                  {/* Healthy BMI benchmark zone */}
                  {chartData.healthyBmiZone && (
                    <g>
                      <rect
                        x={chartData.padding.left}
                        y={chartData.healthyBmiZone.yUpper}
                        width={chartData.innerW}
                        height={Math.max(0, chartData.healthyBmiZone.yLower - chartData.healthyBmiZone.yUpper)}
                        fill="#ecfdf5"
                        opacity="0.8"
                      />
                      <line
                        x1={chartData.padding.left}
                        y1={chartData.healthyBmiZone.yUpper}
                        x2={chartData.width - chartData.padding.right}
                        y2={chartData.healthyBmiZone.yUpper}
                        stroke="#10b981"
                        strokeWidth="1"
                        strokeDasharray="3 3"
                      />
                      <text
                        x={chartData.width - chartData.padding.right - 8}
                        y={chartData.healthyBmiZone.yUpper - 4}
                        textAnchor="end"
                        fontSize="10"
                        fill="#059669"
                        fontWeight="600"
                      >
                        {isAr ? 'الحد الأعلى للطبيعي (24.9)' : 'Normal BMI Upper (24.9)'}
                      </text>
                    </g>
                  )}

                  {/* Area fill */}
                  <path d={chartData.areaD} fill="url(#metricGradient)" />

                  {/* Main stroke line */}
                  <path
                    d={chartData.pathD}
                    fill="none"
                    stroke={
                      activeMetric === 'weight'
                        ? '#059669'
                        : activeMetric === 'bmi'
                        ? '#2563eb'
                        : '#d97706'
                    }
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Data Points */}
                  {chartData.coords.map((c, idx) => (
                    <g key={idx} className="cursor-pointer group">
                      <circle
                        cx={c.x}
                        cy={c.y}
                        r="5.5"
                        fill="#ffffff"
                        stroke={
                          activeMetric === 'weight'
                            ? '#059669'
                            : activeMetric === 'bmi'
                            ? '#2563eb'
                            : '#d97706'
                        }
                        strokeWidth="2.5"
                        className="transition hover:r-7"
                      />
                      {/* Value label on top of point */}
                      <text
                        x={c.x}
                        y={c.y - 10}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="bold"
                        fill="#1e293b"
                      >
                        {c.val}
                      </text>

                      {/* Date label under X axis */}
                      <text
                        x={c.x}
                        y={chartData.height - 15}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#64748b"
                      >
                        {c.point.dateLabel}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                {isAr
                  ? 'يتطلب رسم المنحنى البياني فحصين على الأقل لنفس المريض لعرض التغير الزمني.'
                  : 'At least two assessments are needed to generate visual progress trajectory trends.'}
              </div>
            )}
          </div>

          {/* Chronological Visits Table & Action List */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-emerald-600" />
                  <h4 className="font-bold text-slate-800 text-sm">
                    {isAr ? 'سجل الفحوصات والزيارات السريرية' : 'Saved Assessment Visits Log'}
                  </h4>
                </div>
                <span className="text-xs text-slate-500">
                  {points.length} {isAr ? 'زيارة مسجلة' : 'Recorded Visits'}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs rtl:text-right">
                <thead className="border-b border-slate-200 bg-slate-50/50 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">{isAr ? 'تاريخ الزيارة' : 'Date'}</th>
                    <th className="py-3 px-4">{isAr ? 'المريض / الملف' : 'Patient / MRN'}</th>
                    <th className="py-3 px-4">{isAr ? 'الوزن (كجم)' : 'Weight'}</th>
                    <th className="py-3 px-4">{isAr ? 'مؤشر الكتلة (BMI)' : 'BMI'}</th>
                    <th className="py-3 px-4">{isAr ? 'الاحتياج الحراري' : 'Target Kcal'}</th>
                    <th className="py-3 px-4">{isAr ? 'المعادلة ونسبة الماكروز' : 'Equation & Macros'}</th>
                    <th className="py-3 px-4">{isAr ? 'ملاحظات' : 'Notes'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {points.map((pt, idx) => {
                    const fullRecord = records.find((r) => r.id === pt.id)!;
                    const prevPt = idx > 0 ? points[idx - 1] : null;
                    const wDelta = prevPt ? Math.round((pt.weightKg - prevPt.weightKg) * 10) / 10 : 0;

                    return (
                      <tr key={pt.id} className="hover:bg-slate-50/80 transition">
                        {/* Visit Date */}
                        <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                          {pt.visitDate}
                        </td>

                        {/* Patient Name & MRN */}
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-800">{pt.patientName}</div>
                          {fullRecord.patientIdOrMrn && (
                            <div className="text-[11px] text-slate-400">{fullRecord.patientIdOrMrn}</div>
                          )}
                        </td>

                        {/* Weight & Delta */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-bold text-slate-900">{pt.weightKg}</span>{' '}
                          <span className="text-[11px] text-slate-500">{isAr ? 'كجم' : 'kg'}</span>
                          {wDelta !== 0 && (
                            <span
                              className={`ms-1.5 inline-block text-[11px] font-bold ${
                                wDelta < 0 ? 'text-emerald-600' : 'text-amber-600'
                              }`}
                            >
                              ({wDelta > 0 ? `+${wDelta}` : wDelta})
                            </span>
                          )}
                        </td>

                        {/* BMI & Category */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900">{pt.bmi}</span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                pt.bmi < 18.5
                                  ? 'bg-amber-100 text-amber-800'
                                  : pt.bmi <= 24.9
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : pt.bmi <= 29.9
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {isAr
                                ? fullRecord.anthropometrics.bmiCategoryAr
                                : fullRecord.anthropometrics.bmiCategoryEn}
                            </span>
                          </div>
                        </td>

                        {/* Target Calories */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-bold text-emerald-700">{pt.targetKcal}</span>{' '}
                          <span className="text-[11px] text-slate-500">{isAr ? 'سعرة' : 'kcal'}</span>
                          <div className="text-[10px] text-slate-400">
                            {isAr ? 'TDEE:' : 'TDEE:'} {pt.tdeeKcal}
                          </div>
                        </td>

                        {/* Equation & Macro Split */}
                        <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                          <div className="font-medium text-slate-700 capitalize">
                            {fullRecord.energy.equationUsed.replace(/_/g, ' ')}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            C:{fullRecord.inputs.carbsPercent}% P:{fullRecord.inputs.proteinPercent}% F:{fullRecord.inputs.fatPercent}%
                          </div>
                        </td>

                        {/* Notes */}
                        <td className="py-3.5 px-4 max-w-xs truncate text-[11px] text-slate-500" title={fullRecord.notes}>
                          {fullRecord.notes || '—'}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Load into Calculator */}
                            <button
                              type="button"
                              onClick={() => onLoadAssessment(fullRecord)}
                              className="flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
                              title={isAr ? 'تحميل هذه البيانات في الحاسبة السريرية' : 'Load into Clinical Calculator'}
                            >
                              <RotateCcw className="h-3 w-3" />
                              <span>{isAr ? 'تحميل' : 'Load'}</span>
                            </button>

                            {/* View Full Card */}
                            <button
                              type="button"
                              onClick={() => setInspectRecord(fullRecord)}
                              className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
                              title={isAr ? 'عرض التفاصيل الكاملة' : 'View Full Details'}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>

                            {/* Delete Record */}
                            <button
                              type="button"
                              onClick={() => handleDelete(fullRecord.id, fullRecord.patientName)}
                              className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                              title={isAr ? 'حذف الزيارة' : 'Delete Visit'}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Detail Inspection Modal */}
      {inspectRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  {isAr ? 'تقرير الفحص السريري الكامل' : 'Clinical Assessment Snapshot'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectRecord(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs text-slate-700">
              {/* Patient & Date Meta */}
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3">
                <div>
                  <span className="text-slate-400 block">{isAr ? 'اسم المريض:' : 'Patient Name:'}</span>
                  <span className="font-bold text-slate-800 text-sm">{inspectRecord.patientName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">{isAr ? 'تاريخ الفحص:' : 'Visit Date:'}</span>
                  <span className="font-semibold text-slate-800">{inspectRecord.visitDate}</span>
                </div>
              </div>

              {/* Anthropometrics Grid */}
              <div className="rounded-xl border border-slate-200 p-3.5">
                <h4 className="font-bold text-slate-900 mb-2 border-b border-slate-100 pb-1">
                  {isAr ? 'القياسات والتركيب الجسدي' : 'Anthropometrics & Body Composition'}
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-400 block">{isAr ? 'الوزن الحالي:' : 'Actual Weight:'}</span>
                    <span className="font-bold text-slate-900 text-sm">{inspectRecord.inputs.weightKg} kg</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">{isAr ? 'الطول:' : 'Height:'}</span>
                    <span className="font-bold text-slate-900 text-sm">{inspectRecord.inputs.heightCm} cm</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">BMI:</span>
                    <span className="font-bold text-emerald-700 text-sm">
                      {inspectRecord.anthropometrics.bmi} ({isAr ? inspectRecord.anthropometrics.bmiCategoryAr : inspectRecord.anthropometrics.bmiCategoryEn})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">{isAr ? 'الوزن المثالي (Devine):' : 'IBW (Devine):'}</span>
                    <span className="font-semibold">{inspectRecord.anthropometrics.ibwDevineKg || '—'} kg</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">{isAr ? 'الوزن المعدل (ABW):' : 'ABW:'}</span>
                    <span className="font-semibold">{inspectRecord.anthropometrics.abwKg || '—'} kg</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">{isAr ? 'نسبة الدهون:' : 'Body Fat %:'}</span>
                    <span className="font-semibold">{inspectRecord.inputs.bodyFatPercent ? `${inspectRecord.inputs.bodyFatPercent}%` : '—'}</span>
                  </div>
                </div>
              </div>

              {/* Energy & Macros Grid */}
              <div className="rounded-xl border border-slate-200 p-3.5">
                <h4 className="font-bold text-slate-900 mb-2 border-b border-slate-100 pb-1">
                  {isAr ? 'الاحتياجات الطاقية وتوزيع المغذيات' : 'Energy & Macronutrient Distribution'}
                </h4>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <span className="text-slate-400 block">{isAr ? 'معدل الأيض الأساسي (BMR):' : 'BMR / REE:'}</span>
                    <span className="font-bold text-slate-900">{inspectRecord.energy.bmrKcal} kcal</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">{isAr ? 'إجمالي الحرق اليومي (TDEE):' : 'TDEE:'}</span>
                    <span className="font-bold text-slate-900">{inspectRecord.energy.tdeeKcal} kcal</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">{isAr ? 'السعرات المستهدفة:' : 'Prescribed Target:'}</span>
                    <span className="font-bold text-emerald-700 text-sm">{inspectRecord.energy.targetKcal} kcal</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg text-center font-medium">
                  <div>
                    <span className="text-slate-500 block text-[11px]">{isAr ? 'كربوهيدرات' : 'Carbs'}</span>
                    <span className="font-bold text-slate-800">{inspectRecord.macronutrients.carbsGrams}g ({inspectRecord.inputs.carbsPercent}%)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">{isAr ? 'بروتين' : 'Protein'}</span>
                    <span className="font-bold text-slate-800">{inspectRecord.macronutrients.proteinGrams}g ({inspectRecord.inputs.proteinPercent}%)</span>
                    <span className="text-[10px] text-slate-400 block">{inspectRecord.macronutrients.proteinPerKgActual} g/kg</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">{isAr ? 'دهون' : 'Fat'}</span>
                    <span className="font-bold text-slate-800">{inspectRecord.macronutrients.fatGrams}g ({inspectRecord.inputs.fatPercent}%)</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {inspectRecord.notes && (
                <div className="rounded-xl bg-amber-50/70 border border-amber-200/60 p-3">
                  <span className="font-semibold text-amber-900 block mb-1">{isAr ? 'ملاحظات وتوصيات الزيارة:' : 'Clinical Notes:'}</span>
                  <p className="text-amber-800 text-[11px] leading-relaxed">{inspectRecord.notes}</p>
                </div>
              )}

              {/* Action Buttons in Modal */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    onLoadAssessment(inspectRecord);
                    setInspectRecord(null);
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>{isAr ? 'تحميل هذه البيانات في الحاسبة' : 'Load into Calculator'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInspectRecord(null)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  {isAr ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
