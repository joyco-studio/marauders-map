# Continuous aged parchment

Replace disconnected rigid hinge offsets with a continuous integrated sheet profile. Rounded crease bands provide physical layer clearance; flexible bows bend each moving panel while the shared seam coordinates remain identical. Keep UVs fixed and reuse the existing normal and relief textures.

1. Import the supplied aged RGBA paper and its metadata, applying its alpha cutout to front, back, edge, and printed content.
2. Integrate all crease rotations from the original sheet coordinates. Deform subdivided front/back and perimeter geometry together; update normals, bounds, and raycast geometry only while folding changes.
3. Validate open-sheet dimensions, seam continuity, fold curvature and closed-layer clearance with focused geometry tests. Run typecheck, lint, build, and inspect the rendered opening/closed states.

Validation completed: three geometry tests pass for unfolded dimensions, continuity at every crease throughout folding, and distinct closed layers. Typecheck, lint and production compilation pass. Chrome inspection covers folded, unfolded and partially bent paper; captures are in `.context/aged-paper-*.png`. Crease angles are precomputed once per changed fold position; static frames reuse geometry.
