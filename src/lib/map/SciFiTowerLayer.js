/**
 * Mapbox CustomLayerInterface (type: custom, renderingMode: 3d) that draws
 * procedural sci-fi beacon towers with Three.js, sharing the map WebGL context.
 *
 * Towers are Y-up, in meters. Placement uses MercatorCoordinate and the
 * official Mapbox+Three transform (translate * scale(s,-s,s) * rotateX(PI/2)).
 */
import * as THREE from "three";
import mapboxgl from "mapbox-gl";
import { offsetMeters } from "./geoOffset.js";

export const SCIFI_TOWER_LAYER_ID = "sci-fi-towers";

const IDLE = "#a855f7";
const ROT_X = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1, 0, 0), Math.PI / 2);
/** Uniform extra scale so the ~24 m tower reads on the GPS map (~52 m / ~11 m). */
const EXTRA_SCALE = 2.2;
const LOCAL_SCALE = new THREE.Matrix4().makeScale(EXTRA_SCALE, EXTRA_SCALE, EXTRA_SCALE);
/** Sonar ping: 2 staggered rings, ~2s loop, uniform torus scale in XZ. */
const PULSE_COUNT = 2;
const PULSE_PERIOD = 2.05;
const PULSE_MIN_R = 2.4;
const PULSE_MAX_R = 9.6;
const PULSE_TUBE = 0.07;
const PULSE_Y = 0.55;

const SEG = 64;
const BASE_H = 1.42;
const SHAFT_H = 16.6;
const SHAFT_R_TOP = 0.58;
const SHAFT_R_BOT = 0.68;
const SHAFT_R_MID = (SHAFT_R_TOP + SHAFT_R_BOT) / 2;
const SHAFT_Y = BASE_H + SHAFT_H / 2;
const RIB_N = 6;
const RIB_H = 15.4;
const RIB_R = 0.034;
const RIB_DIST = SHAFT_R_MID + 0.12;
const RING_YS = [7.35, 12.65, 17.48];
const RING_R = 1.48;
const RING_TUBE = 0.055;
const STRUT_LEN = RING_R - RING_TUBE - SHAFT_R_MID;
const STRUT_MID = SHAFT_R_MID + STRUT_LEN / 2;
const CAP_Y = BASE_H + SHAFT_H;
const CAP_H = 2.74;
const SPIRE_H = 2.55;
const TIP_H = 0.42;
const TOWER_H = CAP_Y + CAP_H + SPIRE_H + TIP_H;

/** Native-size stacked saucers (no mesh.scale on lathes). */
const SAUCERS = [
  { y: 4.2, rOut: 2.22, rIn: 0.74, topH: 0.4, botH: 0.38, rimT: 0.062, accentT: 0.03, collarH: 0.22 },
  { y: 10.05, rOut: 1.72, rIn: 0.66, topH: 0.26, botH: 0.24, rimT: 0.048, accentT: 0.024, collarH: 0.18 },
  { y: 15.32, rOut: 1.95, rIn: 0.62, topH: 0.3, botH: 0.28, rimT: 0.052, accentT: 0.026, collarH: 0.18 },
];

/** Darker floor bands: unique cylinders, slightly proud of the tapered shaft. */
const WINDOW_BANDS = [
  { y: 2.52, h: 0.4, r: 0.705 },
  { y: 5.82, h: 0.4, r: 0.688 },
  { y: 8.58, h: 0.4, r: 0.672 },
  { y: 11.42, h: 0.4, r: 0.655 },
  { y: 13.92, h: 0.4, r: 0.642 },
  { y: 16.48, h: 0.4, r: 0.628 },
];

let shared = null;

function markShared(geo) {
  geo.userData.shared = true;
  return geo;
}

function lathe(pts, seg = SEG) {
  const geo = new THREE.LatheGeometry(
    pts.map(([x, y]) => new THREE.Vector2(x, y)),
    seg
  );
  geo.computeVertexNormals();
  return markShared(geo);
}

function saucerTopPts(rIn, rOut, h) {
  const s = rOut - rIn;
  return [
    [rIn, 0.075],
    [rIn + s * 0.15, h * 0.55],
    [rIn + s * 0.4, h],
    [rIn + s * 0.74, h * 0.46],
    [rOut - 0.06, 0.085],
    [rOut, 0.068],
  ];
}

