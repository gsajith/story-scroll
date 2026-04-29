import * as THREE from "three";
import { LW, LH, BACK_INTERIOR_Z } from "./constants";

export function createCrumpledPaper(): { group: THREE.Group; mesh: THREE.Mesh } {
  const pw = LW * 0.32, ph = pw * Math.SQRT2;
  const pGeo = new THREE.PlaneGeometry(pw, ph, 10, 10);
  const pPos = pGeo.attributes.position as THREE.BufferAttribute;
  for (let vi = 0; vi < pPos.count; vi++) {
    const vx = pPos.getX(vi) / pw;
    const vy = pPos.getY(vi) / ph;
    pPos.setZ(
      vi,
      Math.sin(vx * 8.5 + 1) * 0.025 +
        Math.cos(vy * 6.2) * 0.018 +
        (Math.random() - 0.5) * 0.04,
    );
  }
  pGeo.computeVertexNormals();

  const noteCanvas = document.createElement("canvas");
  noteCanvas.width = 512;
  noteCanvas.height = 512;
  const nc = noteCanvas.getContext("2d")!;
  nc.fillStyle = "#fdf9ee";
  nc.fillRect(0, 0, 512, 512);
  nc.fillStyle = "#1a1a1a";
  nc.font = "bold 32px Georgia, serif";
  nc.textAlign = "left";
  nc.fillText("About Us", 40, 56);
  nc.fillStyle = "#3a3a3a";
  nc.font = "18px Georgia, serif";
  [
    "Lorem ipsum dolor sit amet, consectetur",
    "adipiscing elit. Sed do eiusmod tempor",
    "incididunt ut labore et dolore magna aliqua.",
    "Ut enim ad minim veniam, quis nostrud",
    "exercitation ullamco laboris nisi ut aliquip",
    "ex ea commodo consequat.",
    "",
    "Excepteur sint occaecat cupidatat non",
    "proident, sunt in culpa qui officia deserunt",
    "mollit anim id est laborum.",
  ].forEach((line, i) => nc.fillText(line, 40, 100 + i * 30));

  const mesh = new THREE.Mesh(
    pGeo,
    new THREE.MeshStandardMaterial({
      color: 0xf4f0e6,
      map: new THREE.CanvasTexture(noteCanvas),
      roughness: 0.88,
      metalness: 0,
      side: THREE.DoubleSide,
    }),
  );
  mesh.castShadow = mesh.receiveShadow = true;

  const group = new THREE.Group();
  group.add(mesh);
  group.position.set(-LW * 0.03, -LH * 0.18, BACK_INTERIOR_Z + 0.30);
  group.rotation.set(0.25, 0.04, 0.03);

  return { group, mesh };
}
