import * as THREE from "three";
import { CANOPIES, PAVILION, PAVILION_DOOR, STALLS, stallAisleSign } from "./layout";
import { asphaltNormal, textureAnisotropy } from "./tex";
import { loadDuskEnvironment } from "../render/pipeline";

/**
 * Rev 6 photographic lot dressing.
 * Textures stream in; materials already point at them so the first frames update in place.
 * Repeat, tint, and horizon fit are tuned here — the source files stay as generated.
 */

const ART = `${import.meta.env.BASE_URL}art/rev6/`;

/** ~4.6 m tiles on the 78×68 lot. Square in world metres. */
const ASPHALT_REPEAT = new THREE.Vector2(17, 14.8);

const BAY_IMG = { w: 1536, h: 1024 };
const MARK_IMG = { w: 1536, h: 1024 };
const LOUNGE_IMG = { w: 2048, h: 1024 };

/** Middle stall of decal_bays_ev — the only cell with the cyan glyph. */
const CROP_BAY_EV = { x0: 512, y0: 58, x1: 1020, y1: 966 };
/** Empty painted stall (left cell) for the north visitor row. */
const CROP_BAY_PLAIN = { x0: 60, y0: 58, x1: 552, y1: 966 };
const CROP_CROSSWALK = { x0: 84, y0: 60, x1: 1416, y1: 350 };
const CROP_STOP = { x0: 84, y0: 404, x1: 976, y1: 464 };
const CROP_ARROW = { x0: 128, y0: 512, x1: 264, y1: 948 };
const CROP_TURN = { x0: 604, y0: 564, x1: 828, y1: 948 };
const CROP_YELLOW = { x0: 908, y0: 512, x1: 1008, y1: 948 };
const CROP_HATCH = { x0: 1100, y0: 416, x1: 1476, y1: 952 };

const DECAL_Y = 0.016;

export interface Rev6Textures {
  albedo: THREE.Texture;
  rough: THREE.CanvasTexture;
  bays: THREE.Texture;
  marks: THREE.Texture;
  sky: THREE.Texture;
  skyEnv: THREE.Texture;
  lounge: THREE.Texture;
  price: THREE.Texture;
  open: THREE.Texture;
  ev: THREE.Texture;
  city: THREE.Texture;
}

type Crop = { x0: number; y0: number; x1: number; y1: number };

function artUrl(file: string): string {
  return `${ART}${file}`;
}

function configureMap(tex: THREE.Texture, srgb: boolean): THREE.Texture {
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = Math.max(tex.anisotropy, textureAnisotropy());
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function loadMap(loader: THREE.TextureLoader, file: string, srgb: boolean): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    loader.load(
      artUrl(file),
      (tex) => resolve(configureMap(tex, srgb)),
      undefined,
      () => reject(new Error(`rev6 art failed: ${file}`)),
    );
  });
}

/** Lift the roughness photo so the body stays matte and the dark puddles stay smoother. */
function gradeRoughness(image: CanvasImageSource): void {
  const canvas = roughCanvas;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = d[i] / 255;
    const out = Math.min(1, 0.36 + v * 0.74);
    const b = out * 255;
    d[i] = d[i + 1] = d[i + 2] = b;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  roughTex.needsUpdate = true;
}

const roughCanvas = document.createElement("canvas");
roughCanvas.width = 1024;
roughCanvas.height = 1024;
{
  const ctx = roughCanvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#b4b4b4";
    ctx.fillRect(0, 0, 1024, 1024);
  }
}
const roughTex = new THREE.CanvasTexture(roughCanvas);
roughTex.colorSpace = THREE.NoColorSpace;
roughTex.wrapS = roughTex.wrapT = THREE.RepeatWrapping;
roughTex.repeat.copy(ASPHALT_REPEAT);
roughTex.anisotropy = 8;
roughTex.generateMipmaps = true;

const loader = new THREE.TextureLoader();

function tiled(file: string, srgb: boolean): Promise<THREE.Texture> {
  return loadMap(loader, file, srgb).then((tex) => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.copy(ASPHALT_REPEAT);
    return tex;
  });
}

