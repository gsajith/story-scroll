import * as THREE from "three";
import { LW, LH, WALL_T, BACK_INTERIOR_Z } from "./constants";

// Rich binding/board colours for spines & cover boards (cover art lives on the
// front board's outer face).
const SPINE_COLORS = [
  0x5c2b29, 0x2f4858, 0x6b4226, 0x3a5a40, 0x4a3b5c,
  0x7a4a2b, 0x2b3a4a, 0x6e2b3a, 0x394a2b, 0x3b3b3b,
];

const FLOOR_Y = -LH / 2 + WALL_T; // interior floor
const COVER_ASPECT = 0.64; // width / height of a book face (portrait)

const BOARD_T = 0.018; // cover-board thickness
const OVERHANG = 0.016; // how far boards overhang the page block (top/bottom/fore)

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// --- Shared page-edge texture (thin striations, like stacked sheets) ---------
let _pageEdgeTex: THREE.CanvasTexture | null = null;
let _pageEdgeTexRot: THREE.CanvasTexture | null = null;
function pageEdgeTextures(): { edge: THREE.CanvasTexture; edgeRot: THREE.CanvasTexture } {
  if (_pageEdgeTex && _pageEdgeTexRot) return { edge: _pageEdgeTex, edgeRot: _pageEdgeTexRot };
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#efe7d2";
  ctx.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 2) {
    const shade = 200 + Math.floor(Math.random() * 36); // subtle warm-grey lines
    ctx.strokeStyle = `rgba(${shade - 40},${shade - 50},${shade - 70},0.55)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, 256);
    ctx.stroke();
  }
  const edge = new THREE.CanvasTexture(c);
  edge.colorSpace = THREE.SRGBColorSpace;
  const edgeRot = edge.clone();
  edgeRot.center.set(0.5, 0.5);
  edgeRot.rotation = Math.PI / 2;
  edgeRot.needsUpdate = true;
  _pageEdgeTex = edge;
  _pageEdgeTexRot = edgeRot;
  return { edge, edgeRot };
}

// --- Per-book spine texture (binding colour + faint bands & title block) -----
function makeSpineTexture(color: number): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  const base = new THREE.Color(color);
  ctx.fillStyle = `#${base.getHexString()}`;
  ctx.fillRect(0, 0, 64, 256);
  // raised bands near top & bottom
  const band = base.clone().offsetHSL(0, 0, 0.12);
  ctx.fillStyle = `#${band.getHexString()}`;
  ctx.fillRect(0, 40, 64, 4);
  ctx.fillRect(0, 212, 64, 4);
  // faint title block (gilt-ish)
  const gilt = base.clone().offsetHSL(0.02, -0.1, 0.28);
  ctx.fillStyle = `#${gilt.getHexString()}`;
  ctx.globalAlpha = 0.5;
  ctx.fillRect(14, 96, 36, 6);
  ctx.fillRect(18, 120, 28, 4);
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Build a single hardcover book in its local frame: cover art faces +Z, the
 * bound spine is on -X, the fore-edge is +X. Height runs along Y, thickness
 * along Z. Cover boards overhang the inset page block on the top, bottom and
 * fore edges.
 */
function buildBook(cover: THREE.Texture, bw: number, bh: number, bt: number): THREE.Group {
  const book = new THREE.Group();
  const spineColor = pick(SPINE_COLORS);

  const boardMat = new THREE.MeshStandardMaterial({
    color: spineColor,
    roughness: 0.78,
    metalness: 0.02,
    envMapIntensity: 0.35,
  });
  const coverMat = new THREE.MeshStandardMaterial({
    map: cover,
    roughness: 0.58,
    metalness: 0,
    envMapIntensity: 0.5,
  });
  const spineMat = new THREE.MeshStandardMaterial({
    map: makeSpineTexture(spineColor),
    roughness: 0.74,
    metalness: 0.03,
    envMapIntensity: 0.35,
  });

  const add = (mesh: THREE.Mesh) => {
    mesh.castShadow = mesh.receiveShadow = true;
    book.add(mesh);
    return mesh;
  };

  // Front board — cover art on the outer (+Z) face, board colour elsewhere.
  // BoxGeometry material order: [+X, -X, +Y, -Y, +Z, -Z]
  const front = add(
    new THREE.Mesh(new THREE.BoxGeometry(bw, bh, BOARD_T), [
      boardMat, boardMat, boardMat, boardMat, coverMat, boardMat,
    ]),
  );
  front.position.z = (bt - BOARD_T) / 2;

  // Back board — solid binding colour.
  add(new THREE.Mesh(new THREE.BoxGeometry(bw, bh, BOARD_T), boardMat)).position.z =
    -(bt - BOARD_T) / 2;

  // Spine — wraps the bound edge, textured outer (-X) face.
  const spine = add(
    new THREE.Mesh(new THREE.BoxGeometry(BOARD_T, bh, bt), [
      boardMat, spineMat, boardMat, boardMat, boardMat, boardMat,
    ]),
  );
  spine.position.x = -(bw - BOARD_T) / 2;

  // Page block — inset so the boards overhang it on three sides; striated edges.
  const { edge, edgeRot } = pageEdgeTextures();
  const pageEdgeMat = new THREE.MeshStandardMaterial({ map: edge, roughness: 0.95, metalness: 0 });
  const pageEdgeMatRot = new THREE.MeshStandardMaterial({ map: edgeRot, roughness: 0.95, metalness: 0 });
  const pageInnerMat = new THREE.MeshStandardMaterial({ color: 0xefe7d2, roughness: 0.95, metalness: 0 });
  const pw = bw - BOARD_T - OVERHANG;
  const ph = bh - 2 * OVERHANG;
  const pd = bt - 2 * BOARD_T;
  const pages = add(
    new THREE.Mesh(new THREE.BoxGeometry(pw, ph, pd), [
      pageEdgeMat, // +X fore-edge (visible)
      pageInnerMat, // -X against spine (hidden)
      pageEdgeMatRot, // +Y top
      pageEdgeMatRot, // -Y bottom
      pageInnerMat, // +Z under front board (hidden)
      pageInnerMat, // -Z under back board (hidden)
    ]),
  );
  pages.position.x = (BOARD_T - OVERHANG) / 2;

  return book;
}

/**
 * Build a small stack of upright books leaning against one side wall of a
 * locker, with the cover art angled toward the open side. `covers` is 1–2
 * textures (front-cover art). The returned group is positioned in the locker's
 * local space and is meant to be added directly to a locker `group` (it sits
 * near the back wall so it stays hidden behind a closed door).
 */
export function createBookStack(covers: THREE.Texture[]): THREE.Group {
  const group = new THREE.Group();
  const side = Math.random() < 0.5 ? -1 : 1; // -1 = left wall, +1 = right wall
  const sideWallX = side * (LW / 2 - WALL_T - 0.04);

  covers.forEach((cover, i) => {
    const bh = LH * (0.5 + Math.random() * 0.06); // book height
    const bw = bh * COVER_ASPECT; // cover width
    // Thinner overall with a wider spread of thicknesses (biased toward slim).
    const bt = 0.07 + Math.pow(Math.random(), 1.4) * 0.23; // ~0.07–0.30

    const book = buildBook(cover, bw, bh, bt);

    // Stand mostly upright with just a slight lean toward the side wall
    // (rotation about Z). Books further from the wall lean a touch more.
    const lean = -side * (0.04 + i * 0.02 + Math.random() * 0.02);
    book.rotation.z = lean;

    // Turn the book so the cover art faces the side (toward the open locker),
    // not straight at the viewer — as if shelved spine-in against the wall.
    const turn = -side * (Math.PI * 0.36 + i * 0.04 + Math.random() * 0.03);
    book.rotation.y = turn;

    // World half-extents after the turn (Y-rotation leaves height along Y).
    const halfX = (bw / 2) * Math.abs(Math.cos(turn)) + (bt / 2) * Math.abs(Math.sin(turn));

    // Seat on the floor, tucked against the side wall and near the back.
    const x = sideWallX - side * (halfX + 0.04 + i * (bt + 0.16));
    const y =
      FLOOR_Y +
      (bh / 2) * Math.cos(lean) +
      halfX * Math.abs(Math.sin(lean));
    const z = BACK_INTERIOR_Z + 0.42 + Math.random() * 0.05 + i * 0.05;
    book.position.set(x, y, z);

    group.add(book);
  });

  return group;
}
