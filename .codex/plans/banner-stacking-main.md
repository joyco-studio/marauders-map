# Banner stacking and main checkout

Move the root checkout to `local/parked-main`, then check out the existing main branch in the Conductor worktree. Preserve all existing changes and include the previously untracked ecosystem plan as requested.

Render each character banner immediately before its own inscription. Assign paired render orders so the next banner covers the previous banner and its text, preserving transparent edges and ink reveals. Overlap itself remains allowed.

Verify with typechecking, lint and a browser view of overlapping banners; commit all workspace changes and push main to origin.

## Result

Both checkouts moved successfully. Typecheck, lint and diff whitespace checks passed. Chrome confirmed that Filch’s foreground banner covers the trailing text of Hermione’s banner; no console errors were reported. This deterministic draw-order correction did not need new tests. All workspace changes, including the existing ecosystem activity plan, are included in the commit.
