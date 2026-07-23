---
name: frontend-slides
description: Load when a task needs a browser-based HTML presentation, talk or pitch deck, existing-deck enhancement, or PPT/PPTX-to-web conversion; do not load for reports, product UI, or interactive courses.
license: MIT
metadata:
  source: "zarazhangrui/frontend-slides"
  upstream_commit: "9906a34d640d2111f724544cbc50f7f130569ae1"
  adaptation: "Keeps the current fixed-stage, visual-discovery core while excluding plugin packaging, the optional template pack, automatic dependency installation, deployment, and publishing."
---

# Frontend Slides

Create a polished, self-contained HTML presentation on a fixed 1920×1080 stage that scales uniformly to the browser viewport.

## Boundaries

Use this Skill for a presentation artifact:

- a new talk, pitch, workshop, or internal deck;
- conversion of an existing `.ppt` or `.pptx` to HTML;
- visual, motion, or layout improvement of an existing HTML deck.

Do not use it for product UI, report pages, public articles, or a codebase-derived interactive course. Route those to `frontend-design`, `effective-interact`, `source-post`, or `codebase-to-course`.

The core deliverable is local. Do not install dependencies, authenticate services, deploy, upload, or publish merely because a deck was generated. Export or remote sharing is a separate user-authorized action and must reuse tools that are already available.

## Fixed-Stage Contract

- Author every slide at exactly 1920×1080 inside one `.deck-stage`.
- Scale the stage as a whole and allow letterboxing or pillarboxing; never reflow slide content by device.
- Copy the complete `viewport-base.css` into the final HTML.
- Control slide visibility with `.active` and `.visible`; do not switch slides with `display: none` and `display: block`.
- Keep every slide clipped to its stage. Split content instead of shrinking text into unreadability.
- Keep controls outside the stage and support keyboard, wheel, and touch navigation.
- Respect `prefers-reduced-motion`.

Read `viewport-base.css` before implementation. Read `STYLE_PRESETS.md` only when selecting or applying a visual direction, and `animation-patterns.md` only when motion is part of the accepted direction.

## Build

### 1. Resolve content

Ask only for missing decisions that change the result:

- purpose and audience;
- approximate length;
- available copy, notes, images, or source deck;
- speaker-led low density or reading-first high density.

Ask independent questions together. If the user already supplied enough context, state the assumptions and continue.

For supplied images, inspect them before outlining the deck. Let usable images influence slide structure instead of treating them as decoration added at the end.

### 2. Resolve visual direction

If the user named a style or supplied an authoritative brand system, use it.

Otherwise create three compact, self-contained title-slide previews under `.frontend-slides/slide-previews/`. Make the options genuinely different in typography, palette, composition, and motion. Each preview must look like a real first slide for the user's deck:

- show real title, author, date, or company content when available;
- never show internal labels such as `preview`, `option`, `preset`, file paths, prompts, or style slugs;
- do not turn the user's design instructions into visible slide copy.

Present the three previews for selection before building the full deck. Remove the preview directory at delivery unless the user asks to keep it.

### 3. Generate

Default to one named `.html` file with inline CSS and JavaScript. Add an adjacent assets directory only for real user-supplied or extracted media.

Include:

- semantic `main`, `section`, and navigation elements;
- CSS custom properties for the chosen theme;
- a small presentation controller with keyboard, wheel, and touch input;
- a visible progress or slide-position indicator;
- meaningful reveal transitions, not motion on every element;
- comments at major structure and theme boundaries;
- readable contrast, focus visibility, and reduced-motion behavior.

Use the selected density consistently:

- speaker-led decks favor one idea, large type, and generous space;
- reading-first decks may use denser grids, tables, annotations, and captions while remaining legible.

### 4. Convert PowerPoint only with available tools

Preserve slide order, text, images, and speaker notes. Use an existing parser when one is already available. If conversion requires a new package or application, report the missing dependency and ask before installing or adding it.

Do not treat extraction as design fidelity. After confirming extracted content, apply the same visual-direction and fixed-stage process as a new deck.

## Verify

Rendered evidence is mandatory. At minimum:

- inspect every slide at 1920×1080 and 1280×720;
- inspect the fixed-stage scaling at 768×1024 and 375×667;
- confirm there is no text overflow, clipped essential content, panel overlap, or internal scrollbar;
- exercise forward/back keyboard navigation and one pointer or touch path;
- check the browser console;
- verify the first slide and one densest slide with reduced motion enabled.

A DOM size check alone does not prove that panels do not overlap. Use rendered screenshots or equivalent visual inspection.

## Handoff

Report the absolute file path, slide count, chosen visual direction, validation evidence, and the smallest useful customization points. Mention unavailable export or browser evidence honestly. Do not claim a deployment, upload, or PDF exists unless that separate action succeeded.
