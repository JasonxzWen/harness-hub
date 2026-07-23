---
name: beautiful-feishu-whiteboard
description: Load when creating or restyling a polished editable Feishu or Lark whiteboard, infographic, diagram, poster, or visual explainer; do not load for generic SVGs, static images, or other whiteboard platforms.
license: MIT
metadata:
  source: "zarazhangrui/beautiful-feishu-whiteboard"
  upstream_commit: "6989843b355ac92ebbd4f66166189a001e61e9b5"
  adaptation: "Preserves the verified medium rules, catalogue, and 35 palette documents while removing installers, authentication setup, automatic downloads, screenshots, and fixed CLI write commands."
---

# Beautiful Feishu Whiteboard

Compose an editable Feishu/Lark whiteboard from native SVG shapes, using one of 35 curated palette systems and the medium's verified rendering constraints.

This Skill owns the board's visual system, SVG composition, and render review. It does not authorize dependency installation, account configuration, authentication, document creation outside the request, or unrelated Feishu writes.

## Availability And Authority

Before building, perform read-only checks for:

- an already available SVG-to-Feishu whiteboard renderer or equivalent Host capability;
- an already authenticated Feishu/Lark writer if the requested outcome includes a live editable board;
- the exact existing document/whiteboard target, or clear authorization in the request to create a new board.

If a required capability is absent, report it and stop at the highest truthful artifact boundary. Do not install packages, run an auto-downloading command, configure an account, start login, or copy credentials.

A request for a local SVG or preview does not authorize a Feishu write. A request to create or update a Feishu whiteboard authorizes only the named board or the smallest new document needed for that board.

## Build

### 1. Resolve the board

Determine the content, purpose, audience, target, and whether the user needs:

- a local SVG/preview;
- an editable live whiteboard;
- both.

Ask one short question only when a missing answer changes content or the external write target.

### 2. Choose one visual system

If the user named a style, use it. Otherwise read `CATALOG.md` and choose by loudness, formality, mood, and palette.

Commit to one candidate before loading a template. Then read:

- all of `RULES.md`;
- only `templates/<chosen-slug>/design.md`.

Do not open several full palette documents to compare them. The catalogue is the comparison surface.

### 3. Compose native SVG

Use a logical canvas roughly 1600–1700 units wide and let content determine height. Choose the narrative shape that best fits the material: stages, flow, comparison, timeline, or system map.

Follow these invariants:

- use editable native rectangles, rounded rectangles, circles, ellipses, straight or right-angled connectors, and text;
- keep every label as `<text>`/`<tspan>` and do not set `font-family`;
- use native connector arrowheads via markers, never decorative triangle or chevron arrowheads;
- use only solid colors; no gradients, masks, clipping, filters, blur, or opacity;
- keep all visible copy content-bearing. Never put the prompt, source path, style name, tool name, or build notes on the board.

### 4. Render And Correct

Use an already available renderer. Inspect the rendered image, then fix:

- overflow and clipping;
- tight outer margins or internal padding;
- accidental overlaps;
- arrowhead defects;
- low contrast and tiny labels;
- content that reads in the wrong order.

Apply local SVG fixes in one targeted batch, render again, and repeat until clean. Do not regenerate the entire board to move one box.

If no compatible renderer is available, do not claim Feishu fidelity; return the SVG as unverified or stop if the user required a verified editable board.

### 5. Write Only When Authorized

After the local render passes, use the already available Feishu/Lark writer against the resolved target. Use an idempotent request mechanism when the available capability supports one.

Query the live board after the write. Inspect its rendered layout and verify stored text colors through raw/live data when image export is known to render text colors unreliably. Make only scoped corrections to the same target.

## Delivery

For a completed live board, return both the confirmed Feishu document/board link and the final rendered image. For a local-only result, return the SVG and preview paths.

State the chosen palette, validation evidence, unavailable checks, and whether the user can request a palette switch. Never claim editability, a live link, or a successful write from a local render alone.
