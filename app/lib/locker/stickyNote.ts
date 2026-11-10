import * as THREE from "three";
import { caveat } from "../../fonts";
import { LW, LH, BACK_INTERIOR_Z, BRAND_BLUE_ALBEDO } from "./constants";
import { createTextTexture } from "./textTexture";

// Renders as #a9bd3c, a lighter tint of the brand green that keeps the blue ink
// readable. `.stickyNote` in LockerScene.module.css uses that rendered hex.
// See the albedo note in constants.ts.
const PAPER_ALBEDO = "#5d7e01";

const LINES = ["Visit our", "Instagram", "@molelitmag", "to learn more."];

/**
 * Square sticky note stuck to the locker's back wall. The top edge is glued
 * flat and the paper peels toward the viewer further down. It does not animate.
 */
export function createStickyNote(): { group: THREE.Group; mesh: THREE.Mesh } {
  const side = LH * 0.58;
  const geo = new THREE.PlaneGeometry(side, side, 6, 12);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const down = 0.5 - pos.getY(i) / side; // 0 at the glued top edge, 1 at the bottom
    const across = pos.getX(i) / side; // -0.5 left, 0.5 right
    // The bottom-right corner lifts a little more than the bottom-left.
    pos.setZ(i, down * down * (0.11 + across * 0.05));
  }
  geo.computeVertexNormals();

  const font = `700 88px ${caveat.style.fontFamily}`;
  const map = createTextTexture(512, 512, [font], (ctx) => {
    ctx.fillStyle = PAPER_ALBEDO;
    ctx.fillRect(0, 0, 512, 512);
    ctx.save();
    // Handwriting rarely sits level.
    ctx.translate(256, 256);
    ctx.rotate(-0.04);
    ctx.translate(-256, -256);
    ctx.fillStyle = BRAND_BLUE_ALBEDO;
    ctx.font = font;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    LINES.forEach((line, i) => ctx.fillText(line, 58, 150 + i * 96));
    ctx.restore();
  });

  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      map,
      roughness: 0.9,
      metalness: 0,
      envMapIntensity: 0.2,
      side: THREE.DoubleSide,
    }),
  );
  mesh.castShadow = mesh.receiveShadow = true;

  const group = new THREE.Group();
  group.add(mesh);
  group.position.set(LW * 0.03, LH * 0.01, BACK_INTERIOR_Z + 0.006);
  group.rotation.z = -0.045;

  return { group, mesh };
}
