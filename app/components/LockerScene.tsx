"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const LW = 2.75; // locker width
const LH = 2.0; // locker height
const LD = 1; // locker depth
const GAP = 0.08;
const DOOR_T = 0.1;
const WALL_T = 0.03; // cabinet wall thickness — no front face, so interior is open

const CELL_W = LW + GAP;
const CELL_H = LH + GAP;

const FOV = 30;
const CAMERA_Z = 15;

// z of the interior face of the back wall
const BACK_INTERIOR_Z = -LD + WALL_T;

export default function LockerScene() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [sceneReady, setSceneReady] = useState(false);

  useEffect(() => {
    const mount = mountRef.current!;
    const W = mount.clientWidth;
    const H = mount.clientHeight;

    // --- Scene ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);

    // --- Camera ---
    const camera = new THREE.PerspectiveCamera(FOV, W / H, 0.1, 100);
    camera.position.set(0.3, 0.3, CAMERA_Z);

    // --- Renderer ---
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;
    mount.appendChild(renderer.domElement);

    // --- Loading manager — fires setSceneReady once all assets complete/fail ---
    const loadingManager = new THREE.LoadingManager();
    const markReady = () => setSceneReady(true);
    loadingManager.onLoad = markReady;
    // onError fires per-item in some Three.js versions and doesn't trigger onLoad,
    // so track failures manually and show the scene regardless.
    let pendingItems = 1; // 1 EXR
    const itemDone = () => {
      if (--pendingItems <= 0) markReady();
    };
    loadingManager.onLoad = () => {
      pendingItems = 0;
      markReady();
    };
    loadingManager.onError = itemDone;
    // Hard timeout so a stalled load never leaves the screen black
    const readyTimeout = setTimeout(markReady, 8000);

    // --- Environment (IBL for metal reflections) ---
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();

    new EXRLoader(loadingManager).load(
      "/environment.exr",
      (texture) => {
        scene.environment = pmrem.fromEquirectangular(texture).texture;
        texture.dispose();
        pmrem.dispose();
      },
      undefined,
      () => {
        // Fallback to RoomEnvironment if EXR is missing or invalid
        scene.environment = pmrem.fromScene(new RoomEnvironment()).texture;
        pmrem.dispose();
      },
    );

    // --- Lighting ---
    // Key light: upper-left, strongly off-axis to create directional shading across locker faces
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

    // Soft fill from lower-right to lift shadow areas slightly
    const fillLight = new THREE.DirectionalLight(0xd8eaff, 0.6);
    fillLight.position.set(8, -4, 6);
    scene.add(fillLight);

    // Rim from above-back for edge separation
    const rimLight = new THREE.DirectionalLight(0xfff0e0, 0.3);
    rimLight.position.set(2, 10, -4);
    scene.add(rimLight);

    // Subtle frontal fill to lift the flattest shadow areas without washing out
    const frontLight = new THREE.DirectionalLight(0xff8800, 0.18);
    frontLight.position.set(1.5, 0, 10);
    scene.add(frontLight);

    // --- Materials ---
    const whiteMetal = {
      color: 0xc8c4be,
      roughness: 0.6,
      metalness: 0.25,
      envMapIntensity: 1,
    };
    const bodyMat = new THREE.MeshStandardMaterial(whiteMetal);
    const doorFrontMat = new THREE.MeshStandardMaterial({
      ...whiteMetal,
      roughness: 0.5,
      envMapIntensity: 0.7,
    });
    const doorInnerMat = new THREE.MeshStandardMaterial({
      ...whiteMetal,
      color: 0x9a9590,
      roughness: 0.75,
    });
    const doorEdgeMat = new THREE.MeshStandardMaterial({
      ...whiteMetal,
      color: 0xa8a29c,
    });

    // Shiny silver — handle and label frame
    const silverMat = new THREE.MeshStandardMaterial({
      color: 0xd4d4d4,
      roughness: 0.0,
      metalness: 1,
    });
    const handleMat = silverMat;
    const labelFrameMat = silverMat;

    const labelPaperMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.95,
      metalness: 0.0,
      envMapIntensity: 0.0,
    });

    // Screen placeholder
    const screenMat = new THREE.MeshStandardMaterial({
      color: 0xaaa,
      roughness: 0,
      metalness: 0.95,
    });

    // --- Shared geometries ---
    // Cabinet shell — 5 panels, NO front face (opening is left empty)
    const wallSideGeo = new THREE.BoxGeometry(WALL_T, LH, LD);
    const wallTopGeo = new THREE.BoxGeometry(LW, WALL_T, LD);
    const wallBackGeo = new THREE.BoxGeometry(LW, LH, WALL_T);

    // Door
    const doorGeo = new RoundedBoxGeometry(LW, LH, DOOR_T, 5, 0.01);

    const doorMaterials = [
      doorEdgeMat, // +x
      doorEdgeMat, // -x
      doorEdgeMat, // +y
      doorEdgeMat, // -y
      doorFrontMat, // +z outer  face
      doorInnerMat, // -z inner face
    ];

    // Door details
    const handleBarGeo = new THREE.BoxGeometry(LW * 0.35, LH * 0.035, 0.068);
    const handleGeo = new THREE.BoxGeometry(LH * 0.035, LH * 0.035, 0.068);
    const labelFrameGeo = new RoundedBoxGeometry(LW * 0.23, LH * 0.19, 0.025);
    const labelPaperGeo = new THREE.PlaneGeometry(LW * 0.19, LH * 0.15);
    const doorHingeMatGeo = new RoundedBoxGeometry(LW * 0.07, LH * 0.2, 0.055);
    const doorHingeGeo = new RoundedBoxGeometry(LW * 0.15, LH * 0.06, 0.068);

    // Interior screen
    const screenGeo = new THREE.PlaneGeometry(LW * 0.65, LH * 0.58);

    // --- Compute grid ---
    const vFOV = (FOV * Math.PI) / 180;
    const visH = 2 * CAMERA_Z * Math.tan(vFOV / 2);
    const visW = visH * (W / H);
    const COLS = Math.ceil(visW / CELL_W) + 3;
    const ROWS = Math.ceil(visH / CELL_H) + 3;

    // --- Gap wall strips (fill only the spaces between lockers) ---
    // Strips sit at z=0.05, inside closed door thickness (0–0.1), so doors occlude them.
    // They only cover gap-width bands in x/y, leaving locker openings clear.
    const gapMat = new THREE.MeshStandardMaterial({
      color: 0x888480,
      roughness: 0.7,
      metalness: 0.15,
    });
    const GAP_Z = 0.15;
    const totalW = COLS * CELL_W + 4;
    const totalH = ROWS * CELL_H + 4;

    // Vertical strips at each inter-column gap
    for (let c = 0; c < COLS - 1; c++) {
      const xCenter = (c - (COLS - 1) / 2) * CELL_W + CELL_W / 2;
      const strip = new THREE.Mesh(
        new THREE.PlaneGeometry(GAP - 0.003, totalH),
        gapMat,
      );
      strip.position.set(xCenter, 0, GAP_Z);
      strip.receiveShadow = true;
      scene.add(strip);
    }

    // Horizontal strips at each inter-row gap (slightly behind verticals to avoid z-fight)
    for (let r = 0; r < ROWS - 1; r++) {
      const yCenter = (r - (ROWS - 1) / 2) * CELL_H + CELL_H / 2;
      const strip = new THREE.Mesh(
        new THREE.PlaneGeometry(totalW, GAP - 0.003),
        gapMat,
      );
      strip.position.set(0, yCenter, GAP_Z - 0.001);
      strip.receiveShadow = true;
      scene.add(strip);
    }

    type Locker = {
      pivot: THREE.Group;
      isOpen: boolean;
      locked: boolean; // permanently open, not clickable
      targetAngle: number;
      currentAngle: number;
    };
    const lockers: Locker[] = [];

    const centerIdx = Math.floor(ROWS / 2) * COLS + Math.floor(COLS / 2);

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const group = new THREE.Group();
        group.position.set(
          (col - (COLS - 1) / 2) * CELL_W,
          (row - (ROWS - 1) / 2) * CELL_H,
          0,
        );

        // ---- Cabinet shell (hollow — open front) ----
        const leftWall = new THREE.Mesh(wallSideGeo, bodyMat);
        leftWall.position.set(-LW / 2 + WALL_T / 2, 0, -LD / 2);
        leftWall.castShadow = true;
        leftWall.receiveShadow = true;
        group.add(leftWall);

        const rightWall = new THREE.Mesh(wallSideGeo, bodyMat);
        rightWall.position.set(LW / 2 - WALL_T / 2, 0, -LD / 2);
        rightWall.castShadow = true;
        rightWall.receiveShadow = true;
        group.add(rightWall);

        const topWall = new THREE.Mesh(wallTopGeo, bodyMat);
        topWall.position.set(0, LH / 2 - WALL_T / 2, -LD / 2);
        topWall.castShadow = true;
        topWall.receiveShadow = true;
        group.add(topWall);

        const bottomWall = new THREE.Mesh(wallTopGeo, bodyMat);
        bottomWall.position.set(0, -LH / 2 + WALL_T / 2, -LD / 2);
        bottomWall.castShadow = true;
        bottomWall.receiveShadow = true;
        group.add(bottomWall);

        const backWall = new THREE.Mesh(wallBackGeo, bodyMat);
        backWall.position.set(0, 0, -LD + WALL_T / 2);
        backWall.castShadow = true;
        backWall.receiveShadow = true;
        group.add(backWall);

        // TODO: Screen placeholder — just in front of back wall interior face
        const isCenter =
          row === Math.floor(ROWS / 2) && col === Math.floor(COLS / 2);
        if (!isCenter) {
          const screen = new THREE.Mesh(screenGeo, screenMat);
          screen.position.set(0, LH * 0.03, BACK_INTERIOR_Z + 0.01);
          group.add(screen);
        }

        // ---- Door (pivots on left hinge) ----
        const pivot = new THREE.Group();
        pivot.position.set(-LW / 2, 0, DOOR_T / 2);
        group.add(pivot);

        const door = new THREE.Mesh(doorGeo, doorMaterials);
        door.position.x = LW / 2;
        door.castShadow = true;
        door.receiveShadow = true;
        pivot.add(door);

        // Handle bar + mounting plates
        const handleBar = new THREE.Mesh(handleBarGeo, handleMat);
        handleBar.position.set(LW / 2, LH * -0.12, DOOR_T / 2 + 0.068);
        handleBar.receiveShadow = true;
        handleBar.castShadow = true;
        pivot.add(handleBar);
        const handleBarMount1 = new THREE.Mesh(handleGeo, handleMat);
        const handleBarMount2 = new THREE.Mesh(handleGeo, handleMat);
        handleBarMount1.position.set(LW / 2 - 0.45, LH * -0.12, DOOR_T / 2);
        handleBarMount2.position.set(LW / 2 + 0.45, LH * -0.12, DOOR_T / 2);
        handleBarMount1.castShadow = true;
        handleBarMount1.receiveShadow = true;
        handleBarMount2.castShadow = true;
        handleBarMount2.receiveShadow = true;
        pivot.add(handleBarMount1);
        pivot.add(handleBarMount2);

        // Pivoting door hinge
        const doorHinge = new THREE.Mesh(doorHingeGeo, silverMat);
        doorHinge.position.set(LW * 0.065, LH * -0.32, DOOR_T * -0.7);
        doorHinge.receiveShadow = true;
        doorHinge.castShadow = true;
        pivot.add(doorHinge);
        const doorHinge2 = new THREE.Mesh(doorHingeGeo, silverMat);
        doorHinge2.position.set(LW * 0.065, LH * 0.32, DOOR_T * -0.7);
        doorHinge2.receiveShadow = true;
        doorHinge2.castShadow = true;
        pivot.add(doorHinge2);
        const doorHingeMat = new THREE.Mesh(doorHingeMatGeo, silverMat);
        doorHingeMat.position.set(LW * 0.115, LH * -0.32, DOOR_T * -0.55);
        doorHingeMat.receiveShadow = true;
        doorHingeMat.castShadow = true;
        pivot.add(doorHingeMat);
        const doorHingeMat2 = new THREE.Mesh(doorHingeMatGeo, silverMat);
        doorHingeMat2.position.set(LW * 0.115, LH * 0.32, DOOR_T * -0.55);
        doorHingeMat2.receiveShadow = true;
        doorHingeMat2.castShadow = true;
        pivot.add(doorHingeMat2);

        // Label holder
        const labelFrame = new THREE.Mesh(labelFrameGeo, labelFrameMat);
        labelFrame.position.set(LW / 2, LH / 2 - LH * 0.25, DOOR_T / 2 + 0.009);
        pivot.add(labelFrame);

        const labelPaper = new THREE.Mesh(labelPaperGeo, labelPaperMat);
        labelPaper.position.set(
          LW / 2,
          LH / 2 - LH * 0.25,
          DOOR_T / 2 + 0.0375,
        );
        pivot.add(labelPaper);

        scene.add(group);

        lockers.push({
          pivot,
          isOpen: false,
          locked: false,
          targetAngle: 0,
          currentAngle: 0,
        });
      }
    }

    // --- Initial open state — doors swing open sequentially after load ---
    lockers[centerIdx].locked = true;

    const extraCount = 3 + Math.floor(Math.random() * 2);
    const candidates = lockers.map((_, i) => i).filter((i) => i !== centerIdx);
    const openOrder: number[] = [centerIdx];
    for (let i = 0; i < extraCount; i++) {
      const pick = Math.floor(Math.random() * candidates.length);
      openOrder.push(candidates.splice(pick, 1)[0]);
    }

    const openTimeouts: ReturnType<typeof setTimeout>[] = [];
    openOrder.forEach((idx, i) => {
      const t = setTimeout(
        () => {
          const locker = lockers[idx];
          locker.isOpen = true;
          locker.targetAngle =
            idx === centerIdx
              ? -Math.PI * 0.5
              : -Math.PI * (0.48 + Math.random() * 0.1);
        },
        300 + i * (Math.random() * 300 + 300),
      );
      openTimeouts.push(t);
    });

    // --- Camera peek state ---
    const BASE_CAM = { x: camera.position.x, y: camera.position.y };
    const camOffset = { x: 0, y: 0 };
    const camTarget = { x: 0, y: 0 };
    const camRotOffset = { x: 0, y: 0 };
    const camRotTarget = { x: 0, y: 0 };
    let camLerp = 0.04; // overridden to faster rate when gyro is active
    const MAX_PEEK = 0.7;
    const MAX_TILT = 0.06; // radians (~3.4°) for gyro tilt
    const EDGE_ZONE = 0.18;

    const setEdgePeekTarget = (nx: number, ny: number) => {
      let tx = 0,
        ty = 0;
      if (nx < EDGE_ZONE) {
        tx = -((EDGE_ZONE - nx) / EDGE_ZONE) * MAX_PEEK;
      } else if (nx > 1 - EDGE_ZONE) {
        tx = ((nx - (1 - EDGE_ZONE)) / EDGE_ZONE) * MAX_PEEK;
      }
      if (ny < EDGE_ZONE) {
        ty = ((EDGE_ZONE - ny) / EDGE_ZONE) * MAX_PEEK;
      } else if (ny > 1 - EDGE_ZONE) {
        ty = -((ny - (1 - EDGE_ZONE)) / EDGE_ZONE) * MAX_PEEK;
      }
      camTarget.x = tx;
      camTarget.y = ty;
    };

    // --- Interaction ---
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const handleInteraction = (clientX: number, clientY: number) => {
      const rect = mount.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);

      const doorMeshes = lockers
        .map((l) => l.pivot.children[0])
        .filter((c): c is THREE.Mesh => c instanceof THREE.Mesh);

      const hits = raycaster.intersectObjects(doorMeshes);
      if (hits.length > 0) {
        const idx = doorMeshes.indexOf(hits[0].object as THREE.Mesh);
        if (idx !== -1) {
          const locker = lockers[idx];
          if (locker.locked) {
            // Nudge ~25% toward closed then spring back
            locker.targetAngle = -Math.PI * 0.46;
            setTimeout(() => {
              locker.targetAngle = -Math.PI * 0.5;
            }, 320);
            return;
          }
          locker.isOpen = !locker.isOpen;
          locker.targetAngle = locker.isOpen
            ? -Math.PI * (0.48 + Math.random() * 0.1)
            : 0;
        }
      }
    };

    const onClick = (e: MouseEvent) => handleInteraction(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => {
      e.preventDefault();
      attachGyro(); // must be synchronously inside a touch handler for iOS 13+ permission
      if (e.changedTouches.length > 0) {
        handleInteraction(
          e.changedTouches[0].clientX,
          e.changedTouches[0].clientY,
        );
      }
    };
    mount.addEventListener("click", onClick);
    mount.addEventListener("touchend", onTouch, { passive: false });

    const onMouseMove = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top) / rect.height;
      pointer.x = nx * 2 - 1;
      pointer.y = -(ny * 2 - 1);
      raycaster.setFromCamera(pointer, camera);
      const doorMeshes = lockers
        .map((l) => l.pivot.children[0])
        .filter((c): c is THREE.Mesh => c instanceof THREE.Mesh);
      const hits = raycaster.intersectObjects(doorMeshes);
      mount.style.cursor = hits.length > 0 ? "pointer" : "default";
      setEdgePeekTarget(nx, ny);
    };
    const onMouseLeave = () => {
      camTarget.x = 0;
      camTarget.y = 0;
    };
    mount.addEventListener("mousemove", onMouseMove);
    mount.addEventListener("mouseleave", onMouseLeave);

    // --- Gyroscope (mobile) ---
    const onDeviceOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;
      // gamma: left-right tilt (-90..90), beta: front-back tilt (-180..180)
      // Typical portrait hold is beta ~45-60°; treat 45° as neutral.
      // Negative y rotation looks right; negative x rotation looks up.
      camRotTarget.y = Math.max(-1, Math.min(1, e.gamma / 25)) * -MAX_TILT;
      camRotTarget.x =
        Math.max(-1, Math.min(1, (e.beta - 45) / 25)) * -MAX_TILT;
      camLerp = 0.18; // snappier tracking for continuous gyro input
    };

    // iOS 13+ requires permission granted synchronously from a touch/click handler
    let gyroAttached = false;
    const attachGyro = () => {
      if (gyroAttached) return;
      gyroAttached = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reqPerm = (DeviceOrientationEvent as any).requestPermission;
      if (typeof reqPerm === "function") {
        reqPerm()
          .then((state: string) => {
            if (state === "granted")
              window.addEventListener("deviceorientation", onDeviceOrientation);
          })
          .catch(() => {});
      } else {
        window.addEventListener("deviceorientation", onDeviceOrientation);
      }
    };

    // --- Animation ---
    let raf: number;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      for (const locker of lockers) {
        const diff = locker.targetAngle - locker.currentAngle;
        if (Math.abs(diff) > 0.0005) {
          locker.currentAngle += diff * 0.09;
          locker.pivot.rotation.y = locker.currentAngle;
        }
      }
      // Smooth camera peek (mouse/desktop: position pan; gyro/mobile: rotation tilt)
      camOffset.x += (camTarget.x - camOffset.x) * camLerp;
      camOffset.y += (camTarget.y - camOffset.y) * camLerp;
      camera.position.x = BASE_CAM.x + camOffset.x;
      camera.position.y = BASE_CAM.y + camOffset.y;
      camRotOffset.x += (camRotTarget.x - camRotOffset.x) * camLerp;
      camRotOffset.y += (camRotTarget.y - camRotOffset.y) * camLerp;
      camera.rotation.x = camRotOffset.x;
      camera.rotation.y = camRotOffset.y;
      renderer.render(scene, camera);
    };
    animate();

    // --- Resize ---
    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      clearTimeout(readyTimeout);
      openTimeouts.forEach(clearTimeout);
      cancelAnimationFrame(raf);
      mount.removeEventListener("click", onClick);
      mount.removeEventListener("touchend", onTouch);
      mount.removeEventListener("mousemove", onMouseMove);
      mount.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("deviceorientation", onDeviceOrientation);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        position: "relative",
      }}>
      <div
        ref={mountRef}
        style={{
          width: "100%",
          height: "100%",
          opacity: sceneReady ? 1 : 0,
          transition: "opacity 0.4s ease",
        }}
      />
      {!sceneReady && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#fff",
          }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: "3px solid #aaa",
              borderTopColor: "#333",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </div>
  );
}
