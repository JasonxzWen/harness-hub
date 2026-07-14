---
name: review-workflow
description: "Load when workflow-router selects report-only correctness, security, UI/UX, test, or risk review; this Workflow only orchestrates executable small loops."
---

# Review Workflow

Sequence: `implementation-review-loop` -> `report-loop`.

The review Loop owns independent evidence, deterministic failures, and read-only arbitration. The report Loop presents findings first and invokes `effective-interact` when complexity warrants it. Neither Loop nor this Workflow implements fixes unless the user starts a separate mutation task.
