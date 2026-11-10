/**
 * Nutrition Clinic Pro - Progress Trend & Analytics Calculations
 * Pure deterministic calculations for weight, BMI, and caloric changes over time.
 */

import { PatientAssessmentRecord, ProgressTrendPoint, TrendStatistics } from './types';

/**
 * Sorts assessment records chronologically (oldest to newest).
 */
export function sortAssessmentsChronologically(
  records: PatientAssessmentRecord[]
): PatientAssessmentRecord[] {
  return [...records].sort((a, b) => {
    const timeA = new Date(a.visitDate || a.timestamp).getTime();
    const timeB = new Date(b.visitDate || b.timestamp).getTime();
    return timeA - timeB;
  });
}

/**
 * Extracts distinct patient names from saved records.
 */
export function getDistinctPatients(records: PatientAssessmentRecord[]): string[] {
  const names = new Set<string>();
  for (const r of records) {
    if (r.patientName && r.patientName.trim()) {
      names.add(r.patientName.trim());
    }
  }
  return Array.from(names);
}

/**
 * Computes chronological progress points and aggregate delta statistics.
 */
export function calculateProgressTrends(
  records: PatientAssessmentRecord[],
  selectedPatient?: string
): {
  points: ProgressTrendPoint[];
  stats: TrendStatistics | null;
} {
  let filtered = records;
  if (selectedPatient && selectedPatient.trim() && selectedPatient !== 'all') {
    const target = selectedPatient.trim().toLowerCase();
    filtered = records.filter(
      (r) => r.patientName.trim().toLowerCase() === target
    );
  }

  if (filtered.length === 0) {
    return { points: [], stats: null };
  }

  const sorted = sortAssessmentsChronologically(filtered);

  const points: ProgressTrendPoint[] = sorted.map((r) => {
    const d = new Date(r.visitDate || r.timestamp);
    const dateLabel = !isNaN(d.getTime())
      ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
      : r.visitDate;

    return {
      id: r.id,
      timestamp: r.timestamp,
      visitDate: r.visitDate,
      dateLabel,
      weightKg: r.inputs.weightKg,
      bmi: r.anthropometrics.bmi,
      targetKcal: r.energy.targetKcal,
      tdeeKcal: r.energy.tdeeKcal,
      bodyFatPercent: r.inputs.bodyFatPercent,
      waistCm: r.inputs.waistCm,
      patientName: r.patientName,
    };
  });

  const first = points[0];
  const latest = points[points.length - 1];

  const firstDate = new Date(first.visitDate || first.timestamp);
  const latestDate = new Date(latest.visitDate || latest.timestamp);
  const diffMs = Math.max(0, latestDate.getTime() - firstDate.getTime());
  const totalDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const weightDeltaKg = Math.round((latest.weightKg - first.weightKg) * 10) / 10;
  const weightChangePercent =
    first.weightKg > 0
      ? Math.round(((latest.weightKg - first.weightKg) / first.weightKg) * 1000) / 10
      : 0;

  const bmiDelta = Math.round((latest.bmi - first.bmi) * 10) / 10;
  const caloricDeltaKcal = latest.targetKcal - first.targetKcal;

  let averageWeeklyWeightDeltaKg: number | undefined;
  if (totalDays >= 7) {
    averageWeeklyWeightDeltaKg =
      Math.round((weightDeltaKg / (totalDays / 7)) * 100) / 100;
  }

  const stats: TrendStatistics = {
    recordsCount: points.length,
    firstDate: first.visitDate,
    latestDate: latest.visitDate,
    totalDays,
    initialWeightKg: first.weightKg,
    latestWeightKg: latest.weightKg,
    weightDeltaKg,
    weightChangePercent,
    initialBmi: first.bmi,
    latestBmi: latest.bmi,
    bmiDelta,
    initialTargetKcal: first.targetKcal,
    latestTargetKcal: latest.targetKcal,
    caloricDeltaKcal,
    averageWeeklyWeightDeltaKg,
  };

  return { points, stats };
}
