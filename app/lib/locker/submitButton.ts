import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { LW, LH, BACK_INTERIOR_Z } from "./constants";

export function createSubmitButton(): { group: THREE.Group; mesh: THREE.Mesh } {
  const btnW = LW * 0.55, btnH = LH * 0.18, btnD = 0.15;

  const btnCanvas = document.createElement("canvas");
  btnCanvas.width = 768;
  btnCanvas.height = 160;
  const ctx = btnCanvas.getContext("2d")!;
  ctx.clearRect(0, 0, 768, 160);
  ctx.fillStyle = "#f0ece4";
  ctx.font = "bold 72px 'Helvetica Neue', Helvetica, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("SUBMIT YOUR STORY", 384, 84);

  const mesh = new THREE.Mesh(
    new RoundedBoxGeometry(btnW, btnH, btnD, 8, 0.04),
    new THREE.MeshStandardMaterial({
      color: 0xc23019,
      roughness: 0.55,
      metalness: 0.1,
      envMapIntensity: 0.4,
    }),
  );
  mesh.castShadow = true;

  const labelPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(btnW * 0.88, btnH * 0.72),
    new THREE.MeshStandardMaterial({
      map: new THREE.CanvasTexture(btnCanvas),
      transparent: true,
      roughness: 1,
      metalness: 0,
      envMapIntensity: 0,
    }),
  );
  labelPlane.position.z = btnD / 2 + 0.001;

  const group = new THREE.Group();
  group.add(mesh);
  group.add(labelPlane);
  group.position.set(0, 0, BACK_INTERIOR_Z + btnD / 2 + 0.45);

  return { group, mesh };
}