function saucerBotPts(rIn, rOut, h) {
  const s = rOut - rIn;
  return [
    [rIn, -0.075],
    [rIn + s * 0.15, -h * 0.7],
    [rIn + s * 0.4, -h],
    [rIn + s * 0.74, -h * 0.4],
    [rOut - 0.06, -0.085],
    [rOut, -0.068],
  ];
}

function makeSaucerGeos(spec) {
  return {
    top: lathe(saucerTopPts(spec.rIn, spec.rOut, spec.topH)),
    bot: lathe(saucerBotPts(spec.rIn, spec.rOut, spec.botH)),
    rim: markShared(new THREE.TorusGeometry(spec.rOut, spec.rimT, 16, SEG)),
    accent: markShared(new THREE.TorusGeometry(spec.rOut * 0.88, spec.accentT, 12, SEG)),
    collar: markShared(
      new THREE.CylinderGeometry(spec.rIn + 0.14, spec.rIn + 0.1, spec.collarH, 48)
    ),
    accentY: -(spec.botH * 0.42 + 0.02),
    collarY: spec.topH * 0.55 + spec.collarH * 0.35,
  };
}

function getShared() {
  if (shared) return shared;
  shared = {
    // Wide shallow dome plinth tapering into the shaft.
    base: lathe([
      [0.0, 0.0],
      [2.38, 0.0],
      [2.45, 0.06],
      [2.32, 0.22],
      [1.95, 0.48],
      [1.45, 0.78],
      [0.95, 1.12],
      [0.76, 1.32],
      [0.72, 1.52],
    ]),
    shaft: markShared(
      new THREE.CylinderGeometry(SHAFT_R_TOP, SHAFT_R_BOT, SHAFT_H, SEG, 1, false)
    ),
    windowBands: WINDOW_BANDS.map((b) =>
      markShared(new THREE.CylinderGeometry(b.r, b.r, b.h, SEG, 1, false))
    ),
    rib: markShared(new THREE.CylinderGeometry(RIB_R, RIB_R, RIB_H, 16)),
    saucers: SAUCERS.map(makeSaucerGeos),
    ring: markShared(new THREE.TorusGeometry(RING_R, RING_TUBE, 16, SEG)),
    strut: markShared(new THREE.CylinderGeometry(0.026, 0.026, STRUT_LEN, 12)),
    // Bulky rounded control bulb, wider than the shaft.
    cap: lathe([
      [0.64, 0.08],
      [0.9, 0.22],
      [1.28, 0.52],
      [1.52, 0.95],
      [1.58, 1.4],
      [1.48, 1.88],
      [1.18, 2.28],
      [0.7, 2.55],
      [0.22, 2.7],
      [0.0, CAP_H],
    ]),
    spire: markShared(new THREE.CylinderGeometry(0.045, 0.07, SPIRE_H, 24)),
    tip: markShared(new THREE.ConeGeometry(0.09, TIP_H, 24)),
  };
  return shared;
}

function metal(color, extra = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: extra.metalness ?? 0.72,
    roughness: extra.roughness ?? 0.32,
    ...extra,
  });
}

function makeTint(mat, slot) {
  mat.userData.slot = slot;
  return mat;
}

function makePulseRing(color, phaseOffset) {
  // Unique geo so dispose-with-tower does not touch shared lathes; uniform scale only.
  const geo = new THREE.TorusGeometry(1, PULSE_TUBE, 10, 48);
  const mat = makeTint(
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 1.05,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      metalness: 0.18,
      roughness: 0.38,
    }),
    "pulse"
  );
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.y = PULSE_Y;
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  mesh.userData.pulse = true;
  mesh.userData.phaseOffset = phaseOffset;
  return mesh;
}

function tickPulseRings(group, tSec) {
  const pulses = group?.userData?.pulses;
  if (!pulses?.length) return;
  const span = PULSE_MAX_R - PULSE_MIN_R;
  for (let i = 0; i < pulses.length; i++) {
    const mesh = pulses[i];
    const off = Number(mesh.userData.phaseOffset) || 0;
    const phase = ((tSec / PULSE_PERIOD) + off) % 1;
    const r = PULSE_MIN_R + span * phase;
    mesh.scale.set(r, r, r);
    const fade = (1 - phase) * (1 - phase);
    if (mesh.material) mesh.material.opacity = 0.62 * fade;
    mesh.visible = phase < 0.97;
  }
}

