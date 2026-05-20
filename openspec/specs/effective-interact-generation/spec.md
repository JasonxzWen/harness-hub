# effective-interact-generation Specification

## Purpose
TBD - created by archiving change harden-effective-interact-generation. Update Purpose after archive.
## Requirements
### Requirement: Interaction generator produces reliable HTML by default
The system SHALL provide a reusable generation path that converts structured JSON interaction input into a single `.html` artifact whose primary content is reliable in local browsers and common constrained environments.

#### Scenario: Generate implementation handoff artifact
- **WHEN** the agent provides structured interaction input with title, summary, sections, evidence, and verification state
- **THEN** the system writes one `.html` artifact under the configured output directory
- **AND** the artifact includes a conclusion-first summary, navigation, evidence, verification status, and next actions

#### Scenario: Default output keeps primary content available
- **WHEN** the artifact is generated in the default mode
- **THEN** Markdown content is rendered to HTML before handoff
- **AND** Mermaid content is rendered to inline SVG before handoff
- **AND** code snippets are rendered with static highlighting before handoff
- **AND** the output does not require CDN scripts to display its primary reading content

### Requirement: Runtime rendering is explicit and auditable
The system SHALL support runtime rendering for Markdown, Mermaid, and code blocks only when explicitly selected by the interaction input or template.

#### Scenario: Runtime mode declares dependencies
- **WHEN** runtime rendering is enabled for an artifact
- **THEN** the artifact declares pinned runtime library names and versions in the HTML or metadata
- **AND** the artifact includes source fallbacks for runtime-rendered Markdown, Mermaid, and code sections
- **AND** the artifact keeps primary conclusions and evidence readable if a runtime enhancement fails

#### Scenario: Runtime mode fails visibly
- **WHEN** a runtime library is unavailable or rendering fails
- **THEN** the artifact displays a visible fallback or error status for the affected section
- **AND** the artifact preserves the source text needed to audit the content

### Requirement: Interaction templates cover high-frequency communication scenarios
The system SHALL provide reusable templates for common interaction-artifact scenarios and SHALL define when each template should be used.

#### Scenario: Select implementation handoff template
- **WHEN** the artifact summarizes completed implementation work
- **THEN** the system can use an implementation handoff template with changed areas, file evidence, verification gates, risks, and next actions

#### Scenario: Select review findings template
- **WHEN** the artifact contains review findings with severity or owner dimensions
- **THEN** the system can use a review findings template with severity filtering, finding cards, code evidence, and action export

#### Scenario: Select decision matrix template
- **WHEN** the artifact compares multiple implementation options or unresolved product choices
- **THEN** the system can use a decision matrix template with options, trade-offs, recommendation, risks, and confirmation questions

#### Scenario: Preserve showcase as example asset
- **WHEN** the system includes a showcase artifact for `effective-interact`
- **THEN** the showcase remains available as an example or fixture
- **AND** it demonstrates Markdown rendering, Mermaid rendering, code highlighting, evidence display, and interactive controls

### Requirement: Rich content is rendered safely
The system SHALL render rich content without executing untrusted artifact content.

#### Scenario: Markdown is sanitized
- **WHEN** Markdown content is generated from user-controlled or mixed-trust input
- **THEN** the rendered HTML is sanitized before it is inserted into the artifact
- **AND** unsafe scripts, event handlers, and unsupported protocols are removed or escaped

#### Scenario: Mermaid uses strict rendering
- **WHEN** Mermaid content is rendered at build time or runtime
- **THEN** the renderer uses a strict security configuration where supported
- **AND** the artifact keeps the Mermaid source in an auditable fallback block

#### Scenario: Code and paths are inert
- **WHEN** code snippets or file paths are included in an artifact
- **THEN** they are treated as inert text unless the artifact explicitly renders a safe local path reference
- **AND** the artifact does not execute code snippets or path-derived content

### Requirement: Validation checks visual and interactive behavior
The system SHALL provide validation that checks generated artifacts for rendering, evidence, accessibility, and interaction readiness.

#### Scenario: Validate rich rendered content
- **WHEN** validation runs against a generated artifact
- **THEN** it verifies that Markdown tables/lists, Mermaid SVG, and code highlighting are present when those section types are used
- **OR** it reports that the section is runtime-dependent with a valid fallback and dependency declaration

#### Scenario: Validate interaction controls
- **WHEN** validation runs against a generated artifact with filters, tabs, copy buttons, or focus effects
- **THEN** it verifies that the controls exist, have accessible labels or text, and produce the expected DOM state changes in a browser-capable environment

#### Scenario: Validate narrow viewport
- **WHEN** validation runs in a browser-capable environment
- **THEN** it checks at least one narrow viewport for obvious blank output, missing primary content, or major overlap of controls and text

#### Scenario: Browser-assisted validation can degrade explicitly
- **WHEN** browser automation or local Chrome is unavailable
- **THEN** validation reports the degraded coverage explicitly
- **AND** validation does not silently claim browser-only rendering checks passed

### Requirement: Skill guidance routes generation work without broadening into product UI
The system SHALL keep `effective-interact` focused on user-interaction artifacts and SHALL preserve routing boundaries with adjacent skills.

#### Scenario: User interaction point uses interaction generation
- **WHEN** a non-trivial interaction point needs evidence, tradeoffs, diagrams, code snippets, options, or verification details
- **THEN** the agent uses the effective interaction generation workflow unless the user asks for a short direct response

#### Scenario: Product UI routes elsewhere
- **WHEN** the user asks for a production application page, branded website, slide deck, or bundled React/Tailwind artifact
- **THEN** the agent routes to the appropriate frontend or artifact skill instead of `effective-interact`

#### Scenario: Generator remains an internal skill asset
- **WHEN** the interaction generator or validator is added for this capability
- **THEN** it remains inside the `effective-interact` skill asset surface
- **AND** it is not exposed as a separate installable capability unless a later change explicitly approves that boundary
