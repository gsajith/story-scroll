import * as THREE from "three";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export function setupEnvironment(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  manager: THREE.LoadingManager,
): void {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  new EXRLoader(manager).load(
    "/environment.exr",
    (texture) => {
      scene.environment = pmrem.fromEquirectangular(texture).texture;
      texture.dispose();
      pmrem.dispose();
    },
    undefined,
    () => {
      scene.environment = pmrem.fromScene(new RoomEnvironment()).texture;
      pmrem.dispose();
    },
  );
}
