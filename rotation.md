# Canvas Image Editor Geometry: Rotation → Crop (RawTherapee-like)

This document describes how to implement a **non-destructive, canvas-based** image editor where:

- The **image is rotated first** (fine rotation, straightening, etc.)
- The **crop is applied second** as an **axis-aligned rectangle in rotated space**
- Changing the rotation makes the image move “under” the crop (the crop does not rotate)

It also covers export, constraints (“no black corners”), and where `sat` can help.

---

## 1) Behavioral model (what users experience)

### Pipeline (fixed order)
1. **Rotate** the image by angle \( \theta \) around a pivot (typically the image center).
2. **Crop** an axis-aligned rectangle on the rotated result.

### Key implications
- Crop coordinates are **defined in rotated coordinates**.
- When `angle` changes, the crop rectangle stays the same in rotated space, while the underlying pixels shift.
- If you enforce “no empty corners,” rotation may require shrinking/repositioning crop.

---

## 2) Coordinate spaces

Use explicit coordinate spaces to avoid confusion:

1. **Image space**: original image pixels  
   - origin top-left: \((0,0)\)
   - size: \((W,H)\)

2. **Rotated space**: coordinates after applying the rotation transform  
   - still a 2D plane with \((x,y)\) coordinates
   - the rotated image occupies a **rotated quadrilateral** (a “diamond” shape at ~45°)

3. **Screen/UI space**: canvas/CSS pixels  
   - mouse/touch events arrive here

You will continuously convert points between these spaces.

---

## 3) State model (non-destructive)

Store parameters, not baked pixels.

```ts
export type CropRect = { x: number; y: number; w: number; h: number };

export type EditorState = {
  image: HTMLImageElement | ImageBitmap;
  imgW: number;
  imgH: number;

  // rotation in radians
  angle: number;

  // pivot in image space (usually center)
  pivot: { x: number; y: number };

  // crop defined in ROTATED space (axis-aligned)
  crop: CropRect;

  // view transform for the preview (pan/zoom)
  view: { scale: number; panX: number; panY: number };
};
```

**Invariant**: `crop` lives in **rotated space**, not image space.

---

## 4) Transforms (the core of everything)

Use `DOMMatrix` (built-in) or any 2D matrix helper.

### 4.1 Image → Rotated transform

Rotate around pivot \( (p_x, p_y) \) in image space:

- Translate pivot to origin
- Rotate
- Translate back

```ts
export function imgToRotMatrix(angle: number, pivot: { x: number; y: number }) {
  const m = new DOMMatrix();
  m.translateSelf(pivot.x, pivot.y);
  m.rotateSelf((angle * 180) / Math.PI);
  m.translateSelf(-pivot.x, -pivot.y);
  return m;
}
```

### 4.2 Rotated ↔ Screen transform (view pan/zoom)

Decide: rotated space is your “world,” screen is the canvas.

```ts
export function rotToScreenMatrix(view: {
  scale: number;
  panX: number;
  panY: number;
}) {
  const m = new DOMMatrix();
  m.translateSelf(view.panX, view.panY);
  m.scaleSelf(view.scale, view.scale);
  return m;
}
```

### 4.3 Conversions you will use constantly

```ts
export function applyToPoint(m: DOMMatrix, p: { x: number; y: number }) {
  const pt = new DOMPoint(p.x, p.y).matrixTransform(m);
  return { x: pt.x, y: pt.y };
}

export function invert(m: DOMMatrix) {
  const inv = m.inverse();
  if (!inv) throw new Error("Matrix not invertible");
  return inv;
}
```

---

## 5) Rendering (preview canvas)

### Goal
Draw the rotated image and then draw the crop overlay in rotated coordinates.

### Recommended structure
- Build `M_rotToScreen`
- Build `M_imgToRot`
- Compose during drawing with `ctx.setTransform(...)`

```ts
export function render(ctx: CanvasRenderingContext2D, state: EditorState) {
  const { imgW, imgH } = state;

  // Clear in screen space
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const M_rotToScreen = rotToScreenMatrix(state.view);
  const M_imgToRot = imgToRotMatrix(state.angle, state.pivot);

  // Draw image: we want a transform that maps image space to screen space:
  // image -> rotated -> screen
  const M_imgToScreen = M_rotToScreen.multiply(M_imgToRot);

  ctx.setTransform(M_imgToScreen);
  ctx.drawImage(state.image, 0, 0, imgW, imgH);

  // Draw crop overlay in rotated space: set rot->screen transform
  ctx.setTransform(M_rotToScreen);

  const { x, y, w, h } = state.crop;
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 1 / state.view.scale; // keep constant on screen
  ctx.strokeRect(x, y, w, h);
  ctx.restore();

  // Optional: mask outside crop
  // (Implementation: draw a big rect, then clear crop area using compositing.)
}
```

Notes:
- `ctx.setTransform(DOMMatrix)` is supported in modern browsers. If you need compatibility, set via `a,b,c,d,e,f`.
- Keep overlay lines constant screen thickness by dividing by scale.

---

## 6) Export (final cropped image)

### Goal
Produce an output bitmap where:
- output size equals `crop.w x crop.h` (in rotated-space pixels)
- content corresponds to the rotated image, cropped to that rectangle

### Method
Render to an offscreen canvas where rotated space aligns to output pixels:

1. Create `out` canvas of size `(crop.w, crop.h)`
2. Set transform to move the crop origin to `(0,0)`
3. Draw the rotated image

