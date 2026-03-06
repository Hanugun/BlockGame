# Architecture Notes

## Status

Solo mechanics authority changed on 2026-03-06.

## Authoritative Solo Spec

Use [`docs/specs/aqua_aqua_mechanics_full_spec_v2.md`](./specs/aqua_aqua_mechanics_full_spec_v2.md) as the only source of truth for solo gameplay behavior.

## Current Architectural Intent

- `packages/core` remains the deterministic simulation package for local and online modes.
- `apps/client` remains the presentation layer.
- `apps/server` remains authoritative for online orchestration.

## Important Constraint

Any architecture or gameplay examples in older docs that conflict with the v2 solo spec are non-authoritative.
