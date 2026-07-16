/**
 * Every layout number on the board is derived from these three
 * constants. Nothing about a block's position or height is hardcoded
 * anywhere else -- change SLOT_MINUTES to 15 or DAY_END_MINUTES to 18:00
 * and the whole board reflows on its own.
 */
export const DAY_START_MINUTES = 8 * 60; // 08:00
export const DAY_END_MINUTES = 20 * 60; // 20:00
export const SLOT_MINUTES = 30;
export const PIXELS_PER_SLOT = 40;

export const VALID_DURATIONS_MINUTES = [30, 60, 90] as const;

/**
 * Pulls the HH:MM straight out of the ISO string instead of parsing it
 * with `new Date()`. The backend stores naive facility-local time (see
 * the backend's USE_TZ=False decision); running it through Date() would
 * silently reinterpret it in the browser's own timezone, which is a
 * real bug waiting to happen the moment this app's viewer isn't in the
 * same timezone as the imaging center.
 */
export function timeStringToMinutes(iso: string): number {
  const match = iso.match(/T(\d{2}):(\d{2})/);
  if (!match) return 0;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

export function minutesToTimeLabel(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const period = h < 12 ? "AM" : "PM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour12} ${period}` : `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export function generateSlotStarts(): number[] {
  const slots: number[] = [];
  for (let m = DAY_START_MINUTES; m < DAY_END_MINUTES; m += SLOT_MINUTES) {
    slots.push(m);
  }
  return slots;
}

export interface BlockGeometry {
  top: number;
  height: number;
}

/** A 90-minute appointment is exactly 3x the height of a 30-minute one
 *  because both numbers come from the same minutes-per-pixel ratio. */
export function computeBlockGeometry(startIso: string, endIso: string): BlockGeometry {
  const startMin = timeStringToMinutes(startIso);
  const endMin = timeStringToMinutes(endIso);
  const top = ((startMin - DAY_START_MINUTES) / SLOT_MINUTES) * PIXELS_PER_SLOT;
  const height = ((endMin - startMin) / SLOT_MINUTES) * PIXELS_PER_SLOT;
  return { top, height };
}

export function boardHeight(): number {
  return ((DAY_END_MINUTES - DAY_START_MINUTES) / SLOT_MINUTES) * PIXELS_PER_SLOT;
}

/** Builds a naive local ISO datetime string (no timezone suffix) for a
 *  given calendar date + minutes-since-midnight, matching exactly what
 *  the backend expects and returns. */
export function buildIsoDateTime(dateStr: string, totalMinutes: number): string {
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const m = String(totalMinutes % 60).padStart(2, "0");
  return `${dateStr}T${h}:${m}:00`;
}

export function todayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Adds/subtracts whole days from a YYYY-MM-DD string without ever
 *  touching a timezone-aware Date field, so DST transitions can't shift
 *  the calendar date by accident. */
export function shiftDateString(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const utcDate = new Date(Date.UTC(y, m - 1, d));
  utcDate.setUTCDate(utcDate.getUTCDate() + deltaDays);
  return utcDate.toISOString().slice(0, 10);
}

export function formatDateForHeading(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const utcDate = new Date(Date.UTC(y, m - 1, d));
  return utcDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