export function createSciFiTower(color = IDLE) {
  const g = getShared();
  const root = new THREE.Group();
  root.name = "sci-fi-tower";
  root.frustumCulled = false;
  const tint = [];

  const silver = metal(0xc5ccd6, { roughness: 0.34, metalness: 0.72 });
  const chrome = metal(0xe4e9ef, { roughness: 0.2, metalness: 0.88 });
  const darkMetal = metal(0x3a4556, { roughness: 0.44, metalness: 0.76 });
  const copper = makeTint(metal(0xb87333, { roughness: 0.38, metalness: 0.78 }), "copper");
  tint.push(copper);

  const glass = makeTint(
    new THREE.MeshStandardMaterial({
      color: 0x1a2333,
      emissive: 0xa855f7,
      emissiveIntensity: 0.28,
      roughness: 0.22,
      metalness: 0.48,
    }),
    "glass"
  );
  tint.push(glass);

  const glow = makeTint(
    new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      emissive: 0xa855f7,
      emissiveIntensity: 0.55,
      roughness: 0.28,
      metalness: 0.42,
    }),
    "glow"
  );
  tint.push(glow);

  const base = new THREE.Mesh(g.base, chrome);
  root.add(base);

  const shaft = new THREE.Mesh(g.shaft, darkMetal);
  shaft.position.y = SHAFT_Y;
  root.add(shaft);

  for (let i = 0; i < g.windowBands.length; i++) {
    const band = new THREE.Mesh(g.windowBands[i], glass);
    band.position.y = WINDOW_BANDS[i].y;
    root.add(band);
  }

  for (let i = 0; i < RIB_N; i++) {
    const ang = (i / RIB_N) * Math.PI * 2;
    const rib = new THREE.Mesh(g.rib, silver);
    rib.position.set(Math.cos(ang) * RIB_DIST, SHAFT_Y, Math.sin(ang) * RIB_DIST);
    root.add(rib);
  }

  for (let i = 0; i < g.saucers.length; i++) {
    const spec = SAUCERS[i];
    const sg = g.saucers[i];
    const top = new THREE.Mesh(sg.top, i === 0 ? chrome : silver);
    top.position.y = spec.y;
    root.add(top);
    const bot = new THREE.Mesh(sg.bot, copper);
    bot.position.y = spec.y;
    root.add(bot);
    const rim = new THREE.Mesh(sg.rim, chrome);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = spec.y;
    root.add(rim);
    const accent = new THREE.Mesh(sg.accent, glow);
    accent.rotation.x = Math.PI / 2;
    accent.position.y = spec.y + sg.accentY;
    root.add(accent);
    const collar = new THREE.Mesh(sg.collar, silver);
    collar.position.y = spec.y + sg.collarY;
    root.add(collar);
  }

  const up = new THREE.Vector3(0, 1, 0);
  const radial = new THREE.Vector3();
  for (let i = 0; i < RING_YS.length; i++) {
    const y = RING_YS[i];
    const ring = new THREE.Mesh(g.ring, glow);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    root.add(ring);

    for (let k = 0; k < 3; k++) {
      const ang = (k / 3) * Math.PI * 2;
      const strut = new THREE.Mesh(g.strut, silver);
      radial.set(Math.cos(ang), 0, Math.sin(ang));
      strut.position.set(radial.x * STRUT_MID, y, radial.z * STRUT_MID);
      strut.quaternion.setFromUnitVectors(up, radial);
      root.add(strut);
    }
  }

  const cap = new THREE.Mesh(g.cap, chrome);
  cap.position.y = CAP_Y;
  root.add(cap);

  const spire = new THREE.Mesh(g.spire, silver);
  spire.position.y = CAP_Y + CAP_H + SPIRE_H / 2;
  root.add(spire);

  const tip = new THREE.Mesh(g.tip, glow);
  tip.position.y = CAP_Y + CAP_H + SPIRE_H + TIP_H / 2;
  root.add(tip);

  const pulses = [];
  for (let i = 0; i < PULSE_COUNT; i++) {
    const ring = makePulseRing(color, i / PULSE_COUNT);
    root.add(ring);
    tint.push(ring.material);
    pulses.push(ring);
  }
  root.userData.pulses = pulses;

  root.userData.tint = tint;
  root.userData.heightM = TOWER_H;
  root.traverse((o) => {
    o.frustumCulled = false;
  });
  tintSciFiTower(root, color);
  return root;
}

