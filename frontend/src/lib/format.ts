export function fmtTemp(c: number): string {
  return `${c.toFixed(1)}°C`;
}

export function fmtPct(v: number, digits = 0): string {
  return `${v.toFixed(digits)}%`;
}

export function fmtCn(ratio: number): string {
  if (!Number.isFinite(ratio)) return '—';
  return `${ratio.toFixed(1)}:1`;
}

export function fmtMass(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(2)} t`;
  return `${kg.toFixed(0)} kg`;
}

export function fmtDay(day: number): string {
  return `Day ${day.toFixed(1)}`;
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export const PHASE_LABEL: Record<string, string> = {
  mesophilic: 'Mesophilic',
  thermophilic: 'Thermophilic',
  cooling: 'Cooling',
  maturation: 'Maturation',
  finished: 'Finished',
};

export const PHASE_VAR: Record<string, string> = {
  mesophilic: 'var(--phase-mesophilic)',
  thermophilic: 'var(--phase-thermophilic)',
  cooling: 'var(--phase-cooling)',
  maturation: 'var(--phase-maturation)',
  finished: 'var(--phase-finished)',
};

export function scoreTone(v: number): 'nominal' | 'warn' | 'critical' {
  if (v >= 70) return 'nominal';
  if (v >= 45) return 'warn';
  return 'critical';
}

export const TONE_TOKENS: Record<'nominal' | 'warn' | 'critical', { bg: string; text: string }> = {
  nominal: { bg: 'var(--pastel-green-bg)', text: 'var(--pastel-green-text)' },
  warn: { bg: 'var(--pastel-yellow-bg)', text: 'var(--pastel-yellow-text)' },
  critical: { bg: 'var(--pastel-red-bg)', text: 'var(--pastel-red-text)' },
};

export const SEVERITY_TOKENS: Record<string, { bg: string; text: string }> = {
  critical: { bg: 'var(--pastel-red-bg)', text: 'var(--pastel-red-text)' },
  warning: { bg: 'var(--pastel-yellow-bg)', text: 'var(--pastel-yellow-text)' },
  info: { bg: 'var(--pastel-blue-bg)', text: 'var(--pastel-blue-text)' },
  good: { bg: 'var(--pastel-green-bg)', text: 'var(--pastel-green-text)' },
};
