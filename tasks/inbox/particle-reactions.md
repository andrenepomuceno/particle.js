# Particle creation and annihilation (reactions) — planned for 2.1

User request (2026-10-24), scheduled for v2.1 by the user. Reactions within the pre-allocated
capacity, conserving what classical physics conserves, stochastic where needed, data-driven.

Design (agreed outline):
- Free slots: a slot can be empty; O(N²) loops skip empty slots; capacity is the ceiling (a
  reaction that needs more slots does not fire and is counted).
- Rules in the scenario JSON (and editable in the UI): reactants (species or attribute match),
  distance, a rate expression (same parser and pair variables), products. Probability per step
  1 − exp(−rate·dt) drawn from the scenario's seeded RNG (reproducible).
- Conservation: discrete quantities (2D charge, nuclear charge, color, isospin, mass or a declared
  released mass) checked when a rule loads — a violating rule fails loudly. Per event: products leave
  from the reactants' centre of mass with total momentum conserved, and their kinetic energy is set so
  that total energy (kinetic + the change in pair potential energy) is conserved; if impossible the
  reaction is forbidden (a threshold for free). Classical: no E = mc².
- First implementation on the CPU every K steps (readback, O(N) hash grid for candidates,
  deterministic conflict resolution, upload of changed slots), mirrored in the reference; a GPU
  version with prefix-sum compaction only if needed.
- UI: reaction list, counters (events, free slots, energy adjusted). Scenarios: e⁺e⁻ annihilation in a
  plasma, n → p + e decay with a visible half-life, d + d fusion releasing energy, ion recombination.
