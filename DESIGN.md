# Ghitty interface

## Design read

- **Surface:** developer application UI with data-dense results.
- **Audience:** technical researchers comparing repositories across languages and ecosystems.
- **Single job:** submit a topic and understand which repositories match, why, and through which search evidence.
- **Risk:** a polished ranking can hide missed or weak evidence, so provenance and incomplete states stay visible.
- **Platform:** responsive web, keyboard and pointer input, 320 CSS-pixel minimum reflow.
- **Constraints:** local Bun shell around the Python prototype; no invented account, billing, or usage data.

## Evidence and thesis

Application UI guidance from the local evidence corpus favors stable placement, concise hierarchy, fast state recognition, and decoration behind the work surface. Linear and Superhuman are structural references for density and predictable controls; Intercom is a useful contrast against oversized conversational surfaces. Refero was unavailable because the connected account has no active subscription.

Use a warm paper canvas, graphite type, cobalt primary action, crisp separators, and restrained 8-12px corners. The memorable device is the evidence rail: each result exposes metadata, code, or combined provenance as a first-class label. IBM Plex Sans/Avenir Next-style typography keeps the interface technical without terminal theater.

## Components and states

- Search form: persistent label, example topics, pending state, duplicate-submit prevention.
- Progress: concise live status plus a visible event list that is not repeatedly announced.
- Results: repository link, role, focused/partial match, evidence source, archive/stale state, original and translated descriptions, and linked code snippets.
- Recovery: validation error, provider/configuration error, retry through preserved input, and cancel for active work.
- Empty state: explains GitHub metadata plus Grep evidence without invented results.

## Responsive and accessibility contract

One content rail aligns header, form, progress, and results. The two-column work area collapses below 760px; controls remain at least 44px high and results do not require horizontal scrolling. Native form and button semantics lead, keyboard focus uses `:focus-visible`, status changes use a single polite live region, reduced motion disables transitions, and forced-colors receives visible borders. Full WCAG conformance remains unverified pending browser, keyboard, screen-reader, zoom, forced-colors, and automated accessibility checks.
