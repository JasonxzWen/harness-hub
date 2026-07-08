# Agent Hook Templates

These templates show how Codex and Claude Code can call the package-exposed
`harness-agent-hook` adapter from their lifecycle hook systems.

They are source-distributed examples only. Harness Hub does not install them
into `.codex/` or `.claude/`, does not enable blocking hooks by default, and
does not bypass host trust or review flows.

To use a template, first make `harness-agent-hook` available on `PATH` through
an explicit local or global Harness Hub package installation that you control.
Then copy the relevant JSON into the host-owned configuration layer and review
it through that host's normal trust workflow.

The provided commands are advisory because they omit `--enforce`. A later,
separately reviewed rollout may add blocking variants after security review and
explicit approval.
