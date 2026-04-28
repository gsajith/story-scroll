"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const LW = 2.75; // locker width
const LH = 2.0; // locker height
const LD = 0.8; // locker depth
const GAP = 0.08;
const DOOR_T = 0.1;
const WALL_T = 0.0; // cabinet wall thickness — no front face, so interior is open

const CELL_W = LW + GAP;
const CELL_H = LH + GAP;

const FOV = 30;
const CAMERA_Z = 15;

// z of the interior face of the back wall
const BACK_INTERIOR_Z = -LD + WALL_T;

export default function LockerScene() {
  const mountRef = useRef<HTMLDivElement>(null);

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
    renderer.toneMappingExposure = 1.1;
    mount.appendChild(renderer.domElement);

    // --- Environment (IBL for metal reflections) ---
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    scene.environment = pmrem.fromScene(new RoomEnvironment()).texture;
    pmrem.dispose();

    // --- Lighting ---
    const ambient = new THREE.AmbientLight(0xffffff, 0.06);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xfff5e8, 9.5);
    keyLight.position.set(1.5, 1.5, 10);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 60;
    keyLight.shadow.camera.left = -20;
    keyLight.shadow.camera.right = 20;
    keyLight.shadow.camera.top = 20;
    keyLight.shadow.camera.bottom = -20;
    keyLight.shadow.radius = 3;
    keyLight.shadow.bias = -0.001;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xd0e8ff, 0.2);
    rimLight.position.set(10, -6, 8);
    scene.add(rimLight);

    // --- Materials ---
    // Bright white, low-gloss painted metal — body, door faces, interior walls
    const whiteMetal = {
      color: 0xc3bcb6,
      roughness: 0.65,
      metalness: 0.0,
    };
    const bodyMat = new THREE.MeshStandardMaterial(whiteMetal);
    const doorFrontMat = new THREE.MeshStandardMaterial({
      ...whiteMetal,
      roughness: 0.55,
    });
    const doorInnerMat = new THREE.MeshStandardMaterial({
      ...whiteMetal,
      color: 0xe8e8e8,
    });
    const doorEdgeMat = new THREE.MeshStandardMaterial({
      ...whiteMetal,
      color: 0xd0d0d0,
    });

    // Shiny silver — handle and label frame
    const silverMat = new THREE.MeshStandardMaterial({
      color: 0xd4d4d4,
      roughness: 0.04,
      metalness: 1.0,
      envMapIntensity: 4.0,
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
      color: 0x1a2840,
      roughness: 0.5,
      metalness: 0.05,
      emissive: new THREE.Color(0x0c1e38),
      emissiveIntensity: 3.0,
    });

    // --- Shared geometries ---

    // Cabinet shell — 5 panels, NO front face (opening is left empty)
    const wallSideGeo = new THREE.BoxGeometry(WALL_T, LH, LD);
    const wallTopGeo = new THREE.BoxGeometry(LW, WALL_T, LD);
    const wallBackGeo = new THREE.BoxGeometry(LW, LH, WALL_T);

    // BoxGeometry face group order: [+x, -x, +y, -y, +z, -z]
    // Interior-facing face gets dark interiorMat
    // leftWall: interior face is +x (index 0)
    const leftWallMats = [bodyMat, bodyMat, bodyMat, bodyMat, bodyMat, bodyMat];
    // rightWall: interior face is -x (index 1)
    const rightWallMats = [
      bodyMat,
      bodyMat,
      bodyMat,
      bodyMat,
      bodyMat,
      bodyMat,
    ];
    // topWall: interior face is -y (index 3)
    const topWallMats = [bodyMat, bodyMat, bodyMat, bodyMat, bodyMat, bodyMat];
    // bottomWall: interior face is +y (index 2)
    const bottomWallMats = [
      bodyMat,
      bodyMat,
      bodyMat,
      bodyMat,
      bodyMat,
      bodyMat,
    ];
    // backWall: interior face is +z (index 4)
    const backWallMats = [bodyMat, bodyMat, bodyMat, bodyMat, bodyMat, bodyMat];

    // Door
    const doorGeo = new THREE.BoxGeometry(LW, LH, DOOR_T);
    const doorMaterials = [
      doorEdgeMat, // +x
      doorEdgeMat, // -x
      doorEdgeMat, // +y
      doorEdgeMat, // -y
      doorFrontMat, // +z outer face
      doorInnerMat, // -z inner face
    ];

    // Door details
    const handleBarGeo = new THREE.BoxGeometry(LW * 0.25, LH * 0.035, 0.068);
    const handleGeo = new THREE.BoxGeometry(LH * 0.035, LH * 0.035, 0.068);
    const labelFrameGeo = new THREE.BoxGeometry(LW * 0.17, LH * 0.15, 0.055);
    const labelPaperGeo = new THREE.PlaneGeometry(LW * 0.14, LH * 0.12);

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
      color: 0xc3bcb6,
      roughness: 0.7,
      metalness: 0.1,
    });
    const GAP_Z = 0.15;
    const totalW = COLS * CELL_W + 4;
    const totalH = ROWS * CELL_H + 4;

    // Vertical strips at each inter-column gap
    for (let c = 0; c < COLS - 1; c++) {
      const xCenter = (c - (COLS - 1) / 2) * CELL_W + CELL_W / 2;
      const strip = new THREE.Mesh(
        new THREE.PlaneGeometry(GAP - 0.015, totalH),
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
        new THREE.PlaneGeometry(totalW, GAP - 0.015),
        gapMat,
      );
      strip.position.set(0, yCenter, GAP_Z - 0.001);
      strip.receiveShadow = true;
      scene.add(strip);
    }

    type Locker = {
      pivot: THREE.Group;
      isOpen: boolean;
      targetAngle: number;
      currentAngle: number;
    };
    const lockers: Locker[] = [];

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const group = new THREE.Group();
        group.position.set(
          (col - (COLS - 1) / 2) * CELL_W,
          (row - (ROWS - 1) / 2) * CELL_H,
          0,
        );

        // ---- Cabinet shell (hollow — open front) ----
        const leftWall = new THREE.Mesh(wallSideGeo, leftWallMats);
        leftWall.position.set(-LW / 2 + WALL_T / 2, 0, -LD / 2);
        leftWall.castShadow = true;
        leftWall.receiveShadow = true;
        group.add(leftWall);

        const rightWall = new THREE.Mesh(wallSideGeo, rightWallMats);
        rightWall.position.set(LW / 2 - WALL_T / 2, 0, -LD / 2);
        rightWall.castShadow = true;
        rightWall.receiveShadow = true;
        group.add(rightWall);

        const topWall = new THREE.Mesh(wallTopGeo, topWallMats);
        topWall.position.set(0, LH / 2 - WALL_T / 2, -LD / 2);
        topWall.castShadow = true;
        topWall.receiveShadow = true;
        group.add(topWall);

        const bottomWall = new THREE.Mesh(wallTopGeo, bottomWallMats);
        bottomWall.position.set(0, -LH / 2 + WALL_T / 2, -LD / 2);
        bottomWall.castShadow = true;
        bottomWall.receiveShadow = true;
        group.add(bottomWall);

        const backWall = new THREE.Mesh(wallBackGeo, backWallMats);
        backWall.position.set(0, 0, -LD + WALL_T / 2);
        backWall.castShadow = true;
        backWall.receiveShadow = true;
        group.add(backWall);

        // Screen placeholder — just in front of back wall interior face
        const screen = new THREE.Mesh(screenGeo, screenMat);
        screen.position.set(0, LH * 0.03, BACK_INTERIOR_Z + 0.01);
        group.add(screen);

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
        handleBar.castShadow = true;
        pivot.add(handleBar);
        const handleBarMount1 = new THREE.Mesh(handleGeo, handleMat);
        const handleBarMount2 = new THREE.Mesh(handleGeo, handleMat);
        handleBarMount1.position.set(LW / 2 - 0.3, LH * -0.12, DOOR_T / 2);
        handleBarMount2.position.set(LW / 2 + 0.3, LH * -0.12, DOOR_T / 2);
        pivot.add(handleBarMount1);
        pivot.add(handleBarMount2);

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
          targetAngle: 0,
          currentAngle: 0,
        });
      }
    }

    // --- Camera peek state ---
    const BASE_CAM = { x: camera.position.x, y: camera.position.y };
    const camOffset = { x: 0, y: 0 };
    const camTarget = { x: 0, y: 0 };
    const MAX_PEEK = 0.7;
    const EDGE_ZONE = 0.18;

    const setEdgePeekTarget = (nx: number, ny: number) => {
      let tx = 0, ty = 0;
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
          locker.isOpen = !locker.isOpen;
          locker.targetAngle = locker.isOpen ? -Math.PI * 0.5 : 0;
        }
      }
    };

    const onClick = (e: MouseEvent) => handleInteraction(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => {
      e.preventDefault();
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
      // Typical portrait hold is beta ~45-60°; treat 45° as neutral
      camTarget.x = Math.max(-1, Math.min(1, e.gamma / 25)) * MAX_PEEK;
      camTarget.y = Math.max(-1, Math.min(1, (e.beta - 45) / 25)) * MAX_PEEK * -1;
    };

    // iOS 13+ requires permission; request on first touch
    let gyroAttached = false;
    const attachGyro = () => {
      if (gyroAttached) return;
      gyroAttached = true;
      type DOE = typeof DeviceOrientationEvent & {
        requestPermission?: () => Promise<string>;
      };
      const DOE = DeviceOrientationEvent as DOE;
      if (typeof DOE.requestPermission === "function") {
        DOE.requestPermission()
          .then((state: string) => {
            if (state === "granted")
              window.addEventListener("deviceorientation", onDeviceOrientation);
          })
          .catch(() => {});
      } else {
        window.addEventListener("deviceorientation", onDeviceOrientation);
      }
    };
    window.addEventListener("touchstart", attachGyro, { once: true });

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
      // Smooth camera peek
      camOffset.x += (camTarget.x - camOffset.x) * 0.04;
      camOffset.y += (camTarget.y - camOffset.y) * 0.04;
      camera.position.x = BASE_CAM.x + camOffset.x;
      camera.position.y = BASE_CAM.y + camOffset.y;
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
      cancelAnimationFrame(raf);
      mount.removeEventListener("click", onClick);
      mount.removeEventListener("touchend", onTouch);
      mount.removeEventListener("mousemove", onMouseMove);
      mount.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("touchstart", attachGyro);
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
      ref={mountRef}
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        display: "block",
      }}
    />
  );
}
