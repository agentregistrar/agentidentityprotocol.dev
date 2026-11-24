import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const astroRequire = createRequire(require.resolve("astro"));
const sharp = astroRequire("sharp");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const outPath = path.join(rootDir, "public", "og.png");

const width = 1200;
const height = 630;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#fafaf9"/>
  <rect x="32" y="32" width="1136" height="566" fill="#fafaf9" stroke="#e4e4e7" stroke-width="2"/>
  <rect x="32" y="32" width="1136" height="6" fill="#1d4ed8"/>

  <text
    x="96"
    y="138"
    fill="#52525b"
    font-family="Liberation Mono, DejaVu Sans Mono, monospace"
    font-size="24"
    font-weight="400"
    letter-spacing="0.4"
  >agent-identity-protocol · Apache-2.0</text>

  <text
    x="96"
    y="296"
    fill="#18181b"
    font-family="Liberation Sans, DejaVu Sans, sans-serif"
    font-size="68"
    font-weight="700"
    letter-spacing="-1"
  >Agent Identity Protocol</text>

  <text
    x="96"
    y="366"
    fill="#52525b"
    font-family="Liberation Sans, DejaVu Sans, sans-serif"
    font-size="32"
    font-weight="400"
  >Open specification for brokered agent signup</text>

  <line x1="96" y1="486" x2="1104" y2="486" stroke="#e4e4e7" stroke-width="1.5"/>

  <text
    x="96"
    y="538"
    fill="#52525b"
    font-family="Liberation Mono, DejaVu Sans Mono, monospace"
    font-size="24"
    font-weight="400"
  >agentidentityprotocol.dev</text>
</svg>`;

await sharp(Buffer.from(svg))
  .png({ compressionLevel: 9 })
  .toFile(outPath);

const meta = await sharp(outPath).metadata();
console.log(`Generated ${outPath} (${meta.width}x${meta.height}, ${meta.format})`);
