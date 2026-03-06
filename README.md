# Aquawetrix

Aquawetrix is a web game inspired by Wetrix and Aqua Aqua.

## Spec Authority

- Solo gameplay source of truth: [`docs/specs/aqua_aqua_mechanics_full_spec_v2.md`](./docs/specs/aqua_aqua_mechanics_full_spec_v2.md)
- Spec index: [`docs/specs/spec-index.md`](./docs/specs/spec-index.md)

## Current Codebase Direction

- Solo refactor is in progress toward v2 parity.
- Versus remains stable until a dedicated PvP spec update.
- Core simulation remains deterministic in `packages/core`.

## Project Structure

- [apps/client](/C:/Study/aquawetrix/apps/client)
- [apps/server](/C:/Study/aquawetrix/apps/server)
- [packages/core](/C:/Study/aquawetrix/packages/core)
- [docs/specs/aqua_aqua_mechanics_full_spec_v2.md](/C:/Study/aquawetrix/docs/specs/aqua_aqua_mechanics_full_spec_v2.md)

## Run

```bash
npm install
npm run dev
```

## Validation

```bash
npm run lint
npm test
npm run build
```
