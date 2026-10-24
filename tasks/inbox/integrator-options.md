# Integrator options

Only semi-implicit Euler exists. Add velocity Verlet / leapfrog (needs the previous
acceleration in a texture) and expose the choice in Parameters. Keep `referenceStep`
as the spec for each scheme.
