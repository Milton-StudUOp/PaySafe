/**
 * Script to generate favicon.ico from PNG
 */
import pngToIco from 'png-to-ico';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, '..', 'public');
const sourcePng = path.join(publicDir, 'icon-32x32.png');
const outputIco = path.join(publicDir, 'favicon.ico');

async function generateFavicon() {
    console.log('🎨 Generating favicon.ico...');

    try {
        const buf = await pngToIco(sourcePng);
        fs.writeFileSync(outputIco, buf);
        console.log('✅ favicon.ico generated successfully!');

        const stats = fs.statSync(outputIco);
        console.log(`📁 Size: ${stats.size} bytes`);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

generateFavicon();
