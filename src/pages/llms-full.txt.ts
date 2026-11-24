import fs from "node:fs";
import path from "node:path";
import type { APIRoute } from "astro";
import { renderFaqMarkdown } from "../data/faq";
import { CURRENT_SPEC, PROTOCOL_ID, SITE_NAME, SITE_URL } from "../site.config";

function readStrippedMarkdown(relativePath: string): string {
  const fullPath = path.resolve(process.cwd(), relativePath);
  const raw = fs.readFileSync(fullPath, "utf8");
  return raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n+/, "").trim();
}

export const GET: APIRoute = () => {
  const sections: ReadonlyArray<{ title: string; url: string; content: string }> = [
    {
      title: "Normative Specification",
      url: `${SITE_URL}/spec/${CURRENT_SPEC.minor}/`,
      content: readStrippedMarkdown(`src/content/spec/${CURRENT_SPEC.minor}.md`),
    },
    {
      title: "Scope Boundaries",
      url: `${SITE_URL}/scope-boundaries/`,
      content: readStrippedMarkdown("src/content/generated/scope-boundaries.md"),
    },
    {
      title: "Implementation Guide",
      url: `${SITE_URL}/implement/`,
      content: readStrippedMarkdown("src/content/generated/implement.md"),
    },
    {
      title: "Conformance Validator",
      url: `${SITE_URL}/validate/`,
      content: readStrippedMarkdown("src/content/generated/validate.md"),
    },
    {
      title: "Frequently Asked Questions",
      url: `${SITE_URL}/faq/`,
      content: renderFaqMarkdown().trim(),
    },
  ];

  const header = [
    `# ${SITE_NAME} (${PROTOCOL_ID}) — Full Documentation Corpus`,
    "",
    `- Release: ${CURRENT_SPEC.tag}`,
    `- Wire version: ${CURRENT_SPEC.wireVersion}`,
    `- Canonical URL: ${SITE_URL}/`,
  ].join("\n");

  const formattedSections = sections
    .map(
      (section, index) =>
        `---\n\n<!-- Section ${index + 1}: ${section.title} | Source: ${section.url} -->\n\n${section.content}`,
    )
    .join("\n\n");

  const body = `${header}\n\n${formattedSections}\n`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
};
