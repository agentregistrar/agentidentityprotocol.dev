import specLock from "../spec.lock.json";

export const SITE_URL = "https://agentidentityprotocol.dev";
export const SITE_NAME = "Agent Identity Protocol";
export const PROTOCOL_ID = "agent-identity-protocol";
export const SPEC_REPO = "agentregistrar/spec";
export const SPEC_REPO_URL = "https://github.com/agentregistrar/spec";
export const NPM_PACKAGE = "@agentregistrar/discovery";
export const NPM_URL = "https://www.npmjs.com/package/@agentregistrar/discovery";

export const CURRENT_SPEC = {
  tag: specLock.tag,
  minor: specLock.minor,
  wireVersion: specLock.wire_version,
  releaseDate: specLock.release_date,
  commit: specLock.commit,
  specPath: `/spec/${specLock.minor}/`,
} as const;

export interface SchemaEntry {
  readonly file: string;
  readonly path: string;
  readonly description: string;
}

export const SCHEMAS: readonly SchemaEntry[] = [
  {
    file: "agent-signup.schema.json",
    path: "/schemas/agent-signup.schema.json",
    description: "Relying party discovery document served at /.well-known/agent-signup.json.",
  },
  {
    file: "broker-metadata.schema.json",
    path: "/schemas/broker-metadata.schema.json",
    description: "Broker metadata document served at /.well-known/agent-broker.json.",
  },
  {
    file: "rp-attestation.schema.json",
    path: "/schemas/rp-attestation.schema.json",
    description: "Broker-signed relying party attestation JWS claims (agent-rp-attestation+jwt).",
  },
  {
    file: "attestation-source.schema.json",
    path: "/schemas/attestation-source.schema.json",
    description: "Attestation source wrapper document served at the discovery attestation URI.",
  },
  {
    file: "attestation-status.schema.json",
    path: "/schemas/attestation-status.schema.json",
    description: "Signed attestation status JWS claims returned by attestation_status_uri.",
  },
  {
    file: "signup-receipt.schema.json",
    path: "/schemas/signup-receipt.schema.json",
    description: "Relying-party-signed signup receipt JWS claims (agent-signup-receipt+jwt).",
  },
  {
    file: "abuse-report.schema.json",
    path: "/schemas/abuse-report.schema.json",
    description: "Authenticated relying party abuse report JWS claims (agent-rp-abuse+jwt).",
  },
  {
    file: "implementations.schema.json",
    path: "/schemas/implementations.schema.json",
    description: "Schema for the public implementation conformance registry (implementations.json).",
  },
] as const;

export interface NavItem {
  readonly label: string;
  readonly href: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { label: "Spec", href: "/spec/" },
  { label: "Implement", href: "/implement/" },
  { label: "Validate", href: "/validate/" },
  { label: "Releases", href: "/releases/" },
  { label: "FAQ", href: "/faq/" },
] as const;