const albedoP = tiled("asphalt_albedo.jpg", true);
const roughP = new Promise<THREE.CanvasTexture>((resolve, reject) => {
  const img = new Image();
  img.onload = () => {
    gradeRoughness(img);
    configureMap(roughTex, false);
    roughTex.wrapS = roughTex.wrapT = THREE.RepeatWrapping;
    roughTex.repeat.copy(ASPHALT_REPEAT);
    roughTex.colorSpace = THREE.NoColorSpace;
    resolve(roughTex);
  };
  img.onerror = () => reject(new Error("rev6 art failed: asphalt_rough.jpg"));
  img.src = artUrl("asphalt_rough.jpg");
});

const baysP = loadMap(loader, "decal_bays_ev.webp", true);
const marksP = loadMap(loader, "decal_markings_sheet.webp", true);
const skyP = loadMap(loader, "sky_dusk.webp", true);
const skyEnvP = loadMap(loader, "sky_dusk_2k.webp", true);
const loungeP = loadMap(loader, "lounge_backdrop.webp", true);
const priceP = loadMap(loader, "sign_price.webp", true);
const openP = loadMap(loader, "sign_open.webp", true);
const evP = loadMap(loader, "sign_ev_charging.webp", true);
const cityP = loadMap(loader, "city_strip.webp", true);

export const rev6Textures: Rev6Textures = {
  albedo: new THREE.Texture(),
  rough: roughTex,
  bays: new THREE.Texture(),
  marks: new THREE.Texture(),
  sky: new THREE.Texture(),
  skyEnv: new THREE.Texture(),
  lounge: new THREE.Texture(),
  price: new THREE.Texture(),
  open: new THREE.Texture(),
  ev: new THREE.Texture(),
  city: new THREE.Texture(),
};

const readyGate = Promise.all([
  albedoP,
  roughP,
  baysP,
  marksP,
  skyP,
  skyEnvP,
  loungeP,
  priceP,
  openP,
  evP,
  cityP,
]).then(([albedo, rough, bays, marks, sky, skyEnv, lounge, price, open, ev, city]) => {
  rev6Textures.albedo = albedo;
  rev6Textures.rough = rough;
  rev6Textures.bays = bays;
  rev6Textures.marks = marks;
  rev6Textures.sky = sky;
  rev6Textures.skyEnv = skyEnv;
  rev6Textures.lounge = lounge;
  rev6Textures.price = price;
  rev6Textures.open = open;
  rev6Textures.ev = ev;
  rev6Textures.city = city;
  swapMap(asphaltMat, albedo, rough);
  bayMat.map = bays;
  bayMat.needsUpdate = true;
  markMat.map = marks;
  markMat.needsUpdate = true;
  loungeMat.map = lounge;
  loungeMat.needsUpdate = true;
  signMat(priceMat, price, 0.42);
  signMat(openMat, open, 0.62);
  signMat(evMat, ev, 0.55);
  loungeMat.opacity = 1;
  loungeMat.transparent = false;
  loungeMat.needsUpdate = true;
  cityMat.map = city;
  cityMat.opacity = 1;
  cityMat.transparent = false;
  cityMat.needsUpdate = true;
});

function swapMap(mat: THREE.MeshStandardMaterial, albedo: THREE.Texture, rough: THREE.Texture): void {
  const prev = mat.map;
  mat.map = albedo;
  mat.roughnessMap = rough;
  mat.needsUpdate = true;
  if (prev && prev !== albedo) prev.dispose();
}

function signMat(mat: THREE.MeshStandardMaterial, tex: THREE.Texture, intensity: number): void {
  mat.map = tex;
  mat.emissiveMap = tex;
  mat.emissiveIntensity = intensity;
  mat.color.set(0xffffff);
  mat.needsUpdate = true;
}

const asphaltMat = new THREE.MeshStandardMaterial({
  name: "Rev6Asphalt",
  color: 0xd2d2d6,
  roughness: 1,
  metalness: 0.04,
  envMapIntensity: 0.42,
  normalMap: asphaltNormal(),
  normalScale: new THREE.Vector2(0.22, 0.22),
});

const paintParams: THREE.MeshStandardMaterialParameters = {
  roughness: 0.84,
  metalness: 0,
  envMapIntensity: 0.1,
  transparent: false,
  alphaTest: 0.42,
  depthWrite: true,
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -4,
};

