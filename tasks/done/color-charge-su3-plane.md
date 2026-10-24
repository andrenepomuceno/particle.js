# Color charge as 120° weight vectors (strong force closer to theory)

User request: a more realistic strong force; color charge described by three base
vectors (r, g, b) 120° apart.

- Particle keeps amounts (r, g, b); physical vector C = r·e_r + g·e_g + b·e_b in the 2D color
  plane. White (1,1,1) and color/anticolor pairs map to C = 0 (color neutral).
- `c_dot = C_i·C_j = 1.5·(c_i·c_j) − 0.5·Σc_i·Σc_j`: same color +1, different −½,
  color/anticolor −1, color/different anticolor +½ — the Cartan (diagonal) part of SU(3)
  (ratio +1/3 : −2/3 for qq). Off-diagonal gluon exchange (color swapping) is not modeled.
- Expose the plane components `cx_*`, `cy_*` too.
- Cornell preset with Casimir scaling: `V = c_dot · (alpha / r − sigma · r)`.
- Display: anticolor shown as the complementary color (anti-red → cyan).

## Result

Done. `src/engine/colorCharge.ts` holds the 120° basis, `colorPlane`/`colorDot` (JS) and the
matching GLSL helpers; `c_dot` now means `C_i·C_j` and `cx_*`/`cy_*` expose the plane vector.
Cornell preset: `c_dot * (alpha / r - sigma * r)`. Color display shows anticolors as complements.
Verified: 7 unit tests on the color factors and the preset; quarks scenario in headless
Chromium at t≈198 shows color/anticolor pairs and triplets instead of large blobs.
