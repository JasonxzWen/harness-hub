## ADDED Requirements

### Requirement: Source research produces project-aware insight posts
The system SHALL transform user-provided source material into a UTF-8 insight post that extracts viewpoints, integrates them, maps them to Harness Hub, and records iteration impact.

#### Scenario: Generate insight post draft
- **WHEN** the user provides one or more source URLs or source texts
- **THEN** the system records source metadata
- **AND** the generated post identifies source claims, extracted viewpoints, integrated insight, Harness Hub impact, iteration record, action boundary, and source references
- **AND** the post distinguishes facts, inferences, assumptions, and user/project judgments

#### Scenario: Avoid source rewriting
- **WHEN** the source material is a blog, interview, thread, or release note
- **THEN** the generated post does not present a paraphrased source summary as the main output
- **AND** the post includes project-state analysis and iteration content that is not merely a rewritten version of the source

#### Scenario: Control source volume
- **WHEN** source material is long, multi-page, or media-derived
- **THEN** the system stores source metadata, extraction notes, and bounded excerpts rather than copying the full source into public or always-loaded artifacts
- **AND** the generated post links to sources and distinguishes direct facts from project judgments

### Requirement: Effective Interact is the first blog generation layer
The system SHALL use `effective-interact` as the initial generation layer for insight blog drafts.

#### Scenario: Generate draft with effective-interact
- **WHEN** an insight post draft is generated
- **THEN** the generator uses an `effective-interact` input shape or compatible adapter
- **AND** the output remains valid UTF-8
- **AND** the output can be validated through the relevant `effective-interact` checks before publication

#### Scenario: Generator gap appears
- **WHEN** GitHub Pages publishing exposes a concrete gap in `effective-interact`
- **THEN** the system records the gap and adapts `effective-interact` or adds a thin adapter
- **AND** the system does not create a separate broad CMS renderer without evidence

### Requirement: Site source is publishable and not an ignored local artifact
The system SHALL store public blog source and generated site files in a versioned site surface that is separate from ignored local report artifacts.

#### Scenario: Write post source
- **WHEN** an insight post is accepted for publication
- **THEN** the source of truth is written to a committed site content location
- **AND** the post has a stable slug, title, date, source metadata, and generated output path

#### Scenario: Keep local reports ignored
- **WHEN** `effective-interact` creates local scratch artifacts
- **THEN** those artifacts remain under ignored local paths
- **AND** the public site source is generated or copied through an explicit accepted publish path

### Requirement: GitHub Pages publishing is explicit and gated
The system SHALL publish insight posts to GitHub Pages only through an explicit command or automation path with preflight checks.

#### Scenario: Publish preflight passes
- **WHEN** the user requests publication
- **THEN** the system checks branch policy, worktree state, source metadata, UTF-8 encoding, link integrity, generated output, site build output, and workflow readiness
- **AND** publication proceeds only after required checks pass

#### Scenario: Publish preflight fails
- **WHEN** branch, worktree, source, encoding, link, build, or workflow checks fail
- **THEN** the system stops before commit, push, deploy, or remote mutation
- **AND** it reports the blocking condition and next repair step

### Requirement: Insight posts create iteration records
The system SHALL preserve the project iteration value of each published post.

#### Scenario: Record iteration impact
- **WHEN** a post is generated from external material
- **THEN** it records what project judgment changed, what was confirmed, what remains open, and what future signal should be watched
- **AND** it does not automatically modify project code unless the user separately starts an implementation workflow
