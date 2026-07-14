# Intent taxonomy

| State | Owner | Boundary |
| --- | --- | --- |
| `question` | `answer-workflow` | Read-only explanation, comparison, lookup, or evidence gathering. |
| `sdd-change` | `sdd-workflow` | Feature, fix, refactor, behavior, policy, documentation, or test mutation. |
| `diagnosis` | `diagnosis-workflow` | Starts from a failure, regression, flaky behavior, or performance symptom. |
| `review` | `review-workflow` | Report-only correctness, security, UI/UX, test, or risk review. |
| `delivery` | `delivery-workflow` | Accepted-scope validation, cleanup, handoff, PR/CI closure, or release notes. |
| `clarify` | none | One blocking choice changes behavior, ownership, safety, cost, remote state, or acceptance. |
| `none` | none | Trivial chat or no actionable intent. |

Explicit read-only intent outranks mutation-like nouns. Failure evidence outranks generic “fix” wording. A request mixing report-only review and implementation pauses for one concise choice unless the requested order is explicit.

Project-specific maintenance owners must not be embedded in this target-distributed Router. A source repository may select its own internal workflow through its root project contract.
