const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const svgPath = path.join(__dirname, '..', 'icons', 'icon.svg');
const outputDir = path.join(__dirname, '..', 'icons');

async function generateIcons() {
    console.log('Generating PWA icons...');
    
    // Read SVG file
    const svgBuffer = fs.readFileSync(svgPath);
    
    for (const size of sizes) {
        const outputPath = path.join(outputDir, `icon-${size}.png`);
        
        await sharp(svgBuffer)
            .resize(size, size)
            .png()
            .toFile(outputPath);
        
        console.log(`Generated: icon-${size}.png`);
    }
    
    // Generate screenshot for PWA (wide format)
    await sharp(svgBuffer)
        .resize(1280, 720, {
            fit: 'contain',
            background: { r: 10, g: 10, b: 15, alpha: 1 }
        })
        .png()
        .toFile(path.join(outputDir, 'screenshot-wide.png'));
    
    console.log('Generated: screenshot-wide.png');
    console.log('All icons generated successfully!');
}

generateIcons().catch(console.error);

