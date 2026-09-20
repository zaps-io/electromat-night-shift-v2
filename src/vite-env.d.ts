/// <reference types="vite/client" />

interface ElectromatApi {
  startNight: () => void;
  act: () => void;
  place: (x: number, z: number, yaw?: number, pitch?: number, eyeY?: number) => void;
  lookAt: (x: number, y: number, z: number) => void;
  position: { x: number; y: number; z: number };
  target: import("./game/interact").InteractResult;
  walkTo: (x: number, z: number) => void;
  clickWalk: (clientX: number, clientY: number) => void;
  hold: (code: string) => void;
  release: (code: string) => void;
  runFpvSmoke: () => Promise<{
    prompt: string;
    objective: string;
    auto: number;
    wave: number;
    zip: number;
    wavePrompt: string;
    unplugPrompt: string;
    x: number;
    z: number;
    playable: boolean;
    westCancelled: boolean;
  }>;
  step: (dt?: number) => void;
  advance: (dtMin: number) => void;
  ready: boolean;
  destination: { x: number; z: number } | null;
  doorHint: string;
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
