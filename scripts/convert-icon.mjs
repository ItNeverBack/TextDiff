import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const svgPath = path.join(rootDir, 'build', 'icon.svg');
const pngPath = path.join(rootDir, 'build', 'icon.png');

// 读取 SVG 文件
const svgBuffer = fs.readFileSync(svgPath);

// 转换为 PNG (512x512)
sharp(svgBuffer)
  .resize(512, 512)
  .png()
  .toFile(pngPath)
  .then(() => {
    console.log('✅ Successfully converted icon.svg to icon.png (512x512)');
  })
  .catch((err) => {
    console.error('❌ Failed to convert icon:', err);
    process.exit(1);
  });
