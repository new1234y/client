/** Match duration vs match timer. 15 min → 60s, 30 min → 120s, hard cap 2 min. */
export function maxPowerSecFromSettings(settings, serverMax) {
  const n = Number(serverMax);
  if (Number.isFinite(n) && n >= 45 && n <= 120) return Math.round(n);
  const enabled = Boolean(settings?.timeLimitEnabled);
  const mins = enabled ? Number(settings?.timeLimitMinutes) : 30;
  const gameMinutes = Number.isFinite(mins) && mins >= 1 ? mins : 30;
  return Math.max(45, Math.min(120, Math.round(gameMinutes * 4)));
}

export function defaultPowerDurationSec(maxPowerSec) {
  const max = Number(maxPowerSec) || 120;
  return Math.min(60, max);
}

export function durationFactor60(durationSec) {
  return Math.pow(Math.max(1, Number(durationSec) || 60) / 60, 1.6);
}

export function formatPowerDur(sec) {
  const s = Math.max(1, Math.round(Number(sec) || 0));
  if (s < 60) return `${s} s`;
  if (s % 60 === 0) return `${s / 60} min`;
  const m = Math.floor(s / 60);
  return `${m} min ${s % 60} s`;
}

export function durationOptionsAtOrBelow(presets, maxSec) {
  const max = Math.max(1, Number(maxSec) || 120);
  const seen = new Set();
  const out = [];
  for (const p of presets) {
    const v = Number(p.value);
    if (!Number.isFinite(v) || v > max || seen.has(v)) continue;
    seen.add(v);
    out.push({ label: p.label || formatPowerDur(v), value: v });
  }
  if (!seen.has(max)) {
    out.push({ label: formatPowerDur(max), value: max });
  }
  if (!out.length) out.push({ label: formatPowerDur(max), value: max });
  return out;
}

export const FREE_FIRST_KINDS = [
  "invisibility",
  "noise",
  "freeze_cats",
  "fake_position",
  "balise_leurre",
];

export function isFirstFreeUse(powerUses, kind) {
  return Number(powerUses?.[kind] || 0) === 0;
}

export function freeFirstCostText(paidCost, isFree) {
  const n = typeof paidCost === "number" ? paidCost : paidCost;
  if (isFree) return `1 gratuit · ensuite ${n}`;
  return typeof n === "number" ? String(n) : String(n);
}

export function pickDurationOption(value, options, fallback) {
  const opts = Array.isArray(options) ? options : [];
  const raw = Number(value);
  if (opts.some((o) => o.value === raw)) return raw;
  if (!opts.length) return Number.isFinite(raw) ? raw : fallback;
  let best = opts[0].value;
  let bestD = Math.abs((Number.isFinite(raw) ? raw : best) - best);
  for (const o of opts) {
    const d = Math.abs((Number.isFinite(raw) ? raw : o.value) - o.value);
    if (d < bestD) {
      best = o.value;
      bestD = d;
    }
  }
  return best;
}