export function tintSciFiTower(group, hex) {
  const c = new THREE.Color(hex || IDLE);
  const copperCol = new THREE.Color(0xb87333).lerp(c, 0.18);
  const mats = group?.userData?.tint || [];
  for (const mat of mats) {
    const slot = mat.userData.slot;
    if (slot === "glow") {
      mat.color.copy(c);
      mat.emissive.copy(c);
      mat.emissiveIntensity = 0.55;
    } else if (slot === "pulse") {
      mat.color.copy(c);
      mat.emissive.copy(c);
      mat.emissiveIntensity = 1.05;
    } else if (slot === "copper") {
      mat.color.copy(copperCol);
    } else if (slot === "glass") {
      mat.emissive.copy(c);
      mat.emissiveIntensity = 0.28;
    }
    mat.needsUpdate = true;
  }
}

export function disposeTowerInstance(group) {
  if (!group) return;
  group.traverse((obj) => {
    const mats = obj.material ? (Array.isArray(obj.material) ? obj.material : [obj.material]) : [];
    for (const m of mats) {
      if (m && !m.userData?._sharedKeep) m.dispose?.();
    }
    if (obj.geometry && !obj.geometry.userData?.shared) obj.geometry.dispose?.();
  });
}

function isFinite16(src) {
  if (!src || typeof src.length !== "number" || src.length < 16) return false;
  for (let i = 0; i < 16; i++) {
    if (!Number.isFinite(Number(src[i]))) return false;
  }
  return true;
}

/**
 * Mapbox GL JS historically passed a 16-float array. v3 + globe / some
 * builds pass a ProjectionData object instead. fromArray(object) writes
 * NaNs and the mesh explodes into shards.
 */
function readMatrix(matrix) {
  if (!matrix) return null;
  if (ArrayBuffer.isView(matrix) || Array.isArray(matrix)) {
    return isFinite16(matrix) ? matrix : null;
  }
  if (typeof matrix !== "object") return null;
  const candidates = [
    matrix.defaultProjectionData?.mainMatrix,
    matrix.modelViewProjectionMatrix,
    matrix.mainMatrix,
    matrix.defaultProjectionData?.fallbackMatrix,
  ];
  for (const c of candidates) {
    if (isFinite16(c)) return c;
  }
  if (isFinite16(matrix)) return matrix;
  return null;
}

function fillProjection(out, matrix) {
  const arr = readMatrix(matrix);
  if (!arr) return false;
  out.fromArray(arr);
  const e = out.elements;
  for (let i = 0; i < 16; i++) {
    if (!Number.isFinite(e[i])) return false;
  }
  return true;
}

function elevationOf(map, lng, lat) {
  try {
    const z = map?.queryTerrainElevation?.({ lng, lat }, { exaggerated: true });
    return Number.isFinite(z) ? z : 0;
  } catch {
    return 0;
  }
}

/** Official Mapbox+Three model transform: T(mc) * scale(s,-s,s) * rotateX(PI/2) * extraScale. */
function makeModelL(out, lng, lat, alt) {
  const mc = mapboxgl.MercatorCoordinate.fromLngLat({ lng, lat }, alt);
  const s = mc.meterInMercatorCoordinateUnits();
  return out
    .makeTranslation(mc.x, mc.y, mc.z)
    .scale(new THREE.Vector3(s, -s, s))
    .multiply(ROT_X)
    .multiply(LOCAL_SCALE);
}

const FALLBACK_SRC = "src-balise-tower";
const FALLBACK_LAYER = "balise-tower";

function circlePoly(lat, lng, radiusM, n = 28) {
  const coords = [];
  for (let i = 0; i <= n; i++) {
    const p = offsetMeters(lat, lng, (i * 360) / n, radiusM);
    coords.push([p.lng, p.lat]);
  }
  return { type: "Polygon", coordinates: [coords] };
}

