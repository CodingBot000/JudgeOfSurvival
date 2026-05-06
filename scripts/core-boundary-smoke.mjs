import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const coreDir = path.join(root, "src", "game-core");
const coreFiles = fs
  .readdirSync(coreDir)
  .filter((fileName) => fileName.endsWith(".js"))
  .map((fileName) => path.join(coreDir, fileName));

const bannedPatterns = [
  { label: "React import", pattern: /from\s+["']react["']/ },
  { label: "browser window", pattern: /\bwindow\b/ },
  { label: "browser document", pattern: /\bdocument\b/ },
  { label: "browser storage", pattern: /\blocalStorage\b|\bsessionStorage\b/ },
  { label: "JSX className", pattern: /\bclassName\b/ },
  { label: "translation table", pattern: /\bTRANSLATIONS\b/ },
  { label: "language content list", pattern: /\bLANGUAGE_CODES\b/ },
  { label: "CSS import", pattern: /import\s+["'][^"']+\.css["']/ },
];

for (const filePath of coreFiles) {
  const source = fs.readFileSync(filePath, "utf8");
  for (const { label, pattern } of bannedPatterns) {
    assert.equal(
      pattern.test(source),
      false,
      `${path.relative(root, filePath)} must not contain ${label}`,
    );
  }
}

const appSource = fs.readFileSync(path.join(root, "src", "App.jsx"), "utf8");
assert.match(appSource, /from\s+"\.\/game-core\/rules\.js"/);
assert.match(appSource, /from\s+"\.\/game-adapters\/display\.js"/);

console.log("Core boundary smoke test passed.");
