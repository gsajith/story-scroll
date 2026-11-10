import * as THREE from "three";
import { LW, LH, LD, DOOR_T, WALL_T } from "./constants";
import type { LockerGeometries } from "./materials";
import { redHatDisplay } from "../../fonts";
import { createTextTexture } from "./textTexture";

/**
 * Adds the four walls to `group` and the back wall to `interior`. The walls stay
 * visible when the door is closed, because neighbouring lockers' walls show
 * through the gaps between doors. The back wall does not.
 */
export function buildLockerShell(
  group: THREE.Group,
  interior: THREE.Group,
  bodyMat: THREE.MeshStandardMaterial,
  interiorBodyMat: THREE.MeshStandardMaterial,
  { wallsGeo, wallBackGeo }: LockerGeometries,
): void {
  const walls = new THREE.Mesh(wallsGeo, interiorBodyMat);
  walls.castShadow = walls.receiveShadow = true;
  group.add(walls);

  const back = new THREE.Mesh(wallBackGeo, bodyMat);
  back.position.set(0, 0, -LD + WALL_T / 2);
  back.castShadow = back.receiveShadow = true;
  interior.add(back);
}

export function buildDoorAssembly(
  group: THREE.Group,
  silverMat: THREE.MeshStandardMaterial,
  { doorGeo, doorHardwareGeo, labelFrameGeo, labelPaperGeo }: LockerGeometries,
  doorMaterials: THREE.Material[],
  labelMat: THREE.MeshStandardMaterial,
): { pivot: THREE.Group; door: THREE.Mesh } {
  const pivot = new THREE.Group();
  pivot.position.set(-LW / 2, 0, DOOR_T / 2);
  group.add(pivot);

  const door = new THREE.Mesh(doorGeo, doorMaterials);
  door.position.x = LW / 2;
  door.castShadow = door.receiveShadow = true;
  pivot.add(door);

  const hardware = new THREE.Mesh(doorHardwareGeo, silverMat);
  hardware.castShadow = hardware.receiveShadow = true;
  pivot.add(hardware);

  const labelFrame = new THREE.Mesh(labelFrameGeo, silverMat);
  labelFrame.position.set(LW / 2, LH / 2 - LH * 0.25, DOOR_T / 2 + 0.009);
  pivot.add(labelFrame);

  const labelPaper = new THREE.Mesh(labelPaperGeo, labelMat);
  labelPaper.position.set(LW / 2, LH / 2 - LH * 0.25, DOOR_T / 2 + 0.0375);
  pivot.add(labelPaper);

  return { pivot, door };
}

/** White door-label paper with `text` printed on it. */
export function createTextLabelMat(text: string): THREE.MeshStandardMaterial {
  const font = `800 76px ${redHatDisplay.style.fontFamily}`;
  const map = createTextTexture(256, 128, [font], (ctx) => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = "#111111";
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 128, 60);
  });
  return new THREE.MeshStandardMaterial({
    map,
    roughness: 0.95,
    metalness: 0,
    envMapIntensity: 0,
  });
}
