import * as THREE from "three";
import { AB_AISLE_X, BAY_SIZE, CANOPIES, CD_AISLE_X, PAVILION, PAVILION_DOOR, STALLS, VISITOR_EAST, VISITOR_WEST, stallAisleSign } from "./layout";
import { asphaltNormal, textureAnisotropy } from "./tex";
import { loadDuskEnvironment } from "../render/pipeline";

/**
 * Rev 6 photographic lot dressing.
 * Textures stream in; materials already point at them so the first frames update in place.
 * Repeat, tint, and horizon fit are tuned here — the source files stay as generated.
 */

const ART = `${import.meta.env.BASE_URL}art/rev6/`;

/** ~4.6 m tiles on the 130×130 lot. Square in world metres. */
const ASPHALT_REPEAT = new THREE.Vector2(28.3, 28.3);

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

/**
 * The source albedo averages ~66/255 and the roughness photo is glossy in the
 * puddles. Both are graded into canvases that already sit on the material, so
 * the baked-light clone (which shares the texture) updates in place.
 * Albedo: pow(v, 0.82) * 1.62 lifts the mean toward ~0.53 without clipping grit.
 * Roughness: 0.55 + v * 0.45 keeps the body matte and the dark puddles satin.
 */
function gradeCanvas(canvas: HTMLCanvasElement, image: CanvasImageSource, mode: "albedo" | "rough"): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (mode === "albedo") {
      for (let c = 0; c < 3; c++) {
        const v = d[i + c] / 255;
        d[i + c] = Math.min(255, Math.pow(v, 0.82) * 1.62 * 255);
      }
    } else {
      const v = d[i] / 255;
      const b = Math.min(255, (0.55 + v * 0.45) * 255);
      d[i] = d[i + 1] = d[i + 2] = b;
    }
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

function makeGradeCanvas(fill: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, 1024, 1024);
  }
  return canvas;
}

function gradeTexture(canvas: HTMLCanvasElement, srgb: boolean): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.copy(ASPHALT_REPEAT);
  tex.anisotropy = 8;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

const albedoCanvas = makeGradeCanvas("#6e6a66");
const roughCanvas = makeGradeCanvas("#b4b4b4");
const albedoTex = gradeTexture(albedoCanvas, true);
const roughTex = gradeTexture(roughCanvas, false);

const loader = new THREE.TextureLoader();

function imageReady(file: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`rev6 art failed: ${file}`));
    img.src = artUrl(file);
  });
}

/** One texture object, created before the lot builds, filled when the file arrives. */
function holdMap(file: string, srgb: boolean): { tex: THREE.Texture; ready: Promise<THREE.Texture> } {
  let resolve!: (tex: THREE.Texture) => void;
  let reject!: (err: Error) => void;
  const ready = new Promise<THREE.Texture>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  const tex = loader.load(
    artUrl(file),
    (loaded) => resolve(configureMap(loaded, srgb)),
    undefined,
    () => reject(new Error(`rev6 art failed: ${file}`)),
  );
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = 8;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return { tex, ready };
}

const albedoP = imageReady("asphalt_albedo.jpg").then((img) => {
  gradeCanvas(albedoCanvas, img, "albedo");
  albedoTex.needsUpdate = true;
  return albedoTex;
});
const roughP = imageReady("asphalt_rough.jpg").then((img) => {
  gradeCanvas(roughCanvas, img, "rough");
  roughTex.needsUpdate = true;
  return roughTex;
});

const baysHold = holdMap("decal_bays_ev.webp", true);
const marksHold = holdMap("decal_markings_sheet.webp", true);
const skyHold = holdMap("sky_dusk.webp", true);
const skyEnvHold = holdMap("sky_dusk_2k.webp", true);
const loungeHold = holdMap("lounge_backdrop.webp", true);
const priceHold = holdMap("sign_price.webp", true);
const openHold = holdMap("sign_open.webp", true);
const evHold = holdMap("sign_ev_charging.webp", true);
const cityHold = holdMap("city_strip.webp", true);

const baysTex = baysHold.tex;
const marksTex = marksHold.tex;
const baysP = baysHold.ready;
const marksP = marksHold.ready;
const skyP = skyHold.ready;
const skyEnvP = skyEnvHold.ready;
const loungeP = loungeHold.ready;
const priceP = priceHold.ready;
const openP = openHold.ready;
const evP = evHold.ready;
const cityP = cityHold.ready;

