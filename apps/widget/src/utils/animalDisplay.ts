import type { MediaAsset } from '../types';

export function coerceString(v: unknown, fallback = ''): string {
  if (v == null) return fallback;
  if (typeof v !== 'string') return fallback;
  return v;
}

export function orderedMediaAssets(assets: MediaAsset[] | null | undefined): MediaAsset[] {
  const list = Array.isArray(assets) ? assets : [];
  return [...list].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
}

/** Title case for sex/size; empty → em dash */
export function titleCaseOrDash(v: string | null | undefined): string {
  const s = coerceString(v);
  if (!s) return '—';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export function formatSpeciesLabel(species: string | null | undefined): string {
  const s = coerceString(species);
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export function truncateBreed(breed: string | null | undefined, max = 28): string {
  const s = coerceString(breed);
  if (s.length <= max) return s;
  return `${s.slice(0, max - 2)}…`;
}

const MS_PER_DAY = 86400000;

/**
 * "New Arrival" when available and intake falls within the last `withinDays` days (rolling window from now).
 */
export function shouldShowNewArrivalBadge(
  intakeDateIso: string | null | undefined,
  status: string,
  withinDays = 7
): boolean {
  if (status !== 'available' || !intakeDateIso) return false;
  const intake = new Date(intakeDateIso);
  if (Number.isNaN(intake.getTime())) return false;
  const now = Date.now();
  const intakeMs = intake.getTime();
  if (intakeMs > now) return false;
  return now - intakeMs <= withinDays * MS_PER_DAY;
}
