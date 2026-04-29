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

export type Locker = {
  pivot: THREE.Group;
  isOpen: boolean;
  locked: boolean;
  targetAngle: number;
  currentAngle: number;
};
