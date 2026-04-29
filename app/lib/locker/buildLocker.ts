import * as THREE from "three";
import { LW, LH, LD, DOOR_T, WALL_T } from "./constants";
import type { LockerGeometries } from "./materials";

export function buildLockerShell(
  group: THREE.Group,
  bodyMat: THREE.MeshStandardMaterial,
  { wallSideGeo, wallTopGeo, wallBackGeo }: LockerGeometries,
): void {
  const add = (mesh: THREE.Mesh) => {
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  add(new THREE.Mesh(wallSideGeo, bodyMat)).position.set(-LW / 2 + WALL_T / 2, 0, -LD / 2);
  add(new THREE.Mesh(wallSideGeo, bodyMat)).position.set(LW / 2 - WALL_T / 2, 0, -LD / 2);
  add(new THREE.Mesh(wallTopGeo, bodyMat)).position.set(0, LH / 2 - WALL_T / 2, -LD / 2);
  add(new THREE.Mesh(wallTopGeo, bodyMat)).position.set(0, -LH / 2 + WALL_T / 2, -LD / 2);
  add(new THREE.Mesh(wallBackGeo, bodyMat)).position.set(0, 0, -LD + WALL_T / 2);
}

export function buildDoorAssembly(
  group: THREE.Group,
  silverMat: THREE.MeshStandardMaterial,
  geos: LockerGeometries,
  doorMaterials: THREE.Material[],
  labelMat: THREE.MeshStandardMaterial,
): THREE.Group {
  const {
    doorGeo, handleBarGeo, handleGeo,
    labelFrameGeo, labelPaperGeo,
    doorHingeMatGeo, doorHingeGeo,
  } = geos;

  const pivot = new THREE.Group();
  pivot.position.set(-LW / 2, 0, DOOR_T / 2);
  group.add(pivot);

  const addSilver = (mesh: THREE.Mesh) => {
    mesh.castShadow = mesh.receiveShadow = true;
    pivot.add(mesh);
    return mesh;
  };

  const door = new THREE.Mesh(doorGeo, doorMaterials);
  door.position.x = LW / 2;
  door.castShadow = door.receiveShadow = true;
  pivot.add(door);

  addSilver(new THREE.Mesh(handleBarGeo, silverMat)).position.set(LW / 2, LH * -0.12, DOOR_T / 2 + 0.068);
  addSilver(new THREE.Mesh(handleGeo, silverMat)).position.set(LW / 2 - 0.45, LH * -0.12, DOOR_T / 2);
  addSilver(new THREE.Mesh(handleGeo, silverMat)).position.set(LW / 2 + 0.45, LH * -0.12, DOOR_T / 2);
  addSilver(new THREE.Mesh(doorHingeGeo, silverMat)).position.set(LW * 0.065, LH * -0.32, DOOR_T * -0.7);
  addSilver(new THREE.Mesh(doorHingeGeo, silverMat)).position.set(LW * 0.065, LH * 0.32, DOOR_T * -0.7);
  addSilver(new THREE.Mesh(doorHingeMatGeo, silverMat)).position.set(LW * 0.115, LH * -0.32, DOOR_T * -0.55);
  addSilver(new THREE.Mesh(doorHingeMatGeo, silverMat)).position.set(LW * 0.115, LH * 0.32, DOOR_T * -0.55);

  const labelFrame = new THREE.Mesh(labelFrameGeo, silverMat);
  labelFrame.position.set(LW / 2, LH / 2 - LH * 0.25, DOOR_T / 2 + 0.009);
  pivot.add(labelFrame);

  const labelPaper = new THREE.Mesh(labelPaperGeo, labelMat);
  labelPaper.position.set(LW / 2, LH / 2 - LH * 0.25, DOOR_T / 2 + 0.0375);
  pivot.add(labelPaper);

  return pivot;
}

export function createAboutUsLabelMat(): THREE.MeshStandardMaterial {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = "#111111";
  ctx.font = "bold 36px 'Helvetica Neue', Helvetica, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("ABOUT US", 128, 64);
  return new THREE.MeshStandardMaterial({
    map: new THREE.CanvasTexture(canvas),
    roughness: 0.95,
    metalness: 0,
    envMapIntensity: 0,
  });
}
