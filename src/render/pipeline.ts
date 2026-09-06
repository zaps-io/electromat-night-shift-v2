import * as THREE from "three";
import {
  BloomEffect,
  EffectComposer,
  EffectPass,
  RenderPass,
  SMAAEffect,
  VignetteEffect,
} from "postprocessing";

export interface CinematicPipeline {
  composer: EffectComposer;
  resize: (w: number, h: number) => void;
  render: () => void;
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
  renderer.toneMappingExposure = 1.02;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}

export function createNightProbe(renderer: THREE.WebGLRenderer): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene();
  env.add(new THREE.HemisphereLight(0xffd4a8, 0x12141c, 0.48));
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(40, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0x2a2430, side: THREE.BackSide }),
  );
  env.add(sky);
  for (const [x, y, z, color, r] of [
    [-13.6, 5.05, 4.4, 0xf2e4c4, 0.2],
    [-9.9, 5.05, 4.4, 0xf2e4c4, 0.22],
    [-6.2, 5.05, 4.4, 0xf2e4c4, 0.2],
    [8.2, 5.05, 4.4, 0xf2e4c4, 0.2],
    [11.8, 5.05, 4.4, 0xf2e4c4, 0.22],
    [15.4, 5.05, 4.4, 0xf2e4c4, 0.2],
    [-9.9, 5.1, -2.8, 0xf0d8b0, 0.26],
    [11.8, 5.1, -2.8, 0xf0d8b0, 0.26],
    [-22.8, 1.6, 3.4, 0xc46a28, 0.22],
    [-18.0, 4.8, -17.6, 0xffc878, 0.16],
    [18.0, 4.8, -17.6, 0xffc878, 0.16],
    [-8.8, 1.55, 2.15, 0x8a9098, 0.05],
    [11.4, 1.55, 2.15, 0x8a9098, 0.05],
  ] as const) {
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(r, 8, 8),
      new THREE.MeshBasicMaterial({ color }),
    );
    bulb.position.set(x, y, z);
    env.add(bulb);
  }
  const tex = pmrem.fromScene(env, 0.04).texture;
  pmrem.dispose();
  return tex;
}

export function createPipeline(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
): CinematicPipeline {
  const composer = new EffectComposer(renderer, {
    frameBufferType: THREE.HalfFloatType,
    multisampling: 0,
  });
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new BloomEffect({
    intensity: 0.05,
    luminanceThreshold: 0.86,
    luminanceSmoothing: 0.32,
    mipmapBlur: true,
    radius: 0.2,
  });
  const vignette = new VignetteEffect({
    eskil: false,
    offset: 0.32,
    darkness: 0.52,
  });
  const smaa = new SMAAEffect();
  composer.addPass(new EffectPass(camera, bloom, vignette, smaa));

  return {
    composer,
    resize(w, h) {
      composer.setSize(w, h);
    },
    render() {
      composer.render();
    },
  };
}

export function configureKeyLight(light: THREE.DirectionalLight): void {
  light.castShadow = true;
  light.shadow.mapSize.set(2048, 2048);
  light.shadow.camera.near = 2;
  light.shadow.camera.far = 48;
  light.shadow.camera.left = -30;
  light.shadow.camera.right = 30;
  light.shadow.camera.top = 24;
  light.shadow.camera.bottom = -24;
  light.shadow.bias = -0.00035;
  light.shadow.normalBias = 0.03;
}
