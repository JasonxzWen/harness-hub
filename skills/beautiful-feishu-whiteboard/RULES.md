# Feishu SVG Whiteboard Medium Rules

These constraints apply to every palette. A palette controls color and mood; it does not override the editable-shape or rendering boundary.

## Native Shape Contract

- The board uses one built-in font. Do not set `font-family`.
- Text remains `<text>` and `<tspan>`; never convert glyphs to paths.
- Structural shapes are `<rect>`, rounded `<rect>`, `<circle>`, `<ellipse>`, `<line>`, and right-angled `<polyline>`.
- Avoid structural `<path>` and `<polygon>` geometry. It may flatten into an image and render poorly.
- Connectors carry their own `marker-end` or `marker-start`. Do not draw a separate triangle or chevron at a line endpoint.
- Keep connectors straight or right-angled.

One marker definition can signal native arrowheads:

```svg
<defs>
  <marker id="arrow" markerWidth="12" markerHeight="12" refX="9" refY="4"
          orient="auto" markerUnits="strokeWidth">
    <path d="M0 0 L10 4 L0 8 z"/>
  </marker>
</defs>
<line x1="100" y1="80" x2="360" y2="80"
      stroke="#0D4FA8" stroke-width="3" marker-end="url(#arrow)"/>
```

The marker path is only a conversion signal; do not use standalone arrowhead polygons elsewhere.

## Rendering Limits

- No gradients, patterns, filters, blur, masks, or clipping paths.
- Opacity attributes are unreliable. Use solid lighter or darker hex colors instead.
- Text color may be correct on the live board while image export renders it incorrectly. Verify stored color through live/raw board data, not the exported image alone.
- A hard offset shadow is allowed only as a solid duplicate of the same shape with matching dimensions, corner radius, and transform.
- Safe transforms are `translate`, `rotate`, and `scale`. Avoid skew and arbitrary matrices.
- Use a content-sized logical canvas, not a fixed 16:9 stage.
- Wrap long text with `<tspan>` lines and generous padding. Do not shrink important text to force a fit.

## Content Rules

- Every text element must carry real artifact content.
- Do not print the user's request, source citation, file path, style slug, build step, date, token, or tool name unless the user explicitly asked for that item as board content.
- A title may name the subject. It must not describe how the board was produced.
- Prefer a clear reading path over decoration. Small ornamental metadata is not useful whiteboard content.

## Validation

Before any remote write:

1. Run the already available renderer and structural checker. Do not install or auto-download a renderer as part of this Skill.
2. Search the SVG with:

   ```text
   rg -n '<polygon|<polyline' <svg-path>
   ```

   Every polygon and every short chevron-like polyline is suspect. A right-angled connector is valid only when it is the connector itself and carries its marker.
3. Inspect the rendered image for text overflow, edge clipping, tight padding, accidental overlap, and unclear reading order.
4. Fix all visible local issues in one targeted edit pass, then render again.

After an authorized remote write:

1. Query the same live board and render it through the available Feishu capability.
2. Inspect layout and shapes from the live result.
3. Verify text colors from stored/live data when export color is unreliable.
4. Correct only the authorized target and re-check it.

If a renderer, checker, live query, or color check cannot run, record that evidence as unavailable. Do not infer a pass.
