// Script to generate favicons and icons from SVG
// Run with: node scripts/generate-icons.js

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '../public');
const svgPath = path.join(publicDir, 'icon.svg');

// Icon sizes needed for PWA and various devices
const sizes = [16, 32, 72, 96, 128, 144, 152, 180, 192, 384, 512];

async function generateIcons() {
    console.log('🎨 Generating icons from SVG...\n');

    // Read SVG content
    const svgContent = fs.readFileSync(svgPath);

    for (const size of sizes) {
        const outputName = size === 180
            ? 'apple-touch-icon.png'
            : `icon-${size}x${size}.png`;

        const outputPath = path.join(publicDir, outputName);

        await sharp(svgContent)
            .resize(size, size)
            .png()
            .toFile(outputPath);

        console.log(`✅ Generated: ${outputName}`);
    }

    // Generate favicon.ico (multi-size ICO file)
    // For simplicity, we'll just create a 32x32 PNG as favicon
    const faviconPath = path.join(publicDir, 'favicon.ico');
    await sharp(svgContent)
        .resize(32, 32)
        .png()
        .toFile(faviconPath.replace('.ico', '.png'));

    // Rename to .ico (browsers accept PNG with .ico extension for favicons in most cases)
    fs.renameSync(
        faviconPath.replace('.ico', '.png'),
        faviconPath
    );
    console.log(`✅ Generated: favicon.ico`);

    // Generate OG image (1200x630 for social media)
    const ogImagePath = path.join(publicDir, 'og-image.png');
    await sharp(svgContent)
        .resize(630, 630, { fit: 'contain', background: { r: 16, g: 185, b: 129, alpha: 1 } })
        .extend({
            left: 285,
            right: 285,
            background: { r: 16, g: 185, b: 129, alpha: 1 }
        })
        .toFile(ogImagePath);
    console.log(`✅ Generated: og-image.png`);

    console.log('\n🎉 All icons generated successfully!');
}

generateIcons().catch(console.error);
