import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://agentidentityprotocol.dev",
  output: "static",
  trailingSlash: "ignore",
  build: {
    format: "directory",
  },
  markdown: {
    shikiConfig: {
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
      wrap: false,
    },
  },
  integrations: [
    sitemap({
      filter: (page) =>
        !page.endsWith(".md") &&
        !page.endsWith(".txt") &&
        !page.endsWith(".json") &&
        !page.endsWith("/404/") &&
        !page.endsWith("/404.html") &&
        page !== "https://agentidentityprotocol.dev/spec/",
    }),
  ],
});
