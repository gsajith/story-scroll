import * as THREE from "three";

/**
 * Canvas texture for text set in a web font. Canvas text drawn before the font
 * has loaded falls back to a system font, so `draw` runs once now and again
 * when every font in `fonts` (CSS font shorthands) and every image in `images`
 * is ready. `draw` must skip an image that is not `complete` yet.
 */
export function createTextTexture(
  width: number,
  height: number,
  fonts: string[],
  draw: (ctx: CanvasRenderingContext2D) => void,
  images: HTMLImageElement[] = [],
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  draw(ctx);
  // allSettled: a font or image that fails to load should not block the rest.
  Promise.allSettled([
    ...fonts.map((font) => document.fonts.load(font)),
    ...images.map((image) => image.decode()),
  ]).then(() => {
    ctx.clearRect(0, 0, width, height);
    draw(ctx);
    texture.needsUpdate = true;
  });

  return texture;
}
