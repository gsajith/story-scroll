"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import styles from "./LockerScene.module.css";
import AboutNote from "./AboutNote";
import { CELL_W, CELL_H, FOV, CAMERA_Z, type Locker } from "../lib/locker/constants";
import { setupLighting } from "../lib/locker/lighting";
import { setupEnvironment } from "../lib/locker/environment";
import { createLockerMaterials, createLockerGeometries } from "../lib/locker/materials";
import { setupScene } from "../lib/locker/scene";
import { addGapStrips } from "../lib/locker/gapStrips";
import { buildLockerShell, buildDoorAssembly, createAboutUsLabelMat } from "../lib/locker/buildLocker";
import { createSubmitButton } from "../lib/locker/submitButton";
import { createCrumpledPaper } from "../lib/locker/crumpledPaper";
import { createCameraPeek } from "../lib/locker/cameraPeek";
import { attachGyroscope } from "../lib/locker/gyroscope";

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
    const mount = mountRef.current!;
    const { scene, camera, renderer, width: W, height: H } = setupScene(mount);
    setupLighting(scene);

    // --- Loading manager ---
    const loadingManager = new THREE.LoadingManager();
    const markReady = () => setSceneReady(true);
    let pendingItems = 1;
    const itemDone = () => { if (--pendingItems <= 0) markReady(); };
    loadingManager.onLoad = () => { pendingItems = 0; markReady(); };
    loadingManager.onError = itemDone;
    const readyTimeout = setTimeout(markReady, 8000);
    void itemDone; // referenced only as onError handler

    setupEnvironment(scene, renderer, loadingManager);

    // --- Grid dimensions ---
    const vFOV = (FOV * Math.PI) / 180;
    const visH = 2 * CAMERA_Z * Math.tan(vFOV / 2);
    const COLS = Math.ceil(visH * (W / H) / CELL_W) + 3;
    const ROWS = Math.ceil(visH / CELL_H) + 3;

    addGapStrips(scene, COLS, ROWS);

    const { bodyMat, silverMat, labelPaperMat, doorMaterials } = createLockerMaterials();
    const geos = createLockerGeometries();

    // --- Mutable scene references ---
    const lockers: Locker[] = [];
    let submitButtonGroup: THREE.Group | null = null;
    let submitBtnMesh: THREE.Mesh | null = null;
    let btnHovered = false;
    const btnScreenPos = new THREE.Vector3();
    let paperGroup: THREE.Group | null = null;
    let paperMesh: THREE.Mesh | null = null;
    let paperHovered = false;
    let mouseNX = 0.5, mouseNY = 0.5;

    const centerIdx = Math.floor(ROWS / 2) * COLS + Math.floor(COLS / 2);
    const aboutUsIdx = (Math.floor(ROWS / 2) - 1) * COLS + Math.floor(COLS / 2);

    // --- Build locker grid ---
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const group = new THREE.Group();
        group.position.set(
          (col - (COLS - 1) / 2) * CELL_W,
          (row - (ROWS - 1) / 2) * CELL_H,
          0,
        );

        buildLockerShell(group, bodyMat, geos);

        const isCenter = row === Math.floor(ROWS / 2) && col === Math.floor(COLS / 2);
        if (isCenter) {
          const { group: btnGroup, mesh: btnMesh } = createSubmitButton();
          submitButtonGroup = btnGroup;
          submitBtnMesh = btnMesh;
          group.add(btnGroup);
        }

        const isSouthOfCenter = row === Math.floor(ROWS / 2) - 1 && col === Math.floor(COLS / 2);
        const labelMat = isSouthOfCenter ? createAboutUsLabelMat() : labelPaperMat;
        const pivot = buildDoorAssembly(group, silverMat, geos, doorMaterials, labelMat);

        if (isSouthOfCenter) {
          const { group: pGroup, mesh: pMesh } = createCrumpledPaper();
          paperGroup = pGroup;
          paperMesh = pMesh;
          group.add(pGroup);
        }

        scene.add(group);
        lockers.push({ pivot, isOpen: false, locked: false, targetAngle: 0, currentAngle: 0 });
      }
    }

    // --- Sequential door open on load ---
    lockers[centerIdx].locked = true;
    const noRandomOpen = new Set([centerIdx, aboutUsIdx]);
    const extraCount = 3 + Math.floor(Math.random() * 2);
    const candidates = lockers.map((_, i) => i).filter((i) => !noRandomOpen.has(i));
    const openOrder: number[] = [centerIdx];
    for (let i = 0; i < extraCount; i++) {
      openOrder.push(candidates.splice(Math.floor(Math.random() * candidates.length), 1)[0]);
    }
    const openTimeouts: ReturnType<typeof setTimeout>[] = [];
    openOrder.forEach((idx, i) => {
      const t = setTimeout(
        () => {
          const locker = lockers[idx];
          locker.isOpen = true;
          locker.targetAngle =
            idx === centerIdx ? -Math.PI * 0.5 : -Math.PI * (0.48 + Math.random() * 0.1);
        },
        300 + i * (Math.random() * 300 + 300),
      );
      openTimeouts.push(t);
    });

    // --- Camera peek ---
    const peek = createCameraPeek(camera);

    // --- Gyroscope ---
    let detachGyro: (() => void) | null = null;
    let gyroAttached = false;
    const attachGyro = () => {
      if (gyroAttached) return;
      gyroAttached = true;
      detachGyro = attachGyroscope((e) => {
        if (e.gamma === null || e.beta === null) return;
        peek.setFromGyro(e.gamma, e.beta);
      });
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

      if (submitBtnMesh !== null && raycaster.intersectObject(submitBtnMesh).length > 0) {
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
            setTimeout(() => { locker.targetAngle = -Math.PI * 0.5; }, 320);
            return;
          }
          locker.isOpen = !locker.isOpen;
          locker.targetAngle = locker.isOpen ? -Math.PI * (0.48 + Math.random() * 0.1) : 0;
        }
      }
    };

    const onClick = (e: MouseEvent) => handleInteraction(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => {
      e.preventDefault();
      attachGyro();
      if (e.changedTouches.length > 0)
        handleInteraction(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
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

      mount.style.cursor = hits.length > 0 || overButton || overPaper ? "pointer" : "default";
      mouseNX = nx;
      mouseNY = ny;
      peek.setFromMouse(nx, ny);
    };
    const onMouseLeave = () => peek.reset();
    mount.addEventListener("mousemove", onMouseMove);
    mount.addEventListener("mouseleave", onMouseLeave);

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

      peek.update();

      if (submitButtonGroup !== null) {
        const t = performance.now() * 0.001;
        submitButtonGroup.position.y = Math.sin(t * 1.1) * 0.07;
        submitButtonGroup.getWorldPosition(btnScreenPos);
        btnScreenPos.project(camera);
        const btnSX = (btnScreenPos.x + 1) / 2;
        const btnSY = (1 - btnScreenPos.y) / 2;
        submitButtonGroup.rotation.y += ((mouseNX - btnSX) * 1.6 - submitButtonGroup.rotation.y) * 0.06;
        submitButtonGroup.rotation.x += ((mouseNY - btnSY) * 1.35 - submitButtonGroup.rotation.x) * 0.06;
      }

      if (paperGroup !== null) {
        const t = performance.now() * 0.001;
        const restX = 0.25, restY = 0.04, restZ = 0.03;
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
      const w = mount.clientWidth, h = mount.clientHeight;
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
      detachGyro?.();
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
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
