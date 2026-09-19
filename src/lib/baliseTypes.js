export const BALISE_TYPES = {
  normal: {
    label: "Normale",
    icon: "square",
    color: "#8b5cf6",
    captureMs: 120000,
    reward: 120,
    rarity: "commune",
  },
  distant: {
    label: "Lointaine",
    icon: "spire",
    color: "#f97316",
    captureMs: 300000,
    reward: 260,
    rarity: "rare",
  },
  circular: {
    label: "Circulaire",
    icon: "ring",
    color: "#06b6d4",
    captureMs: 180000,
    reward: 180,
    rarity: "peu commune",
  },
  gold: {
    label: "En or",
    icon: "crown",
    color: "#eab308",
    captureMs: 360000,
    reward: 600,
    rarity: "légendaire",
  },
};

export function getBaliseType(balise) {
  if (balise?.isDecoy || String(balise?.rarity || "").toLowerCase() === "leurre") {
    return {
      label: "Leurre",
      icon: "target",
      color: "#38bdf8",
      captureMs: 60000,
      reward: 0,
      rarity: "leurre",
    };
  }
  const key = String(balise?.type || balise?.rarity || "normal").toLowerCase();
  if (key === "far" || key === "long" || key === "lointaine") return BALISE_TYPES.distant;
  if (key === "circle" || key === "ronde") return BALISE_TYPES.circular;
  if (key === "legendary" || key === "or" || key === "gold") return BALISE_TYPES.gold;
  return BALISE_TYPES[key] || BALISE_TYPES.normal;
}

export function getBaliseCaptureMs(balise) {
  const serverValue = Number(balise?.captureDurationMs ?? balise?.captureTimeMs);
  return Number.isFinite(serverValue) && serverValue > 0
    ? serverValue
    : getBaliseType(balise).captureMs;
}

export function getBaliseReward(balise) {
  const serverValue = Number(balise?.awardedCoins ?? balise?.reward);
  return Number.isFinite(serverValue) && serverValue >= 0
    ? serverValue
    : getBaliseType(balise).reward;
}
