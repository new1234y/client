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

const SEG = 64;
const BASE_H = 1.42;
const SHAFT_H = 16.6;
const SHAFT_R_TOP = 0.58;
const SHAFT_R_BOT = 0.68;
const SHAFT_R_MID = (SHAFT_R_TOP + SHAFT_R_BOT) / 2;
const SHAFT_Y = BASE_H + SHAFT_H / 2;
const SAUCER_Y = 4.2;
const RING_YS = [8.2, 11.9, 15.6];
const RING_R = 1.48;
const RING_TUBE = 0.055;
const STRUT_LEN = RING_R - RING_TUBE - SHAFT_R_MID;
const STRUT_MID = SHAFT_R_MID + STRUT_LEN / 2;
const CAP_Y = BASE_H + SHAFT_H;
const CAP_H = 2.74;
const SPIRE_H = 2.55;
const TIP_H = 0.42;
const TOWER_H = CAP_Y + CAP_H + SPIRE_H + TIP_H;

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
    // One thick UFO saucer with a hole around the shaft (no coplanar stacks).
    saucer: lathe([
      [0.74, -0.2],
      [1.05, -0.36],
      [1.5, -0.32],
      [1.95, -0.16],
      [2.16, -0.04],
      [2.22, 0.0],
      [2.16, 0.06],
      [1.95, 0.18],
      [1.5, 0.34],
      [1.05, 0.4],
      [0.74, 0.24],
      [0.74, -0.2],
    ]),
    ring: markShared(new THREE.TorusGeometry(RING_R, RING_TUBE, 16, SEG)),
    strut: markShared(new THREE.CylinderGeometry(0.026, 0.026, STRUT_LEN, 10)),
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
    spire: markShared(new THREE.CylinderGeometry(0.045, 0.07, SPIRE_H, 16)),
    tip: markShared(new THREE.ConeGeometry(0.09, TIP_H, 16)),
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

export function createSciFiTower(color = IDLE) {
  const g = getShared();
  const root = new THREE.Group();
  root.name = "sci-fi-tower";
  root.frustumCulled = false;
  const tint = [];

  const silver = metal(0xc5ccd6, { roughness: 0.34, metalness: 0.72 });
  const chrome = metal(0xe4e9ef, { roughness: 0.2, metalness: 0.88 });
  const copper = makeTint(metal(0xb87333, { roughness: 0.38, metalness: 0.78 }), "copper");
  tint.push(copper);

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

  const shaft = new THREE.Mesh(g.shaft, silver);
  shaft.position.y = SHAFT_Y;
  root.add(shaft);

  const saucer = new THREE.Mesh(g.saucer, copper);
  saucer.position.y = SAUCER_Y;
  root.add(saucer);

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
    } else if (slot === "copper") {
      mat.color.copy(copperCol);
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
      { r: 2.42, base: 0, height: 1.4 },
      { r: 0.68, base: 1.35, height: 18.05 },
      { r: 2.22, base: 3.78, height: 4.62 },
      { r: 1.54, base: 8.12, height: 8.26 },
      { r: 1.54, base: 11.82, height: 11.96 },
      { r: 1.54, base: 15.52, height: 15.66 },
      { r: 1.58, base: 18.0, height: 20.8 },
      { r: 0.12, base: 20.7, height: 23.8 },
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
