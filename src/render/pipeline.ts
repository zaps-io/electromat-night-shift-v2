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
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}

export function createNightProbe(renderer: THREE.WebGLRenderer): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene();
  env.add(new THREE.HemisphereLight(0xffd8a8, 0x0a0c12, 0.85));
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(40, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0x10141c, side: THREE.BackSide }),
  );
  env.add(sky);
  for (const [x, y, z, color, r] of [
    [-8, 5.1, 0.35, 0xffc878, 0.4],
    [-2.6, 5.1, 0.35, 0xffc878, 0.4],
    [2.6, 5.1, 5.85, 0xffc878, 0.4],
    [8, 5.1, 5.85, 0xffc878, 0.4],
    [0, 5.05, -3.4, 0x00d4f5, 0.18],
    [0, 5.05, 9.6, 0x00d4f5, 0.18],
    [-12.6, 1.8, 5.4, 0xff9a3c, 0.7],
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
    intensity: 0.18,
    luminanceThreshold: 0.66,
    luminanceSmoothing: 0.18,
    mipmapBlur: true,
    radius: 0.36,
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
