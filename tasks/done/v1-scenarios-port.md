# Port the best v1 scenarios to JSON

v1 has 68 active scenarios in 12 families (inventory in this task's history). Suggested port
(~20): Welcome, The Egg, Gravity (force map); Air, Water 2, Essential Elements (quark model);
Periodic Table (EPN); Hydrogen, Helium, Water (elements); one Strong Blob and one Standard Model
scene; the three field demos (after field visualization lands); Planetoid Formation.
Each must reproduce v1's look with v2 forces (nuclear sine with n, Coulomb, color) and be
checked with snap/cluster-stats; v1 code: ../particle.js/src/simulation/scenarios_v0, scenarios_v1.

## Result

13 v1 scenarios ported (see commit "port 13 v1 scenarios"); the agent was stopped before its
report to bring CPU use down, so verification was done on main: all parse and build, headless
snapshots clean, Welcome and Periodic Table checked visually. Dropped/not ported: the three field
demos (field visualization now exists; can follow) and v1 scripted actions (timeline task).
