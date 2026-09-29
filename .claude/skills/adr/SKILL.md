---
name: adr
description: Create an Architecture Decision Record in docs/decisions/. Use when an architectural decision has been made or needs to be written down (technology choice, data model, security model, integration, ALM). Not for trivial implementation details.
---

# New ADR

1. Check that the decision is architectural: hard to reverse, affects several components, or has
   cost/security/licensing impact. If not, say so and suggest a code comment or a note in docs instead.
2. Read the existing ADRs in `docs/decisions/` to find the next number and avoid contradicting an
   accepted decision. If the new one replaces an old one, mark the old one `Superseded by NNN`.
3. If the decision has not been made yet, **ask the owner for their preferred option and reasoning
   first** (learning mode), then review it.
4. Copy `docs/decisions/000-template.md` to `docs/decisions/NNN-kebab-case-title.md` and fill it in English.
   Keep it to about one page: real constraints (Developer Plan, DEV/TST, single developer), real options, honest consequences.
5. If the ADR resolves an item in CLAUDE.md "Open decisions", remove that item.
