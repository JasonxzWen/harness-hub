# Bootstrap A Target Repository

Use this file when you are an agent working in another repository and a user gave you the Harness Hub repository link.

## Rule

Treat this repository as documentation and a CLI source, not as a template. Do not copy this checkout into the target repository.

## Preferred Path

Run the published CLI from the target or from any shell that can reach the target path:

```powershell
npx @jasonwen/harness-hub@latest init-harness D:\path\to\target --target standard --dry-run --json
npx @jasonwen/harness-hub@latest init-harness D:\path\to\target --target standard --yes
npx @jasonwen/harness-hub@latest validate-harness D:\path\to\target --json
```

Use `--dry-run --json` first when the target may already contain harness files.

## Source Runner Fallback

If npm is unavailable but the source repository is available, clone Harness Hub outside the target worktree and use it only as a runner:

```powershell
git clone https://github.com/JasonxzWen/harness-hub.git C:\tmp\harness-hub
cd C:\tmp\harness-hub
bun install
bun run build
node bin\harness-hub.mjs init-harness D:\path\to\target --target standard --dry-run --json
node bin\harness-hub.mjs init-harness D:\path\to\target --target standard --yes
node bin\harness-hub.mjs validate-harness D:\path\to\target --json
```

The source checkout stays outside the target and can be deleted after the target is initialized.

## Never Copy Into The Target

Do not copy these Harness Hub source-repo paths into the target repository:

- `.claude-plugin/`
- `openspec/`
- `docs/`
- `config/`
- `capabilities/`
- `harness/`
- `src/`
- `tests/`
- `site/`
- `package.json`
- `README.md` or `README.zh-CN.md`
- `CHANGELOG.md`
- this repository's root `AGENTS.md`

The target should receive only lock-managed `skills/<name>/` entries, standard target harness root files, `.harness-hub/lock.json`, and ignored local state under `.harness-hub/state/`.

## Stop Conditions

Stop and report a bootstrap blocker instead of manually copying folders when:

- `npx @jasonwen/harness-hub@latest ...` cannot run;
- the source fallback cannot build or run;
- the target has local harness files and the dry-run reports conflicts;
- credentials, network access, or filesystem permissions are required.

## Handoff Evidence

Report the commands run, exit codes, validation status, and whether forbidden source-repo paths are absent from the target root.