function clearPlate(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 2;
  const ctx = c.getContext("2d");
  if (ctx) ctx.clearRect(0, 0, 2, 2);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

const bayMat = new THREE.MeshStandardMaterial({ ...paintParams, name: "Rev6Bay", map: clearPlate() });
const markMat = new THREE.MeshStandardMaterial({ ...paintParams, name: "Rev6Mark", map: clearPlate() });

const loungeMat = new THREE.MeshBasicMaterial({
  name: "Rev6Lounge",
  color: 0xfff4ea,
  toneMapped: true,
  side: THREE.FrontSide,
  transparent: true,
  opacity: 0,
});

function makeSignMaterial(intensity: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: intensity,
    roughness: 0.46,
    metalness: 0.02,
    toneMapped: true,
  });
}

const priceMat = makeSignMaterial(0);
const openMat = makeSignMaterial(0);
const evMat = makeSignMaterial(0);
priceMat.color.set(0x1e1e24);
openMat.color.set(0x1e1e24);
evMat.color.set(0x1e1e24);

const cityMat = new THREE.MeshBasicMaterial({
  name: "Rev6City",
  transparent: true,
  opacity: 0,
  alphaTest: 0.22,
  depthWrite: true,
  toneMapped: true,
  side: THREE.FrontSide,
  fog: true,
});

export function rev6AsphaltMaterial(): THREE.MeshStandardMaterial {
  return asphaltMat;
}

/** Image-space crop → plane UVs. flipY stays on, so v=1 is the top of the file. */
function cropUv(geo: THREE.BufferGeometry, crop: Crop, imgW: number, imgH: number, mirrorU = false): void {
  const u0 = crop.x0 / imgW;
  const u1 = crop.x1 / imgW;
  const vTop = 1 - crop.y0 / imgH;
  const vBot = 1 - crop.y1 / imgH;
  const uv = geo.getAttribute("uv") as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) {
    let u = uv.getX(i);
    const v = uv.getY(i);
    if (mirrorU) u = 1 - u;
    uv.setXY(i, u0 + u * (u1 - u0), vBot + v * (vTop - vBot));
  }
  uv.needsUpdate = true;
}

function noRay(mesh: THREE.Object3D): void {
  mesh.raycast = () => {};
  mesh.traverse((o) => {
    o.raycast = () => {};
  });
}

/**
 * Flat paint. local +X is the crop's horizontal axis, local +Y the vertical (image up).
 * The mesh is pitched flat; `yaw` then spins it in the world.
 */
function flatDecal(
  mat: THREE.Material,
  crop: Crop,
  imgW: number,
  imgH: number,
  width: number,
  x: number,
  z: number,
  yaw: number,
  y = DECAL_Y,
  mirrorU = false,
): THREE.Mesh {
  const aspect = (crop.x1 - crop.x0) / (crop.y1 - crop.y0);
  const geo = new THREE.PlaneGeometry(width, width / aspect);
  cropUv(geo, crop, imgW, imgH, mirrorU);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  pivot.rotation.y = yaw;
  pivot.add(mesh);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.renderOrder = 2;
  mesh.userData.rev6Decal = true;
  noRay(pivot);
  return mesh;
}

function addFlat(
  root: THREE.Object3D,
  mat: THREE.Material,
  crop: Crop,
  imgW: number,
  imgH: number,
  width: number,
  x: number,
  z: number,
  yaw: number,
  y = DECAL_Y,
  mirrorU = false,
): void {
  const mesh = flatDecal(mat, crop, imgW, imgH, width, x, z, yaw, y, mirrorU);
  // flatDecal returns the inner mesh; its parent is the yaw pivot.
  root.add(mesh.parent ?? mesh);
}

function addChargerBays(root: THREE.Group): void {
  for (const stall of STALLS) {
    const aisle = stallAisleSign(stall);
    // Image-up points at the pedestal. Width runs along the island (world Z).
    const yaw = aisle < 0 ? -Math.PI / 2 : Math.PI / 2;
    const x = stall.x - aisle * 0.42;
    addFlat(root, bayMat, CROP_BAY_EV, BAY_IMG.w, BAY_IMG.h, 2.48, x, stall.z, yaw);
    if (stall.ada) {
      addFlat(root, markMat, CROP_HATCH, MARK_IMG.w, MARK_IMG.h, 2.2, x, stall.z + 2.7, yaw, DECAL_Y + 0.004);
    }
  }
}

