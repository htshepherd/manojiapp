// scripts/generate-icons.mjs
import sharp from "sharp";
import { readFileSync, mkdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = resolve(__dirname, "../src/app/icon.svg");
const outDir = resolve(__dirname, "../public");

if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

const svgBuffer = readFileSync(svgPath);

const sizes = [192, 512];

for (const size of sizes) {
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(resolve(outDir, `icon-${size}.png`));
  console.log(`✅ icon-${size}.png 生成完成`);
}
