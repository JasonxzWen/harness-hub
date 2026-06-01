## ADDED Requirements

### Requirement: Harness defines validation priorities
The minimal harness SHALL define a P0/P1/P2 validation policy for active development tasks.

#### Scenario: Initialize validation policy
- **WHEN** `init-harness` writes the minimal harness to a target repository
- **THEN** the target contains a `validation_priority_policy` entry in `feature_list.json`
- **AND** the active task template explains P0, P1, and P2 validation expectations
- **AND** `validate-harness` fails when the minimal harness is missing the validation priority policy markers

#### Scenario: Complete a TDD task
- **WHEN** a production behavior change is completed through TDD
- **THEN** P0 evidence includes the new or changed behavior test, the nearest relevant suite, and required static or runtime gates
- **AND** P1 and P2 checks are either run, risk-assessed, or explicitly deferred with a recorded reason

### Requirement: Web changes require agent-run browser acceptance
The minimal harness SHALL require local browser acceptance evidence for Web user-visible changes.

#### Scenario: Prepare a Web task
- **WHEN** a target task changes Web UI, routing, form behavior, interaction state, or user-visible browser behavior
- **THEN** `.harness-hub/state/current-task.md` records Web browser acceptance scope, dev server command, local URL, user flow, viewport, console/network checks, and artifact evidence
- **AND** the acceptance path is agent-run browser validation through local tooling such as `webapp-testing`

#### Scenario: Complete a Web task
- **WHEN** a Web user-flow change is handed off
- **THEN** progress and session handoff record the browser acceptance status, URL, scenario, viewport, screenshots or trace paths when useful, console/network findings, and any skipped coverage reason
- **AND** the task is not considered done if required browser acceptance is missing without a blocker or explicit skip reason

#### Scenario: Durable E2E suite is requested
- **WHEN** the user asks for durable browser test suites, CI browser tests, Page Object Models, fixtures, or flaky-test strategy
- **THEN** the workflow uses `e2e-testing`
- **AND** ordinary one-off Web acceptance remains covered by `webapp-testing`
