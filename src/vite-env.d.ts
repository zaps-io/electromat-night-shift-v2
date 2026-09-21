/// <reference types="vite/client" />

interface ElectromatApi {
  startNight: () => void;
  act: () => void;
  place: (x: number, z: number, yaw?: number, pitch?: number, eyeY?: number) => void;
  lookAt: (x: number, y: number, z: number) => void;
  position: { x: number; y: number; z: number };
  pitch: number;
  locked: boolean;
  lock: () => void;
  eHeard: number;
  target: import("./game/interact").InteractResult;
  walkTo: (x: number, z: number) => void;
  clickWalk: (clientX: number, clientY: number) => void;
  hold: (code: string) => void;
  release: (code: string) => void;
  step: (dt?: number) => void;
  advance: (dtMin: number) => void;
  ready: boolean;
  destination: { x: number; z: number } | null;
  doorHint: string;
  doorLine: string;
  inPlayable: (x: number, z: number) => boolean;
  capture: (w?: number, h?: number) => string;
  carProbe: (w?: number, h?: number) => string;
  hullDebug: () => {
    source?: string;
    meshCount?: number;
    paintVerts?: number;
    lodFillers?: number;
    transmission?: number;
    transparentBody?: number;
  };
  state: import("./game/state").GameState;
}

interface Window {
  __electromat: ElectromatApi;
}
