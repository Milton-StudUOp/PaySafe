/**
 * Complete script to generate all app icons from PaySafe source.
 * Run: node scripts/generate-all-icons.js
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const publicDir = path.join(__dirname, '..', 'public');

// Use PAYSAFE.png (high resolution square) for icons
const iconSource = path.join(publicDir, 'PAYSAFE.png');

// Icon sizes for PWA
const iconSizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
    console.log('🎨 Generating PaySafe icons...\n');

    // Check if source exists
    if (!fs.existsSync(iconSource)) {
        console.error('❌ Source image not found:', iconSource);
        process.exit(1);
    }

    try {
        // Get source image info
        const metadata = await sharp(iconSource).metadata();
        console.log(`📷 Source: ${metadata.width}x${metadata.height} ${metadata.format}\n`);

        // Generate each icon size
        console.log('📦 Generating PWA icons:');
        for (const size of iconSizes) {
            const outputPath = path.join(publicDir, `icon-${size}x${size}.png`);

            await sharp(iconSource)
                .resize(size, size, {
                    fit: 'contain',
                    background: { r: 255, g: 255, b: 255, alpha: 0 }
                })
                .png()
                .toFile(outputPath);

            console.log(`   ✅ icon-${size}x${size}.png`);
        }

        // Generate apple-touch-icon (180x180)
        console.log('\n🍎 Generating Apple icons:');
        const applePath = path.join(publicDir, 'apple-touch-icon.png');
        await sharp(iconSource)
            .resize(180, 180, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
            .png()
            .toFile(applePath);
        console.log('   ✅ apple-touch-icon.png (180x180)');

        // Generate OG image (1200x630) with logo centered on emerald background
        console.log('\n🖼️  Generating OG image:');
        const ogPath = path.join(publicDir, 'og-image.png');
        const logoHeight = 400;
        const resizedLogo = await sharp(iconSource)
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
        console.log('   ✅ og-image.png (1200x630)');

        // Generate favicon.ico (use png-to-ico if available, otherwise just copy 32x32)
        console.log('\n🔖 Generating favicon:');
        try {
            const pngToIco = require('png-to-ico');
            const icon32 = path.join(publicDir, 'icon-32x32.png');
            const buf = await pngToIco(icon32);
            fs.writeFileSync(path.join(publicDir, 'favicon.ico'), buf);
            console.log('   ✅ favicon.ico (ICO format)');
        } catch (e) {
            // Fallback: copy 32x32 as favicon
            fs.copyFileSync(
                path.join(publicDir, 'icon-32x32.png'),
                path.join(publicDir, 'favicon.ico')
            );
            console.log('   ✅ favicon.ico (PNG fallback)');
        }

        console.log('\n✨ All icons generated successfully!');
        console.log(`📁 Output: ${publicDir}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

generateIcons();
