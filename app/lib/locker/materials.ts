import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { LW, LH, LD, DOOR_T, WALL_T } from "./constants";

export type LockerMaterials = {
  bodyMat: THREE.MeshStandardMaterial;
  silverMat: THREE.MeshStandardMaterial;
  labelPaperMat: THREE.MeshStandardMaterial;
  doorMaterials: THREE.Material[];
};

export function createLockerMaterials(): LockerMaterials {
  const whiteMetal = {
    color: 0xc8c4be,
    roughness: 0.6,
    metalness: 0.25,
    envMapIntensity: 1,
  };

  const bodyMat = new THREE.MeshStandardMaterial(whiteMetal);
  const doorFrontMat = new THREE.MeshStandardMaterial({
    ...whiteMetal,
    roughness: 0.5,
    envMapIntensity: 0.7,
  });
  const doorInnerMat = new THREE.MeshStandardMaterial({
    ...whiteMetal,
    color: 0x9a9590,
    roughness: 0.75,
  });
  const doorEdgeMat = new THREE.MeshStandardMaterial({
    ...whiteMetal,
    color: 0xa8a29c,
  });
  const silverMat = new THREE.MeshStandardMaterial({
    color: 0xd4d4d4,
    roughness: 0.0,
    metalness: 1,
    envMapIntensity: 2.5,
    emissive: 0x334466,
    emissiveIntensity: 0.12,
  });
  const labelPaperMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.95,
    metalness: 0.0,
    envMapIntensity: 0.0,
  });

  return {
    bodyMat,
    silverMat,
    labelPaperMat,
    doorMaterials: [doorEdgeMat, doorEdgeMat, doorEdgeMat, doorEdgeMat, doorFrontMat, doorInnerMat],
  };
}

export type LockerGeometries = {
  wallSideGeo: THREE.BoxGeometry;
  wallTopGeo: THREE.BoxGeometry;
  wallBackGeo: THREE.BoxGeometry;
  doorGeo: RoundedBoxGeometry;
  handleBarGeo: THREE.BoxGeometry;
  handleGeo: THREE.BoxGeometry;
  labelFrameGeo: RoundedBoxGeometry;
  labelPaperGeo: THREE.PlaneGeometry;
  doorHingeMatGeo: RoundedBoxGeometry;
  doorHingeGeo: RoundedBoxGeometry;
};

export function createLockerGeometries(): LockerGeometries {
  return {
    wallSideGeo: new THREE.BoxGeometry(WALL_T, LH, LD),
    wallTopGeo: new THREE.BoxGeometry(LW, WALL_T, LD),
    wallBackGeo: new THREE.BoxGeometry(LW, LH, WALL_T),
    doorGeo: new RoundedBoxGeometry(LW, LH, DOOR_T, 5, 0.01),
    handleBarGeo: new THREE.BoxGeometry(LW * 0.35, LH * 0.035, 0.068),
    handleGeo: new THREE.BoxGeometry(LH * 0.035, LH * 0.035, 0.068),
    labelFrameGeo: new RoundedBoxGeometry(LW * 0.23, LH * 0.19, 0.025),
    labelPaperGeo: new THREE.PlaneGeometry(LW * 0.19, LH * 0.15),
    doorHingeMatGeo: new RoundedBoxGeometry(LW * 0.07, LH * 0.2, 0.055),
    doorHingeGeo: new RoundedBoxGeometry(LW * 0.15, LH * 0.06, 0.068),
  };
}
