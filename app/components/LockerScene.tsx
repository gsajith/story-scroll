"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import styles from "./LockerScene.module.css";
import AboutNote from "./AboutNote";
import {
  LW,
  LH,
  LD,
  GAP,
  DOOR_T,
  WALL_T,
  CELL_W,
  CELL_H,
  FOV,
  CAMERA_Z,
  BACK_INTERIOR_Z,
  type Locker,
} from "../lib/locker/constants";
import { setupLighting } from "../lib/locker/lighting";
import { setupEnvironment } from "../lib/locker/environment";
import {
  createLockerMaterials,
  createLockerGeometries,
} from "../lib/locker/materials";

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

    // --- Scene / Camera / Renderer ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    const camera = new THREE.PerspectiveCamera(FOV, W / H, 0.1, 100);
    camera.position.set(0.3, 0.3, CAMERA_Z);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.8;
    mount.appendChild(renderer.domElement);

    // --- Loading manager ---
    const loadingManager = new THREE.LoadingManager();
    const markReady = () => setSceneReady(true);
    let pendingItems = 1;
    const itemDone = () => {
      if (--pendingItems <= 0) markReady();
    };
    loadingManager.onLoad = () => {
      pendingItems = 0;
      markReady();
    };
    loadingManager.onError = itemDone;
    const readyTimeout = setTimeout(markReady, 8000);

    setupLighting(scene);
    setupEnvironment(scene, renderer, loadingManager);

    // --- Grid dimensions ---
    const vFOV = (FOV * Math.PI) / 180;
    const visH = 2 * CAMERA_Z * Math.tan(vFOV / 2);
    const visW = visH * (W / H);
    const COLS = Math.ceil(visW / CELL_W) + 3;
    const ROWS = Math.ceil(visH / CELL_H) + 3;

    // --- Gap wall strips ---
    const gapMat = new THREE.MeshStandardMaterial({
      color: 0x888480,
      roughness: 0.7,
      metalness: 0.15,
    });
    const GAP_Z = 0.15;
    const totalW = COLS * CELL_W + 4;
    const totalH = ROWS * CELL_H + 4;

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

    // --- Materials & geometries ---
    const { bodyMat, silverMat, labelPaperMat, doorMaterials } =
      createLockerMaterials();
    const {
      wallSideGeo,
      wallTopGeo,
      wallBackGeo,
      doorGeo,
      handleBarGeo,
      handleGeo,
      labelFrameGeo,
      labelPaperGeo,
      doorHingeMatGeo,
      doorHingeGeo,
    } = createLockerGeometries();

    // --- Mutable scene references ---
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

    // --- Build locker grid ---
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const group = new THREE.Group();
        group.position.set(
          (col - (COLS - 1) / 2) * CELL_W,
          (row - (ROWS - 1) / 2) * CELL_H,
          0,
        );

        // Cabinet shell
        const leftWall = new THREE.Mesh(wallSideGeo, bodyMat);
        leftWall.position.set(-LW / 2 + WALL_T / 2, 0, -LD / 2);
        leftWall.castShadow = leftWall.receiveShadow = true;
        group.add(leftWall);

        const rightWall = new THREE.Mesh(wallSideGeo, bodyMat);
        rightWall.position.set(LW / 2 - WALL_T / 2, 0, -LD / 2);
        rightWall.castShadow = rightWall.receiveShadow = true;
        group.add(rightWall);

        const topWall = new THREE.Mesh(wallTopGeo, bodyMat);
        topWall.position.set(0, LH / 2 - WALL_T / 2, -LD / 2);
        topWall.castShadow = topWall.receiveShadow = true;
        group.add(topWall);

        const bottomWall = new THREE.Mesh(wallTopGeo, bodyMat);
        bottomWall.position.set(0, -LH / 2 + WALL_T / 2, -LD / 2);
        bottomWall.castShadow = bottomWall.receiveShadow = true;
        group.add(bottomWall);

        const backWall = new THREE.Mesh(wallBackGeo, bodyMat);
        backWall.position.set(0, 0, -LD + WALL_T / 2);
        backWall.castShadow = backWall.receiveShadow = true;
        group.add(backWall);

        // Submit button (center locker only)
        const isCenter =
          row === Math.floor(ROWS / 2) && col === Math.floor(COLS / 2);
        if (isCenter) {
          const btnW = LW * 0.55,
            btnH = LH * 0.18,
            btnD = 0.15;
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
              map: new THREE.CanvasTexture(btnCanvas),
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

        // Door
        const pivot = new THREE.Group();
        pivot.position.set(-LW / 2, 0, DOOR_T / 2);
        group.add(pivot);

        const door = new THREE.Mesh(doorGeo, doorMaterials);
        door.position.x = LW / 2;
        door.castShadow = door.receiveShadow = true;
        pivot.add(door);

        const handleBar = new THREE.Mesh(handleBarGeo, silverMat);
        handleBar.position.set(LW / 2, LH * -0.12, DOOR_T / 2 + 0.068);
        handleBar.castShadow = handleBar.receiveShadow = true;
        pivot.add(handleBar);

        const handleBarMount1 = new THREE.Mesh(handleGeo, silverMat);
        handleBarMount1.position.set(LW / 2 - 0.45, LH * -0.12, DOOR_T / 2);
        handleBarMount1.castShadow = handleBarMount1.receiveShadow = true;
        pivot.add(handleBarMount1);

        const handleBarMount2 = new THREE.Mesh(handleGeo, silverMat);
        handleBarMount2.position.set(LW / 2 + 0.45, LH * -0.12, DOOR_T / 2);
        handleBarMount2.castShadow = handleBarMount2.receiveShadow = true;
        pivot.add(handleBarMount2);

        const doorHinge = new THREE.Mesh(doorHingeGeo, silverMat);
        doorHinge.position.set(LW * 0.065, LH * -0.32, DOOR_T * -0.7);
        doorHinge.castShadow = doorHinge.receiveShadow = true;
        pivot.add(doorHinge);

        const doorHinge2 = new THREE.Mesh(doorHingeGeo, silverMat);
        doorHinge2.position.set(LW * 0.065, LH * 0.32, DOOR_T * -0.7);
        doorHinge2.castShadow = doorHinge2.receiveShadow = true;
        pivot.add(doorHinge2);

        const doorHingeMat = new THREE.Mesh(doorHingeMatGeo, silverMat);
        doorHingeMat.position.set(LW * 0.115, LH * -0.32, DOOR_T * -0.55);
        doorHingeMat.castShadow = doorHingeMat.receiveShadow = true;
        pivot.add(doorHingeMat);

        const doorHingeMat2 = new THREE.Mesh(doorHingeMatGeo, silverMat);
        doorHingeMat2.position.set(LW * 0.115, LH * 0.32, DOOR_T * -0.55);
        doorHingeMat2.castShadow = doorHingeMat2.receiveShadow = true;
        pivot.add(doorHingeMat2);

        const labelFrame = new THREE.Mesh(labelFrameGeo, silverMat);
        labelFrame.position.set(LW / 2, LH / 2 - LH * 0.25, DOOR_T / 2 + 0.009);
        pivot.add(labelFrame);

        // Label paper (custom text for about-us locker)
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

        // Crumpled paper (about-us locker only)
        if (isSouthOfCenter) {
          const pw = LW * 0.32,
            ph = pw * Math.SQRT2;
          const pGeo = new THREE.PlaneGeometry(pw, ph, 10, 10);
          const pPos = pGeo.attributes.position as THREE.BufferAttribute;
          for (let vi = 0; vi < pPos.count; vi++) {
            const vx = pPos.getX(vi) / pw;
            const vy = pPos.getY(vi) / ph;
            pPos.setZ(
              vi,
              Math.sin(vx * 8.5 + 1) * 0.025 +
                Math.cos(vy * 6.2) * 0.018 +
                (Math.random() - 0.5) * 0.04,
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
          [
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
          ].forEach((line, i) => nc.fillText(line, 40, 100 + i * 30));

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
          pMesh.castShadow = pMesh.receiveShadow = true;
          paperMesh = pMesh;

          const pGroup = new THREE.Group();
          pGroup.add(pMesh);
          pGroup.position.set(-LW * 0.03, -LH * 0.18, BACK_INTERIOR_Z + 0.30);
          pGroup.rotation.set(0.25, 0.04, 0.03);
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

    // --- Sequential door open on load ---
    lockers[centerIdx].locked = true;
    const aboutUsIdx = (Math.floor(ROWS / 2) - 1) * COLS + Math.floor(COLS / 2);
    const noRandomOpen = new Set([centerIdx, aboutUsIdx]);
    const extraCount = 3 + Math.floor(Math.random() * 2);
    const candidates = lockers
      .map((_, i) => i)
      .filter((i) => !noRandomOpen.has(i));
    const openOrder: number[] = [centerIdx];
    for (let i = 0; i < extraCount; i++) {
      openOrder.push(
        candidates.splice(Math.floor(Math.random() * candidates.length), 1)[0],
      );
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

    // --- Camera peek ---
    const BASE_CAM = { x: camera.position.x, y: camera.position.y };
    const camOffset = { x: 0, y: 0 };
    const camTarget = { x: 0, y: 0 };
    let camLerp = 0.04;
    const MAX_PEEK = 1;
    const EDGE_ZONE = 0.18;

    const setEdgePeekTarget = (nx: number, ny: number) => {
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

      if (
        submitBtnMesh !== null &&
        raycaster.intersectObject(submitBtnMesh).length > 0
      ) {
        window.open("https://google.com", "_blank");
        return;
      }

      const hits = raycaster.intersectObjects(doorMeshes);
      if (hits.length > 0) {
        const idx = doorMeshes.indexOf(hits[0].object as THREE.Mesh);
        if (idx !== -1) {
          const locker = lockers[idx];
          if (locker.locked) {
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
      attachGyro();
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
            overButton ? 0x8a1e0d : 0xc23019,
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

    // --- Gyroscope ---
    const onDeviceOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;
      camTarget.x = Math.max(-1, Math.min(1, e.gamma / 25)) * MAX_PEEK;
      camTarget.y =
        Math.max(-1, Math.min(1, (e.beta - 45) / 25)) * MAX_PEEK * -1;
      camLerp = 0.18;
    };
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

    // --- Animation loop ---
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

      camOffset.x += (camTarget.x - camOffset.x) * camLerp;
      camOffset.y += (camTarget.y - camOffset.y) * camLerp;
      camera.position.x = BASE_CAM.x + camOffset.x;
      camera.position.y = BASE_CAM.y + camOffset.y;

      if (submitButtonGroup !== null) {
        const t = performance.now() * 0.001;
        submitButtonGroup.position.y = Math.sin(t * 1.1) * 0.07;
        submitButtonGroup.getWorldPosition(btnScreenPos);
        btnScreenPos.project(camera);
        const btnSX = (btnScreenPos.x + 1) / 2;
        const btnSY = (1 - btnScreenPos.y) / 2;
        submitButtonGroup.rotation.y +=
          ((mouseNX - btnSX) * 1.6 - submitButtonGroup.rotation.y) * 0.06;
        submitButtonGroup.rotation.x +=
          ((mouseNY - btnSY) * 1.35 - submitButtonGroup.rotation.x) * 0.06;
      }

      if (paperGroup !== null) {
        const t = performance.now() * 0.001;
        const restX = 0.25,
          restY = 0.04,
          restZ = 0.03;
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
      const w = mount.clientWidth,
        h = mount.clientHeight;
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
      if (mount.contains(renderer.domElement))
        mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className={styles.wrapper}>
      <div
        ref={mountRef}
        className={styles.canvas}
        style={{ opacity: sceneReady ? 1 : 0 }}
      />
      {noteOpen && <AboutNote exiting={noteExiting} onClose={closeNote} />}
      {!sceneReady && (
        <div className={styles.loader}>
          <div className={styles.loaderSpinner} />
        </div>
      )}
    </div>
  );
}