function fallbackFeatures(towers) {
  const feats = [];
  for (const t of towers) {
    if (t?.id == null || !Number.isFinite(t.lat) || !Number.isFinite(t.lng)) continue;
    const color = t.color || IDLE;
    const { lat, lng } = t;
    const rings = [
      { r: 2.42, base: 0, height: 1.4 },
      { r: 0.68, base: 1.35, height: 18.05 },
      { r: 2.22, base: 3.78, height: 4.62 },
      { r: 1.54, base: 8.12, height: 8.26 },
      { r: 1.54, base: 11.82, height: 11.96 },
      { r: 1.54, base: 15.52, height: 15.66 },
      { r: 1.58, base: 18.0, height: 20.8 },
      { r: 0.12, base: 20.7, height: 23.8 },
    ].map((ring) => ({
      r: ring.r * EXTRA_SCALE,
      base: ring.base * EXTRA_SCALE,
      height: ring.height * EXTRA_SCALE,
    }));
    for (const ring of rings) {
      feats.push({
        type: "Feature",
        properties: { color, base: ring.base, height: ring.height },
        geometry: circlePoly(lat, lng, ring.r),
      });
    }
  }
  return feats;
}

function ensureFallbackLayer(map) {
  if (!map) return;
  try {
    if (!map.getSource(FALLBACK_SRC)) {
      map.addSource(FALLBACK_SRC, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
    }
    if (!map.getLayer(FALLBACK_LAYER)) {
      map.addLayer({
        id: FALLBACK_LAYER,
        type: "fill-extrusion",
        source: FALLBACK_SRC,
        paint: {
          "fill-extrusion-color": ["get", "color"],
          "fill-extrusion-height": ["get", "height"],
          "fill-extrusion-base": ["get", "base"],
          "fill-extrusion-opacity": 0.94,
          "fill-extrusion-vertical-gradient": true,
        },
      });
    }
  } catch {
    // style not ready
  }
}

function setFallbackTowers(map, towers) {
  if (!map) return;
  ensureFallbackLayer(map);
  try {
    map.getSource(FALLBACK_SRC)?.setData({
      type: "FeatureCollection",
      features: fallbackFeatures(towers),
    });
  } catch {
    // ignore
  }
}

function clearFallback(map) {
  if (!map) return;
  try {
    if (map.getLayer(FALLBACK_LAYER)) map.removeLayer(FALLBACK_LAYER);
    if (map.getSource(FALLBACK_SRC) && !map.getLayer(FALLBACK_LAYER)) {
      map.removeSource(FALLBACK_SRC);
    }
  } catch {
    // ignore
  }
}

function addSceneLights(scene) {
  // Model space is Y-up meters (official example). Lights MUST live on the
  // scene, never on a mercator-scaled tower group (~1e-7) or they vanish.
  const hemi = new THREE.HemisphereLight(0xe0f2fe, 0x1e293b, 1.2);
  hemi.position.set(0, 1, 0);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xfff7ed, 1.28);
  key.position.set(12, 28, 16);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xbfdbfe, 0.38);
  fill.position.set(-18, 10, -12);
  scene.add(fill);
}

