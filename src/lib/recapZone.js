function zoneFromPhases(summary, absT) {
  const hunt = summary?.huntStartedAt;
  const phases = summary?.shrinkPhasesList;
  const R0 = Number(summary?.globalRadiusM) || 500;
  const center = summary?.gameCenter;

  if (!summary?.settingsSnapshot?.shrinkZoneEnabled || !hunt || !phases?.length) {
    return { radius: R0, center: center || null };
  }

  const elapsed = absT - hunt;
  if (elapsed <= 0) return { radius: R0, center: center || null };

  let phase = phases[phases.length - 1];
  for (let i = 0; i < phases.length; i++) {
    if (elapsed < phases[i].endTime) {
      phase = phases[i];
      break;
    }
  }

  const phaseDuration = phase.endTime - phase.startTime;
  const shrinkStart = phase.startTime + phaseDuration * (phase.waitRatio || 0);

  if (elapsed < shrinkStart) {
    return {
      radius: phase.startZone?.radius ?? R0,
      center: phase.startZone?.center ?? center,
    };
  }
  if (elapsed < phase.endTime && phase.shrinkRatio > 0) {
    const progress =
      (elapsed - shrinkStart) / (phaseDuration * phase.shrinkRatio);
    const sz = phase.startZone;
    const ez = phase.endZone;
    if (!sz || !ez) return { radius: R0, center };
    return {
      radius: sz.radius + (ez.radius - sz.radius) * progress,
      center: {
        lat: sz.center.lat + (ez.center.lat - sz.center.lat) * progress,
        lng: sz.center.lng + (ez.center.lng - sz.center.lng) * progress,
      },
    };
  }
  return {
    radius: phase.endZone?.radius ?? R0,
    center: phase.endZone?.center ?? center,
  };
}

/** Rayon global à l'instant t (aligné serveur si shrinkPhasesList présent). */
export function effectiveGlobalRadiusAtTime(summary, absT) {
  return zoneFromPhases(summary, absT).radius;
}

/** Centre de zone à l'instant t. */
export function effectiveZoneCenterAtTime(summary, absT) {
  return zoneFromPhases(summary, absT).center;
}
