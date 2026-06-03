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

export const iconSelfOutOfBounds = div(
  `<span style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;border-radius:50%;background:#2563eb;border:4px solid #ef4444;box-shadow:0 0 10px rgba(239, 68, 68, 0.8), 0 2px 8px rgba(0,0,0,.45);font-size:14px;font-weight:800;color:#fff">Moi</span>`,
  "pin-self-oob",
  40
);

export const iconAlly = div(
  `<span style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;border-radius:50%;background:#d97706;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.45)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" fill="#fef3c7"/><circle cx="10" cy="10" r="1.2" fill="#1a1a1a"/><circle cx="14" cy="10" r="1.2" fill="#1a1a1a"/><circle cx="12" cy="13" r="1" fill="#f59e0b"/><path d="M8 5c-2-2-4 0-3 2" stroke="#fef3c7" stroke-width="1.5" stroke-linecap="round"/><path d="M16 5c2-2 4 0 3 2" stroke="#fef3c7" stroke-width="1.5" stroke-linecap="round"/></svg></span>`,
  "pin-ally",
  38
);

export const iconAllyOutOfBounds = div(
  `<span style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;border-radius:50%;background:#d97706;border:4px solid #ef4444;box-shadow:0 0 10px rgba(239, 68, 68, 0.8), 0 2px 8px rgba(0,0,0,.45)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" fill="#fef3c7"/><circle cx="10" cy="10" r="1.2" fill="#1a1a1a"/><circle cx="14" cy="10" r="1.2" fill="#1a1a1a"/><circle cx="12" cy="13" r="1" fill="#f59e0b"/><path d="M8 5c-2-2-4 0-3 2" stroke="#fef3c7" stroke-width="1.5" stroke-linecap="round"/><path d="M16 5c2-2 4 0 3 2" stroke="#fef3c7" stroke-width="1.5" stroke-linecap="round"/></svg></span>`,
  "pin-ally-oob",
  38
);

export const iconCat = div(
  `<span style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;border-radius:50%;background:#7f1d1d;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.45)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#fca5a5"/><circle cx="9" cy="10" r="1.5" fill="#1a1a1a"/><circle cx="15" cy="10" r="1.5" fill="#1a1a1a"/><path d="M9 14c0 0 1.5 2 3 2s3-2 3-2" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round"/><path d="M6 6l2 3M18 6l-2 3" stroke="#fca5a5" stroke-width="1.5" stroke-linecap="round"/></svg></span>`,
  "pin-cat",
  40
);

export const iconCatOutOfBounds = div(
  `<span style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;border-radius:50%;background:#7f1d1d;border:4px solid #ef4444;box-shadow:0 0 10px rgba(239, 68, 68, 0.8), 0 2px 8px rgba(0,0,0,.45)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#fca5a5"/><circle cx="9" cy="10" r="1.5" fill="#1a1a1a"/><circle cx="15" cy="10" r="1.5" fill="#1a1a1a"/><path d="M9 14c0 0 1.5 2 3 2s3-2 3-2" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round"/><path d="M6 6l2 3M18 6l-2 3" stroke="#fca5a5" stroke-width="1.5" stroke-linecap="round"/></svg></span>`,
  "pin-cat-oob",
  40
);

export const iconPreyExact = div(
  `<span style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;border-radius:50%;background:#ea580c;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.45)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="5" r="2.5" fill="#fff"/><path d="M8 22l4-8 4 8M6 12l6-3 6 3" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`,
  "pin-prey",
  36
);

export const iconPreyOutOfBounds = div(
  `<span style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;border-radius:50%;background:#ea580c;border:4px solid #ef4444;box-shadow:0 0 10px rgba(239, 68, 68, 0.8), 0 2px 8px rgba(0,0,0,.45)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="5" r="2.5" fill="#fff"/><path d="M8 22l4-8 4 8M6 12l6-3 6 3" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`,
  "pin-prey-oob",
  36
);

/** Déconnecté temporairement (dernière position) */
export const iconDisconnected = div(
  `<span style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;border-radius:50%;background:#64748b;border:3px dashed #e2e8f0;box-shadow:0 2px 8px rgba(0,0,0,.35);opacity:.88"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" stroke-width="2" stroke-linecap="round"><path d="M2 12h4m12 0h4M5.6 5.6l2.8 2.8m7.2 7.2l2.8 2.8M5.6 18.4l2.8-2.8m7.2-7.2l2.8-2.8"/><line x1="4" y1="4" x2="20" y2="20"/></svg></span>`,
  "pin-offline",
  38
);

export const iconChatLocation = div(
  `<span style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;border-radius:14px;background:#0ea5e9;border:2px solid #fff;box-shadow:0 2px 12px rgba(0,0,0,.35)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#fff"/><circle cx="12" cy="9" r="2.5" fill="#0ea5e9"/></svg></span>`,
  "pin-chat-location",
  38
);

/** Récap / joueur capturé */
export const iconCaptured = div(
  `<span style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;border-radius:50%;background:#475569;border:3px dashed #fff;opacity:.92"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 4v16M5 4h10l-3 4 3 4H5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`,
  "pin-captured",
  38
);