export const rev6Textures: Rev6Textures = {
  albedo: albedoTex,
  rough: roughTex,
  bays: baysTex,
  marks: marksTex,
  sky: skyHold.tex,
  skyEnv: skyEnvHold.tex,
  lounge: loungeHold.tex,
  price: priceHold.tex,
  open: openHold.tex,
  ev: evHold.tex,
  city: cityHold.tex,
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
  // Albedo, roughness, and decal maps are the same objects the meshes already hold.
  loungeMat.map = lounge;
  loungeMat.emissiveMap = lounge;
  loungeMat.emissiveIntensity = 0.85;
  loungeMat.color.set(0xfff4ea);
  loungeMat.needsUpdate = true;
  repaintCyanDecals(bays);
  repaintCyanDecals(marks);
  gradeCityStrip(city);
  cityMat.map = city;
  cityMat.color.set(0xc4b8a8);
  cityMat.opacity = 0.38;
  cityMat.transparent = true;
  cityMat.needsUpdate = true;
});

/**
 * Gasoline digits are baked into sign_price.webp. This plate covers only that
 * block and draws per-kWh tiers. Built once.
 */
function priceDigitTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 1152;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#1E1E24";
    ctx.fillRect(48, 168, 672, 960);
    const rows: Array<[string, string, number]> = [
      ["L2", "0.39", 340],
      ["DC", "0.49", 640],
      ["MCS", "0.59", 940],
    ];
    for (const [tier, price, y] of rows) {
      ctx.fillStyle = "#F5F0E8";
      ctx.font = "600 72px sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(tier, 88, y);
      ctx.fillStyle = "#E89A2E";
      ctx.font = "700 148px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(price, 690, y);
    }
    ctx.fillStyle = "#E89A2E";
    ctx.font = "600 52px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("$/kWh", 690, 1088);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

const priceDigits = priceDigitTexture();
const priceDigitMat = new THREE.MeshStandardMaterial({
  name: "Rev6PriceDigits",
  map: priceDigits,
  emissiveMap: priceDigits,
  emissive: 0xffffff,
  emissiveIntensity: 0.22,
  color: 0xffffff,
  roughness: 0.48,
  metalness: 0,
  transparent: false,
  alphaTest: 0.4,
  depthWrite: true,
});

/** Stall paint stays cream. The source sheet's cyan EV glyph is structural-color drift. */
function repaintCyanDecals(tex: THREE.Texture): void {
  const img = tex.image as CanvasImageSource | undefined;
  if (!img || !("width" in img)) return;
  const canvas = document.createElement("canvas");
  canvas.width = (img as HTMLImageElement).width;
  canvas.height = (img as HTMLImageElement).height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.drawImage(img, 0, 0);
  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = frame.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] ?? 0;
    const g = d[i + 1] ?? 0;
    const b = d[i + 2] ?? 0;
    const a = d[i + 3] ?? 0;
    if (a < 24) continue;
    if (b > 150 && g > 110 && r < 150 && b > r + 35) {
      d[i] = 245;
      d[i + 1] = 240;
      d[i + 2] = 232;
    }
  }
  ctx.putImageData(frame, 0, 0);
  tex.image = canvas;
  tex.needsUpdate = true;
}

/** Pull the horizon plate off magenta/orange synthwave toward dusty desert. */
function gradeCityStrip(tex: THREE.Texture): void {
  const img = tex.image as CanvasImageSource | undefined;
  if (!img || !("width" in img)) return;
  const canvas = document.createElement("canvas");
  canvas.width = (img as HTMLImageElement).width;
  canvas.height = (img as HTMLImageElement).height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.drawImage(img, 0, 0);
  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = frame.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] ?? 0;
    const g = d[i + 1] ?? 0;
    const b = d[i + 2] ?? 0;
    const y = r * 0.3 + g * 0.52 + b * 0.18;
    const magenta = r > 130 && b > 110 && g < r * 0.78;
    const billboard = r > 170 && g > 70 && b < 110 && r > b + 50;
    if (magenta || billboard) {
      d[i] = 150;
      d[i + 1] = 132;
      d[i + 2] = 112;
    } else {
      d[i] = Math.min(255, y * 0.62 + r * 0.28 + 12);
      d[i + 1] = Math.min(255, y * 0.66 + g * 0.22 + 8);
      d[i + 2] = Math.min(255, y * 0.7 + b * 0.12);
    }
  }
  ctx.putImageData(frame, 0, 0);
  tex.image = canvas;
  tex.needsUpdate = true;
}

