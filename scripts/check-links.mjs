#!/usr/bin/env node
/**
 * Post-build verification script for the Agent Identity Protocol static site.
 *
 * Verifies against `dist/`:
 *   1. All internal `<a href="...">` links resolve to an existing file in `dist/`
 *      (accounting for `_redirects` routes such as `/spec/` -> `/spec/v2.3/`).
 *   2. All `#fragment` anchors resolve to an `id` attribute in the target HTML file.
 *   3. Every HTML page (except `404.html` and redirect-only `spec/index.html`)
 *      declares an absolute self-referential `<link rel="canonical">`.
 *   4. Required machine surfaces, static assets, and all 8 JSON Schemas exist.
 *
 * Uses only Node.js built-ins. Exits with code 1 on any error, 0 otherwise.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, posix } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const DIST_DIR = join(ROOT, "dist");
const SITE_ORIGIN = "https://agentidentityprotocol.dev";

const REQUIRED_FILES = [
  "llms.txt",
  "llms-full.txt",
  "robots.txt",
  "sitemap-index.xml",
  "404.html",
  "_headers",
  "_redirects",
  "og.png",
  "schemas/abuse-report.schema.json",
  "schemas/agent-signup.schema.json",
  "schemas/attestation-source.schema.json",
  "schemas/attestation-status.schema.json",
  "schemas/broker-metadata.schema.json",
  "schemas/implementations.schema.json",
  "schemas/rp-attestation.schema.json",
  "schemas/signup-receipt.schema.json",
];

function decodeHtmlEntities(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function collectHtmlFiles(dir, prefix = "") {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectHtmlFiles(full, rel));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      results.push(rel);
    }
  }
  return results.sort();
}

function parseAttributes(attrText) {
  const attrs = new Map();
  if (!attrText) return attrs;
  const attrRegex = /\b([a-zA-Z_:][a-zA-Z0-9_.:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  for (const match of attrText.matchAll(attrRegex)) {
    const name = match[1].toLowerCase();
    const raw = match[2] ?? match[3] ?? match[4] ?? "";
    attrs.set(name, decodeHtmlEntities(raw));
  }
  return attrs;
}

function parseHtml(html) {
  const stripped = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");

  const ids = new Set();
  const links = [];
  const canonicals = [];

  const tagRegex = /<([a-zA-Z][a-zA-Z0-9:-]*)(\s+(?:[^>"']|"[^"]*"|'[^']*')*)?\s*\/?>/g;
  for (const match of stripped.matchAll(tagRegex)) {
    const tagName = match[1].toLowerCase();
    const attrs = parseAttributes(match[2]);

    const id = attrs.get("id");
    if (id) ids.add(id);

    if (tagName === "a" && attrs.has("href")) {
      links.push(attrs.get("href"));
    } else if (tagName === "link") {
      const rel = attrs.get("rel") ?? "";
      if (rel.toLowerCase().split(/\s+/).includes("canonical")) {
        canonicals.push(attrs.get("href") ?? "");
      }
    }
  }

  return { ids, links, canonicals };
}

function parseRedirects() {
  const redirectsPath = join(DIST_DIR, "_redirects");
  const redirects = new Map();
  if (!existsSync(redirectsPath)) return redirects;

  const lines = readFileSync(redirectsPath, "utf8").split("\n");
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 2) continue;
    const [source, target] = parts;
    if (source.startsWith("/") && target.startsWith("/")) {
      redirects.set(source, target);
    }
  }
  return redirects;
}

function routeForHtmlFile(relPath) {
  if (relPath === "index.html") return "/";
  if (relPath.endsWith("/index.html")) {
    return `/${relPath.slice(0, -"index.html".length)}`;
  }
  return `/${relPath}`;
}

function baseDirRouteForHtmlFile(relPath) {
  const dir = posix.dirname(relPath);
  return dir === "." ? "/" : `/${dir}/`;
}

function isFileInDist(relPath) {
  if (!relPath || relPath === "." || relPath.startsWith("..")) return false;
  const full = join(DIST_DIR, relPath);
  return existsSync(full) && statSync(full).isFile();
}

function resolveRouteInDist(pathname, redirects) {
  let current = posix.normalize(pathname.startsWith("/") ? pathname : `/${pathname}`);
  const visited = new Set();

  while (redirects.has(current) && !visited.has(current)) {
    visited.add(current);
    current = posix.normalize(redirects.get(current));
  }

  const trimmed = current.replace(/^\/+/, "");
  const candidates = current.endsWith("/")
    ? [trimmed ? posix.join(trimmed, "index.html") : "index.html"]
    : [trimmed, `${trimmed}.html`, posix.join(trimmed, "index.html")];

  for (const candidate of candidates) {
    if (isFileInDist(candidate)) {
      return candidate;
    }
  }
  return null;
}

function main() {
  if (!existsSync(DIST_DIR) || !statSync(DIST_DIR).isDirectory()) {
    console.error(`Link check failed: dist directory does not exist at ${DIST_DIR}`);
    process.exit(1);
  }

  const htmlFiles = collectHtmlFiles(DIST_DIR);
  const redirects = parseRedirects();
  const parsedPages = new Map();

  for (const relPath of htmlFiles) {
    const html = readFileSync(join(DIST_DIR, relPath), "utf8");
    parsedPages.set(relPath, parseHtml(html));
  }

  const errors = [];
  let internalLinksChecked = 0;
  let anchorChecks = 0;
  let canonicalChecks = 0;

  for (const relPath of htmlFiles) {
    const { links, canonicals } = parsedPages.get(relPath);
    const pageRoute = routeForHtmlFile(relPath);
    const baseDir = baseDirRouteForHtmlFile(relPath);

    if (relPath !== "404.html" && relPath !== "404/index.html" && relPath !== "spec/index.html") {
      canonicalChecks += 1;
      const expectedCanonical = `${SITE_ORIGIN}${pageRoute}`;
      if (canonicals.length === 0) {
        errors.push(`${relPath}: missing <link rel="canonical" href="${expectedCanonical}">`);
      } else if (canonicals.length > 1) {
        errors.push(`${relPath}: multiple canonical links found (${canonicals.join(", ")})`);
      } else if (canonicals[0] !== expectedCanonical) {
        errors.push(
          `${relPath}: canonical href "${canonicals[0]}" does not match expected "${expectedCanonical}"`,
        );
      }
    }

    for (const rawHref of links) {
      const href = rawHref.trim();
      if (
        !href ||
        href.startsWith("//") ||
        /^[a-z][a-z0-9+.-]*:/i.test(href)
      ) {
        continue;
      }

      internalLinksChecked += 1;
      const hashIndex = href.indexOf("#");
      const beforeHash = hashIndex === -1 ? href : href.slice(0, hashIndex);
      const rawFragment = hashIndex === -1 ? "" : href.slice(hashIndex + 1);
      const pathPart = beforeHash.split("?")[0];

      let targetRelPath;
      if (!pathPart) {
        targetRelPath = relPath;
      } else {
        const targetRoute = pathPart.startsWith("/")
          ? pathPart
          : posix.resolve(baseDir, pathPart) + (pathPart.endsWith("/") ? "/" : "");
        targetRelPath = resolveRouteInDist(targetRoute, redirects);
        if (!targetRelPath) {
          errors.push(`${relPath}: broken internal link "${href}" (resolved route "${targetRoute}" not found in dist/)`);
          continue;
        }
      }

      if (rawFragment) {
        anchorChecks += 1;
        if (!targetRelPath.endsWith(".html")) {
          continue;
        }
        let decodedFragment;
        try {
          decodedFragment = decodeURIComponent(rawFragment);
        } catch {
          errors.push(`${relPath}: malformed URL fragment in "${href}"`);
          continue;
        }
        const targetData = parsedPages.get(targetRelPath);
        if (!targetData) {
          errors.push(`${relPath}: target HTML "${targetRelPath}" was not indexed for "${href}"`);
          continue;
        }
        if (!targetData.ids.has(decodedFragment) && !targetData.ids.has(rawFragment)) {
          errors.push(
            `${relPath}: missing anchor "#${decodedFragment}" in "${targetRelPath}" (from "${href}")`,
          );
        }
      }
    }
  }

  for (const required of REQUIRED_FILES) {
    if (!isFileInDist(required)) {
      errors.push(`dist/: missing required static output "${required}"`);
    }
  }

  console.log("Link check summary:");
  console.log(`  HTML pages checked:     ${htmlFiles.length}`);
  console.log(`  Internal links checked: ${internalLinksChecked}`);
  console.log(`  Anchor checks:          ${anchorChecks}`);
  console.log(`  Canonical checks:       ${canonicalChecks}`);
  console.log(`  Required outputs:       ${REQUIRED_FILES.length}`);
  console.log(`  Errors:                 ${errors.length}`);

  if (errors.length > 0) {
    console.error("\nErrors found:");
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }
}

main();
