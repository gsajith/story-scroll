import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { redHatDisplay } from "../../fonts";
import { LW, LH, BACK_INTERIOR_Z, BRAND_BLUE_ALBEDO } from "./constants";
import { createTextTexture } from "./textTexture";

export const SUBMIT_COLOR = BRAND_BLUE_ALBEDO;
// Renders as a lighter blue, about #2d32b4. Darkening on hover would be hard to see.
export const SUBMIT_HOVER_COLOR = "#0f187f";

// A lighter tint of the brand green #788F14, which was too dim to read on the
// blue (3.3:1). This one is about 8:1. The label is unlit, so it shows as this exact hex.
const LABEL_COLOR = "#bfdd3c";

export function createSubmitButton(): { group: THREE.Group; mesh: THREE.Mesh } {
  const btnW = LW * 0.55, btnH = LH * 0.18, btnD = 0.15;

  const font = `900 66px ${redHatDisplay.style.fontFamily}`;
  const labelTexture = createTextTexture(768, 160, [font], (ctx) => {
    ctx.fillStyle = ctx.strokeStyle = LABEL_COLOR;
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // The stroke thickens the letters past the font's heaviest weight.
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.strokeText("SUBMIT YOUR STORY", 384, 84);
    ctx.fillText("SUBMIT YOUR STORY", 384, 84);
  });

  const mesh = new THREE.Mesh(
    new RoundedBoxGeometry(btnW, btnH, btnD, 8, 0.04),
    new THREE.MeshStandardMaterial({
      color: SUBMIT_COLOR,
      // Matte on purpose: specular and env reflections wash the brand blue out.
      roughness: 1,
      metalness: 0,
      envMapIntensity: 0,
    }),
  );
  mesh.castShadow = true;

  const labelPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(btnW * 0.88, btnH * 0.72),
    new THREE.MeshBasicMaterial({
      map: labelTexture,
      transparent: true,
      toneMapped: false,
    }),
  );
  labelPlane.position.z = btnD / 2 + 0.001;

  const group = new THREE.Group();
  group.add(mesh);
  group.add(labelPlane);
  group.position.set(0, 0, BACK_INTERIOR_Z + btnD / 2 + 0.45);

  return { group, mesh };
}
