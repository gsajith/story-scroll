import type * as THREE from "three";

export const LW = 2.75;
export const LH = 2.0;
export const LD = 1;
export const GAP = 0.08;
export const DOOR_T = 0.1;
export const WALL_T = 0.03;

export const CELL_W = LW + GAP;
export const CELL_H = LH + GAP;

export const FOV = 30;
export const CAMERA_Z = 15;

export const BACK_INTERIOR_Z = -LD + WALL_T;

// Mole Mag's brand colours are blue #212592 and green #788F14. The key light and
// ACES tone mapping brighten albedos a lot (#212592 as an albedo renders
// periwinkle), so this is the matte albedo (roughness 1, envMapIntensity 0)
// that renders as the brand blue on a surface facing the camera. Found by reading
// pixels back from the canvas. Measure again if the lighting or tone mapping changes.
export const BRAND_BLUE_ALBEDO = "#050b64";

export type Locker = {
  pivot: THREE.Group;
  isOpen: boolean;
  locked: boolean;
  targetAngle: number;
  currentAngle: number;
};
