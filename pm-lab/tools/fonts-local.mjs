// One-off: vendor the Nothing fonts locally so the site renders identically offline
// and behind networks where fonts.gstatic.com is slow.
// Run: node tools/fonts-local.mjs /tmp/gf.css
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const css = fs.readFileSync(process.argv[2] || "/tmp/gf.css", "utf8");
const fontDir = path.join(root, "assets", "fonts");
fs.mkdirSync(fontDir, { recursive: true });

const keep = /^@font-face\s*\{[^}]*\}/gm;
const wanted = [];
for (const block of css.match(keep) || []) {
  const family = /font-family:\s*'([^']+)'/.exec(block)?.[1];
  const url = /url\((https:[^)]+\.woff2)\)/.exec(block)?.[1];
  const weight = /font-weight:\s*([^;]+);/.exec(block)?.[1]?.trim();
  const rangeRaw = /unicode-range:\s*([^;]+);/.exec(block)?.[1]?.trim();
  const comment = css.slice(0, css.indexOf(block)).match(/\/\*\s*([a-z-]+)\s*\*\//g);
  if (!family || !url) continue;
  wanted.push({ family, url, weight, rangeRaw, block, subset: comment ? comment[comment.length - 1].replace(/[/*\s]/g, "").replace("subset", "") : "sub" + wanted.length });
}

// subset name = the /* comment */ immediately preceding each @font-face
let ordered = [];
{
  const parts = css.split(/(?=\/\*\s*[a-z-]+\s*\*\/)/);
  for (const p of parts) {
    const m = /\/\*\s*([a-z-]+)\s*\*\//.exec(p);
    const face = /@font-face\s*\{[^}]*\}/.exec(p);
    if (m && face && /font-family/.test(face[0])) ordered.push({ subset: m[1], block: face[0] });
  }
}

const out = [];
const seen = new Set();
for (const { subset, block } of ordered) {
  if (!["latin", "latin-ext"].includes(subset)) continue;
  const family = /font-family:\s*'([^']+)'/.exec(block)[1];
  const url = /url\((https:[^)]+\.woff2)\)/.exec(block)?.[1];
  const weight = /font-weight:\s*([^;]+);/.exec(block)[1].trim();
  const range = /unicode-range:\s*([^;]+);/.exec(block)[1].trim();
  if (!url) continue;
  const slug = family.toLowerCase().replace(/\s+/g, "-");
  const file = `${slug}-${weight.replace(/\s+/g, "-")}-${subset}.woff2`;
  const dest = path.join(fontDir, file);
  if (!seen.has(file)) {
    seen.add(file);
    if (!fs.existsSync(dest)) {
      try {
        execFileSync("curl", ["-sSLf", "-m", "40", "-o", dest, url], { stdio: "inherit" });
      } catch (e) {
        console.error("FAIL", url, e.message);
        continue;
      }
    }
  }
  out.push(
    `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};font-display:swap;src:url('${file}') format('woff2');unicode-range:${range};}`
  );
}
fs.writeFileSync(path.join(fontDir, "fonts.css"), out.join("\n") + "\n");
console.log(`wrote ${out.length} faces, ${seen.size} files`);