export function createSciFiTowerLayer() {
  return {
    id: SCIFI_TOWER_LAYER_ID,
    type: "custom",
    renderingMode: "3d",
    enabled: true,
    failed: false,
    ready: false,
    pending: [],
    byId: new Map(),
    map: null,
    camera: null,
    scene: null,
    renderer: null,
    _m: null,
    _l: null,

    onAdd(map, gl) {
      this.map = map;
      try {
        this.camera = new THREE.Camera();
        this.camera.matrixAutoUpdate = false;
        this.scene = new THREE.Scene();
        this._m = new THREE.Matrix4();
        this._l = new THREE.Matrix4();
        addSceneLights(this.scene);
        this.renderer = new THREE.WebGLRenderer({
          canvas: map.getCanvas(),
          context: gl,
          antialias: true,
        });
        this.renderer.autoClear = false;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.NoToneMapping;
        this.ready = true;
        this.failed = false;
        clearFallback(map);
        this.setTowers(this.pending);
      } catch {
        this.failed = true;
        this.ready = false;
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        setFallbackTowers(map, this.pending);
      }
    },

    onRemove() {
      this._teardown();
    },

    _teardown() {
      for (const rec of this.byId.values()) {
        this.scene?.remove(rec.group);
        disposeTowerInstance(rec.group);
      }
      this.byId.clear();
      if (this.scene) {
        while (this.scene.children.length) this.scene.remove(this.scene.children[0]);
      }
      // Do not renderer.dispose() — that is the shared Mapbox WebGL context.
      this.renderer = null;
      this.scene = null;
      this.camera = null;
      this._m = null;
      this._l = null;
      this.ready = false;
    },

    setEnabled(on) {
      this.enabled = !!on;
      if (!this.enabled) this.setTowers([]);
    },

    setTowers(list) {
      const towers = Array.isArray(list) ? list : [];
      this.pending = towers;
      if (this.failed) {
        if (this.enabled && towers.length) setFallbackTowers(this.map, towers);
        else clearFallback(this.map);
        return;
      }
      if (!this.ready || !this.scene) return;
      clearFallback(this.map);
      const seen = new Set();
      for (const t of towers) {
        if (t?.id == null || !Number.isFinite(t.lat) || !Number.isFinite(t.lng)) continue;
        const id = String(t.id);
        seen.add(id);
        const color = t.color || IDLE;
        let rec = this.byId.get(id);
        if (!rec) {
          const group = createSciFiTower(color);
          group.matrixAutoUpdate = false;
          group.matrix.identity();
          this.scene.add(group);
          rec = { group, color, lng: t.lng, lat: t.lat };
          this.byId.set(id, rec);
        } else if (rec.color !== color) {
          rec.color = color;
          tintSciFiTower(rec.group, color);
        }
        rec.lng = t.lng;
        rec.lat = t.lat;
      }
      for (const [id, rec] of this.byId) {
        if (seen.has(id)) continue;
        this.scene.remove(rec.group);
        disposeTowerInstance(rec.group);
        this.byId.delete(id);
      }
      try {
        this.map?.triggerRepaint?.();
      } catch {
        // ignore
      }
    },

    render(_gl, matrix) {
      if (this.failed || !this.enabled || !this.renderer || !this.scene || !this.camera) return;
      if (this.byId.size === 0) return;
      if (!fillProjection(this._m, matrix)) return;

      const tSec = performance.now() / 1000;

      // Official pattern: mesh stays identity at origin (Y-up meters);
      // camera.projectionMatrix = m * l. Identity view.
      this.camera.matrix.identity();
      this.camera.matrixWorld.identity();
      this.camera.matrixWorldInverse.identity();

      const records = [...this.byId.values()];
      for (const rec of records) rec.group.visible = false;

      for (const rec of records) {
        tickPulseRings(rec.group, tSec);
        rec.group.visible = true;
        rec.group.matrix.identity();
        rec.group.matrixWorldNeedsUpdate = true;
        const alt = elevationOf(this.map, rec.lng, rec.lat);
        makeModelL(this._l, rec.lng, rec.lat, alt);
        this.camera.projectionMatrix.copy(this._m).multiply(this._l);
        this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
        this.renderer.resetState();
        this.renderer.render(this.scene, this.camera);
        rec.group.visible = false;
      }
      for (const rec of records) rec.group.visible = true;
      try {
        this.map?.triggerRepaint?.();
      } catch {
        // ignore
      }
    },
  };
}

export function ensureSciFiTowerLayer(map) {
  if (!map) return null;
  let impl = map._sciFiTowers;
  if (!impl) {
    impl = createSciFiTowerLayer();
    map._sciFiTowers = impl;
  }
  try {
    if (!impl.failed) clearFallback(map);
  } catch {
    // style not ready
  }
  try {
    if (!map.getLayer(SCIFI_TOWER_LAYER_ID)) map.addLayer(impl);
  } catch {
    // style reload race
  }
  return impl;
}

export function syncSciFiTowers(map, towers, enabled = true) {
  if (!map) return;
  const impl = ensureSciFiTowerLayer(map);
  if (!impl) return;
  impl.setEnabled(enabled);
  impl.setTowers(enabled ? towers : []);
}
