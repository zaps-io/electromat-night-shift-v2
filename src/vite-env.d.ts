/// <reference types="vite/client" />

interface ElectromatApi {
  startNight: () => void;
  act: () => void;
  place: (x: number, z: number, yaw?: number, pitch?: number) => void;
  capture: (w?: number, h?: number) => string;
  state: import("./game/state").GameState;
}

interface Window {
  __electromat: ElectromatApi;
}
