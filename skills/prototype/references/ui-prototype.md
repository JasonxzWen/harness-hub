# UI Prototype

Use a UI prototype when the question is about visual structure, interaction flow, density, or information hierarchy.

Prefer an existing page:

- keep existing data fetching, auth, params, and route context
- switch only the rendered subtree by query parameter, such as `?variant=A`

Use a new prototype route only when the idea has no natural host page.

Image-assisted prototypes:

- Use Host-native image generation when a visual reference answers the design question faster than code alone.
- Prompt only from public or generated material, or assets the user supplied or explicitly approved for this generation. Reduce private context to de-identified visual descriptors; never send source code, secrets, internal routes, customer or account data, private screenshots, or private copy.
- Compare the result against accepted design direction and constraints rather than treating it as the specification.
- Do not add an SDK, API key, provider adapter, or pinned model name to the target project.
- When native generation or safe context is unavailable, return a visual brief instead of building another image runtime.
- Delete unselected images with the losing variants unless the user explicitly asks to preserve them.

Variant rules:

- default to 3 variants
- cap at 5 variants
- make variants structurally different
- keep real data and app chrome when available
- avoid real mutations unless the question requires them

Switcher rules:

- fixed bottom bar or similarly obvious control
- previous and next controls
- URL updates so variants are shareable
- keyboard shortcuts when practical
- do not intercept shortcuts while an input, textarea, or contenteditable element is focused
- visually distinct enough that it cannot be mistaken for production UI
- hidden or removed before production

Cleanup:

- keep the winning design decision
- delete losing variants
- delete the switcher
- harden the chosen implementation through normal feature workflow

Anti-patterns:

- variants that differ only in color or copy
- shared layout code that prevents variants from testing different structures
- real mutations unless the question is specifically about the mutation experience
- promoting prototype code directly to production without the normal implementation and verification workflow
