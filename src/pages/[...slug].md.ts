import fs from "node:fs";
import path from "node:path";
import type { APIRoute, GetStaticPaths } from "astro";

type MarkdownRouteProps = {
  filePath: string;
};

const GENERATED_SLUGS = [
  "scope-boundaries",
  "implement",
  "validate",
  "releases",
] as const;

function stripFrontmatter(raw: string): string {
  return raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n+/, "");
}

export const getStaticPaths: GetStaticPaths = () => {
  const root = process.cwd();
  const specDir = path.resolve(root, "src/content/spec");
  const generatedDir = path.resolve(root, "src/content/generated");

  const specFiles = fs
    .readdirSync(specDir)
    .filter((entry) => entry.endsWith(".md"))
    .sort();

  const specPaths = specFiles.map((file) => {
    const minor = file.slice(0, -".md".length);
    return {
      params: { slug: `spec/${minor}` },
      props: { filePath: path.join(specDir, file) } satisfies MarkdownRouteProps,
    };
  });

  const generatedPaths = GENERATED_SLUGS.map((slug) => ({
    params: { slug },
    props: {
      filePath: path.join(generatedDir, `${slug}.md`),
    } satisfies MarkdownRouteProps,
  }));

  return [...specPaths, ...generatedPaths];
};

export const GET: APIRoute<MarkdownRouteProps> = ({ props }) => {
  const raw = fs.readFileSync(props.filePath, "utf8");
  const body = stripFrontmatter(raw);

  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
};
