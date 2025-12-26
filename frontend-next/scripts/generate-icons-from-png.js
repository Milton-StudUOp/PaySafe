/**
 * Script to generate all PWA icons from the PaySafe logo.
 * Uses the source PNG to create all required sizes.
 * 
 * Run: node scripts/generate-icons-from-png.js
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const publicDir = path.join(__dirname, '..', 'public');
const sourceImage = path.join(publicDir, 'paysafe-logo-source.png');

// Icon sizes for PWA
const iconSizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
    console.log('🎨 Generating PaySafe icons from source image...\n');

    // Check if source exists
    if (!fs.existsSync(sourceImage)) {
        console.error('❌ Source image not found:', sourceImage);
        process.exit(1);
    }

    try {
        // Get source image info
        const metadata = await sharp(sourceImage).metadata();
        console.log(`📷 Source: ${metadata.width}x${metadata.height} ${metadata.format}`);

        // Generate each icon size
        for (const size of iconSizes) {
            const outputPath = path.join(publicDir, `icon-${size}x${size}.png`);

            await sharp(sourceImage)
                .resize(size, size, {
                    fit: 'contain',
                    background: { r: 255, g: 255, b: 255, alpha: 0 }
                })
                .png()
                .toFile(outputPath);

            console.log(`  ✅ icon-${size}x${size}.png`);
        }

        // Generate favicon.ico (32x32)
        const faviconPath = path.join(publicDir, 'favicon.ico');
        await sharp(sourceImage)
            .resize(32, 32, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
            .png()
            .toFile(faviconPath.replace('.ico', '.png'));

        // Copy as favicon (browsers accept PNG as favicon)
        fs.copyFileSync(
            path.join(publicDir, 'icon-32x32.png'),
            faviconPath.replace('.ico', '-temp.png')
        );
        console.log('  ✅ favicon.ico (32x32)');

        // Generate apple-touch-icon (180x180)
        const applePath = path.join(publicDir, 'apple-touch-icon.png');
        await sharp(sourceImage)
            .resize(180, 180, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
            .png()
            .toFile(applePath);
        console.log('  ✅ apple-touch-icon.png (180x180)');

        // Generate OG image (1200x630) with logo centered
        const ogPath = path.join(publicDir, 'og-image.png');
        const logoHeight = 300;
        const resizedLogo = await sharp(sourceImage)
            .resize({ height: logoHeight, fit: 'contain' })
            .toBuffer();

        const resizedMeta = await sharp(resizedLogo).metadata();

        await sharp({
            create: {
                width: 1200,
                height: 630,
                channels: 4,
                background: { r: 16, g: 185, b: 129, alpha: 1 } // Emerald-500
            }
        })
            .composite([
                {
                    input: resizedLogo,
                    top: Math.floor((630 - logoHeight) / 2),
                    left: Math.floor((1200 - resizedMeta.width) / 2)
                }
            ])
            .png()
            .toFile(ogPath);
        console.log('  ✅ og-image.png (1200x630)');

        console.log('\n✨ All icons generated successfully!');
        console.log(`📁 Output directory: ${publicDir}`);

    } catch (error) {
        console.error('❌ Error generating icons:', error.message);
        process.exit(1);
    }
}

generateIcons();