function addDrivePaint(root: THREE.Group): void {
  addFlat(root, markMat, CROP_CROSSWALK, MARK_IMG.w, MARK_IMG.h, 9.4, 0.9, -16.25, 0);
  addFlat(root, markMat, CROP_STOP, MARK_IMG.w, MARK_IMG.h, 6.6, 1.15, -14.55, 0, DECAL_Y + 0.002);

  // Image-up is the arrow head. yaw π sends it toward +Z (into the lot).
  for (const z of [-19.2, 3.4, 8.6]) {
    addFlat(root, markMat, CROP_ARROW, MARK_IMG.w, MARK_IMG.h, 0.82, 2.35, z, Math.PI);
  }
  // Left-turn cell, mirrored so the head points west when the shaft faces +Z.
  addFlat(root, markMat, CROP_TURN, MARK_IMG.w, MARK_IMG.h, 1.55, -3.15, -18.6, Math.PI, DECAL_Y, true);

  for (const x of [-0.85, 3.55]) {
    for (let i = 0; i < 9; i++) {
      const z = -15.4 + i * 2.82;
      addFlat(root, markMat, CROP_YELLOW, MARK_IMG.w, MARK_IMG.h, 0.62, x, z, 0, DECAL_Y + (i % 2) * 0.001);
    }
  }

  for (let i = 0; i < 6; i++) {
    const x = -25.4 + i * 2.55;
    addFlat(root, bayMat, CROP_BAY_PLAIN, BAY_IMG.w, BAY_IMG.h, 2.28, x, 14.8, 0);
  }
}

function photoFace(mat: THREE.Material, w: number, h: number): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.castShadow = false;
  mesh.userData.noBake = true;
  noRay(mesh);
  return mesh;
}

function addSigns(root: THREE.Group): void {
  const charcoal = new THREE.MeshStandardMaterial({ color: 0x1e1e24, roughness: 0.55, metalness: 0.35 });
  const amber = new THREE.MeshStandardMaterial({
    color: 0xe89a2e,
    emissive: 0xe89a2e,
    emissiveIntensity: 0.35,
    roughness: 0.4,
  });

  const pylon = new THREE.Group();
  pylon.position.set(-5.35, 0, -12.7);
  pylon.userData.noBake = true;
  const pole = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.15, 0.16), charcoal);
  pole.position.y = 0.58;
  pole.castShadow = true;
  pole.userData.noBake = true;
  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.22, 0.08), charcoal);
  cabinet.position.y = 2.2;
  cabinet.castShadow = true;
  cabinet.userData.noBake = true;
  const price = photoFace(priceMat, 1.38, 2.07);
  price.position.set(0, 2.2, 0.05);
  const priceBack = photoFace(priceMat, 1.38, 2.07);
  priceBack.position.set(0, 2.2, -0.05);
  priceBack.rotation.y = Math.PI;
  const lip = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 0.1), amber);
  lip.position.set(0, 3.34, 0);
  lip.userData.noBake = true;
  pylon.add(pole, cabinet, price, priceBack, lip);
  noRay(pylon);
  root.add(pylon);

  const canopy = CANOPIES[0];
  const fasciaZ = canopy.z - canopy.d * 0.5 - 0.2;
  const evHang = photoFace(evMat, 2.35, 1.75);
  evHang.position.set(canopy.x, 3.95, fasciaZ);
  evHang.rotation.y = Math.PI;
  evHang.userData.noBake = true;
  root.add(evHang);

  const evPost = new THREE.Group();
  evPost.position.set(6.4, 0, -11.4);
  evPost.userData.noBake = true;
  const evPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.55, 8), charcoal);
  evPole.position.y = 0.78;
  evPole.castShadow = true;
  evPole.userData.noBake = true;
  const evBoard = new THREE.Mesh(new THREE.BoxGeometry(1.62, 1.24, 0.06), charcoal);
  evBoard.position.y = 2.15;
  evBoard.userData.noBake = true;
  const evFace = photoFace(evMat, 1.5, 1.12);
  evFace.position.set(0, 2.15, -0.04);
  evFace.rotation.y = Math.PI;
  evPost.add(evPole, evBoard, evFace);
  noRay(evPost);
  root.add(evPost);

  const doorX = PAVILION.x + PAVILION_DOOR.localX;
  const doorR = doorX + PAVILION_DOOR.width * 0.5;
  const southZ = PAVILION.z - PAVILION.d * 0.5;
  const open = photoFace(openMat, 1.28, 0.95);
  open.position.set(doorR + 0.95, 2.15, southZ - 0.1);
  open.rotation.y = Math.PI;
  root.add(open);

  const eastX = PAVILION.x + PAVILION.w * 0.5;
  const evLounge = photoFace(evMat, 1.22, 0.91);
  evLounge.position.set(eastX + 0.08, 1.55, PAVILION.z + 1.95);
  evLounge.rotation.y = Math.PI / 2;
  root.add(evLounge);
}

