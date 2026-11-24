# Agent Identity Protocol (`agent-identity-protocol`)

Static specification site for the Agent Identity Protocol (`agent-identity-protocol`), published at `https://agentidentityprotocol.dev`.

The canonical specification, JSON Schemas, and conformance registry live in [`agentregistrar/spec`](https://github.com/agentregistrar/spec). This repository renders pinned specification releases verbatim alongside a minimal overview and FAQ.

## Local development

Requires Node.js `>=22.12` and `pnpm@9.15.4`.

```bash
pnpm install
```

Sync specification content and schemas from a tagged release of `agentregistrar/spec` (or from a local checkout):

```bash
pnpm sync:spec --tag v2.3.0
pnpm sync:spec --local ~/spec --tag v2.3.0
```

Run type-checking and build the static site (postbuild runs `scripts/check-links.mjs`):

```bash
pnpm check
pnpm build
```

## Stewardship and license

Maintained by [Agent Registrar](https://agentregistrar.dev), the reference broker for the Agent Identity Protocol.

Licensed under the [Apache License, Version 2.0](./LICENSE).
