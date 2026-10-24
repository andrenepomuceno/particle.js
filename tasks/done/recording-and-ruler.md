# Recording and ruler (v1 parity)

v1 had video capture (`*`) and a ruler shown while selecting/placing. Neither is in
the MVP. Use MediaRecorder on the canvas stream for capture (no new dependency).

## Result

Done with the user's quick-win batch (2026-10-24): `*` records the canvas with MediaRecorder (WebM,
downloaded on stop, REC badge, stopped on unmount); shift+drag shows a ruler (distance; Δx/Δy in
2D). Same batch, requested mid-task: O looks at the selection (centerOn, re-fits the field) and the
Field dialog's logarithmic colors (draw-time uniform, no field recompute).
