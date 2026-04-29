import * as THREE from "three";
import { GAP, CELL_W, CELL_H } from "./constants";

export function addGapStrips(scene: THREE.Scene, COLS: number, ROWS: number): void {
  const gapMat = new THREE.MeshStandardMaterial({
    color: 0x888480,
    roughness: 0.7,
    metalness: 0.15,
  });
  const GAP_Z = 0.15;
  const totalW = COLS * CELL_W + 4;
  const totalH = ROWS * CELL_H + 4;

  for (let c = 0; c < COLS - 1; c++) {
    const xCenter = (c - (COLS - 1) / 2) * CELL_W + CELL_W / 2;
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(GAP - 0.003, totalH), gapMat);
    strip.position.set(xCenter, 0, GAP_Z);
    strip.receiveShadow = true;
    scene.add(strip);
  }
  for (let r = 0; r < ROWS - 1; r++) {
    const yCenter = (r - (ROWS - 1) / 2) * CELL_H + CELL_H / 2;
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(totalW, GAP - 0.003), gapMat);
    strip.position.set(0, yCenter, GAP_Z - 0.001);
    strip.receiveShadow = true;
    scene.add(strip);
  }
}
