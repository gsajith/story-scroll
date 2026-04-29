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
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteExiting, setNoteExiting] = useState(false);
  const closeNote = () => {
    setNoteExiting(true);
    setTimeout(() => {
      setNoteOpen(false);
      setNoteExiting(false);
    }, 380);
  };

  useEffect(() => {
    if (!noteOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeNote();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteOpen]);

  useEffect(() => {
    const mount = mountRef.current!;
    const W = mount.clientWidth;
    const H = mount.clientHeight;

    // --- Scene ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

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
    renderer.toneMappingExposure = 0.8;
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
      envMapIntensity: 2.5,
      emissive: 0x334466,
      emissiveIntensity: 0.12,
    });
    const handleMat = silverMat;
    const labelFrameMat = silverMat;

    const labelPaperMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.95,
      metalness: 0.0,
      envMapIntensity: 0.0,
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

    let submitButtonGroup: THREE.Group | null = null;
    let submitBtnMesh: THREE.Mesh | null = null;
    let btnHovered = false;
    const btnScreenPos = new THREE.Vector3();
    let paperGroup: THREE.Group | null = null;
    let paperMesh: THREE.Mesh | null = null;
    let paperHovered = false;
    let mouseNX = 0.5,
      mouseNY = 0.5;

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

        const isCenter =
          row === Math.floor(ROWS / 2) && col === Math.floor(COLS / 2);
        if (isCenter) {
          // Floating 3D submit button inside the center locker
          const btnW = LW * 0.55;
          const btnH = LH * 0.18;
          const btnD = 0.15;

          const btnCanvas = document.createElement("canvas");
          btnCanvas.width = 768;
          btnCanvas.height = 160;
          const btnCtx = btnCanvas.getContext("2d")!;
          btnCtx.clearRect(0, 0, 768, 160);
          btnCtx.fillStyle = "#f0ece4";
          btnCtx.font =
            "bold 72px 'Helvetica Neue', Helvetica, Arial, sans-serif";
          btnCtx.textAlign = "center";
          btnCtx.textBaseline = "middle";
          btnCtx.fillText("SUBMIT YOUR STORY", 384, 84);
          const btnLabelTex = new THREE.CanvasTexture(btnCanvas);

          const btnMesh = new THREE.Mesh(
            new RoundedBoxGeometry(btnW, btnH, btnD, 8, 0.04),
            new THREE.MeshStandardMaterial({
              color: 0xc23019,
              roughness: 0.55,
              metalness: 0.1,
              envMapIntensity: 0.4,
            }),
          );
          btnMesh.castShadow = true;
          submitBtnMesh = btnMesh;

          const labelPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(btnW * 0.88, btnH * 0.72),
            new THREE.MeshStandardMaterial({
              map: btnLabelTex,
              transparent: true,
              roughness: 1,
              metalness: 0,
              envMapIntensity: 0,
            }),
          );
          labelPlane.position.z = btnD / 2 + 0.001;

          submitButtonGroup = new THREE.Group();
          submitButtonGroup.add(btnMesh);
          submitButtonGroup.add(labelPlane);
          submitButtonGroup.position.set(
            0,
            0,
            BACK_INTERIOR_Z + btnD / 2 + 0.45,
          );
          group.add(submitButtonGroup);
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

        const isSouthOfCenter =
          row === Math.floor(ROWS / 2) - 1 && col === Math.floor(COLS / 2);
        let labelPaperMeshMat = labelPaperMat;
        if (isSouthOfCenter) {
          const lc = document.createElement("canvas");
          lc.width = 256;
          lc.height = 128;
          const lx = lc.getContext("2d")!;
          lx.fillStyle = "#ffffff";
          lx.fillRect(0, 0, 256, 128);
          lx.fillStyle = "#111111";
          lx.font = "bold 36px 'Helvetica Neue', Helvetica, Arial, sans-serif";
          lx.textAlign = "center";
          lx.textBaseline = "middle";
          lx.fillText("ABOUT US", 128, 64);
          labelPaperMeshMat = new THREE.MeshStandardMaterial({
            map: new THREE.CanvasTexture(lc),
            roughness: 0.95,
            metalness: 0,
            envMapIntensity: 0,
          });
        }
        const labelPaper = new THREE.Mesh(labelPaperGeo, labelPaperMeshMat);
        labelPaper.position.set(
          LW / 2,
          LH / 2 - LH * 0.25,
          DOOR_T / 2 + 0.0375,
        );
        pivot.add(labelPaper);

        if (isSouthOfCenter) {
          const pw = LW * 0.42,
            ph = LH * 0.42;
          const pGeo = new THREE.PlaneGeometry(pw, ph, 10, 10);
          const pPos = pGeo.attributes.position as THREE.BufferAttribute;
          for (let vi = 0; vi < pPos.count; vi++) {
            const vx = pPos.getX(vi) / pw;
            const vy = pPos.getY(vi) / ph;
            pPos.setZ(
              vi,
              Math.sin(vx * 8.5 + 1) * 0.16 +
                Math.cos(vy * 6.2) * 0.12 +
                (Math.random() - 0.5) * 0.28,
            );
          }
          pGeo.computeVertexNormals();

          const noteCanvas = document.createElement("canvas");
          noteCanvas.width = 512;
          noteCanvas.height = 512;
          const nc = noteCanvas.getContext("2d")!;
          nc.fillStyle = "#fdf9ee";
          nc.fillRect(0, 0, 512, 512);
          nc.fillStyle = "#1a1a1a";
          nc.font = "bold 32px Georgia, serif";
          nc.textAlign = "left";
          nc.fillText("About Us", 40, 56);
          nc.fillStyle = "#3a3a3a";
          nc.font = "18px Georgia, serif";
          const loremLines = [
            "Lorem ipsum dolor sit amet, consectetur",
            "adipiscing elit. Sed do eiusmod tempor",
            "incididunt ut labore et dolore magna aliqua.",
            "Ut enim ad minim veniam, quis nostrud",
            "exercitation ullamco laboris nisi ut aliquip",
            "ex ea commodo consequat.",
            "",
            "Excepteur sint occaecat cupidatat non",
            "proident, sunt in culpa qui officia deserunt",
            "mollit anim id est laborum.",
          ];
          loremLines.forEach((line, i) => nc.fillText(line, 40, 100 + i * 30));

          const pMesh = new THREE.Mesh(
            pGeo,
            new THREE.MeshStandardMaterial({
              color: 0xf4f0e6,
              map: new THREE.CanvasTexture(noteCanvas),
              roughness: 0.88,
              metalness: 0,
              side: THREE.DoubleSide,
            }),
          );
          pMesh.castShadow = true;
          pMesh.receiveShadow = true;
          paperMesh = pMesh;
          const pGroup = new THREE.Group();
          pGroup.add(pMesh);
          pGroup.position.set(-LW * 0.04, -LH * 0.12, BACK_INTERIOR_Z + 0.6);
          pGroup.rotation.set(-0.12, 0.05, 0.08);
          group.add(pGroup);
          paperGroup = pGroup;
        }

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

    const aboutUsIdx = (Math.floor(ROWS / 2) - 1) * COLS + Math.floor(COLS / 2);
    const noRandomOpen = new Set([centerIdx, aboutUsIdx]);

    const extraCount = 3 + Math.floor(Math.random() * 2);
    const candidates = lockers
      .map((_, i) => i)
      .filter((i) => !noRandomOpen.has(i));
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
    let camLerp = 0.04; // overridden to faster rate when gyro is active
    const MAX_PEEK = 1;
    const EDGE_ZONE = 0.18;

    const setEdgePeekTarget = (nx: number, ny: number) => {
      // Signed deviation from center: -1=left/top, +1=right/bottom
      const cx = (nx - 0.5) * 2;
      const cy = (ny - 0.5) * 2;
      // Edge strength per axis: 0 in center, 1 at the screen edge
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
      // Use the dominant edge strength for both axes so that e.g. being near
      // the top edge while 20% right of center gives both upward and rightward peek.
      const s = Math.max(sx, sy);
      camTarget.x = cx * s * MAX_PEEK;
      camTarget.y = -cy * s * MAX_PEEK;
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

      if (paperMesh !== null && lockers[aboutUsIdx].isOpen) {
        if (raycaster.intersectObject(paperMesh).length > 0) {
          paperHovered = false;
          setNoteOpen(true);
          return;
        }
      }

      if (submitBtnMesh !== null) {
        const btnHits = raycaster.intersectObject(submitBtnMesh);
        if (btnHits.length > 0) {
          window.open("https://google.com", "_blank");
          return;
        }
      }

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
      let overButton = false;
      if (submitBtnMesh !== null) {
        overButton = raycaster.intersectObject(submitBtnMesh).length > 0;
        if (overButton !== btnHovered) {
          btnHovered = overButton;
          (submitBtnMesh.material as THREE.MeshStandardMaterial).color.set(
            overButton ? 0x6688aa : 0x4a6a8a,
          );
        }
      }
      let overPaper = false;
      if (paperMesh !== null && lockers[aboutUsIdx].isOpen) {
        overPaper = raycaster.intersectObject(paperMesh).length > 0;
        if (overPaper !== paperHovered) paperHovered = overPaper;
      }
      mount.style.cursor =
        hits.length > 0 || overButton || overPaper ? "pointer" : "default";
      mouseNX = nx;
      mouseNY = ny;
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
      camTarget.y =
        Math.max(-1, Math.min(1, (e.beta - 45) / 25)) * MAX_PEEK * -1;
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
      // Smooth camera peek
      camOffset.x += (camTarget.x - camOffset.x) * camLerp;
      camOffset.y += (camTarget.y - camOffset.y) * camLerp;
      camera.position.x = BASE_CAM.x + camOffset.x;
      camera.position.y = BASE_CAM.y + camOffset.y;
      // Animate submit button: float + mouse-tracking rotation
      if (submitButtonGroup !== null) {
        const t = performance.now() * 0.001;
        submitButtonGroup.position.y = Math.sin(t * 1.1) * 0.07;
        // Project button center to screen space so rotation tracks relative to the button, not the screen center
        submitButtonGroup.getWorldPosition(btnScreenPos);
        btnScreenPos.project(camera);
        const btnSX = (btnScreenPos.x + 1) / 2;
        const btnSY = (1 - btnScreenPos.y) / 2;
        const rotY = (mouseNX - btnSX) * 1.6;
        const rotX = (mouseNY - btnSY) * 1.35;
        submitButtonGroup.rotation.y +=
          (rotY - submitButtonGroup.rotation.y) * 0.06;
        submitButtonGroup.rotation.x +=
          (rotX - submitButtonGroup.rotation.x) * 0.06;
      }
      // Rustle crumpled paper on hover
      if (paperGroup !== null) {
        const t = performance.now() * 0.001;
        const restX = -0.12,
          restY = 0.05,
          restZ = 0.08;
        if (paperHovered) {
          paperGroup.rotation.x = restX + Math.sin(t * 12) * 0.022;
          paperGroup.rotation.y = restY + Math.sin(t * 9 + 1.5) * 0.018;
          paperGroup.rotation.z = restZ + Math.sin(t * 15 + 0.8) * 0.02;
        } else {
          paperGroup.rotation.x += (restX - paperGroup.rotation.x) * 0.06;
          paperGroup.rotation.y += (restY - paperGroup.rotation.y) * 0.06;
          paperGroup.rotation.z += (restZ - paperGroup.rotation.z) * 0.06;
        }
      }
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
      {noteOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="note-title"
          onClick={closeNote}
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.55)",
            zIndex: 20,
            animation: noteExiting
              ? "noteBackdropOut 0.38s ease forwards"
              : "noteBackdropIn 0.3s ease",
          }}>
          <article
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "85vw",
              maxWidth: 760,
              maxHeight: "85vh",
              background: "#fdf9ee",
              borderRadius: "2px",
              padding: "64px 72px",
              overflowY: "auto",
              boxShadow:
                "0 40px 100px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.15)",
              fontFamily: "Georgia, 'Times New Roman', serif",
              position: "relative",
              animation: noteExiting
                ? "noteOut 0.38s cubic-bezier(0.4,0,1,1) forwards"
                : "noteIn 0.42s cubic-bezier(0.34,1.4,0.64,1)",
            }}>
            <button
              aria-label="Close"
              onClick={closeNote}
              style={{
                position: "absolute",
                top: 20,
                right: 24,
                background: "none",
                border: "none",
                fontSize: 24,
                cursor: "pointer",
                color: "#999",
                lineHeight: 1,
              }}>
              ×
            </button>
            <h1
              id="note-title"
              style={{
                fontSize: 36,
                fontWeight: "normal",
                marginTop: 0,
                marginBottom: 28,
                letterSpacing: "0.02em",
                color: "#1a1a1a",
              }}>
              About Us
            </h1>
            <p
              style={{
                fontSize: 17,
                lineHeight: 1.9,
                color: "#2c2c2c",
                marginBottom: 20,
              }}>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
              enim ad minim veniam, quis nostrud exercitation ullamco laboris
              nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in
              reprehenderit in voluptate velit esse cillum dolore eu fugiat
              nulla pariatur.
            </p>
            <p
              style={{
                fontSize: 17,
                lineHeight: 1.9,
                color: "#2c2c2c",
                marginBottom: 20,
              }}>
              Excepteur sint occaecat cupidatat non proident, sunt in culpa qui
              officia deserunt mollit anim id est laborum. Pellentesque habitant
              morbi tristique senectus et netus et malesuada fames ac turpis
              egestas. Vestibulum tortor quam, feugiat vitae, ultricies eget,
              tempor sit amet, ante.
            </p>
            <p style={{ fontSize: 17, lineHeight: 1.9, color: "#2c2c2c" }}>
              Donec eu libero sit amet quam egestas semper. Aenean ultricies mi
              vitae est. Mauris placerat eleifend leo. Quisque sit amet est et
              sapien ullamcorper pharetra.
            </p>
          </article>
          <style>{`
            @keyframes noteBackdropIn  { from { opacity: 0 } to { opacity: 1 } }
            @keyframes noteBackdropOut { from { opacity: 1 } to { opacity: 0 } }
            @keyframes noteIn  { from { opacity: 0; transform: scale(0.15) rotate(-8deg) } to { opacity: 1; transform: scale(1) rotate(-0.3deg) } }
            @keyframes noteOut { from { opacity: 1; transform: scale(1) rotate(-0.3deg) } to { opacity: 0; transform: scale(0.1) rotate(6deg) } }
          `}</style>
        </div>
      )}
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
