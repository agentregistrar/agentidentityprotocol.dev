#!/usr/bin/env node
/**
 * Sync a pinned `agentregistrar/spec` release into the Agent Identity Protocol site.
 *
 * Usage:
 *   pnpm sync:spec --tag v2.3.0
 *   pnpm sync:spec --local /home/al/spec --tag v2.3.0
 *   node scripts/sync-spec.mjs --help
 *
 * Allowed transforms on Markdown (and nothing else):
 *   1. Prepend minimal YAML frontmatter.
 *   2. Rewrite relative spec-repo links outside fenced code blocks to site
 *      routes, `/schemas/<file>`, or immutable GitHub blob/tree URLs at the
 *      resolved commit SHA.
 *   3. For `releases.md`, combine all `release-notes-v*.md` files newest-first
 *      and demote headings by one level outside fenced code blocks.
 *
 * Schemas and `registry/implementations.json` are copied byte-identically.
 * Older frozen minor specs in `src/content/spec/` are left untouched.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, posix, resolve } from "node:path";
import { gunzipSync } from "node:zlib";

const ROOT = new URL("..", import.meta.url).pathname;
const LOCK_PATH = join(ROOT, "spec.lock.json");
const REDIRECTS_PATH = join(ROOT, "public/_redirects");
const SPEC_REPO = "agentregistrar/spec";
const SPEC_ORIGIN = `https://github.com/${SPEC_REPO}`;
const API_ROOT = `https://api.github.com/repos/${SPEC_REPO}`;
const USER_AGENT = "agentidentityprotocol-sync";

const TAG_PATTERN = /^v(\d+)\.(\d+)\.\d+$/;
const RELEASE_NOTES_PATTERN = /^release-notes-(v[^/]+)\.md$/;

const MARKDOWN_PAGES = [
  {
    source: "agent-identity-protocol.md",
    outputForMinor: (minor) => `src/content/spec/${minor}.md`,
    title: "Agent Identity Protocol specification",
    description:
      "Normative specification for the Agent Identity Protocol (agent-identity-protocol): discovery document, brokered signup handshake, receipts, and attestation contracts.",
  },
  {
    source: "scope-boundaries.md",
    outputForMinor: () => "src/content/generated/scope-boundaries.md",
    title: "Scope boundaries",
    description:
      "Identity vs vendor scope boundaries and review checklist for the Agent Identity Protocol (agent-identity-protocol).",
  },
  {
    source: "implementing-agent-identity-protocol.md",
    outputForMinor: () => "src/content/generated/implement.md",
    title: "Implementation guide",
    description:
      "Relying-party implementation guide for the Agent Identity Protocol (agent-identity-protocol): discovery, assertion verification, receipts, and conformance.",
  },
  {
    source: "validator.md",
    outputForMinor: () => "src/content/generated/validate.md",
    title: "Conformance validator",
    description:
      "Install and run @agentregistrar/discovery to validate Agent Identity Protocol (agent-identity-protocol) discovery documents and attestations.",
  },
];

const RELEASES_PAGE = {
  sourcePath: "release-notes",
  output: "src/content/generated/releases.md",
  title: "Release history",
  description:
    "Release notes and changelog for the Agent Identity Protocol (agent-identity-protocol), newest first.",
};

const KNOWN_FILES = new Set(["LICENSE", "README.md", "package.json"]);

function usage() {
  console.log(`Sync a tagged agentregistrar/spec release into the site content tree.

Usage:
  pnpm sync:spec --tag <vX.Y.Z>
  pnpm sync:spec --local <dir> --tag <vX.Y.Z>

Options:
  --tag <tag>     Release tag to sync (must match v<major>.<minor>.<patch>)
  --local <dir>   Read from a local checkout of agentregistrar/spec (offline)
  -h, --help      Show this help message`);
}

function parseArgs(argv) {
  const options = {
    help: false,
    tag: null,
    local: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--") continue;
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--tag") {
      const value = argv[i + 1];
      if (!value || value.startsWith("-")) {
        throw new Error("--tag requires a value, for example --tag v2.3.0");
      }
      options.tag = value;
      i += 1;
    } else if (arg === "--local") {
      const value = argv[i + 1];
      if (!value || value.startsWith("-")) {
        throw new Error("--local requires a directory path, for example --local /home/al/spec");
      }
      options.local = resolve(value);
      i += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function parseTag(tag) {
  if (!tag) {
    throw new Error("Missing --tag <vX.Y.Z> (for example --tag v2.3.0)");
  }
  const match = tag.match(TAG_PATTERN);
  if (!match) {
    throw new Error(`Invalid --tag "${tag}": expected v<major>.<minor>.<patch> (e.g. v2.3.0)`);
  }
  return {
    tag,
    minor: `v${match[1]}.${match[2]}`,
  };
}

async function getJson(url) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": USER_AGENT,
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`GitHub API ${response.status} for ${url}`);
  }
  return response.json();
}

/**
 * Resolve a tag to its peeled commit SHA via the GitHub API.
 */
