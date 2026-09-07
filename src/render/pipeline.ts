import * as THREE from "three";
import {
  BloomEffect,
  EffectComposer,
  EffectPass,
  RenderPass,
  SMAAEffect,
  VignetteEffect,
} from "postprocessing";
import { duskSky } from "../world/tex";

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
  renderer.toneMappingExposure = 0.86;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
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
): CinematicPipeline {
  const composer = new EffectComposer(renderer, {
    frameBufferType: THREE.HalfFloatType,
    multisampling: 0,
  });
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new BloomEffect({
    intensity: 0.035,
    luminanceThreshold: 0.9,
    luminanceSmoothing: 0.28,
    mipmapBlur: true,
    radius: 0.18,
  });
  const vignette = new VignetteEffect({
    eskil: false,
    offset: 0.3,
    darkness: 0.46,
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
  light.shadow.camera.far = 56;
  light.shadow.camera.left = -32;
  light.shadow.camera.right = 32;
  light.shadow.camera.top = 26;
  light.shadow.camera.bottom = -26;
  light.shadow.bias = -0.00035;
  light.shadow.normalBias = 0.03;
}
