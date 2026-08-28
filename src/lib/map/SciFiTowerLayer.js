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

const DISCS = [
  { y: 3.55, r: 2.48, strutRot: 0.0 },
  { y: 7.35, r: 2.08, strutRot: 0.35 },
  { y: 11.2, r: 2.38, strutRot: 0.12 },
  { y: 15.05, r: 2.02, strutRot: 0.48 },
  { y: 18.7, r: 2.62, strutRot: 0.22 },
];

const SHAFT_H = 18.5;
const SHAFT_Y = 0.55 + SHAFT_H / 2;
const TOWER_H = 24.6;

let shared = null;

function markShared(geo) {
  geo.userData.shared = true;
  return geo;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeWindowTextures() {
  const w = 512;
  const h = 1024;
  const albedoC = document.createElement("canvas");
  albedoC.width = w;
  albedoC.height = h;
  const emitC = document.createElement("canvas");
  emitC.width = w;
  emitC.height = h;
  const a = albedoC.getContext("2d");
  const e = emitC.getContext("2d");
  const rng = mulberry32(0x5c1f17);

  a.fillStyle = "#121826";
  a.fillRect(0, 0, w, h);
  e.fillStyle = "#000000";
  e.fillRect(0, 0, w, h);

  const floors = 26;
  const cols = 10;
  const padX = 22;
  const padY = 28;
  const gapX = 7;
  const gapY = 11;
  const winW = (w - padX * 2 - gapX * (cols - 1)) / cols;
  const floorH = (h - padY * 2) / floors;

  for (let fl = 0; fl < floors; fl++) {
    const y0 = padY + fl * floorH;
    a.fillStyle = "#1b2436";
    a.fillRect(0, y0 + floorH - 3, w, 3);
    for (let c = 0; c < cols; c++) {
      const x = padX + c * (winW + gapX);
      const y = y0 + 4;
      const lit = rng() > 0.32;
      const warm = rng();
      if (lit) {
        const g = 170 + Math.floor(warm * 70);
        const b = 200 + Math.floor(warm * 55);
        a.fillStyle = `rgb(${g - 20},${g},${b})`;
        e.fillStyle = `rgb(${200 + warm * 55},${210 + warm * 45},${255})`;
      } else {
        a.fillStyle = rng() > 0.7 ? "#2a3348" : "#0a0e16";
        e.fillStyle = "#000000";
      }
      a.fillRect(x, y, winW, floorH - gapY);
      e.fillRect(x, y, winW, floorH - gapY);
    }
  }

  const albedo = new THREE.CanvasTexture(albedoC);
  albedo.wrapS = THREE.RepeatWrapping;
  albedo.wrapT = THREE.ClampToEdgeWrapping;
  albedo.anisotropy = 4;
  albedo.colorSpace = THREE.SRGBColorSpace;
  albedo.userData.shared = true;
  albedo.needsUpdate = true;

  const emissive = new THREE.CanvasTexture(emitC);
  emissive.wrapS = THREE.RepeatWrapping;
  emissive.wrapT = THREE.ClampToEdgeWrapping;
  emissive.anisotropy = 4;
  emissive.userData.shared = true;
  emissive.needsUpdate = true;

  return { albedo, emissive };
}

function lathe(pts, seg = 48) {
  return markShared(new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg));
}

function getShared() {
  if (shared) return shared;
  const windows = makeWindowTextures();
  shared = {
    windows,
    plinthLo: markShared(new THREE.CylinderGeometry(2.05, 2.18, 0.28, 32)),
    plinthHi: markShared(new THREE.CylinderGeometry(1.72, 1.9, 0.32, 32)),
    plinthRing: markShared(new THREE.TorusGeometry(1.95, 0.07, 8, 40)),
    shaft: markShared(new THREE.CylinderGeometry(1.02, 1.16, SHAFT_H, 32, 1, false)),
    rib: markShared(new THREE.BoxGeometry(0.08, SHAFT_H, 0.14)),
    collar: markShared(new THREE.CylinderGeometry(1.22, 1.18, 0.28, 24)),
    saucerTop: lathe([
      [0, 0.03],
      [0.32, 0.1],
      [0.68, 0.13],
      [0.92, 0.07],
      [1, 0],
    ]),
    saucerBot: lathe([
      [0, -0.02],
      [0.38, -0.11],
      [0.76, -0.15],
      [0.95, -0.07],
      [1, 0],
    ]),
    rim: markShared(new THREE.TorusGeometry(1, 0.055, 10, 48)),
    ringLight: markShared(new THREE.TorusGeometry(1, 0.03, 8, 40)),
    hub: markShared(new THREE.CylinderGeometry(1.2, 1.2, 0.18, 20)),
    strut: markShared(new THREE.BoxGeometry(1, 0.07, 0.07)),
    dome: markShared(new THREE.SphereGeometry(1.58, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2)),
    domeCore: markShared(new THREE.SphereGeometry(0.72, 20, 12)),
    domeRing: markShared(new THREE.TorusGeometry(1.5, 0.09, 10, 40)),
    neck: markShared(new THREE.CylinderGeometry(0.95, 1.12, 0.55, 24)),
    antenna: markShared(new THREE.CylinderGeometry(0.045, 0.085, 3.55, 10)),
    antennaRing: markShared(new THREE.TorusGeometry(0.16, 0.028, 8, 20)),
    antennaBall: markShared(new THREE.SphereGeometry(0.16, 14, 12)),
    antennaCone: markShared(new THREE.ConeGeometry(0.11, 0.42, 10)),
    fin: markShared(new THREE.BoxGeometry(0.06, 1.35, 0.55)),
  };
  return shared;
}

