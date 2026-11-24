import type { APIRoute } from "astro";
import {
  CURRENT_SPEC,
  NPM_PACKAGE,
  NPM_URL,
  PROTOCOL_ID,
  SCHEMAS,
  SITE_NAME,
  SITE_URL,
  SPEC_REPO,
  SPEC_REPO_URL,
} from "../site.config";

export const GET: APIRoute = () => {
  const schemaLines = SCHEMAS.map(
    (schema) => `- [${schema.file}](${SITE_URL}${schema.path}): ${schema.description}`,
  ).join("\n");

  const body = `# ${SITE_NAME} (${PROTOCOL_ID})

> Open Apache-2.0 specification for brokered agent signup. Maintained by Agent Registrar, the reference broker. Canonical source in \`${SPEC_REPO}\`. Current release: ${CURRENT_SPEC.tag} (wire ${CURRENT_SPEC.wireVersion}).

## Pages

- [Overview](${SITE_URL}/): Protocol overview, five-step signup flow, minimal discovery example, and schema index.
- [Normative Specification (${CURRENT_SPEC.minor})](${SITE_URL}${CURRENT_SPEC.specPath}): Normative definition of \`/.well-known/agent-signup.json\`, brokered signup handshake, receipts, and attestation contracts.
- [Scope Boundaries](${SITE_URL}/scope-boundaries/): Identity-versus-vendor scope boundaries and change review checklist.
- [Implementation Guide](${SITE_URL}/implement/): Relying party, agent, and broker implementation guide and public conformance registry.
- [Conformance Validator](${SITE_URL}/validate/): Conformance checklist and CLI validation reference for \`${NPM_PACKAGE}\`.
- [Releases](${SITE_URL}/releases/): Combined release notes for the specification, newest first.
- [FAQ](${SITE_URL}/faq/): Protocol scope, architecture comparison, stewardship, licensing, and contact details.

## Raw Markdown

- [Normative Specification (${CURRENT_SPEC.minor}.md)](${SITE_URL}/spec/${CURRENT_SPEC.minor}.md): Raw Markdown source of the normative specification.
- [Scope Boundaries (scope-boundaries.md)](${SITE_URL}/scope-boundaries.md): Raw Markdown source of the scope boundaries document.
- [Implementation Guide (implement.md)](${SITE_URL}/implement.md): Raw Markdown source of the implementation guide.
- [Conformance Validator (validate.md)](${SITE_URL}/validate.md): Raw Markdown source of the validator guide.
- [Releases (releases.md)](${SITE_URL}/releases.md): Raw Markdown source of the combined release notes.
- [Full Documentation Corpus (llms-full.txt)](${SITE_URL}/llms-full.txt): Concatenated plain-text Markdown corpus of the specification, guides, and FAQ.

## JSON Schemas

${schemaLines}

## Source & Tooling

- [Specification Repository](${SPEC_REPO_URL}): Canonical Markdown specification, JSON Schemas, fixtures, and implementation registry.
- [Discovery Validator (${NPM_PACKAGE})](${NPM_URL}): CLI and library for validating relying party discovery documents.
- [Agent Registrar](https://agentregistrar.dev): Reference broker and maintainer of the Agent Identity Protocol.
- [Agent Registrar Documentation](https://docs.agentregistrar.dev): Product documentation for the reference broker.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
};
