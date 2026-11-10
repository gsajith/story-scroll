import * as THREE from "three";
import { caveat } from "../../fonts";
import moleMark from "../../assets/mole-mark.png";
import { LW, LH, BACK_INTERIOR_Z, BRAND_BLUE_ALBEDO } from "./constants";
import { createTextTexture } from "./textTexture";

// Renders as #a9bd3c, a lighter tint of the brand green that keeps the blue ink
// readable. `.stickyNote` in LockerScene.module.css uses that rendered hex.
// See the albedo note in constants.ts.
const PAPER_ALBEDO = "#5d7e01";

const LINES = ["Visit our", "Instagram", "@molelitmag", "to learn more."];

// Canvas layout, in pixels of the 512 px texture. The mole mark sits in the top
// right corner at 20% of the note's width, with the same margin to both edges.
const SIZE = 512;
const MARK_W = SIZE * 0.2;
const MARK_H = MARK_W * (moleMark.height / moleMark.width);
const MARK_MARGIN = 40;

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

  const mark = new Image();
  mark.src = moleMark.src;

  const font = `700 88px ${caveat.style.fontFamily}`;
  const draw = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = PAPER_ALBEDO;
    ctx.fillRect(0, 0, SIZE, SIZE);
    if (mark.complete && mark.naturalWidth > 0) {
      ctx.drawImage(mark, SIZE - MARK_MARGIN - MARK_W, MARK_MARGIN, MARK_W, MARK_H);
    }
    ctx.save();
    // Handwriting rarely sits level.
    ctx.translate(SIZE / 2, SIZE / 2);
    ctx.rotate(-0.04);
    ctx.translate(-SIZE / 2, -SIZE / 2);
    ctx.fillStyle = BRAND_BLUE_ALBEDO;
    ctx.font = font;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    LINES.forEach((line, i) => ctx.fillText(line, 52, 172 + i * 92));
    ctx.restore();
  };
  const map = createTextTexture(SIZE, SIZE, [font], draw, [mark]);

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
