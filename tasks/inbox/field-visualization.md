# Vector field visualization

v1 had probe particles drawn as arrows showing the net field (keys J toggle, F resize).
Port it: a probe grid rendered from a separate compute pass that reuses the generated
force functions with a unit test particle, so no second copy of the force code exists.