function addLoungeGlass(root: THREE.Group): void {
  const eastX = PAVILION.x + PAVILION.w * 0.5;
  const southZ = PAVILION.z - PAVILION.d * 0.5;

  // Wide east storefront: full image width, a horizontal band so the short windows do not stretch it.
  const east = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 1.7), loungeMat);
  cropUv(east.geometry, { x0: 0, y0: 310, x1: 2048, y1: 710 }, LOUNGE_IMG.w, LOUNGE_IMG.h);
  east.position.set(eastX - 0.32, 1.55, PAVILION.z + 0.35);
  east.rotation.y = Math.PI / 2;
  east.userData.noBake = true;
  noRay(east);
  root.add(east);

  // South door: full 2:1 plate just inside the opening, facing the apron.
  const south = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 2.7), loungeMat);
  south.position.set(PAVILION.x + PAVILION_DOOR.localX, 1.48, southZ + 0.42);
  south.rotation.y = Math.PI;
  south.userData.noBake = true;
  noRay(south);
  root.add(south);
}

function addCityRing(root: THREE.Group): void {
  const n = 8;
  const radius = 74;
  const chord = 2 * radius * Math.sin(Math.PI / n) * 0.992;
  const height = chord / (3072 / 564);
  for (let i = 0; i < n; i++) {
    const geo = new THREE.PlaneGeometry(chord, height);
    if (i % 2 === 1) {
      const uv = geo.getAttribute("uv") as THREE.BufferAttribute;
      for (let k = 0; k < uv.count; k++) uv.setX(k, 1 - uv.getX(k));
      uv.needsUpdate = true;
    }
    const mesh = new THREE.Mesh(geo, cityMat);
    mesh.position.set(0, height * 0.5 - 0.35, -radius);
    const pivot = new THREE.Group();
    pivot.rotation.y = (i / n) * Math.PI * 2;
    pivot.add(mesh);
    mesh.userData.noBake = true;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    noRay(pivot);
    root.add(pivot);
  }
}

export function addRev6LotDressing(root: THREE.Group): void {
  addChargerBays(root);
  addDrivePaint(root);
  addSigns(root);
  addLoungeGlass(root);
  addCityRing(root);
}

type SkyFit = { repeatY: number; offsetY: number; yaw: number };

/** Put the bright dusk band on the horizon and aim that column at the key light. */
function fitSky(image: CanvasImageSource): SkyFit {
  const w = 256;
  const h = 128;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { repeatY: 1.28, offsetY: -0.28, yaw: 0.65 };
  ctx.drawImage(image, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  let bestY = 0;
  let best = -1;
  const col = new Float64Array(w);
  for (let y = 0; y < h; y++) {
    let sum = 0;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const lum = data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11;
      sum += lum;
      col[x] += lum;
    }
    if (sum > best) {
      best = sum;
      bestY = y;
    }
  }
  let bestX = 0;
  let bestCol = -1;
  for (let x = 0; x < w; x++) {
    if (col[x] > bestCol) {
      bestCol = col[x];
      bestX = x;
    }
  }
  const fromTop = (bestY + 0.5) / h;
  const vSunset = 1 - fromTop;
  // Sphere equator (uv.y = 0.5) should sample the sunset; the zenith keeps the top of the file.
  const repeatY = Math.min(1.85, Math.max(1, 2 * (1 - vSunset)));
  const offsetY = 1 - repeatY;
  const brightU = (bestX + 0.5) / w;
  const phi = brightU * Math.PI * 2;
  const bx = -Math.cos(phi);
  const bz = Math.sin(phi);
  const sunX = -38;
  const sunZ = -18;
  const yaw = Math.atan2(sunX, sunZ) - Math.atan2(bx, bz);
  return { repeatY, offsetY, yaw };
}