function metal(color, extra = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: extra.metalness ?? 0.42,
    roughness: extra.roughness ?? 0.4,
    envMapIntensity: 0.35,
    ...extra,
  });
}

function makeTint(mat, slot) {
  mat.userData.slot = slot;
  return mat;
}

export function createSciFiTower(color = IDLE) {
  const g = getShared();
  const root = new THREE.Group();
  root.name = "sci-fi-tower";
  root.frustumCulled = false;
  const tint = [];

  const silver = metal(0xc9d1dc, { roughness: 0.34, metalness: 0.48 });
  const silverDark = metal(0x6b7280, { roughness: 0.46, metalness: 0.38 });
  const chrome = metal(0xe5e7eb, { roughness: 0.26, metalness: 0.58 });
  const copper = makeTint(metal(0xc2410c, { roughness: 0.36, metalness: 0.72 }), "copper");
  tint.push(copper);

  const glass = makeTint(
    new THREE.MeshStandardMaterial({
      map: g.windows.albedo,
      color: 0x94a3b8,
      roughness: 0.16,
      metalness: 0.38,
      emissive: 0xa855f7,
      emissiveMap: g.windows.emissive,
      emissiveIntensity: 0.48,
    }),
    "glass"
  );
  tint.push(glass);

  const glow = makeTint(
    new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      emissive: 0xa855f7,
      emissiveIntensity: 0.95,
      roughness: 0.35,
      metalness: 0.2,
    }),
    "glow"
  );
  tint.push(glow);

  const domeMat = makeTint(metal(0xd1d5db, { roughness: 0.18, metalness: 0.9, emissive: 0x111111, emissiveIntensity: 0.35 }), "dome");
  tint.push(domeMat);

  const plinthLo = new THREE.Mesh(g.plinthLo, silverDark);
  plinthLo.position.y = 0.14;
  root.add(plinthLo);
  const plinthHi = new THREE.Mesh(g.plinthHi, silver);
  plinthHi.position.y = 0.42;
  root.add(plinthHi);
  const plinthRing = new THREE.Mesh(g.plinthRing, chrome);
  plinthRing.rotation.x = Math.PI / 2;
  plinthRing.position.y = 0.3;
  root.add(plinthRing);

  const shaft = new THREE.Mesh(g.shaft, glass);
  shaft.position.y = SHAFT_Y;
  root.add(shaft);

  for (let i = 0; i < 8; i++) {
    const rib = new THREE.Mesh(g.rib, silverDark);
    const ang = (i / 8) * Math.PI * 2;
    rib.position.set(Math.cos(ang) * 1.12, SHAFT_Y, Math.sin(ang) * 1.12);
    rib.rotation.y = -ang;
    root.add(rib);
  }

  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(g.fin, silverDark);
    const ang = (i / 4) * Math.PI * 2 + Math.PI / 8;
    fin.position.set(Math.cos(ang) * 1.45, 1.05, Math.sin(ang) * 1.45);
    fin.rotation.y = -ang;
    root.add(fin);
  }

  DISCS.forEach((d, idx) => {
    const top = new THREE.Mesh(g.saucerTop, idx === DISCS.length - 1 ? chrome : silver);
    top.position.y = d.y;
    top.scale.set(d.r, 1, d.r);
    root.add(top);

    const bot = new THREE.Mesh(g.saucerBot, copper);
    bot.position.y = d.y;
    bot.scale.set(d.r, 1, d.r);
    root.add(bot);

    const rim = new THREE.Mesh(g.rim, chrome);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = d.y;
    rim.scale.set(d.r, d.r, 1);
    root.add(rim);

    const ring = new THREE.Mesh(g.ringLight, glow);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = d.y - 0.04;
    ring.scale.set(d.r * 0.92, d.r * 0.92, 1);
    root.add(ring);

    const hub = new THREE.Mesh(g.hub, silverDark);
    hub.position.y = d.y;
    root.add(hub);

    const collar = new THREE.Mesh(g.collar, silver);
    collar.position.y = d.y + 0.22;
    root.add(collar);

    for (let k = 0; k < 4; k++) {
      const ang = (k / 4) * Math.PI * 2 + d.strutRot;
      const strut = new THREE.Mesh(g.strut, silverDark);
      const len = Math.max(0.6, d.r - 1.15);
      strut.scale.x = len;
      strut.position.set(Math.cos(ang) * (1.15 + len / 2), d.y - 0.16, Math.sin(ang) * (1.15 + len / 2));
      strut.rotation.y = -ang;
      root.add(strut);
    }
  });

  const neck = new THREE.Mesh(g.neck, silver);
  neck.position.y = 19.15;
  root.add(neck);

  const dome = new THREE.Mesh(g.dome, domeMat);
  dome.position.y = 19.42;
  root.add(dome);

  const domeCore = new THREE.Mesh(g.domeCore, glow);
  domeCore.position.y = 20.05;
  root.add(domeCore);

  const domeRing = new THREE.Mesh(g.domeRing, chrome);
  domeRing.rotation.x = Math.PI / 2;
  domeRing.position.y = 19.44;
  root.add(domeRing);

  const mast = new THREE.Mesh(g.antenna, silver);
  mast.position.y = 22.55;
  root.add(mast);

  const ball = new THREE.Mesh(g.antennaBall, glow);
  ball.position.y = 20.95;
  root.add(ball);

  for (const yy of [21.7, 22.55]) {
    const ar = new THREE.Mesh(g.antennaRing, chrome);
    ar.rotation.x = Math.PI / 2;
    ar.position.y = yy;
    root.add(ar);
  }

  const cone = new THREE.Mesh(g.antennaCone, glow);
  cone.position.y = 24.5;
  root.add(cone);

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
  const glassCol = c.clone().lerp(new THREE.Color(0x64748b), 0.42);
  const copperCol = new THREE.Color(0xc2410c).lerp(c, 0.16);
  const mats = group?.userData?.tint || [];
  for (const mat of mats) {
    const slot = mat.userData.slot;
    if (slot === "glass") {
      mat.color.copy(glassCol);
      mat.emissive.copy(c);
      mat.emissiveIntensity = 0.5;
    } else if (slot === "glow") {
      mat.color.copy(c);
      mat.emissive.copy(c);
      mat.emissiveIntensity = 0.95;
    } else if (slot === "copper") {
      mat.color.copy(copperCol);
    } else if (slot === "dome") {
      mat.emissive.copy(c).multiplyScalar(0.22);
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

/** Official Mapbox+Three model transform: T(mc) * scale(s,-s,s) * rotateX(PI/2). */
function makeModelL(out, lng, lat, alt) {
  const mc = mapboxgl.MercatorCoordinate.fromLngLat({ lng, lat }, alt);
  const s = mc.meterInMercatorCoordinateUnits();
  return out
    .makeTranslation(mc.x, mc.y, mc.z)
    .scale(new THREE.Vector3(s, -s, s))
    .multiply(ROT_X);
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
      { r: 2.35, base: 0, height: 18.6 },
      { r: 2.55, base: 3.25, height: 3.95 },
      { r: 2.15, base: 7.05, height: 7.75 },
      { r: 2.45, base: 10.9, height: 11.65 },
      { r: 2.1, base: 14.75, height: 15.45 },
      { r: 2.7, base: 18.35, height: 19.2 },
      { r: 1.65, base: 19.2, height: 20.55 },
      { r: 1.15, base: 20.55, height: 21.45 },
      { r: 0.65, base: 21.45, height: 22.15 },
      { r: 0.16, base: 22.15, height: 24.6 },
    ];
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

      // Official pattern: mesh stays identity at origin (Y-up meters);
      // camera.projectionMatrix = m * l. Identity view.
      this.camera.matrix.identity();
      this.camera.matrixWorld.identity();
      this.camera.matrixWorldInverse.identity();

      const records = [...this.byId.values()];
      for (const rec of records) rec.group.visible = false;

      for (const rec of records) {
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
