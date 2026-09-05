export type MeshPart =
  | "paint"
  | "glass"
  | "chrome"
  | "rubber"
  | "light"
  | "interior"
  | "port";

export interface BuiltPart {
  name: MeshPart;
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
}

export const PAINT_PRESETS = [
  { name: "pearl", color: 0xf4f1ea },
  { name: "navy", color: 0x1a2230 },
  { name: "charcoal", color: 0x2a2c32 },
  { name: "cream", color: 0xe8e2d4 },
] as const;