const asphaltMat = new THREE.MeshStandardMaterial({
  name: "Rev6Asphalt",
  color: 0xffffff,
  map: albedoTex,
  roughnessMap: roughTex,
  roughness: 1,
  metalness: 0.02,
  envMapIntensity: 0.14,
  emissive: 0xffffff,
  emissiveMap: albedoTex,
  emissiveIntensity: 0.12,
  normalMap: asphaltNormal(),
  normalScale: new THREE.Vector2(0.16, 0.16),
});

const paintParams: THREE.MeshStandardMaterialParameters = {
  roughness: 0.84,
  metalness: 0,
  envMapIntensity: 0.08,
  emissive: 0xffffff,
  emissiveIntensity: 0.22,
  transparent: false,
  alphaTest: 0.42,
  depthWrite: true,
  // Just enough to clear the asphalt. A larger bias was drawing the bay glyph
  // through the car greenhouse when the camera looked down.
  polygonOffset: true,
  polygonOffsetFactor: -1,
  polygonOffsetUnits: -1,
};

const bayMat = new THREE.MeshStandardMaterial({
  ...paintParams,
  name: "Rev6Bay",
  map: baysTex,
  emissiveMap: baysTex,
});
const markMat = new THREE.MeshStandardMaterial({
  ...paintParams,
  name: "Rev6Mark",
  map: marksTex,
  emissiveMap: marksTex,
});

const loungeMat = new THREE.MeshStandardMaterial({
  name: "Rev6Lounge",
  color: 0x000000,
  emissive: 0xfff4ea,
  emissiveIntensity: 0,
  roughness: 1,
  metalness: 0,
  toneMapped: true,
  side: THREE.FrontSide,
});

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
  mesh.renderOrder = 1;
  mesh.userData.rev6Decal = true;
  // Paint stays on the photo. The canopy AO clone would crush the lines to black.
  mesh.userData.noBake = true;
  pivot.userData.noBake = true;
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
    // Centered on the stall. 2.62 m across the island → ~4.68 m along the car.
    const x = stall.x;
    addFlat(root, bayMat, CROP_BAY_EV, BAY_IMG.w, BAY_IMG.h, BAY_SIZE.w, x, stall.z, yaw);
    if (stall.ada) {
      addFlat(root, markMat, CROP_HATCH, MARK_IMG.w, MARK_IMG.h, 2.2, x, stall.z + 2.7, yaw, DECAL_Y + 0.004);
    }
  }
}

function addDrivePaint(root: THREE.Group): void {
  const doorX = PAVILION.x + PAVILION_DOOR.localX;
  const doorZ = PAVILION.z - PAVILION.d * 0.5;
  addFlat(root, markMat, CROP_CROSSWALK, MARK_IMG.w, MARK_IMG.h, 6.4, doorX, doorZ - 3.4, 0);
  addFlat(root, markMat, CROP_STOP, MARK_IMG.w, MARK_IMG.h, 3.4, AB_AISLE_X, -38.6, Math.PI / 2, DECAL_Y + 0.002);

  // Clockwise one-way. Image-up is the arrow head. yaw π sends it toward +Z.
  for (const z of [-8, -18, -28, -36]) {
    addFlat(root, markMat, CROP_ARROW, MARK_IMG.w, MARK_IMG.h, 0.9, -31.8, z, 0);
  }
  for (const z of [-30, -18, -8, 2, 9]) {
    addFlat(root, markMat, CROP_ARROW, MARK_IMG.w, MARK_IMG.h, 0.9, AB_AISLE_X, z, Math.PI);
  }
  for (const x of [-24, -10, 4, 18]) {
    addFlat(root, markMat, CROP_ARROW, MARK_IMG.w, MARK_IMG.h, 0.9, x, 12.4, Math.PI / 2);
  }
  addFlat(root, markMat, CROP_TURN, MARK_IMG.w, MARK_IMG.h, 1.45, -28.4, 10.6, Math.PI / 2, DECAL_Y, true);
  for (const z of [8, 0, -10, -20, -30]) {
    addFlat(root, markMat, CROP_ARROW, MARK_IMG.w, MARK_IMG.h, 0.9, CD_AISLE_X, z, 0);
  }
  for (const z of [-28, -16, -4, 6]) {
    addFlat(root, markMat, CROP_ARROW, MARK_IMG.w, MARK_IMG.h, 0.9, 31.4, z, Math.PI);
  }
  for (const x of [22, 8, -6, -20]) {
    addFlat(root, markMat, CROP_ARROW, MARK_IMG.w, MARK_IMG.h, 0.9, x, -40.2, -Math.PI / 2);
  }

  for (const bay of [...VISITOR_WEST, ...VISITOR_EAST]) {
    addFlat(root, bayMat, CROP_BAY_PLAIN, BAY_IMG.w, BAY_IMG.h, 2.3, bay.x, bay.z, bay.yaw > 0 ? Math.PI / 2 : -Math.PI / 2);
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
  const trim = new THREE.MeshStandardMaterial({ color: 0xb8bcc0, roughness: 0.32, metalness: 0.72 });

  const pylon = new THREE.Group();
  pylon.position.set(-9.2, 0, -16.4);
  pylon.userData.noBake = true;
  const pole = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.15, 0.16), charcoal);
  pole.position.y = 0.58;
  pole.castShadow = true;
  pole.userData.noBake = true;
  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.85, 0.12), charcoal);
  cabinet.position.y = 2.15;
  cabinet.castShadow = true;
  cabinet.userData.noBake = true;
  const priceDigitsFront = photoFace(priceDigitMat, 1.18, 1.62);
  priceDigitsFront.position.set(0, 2.15, 0.07);
  const priceDigitsBack = photoFace(priceDigitMat, 1.18, 1.62);
  priceDigitsBack.position.set(0, 2.15, -0.07);
  priceDigitsBack.rotation.y = Math.PI;
  const lip = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.025, 0.14), trim);
  lip.position.set(0, 3.1, 0);
  lip.userData.noBake = true;
  pylon.add(pole, cabinet, priceDigitsFront, priceDigitsBack, lip);
  noRay(pylon);
  root.add(pylon);
}

