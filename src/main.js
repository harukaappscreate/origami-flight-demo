import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const canvasHost = document.body;
const speedReadout = document.querySelector("#speed");
const altitudeReadout = document.querySelector("#altitude");
const windReadout = document.querySelector("#wind");
const biomeReadout = document.querySelector("#biome");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa7d3e5);
scene.fog = new THREE.Fog(0xa7d3e5, 42, 210);

const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 450);
camera.position.set(0, 6.5, 12);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
canvasHost.appendChild(renderer.domElement);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new OutputPass());

const sun = new THREE.DirectionalLight(0xfff5da, 3.2);
sun.position.set(-18, 28, 14);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -55;
sun.shadow.camera.right = 55;
sun.shadow.camera.top = 55;
sun.shadow.camera.bottom = -55;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 110;
scene.add(sun);

const toonPalette = {
  sand: new THREE.Color(0xe8bd89),
  sandLight: new THREE.Color(0xf1d09c),
  rock: new THREE.Color(0xd79f74),
  skyRock: new THREE.Color(0xc79586),
  meadow: new THREE.Color(0x94b979),
  meadowLight: new THREE.Color(0xb9d59b),
  bark: new THREE.Color(0x8d654a),
  barkDark: new THREE.Color(0x664838),
  leaf: new THREE.Color(0x547a56),
  leafLight: new THREE.Color(0x8eb36f),
  leafDark: new THREE.Color(0x3f6549),
  ink: new THREE.Color(0x4f3836),
  purpleShadow: new THREE.Color(0x6c57b7),
  turbulence: new THREE.Color(0xffffff),
  turbulenceHot: new THREE.Color(0xfff0a8),
  thrustCore: new THREE.Color(0xffffff),
  thrustEdge: new THREE.Color(0xbce9ff),
  sunsetCloud: new THREE.Color(0xffefe4),
  sunsetCloudPink: new THREE.Color(0xf6b8b4),
  sunDisk: new THREE.Color(0xffc76e),
  moonDisk: new THREE.Color(0xf7f2d8),
  starBlue: new THREE.Color(0xb9ddff),
  nightCloud: new THREE.Color(0x8896c5),
  nightRock: new THREE.Color(0x6c6f9c),
  paper: new THREE.Color(0xe8e3dc),
  paperDark: new THREE.Color(0xaab0b5)
};

const boilingLines = [];

function randomJitterVector(scale) {
  return new THREE.Vector3(
    (Math.random() - 0.5) * scale,
    (Math.random() - 0.5) * scale,
    (Math.random() - 0.5) * scale
  );
}

function extractEdgePairs(geometry, angle = 12) {
  const edges = new THREE.EdgesGeometry(geometry, angle);
  const array = edges.attributes.position.array;
  const pairs = [];
  for (let i = 0; i < array.length; i += 6) {
    pairs.push([
      new THREE.Vector3(array[i], array[i + 1], array[i + 2]),
      new THREE.Vector3(array[i + 3], array[i + 4], array[i + 5])
    ]);
  }
  edges.dispose();
  return pairs;
}

function sketchStrokeArray(pairs, jitter, passes, subdivisions) {
  const values = [];
  for (let pass = 0; pass < passes; pass += 1) {
    for (const [a, b] of pairs) {
      const wobble = Math.min(jitter, a.distanceTo(b) * 0.18);
      let prev = a.clone().add(randomJitterVector(wobble * 0.7));
      for (let s = 1; s <= subdivisions; s += 1) {
        const t = s / subdivisions;
        const endFactor = s === subdivisions ? 0.7 : 1.3;
        const next = a.clone().lerp(b, t).add(randomJitterVector(wobble * endFactor));
        values.push(prev.x, prev.y, prev.z, next.x, next.y, next.z);
        prev = next;
      }
    }
  }
  return new Float32Array(values);
}

function createSketchyLine(pairs, material, { jitter = 0.05, passes = 2, subdivisions = 3, boil = false } = {}) {
  const geometry = new THREE.BufferGeometry();
  const first = sketchStrokeArray(pairs, jitter, passes, subdivisions);
  geometry.setAttribute("position", new THREE.BufferAttribute(first, 3));
  const line = new THREE.LineSegments(geometry, material);
  if (boil) {
    const variants = [first];
    for (let v = 1; v < 3; v += 1) variants.push(sketchStrokeArray(pairs, jitter, passes, subdivisions));
    line.userData.variants = variants;
    boilingLines.push(line);
  }
  return line;
}

function sketchyEdgesFor(mesh, angle, material, jitter) {
  const line = createSketchyLine(extractEdgePairs(mesh.geometry, angle), material, { jitter });
  line.position.copy(mesh.position);
  line.rotation.copy(mesh.rotation);
  line.scale.copy(mesh.scale);
  return line;
}

function createNotebookPaperTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#f8f3ea";
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 1500; i += 1) {
    ctx.fillStyle = `rgba(96, 74, 58, ${0.015 + Math.random() * 0.05})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1.4, 1.4);
  }

  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(96, 140, 190, 0.5)";
  for (let y = 34; y < 256; y += 34) {
    ctx.beginPath();
    ctx.moveTo(0, y + (Math.random() - 0.5) * 1.6);
    for (let x = 32; x <= 256; x += 32) {
      ctx.lineTo(x, y + (Math.random() - 0.5) * 1.8);
    }
    ctx.stroke();
  }

  ctx.lineWidth = 2.2;
  ctx.strokeStyle = "rgba(208, 108, 108, 0.5)";
  ctx.beginPath();
  ctx.moveTo(30 + (Math.random() - 0.5) * 2, 0);
  for (let y = 32; y <= 256; y += 32) {
    ctx.lineTo(30 + (Math.random() - 0.5) * 2.4, y);
  }
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createScribbleShadowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 256, 128);
  ctx.strokeStyle = "#ffffff";
  ctx.lineCap = "round";

  ctx.lineWidth = 5;
  for (let i = 0; i < 26; i += 1) {
    const t = i / 25;
    const cx = 26 + t * 204;
    const half = Math.sqrt(Math.max(0, 1 - ((t - 0.5) * 2) ** 2)) * 46;
    ctx.globalAlpha = 0.4 + Math.random() * 0.45;
    ctx.beginPath();
    ctx.moveTo(cx - 9 + Math.random() * 6, 64 - half + Math.random() * 10);
    ctx.lineTo(cx + 9 + Math.random() * 6, 64 + half - Math.random() * 10);
    ctx.stroke();
  }

  ctx.lineWidth = 3;
  for (let pass = 0; pass < 2; pass += 1) {
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    for (let i = 0; i <= 30; i += 1) {
      const angle = (i / 30) * Math.PI * 2;
      const x = 128 + Math.cos(angle) * (100 + (Math.random() - 0.5) * 8);
      const y = 64 + Math.sin(angle) * (48 + (Math.random() - 0.5) * 6);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

const notebookTexture = createNotebookPaperTexture();
const scribbleShadowTexture = createScribbleShadowTexture();

function makeToonMaterial(color, levels = 4) {
  const material = new THREE.MeshToonMaterial({ color });
  const gradient = new Uint8Array(levels);
  for (let i = 0; i < levels; i += 1) gradient[i] = Math.floor((i / (levels - 1)) * 255);
  const texture = new THREE.DataTexture(gradient, levels, 1, THREE.RedFormat);
  texture.needsUpdate = true;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  material.gradientMap = texture;
  return material;
}

const materials = {
  sand: makeToonMaterial(toonPalette.sand, 5),
  rock: makeToonMaterial(toonPalette.rock, 4),
  skyRock: makeToonMaterial(toonPalette.skyRock, 4),
  meadow: makeToonMaterial(toonPalette.meadow, 5),
  bark: makeToonMaterial(toonPalette.bark, 4),
  barkDark: makeToonMaterial(toonPalette.barkDark, 4),
  leaf: makeToonMaterial(toonPalette.leaf, 4),
  leafLight: makeToonMaterial(toonPalette.leafLight, 4),
  leafDark: makeToonMaterial(toonPalette.leafDark, 3),
  ink: new THREE.LineBasicMaterial({ color: toonPalette.ink, transparent: true, opacity: 0.5 }),
  foldInk: new THREE.LineBasicMaterial({ color: toonPalette.ink, transparent: true, opacity: 0.26 }),
  leafInk: new THREE.LineBasicMaterial({ color: toonPalette.ink, transparent: true, opacity: 0.34 }),
  grassInk: new THREE.LineBasicMaterial({ color: toonPalette.ink, transparent: true, opacity: 0.42 }),
  turbulenceInk: new THREE.LineBasicMaterial({ color: toonPalette.turbulence, transparent: true, opacity: 0.52 }),
  thrustCore: new THREE.LineBasicMaterial({ color: toonPalette.thrustCore, transparent: true, opacity: 0.72 }),
  thrustEdge: new THREE.LineBasicMaterial({ color: toonPalette.thrustEdge, transparent: true, opacity: 0.6 }),
  thrustSketch: new THREE.LineBasicMaterial({ color: toonPalette.thrustCore, transparent: true, opacity: 0.5 }),
  thrustParticle: new THREE.MeshBasicMaterial({
    color: toonPalette.thrustCore,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    depthTest: false
  }),
  thrustWash: new THREE.MeshBasicMaterial({
    color: toonPalette.thrustEdge,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide
  }),
  thrustWashCore: new THREE.MeshBasicMaterial({
    color: toonPalette.thrustCore,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide
  }),
  purpleShadow: new THREE.MeshBasicMaterial({
    color: toonPalette.purpleShadow,
    transparent: true,
    opacity: 0.55,
    alphaMap: scribbleShadowTexture,
    depthWrite: false
  }),
  paperTop: makeToonMaterial(new THREE.Color(0xfefcf8), 4),
  paperSide: makeToonMaterial(new THREE.Color(0xb2b8bd), 3),
  cloud: new THREE.MeshBasicMaterial({ color: 0xf4eee9, transparent: true, opacity: 0.88 }),
  sunsetCloud: new THREE.MeshBasicMaterial({ color: toonPalette.sunsetCloud, transparent: true, opacity: 0.82, depthWrite: false }),
  sunsetCloudPink: new THREE.MeshBasicMaterial({ color: toonPalette.sunsetCloudPink, transparent: true, opacity: 0.36, depthWrite: false }),
  sunDisk: new THREE.MeshBasicMaterial({ color: toonPalette.sunDisk, transparent: true, opacity: 0.9, depthWrite: false }),
  sunGlow: new THREE.MeshBasicMaterial({ color: toonPalette.sunDisk, transparent: true, opacity: 0.16, depthWrite: false }),
  moonDisk: new THREE.MeshBasicMaterial({ color: toonPalette.moonDisk, transparent: true, opacity: 0.95, depthWrite: false }),
  moonGlow: new THREE.MeshBasicMaterial({ color: toonPalette.starBlue, transparent: true, opacity: 0.13, depthWrite: false }),
  star: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false }),
  starBlue: new THREE.MeshBasicMaterial({ color: toonPalette.starBlue, transparent: true, opacity: 0.74, depthWrite: false }),
  nightCloud: new THREE.MeshBasicMaterial({ color: toonPalette.nightCloud, transparent: true, opacity: 0.34, depthWrite: false }),
  nightRock: makeToonMaterial(toonPalette.nightRock, 4)
};

for (const material of [materials.leaf, materials.leafLight, materials.leafDark]) {
  material.side = THREE.DoubleSide;
}

materials.paperTop.map = notebookTexture;
materials.paperSide.map = notebookTexture;
materials.paperTop.side = THREE.DoubleSide;
materials.paperTop.needsUpdate = true;
materials.paperSide.needsUpdate = true;

const biomes = [
  {
    name: "砂漠",
    sky: new THREE.Color(0xa7d3e5),
    fog: new THREE.Color(0xa7d3e5),
    fogNear: 42,
    fogFar: 210,
    sun: new THREE.Color(0xfff5da),
    hemiSky: new THREE.Color(0xbbe7ff),
    hemiGround: new THREE.Color(0xc49d7d),
    create: createDesertScene
  },
  {
    name: "森",
    sky: new THREE.Color(0xb9d8cc),
    fog: new THREE.Color(0xb9d8cc),
    fogNear: 26,
    fogFar: 145,
    sun: new THREE.Color(0xfff0bf),
    hemiSky: new THREE.Color(0xc7eadf),
    hemiGround: new THREE.Color(0x6e855d),
    create: createForestScene
  },
  {
    name: "雲海",
    sky: new THREE.Color(0xf2b6a7),
    fog: new THREE.Color(0xf7c7b4),
    fogNear: 34,
    fogFar: 185,
    sun: new THREE.Color(0xffd08a),
    hemiSky: new THREE.Color(0xffd8bf),
    hemiGround: new THREE.Color(0x9f7ab6),
    create: createCloudSeaScene
  },
  {
    name: "星空",
    sky: new THREE.Color(0x14182f),
    fog: new THREE.Color(0x26294c),
    fogNear: 44,
    fogFar: 190,
    sun: new THREE.Color(0xb8d4ff),
    hemiSky: new THREE.Color(0x3c4f8a),
    hemiGround: new THREE.Color(0x161827),
    create: createStarryNightScene
  }
];

const hemi = new THREE.HemisphereLight(0xbbe7ff, 0xc49d7d, 2.2);
scene.add(hemi);

const world = new THREE.Group();
scene.add(world);
let currentBiomeIndex = 0;
let currentWorld = null;
applyBiome(0);

const plane = createPaperPlane();
scene.add(plane.group);

const rings = createWindRings();
scene.add(rings);

const state = {
  velocity: new THREE.Vector3(0, 0, -0.46),
  speed: 0.54,
  yaw: 0,
  pitch: 0,
  roll: 0,
  liftPulse: 0,
  turbulenceBoost: 0,
  turbulenceFlash: 0,
  turbulenceCooldown: 0,
  thrustVisual: 0,
  target: new THREE.Vector3(),
  camTarget: new THREE.Vector3(),
  lastTime: performance.now(),
  elapsed: 0
};

const keys = new Set();
addEventListener("keydown", (event) => {
  keys.add(event.code);
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) {
    event.preventDefault();
  }
});
addEventListener("keyup", (event) => keys.delete(event.code));
addEventListener("resize", resize);

// Mobile detection and Touch Controls
const isMobileDevice = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.location.search.includes("control=mobile");
if (isMobileDevice) {
  document.body.classList.add("is-mobile");
}

const mobileInput = {
  turn: 0,
  climb: 0,
  boost: 0
};

if (isMobileDevice) {
  const joystickContainer = document.getElementById("joystick-container");
  const joystickKnob = document.getElementById("joystick-knob");
  const boostButton = document.getElementById("boost-button");

  let joystickActive = false;
  let joystickCenter = { x: 0, y: 0 };
  const maxDistance = 40; // max knob offset in pixels

  // Joystick touch/pointer handlers
  joystickContainer.addEventListener("pointerdown", (e) => {
    joystickActive = true;
    joystickContainer.setPointerCapture(e.pointerId);
    
    // Set center relative to joystick-container
    const rect = joystickContainer.getBoundingClientRect();
    joystickCenter = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
    
    updateJoystick(e);
  });

  joystickContainer.addEventListener("pointermove", (e) => {
    if (!joystickActive) return;
    updateJoystick(e);
  });

  const resetJoystick = (e) => {
    if (!joystickActive) return;
    joystickActive = false;
    if (e) joystickContainer.releasePointerCapture(e.pointerId);
    
    // Reset inputs
    mobileInput.turn = 0;
    mobileInput.climb = 0;
    
    // Reset knob position
    joystickKnob.style.transform = `translate(0px, 0px)`;
  };

  joystickContainer.addEventListener("pointerup", resetJoystick);
  joystickContainer.addEventListener("pointercancel", resetJoystick);

  function updateJoystick(e) {
    const dx = e.clientX - joystickCenter.x;
    const dy = e.clientY - joystickCenter.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    let angle = Math.atan2(dy, dx);
    let clampedDistance = Math.min(distance, maxDistance);
    
    const targetX = Math.cos(angle) * clampedDistance;
    const targetY = Math.sin(angle) * clampedDistance;
    
    joystickKnob.style.transform = `translate(${targetX}px, ${targetY}px)`;
    
    // Normalize coordinates to [-1, 1]
    const nx = targetX / maxDistance; // right: positive, left: negative
    const ny = targetY / maxDistance; // down: positive, up: negative
    
    // Map to control inputs:
    // Left: turn > 0, Right: turn < 0
    // Up: climb > 0, Down: climb < 0
    mobileInput.turn = -nx;
    mobileInput.climb = -ny;
  }

  // Boost Button handlers
  const startBoost = (e) => {
    mobileInput.boost = 1;
    if (e.cancelable) e.preventDefault();
  };
  
  const endBoost = (e) => {
    mobileInput.boost = 0;
    if (e.cancelable) e.preventDefault();
  };

  boostButton.addEventListener("pointerdown", startBoost);
  boostButton.addEventListener("pointerup", endBoost);
  boostButton.addEventListener("pointercancel", endBoost);
  
  // Also hook touch events explicitly to prevent zoom/scroll default behaviors on iOS
  boostButton.addEventListener("touchstart", startBoost, { passive: false });
  boostButton.addEventListener("touchend", endBoost, { passive: false });
  boostButton.addEventListener("touchcancel", endBoost, { passive: false });
}

renderer.setAnimationLoop(tick);

function createDesertScene() {
  const group = new THREE.Group();
  group.add(createGround());
  group.add(createHorizon());
  group.add(createClouds());
  return group;
}

function createGround() {
  const group = new THREE.Group();

  const geometry = new THREE.PlaneGeometry(300, 980, 90, 220);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    const ripple = Math.sin(x * 0.09 + z * 0.03) * 0.34 + Math.sin(x * 0.025 - z * 0.04) * 0.28;
    positions.setY(i, ripple);
  }
  geometry.computeVertexNormals();

  const mesh = new THREE.Mesh(geometry, materials.sand);
  mesh.receiveShadow = true;
  mesh.position.z = -250;
  group.add(mesh);

  const lineMaterial = materials.ink;
  for (let i = 0; i < 140; i += 1) {
    const z = -12 - Math.random() * 310;
    const x = (Math.random() - 0.5) * 110;
    const length = 1 + Math.random() * 4.8;
    const bend = (Math.random() - 0.5) * 1.1;
    const drift = (Math.random() - 0.5) * 1.2;
    const points = [];
    for (let s = 0; s <= 4; s += 1) {
      const t = s / 4;
      points.push(
        new THREE.Vector3(
          x + length * t,
          0.06,
          z + Math.sin(t * Math.PI) * bend + drift * t + (Math.random() - 0.5) * 0.1
        )
      );
    }
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMaterial));
  }

  for (let i = 0; i < 34; i += 1) {
    const pebble = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.18 + Math.random() * 0.32, 0),
      materials.rock
    );
    pebble.position.set((Math.random() - 0.5) * 72, 0.24, -8 - Math.random() * 160);
    pebble.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    pebble.scale.y = 0.45;
    pebble.castShadow = true;
    group.add(pebble);
    group.add(sketchyEdgesFor(pebble, 22, materials.foldInk, 0.045));
  }

  return group;
}

function createHorizon() {
  const group = new THREE.Group();
  const rockMaterial = materials.rock;
  const ink = materials.ink;

  for (let i = 0; i < 28; i += 1) {
    const width = 4 + Math.random() * 12;
    const height = 3 + Math.random() * 13;
    const depth = 4 + Math.random() * 7;
    const geometry = new THREE.BoxGeometry(width, height, depth, 1, 3, 1);
    const pos = geometry.attributes.position;
    for (let p = 0; p < pos.count; p += 1) {
      pos.setX(p, pos.getX(p) + (Math.random() - 0.5) * 0.36);
      pos.setY(p, pos.getY(p) + (Math.random() - 0.5) * 0.42);
      pos.setZ(p, pos.getZ(p) + (Math.random() - 0.5) * 0.36);
    }
    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(geometry, rockMaterial);
    const side = i % 2 === 0 ? -1 : 1;
    mesh.position.set(side * (38 + Math.random() * 42), height * 0.5 - 0.2, -70 - Math.random() * 180);
    mesh.rotation.y = (Math.random() - 0.5) * 0.42;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    group.add(sketchyEdgesFor(mesh, 20, ink, 0.16));
  }

  for (let i = 0; i < 6; i += 1) {
    const tree = new THREE.Group();
    const trunk = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0.2, 5 + Math.random() * 6, 0)
      ]),
      ink
    );
    tree.add(trunk);
    for (let b = 0; b < 6; b += 1) {
      const y = 2 + Math.random() * 7;
      const branch = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0.1, y, 0),
          new THREE.Vector3((Math.random() - 0.5) * 5, y + Math.random() * 2, 0)
        ]),
        ink
      );
      tree.add(branch);
    }
    tree.position.set((i % 2 === 0 ? -1 : 1) * (44 + Math.random() * 38), 0.1, -35 - i * 26);
    tree.rotation.y = Math.random() * Math.PI;
    group.add(tree);
  }

  return group;
}

function createClouds() {
  const group = new THREE.Group();
  for (let i = 0; i < 16; i += 1) {
    const cloud = new THREE.Mesh(new THREE.TetrahedronGeometry(0.8 + Math.random() * 1.5, 1), materials.cloud);
    cloud.position.set((Math.random() - 0.5) * 120, 20 + Math.random() * 22, -25 - Math.random() * 190);
    cloud.rotation.set(Math.random(), Math.random(), Math.random());
    cloud.scale.set(1.7, 0.22, 0.6);
    group.add(cloud);
  }
  return group;
}

function createForestScene() {
  const group = new THREE.Group();
  group.add(createForestGround());
  group.add(createForestHorizon());
  group.add(createForestCanopy());
  group.add(createClouds());
  return group;
}

function createForestGround() {
  const group = new THREE.Group();
  const geometry = new THREE.PlaneGeometry(300, 980, 90, 220);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position;

  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    const mound = Math.sin(x * 0.055 + z * 0.025) * 0.52 + Math.sin(x * 0.15 - z * 0.04) * 0.16;
    positions.setY(i, mound);
  }

  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, materials.meadow);
  mesh.receiveShadow = true;
  mesh.position.z = -250;
  group.add(mesh);

  for (let i = 0; i < 190; i += 1) {
    const z = -10 - Math.random() * 330;
    const x = (Math.random() - 0.5) * 120;
    const height = 0.28 + Math.random() * 0.4;
    const sway = (Math.random() - 0.5) * 0.3;
    const points = [
      new THREE.Vector3(x - 0.14 - Math.random() * 0.1, 0.04, z + (Math.random() - 0.5) * 0.1),
      new THREE.Vector3(x + sway * 0.5, height, z - 0.05),
      new THREE.Vector3(x + 0.05 + sway, 0.05, z + 0.06),
      new THREE.Vector3(x + 0.16 + sway * 1.4, height * (0.6 + Math.random() * 0.5), z - 0.04)
    ];
    const stem = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), materials.grassInk);
    group.add(stem);
  }

  for (let i = 0; i < 46; i += 1) {
    const leaf = new THREE.Mesh(new THREE.TetrahedronGeometry(0.18 + Math.random() * 0.24, 0), materials.leafLight);
    leaf.position.set((Math.random() - 0.5) * 76, 0.18, -8 - Math.random() * 190);
    leaf.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    leaf.scale.set(1.8, 0.22, 0.8);
    group.add(leaf);
  }

  return group;
}

function createForestHorizon() {
  const group = new THREE.Group();

  for (let i = 0; i < 36; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    const lane = 16 + Math.random() * 64;
    const z = -28 - Math.random() * 245;
    const height = 6 + Math.random() * 15;
    const tree = createForestTree(height, 1.4 + Math.random() * 1.5);
    tree.position.set(side * lane, 0, z);
    tree.rotation.y = Math.random() * Math.PI;
    tree.scale.setScalar(0.8 + Math.random() * 0.8);
    group.add(tree);
  }

  for (let i = 0; i < 22; i += 1) {
    const backTree = createForestTree(10 + Math.random() * 13, 2.1 + Math.random() * 2.2);
    backTree.position.set((Math.random() - 0.5) * 120, -0.2, -120 - Math.random() * 150);
    backTree.scale.setScalar(1.1 + Math.random() * 0.75);
    group.add(backTree);
  }

  return group;
}

function createForestTree(height, crownSize) {
  const tree = new THREE.Group();
  const lean = new THREE.Vector2((Math.random() - 0.5) * 0.7, (Math.random() - 0.5) * 0.45);
  const trunkGeometry = createCrookedTrunkGeometry(height, 0.24 + crownSize * 0.07, 0.46 + crownSize * 0.08, lean);
  const trunk = new THREE.Mesh(trunkGeometry, Math.random() > 0.38 ? materials.bark : materials.barkDark);
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  tree.add(trunk);

  tree.add(sketchyEdgesFor(trunk, 14, materials.ink, 0.06));

  const branchCount = 3 + Math.floor(Math.random() * 4);
  for (let i = 0; i < branchCount; i += 1) {
    const y = height * (0.34 + Math.random() * 0.44);
    const side = i % 2 === 0 ? -1 : 1;
    const branch = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(lean.x * (y / height) * 0.75, y, lean.y * (y / height) * 0.75),
        new THREE.Vector3(side * (0.7 + Math.random() * crownSize), y + 0.6 + Math.random() * 1.2, (Math.random() - 0.5) * crownSize)
      ]),
      materials.ink
    );
    tree.add(branch);
  }

  const crownY = height + crownSize * 0.15;
  const clusterCount = 5 + Math.floor(Math.random() * 4);
  for (let i = 0; i < clusterCount; i += 1) {
    const cluster = createLeafCluster(crownSize * (0.86 + Math.random() * 0.56), 6 + Math.floor(Math.random() * 3));
    const angle = (i / clusterCount) * Math.PI * 2 + Math.random() * 0.45;
    const radius = i === 0 ? 0 : crownSize * (0.22 + Math.random() * 0.48);
    cluster.position.set(
      lean.x + Math.cos(angle) * radius,
      crownY + (Math.random() - 0.35) * crownSize * 0.8 + (i % 3) * crownSize * 0.28,
      lean.y + Math.sin(angle) * radius * 0.62
    );
    cluster.rotation.set((Math.random() - 0.5) * 0.28, Math.random() * Math.PI, (Math.random() - 0.5) * 0.18);
    tree.add(cluster);
  }

  return tree;
}

function createCrookedTrunkGeometry(height, topRadius, baseRadius, lean) {
  const sides = 6;
  const rings = 5;
  const vertices = [];
  const indices = [];

  for (let yIndex = 0; yIndex <= rings; yIndex += 1) {
    const t = yIndex / rings;
    const y = height * t;
    const radius = THREE.MathUtils.lerp(baseRadius, topRadius, t) * (1 + Math.sin(t * Math.PI * 2.3) * 0.08);
    const bendX = lean.x * t + Math.sin(t * Math.PI * 1.7) * 0.18;
    const bendZ = lean.y * t + Math.cos(t * Math.PI * 1.3) * 0.12;

    for (let side = 0; side < sides; side += 1) {
      const angle = (side / sides) * Math.PI * 2 + t * 0.38;
      const wobble = 1 + Math.sin(side * 1.7 + height) * 0.12;
      vertices.push(
        bendX + Math.cos(angle) * radius * wobble,
        y,
        bendZ + Math.sin(angle) * radius * (1.08 - t * 0.22)
      );
    }
  }

  for (let yIndex = 0; yIndex < rings; yIndex += 1) {
    for (let side = 0; side < sides; side += 1) {
      const next = (side + 1) % sides;
      const a = yIndex * sides + side;
      const b = yIndex * sides + next;
      const c = (yIndex + 1) * sides + side;
      const d = (yIndex + 1) * sides + next;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createLeafCluster(size, sides) {
  const group = new THREE.Group();
  const materialChoices = [materials.leaf, materials.leafLight, materials.leafDark];
  const patchCount = 3 + Math.floor(Math.random() * 3);

  for (let patch = 0; patch < patchCount; patch += 1) {
    const geometry = createLeafPatchGeometry(size * (0.78 + Math.random() * 0.28), sides);
    const mesh = new THREE.Mesh(geometry, materialChoices[(patch + Math.floor(Math.random() * 3)) % materialChoices.length]);
    mesh.position.set((Math.random() - 0.5) * size * 0.35, (Math.random() - 0.5) * size * 0.18, (Math.random() - 0.5) * size * 0.32);
    mesh.rotation.set((Math.random() - 0.5) * 0.18, (Math.random() - 0.5) * 0.34, (Math.random() - 0.5) * 0.52);
    mesh.scale.y = 0.82 + Math.random() * 0.38;
    mesh.castShadow = true;
    group.add(mesh);

    const ink = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(geometry.userData.outline), materials.leafInk);
    ink.position.copy(mesh.position);
    ink.rotation.copy(mesh.rotation);
    ink.scale.copy(mesh.scale);
    group.add(ink);
  }

  return group;
}

function createLeafPatchGeometry(size, sides) {
  const vertices = [0, 0, 0];
  const indices = [];
  const outline = [];
  const pointCount = Math.max(5, sides);

  for (let i = 0; i < pointCount; i += 1) {
    const angle = (i / pointCount) * Math.PI * 2;
    const radius = size * (0.62 + Math.random() * 0.48);
    const x = Math.cos(angle) * radius * (1 + Math.sin(angle * 2) * 0.18);
    const y = Math.sin(angle) * radius * (0.62 + Math.random() * 0.18);
    const z = (Math.random() - 0.5) * size * 0.12;
    vertices.push(x, y, z);
    outline.push(new THREE.Vector3(x, y, z + 0.01));
  }

  for (let i = 1; i <= pointCount; i += 1) {
    const next = i === pointCount ? 1 : i + 1;
    indices.push(0, i, next);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.userData.outline = outline;
  return geometry;
}

function createForestCanopy() {
  const group = new THREE.Group();
  for (let i = 0; i < 22; i += 1) {
    const leafPatch = new THREE.Mesh(new THREE.TetrahedronGeometry(1.2 + Math.random() * 2.2, 1), materials.leafLight);
    leafPatch.position.set((Math.random() - 0.5) * 110, 22 + Math.random() * 12, -22 - Math.random() * 180);
    leafPatch.rotation.set(Math.random(), Math.random(), Math.random());
    leafPatch.scale.set(2.1, 0.44, 1);
    group.add(leafPatch);
  }
  return group;
}

function createCloudSeaScene() {
  const group = new THREE.Group();
  group.add(createSunsetBackdrop());
  group.add(createCloudSea());
  group.add(createFloatingIslands());
  group.add(createSunsetCloudWisps());
  return group;
}

function createSunsetBackdrop() {
  const group = new THREE.Group();
  const sunDisk = new THREE.Mesh(new THREE.CircleGeometry(13, 64), materials.sunDisk);
  sunDisk.position.set(34, 26, -150);
  sunDisk.rotation.y = 0.08;
  group.add(sunDisk);

  const glow = new THREE.Mesh(new THREE.CircleGeometry(29, 64), materials.sunGlow);
  glow.position.copy(sunDisk.position).add(new THREE.Vector3(0, 0, 0.6));
  glow.rotation.copy(sunDisk.rotation);
  group.add(glow);

  const rayPairs = [];
  const rayCount = 15;
  for (let i = 0; i < rayCount; i += 1) {
    const angle = (i / rayCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.24;
    const inner = 15.5 + Math.random() * 1.8;
    const outer = inner + 2.6 + Math.random() * 3.4;
    rayPairs.push([
      new THREE.Vector3(Math.cos(angle) * inner, Math.sin(angle) * inner, 0),
      new THREE.Vector3(Math.cos(angle) * outer, Math.sin(angle) * outer, 0)
    ]);
  }
  const rays = createSketchyLine(
    rayPairs,
    new THREE.LineBasicMaterial({ color: toonPalette.sunDisk, transparent: true, opacity: 0.55 }),
    { jitter: 0.4, subdivisions: 3 }
  );
  rays.position.copy(sunDisk.position).add(new THREE.Vector3(0, 0, 0.3));
  rays.rotation.copy(sunDisk.rotation);
  group.add(rays);

  for (let i = 0; i < 18; i += 1) {
    const y = 8 + Math.random() * 20;
    const z = -55 - Math.random() * 160;
    const x = -62 + Math.random() * 120;
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, y, z),
        new THREE.Vector3(x + 8 + Math.random() * 24, y + (Math.random() - 0.5) * 1.2, z - Math.random() * 3)
      ]),
      materials.turbulenceInk
    );
    line.material.opacity = 0.22;
    group.add(line);
  }

  return group;
}

function createCloudSea() {
  const group = new THREE.Group();

  for (let i = 0; i < 86; i += 1) {
    const cloud = createCloudPuff(2.8 + Math.random() * 5.8, i % 4 === 0 ? materials.sunsetCloudPink : materials.sunsetCloud);
    cloud.position.set((Math.random() - 0.5) * 145, -2.6 + Math.random() * 3.2, -12 - Math.random() * 250);
    cloud.rotation.set((Math.random() - 0.5) * 0.16, Math.random() * Math.PI, (Math.random() - 0.5) * 0.16);
    cloud.scale.set(1.7 + Math.random() * 2.8, 0.26 + Math.random() * 0.18, 0.72 + Math.random() * 0.5);
    group.add(cloud);
  }

  for (let i = 0; i < 24; i += 1) {
    const x = (Math.random() - 0.5) * 130;
    const z = -20 - Math.random() * 220;
    const length = 2.4 + Math.random() * 7;
    const rim = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, 0.08, z),
        new THREE.Vector3(x + length, 0.08, z + (Math.random() - 0.5) * 1.8)
      ]),
      materials.leafInk
    );
    rim.material.opacity = 0.22;
    group.add(rim);
  }

  return group;
}

function createCloudPuff(size, material) {
  const group = new THREE.Group();
  const count = 3 + Math.floor(Math.random() * 4);
  for (let i = 0; i < count; i += 1) {
    const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(size * (0.34 + Math.random() * 0.28), 1), material);
    puff.position.set((i - count * 0.5) * size * 0.28 + (Math.random() - 0.5) * size * 0.28, Math.random() * size * 0.14, (Math.random() - 0.5) * size * 0.22);
    puff.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    puff.scale.set(1.5 + Math.random() * 1.2, 0.45 + Math.random() * 0.28, 0.86 + Math.random() * 0.5);
    group.add(puff);
  }
  return group;
}

function createFloatingIslands() {
  const group = new THREE.Group();

  for (let i = 0; i < 13; i += 1) {
    const island = createFloatingIsland(3.5 + Math.random() * 8);
    const side = i % 2 === 0 ? -1 : 1;
    island.position.set(side * (18 + Math.random() * 55), 2.8 + Math.random() * 9, -32 - Math.random() * 205);
    island.rotation.y = (Math.random() - 0.5) * 0.7;
    island.scale.setScalar(0.8 + Math.random() * 0.95);
    group.add(island);
  }

  return group;
}

function createFloatingIsland(size) {
  const group = new THREE.Group();
  const top = new THREE.Mesh(new THREE.DodecahedronGeometry(size, 0), materials.skyRock);
  top.scale.set(1.25, 0.34, 0.72);
  top.position.y = 0.8;
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);

  const bottom = new THREE.Mesh(new THREE.ConeGeometry(size * 0.78, size * 1.55, 7), materials.rock);
  bottom.position.y = -size * 0.45;
  bottom.rotation.y = Math.random() * Math.PI;
  bottom.scale.set(0.92, 1, 0.72);
  bottom.castShadow = true;
  group.add(bottom);

  for (const mesh of [top, bottom]) {
    group.add(sketchyEdgesFor(mesh, 15, materials.ink, 0.12));
  }

  const cloudCap = createCloudPuff(size * 0.62, materials.sunsetCloud);
  cloudCap.position.set(0, size * 0.28, 0);
  cloudCap.scale.set(0.9, 0.3, 0.75);
  group.add(cloudCap);

  return group;
}

function createSunsetCloudWisps() {
  const group = new THREE.Group();
  for (let i = 0; i < 20; i += 1) {
    const wisp = createCloudPuff(1.2 + Math.random() * 2.2, i % 3 === 0 ? materials.sunsetCloudPink : materials.cloud);
    wisp.position.set((Math.random() - 0.5) * 130, 15 + Math.random() * 24, -18 - Math.random() * 190);
    wisp.scale.set(1.8 + Math.random() * 1.8, 0.18, 0.54);
    group.add(wisp);
  }
  return group;
}

function createStarryNightScene() {
  const group = new THREE.Group();
  group.add(createNightBackdrop());
  group.add(createStarField());
  group.add(createMeteorStreaks());
  group.add(createNightCloudSea());
  group.add(createNightFloatingIslands());
  return group;
}

function createNightBackdrop() {
  const group = new THREE.Group();
  const moon = new THREE.Mesh(new THREE.CircleGeometry(8.5, 48), materials.moonDisk);
  moon.position.set(-36, 25, -145);
  moon.rotation.y = -0.12;
  group.add(moon);

  const glow = new THREE.Mesh(new THREE.CircleGeometry(22, 48), materials.moonGlow);
  glow.position.copy(moon.position).add(new THREE.Vector3(0, 0, 0.5));
  glow.rotation.copy(moon.rotation);
  group.add(glow);

  const crescentCut = new THREE.Mesh(
    new THREE.CircleGeometry(7.2, 48),
    new THREE.MeshBasicMaterial({ color: 0x14182f, transparent: true, opacity: 0.82, depthWrite: false })
  );
  crescentCut.position.copy(moon.position).add(new THREE.Vector3(3.2, 0.8, 0.8));
  crescentCut.rotation.copy(moon.rotation);
  group.add(crescentCut);

  const hatchPairs = [];
  for (let i = 0; i < 9; i += 1) {
    const t = i / 8;
    const angle = Math.PI * (0.68 + t * 0.72);
    const inner = 3.6 + Math.random() * 1.4;
    const outer = 7.2 + Math.random() * 1;
    hatchPairs.push([
      new THREE.Vector3(Math.cos(angle) * inner, Math.sin(angle) * inner, 0),
      new THREE.Vector3(Math.cos(angle) * outer, Math.sin(angle) * outer, 0)
    ]);
  }
  const moonHatch = createSketchyLine(
    hatchPairs,
    new THREE.LineBasicMaterial({ color: toonPalette.starBlue, transparent: true, opacity: 0.3 }),
    { jitter: 0.16, subdivisions: 3, passes: 1 }
  );
  moonHatch.position.copy(moon.position).add(new THREE.Vector3(0, 0, 0.6));
  moonHatch.rotation.copy(moon.rotation);
  group.add(moonHatch);

  return group;
}

function createStarField() {
  const group = new THREE.Group();
  for (let i = 0; i < 160; i += 1) {
    const star = new THREE.Mesh(
      new THREE.TetrahedronGeometry(0.035 + Math.random() * 0.09, 0),
      i % 5 === 0 ? materials.starBlue : materials.star
    );
    star.position.set((Math.random() - 0.5) * 150, 9 + Math.random() * 39, -22 - Math.random() * 210);
    star.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    star.scale.setScalar(0.8 + Math.random() * 2.6);
    group.add(star);
  }
  return group;
}

function createMeteorStreaks() {
  const group = new THREE.Group();
  for (let i = 0; i < 9; i += 1) {
    const x = -66 + Math.random() * 132;
    const y = 16 + Math.random() * 26;
    const z = -45 - Math.random() * 145;
    const length = 8 + Math.random() * 18;
    const meteor = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, y, z),
        new THREE.Vector3(x + length, y + 2 + Math.random() * 7, z - 2 - Math.random() * 4)
      ]),
      i % 2 === 0 ? materials.thrustEdge : materials.thrustCore
    );
    meteor.material = meteor.material.clone();
    meteor.material.opacity = 0.34 + Math.random() * 0.34;
    group.add(meteor);
  }
  return group;
}

function createNightCloudSea() {
  const group = new THREE.Group();

  for (let i = 0; i < 62; i += 1) {
    const cloud = createCloudPuff(2.4 + Math.random() * 5.4, i % 4 === 0 ? materials.starBlue : materials.nightCloud);
    cloud.position.set((Math.random() - 0.5) * 145, -2.3 + Math.random() * 2.8, -15 - Math.random() * 240);
    cloud.rotation.set((Math.random() - 0.5) * 0.14, Math.random() * Math.PI, (Math.random() - 0.5) * 0.14);
    cloud.scale.set(1.8 + Math.random() * 2.8, 0.22 + Math.random() * 0.14, 0.65 + Math.random() * 0.45);
    group.add(cloud);
  }

  return group;
}

function createNightFloatingIslands() {
  const group = new THREE.Group();

  for (let i = 0; i < 9; i += 1) {
    const island = createNightIsland(3.2 + Math.random() * 6.5);
    const side = i % 2 === 0 ? -1 : 1;
    island.position.set(side * (22 + Math.random() * 50), 1.8 + Math.random() * 11, -36 - Math.random() * 190);
    island.rotation.y = (Math.random() - 0.5) * 0.8;
    island.scale.setScalar(0.78 + Math.random() * 0.9);
    group.add(island);
  }

  return group;
}

function createNightIsland(size) {
  const group = new THREE.Group();
  const top = new THREE.Mesh(new THREE.DodecahedronGeometry(size, 0), materials.nightRock);
  top.scale.set(1.18, 0.3, 0.68);
  top.position.y = 0.6;
  top.castShadow = true;
  group.add(top);

  const bottom = new THREE.Mesh(new THREE.ConeGeometry(size * 0.72, size * 1.4, 7), materials.nightRock);
  bottom.position.y = -size * 0.42;
  bottom.rotation.y = Math.random() * Math.PI;
  bottom.scale.set(0.82, 1, 0.66);
  group.add(bottom);

  for (const mesh of [top, bottom]) {
    group.add(sketchyEdgesFor(mesh, 15, materials.leafInk, 0.12));
  }

  const glowPatch = createCloudPuff(size * 0.44, materials.starBlue);
  glowPatch.position.set(0, size * 0.3, 0);
  glowPatch.scale.set(0.82, 0.22, 0.64);
  group.add(glowPatch);

  return group;
}

function createPaperPlane() {
  const group = new THREE.Group();

  const bodyGeometry = new THREE.BufferGeometry();
  bodyGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [
        0, 0.05, -2.2,
        -0.18, -0.05, 1.2,
        0.18, -0.05, 1.2,
        0, 0.26, 0.95
      ],
      3
    )
  );
  bodyGeometry.setIndex([0, 1, 3, 0, 3, 2, 0, 2, 1, 1, 2, 3]);
  bodyGeometry.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute([0.5, 0, 0.05, 1, 0.95, 1, 0.5, 0.92], 2)
  );
  bodyGeometry.computeVertexNormals();
  const body = new THREE.Mesh(bodyGeometry, materials.paperSide);
  group.add(body);

  const leftWing = wingMesh(-1);
  const rightWing = wingMesh(1);
  group.add(leftWing, rightWing);

  const outline = createSketchyLine(extractEdgePairs(bodyGeometry, 8), materials.ink, {
    jitter: 0.035,
    subdivisions: 4,
    boil: true
  });
  group.add(outline);

  const centerCrease = createSketchyLine(
    [[new THREE.Vector3(0, 0.07, -2.16), new THREE.Vector3(0, 0.27, 0.9)]],
    materials.foldInk,
    { jitter: 0.02, subdivisions: 5, boil: true }
  );
  group.add(centerCrease);

  for (const wing of [leftWing, rightWing]) {
    const side = wing.userData.side;
    const wingOutline = createSketchyLine(extractEdgePairs(wing.geometry, 8), materials.ink, {
      jitter: 0.035,
      subdivisions: 4,
      boil: true
    });
    wing.add(wingOutline);

    const foldHint = createSketchyLine(
      [[new THREE.Vector3(side * 0.3, 0.04, -1.55), new THREE.Vector3(side * 1.85, -0.05, 0.52)]],
      materials.foldInk,
      { jitter: 0.025, subdivisions: 5, boil: true }
    );
    wing.add(foldHint);
  }

  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.4), materials.purpleShadow);
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(1.7, 0.44, 1);
  scene.add(shadow);

  const thrustTrail = createThrustTrail();
  scene.add(thrustTrail.group);

  group.position.set(0, 3.6, 1);
  group.rotation.y = Math.PI;

  return { group, shadow, thrustTrail, leftWing, rightWing };
}

function wingMesh(side) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [
        0, 0.08, -2.05,
        side * 2.85, -0.06, 0.55,
        side * 0.18, -0.04, 1.25,
        0, 0.21, 0.8
      ],
      3
    )
  );
  geometry.setIndex([0, 1, 3, 1, 2, 3, 0, 3, 2]);
  geometry.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute([0.05, 0.04, 0.95, 0.78, 0.12, 0.96, 0.06, 0.84], 2)
  );
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, materials.paperTop);
  mesh.userData.side = side;
  return mesh;
}

function createThrustTrail() {
  const group = new THREE.Group();
  const streams = [];
  const plumes = [];
  const sketchLines = [];
  const wingtipLines = [];
  const particles = [];

  for (let i = 0; i < 5; i += 1) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(9);
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setIndex([0, 1, 2]);
    const material = (i === 0 ? materials.thrustWashCore : materials.thrustWash).clone();
    const plume = new THREE.Mesh(geometry, material);
    plume.frustumCulled = false;
    plume.userData.phase = Math.random() * Math.PI * 2;
    plume.userData.width = 0.46 + i * 0.24;
    plume.userData.length = 3.2 + i * 0.92;
    plumes.push(plume);
    group.add(plume);
  }

  for (let i = 0; i < 7; i += 1) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(6);
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = (i % 3 === 0 ? materials.thrustCore : materials.thrustEdge).clone();
    const line = new THREE.Line(geometry, material);
    line.frustumCulled = false;
    line.userData.phase = Math.random() * Math.PI * 2;
    line.userData.spread = 0.24 + Math.random() * 0.58;
    line.userData.length = 2.2 + Math.random() * 3.2;
    streams.push(line);
    group.add(line);
  }

  for (let i = 0; i < 12; i += 1) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(18);
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = materials.thrustSketch.clone();
    const sketch = new THREE.Line(geometry, material);
    sketch.frustumCulled = false;
    sketch.userData.phase = Math.random() * Math.PI * 2;
    sketch.userData.spread = 0.35 + Math.random() * 0.85;
    sketch.userData.length = 2.4 + Math.random() * 4.8;
    sketch.userData.lift = (Math.random() - 0.5) * 0.8;
    sketchLines.push(sketch);
    group.add(sketch);
  }

  for (let i = 0; i < 6; i += 1) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(12);
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = (i % 2 === 0 ? materials.thrustCore : materials.thrustEdge).clone();
    const line = new THREE.Line(geometry, material);
    line.frustumCulled = false;
    line.userData.phase = Math.random() * Math.PI * 2;
    line.userData.side = i % 2 === 0 ? -1 : 1;
    line.userData.offset = Math.floor(i / 2) * 0.16;
    wingtipLines.push(line);
    group.add(line);
  }

  for (let i = 0; i < 18; i += 1) {
    const particle = new THREE.Mesh(
      new THREE.TetrahedronGeometry(0.065 + Math.random() * 0.075, 0),
      materials.thrustParticle.clone()
    );
    particle.userData.phase = Math.random() * Math.PI * 2;
    particle.userData.distance = Math.random();
    particle.userData.side = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
    particle.frustumCulled = false;
    particles.push(particle);
    group.add(particle);
  }

  group.visible = false;
  return { group, plumes, streams, sketchLines, wingtipLines, particles };
}

function createWindRings() {
  const group = new THREE.Group();

  for (let i = 0; i < 8; i += 1) {
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: toonPalette.turbulence,
      transparent: true,
      opacity: 0.48,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.3, 0.055, 8, 80), ringMaterial);
    ring.position.set(
      i === 0 ? 0 : (Math.random() - 0.5) * 38,
      i === 0 ? 4.9 : 4 + Math.random() * 8,
      i === 0 ? -28 : -32 - i * 32
    );
    ring.rotation.y = Math.PI / 2 + (Math.random() - 0.5) * 0.34;
    ring.rotation.x = (Math.random() - 0.5) * 0.26;
    ring.userData.baseScale = 0.86 + Math.random() * 0.34;
    ring.userData.cooldown = 0;
    ring.userData.flash = 0;
    ring.userData.radius = 4.9;
    ring.userData.phase = Math.random() * Math.PI * 2;
    ring.scale.setScalar(ring.userData.baseScale);

    for (let s = 0; s < 5; s += 1) {
      const stroke = createTurbulenceStroke(1.35 + s * 0.32, ring.userData.phase + s * 0.9);
      stroke.rotation.y = Math.PI / 2;
      stroke.rotation.z = s * 0.7;
      ring.add(stroke);
    }

    group.add(ring);
  }

  return group;
}

function createTurbulenceStroke(radius, phase) {
  const points = [];
  const count = 18;
  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1);
    const angle = phase + t * Math.PI * 1.45;
    const wobble = Math.sin(t * Math.PI * 3 + phase) * 0.18;
    points.push(
      new THREE.Vector3(
        Math.cos(angle) * (radius + wobble),
        Math.sin(angle) * (radius * 0.52 + wobble * 0.4),
        (t - 0.5) * 0.16
      )
    );
  }
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), materials.turbulenceInk);
}

let boilTimer = 0;
let boilCursor = 0;

function updateBoilingLines(dt) {
  boilTimer += dt;
  if (boilTimer < 0.13) return;
  boilTimer = 0;
  boilCursor += 1;
  for (const line of boilingLines) {
    const variants = line.userData.variants;
    line.geometry.attributes.position.array.set(variants[boilCursor % variants.length]);
    line.geometry.attributes.position.needsUpdate = true;
  }
}

function tick() {
  const now = performance.now();
  const dt = Math.min((now - state.lastTime) / 1000, 0.033);
  state.lastTime = now;
  state.elapsed += dt;
  const t = state.elapsed;
  updatePlane(dt, t);
  animateWorld(t);
  updateBoilingLines(dt);
  composer.render();
}

function applyBiome(index) {
  const biome = biomes[index];
  currentBiomeIndex = index;

  if (currentWorld) {
    world.remove(currentWorld);
    disposeGroup(currentWorld);
  }

  currentWorld = biome.create();
  world.add(currentWorld);
  scene.background.copy(biome.sky);
  scene.fog.color.copy(biome.fog);
  scene.fog.near = biome.fogNear;
  scene.fog.far = biome.fogFar;
  sun.color.copy(biome.sun);
  hemi.color.copy(biome.hemiSky);
  hemi.groundColor.copy(biome.hemiGround);
  biomeReadout.textContent = biome.name;
}

function advanceBiome() {
  applyBiome((currentBiomeIndex + 1) % biomes.length);
}

function disposeGroup(group) {
  group.traverse((object) => {
    if (!object.geometry) return;
    object.geometry.dispose();
  });
}

function updatePlane(dt, t) {
  let turn = (isDown("KeyA", "ArrowLeft") ? 1 : 0) - (isDown("KeyD", "ArrowRight") ? 1 : 0);
  let climb = (isDown("KeyW", "ArrowUp") ? 1 : 0) - (isDown("KeyS", "ArrowDown") ? 1 : 0);
  let boost = isDown("Space") ? 1 : 0;

  if (isMobileDevice) {
    if (turn === 0) turn = mobileInput.turn;
    if (climb === 0) climb = mobileInput.climb;
    if (boost === 0) boost = mobileInput.boost;
  }

  const turbulencePush = sampleTurbulence(dt);

  state.turbulenceBoost = Math.max(0, state.turbulenceBoost - dt * 0.48);
  state.turbulenceFlash = Math.max(0, state.turbulenceFlash - dt * 1.8);
  state.turbulenceCooldown = Math.max(0, state.turbulenceCooldown - dt);

  state.yaw += (turn * dt * 1.45) + turbulencePush.x * dt * 0.18;
  state.pitch = THREE.MathUtils.lerp(state.pitch, climb * 0.56 - 0.05 - turbulencePush.y * 0.08, dt * 5.2);
  state.roll = THREE.MathUtils.lerp(state.roll, turn * 0.68, dt * 5.4);
  state.thrustVisual = THREE.MathUtils.lerp(state.thrustVisual, Math.max(boost, state.turbulenceBoost / 1.8), dt * 8);
  state.speed = THREE.MathUtils.lerp(
    state.speed,
    0.48 + boost * 0.34 + state.turbulenceBoost * 1.24 + Math.max(0, -state.pitch) * 0.24,
    dt * 3.7
  );

  const forward = new THREE.Vector3(Math.sin(state.yaw), state.pitch * 0.86, -Math.cos(state.yaw));
  const wind = new THREE.Vector3(
    Math.sin(t * 0.38) * 0.075 + turbulencePush.x * 0.03,
    Math.sin(t * 0.82) * 0.018 + turbulencePush.y * 0.08,
    -0.02 - state.turbulenceBoost * 0.08
  );
  state.velocity.copy(forward.multiplyScalar(state.speed)).add(wind);

  plane.group.position.addScaledVector(state.velocity, dt * 24);
  plane.group.position.y += climb * dt * 4.9 + Math.sin(t * 3.2) * 0.006 + boost * dt * 0.55 + state.turbulenceBoost * dt * 1.75;
  const isSkyBiome = ["雲海", "星空"].includes(biomes[currentBiomeIndex].name);
  const minAltitude = isSkyBiome ? 3.2 : 0.16;
  const maxAltitude = isSkyBiome ? 38 : 30;
  plane.group.position.y = THREE.MathUtils.clamp(plane.group.position.y, minAltitude, maxAltitude);
  plane.group.position.x = THREE.MathUtils.clamp(plane.group.position.x, -62, 62);

  if (plane.group.position.z < -250) {
    advanceBiome();
    plane.group.position.z = 8;
    plane.group.position.x *= 0.35;
    state.yaw *= 0.45;
  }

  plane.group.rotation.set(state.pitch, state.yaw + Math.PI, state.roll, "YXZ");

  const flutterAmp = 0.014 + state.speed * 0.018 + state.thrustVisual * 0.05;
  plane.leftWing.rotation.z = Math.sin(t * 10.5) * flutterAmp - state.roll * 0.055;
  plane.rightWing.rotation.z = -Math.sin(t * 10.5 + 0.8) * flutterAmp - state.roll * 0.055;

  const shadowY = isSkyBiome ? -1.1 : 0.08;
  plane.shadow.position.set(plane.group.position.x + 2.3, shadowY, plane.group.position.z + 3.2);
  const shadowScale = THREE.MathUtils.mapLinear(plane.group.position.y, minAltitude, maxAltitude, 0.78, 4.8);
  plane.shadow.scale.set(shadowScale * 1.7, shadowScale * 0.42, 1);
  plane.shadow.material.opacity = isSkyBiome
    ? THREE.MathUtils.mapLinear(plane.group.position.y, minAltitude, maxAltitude, 0.24, 0.06)
    : THREE.MathUtils.mapLinear(plane.group.position.y, minAltitude, maxAltitude, 0.74, 0.12);

  const cameraOffset = new THREE.Vector3(-Math.sin(state.yaw) * 2.4, 4.2, Math.cos(state.yaw) * 11.5);
  state.target.copy(plane.group.position).add(cameraOffset);
  camera.position.lerp(state.target, dt * 3.6);
  state.camTarget.copy(plane.group.position).add(new THREE.Vector3(0, 1.2, -8));
  camera.lookAt(state.camTarget);
  updateThrustTrail(t);

  speedReadout.textContent = `${Math.round(state.speed * 100)}`;
  altitudeReadout.textContent = `${Math.round(plane.group.position.y * 10)}m`;
  windReadout.textContent = state.turbulenceFlash > 0 ? "boost" : Math.abs(Math.sin(t * 0.38)) > 0.55 ? "gust" : "calm";
}

function sampleTurbulence(dt) {
  const push = new THREE.Vector2();

  rings.children.forEach((ring) => {
    ring.userData.cooldown = Math.max(0, ring.userData.cooldown - dt);
    ring.userData.flash = Math.max(0, ring.userData.flash - dt * 1.8);

    const dx = plane.group.position.x - ring.position.x;
    const dy = plane.group.position.y - ring.position.y;
    const dz = plane.group.position.z - ring.position.z;
    const distance = Math.hypot(dx, dy, dz * 0.72);
    const radius = ring.userData.radius * ring.userData.baseScale;

    if (distance < radius) {
      const strength = 1 - distance / radius;
      const swirl = Math.sin(state.elapsed * 8 + ring.userData.phase) * strength;
      push.x += swirl;
      push.y += strength;
      state.turbulenceBoost = Math.min(1.8, state.turbulenceBoost + dt * (2.8 + strength * 3.8));
      state.turbulenceFlash = 0.85;

      if (ring.userData.cooldown <= 0) {
        state.speed = Math.max(state.speed, 1.05 + strength * 0.55);
        state.turbulenceBoost = Math.max(state.turbulenceBoost, 1.3 + strength * 0.35);
        ring.userData.flash = 1;
        ring.userData.cooldown = 1.1;
      }
    }
  });

  return push;
}

function updateThrustTrail(t) {
  const trail = plane.thrustTrail;
  const amount = THREE.MathUtils.clamp(state.thrustVisual, 0, 1);
  trail.group.visible = amount > 0.03;
  if (!trail.group.visible) return;

  const direction = state.velocity.lengthSq() > 0.0001
    ? state.velocity.clone().normalize()
    : new THREE.Vector3(Math.sin(state.yaw), 0, -Math.cos(state.yaw)).normalize();
  const tail = plane.group.position.clone().addScaledVector(direction, -1.55);
  const right = new THREE.Vector3().crossVectors(direction, camera.up).normalize();
  if (right.lengthSq() < 0.001) right.set(1, 0, 0);
  const up = new THREE.Vector3().crossVectors(right, direction).normalize();

  trail.plumes.forEach((plume, index) => {
    const phase = plume.userData.phase + t * (4.4 + index * 0.36);
    const length = plume.userData.length + amount * 5.2;
    const width = plume.userData.width * (0.8 + amount * 2.6);
    const wobble = Math.sin(phase) * 0.22 * amount;
    const base = tail.clone().addScaledVector(direction, -0.22 - index * 0.04);
    const end = tail
      .clone()
      .addScaledVector(direction, -length)
      .addScaledVector(right, wobble)
      .addScaledVector(up, Math.cos(phase * 0.7) * 0.22 * amount);
    const left = tail
      .clone()
      .addScaledVector(right, -width * (0.38 + index * 0.08))
      .addScaledVector(up, Math.sin(phase * 0.8) * width * 0.18);
    const rightPoint = tail
      .clone()
      .addScaledVector(right, width * (0.38 + index * 0.08))
      .addScaledVector(up, Math.cos(phase * 0.9) * width * 0.18);
    const positions = plume.geometry.attributes.position;
    positions.setXYZ(0, left.x, left.y, left.z);
    positions.setXYZ(1, rightPoint.x, rightPoint.y, rightPoint.z);
    positions.setXYZ(2, end.x, end.y, end.z);
    positions.needsUpdate = true;
    plume.geometry.computeVertexNormals();
    plume.material.opacity = (index === 0 ? 0.34 : 0.18) * amount;
  });

  trail.streams.forEach((line, index) => {
    const phase = line.userData.phase + t * (5.2 + index * 0.28);
    const side = Math.sin(phase) * line.userData.spread * amount;
    const lift = Math.cos(phase * 0.8) * line.userData.spread * 0.48 * amount;
    const start = tail
      .clone()
      .addScaledVector(right, side * 0.35)
      .addScaledVector(up, lift * 0.25);
    const end = tail
      .clone()
      .addScaledVector(direction, -(line.userData.length + amount * 4.8))
      .addScaledVector(right, side * 1.4)
      .addScaledVector(up, lift);
    const positions = line.geometry.attributes.position;
    positions.setXYZ(0, start.x, start.y, start.z);
    positions.setXYZ(1, end.x, end.y, end.z);
    positions.needsUpdate = true;
    line.material.opacity = (line.material.color.equals(toonPalette.thrustCore) ? 0.86 : 0.58) * amount;
  });

  trail.sketchLines.forEach((line, index) => {
    const phase = line.userData.phase + t * (3.4 + index * 0.19);
    const points = line.geometry.attributes.position;
    const length = line.userData.length + amount * 5.6;
    const spread = line.userData.spread * amount;
    for (let i = 0; i < 6; i += 1) {
      const p = i / 5;
      const jitter = Math.sin(phase + p * Math.PI * 3.2) * spread * (0.15 + p * 0.92);
      const lift = Math.cos(phase * 0.8 + p * Math.PI * 2.4) * spread * 0.42 + line.userData.lift * p * amount;
      const point = tail
        .clone()
        .addScaledVector(direction, -(0.24 + p * length))
        .addScaledVector(right, jitter)
        .addScaledVector(up, lift);
      points.setXYZ(i, point.x, point.y, point.z);
    }
    points.needsUpdate = true;
    line.material.opacity = (0.22 + (index % 3) * 0.1) * amount;
  });

  trail.wingtipLines.forEach((line, index) => {
    const phase = line.userData.phase + t * (4.6 + index * 0.2);
    const side = line.userData.side;
    const localWingTip = new THREE.Vector3(side * 2.55, -0.03, 0.38);
    const startBase = localWingTip.applyMatrix4(plane.group.matrixWorld);
    const points = line.geometry.attributes.position;
    const length = 2.6 + amount * 5.4 + line.userData.offset * 4;
    for (let i = 0; i < 4; i += 1) {
      const p = i / 3;
      const flutter = Math.sin(phase + p * Math.PI * 2.8) * amount * (0.08 + p * 0.38);
      const dip = Math.cos(phase * 0.9 + p * Math.PI) * amount * (0.04 + p * 0.22);
      const point = startBase
        .clone()
        .addScaledVector(direction, -(0.18 + p * length))
        .addScaledVector(right, side * (line.userData.offset + flutter))
        .addScaledVector(up, dip);
      points.setXYZ(i, point.x, point.y, point.z);
    }
    points.needsUpdate = true;
    line.material.opacity = (0.24 + (index % 3) * 0.12) * amount;
  });

  trail.particles.forEach((particle, index) => {
    const drift = (particle.userData.distance + t * (0.32 + index * 0.011)) % 1;
    const phase = particle.userData.phase + t * 4.5;
    const spread = (0.2 + drift * 1.1) * amount;
    particle.position
      .copy(tail)
      .addScaledVector(direction, -(0.7 + drift * (4.2 + amount * 3.8)))
      .addScaledVector(right, Math.sin(phase) * spread)
      .addScaledVector(up, Math.cos(phase * 1.2) * spread * 0.55);
    particle.scale.setScalar((1 - drift * 0.64) * (0.85 + amount * 1.8));
    particle.rotation.set(phase, phase * 0.7, phase * 0.33);
    particle.material.opacity = (1 - drift) * amount * 0.74;
  });
}

function animateWorld(t) {
  rings.children.forEach((ring, index) => {
    const flash = ring.userData.flash ?? 0;
    ring.rotation.z += 0.018 + index * 0.0012 + flash * 0.045;
    ring.scale.setScalar(ring.userData.baseScale + Math.sin(t * 2.4 + index) * 0.035 + flash * 0.22);
    ring.material.opacity = 0.34 + Math.sin(t * 1.8 + index) * 0.08 + flash * 0.34;
    ring.material.color.copy(flash > 0 ? toonPalette.turbulenceHot : toonPalette.turbulence);

    ring.children.forEach((stroke, strokeIndex) => {
      stroke.rotation.z += 0.012 + strokeIndex * 0.002 + flash * 0.035;
      stroke.material.opacity = 0.28 + flash * 0.34;
    });
  });

  scene.traverse((object) => {
    if (object.isMesh && object.material === materials.cloud) {
      object.position.x += Math.sin(t * 0.3 + object.position.z) * 0.002;
      object.rotation.z += 0.0015;
    }
  });
}

function isDown(...codes) {
  return codes.some((code) => keys.has(code));
}

function resize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
}