```ts
export function exportCropped(state: EditorState): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(state.crop.w));
  out.height = Math.max(1, Math.round(state.crop.h));

  const ctx = out.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;

  const M_imgToRot = imgToRotMatrix(state.angle, state.pivot);

  // We want: rotated space -> output space
  // output coords are crop-local: (0,0) corresponds to (crop.x, crop.y) in rotated space
  const M_rotToOut = new DOMMatrix().translate(-state.crop.x, -state.crop.y);

  // image -> rotated -> output
  const M_imgToOut = M_rotToOut.multiply(M_imgToRot);

  ctx.setTransform(M_imgToOut);
  ctx.drawImage(state.image, 0, 0, state.imgW, state.imgH);

  return out;
}
```

This is the same pipeline as preview, just with a different “view transform.”

---

## 7) Valid area after rotation (the “no black corners” constraint)

When you rotate a rectangle, the valid image pixels occupy a **rotated quadrilateral** in rotated space.

Compute the rotated quad by transforming the four image corners from image space to rotated space:

```ts
export function rotatedImageQuad(state: EditorState) {
  const M = imgToRotMatrix(state.angle, state.pivot);
  const corners = [
    { x: 0, y: 0 },
    { x: state.imgW, y: 0 },
    { x: state.imgW, y: state.imgH },
    { x: 0, y: state.imgH },
  ];
  return corners.map((p) => applyToPoint(M, p)); // 4 points in rotated space
}
```

### Containment check: crop corners inside rotated quad
To guarantee no black corners, ensure all 4 crop corners are inside the quad.

- Use a **point-in-convex-polygon** test (fast and stable).
- The rotated image quad is convex.

Pseudocode:

```text
function cropIsValid(cropRect, imageQuad):
  for each corner in cropCorners(cropRect):
    if corner not inside imageQuad:
      return false
  return true
```

### Constraint strategy (recommended)
When user drags/resizes crop:
1. Apply the user’s intended update
2. If invalid, correct by:
   - preventing the move (clamp), or
   - shrinking (if resizing), or
   - sliding the rect back until valid

A simple and effective approach:
- On translate-only drag: binary search the largest `t ∈ [0,1]` along the drag vector that stays valid.
- On resize: binary search size change similarly.

This avoids complex geometry “push-out” logic and works well for UI.

---

## 8) Auto-fill behavior (optional but common)

“Auto-fill” means: adjust crop after rotation so it contains only valid pixels.

Typical interpretations:
- **Centered, fixed aspect ratio**: largest possible rect of that ratio fully inside the rotated quad
- **Centered, free aspect**: largest possible axis-aligned rect fully inside the rotated quad (usually matches the maximal inscribed rectangle)

### Recommended implementation: numeric search (robust)
For fixed aspect ratio \(r = w/h\):

1. Choose an anchor (commonly center of rotated quad, or keep current crop center)
2. Parameterize candidate crop by a single scale \(s\) (e.g., height)
3. Binary search maximum \(s\) such that all corners are inside the quad

Pseudocode:

```text
function autoFill(quad, center, aspect):
  lo = 0
  hi = bigEnough
  repeat 30-40 iterations:
    mid = (lo+hi)/2
    (w,h) = (mid*aspect, mid)
    rect = centeredRect(center, w, h)
    if rectCornersInsideQuad(rect, quad):
      lo = mid
    else:
      hi = mid
  return rect from lo
```

This is fast enough for per-rotation updates.

---

## 9) Interaction model (crop handles)

### Rule
All crop interaction should operate in **rotated space**, so the crop stays axis-aligned there.

Workflow:
1. Convert pointer position from screen → rotated:
   - \(p_{\text{rot}} = M_{\text{screen→rot}}(p_{\text{screen}})\)
2. Hit-test against crop handles in rotated space
3. Update crop rect in rotated space
4. Apply constraints (containment)
5. Render

You’ll need:
- `M_rotToScreen` (for drawing)
- `M_screenToRot = inverse(M_rotToScreen)` (for pointer mapping)

---

## 10) Where `sat` fits (and where it doesn’t)

### Useful for
- Hit-testing and overlap queries involving rotated polygons
- Determining whether the crop overlaps the rotated image at all
- Getting an overlap vector for “push-out” style interactions (advanced UI feel)

### Not sufficient for
- **Containment** (“crop fully inside image”) — SAT tests overlap, not “inside”
- Computing the **largest** inscribed axis-aligned crop (Auto-fill)
- Polygon clipping/intersection polygon output

### Recommendation
- Implement containment and auto-fill with your own convex containment + numeric search.
- Optionally use `sat` for auxiliary UI hit-testing or overlap detection.

If you do use SAT, you’d represent:
- The rotated image as a `SAT.Polygon` (4 points)
- The crop as a `SAT.Box(...).toPolygon()` (axis-aligned in rotated space)

But again: `SAT.testPolygonPolygon()` tells you “do they overlap,” not “is crop fully contained.”

---

## 11) Testing checklist (to match intended behavior)

1. **Angle = 0**: crop maps directly to image pixels; no black corners.
2. **Small angle change**: image rotates under the crop; crop coordinates unchanged (unless auto-fill enabled).
3. **Containment on**: dragging crop cannot reveal black corners.
4. **Export matches preview**: same transforms; output equals what’s inside crop overlay.
5. **Round-trip stability**: repeatedly adjusting angle does not accumulate “drift” in crop (keep state in rotated space, not screen pixels).

---

## 12) Suggested module layout

- `geometry/transforms.ts`
  - matrix builders, point conversion, inversion
- `geometry/quad.ts`
  - rotated image quad computation
- `geometry/containment.ts`
  - point-in-convex-polygon, rect corners inside quad
- `tools/crop.ts`
  - crop update logic, handle hit-testing, constraints
- `tools/autorotate.ts` / `tools/autofill.ts`
  - numeric auto-fill routines
- `render/preview.ts`
  - canvas preview renderer
- `render/export.ts`
  - offscreen export renderer
