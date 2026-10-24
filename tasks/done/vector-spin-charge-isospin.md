# Vector spin, 2D charge, isospin and species

User decisions (2026-10-24): spin as a fixed vector with central forces only; charge as a generic
2D vector; flavor as isospin I3 plus species presets; RK4 not wanted (Yoshida after the release).

## Result

Done. Layout: attributes = (m, q, q2, parity), color = (rgb, n), new spin texture = (s, I3).
Variables q2_*, q_dot, sx/sy/sz_*, s_dot, si_r, sj_r, i3_*; s_i/s_j removed (loud error listing the
new names). The other particle's spin/isospin is fetched only when an expression reads it.
Coulomb uses q_dot; Spin-spin became the spin dipole potential. Snapshot v4 (v1–3: scalar spin →
z component, also rewritten inside force expressions). Scenario keys species/charge2/isospin and
vector spin; Generator species select; Vec3Field for spin and color (three dialogs).
Verified: 210 unit tests; parity GPU vs float64 for the new variables 6.3e-7 (Euler) / 8.1e-6
(Verlet), field 4.0e-7; smoke:all 7/7 scenarios, 29 interaction checks.
