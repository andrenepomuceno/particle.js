# Higher-order integrator? (user asked about RK4, 2026-10-24)

Answered in chat: RK4 is not a good fit (4 force passes, not symplectic → energy drift over long
runs, extra textures for stages). If 4th order is wanted, prefer Yoshida/Forest–Ruth (symplectic,
3 force passes per step, built from Verlet sub-steps, so it reuses the existing passes). Only pays
off for smooth long-range scenarios (galaxy, binaries); hard cutoffs and float32 (~1e-7) cap the
gain elsewhere. Pending the user's go-ahead.
