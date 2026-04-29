<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# LockerScene file map

## React components (`app/components/`)
- **`LockerScene.tsx`** — top-level component (~200 lines). Owns React state (`sceneReady`, `noteOpen`, `noteExiting`), wires all lib functions together inside one `useEffect`, runs the animation loop, and handles click/hover/touch/resize events.
- **`AboutNote.tsx`** — accessible JSX dialog (`role="dialog"`, `aria-modal`, `aria-labelledby`). Handles its own Escape key via internal `useEffect([onClose])`. Mounted only when `noteOpen` is true.
- **`LockerScene.module.css`** — all styles: wrapper, canvas, note overlay animations (`noteBackdropIn/Out`, `noteIn/Out`), loader/spinner, mobile breakpoint (`@media max-width:600px`).

## Three.js lib (`app/lib/locker/`)
- **`constants.ts`** — `LW=2.75`, `LH=2.0`, `LD=1`, `GAP=0.08`, `DOOR_T=0.1`, `WALL_T=0.03`, `CELL_W`, `CELL_H`, `FOV=30`, `CAMERA_Z=15`, `BACK_INTERIOR_Z=-0.97`, `Locker` type.
- **`scene.ts`** — `setupScene(mount)` → `{ scene, camera, renderer, width, height }`.
- **`lighting.ts`** — `setupLighting(scene)`. Four directional lights: key (warm), fill (cool), rim, front.
- **`environment.ts`** — `setupEnvironment(scene, renderer, manager)`. Loads `/environment.exr`; falls back to `RoomEnvironment`.
- **`materials.ts`** — `createLockerMaterials()` → `{ bodyMat, silverMat, labelPaperMat, doorMaterials[] }`. `createLockerGeometries()` → `LockerGeometries` (shared across all lockers).
- **`buildLocker.ts`** — `buildLockerShell(group, bodyMat, geos)`, `buildDoorAssembly(group, silverMat, geos, doorMaterials, labelMat)` → pivot, `createAboutUsLabelMat()`.
- **`gapStrips.ts`** — `addGapStrips(scene, COLS, ROWS)`.
- **`submitButton.ts`** — `createSubmitButton()` → `{ group, mesh }`. Red (`0xc23019`), positioned inside the locker.
- **`crumpledPaper.ts`** — `createCrumpledPaper()` → `{ group, mesh }`. A4-portrait PlaneGeometry with sine/cosine crumple. See paper-tuning notes below.
- **`cameraPeek.ts`** — `createCameraPeek(camera)` → `{ setFromMouse, setFromGyro, reset, update }`.
- **`gyroscope.ts`** — `attachGyroscope(onOrientation)` → teardown fn. Handles iOS permission.

## Key indices in `LockerScene.tsx`
- `centerIdx` = submit button locker (center of grid)
- `aboutUsIdx` = one row below center = crumpled paper locker
- Paper click only enabled when `lockers[aboutUsIdx].isOpen`

## Special locker behaviours
- **Center locker**: `locked = true`; clicking jigles it. Contains floating submit button.
- **About-us locker** (south of center): "ABOUT US" label, crumpled paper mesh. Clicking paper opens `AboutNote` overlay.
- **Others**: 3–4 random lockers open on load in a staggered setTimeout sequence.

# Crumpled paper constraints

All values in `app/lib/locker/crumpledPaper.ts`. The rest rotation values in `LockerScene.tsx` animation loop must always match the group rotation set there.

## Size & position
- `pw = LW * 0.32`, `ph = pw * Math.SQRT2` (portrait A4, ~0.88 × 1.24 units)
- `position.set(-LW * 0.03, -LH * 0.18, BACK_INTERIOR_Z + 0.30)`
- `rotation.set(0.25, 0.04, 0.03)` — ~14° backward lean, face toward viewer
- Animation loop rest values must match: `restX=0.25, restY=0.04, restZ=0.03`

## Back-wall clipping rule
Max backward world-Z = `sum_of_negative_amplitudes × cos(rotation.x)`. Top-back vertex must not exceed `BACK_INTERIOR_Z = -0.97`. Current top edge is ~`BACK_INTERIOR_Z + 0.155` — safe.

## Crumple amplitudes
```
Math.sin(vx * 8.5 + 1) * 0.025
Math.cos(vy * 6.2)     * 0.018
(Math.random() - 0.5)  * 0.04
```

## Rotation.x sign convention
- Small positive (0.2–0.3): top leans toward back wall, face visible. Correct.
- Large positive (>0.5): face points mostly downward — looks "tilted downwards". Avoid.
- Negative: bottom leans toward back wall — physically wrong.

## Floor constraint
Bottom edge Y ≈ `group.position.y - (ph/2)*cos(rotation.x)` must stay above `-0.97`. Currently ~`-0.93`. Changing position.y or rotation.x requires rechecking this.