function applySkyFit(tex: THREE.Texture, fit: SkyFit): void {
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(1, fit.repeatY);
  tex.offset.set(0, fit.offsetY);
  tex.needsUpdate = true;
}

function reflectionCards(env: THREE.Scene): void {
  const card = (color: number, x: number, y: number, z: number, w: number, h: number, ry = 0) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }),
    );
    mesh.position.set(x, y, z);
    mesh.rotation.y = ry;
    env.add(mesh);
  };
  card(0xffb060, -8.3, 3.1, -0.15, 2.2, 0.7);
  card(0xffb060, 11.5, 3.1, 2.55, 2.4, 0.75, 0.2);
  card(0xf7f8fb, -8.3, 6.5, -0.15, 10, 1.1);
  card(0xf7f8fb, 11.5, 6.5, 2.55, 12, 1.2);
  card(0xe63225, 8, 0.9, -5, 3.2, 0.45, Math.PI / 2);
  card(0xe63225, -6, 0.9, -4, 3.2, 0.45, Math.PI / 2);
  card(0x00d4f5, 4.5, 1.6, -16, 1.2, 0.7);
}

let skyMounted = false;

/**
 * Full-res dusk on the skydome. The 2k plate is the PMREM source so the
 * cubemap bake stays small. Both share one horizon fit.
 */
export async function mountRev6Sky(renderer: THREE.WebGLRenderer, scene: THREE.Scene): Promise<void> {
  if (skyMounted) return;
  try {
    const [sky, skyEnv] = await Promise.all([skyP, skyEnvP]);
    const fit = fitSky(sky.image as CanvasImageSource);
    applySkyFit(sky, fit);
    applySkyFit(skyEnv, fit);

    const domeMat = new THREE.MeshBasicMaterial({
      map: sky,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      toneMapped: true,
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(168, 48, 32), domeMat);
    dome.rotation.y = fit.yaw;
    dome.userData.kind = "skydome";
    dome.frustumCulled = false;
    noRay(dome);
    scene.add(dome);

    const env = new THREE.Scene();
    const envMat = new THREE.MeshBasicMaterial({
      map: skyEnv,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    const envSky = new THREE.Mesh(new THREE.SphereGeometry(48, 32, 20), envMat);
    envSky.rotation.y = fit.yaw;
    env.add(envSky);
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(40, 24),
      new THREE.MeshBasicMaterial({ color: 0x14120e }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.4;
    env.add(ground);
    reflectionCards(env);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const prev = renderer.toneMappingExposure;
    renderer.toneMappingExposure = 1;
    const environment = pmrem.fromScene(env, 0.04, 0.1, 70).texture;
    renderer.toneMappingExposure = prev;
    pmrem.dispose();
    skyEnv.dispose();

    scene.environment = environment;
    scene.environmentIntensity = 0.34;
    scene.environmentRotation.set(0, 0, 0);
    skyMounted = true;
  } catch (err) {
    console.warn("rev6 sky failed, using dusk.hdr", err);
    const fallback = await loadDuskEnvironment(renderer);
    scene.environment = fallback.environment;
    scene.environmentIntensity = 0.26;
    scene.environmentRotation.y = 0.9;
    skyMounted = true;
  }
}

export function whenRev6Ready(renderer: THREE.WebGLRenderer, scene: THREE.Scene): Promise<void> {
  return Promise.all([readyGate, mountRev6Sky(renderer, scene)])
    .then(() => undefined)
    .catch((err) => {
      console.warn("rev6 art incomplete", err);
    });
}
