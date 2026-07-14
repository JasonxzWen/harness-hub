---
name: delivery-workflow
description: "Load when workflow-router selects accepted-scope validation, cleanup, handoff, PR/CI closure, or release notes; this Workflow only orchestrates executable small loops."
---

# Delivery Workflow

Sequence: `implementation-review-loop` -> `delivery-loop` -> `retro-loop` -> `report-loop`.

`implementation-review-loop` first runs one review of the current implementation and returns any rejection to the main Agent; it does not repeat against unchanged bytes. The single-pass `delivery-loop` then uses a read-only delegated Producer before the same runtime performs explicitly authorized cleanup, deterministic validation, and an optional local commit of reviewed bytes, in that order. Rejection returns to the main Agent, completed local actions remain visible in the handoff, and any product-content change requires a new review. Delegated CLI execution never receives remote-write or merge authority; only the main Agent may act on explicit user authorization, and merge still requires explicit approval. `retro-loop` examines the real run history for high-ROI improvements. `report-loop` produces the compact handoff and deterministically invokes `effective-interact` for complex delivery. This Workflow contains no duplicated Loop implementation.
