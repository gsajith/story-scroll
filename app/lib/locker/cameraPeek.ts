import * as THREE from "three";

const MAX_PEEK = 1;
const EDGE_ZONE = 0.18;

export function createCameraPeek(camera: THREE.PerspectiveCamera) {
  const base = { x: camera.position.x, y: camera.position.y };
  const offset = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
  let lerp = 0.04;

  return {
    setFromMouse(nx: number, ny: number) {
      const cx = (nx - 0.5) * 2;
      const cy = (ny - 0.5) * 2;
      const sx =
        nx < EDGE_ZONE
          ? (EDGE_ZONE - nx) / EDGE_ZONE
          : nx > 1 - EDGE_ZONE
            ? (nx - (1 - EDGE_ZONE)) / EDGE_ZONE
            : 0;
      const sy =
        ny < EDGE_ZONE
          ? (EDGE_ZONE - ny) / EDGE_ZONE
          : ny > 1 - EDGE_ZONE
            ? (ny - (1 - EDGE_ZONE)) / EDGE_ZONE
            : 0;
      target.x = cx * Math.max(sx, sy) * MAX_PEEK;
      target.y = -cy * Math.max(sx, sy) * MAX_PEEK;
    },

    setFromGyro(gamma: number, beta: number) {
      target.x = Math.max(-1, Math.min(1, gamma / 25)) * MAX_PEEK;
      target.y = Math.max(-1, Math.min(1, (beta - 45) / 25)) * MAX_PEEK * -1;
      lerp = 0.18;
    },

    reset() {
      target.x = 0;
      target.y = 0;
    },

    update() {
      offset.x += (target.x - offset.x) * lerp;
      offset.y += (target.y - offset.y) * lerp;
      camera.position.x = base.x + offset.x;
      camera.position.y = base.y + offset.y;
    },
  };
}
