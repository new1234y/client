import L from "leaflet";

const div = (html, className, size = 34) =>
  L.divIcon({
    className: `map-pin ${className}`,
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });

export const iconSelf = div(
  `<span style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.45);font-size:14px;font-weight:800;color:#fff">Moi</span>`,
  "pin-self",
  40
);

export const iconAlly = div(
  `<span style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;border-radius:50%;background:#d97706;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.45);font-size:18px">🐭</span>`,
  "pin-ally",
  38
);

export const iconCat = div(
  `<span style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;border-radius:50%;background:#7f1d1d;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.45);font-size:20px;line-height:1">🐱</span>`,
  "pin-cat",
  40
);

export const iconPreyExact = div(
  `<span style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;border-radius:50%;background:#ea580c;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.45);font-size:16px">🎯</span>`,
  "pin-prey",
  36
);

/** Déconnecté temporairement (dernière position) */
export const iconDisconnected = div(
  `<span style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;border-radius:50%;background:#64748b;border:3px dashed #e2e8f0;box-shadow:0 2px 8px rgba(0,0,0,.35);font-size:15px;opacity:.88">📡</span>`,
  "pin-offline",
  38
);

/** Récap / joueur capturé */
export const iconCaptured = div(
  `<span style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;border-radius:50%;background:#475569;border:3px dashed #fff;opacity:.92;font-size:18px">🏳️</span>`,
  "pin-captured",
  38
);
