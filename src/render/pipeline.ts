import * as THREE from "three";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import {
  BloomEffect,
  BrightnessContrastEffect,
  EffectComposer,
  EffectPass,
  HueSaturationEffect,
  NormalPass,
  RenderPass,
  SMAAEffect,
  SSAOEffect,
  VignetteEffect,
} from "postprocessing";
import { duskSky } from "../world/tex";

export type QualityTier = "high" | "medium" | "low";

export interface CinematicPipeline {
  composer: EffectComposer;
  resize: (w: number, h: number) => void;
  render: () => void;
  setQuality: (tier: QualityTier) => void;
  tier: () => QualityTier;
}

export function createRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: "high-performance",
    stencil: false,
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.84;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}

/** CC0 dusk sky (Poly Haven) as PMREM. Falls back to the procedural dome. */
export async function loadDuskEnvironment(renderer: THREE.WebGLRenderer): Promise<{
  environment: THREE.Texture;
  background: THREE.Texture | null;
}> {
  try {
    const hdr = await new RGBELoader().loadAsync(`${import.meta.env.BASE_URL}env/dusk.hdr`);
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const environment = pmrem.fromEquirectangular(hdr).texture;
    pmrem.dispose();
    return { environment, background: hdr };
  } catch (err) {
    console.warn("HDR environment failed, using procedural dusk", err);
    return { environment: createDuskEnvironment(renderer), background: null };
  }
}

/** Golden-hour IBL so metals and clearcoat read as painted, not plastic. */
export function createDuskEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene();

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(90, 32, 20),
    new THREE.MeshBasicMaterial({ map: duskSky(), side: THREE.BackSide }),
  );
  env.add(sky);

  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(7.2, 20, 16),
    new THREE.MeshBasicMaterial({ color: 0xffe2a8 }),
  );
  sun.position.set(-48, 16, -30);
  env.add(sun);
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(12, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xffb060, transparent: true, opacity: 0.55 }),
  );
  halo.position.copy(sun.position);
  env.add(halo);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(70, 24),
    new THREE.MeshBasicMaterial({ color: 0x14120e }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.4;
  env.add(ground);

  const bounce = new THREE.Mesh(
    new THREE.PlaneGeometry(36, 20),
    new THREE.MeshBasicMaterial({ color: 0xc47838 }),
  );
  bounce.position.set(-18, 1.2, -22);
  bounce.rotation.y = 0.4;
  env.add(bounce);

  for (const [x, y, z, w, h, color] of [
    [-10, 6.2, 2, 12, 0.7, 0xf4efe6],
    [10, 6.2, 3, 14, 0.7, 0xf4efe6],
    [-22, 2.4, 4, 10, 3.2, 0xf2eee6],
    [22, 3.2, 8, 8, 4.4, 0x2a3238],
    [-8, 1.1, 1.2, 0.4, 2.0, 0xc8ccd0],
    [10, 1.1, 2.4, 0.4, 2.0, 0xc8ccd0],
  ] as const) {
    const card = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.4), new THREE.MeshBasicMaterial({ color }));
    card.position.set(x, y, z);
    env.add(card);
  }

  const hemi = new THREE.HemisphereLight(0xffd2a0, 0x16141c, 0.55);
  env.add(hemi);

  const tex = pmrem.fromScene(env, 0.035).texture;
  pmrem.dispose();
  return tex;
}

export function createPipeline(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  sun: THREE.DirectionalLight,
): CinematicPipeline {
  const composer = new EffectComposer(renderer, {
    frameBufferType: THREE.HalfFloatType,
    multisampling: 0,
  });
  composer.addPass(new RenderPass(scene, camera));
  const normalPass = new NormalPass(scene, camera, { resolutionScale: 0.7 });
  const ssao = new SSAOEffect(camera, normalPass.texture, {
    samples: 11,
    rings: 4,
    intensity: 1.15,
    radius: 0.11,
    bias: 0.04,
    fade: 0.012,
    luminanceInfluence: 0.55,
    worldDistanceThreshold: 18,
    worldDistanceFalloff: 6,
    resolutionScale: 0.65,
  });
  const bloom = new BloomEffect({
    intensity: 0.045,
    luminanceThreshold: 0.78,
    luminanceSmoothing: 0.28,
    mipmapBlur: true,
    radius: 0.42,
  });
  const grade = new BrightnessContrastEffect({ brightness: -0.03, contrast: 0.14 });
  const hue = new HueSaturationEffect({ hue: 0.02, saturation: 0.12 });
  const vignette = new VignetteEffect({
    eskil: false,
    offset: 0.28,
    darkness: 0.42,
  });
  const smaa = new SMAAEffect();
  composer.addPass(normalPass);
  const ssaoPass = new EffectPass(camera, ssao);
  composer.addPass(ssaoPass);
  composer.addPass(new EffectPass(camera, bloom, grade, hue, vignette, smaa));

  let tier: QualityTier = "high";

  function setQuality(next: QualityTier): void {
    tier = next;
    const dprCap = next === "high" ? 1.5 : next === "medium" ? 1.15 : 1;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, dprCap));
    normalPass.enabled = next !== "low";
    ssaoPass.enabled = next !== "low";
    ssao.intensity = next === "high" ? 1.15 : 0.72;
    bloom.intensity = next === "low" ? 0.012 : next === "medium" ? 0.03 : 0.045;
    const shadow = next === "high" ? 2048 : next === "medium" ? 1024 : 512;
    sun.shadow.mapSize.set(shadow, shadow);
    sun.castShadow = next !== "low";
    if (sun.shadow.map) {
      sun.shadow.map.dispose();
      sun.shadow.map = null;
    }
    const w = renderer.domElement.clientWidth;
    const h = renderer.domElement.clientHeight;
    if (w > 0 && h > 0) composer.setSize(w, h);
  }

  return {
    composer,
    resize(w, h) {
      composer.setSize(w, h);
    },
    render() {
      composer.render();
    },
    setQuality,
    tier: () => tier,
  };
}

export function configureKeyLight(light: THREE.DirectionalLight): void {
  light.castShadow = true;
  light.shadow.mapSize.set(2048, 2048);
  light.shadow.camera.near = 2;
  light.shadow.camera.far = 72;
  light.shadow.camera.left = -36;
  light.shadow.camera.right = 36;
  light.shadow.camera.top = 28;
  light.shadow.camera.bottom = -28;
  light.shadow.bias = -0.00035;
  light.shadow.normalBias = 0.035;
}

export function initialQuality(): QualityTier {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = navigator.hardwareConcurrency ?? 8;
  const mem = nav.deviceMemory ?? 8;
  if (cores <= 4 || mem <= 4) return "medium";
  return "high";
}