function addLoungePlate(
  root: THREE.Group,
  w: number,
  h: number,
  x: number,
  y: number,
  z: number,
  yaw: number,
  crop: Crop | null,
): void {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), loungeMat);
  if (crop) cropUv(mesh.geometry, crop, LOUNGE_IMG.w, LOUNGE_IMG.h);
  mesh.position.set(x, y, z);
  mesh.rotation.y = yaw;
  mesh.userData.noBake = true;
  noRay(mesh);
  root.add(mesh);
}

function addLoungeGlass(root: THREE.Group): void {
  const eastX = PAVILION.x + PAVILION.w * 0.5;
  const southZ = PAVILION.z - PAVILION.d * 0.5;

  // Wide east storefront: full image width, a horizontal band so the short windows do not stretch it.
  addLoungePlate(root, 9.2, 1.7, eastX - 0.22, 1.55, PAVILION.z + 0.35, Math.PI / 2, {
    x0: 0,
    y0: 310,
    x1: 2048,
    y1: 710,
  });

  // Door opening gets the full 2:1 plate, just inside the glass.
  const doorX = PAVILION.x + PAVILION_DOOR.localX;
  addLoungePlate(root, 3.5, 1.75, doorX, 1.32, southZ + 0.18, Math.PI, null);

  // Side windows share one wide band so the facade reads as one lit interior.
  const bandH = Math.round(LOUNGE_IMG.w / ((PAVILION.w - 0.6) / 1.62));
  const bandY = Math.max(0, Math.round((LOUNGE_IMG.h - bandH) * 0.4));
  addLoungePlate(root, PAVILION.w - 0.6, 1.62, PAVILION.x, 1.55, southZ + 0.34, Math.PI, {
    x0: 0,
    y0: bandY,
    x1: LOUNGE_IMG.w,
    y1: Math.min(LOUNGE_IMG.h, bandY + bandH),
  });
}

