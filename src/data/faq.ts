import { CURRENT_SPEC, PROTOCOL_ID, SPEC_REPO, SPEC_REPO_URL } from "../site.config";

export interface FaqItem {
  id: string;
  question: string;
  html: string;
  markdown: string;
}

const SPEC_PATH = CURRENT_SPEC.specPath;

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "what-is-the-agent-identity-protocol",
    question: `What is the Agent Identity Protocol (${PROTOCOL_ID})?`,
    html: `<p>The Agent Identity Protocol (<code>${PROTOCOL_ID}</code>) is an open, Apache-2.0 specification for brokered agent signup. A relying party publishes a discovery document describing its signup endpoint, accepted brokers, and terms of service, and an agent presents a short-lived signed assertion proving human delegation and terms acceptance. See <a href="${SPEC_PATH}#1-status-version-changelog--normative-language">§1 Status and version</a> and <a href="${SPEC_PATH}#3-roles--end-to-end-flow">§3 Roles and end-to-end flow</a> of the normative specification.</p>`,
    markdown: `The Agent Identity Protocol (\`${PROTOCOL_ID}\`) is an open, Apache-2.0 specification for brokered agent signup. A relying party publishes a discovery document describing its signup endpoint, accepted brokers, and terms of service, and an agent presents a short-lived signed assertion proving human delegation and terms acceptance. See [§1 Status and version](${SPEC_PATH}#1-status-version-changelog--normative-language) and [§3 Roles and end-to-end flow](${SPEC_PATH}#3-roles--end-to-end-flow) of the normative specification.`,
  },
  {
    id: "what-is-agent-signup-json",
    question: "What is /.well-known/agent-signup.json?",
    html: `<p>It is the identity-only discovery document served over HTTPS at <code>/.well-known/agent-signup.json</code> on a relying party's canonical origin. It declares the protocol version, audience identifier, <code>issuer_allowlist</code>, required scopes, terms URL and version, signup endpoint, and optional relying party attestation carrier. Product catalogs, pricing tiers, and resource provisioning APIs are excluded under <a href="${SPEC_PATH}#2-scope--non-goals">§2 Scope and non-goals</a> and the <a href="/scope-boundaries/">scope boundaries</a> guide; see <a href="${SPEC_PATH}#4-discovery-endpoint--transport">§4</a> and <a href="${SPEC_PATH}#5-discovery-document-reference-identity-only">§5</a> for transport and schema rules.</p>`,
    markdown: `It is the identity-only discovery document served over HTTPS at \`/.well-known/agent-signup.json\` on a relying party's canonical origin. It declares the protocol version, audience identifier, \`issuer_allowlist\`, required scopes, terms URL and version, signup endpoint, and optional relying party attestation carrier. Product catalogs, pricing tiers, and resource provisioning APIs are excluded under [§2 Scope and non-goals](${SPEC_PATH}#2-scope--non-goals) and the [scope boundaries](/scope-boundaries/) guide; see [§4](${SPEC_PATH}#4-discovery-endpoint--transport) and [§5](${SPEC_PATH}#5-discovery-document-reference-identity-only) for transport and schema rules.`,
  },
  {
    id: "oauth-and-oidc",
    question: "How does it differ from OAuth 2.0 and OIDC?",
    html: `<p>OAuth 2.0 and OpenID Connect authenticate an existing user or delegate scoped access to an already-registered account through interactive browser redirects. The Agent Identity Protocol (<code>${PROTOCOL_ID}</code>) handles account creation and first-time terms acceptance for autonomous agents without browser sessions, using a cryptographic terms hash (<a href="${SPEC_PATH}#6-tos-binding">§6 ToS binding</a>) and a signed assertion sent directly to <code>agent_signup</code> (<a href="${SPEC_PATH}#7-assertion-agent_signup-and-agent_login-handshakes">§7 Handshakes</a>). Once an account exists, the provider can issue API keys, OAuth credentials, or an optional Day-2 <code>agent_login</code> flow.</p>`,
    markdown: `OAuth 2.0 and OpenID Connect authenticate an existing user or delegate scoped access to an already-registered account through interactive browser redirects. The Agent Identity Protocol (\`${PROTOCOL_ID}\`) handles account creation and first-time terms acceptance for autonomous agents without browser sessions, using a cryptographic terms hash ([§6 ToS binding](${SPEC_PATH}#6-tos-binding)) and a signed assertion sent directly to \`agent_signup\` ([§7 Handshakes](${SPEC_PATH}#7-assertion-agent_signup-and-agent_login-handshakes)). Once an account exists, the provider can issue API keys, OAuth credentials, or an optional Day-2 \`agent_login\` flow.`,
  },
  {
    id: "mcp-and-a2a",
    question: "How does it differ from MCP and A2A agent cards?",
    html: `<p>Model Context Protocol (MCP) defines how an agent invokes tools and resources, and Agent-to-Agent (A2A) agent cards describe agent capabilities and task endpoints. Neither defines a discovery and signup contract for opening an account at a third-party service provider with verifiable human delegation and terms acceptance. This specification complements those layers by handling account establishment and returning an optional post-signup <code>context</code> pointer (<a href="${SPEC_PATH}#11-contract-e-identity-facts--the-context-pointer">§11</a>) that directs the agent to the vendor's API or MCP documentation.</p>`,
    markdown: `Model Context Protocol (MCP) defines how an agent invokes tools and resources, and Agent-to-Agent (A2A) agent cards describe agent capabilities and task endpoints. Neither defines a discovery and signup contract for opening an account at a third-party service provider with verifiable human delegation and terms acceptance. This specification complements those layers by handling account establishment and returning an optional post-signup \`context\` pointer ([§11](${SPEC_PATH}#11-contract-e-identity-facts--the-context-pointer)) that directs the agent to the vendor's API or MCP documentation.`,
  },
  {
    id: "enterprise-workload-identity",
    question: "How does it differ from enterprise workload identity and agent IAM?",
    html: `<p>Enterprise workload identity and agent IAM systems authenticate services and bots inside an organization's own trust domain. The Agent Identity Protocol (<code>${PROTOCOL_ID}</code>) operates across independent trust boundaries when an external user's agent discovers a third-party provider, proves delegation, accepts terms, and creates an account. It relies on public issuer JWKS and optional relying party attestations (<a href="${SPEC_PATH}#14-contract-g--rp-attestation">§14</a>, <a href="${SPEC_PATH}#17-trust-model-assurance-levels-and-policy">§17</a>) rather than shared internal directories.</p>`,
    markdown: `Enterprise workload identity and agent IAM systems authenticate services and bots inside an organization's own trust domain. The Agent Identity Protocol (\`${PROTOCOL_ID}\`) operates across independent trust boundaries when an external user's agent discovers a third-party provider, proves delegation, accepts terms, and creates an account. It relies on public issuer JWKS and optional relying party attestations ([§14](${SPEC_PATH}#14-contract-g--rp-attestation), [§17](${SPEC_PATH}#17-trust-model-assurance-levels-and-policy)) rather than shared internal directories.`,
  },
  {
    id: "need-agent-registrar",
    question: "Does a provider need Agent Registrar to implement it?",
    html: `<p>No. The specification and its JSON Schemas are Apache-2.0 licensed, assertion verification uses standard Ed25519 JWKS (<a href="${SPEC_PATH}#19-verification-rules">§19 Verification rules</a>), and any compliant broker can be listed in <code>issuer_allowlist</code>. A provider can publish <code>/.well-known/agent-signup.json</code>, verify assertions locally, and check conformance with the open-source <a href="/validate/">validator</a> without an Agent Registrar account; see the <a href="/implement/">implementation guide</a> for minimal server integration.</p>`,
    markdown: `No. The specification and its JSON Schemas are Apache-2.0 licensed, assertion verification uses standard Ed25519 JWKS ([§19 Verification rules](${SPEC_PATH}#19-verification-rules)), and any compliant broker can be listed in \`issuer_allowlist\`. A provider can publish \`/.well-known/agent-signup.json\`, verify assertions locally, and check conformance with the open-source [validator](/validate/) without an Agent Registrar account; see the [implementation guide](/implement/) for minimal server integration.`,
  },
  {
    id: "broker-request-path-and-credentials",
    question: "Does the broker sit in the request path or hold provider credentials?",
    html: `<p>No. During signup, the broker fetches the terms document, mints a short-lived signed assertion, and optionally records a signed signup receipt (<a href="${SPEC_PATH}#11-contract-e-identity-facts--the-context-pointer">§11</a>). The agent submits the assertion directly to the provider's <code>agent_signup</code> endpoint, receives account credentials directly from the provider, and communicates directly with the provider on all subsequent requests without proxying traffic or storing provider credentials at the broker.</p>`,
    markdown: `No. During signup, the broker fetches the terms document, mints a short-lived signed assertion, and optionally records a signed signup receipt ([§11](${SPEC_PATH}#11-contract-e-identity-facts--the-context-pointer)). The agent submits the assertion directly to the provider's \`agent_signup\` endpoint, receives account credentials directly from the provider, and communicates directly with the provider on all subsequent requests without proxying traffic or storing provider credentials at the broker.`,
  },
  {
    id: "verified-and-kyc",
    question: 'What does "verified" mean? Is it KYC?',
    html: `<p>The protocol does not define or mandate Know Your Customer (KYC) identity checks. For relying parties, "verified" refers to an explicit verification event against a broker-signed attestation at either <code>domain</code> level (automated origin control) or <code>entity</code> level (operator-reviewed legal entity evidence), evaluated under local <code>no_verify</code>, <code>verify</code>, or <code>strict</code> policy (<a href="${SPEC_PATH}#17-trust-model-assurance-levels-and-policy">§17 Trust model</a>). Neither level guarantees safety, uptime, or runtime conduct, and runtime abuse enforcement remains outside protocol scope (<a href="${SPEC_PATH}#22-non-goals-explicitly-excluded">§2.2 Non-goals</a>).</p>`,
    markdown: `The protocol does not define or mandate Know Your Customer (KYC) identity checks. For relying parties, "verified" refers to an explicit verification event against a broker-signed attestation at either \`domain\` level (automated origin control) or \`entity\` level (operator-reviewed legal entity evidence), evaluated under local \`no_verify\`, \`verify\`, or \`strict\` policy ([§17 Trust model](${SPEC_PATH}#17-trust-model-assurance-levels-and-policy)). Neither level guarantees safety, uptime, or runtime conduct, and runtime abuse enforcement remains outside protocol scope ([§2.2 Non-goals](${SPEC_PATH}#22-non-goals-explicitly-excluded)).`,
  },
  {
    id: "similar-project-names",
    question: "Is this the same as other projects with similar names?",
    html: `<p>No. Other unrelated projects use similar names for different scopes such as runtime policy enforcement, firewalling, or agent-to-agent authorization. This specification is uniquely identified on the wire by <code>${PROTOCOL_ID}</code> and covers only relying party discovery, brokered agent signup, terms binding, and signed identity receipts (<a href="${SPEC_PATH}#2-scope--non-goals">§2 Scope and non-goals</a>).</p>`,
    markdown: `No. Other unrelated projects use similar names for different scopes such as runtime policy enforcement, firewalling, or agent-to-agent authorization. This specification is uniquely identified on the wire by \`${PROTOCOL_ID}\` and covers only relying party discovery, brokered agent signup, terms binding, and signed identity receipts ([§2 Scope and non-goals](${SPEC_PATH}#2-scope--non-goals)).`,
  },
  {
    id: "maintainer-license-and-contact",
    question: "Maintainer, license, and contact",
    html: `<p>Maintained by Agent Registrar, the reference broker for the Agent Identity Protocol (<a href="https://agentregistrar.dev">agentregistrar.dev</a>, documentation at <a href="https://docs.agentregistrar.dev">docs.agentregistrar.dev</a>). Both the specification and this site are licensed under the Apache-2.0 License, with issues and pull requests handled publicly in the <a href="${SPEC_REPO_URL}">${SPEC_REPO}</a> repository. This site sets no cookies and runs no behavioral tracking; security issues can be reported to <a href="mailto:security@agentregistrar.dev">security@agentregistrar.dev</a>.</p>`,
    markdown: `Maintained by Agent Registrar, the reference broker for the Agent Identity Protocol ([agentregistrar.dev](https://agentregistrar.dev), documentation at [docs.agentregistrar.dev](https://docs.agentregistrar.dev)). Both the specification and this site are licensed under the Apache-2.0 License, with issues and pull requests handled publicly in the [${SPEC_REPO}](${SPEC_REPO_URL}) repository. This site sets no cookies and runs no behavioral tracking; security issues can be reported to [security@agentregistrar.dev](mailto:security@agentregistrar.dev).`,
  },
];

export function renderFaqMarkdown(): string {
  const sections = FAQ_ITEMS.map((item) => `## ${item.question}\n\n${item.markdown}`);
  return `# Frequently Asked Questions\n\n${sections.join("\n\n")}\n`;
}
