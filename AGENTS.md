<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# LockerScene file map

## React components (`app/components/`)
- **`LockerScene.tsx`** — top-level component (~200 lines). Owns React state (`sceneReady`, `noteOpen`, `noteExiting`), wires all lib functions together inside one `useEffect`, runs the animation loop, and handles click/hover/touch/resize events.
- **`StickyNote.tsx`** — accessible JSX dialog (`role="dialog"`, `aria-modal`, `aria-labelledby`) styled as a green sticky note in the Caveat handwriting font. Links `@molelitmag` to Instagram. Handles its own Escape key via internal `useEffect([onClose])`. Mounted only when `noteOpen` is true.
- **`LockerScene.module.css`** — all styles: wrapper, canvas, sticky note overlay and its animations (`noteBackdropIn/Out`, `noteIn/Out`, a plain fade under `prefers-reduced-motion`), loader/spinner.

## Fonts (`app/fonts.ts`)
- `redHatDisplay` (site font, set on `<html>` in `app/layout.tsx`) and `caveat` (sticky note handwriting), both from `next/font/google`. Canvas textures read `style.fontFamily` from these.

## Three.js lib (`app/lib/locker/`)
- **`constants.ts`** — `LW=2.75`, `LH=2.0`, `LD=1`, `GAP=0.08`, `DOOR_T=0.1`, `WALL_T=0.03`, `CELL_W`, `CELL_H`, `FOV=30`, `CAMERA_Z=15`, `BACK_INTERIOR_Z=-0.97`, `BRAND_BLUE_ALBEDO` (see brand colour notes below), `Locker` type (`pivot`, `door`, `interior`, open state and angles).
- **`scene.ts`** — `setupScene(mount)` → `{ scene, camera, renderer, width, height }`.
- **`lighting.ts`** — `setupLighting(scene)`. Four directional lights: key (warm), fill (cool), rim, front.
- **`environment.ts`** — `setupEnvironment(scene, renderer, manager)`. Loads `/environment.exr`; falls back to `RoomEnvironment`.
- **`materials.ts`** — `createLockerMaterials()` → `{ bodyMat, interiorBodyMat, silverMat, labelPaperMat, doorMaterials[] }`, where `doorMaterials` is `[edge, front, inside]`. `createLockerGeometries()` → `LockerGeometries` (shared across all lockers): `wallsGeo` (four walls merged), `wallBackGeo`, `doorGeo` (three material groups), `doorHardwareGeo` (handle and hinges merged), `labelFrameGeo`, `labelPaperGeo`.
- **`buildLocker.ts`** — `buildLockerShell(group, interior, bodyMat, interiorBodyMat, geos)` adds the walls to `group` and the back wall to `interior`. `buildDoorAssembly(group, silverMat, geos, doorMaterials, labelMat)` → `{ pivot, door }`. `createTextLabelMat(text)` → door-label material with printed text.
- **`gapStrips.ts`** — `addGapStrips(scene, COLS, ROWS)`.
- **`textTexture.ts`** — `createTextTexture(width, height, fonts, draw)` → `CanvasTexture`. Runs `draw` once immediately and again when the web fonts have loaded, so use it for any canvas text.
- **`submitButton.ts`** — `createSubmitButton()` → `{ group, mesh }`. Matte brand blue body. The label is an unlit `MeshBasicMaterial` in `LABEL_COLOR` (`#bfdd3c`, a lighter tint of the brand green chosen for contrast), weight 900 plus a canvas stroke. Positioned inside the locker. Exports `SUBMIT_COLOR` and `SUBMIT_HOVER_COLOR` for the hover swap in `LockerScene.tsx`.
- **`stickyNote.ts`** — `createStickyNote()` → `{ group, mesh }`. Square green sticky note on the back wall with the handwritten Instagram message. See sticky note notes below.
- **`book.ts`** — `createBookStack(coverTextures[])` → `THREE.Group`. 1–2 upright hardcover books, turned so the cover art angles toward the open side, slightly leaning against a random side wall. `buildBook()` constructs each book in a local frame (cover art on +Z front board, bound spine on -X, fore-edge on +X): front/back cover boards overhang an inset cream page block (striated edges via a shared `CanvasTexture`), plus a per-book textured spine (binding colour + faint bands/title). Thickness `bt ≈ 0.07–0.30` (biased thin, varied). Positioned near the back wall so it stays hidden behind a closed door. Cover filenames are read server-side in `app/page.tsx` from `public/book_covers/` and passed to `LockerScene` as the `bookCovers` prop; textures load through the `LoadingManager`. ~70% of ordinary lockers get a stack (center submit + p.s. lockers excluded).
- **`cameraPeek.ts`** — `createCameraPeek(camera)` → `{ setFromMouse, setFromGyro, reset, update }`.
- **`gyroscope.ts`** — `attachGyroscope(onOrientation)` → teardown fn. Handles iOS permission.

