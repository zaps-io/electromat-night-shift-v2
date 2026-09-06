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
  renderer.toneMappingExposure = 0.96;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}

export function createNightProbe(renderer: THREE.WebGLRenderer): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene();
  env.add(new THREE.HemisphereLight(0xffd8a8, 0x0a0c12, 0.48));
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(40, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0x10141c, side: THREE.BackSide }),
  );
  env.add(sky);
  for (const [x, y, z, color, r] of [
    [-7.4, 5.05, 3.15, 0xe8eef6, 0.22],
    [-2.45, 5.05, 3.15, 0xe8eef6, 0.22],
    [2.45, 5.05, 3.15, 0xe8eef6, 0.22],
    [7.4, 5.05, 3.15, 0xe8eef6, 0.22],
    [-8, 5.1, 0.35, 0xdce6f2, 0.38],
    [8, 5.1, 5.85, 0xdce6f2, 0.38],
    [0, 5.08, -3.5, 0xe8eef8, 0.52],
    [0, 5.08, 9.7, 0xe8eef8, 0.56],
    [-12.35, 5.08, 3.1, 0xdce6f2, 0.16],
    [12.35, 5.08, 3.1, 0xdce6f2, 0.16],
    [-6, 5.08, -3.5, 0xe8eef6, 0.12],
    [6, 5.08, -3.5, 0xe8eef6, 0.12],
    [-10.55, 1.4, 2.55, 0xc46a28, 0.28],
    [-16.8, 4.4, 0.4, 0xffc878, 0.22],
    [12.6, 4.4, 8.4, 0xffc878, 0.22],
    [-7.4, 1.55, 1.6, 0x8a9098, 0.06],
    [-3.8, 1.55, 1.6, 0x8a9098, 0.06],
    [-0.2, 1.55, 1.6, 0x8a9098, 0.06],
    [3.4, 1.55, 1.6, 0x8a9098, 0.06],
    [-5.0, 1.8, -1.0, 0xeee6d8, 0.14],
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
  light.shadow.camera.left = -20;
  light.shadow.camera.right = 20;
  light.shadow.camera.top = 16;
  light.shadow.camera.bottom = -16;
  light.shadow.bias = -0.00035;
  light.shadow.normalBias = 0.03;
}
