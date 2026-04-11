import L from "leaflet";

function makeIcon(html, className, size = 36) {
  return L.divIcon({
    className: `map-pin ${className}`,
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)],
  });
}

const ring = (bg, content, extra = "") =>
  `<span style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;border-radius:50%;background:${bg};border:2.5px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.45);${extra}">${content}</span>`;

const personSvg = () =>
  `<svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;

const catSvg = () =>
  `<svg width="17" height="17" viewBox="0 0 24 24" fill="#fff"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`;

const targetSvg = () =>
  `<svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><circle cx="12" cy="12" r="3"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/></svg>`;

const flagSvg = () =>
  `<svg width="15" height="15" viewBox="0 0 24 24" fill="#fff"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/></svg>`;

const warnSvg = () =>
  `<svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>`;

/* ── Self ── blue solid with "Moi" label */
export const iconSelf = makeIcon(
  ring(
    "#2563eb",
    `<span style="font-size:10px;font-weight:800;color:#fff;letter-spacing:-0.5px;line-height:1">Moi</span>`
  ),
  "pin-self",
  42
);

/* ── Ally (prey teammate) ── sky */
export const iconAlly = makeIcon(
  ring("#0284c7", personSvg()),
  "pin-ally",
  38
);

/* ── Cat hunter ── orange */
export const iconCat = makeIcon(
  ring("#ea580c", catSvg()),
  "pin-cat",
  40
);

/* ── Prey exact position (for cats) ── amber */
export const iconPreyExact = makeIcon(
  ring("#d97706", targetSvg()),
  "pin-prey",
  36
);

/* ── Captured ── greyed dashed */
export const iconCaptured = makeIcon(
  ring(
    "#475569",
    flagSvg(),
    "opacity:0.85;border-style:dashed;"
  ),
  "pin-captured",
  36
);

/* ── Disconnected ── dim warning */
export const iconDisconnected = makeIcon(
  ring(
    "#94a3b8",
    warnSvg(),
    "opacity:0.65;border-style:dashed;border-color:#cbd5e1;"
  ),
  "pin-disconnected",
  34
);
