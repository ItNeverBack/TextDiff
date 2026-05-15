#!/usr/bin/env node
/**
 * 生成多尺寸图标脚本
 * 用于 Linux 桌面环境显示
 */

import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectRoot = join(__dirname, '..');
const sourceIcon = join(projectRoot, 'build', 'icon.png');
const iconsDir = join(projectRoot, 'build', 'icons');

// Linux 需要的图标尺寸
const sizes = [16, 24, 32, 48, 64, 96, 128, 256, 512];

async function generateIcons() {
  // 确保 icons 目录存在
  if (!existsSync(iconsDir)) {
    mkdirSync(iconsDir, { recursive: true });
    console.log('Created directory:', iconsDir);
  }

  console.log('Generating icons from:', sourceIcon);
  console.log('Output directory:', iconsDir);
  console.log('');

  for (const size of sizes) {
    const outputFile = join(iconsDir, `${size}x${size}.png`);
    try {
      await sharp(sourceIcon)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(outputFile);
      console.log(`✓ Generated ${size}x${size}.png`);
    } catch (err) {
      console.error(`✗ Failed to generate ${size}x${size}.png:`, err.message);
      process.exit(1);
    }
  }

  console.log('');
  console.log('All icons generated successfully!');
  console.log('');
  console.log('Next step: Build the Linux package with:');
  console.log('  npm run dist');
}

generateIcons().catch(console.error);
