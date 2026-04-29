import * as THREE from "three";

export function setupLighting(scene: THREE.Scene): void {
  const keyLight = new THREE.DirectionalLight(0xf5d5b2, 8.5);
  keyLight.position.set(-2, 3, 8);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 60;
  keyLight.shadow.camera.left = -20;
  keyLight.shadow.camera.right = 20;
  keyLight.shadow.camera.top = 20;
  keyLight.shadow.camera.bottom = -20;
  keyLight.shadow.radius = 18;
  keyLight.shadow.bias = -0.001;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xd8eaff, 0.6);
  fillLight.position.set(8, -4, 6);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xfff0e0, 0.3);
  rimLight.position.set(2, 10, -4);
  scene.add(rimLight);

  const frontLight = new THREE.DirectionalLight(0xff8800, 0.18);
  frontLight.position.set(1.5, 0, 10);
  scene.add(frontLight);
}
