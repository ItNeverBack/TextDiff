const { default: pngToIco, imagesToIco } = require('png-to-ico');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function generateIcons() {
  const buildDir = path.join(__dirname, '..', 'build');
  const inputPng = path.join(buildDir, 'icon.png');
  const outputIco = path.join(buildDir, 'icon.ico');

  console.log('Generating Windows ICO file...');
  console.log(`Input: ${inputPng}`);
  console.log(`Output: ${outputIco}`);

  try {
    // 生成多尺寸 PNG 用于 ICO
    const sizes = [16, 24, 32, 48, 64, 128, 256];
    const pngBuffers = [];

    for (const size of sizes) {
      const buffer = await sharp(inputPng)
        .resize(size, size, { fit: 'contain', background: { r: 37, g: 99, b: 235, alpha: 1 } })
        .png()
        .toBuffer();
      pngBuffers.push(buffer);
      console.log(`  Generated ${size}x${size}`);
    }

    // 使用 png-to-ico 生成 ICO 文件
    // 注意：png-to-ico 接受文件路径数组
    const tempDir = path.join(__dirname, '..', 'temp_icons');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // 保存临时 PNG 文件
    const tempFiles = [];
    for (let i = 0; i < sizes.length; i++) {
      const tempFile = path.join(tempDir, `icon_${sizes[i]}.png`);
      fs.writeFileSync(tempFile, pngBuffers[i]);
      tempFiles.push(tempFile);
    }

    // 生成 ICO (使用 pngToIco 函数)
    const icoBuffer = await pngToIco(tempFiles);
    fs.writeFileSync(outputIco, icoBuffer);

    // 清理临时文件
    for (const file of tempFiles) {
      fs.unlinkSync(file);
    }
    fs.rmdirSync(tempDir);

    console.log(`✓ Created ${outputIco}`);
    console.log('Icon generation complete!');
  } catch (error) {
    console.error('Error generating ICO:', error.message);
    process.exit(1);
  }
}

generateIcons();
