/// <reference types="vite/client" />

interface ElectromatApi {
  startNight: () => void;
  state: import("./game/state").GameState;
}

interface Window {
  __electromat: ElectromatApi;
}
