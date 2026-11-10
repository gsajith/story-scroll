import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { LW, LH, LD, DOOR_T, WALL_T } from "./constants";

export type LockerMaterials = {
  bodyMat: THREE.MeshStandardMaterial;
  interiorBodyMat: THREE.MeshStandardMaterial;
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
  const interiorBodyMat = new THREE.MeshStandardMaterial({
    ...whiteMetal,
    color: 0xbab6af,
  });
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
    interiorBodyMat,
    silverMat,
    labelPaperMat,
    // Indexed by the three groups of `doorGeo`: edges, front, inside.
    doorMaterials: [doorEdgeMat, doorFrontMat, doorInnerMat],
  };
}

export type LockerGeometries = {
  wallsGeo: THREE.BufferGeometry;
  wallBackGeo: THREE.BoxGeometry;
  doorGeo: RoundedBoxGeometry;
  doorHardwareGeo: THREE.BufferGeometry;
  labelFrameGeo: RoundedBoxGeometry;
  labelPaperGeo: THREE.PlaneGeometry;
};

// Left, right, top and bottom walls as one geometry, positioned in the locker's local space.
function createWallsGeo(): THREE.BufferGeometry {
  const side = new THREE.BoxGeometry(WALL_T, LH, LD);
  const top = new THREE.BoxGeometry(LW, WALL_T, LD);
  return mergeGeometries([
    side.clone().translate(-LW / 2 + WALL_T / 2, 0, -LD / 2),
    side.clone().translate(LW / 2 - WALL_T / 2, 0, -LD / 2),
    top.clone().translate(0, LH / 2 - WALL_T / 2, -LD / 2),
    top.clone().translate(0, -LH / 2 + WALL_T / 2, -LD / 2),
  ]);
}

// A box draws each face as its own group, which costs one draw call per face.
// The four edge faces share a material, so they become a single group.
function createDoorGeo(): RoundedBoxGeometry {
  const geo = new RoundedBoxGeometry(LW, LH, DOOR_T, 2, 0.01);
  const [firstEdge, , , , front, inside] = geo.groups;
  geo.clearGroups();
  geo.addGroup(firstEdge.start, front.start - firstEdge.start, 0);
  geo.addGroup(front.start, front.count, 1);
  geo.addGroup(inside.start, inside.count, 2);
  return geo;
}

// Handle bar, its two posts, and both hinges as one geometry, so each door draws
// its silver parts in a single call. Positions are relative to the door pivot.
function createDoorHardwareGeo(): THREE.BufferGeometry {
  const post = new THREE.BoxGeometry(LH * 0.035, LH * 0.035, 0.068);
  const hinge = new RoundedBoxGeometry(LW * 0.15, LH * 0.06, 0.068);
  const hingePlate = new RoundedBoxGeometry(LW * 0.07, LH * 0.2, 0.055);
  // Rounded boxes are non-indexed and plain boxes are indexed. Merging needs them to match.
  const at = (geo: THREE.BufferGeometry, x: number, y: number, z: number) =>
    (geo.index ? geo.toNonIndexed() : geo.clone()).translate(x, y, z);
  return mergeGeometries([
    at(new THREE.BoxGeometry(LW * 0.35, LH * 0.035, 0.068), LW / 2, LH * -0.12, DOOR_T / 2 + 0.068),
    at(post, LW / 2 - 0.45, LH * -0.12, DOOR_T / 2),
    at(post, LW / 2 + 0.45, LH * -0.12, DOOR_T / 2),
    at(hinge, LW * 0.065, LH * -0.32, DOOR_T * -0.7),
    at(hinge, LW * 0.065, LH * 0.32, DOOR_T * -0.7),
    at(hingePlate, LW * 0.115, LH * -0.32, DOOR_T * -0.55),
    at(hingePlate, LW * 0.115, LH * 0.32, DOOR_T * -0.55),
  ]);
}

export function createLockerGeometries(): LockerGeometries {
  return {
    wallsGeo: createWallsGeo(),
    wallBackGeo: new THREE.BoxGeometry(LW, LH, WALL_T),
    doorGeo: createDoorGeo(),
    doorHardwareGeo: createDoorHardwareGeo(),
    labelFrameGeo: new RoundedBoxGeometry(LW * 0.23, LH * 0.19, 0.025),
    labelPaperGeo: new THREE.PlaneGeometry(LW * 0.19, LH * 0.15),
  };
}