async function resolveTagCommit(tag) {
  const ref = await getJson(`${API_ROOT}/git/ref/tags/${encodeURIComponent(tag)}`);
  let object = ref.object;
  if (!object?.type) throw new Error(`Tag ${tag} has no object type`);
  if (object.type === "tag") {
    const annotated = await getJson(`${API_ROOT}/git/tags/${object.sha}`);
    object = annotated.object;
  }
  if (object?.type !== "commit" || !/^[0-9a-f]{40}$/i.test(object.sha)) {
    throw new Error(`Tag ${tag} does not resolve to a commit`);
  }
  return object.sha;
}

async function fetchTagTarball(tag) {
  const url = `https://codeload.github.com/${SPEC_REPO}/tar.gz/refs/tags/${encodeURIComponent(tag)}`;
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!response.ok) {
    throw new Error(`Tarball download failed: ${response.status} for ${url}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

function readString(buffer, offset, length) {
  const slice = buffer.subarray(offset, offset + length);
  const end = slice.indexOf(0);
  return slice.subarray(0, end === -1 ? slice.length : end).toString("utf8");
}

function parsePax(data) {
  const entries = {};
  let offset = 0;
  while (offset < data.length) {
    const space = data.indexOf(0x20, offset);
    if (space === -1) break;
    const length = Number.parseInt(data.subarray(offset, space).toString(), 10);
    if (!Number.isFinite(length) || length <= 0) break;
    const record = data.subarray(space + 1, offset + length - 1).toString("utf8");
    const equals = record.indexOf("=");
    if (equals !== -1) {
      entries[record.slice(0, equals)] = record.slice(equals + 1);
    }
    offset += length;
  }
  return entries;
}

/**
 * Minimal ustar/pax/gnu-longname reader for GitHub release tarballs.
 * Strips the leading archive root directory so keys are repo-relative paths.
 */
function extractTarGz(buffer) {
  const tar = gunzipSync(buffer);
  const rawFiles = new Map();
  let offset = 0;
  let pendingName = null;
  let pendingPax = null;

  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;

    const name = readString(header, 0, 100);
    const prefix = readString(header, 345, 155);
    const size = Number.parseInt(readString(header, 124, 12).trim() || "0", 8);
    const type = String.fromCharCode(header[156] || 48);
    const dataStart = offset + 512;
    const data = tar.subarray(dataStart, dataStart + size);
    const nextOffset = dataStart + Math.ceil(size / 512) * 512;

    if (type === "x" || type === "X") {
      pendingPax = parsePax(data);
    } else if (type === "g") {
      // Global pax header: no per-entry path.
    } else if (type === "L") {
      pendingName = readString(data, 0, data.length).replace(/\0+$/, "");
    } else if (type === "0" || type === "\0") {
      const paxPath = pendingPax?.path;
      const resolvedName = paxPath || pendingName || (prefix ? `${prefix}/${name}` : name);
      rawFiles.set(resolvedName, Buffer.from(data));
      pendingName = null;
      pendingPax = null;
    } else {
      pendingName = null;
      pendingPax = null;
    }

    offset = nextOffset;
  }

  const first = rawFiles.keys().next().value;
  if (!first) throw new Error("Tarball is empty");
  const rootPrefix = `${first.split("/")[0]}/`;
  const files = new Map();
  for (const [entryPath, bytes] of rawFiles.entries()) {
    const rel = entryPath.startsWith(rootPrefix) ? entryPath.slice(rootPrefix.length) : entryPath;
    if (rel) files.set(rel, bytes);
  }
  return files;
}

function resolveLocalCommit(localDir, tag) {
  for (const ref of [`${tag}^{commit}`, "HEAD"]) {
    try {
      const sha = execFileSync("git", ["-C", localDir, "rev-parse", "--verify", ref], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
      if (/^[0-9a-f]{40}$/i.test(sha)) return sha;
    } catch {
      // Try next fallback.
    }
  }
  return "0".repeat(40);
}

function readLocalFiles(localDir) {
  if (!existsSync(localDir)) {
    throw new Error(`Local spec directory does not exist: ${localDir}`);
  }
  const files = new Map();

  for (const name of readdirSync(localDir)) {
    const full = join(localDir, name);
    if (!statSync(full).isFile()) continue;
    if (
      MARKDOWN_PAGES.some((page) => page.source === name) ||
      RELEASE_NOTES_PATTERN.test(name) ||
      name.endsWith(".schema.json") ||
      KNOWN_FILES.has(name)
    ) {
      files.set(name, readFileSync(full));
    }
  }

  for (const rel of ["registry/implementations.schema.json", "registry/implementations.json"]) {
    const full = join(localDir, rel);
    if (existsSync(full) && statSync(full).isFile()) {
      files.set(rel, readFileSync(full));
    }
  }

  return files;
}

/** Compare two version labels, newest first (semver descending). */
function compareVersionsDescending(a, b) {
  const parts = (value) =>
    value
      .replace(/^v/, "")
      .split(/[.-]/)
      .map((part) => (/^\d+$/.test(part) ? Number(part) : part));
  const left = parts(a);
  const right = parts(b);
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const x = left[i] ?? 0;
    const y = right[i] ?? 0;
    if (x === y) continue;
    if (typeof x === "number" && typeof y === "number") return y - x;
    return String(x) < String(y) ? 1 : -1;
  }
  return 0;
}

/**
 * Slugify a Markdown heading using the exact GitHub/Astro github-slugger rules:
 * strip inline code backticks, lowercase, strip punctuation except `_`, `-`, and
 * spaces, then replace each space with `-`.
 */
function slugifyHeading(text) {
  return text
    .replace(/`/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/ /g, "-");
}