## Key indices in `LockerScene.tsx`
- `centerIdx` = submit button locker (center of grid)
- `psIdx` = one row below center = sticky note locker
- Note click only enabled when `lockers[psIdx].isOpen`

## Special locker behaviours
- **Center locker**: `locked = true`; clicking jigles it. Contains floating submit button.
- **p.s. locker** (south of center): "p.s." label, sticky note mesh. Clicking the note opens the `StickyNote` overlay.
- **Others**: 3–4 random lockers open on load in a staggered setTimeout sequence.

# Performance notes

The scene's cost is draw calls, and every mesh is drawn twice (colour pass and shadow pass). Measured on a 4x CPU-throttled phone profile, the idle frame went from 260 calls and 7.5 ms to 153 calls and 3.1 ms with the rules below.

- **Put locker contents in `interior`.** Each locker has an `interior` group (back wall, books, submit button, sticky note). The animation loop hides it while the door angle is under `CLOSED_ANGLE`, so closed lockers draw only their walls and door. Anything added straight to the locker `group` is drawn all the time.
- **The four walls must stay visible.** Neighbouring lockers' walls show through the gaps between doors. Hiding them leaves white slivers at door edges.
- **Merge parts that share a material and never move apart.** `wallsGeo` and `doorHardwareGeo` are built with `mergeGeometries`. A `BoxGeometry` with a material array costs one draw call per face group, so `doorGeo` folds its four edge faces into one group.
- **Book covers upload one per frame** after loading (`coversToUpload` in `LockerScene.tsx`), so opening a door never waits on a texture upload.
- **Asset sizes.** Covers in `public/book_covers/` are at most 512 px on the long side (a book is about 250 device px tall on a 2x laptop). `public/environment.exr` is 512x256 half-float. Resize new covers the same way: `magick in.jpg -resize '512x512>' -strip -quality 82 out.jpg`.
- **Checking a change.** Compare against the production build (`next build && next start`), read `renderer.info.render.calls`, and screenshot before and after. `Math.random` has to be pinned to a constant for screenshots to match, because three.js uses it for every object's UUID and a seeded stream drifts.
- **Not done.** Door, camera and button easing are per frame, not per second, so they run twice as fast on a 120 Hz display as on a 60 Hz one.

# Brand colour notes

Brand blue is `#212592`, brand green is `#788F14`. Never use those hexes as a material colour or canvas fill in the 3D scene: the key light (intensity 8.5) and ACES tone mapping brighten them a lot, and `#212592` renders periwinkle.

- Use `BRAND_BLUE_ALBEDO` (`#050b64`) from `constants.ts`. On a matte surface facing the camera it renders as the brand blue. A green albedo of `#3c5401` renders close to the brand green the same way.
- For a colour that must show as its exact hex, use an unlit `MeshBasicMaterial` with `toneMapped: false`, as the submit label does.
- Keep lit brand-colour materials matte (`roughness: 1`, `envMapIntensity: 0`, `metalness: 0`). Specular and environment reflections add a warm cast that makes the dark blue unreachable.
- The values were measured, not derived: render the surface face-on, read the pixel back with `gl.readPixels`, and adjust the albedo until the pixel matches. Measure again after any change to `lighting.ts` or the tone mapping in `scene.ts`.
- DOM elements (the `StickyNote` overlay) use the real brand hexes.

# Sticky note notes

All values in `app/lib/locker/stickyNote.ts`.

- The note is stationary by request: no hover wobble, no idle motion. Hover only changes the cursor.
- Square, `side = LH * 0.58`, stuck to the back wall at `BACK_INTERIOR_Z + 0.006` with `rotation.z = -0.045`.
- The top edge is flat against the wall. Vertices peel toward the viewer by `down² × (0.11 + across × 0.05)`, so the bottom-right corner lifts most. Never use a negative Z offset: it would push the paper through the back wall.
- Paper is `PAPER_ALBEDO` (`#5d7e01`), which renders as `#a9bd3c`, a lighter tint of the brand green. Ink is `BRAND_BLUE_ALBEDO`. `.stickyNote` in `LockerScene.module.css` uses the rendered hexes (`#a9bd3c` paper, `#212592` ink), so change them together.
- The message is typed twice: `LINES` here (manual line breaks for the canvas) and the paragraph in `StickyNote.tsx`.