function addCityRing(root: THREE.Group): void {
  const n = 10;
  const radius = 118;
  const chord = 2 * radius * Math.sin(Math.PI / n) * 0.992;
  const height = (chord / (3072 / 564)) * 0.42;
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

/** Believable desert dusk. The generated sky plate is magenta synthwave and stays off the dome. */
function desertDuskMap(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, 1024);
  g.addColorStop(0, "#1a2633");
  g.addColorStop(0.34, "#314456");
  g.addColorStop(0.48, "#8d7b6c");
  g.addColorStop(0.53, "#e0c2a4");
  g.addColorStop(0.58, "#c4a184");
  g.addColorStop(0.7, "#6a5c52");
  g.addColorStop(1, "#2c2824");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 2048, 1024);
  const sun = ctx.createRadialGradient(380, 545, 8, 380, 545, 260);
  sun.addColorStop(0, "rgba(255, 220, 186, 0.92)");
  sun.addColorStop(0.22, "rgba(232, 176, 128, 0.38)");
  sun.addColorStop(1, "rgba(232, 176, 128, 0)");
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, 2048, 1024);
  ctx.fillStyle = "rgba(245, 236, 224, 0.07)";
  ctx.fillRect(0, 500, 2048, 28);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
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
  for (const canopy of CANOPIES) {
    card(0xfff4dc, canopy.x, canopy.y - 0.35, canopy.z, Math.min(canopy.w, 6), 0.4);
    card(0xf7f8fb, canopy.x, canopy.y + 0.2, canopy.z, canopy.w * 0.7, 0.28);
  }
  card(0xe63225, PAVILION.x - 2.2, PAVILION.h - 0.1, PAVILION.z - PAVILION.d * 0.5 - 0.4, 2.4, 0.35);
  card(0x3a4048, AB_AISLE_X, 0.35, -8, 0.2, 4);
}

let skyMounted = false;

/**
 * Desert-dusk skydome plus a PMREM of the same grade.
 * The rev6 sky plates stay loaded for the art gate but are not shown:
 * they are a magenta synthwave gradient with a giant wordmark.
 */
export async function mountRev6Sky(renderer: THREE.WebGLRenderer, scene: THREE.Scene): Promise<void> {
  if (skyMounted) return;
  try {
    const sky = desertDuskMap();
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(168, 48, 32),
      new THREE.MeshBasicMaterial({
        map: sky,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        toneMapped: true,
      }),
    );
    dome.rotation.y = 0.85;
    dome.userData.kind = "skydome";
    dome.frustumCulled = false;
    noRay(dome);
    scene.add(dome);

    const env = new THREE.Scene();
    const envSky = new THREE.Mesh(
      new THREE.SphereGeometry(48, 32, 20),
      new THREE.MeshBasicMaterial({ map: sky, side: THREE.BackSide, depthWrite: false, fog: false }),
    );
    envSky.rotation.y = 0.85;
    env.add(envSky);
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(40, 24),
      new THREE.MeshBasicMaterial({ color: 0x2a2824 }),
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

    scene.environment = environment;
    scene.environmentIntensity = 0.58;
    scene.environmentRotation.set(0, 0, 0);
    skyMounted = true;
  } catch (err) {
    console.warn("desert sky failed, using dusk.hdr", err);
    const fallback = await loadDuskEnvironment(renderer);
    scene.environment = fallback.environment;
    scene.environmentIntensity = 0.4;
    scene.environmentRotation.y = 0.9;
    skyMounted = true;
  }
}

/**
 * The lot baker clones the asphalt material before the photo is graded and
 * stamps aoMapIntensity at 1.05. That clone is what the ground mesh renders.
 * Re-point it at the graded canvases and ease the AO so the canopy shadow
 * stays, without crushing the midtones to black.
 */
function retuneBakedAsphalt(scene: THREE.Scene): void {
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const entry of list) {
      const mat = entry as THREE.MeshStandardMaterial;
      if (!mat || mat.name !== "Rev6Asphalt") continue;
      mat.map = albedoTex;
      mat.roughnessMap = roughTex;
      mat.emissiveMap = albedoTex;
      mat.emissive.set(0xffffff);
      mat.emissiveIntensity = 0.08;
      mat.color.set(0xffffff);
      mat.roughness = 1;
      mat.metalness = 0.02;
      mat.envMapIntensity = 0.32;
      mat.aoMapIntensity = 0.42;
      // Bounce JPEG sits near 30/255. Decoded as sRGB that is a tiny indirect
      // term, so the canopy shadow ate the new grain. A higher intensity
      // brings the baked bounce back up beside the emissive lift.
      if (mat.lightMap) mat.lightMapIntensity = 2.4;
      mat.needsUpdate = true;
    }
  });
}

export function whenRev6Ready(renderer: THREE.WebGLRenderer, scene: THREE.Scene): Promise<void> {
  return Promise.all([readyGate, mountRev6Sky(renderer, scene)])
    .then(() => {
      retuneBakedAsphalt(scene);
    })
    .catch((err) => {
      console.warn("rev6 art incomplete", err);
    });
}