function extractReleaseNoteSlugs(files, releaseNoteNames) {
  const slugs = new Map();
  for (const name of releaseNoteNames) {
    const text = files.get(name).toString("utf8");
    const match = text.match(/^#\s+(.+)$/m);
    if (!match) {
      throw new Error(`${name} has no top-level '# ' heading for anchor generation`);
    }
    slugs.set(name, slugifyHeading(match[1].trim()));
  }
  return slugs;
}

function extractWireVersion(files) {
  const specBytes = files.get("agent-identity-protocol.md");
  if (!specBytes) {
    throw new Error("Source is missing agent-identity-protocol.md");
  }
  const text = specBytes.toString("utf8");
  const match = text.match(/\*\*Protocol version:\*\*\s*`?([0-9]+\.[0-9]+(?:\.[0-9]+)?)`?/);
  if (!match) {
    throw new Error("Could not extract Protocol version from agent-identity-protocol.md");
  }
  return match[1];
}

function extractReleaseDate(files, tag) {
  const filename = `release-notes-${tag}.md`;
  const bytes = files.get(filename);
  if (!bytes) {
    throw new Error(`Source is missing ${filename}`);
  }
  const text = bytes.toString("utf8");
  const match =
    text.match(/\*\*Release date:\*\*\s*(\d{4}-\d{2}-\d{2})/) ||
    text.match(/\*\*Date:\*\*\s*(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  console.warn(`warning: no release date found in ${filename}; using today's UTC date`);
  return new Date().toISOString().slice(0, 10);
}

function isRepoDirectory(cleanPath, pathPart, ctx) {
  if (pathPart.endsWith("/")) return true;
  if (ctx.files.has(cleanPath)) return false;
  for (const key of ctx.files.keys()) {
    if (key.startsWith(`${cleanPath}/`)) return true;
  }
  if (ctx.localDir) {
    const full = join(ctx.localDir, cleanPath);
    if (existsSync(full)) return statSync(full).isDirectory();
  }
  if (KNOWN_FILES.has(cleanPath)) return false;
  return !posix.basename(cleanPath).includes(".");
}

function rewriteDestination(destination, sourcePath, ctx) {
  if (
    !destination ||
    destination.startsWith("#") ||
    destination.startsWith("/") ||
    destination.startsWith("//") ||
    /^[a-z][a-z0-9+.-]*:/i.test(destination)
  ) {
    return destination;
  }

  const hashIndex = destination.indexOf("#");
  const pathPart = hashIndex === -1 ? destination : destination.slice(0, hashIndex);
  const anchor = hashIndex === -1 ? "" : destination.slice(hashIndex + 1);
  if (!pathPart) return destination;

  const resolved = posix.normalize(posix.join(posix.dirname(sourcePath), pathPart));
  const clean = resolved.replace(/^\.\//, "");

  const fixedRoutes = {
    "agent-identity-protocol.md": `/spec/${ctx.minor}/`,
    "scope-boundaries.md": "/scope-boundaries/",
    "implementing-agent-identity-protocol.md": "/implement/",
    "validator.md": "/validate/",
  };

  if (clean in fixedRoutes) {
    return `${fixedRoutes[clean]}${anchor ? `#${anchor}` : ""}`;
  }

  if (RELEASE_NOTES_PATTERN.test(clean)) {
    const slug = ctx.releaseNoteSlugs.get(clean);
    const fragment = anchor || slug || "";
    return `/releases/${fragment ? `#${fragment}` : ""}`;
  }

  if (clean.endsWith(".schema.json")) {
    return `/schemas/${posix.basename(clean)}${anchor ? `#${anchor}` : ""}`;
  }

  const kind = isRepoDirectory(clean, pathPart, ctx) ? "tree" : "blob";
  return `${SPEC_ORIGIN}/${kind}/${ctx.commit}/${clean}${anchor ? `#${anchor}` : ""}`;
}

function updateFenceState(line, fence) {
  const match = line.match(/^\s*(`{3,}|~{3,})(.*)$/);
  if (!match) return { toggled: false, fence };
  const marker = match[1];
  const rest = match[2];
  if (!fence) {
    if (marker[0] === "`" && rest.includes("`")) return { toggled: false, fence };
    return { toggled: true, fence: { char: marker[0], len: marker.length } };
  }
  if (marker[0] === fence.char && marker.length >= fence.len && /^\s*$/.test(rest)) {
    return { toggled: true, fence: null };
  }
  return { toggled: false, fence };
}

function transformLinks(text, sourcePath, ctx) {
  const lines = text.split("\n");
  const output = [];
  let fence = null;

  for (const line of lines) {
    const state = updateFenceState(line, fence);
    fence = state.fence;
    if (state.toggled || fence) {
      output.push(line);
      continue;
    }
    output.push(
      line.replace(
        /\]\(([^)\s]+)([^)]*)\)/g,
        (_match, destination, suffix) =>
          `](${rewriteDestination(destination, sourcePath, ctx)}${suffix})`,
      ),
    );
  }

  return output.join("\n");
}

function demoteHeadings(text) {
  const lines = text.split("\n");
  const output = [];
  let fence = null;

  for (const line of lines) {
    const state = updateFenceState(line, fence);
    fence = state.fence;
    if (!state.toggled && !fence) {
      const heading = line.match(/^(#{1,5})(\s+)(.*)$/);
      if (heading) {
        output.push(`${heading[1]}#${heading[2]}${heading[3]}`);
        continue;
      }
    }
    output.push(line);
  }

  return output.join("\n");
}

function buildFrontmatter({ title, description, specTag, wireVersion, releaseDate, commit, sourcePath }) {
  return [
    "---",
    `title: ${JSON.stringify(title)}`,
    `description: ${JSON.stringify(description)}`,
    `specTag: ${JSON.stringify(specTag)}`,
    `wireVersion: ${JSON.stringify(wireVersion)}`,
    `releaseDate: ${JSON.stringify(releaseDate)}`,
    `commit: ${JSON.stringify(commit)}`,
    `sourcePath: ${JSON.stringify(sourcePath)}`,
    "---",
    "",
    "",
  ].join("\n");
}

function updateRedirects(minor) {
  const desired = [`/spec /spec/${minor}/ 302`, `/spec/ /spec/${minor}/ 302`];
  const preserved = existsSync(REDIRECTS_PATH)
    ? readFileSync(REDIRECTS_PATH, "utf8")
        .split("\n")
        .filter((line) => line.trim() !== "" && !/^\s*\/spec\/?\s+/.test(line))
    : [];
  const next = [...desired, ...preserved].join("\n") + "\n";
  mkdirSync(dirname(REDIRECTS_PATH), { recursive: true });
  writeFileSync(REDIRECTS_PATH, next);
}

function writeBuffer(relPath, content) {
  const full = join(ROOT, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    usage();
    return;
  }

  const { tag, minor } = parseTag(options.tag);

  let commit;
  let files;
  if (options.local) {
    console.log(`Reading ${SPEC_REPO} from local ${options.local} (${tag}) ...`);
    commit = resolveLocalCommit(options.local, tag);
    files = readLocalFiles(options.local);
  } else {
    console.log(`Fetching ${SPEC_REPO} at ${tag} ...`);
    const [resolvedCommit, tarball] = await Promise.all([
      resolveTagCommit(tag),
      fetchTagTarball(tag),
    ]);
    commit = resolvedCommit;
    files = extractTarGz(tarball);
  }

  const wireVersion = extractWireVersion(files);
  const releaseDate = extractReleaseDate(files, tag);

  const releaseNoteNames = [...files.keys()]
    .filter((name) => !name.includes("/") && RELEASE_NOTES_PATTERN.test(name))
    .sort((a, b) =>
      compareVersionsDescending(
        a.match(RELEASE_NOTES_PATTERN)[1],
        b.match(RELEASE_NOTES_PATTERN)[1],
      ),
    );

  if (releaseNoteNames.length === 0) {
    throw new Error("Source has no release-notes-v*.md files");
  }

  const releaseNoteSlugs = extractReleaseNoteSlugs(files, releaseNoteNames);
  const ctx = {
    minor,
    commit,
    files,
    localDir: options.local,
    releaseNoteSlugs,
  };

  const written = [];

  for (const page of MARKDOWN_PAGES) {
    const raw = files.get(page.source);
    if (!raw) {
      throw new Error(`Source is missing ${page.source}`);
    }
    const body = transformLinks(raw.toString("utf8"), page.source, ctx);
    const outPath = page.outputForMinor(minor);
    const content =
      buildFrontmatter({
        title: page.title,
        description: page.description,
        specTag: tag,
        wireVersion,
        releaseDate,
        commit,
        sourcePath: page.source,
      }) + body;
    writeBuffer(outPath, Buffer.from(content, "utf8"));
    written.push(outPath);
  }

  const releasesBody = releaseNoteNames
    .map((name) => {
      const rawText = files.get(name).toString("utf8");
      return demoteHeadings(transformLinks(rawText, name, ctx)).trimEnd();
    })
    .join("\n\n");
  const releasesContent =
    buildFrontmatter({
      title: RELEASES_PAGE.title,
      description: RELEASES_PAGE.description,
      specTag: tag,
      wireVersion,
      releaseDate,
      commit,
      sourcePath: RELEASES_PAGE.sourcePath,
    }) +
    releasesBody +
    "\n";
  writeBuffer(RELEASES_PAGE.output, Buffer.from(releasesContent, "utf8"));
  written.push(RELEASES_PAGE.output);

  const schemaEntries = [...files.entries()]
    .filter(
      ([rel]) =>
        (!rel.includes("/") && rel.endsWith(".schema.json")) ||
        rel === "registry/implementations.schema.json",
    )
    .sort(([a], [b]) => a.localeCompare(b));

  if (schemaEntries.length === 0) {
    throw new Error("Source has no *.schema.json files");
  }

  for (const [rel, rawBytes] of schemaEntries) {
    const outPath = `public/schemas/${posix.basename(rel)}`;
    writeBuffer(outPath, rawBytes);
    written.push(outPath);
  }

  const registryBytes = files.get("registry/implementations.json");
  if (!registryBytes) {
    throw new Error("Source is missing registry/implementations.json");
  }
  writeBuffer("src/data/registry.json", registryBytes);
  written.push("src/data/registry.json");

  updateRedirects(minor);
  written.push("public/_redirects");

  const lock = {
    tag,
    minor,
    wire_version: wireVersion,
    release_date: releaseDate,
    commit,
    synced_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
  };
  writeFileSync(LOCK_PATH, `${JSON.stringify(lock, null, 2)}\n`);
  written.push("spec.lock.json");

  console.log(`Synced ${tag} (${minor}, wire ${wireVersion}, ${releaseDate}) @ ${commit}`);
  for (const file of written) {
    console.log(`  ${file}`);
  }
}

main().catch((error) => {
  console.error(`spec sync failed: ${error.message}`);
  process.exit(1);
});
