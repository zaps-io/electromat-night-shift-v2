import * as THREE from "three";
import { C } from "../brand";

export function buildSkyline(): THREE.Group {
  const root = new THREE.Group();
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(160, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0x101018, side: THREE.BackSide, fog: false }),
  );
  root.add(sky);

  const night = new THREE.Mesh(
    new THREE.PlaneGeometry(180, 28),
    new THREE.MeshBasicMaterial({ color: 0x12121a, fog: false }),
  );
  night.position.set(0, 10, -48);
  root.add(night);

  const win = new THREE.MeshBasicMaterial({ color: 0xffc878, toneMapped: false });
  const dark = new THREE.MeshLambertMaterial({ color: 0x16161c });
  for (let i = 0; i < 28; i++) {
    const w = 2.2 + (i % 5) * 0.7;
    const h = 6 + ((i * 17) % 14);
    const x = -40 + i * 3.1 + (i % 3) * 0.4;
    const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, 2.2), dark);
    tower.position.set(x, h * 0.5 - 0.2, -46 - (i % 4));
    root.add(tower);
    const cols = 3 + (i % 3);
    const rows = Math.max(4, Math.floor(h / 1.15));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if ((r + c + i) % 4 === 0) continue;
        const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.28), win);
        pane.position.set(
          x - w * 0.32 + c * (w * 0.32),
          0.8 + r * 1.05,
          tower.position.z + 1.12,
        );
        root.add(pane);
      }
    }
  }

  const hemi = new THREE.HemisphereLight(0xf0e6d4, C.charcoal, 0.35);
  const moon = new THREE.DirectionalLight(0x8aa0c8, 0.35);
  moon.position.set(-20, 30, 10);
  root.add(hemi, moon);
  return root;
}
