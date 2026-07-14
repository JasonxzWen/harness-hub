---
name: answer-workflow
description: "Load when workflow-router selects a read-only question; this Workflow only runs report-loop and does not mutate repository or external state."
---

# Answer Workflow

Sequence: `report-loop`.

Pass the user's exact question and gathered source anchors as input. For simple answers, `report-loop` may return plain text. For complex comparisons or explainers, it invokes `effective-interact` and validates the artifact. Return the Loop's compact handoff to the main Agent; do not implement changes inside this Workflow.
