import * as THREE from "three";
import { FOV, CAMERA_Z } from "./constants";

export function setupScene(mount: HTMLDivElement): {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  width: number;
  height: number;
} {
  const width = mount.clientWidth;
  const height = mount.clientHeight;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

  const camera = new THREE.PerspectiveCamera(FOV, width / height, 0.1, 100);
  camera.position.set(0.3, 0.3, CAMERA_Z);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.8;
  mount.appendChild(renderer.domElement);

  return { scene, camera, renderer, width, height };
}
