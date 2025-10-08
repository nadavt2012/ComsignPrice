import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceImage = process.argv[2] || 'attached_assets/stock_images/modern_calculator_ap_c4be3ec5.jpg';

async function generateIcons() {
  console.log('🚀 Starting icon generation...');
  console.log('📸 Source image:', sourceImage);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Read the source image
  const imageBuffer = fs.readFileSync(path.resolve(sourceImage));
  const base64Image = imageBuffer.toString('base64');
  const imageType = sourceImage.endsWith('.png') ? 'png' : 'jpeg';

  // Generate 192x192 icon
  await page.setViewport({ width: 192, height: 192 });
  await page.setContent(`
    <html>
      <body style="margin: 0; padding: 0; background: white;">
        <canvas id="canvas" width="192" height="192"></canvas>
        <script>
          const canvas = document.getElementById('canvas');
          const ctx = canvas.getContext('2d');
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0, 192, 192);
          };
          img.src = 'data:image/${imageType};base64,${base64Image}';
        </script>
      </body>
    </html>
  `);

  await page.waitForTimeout(500);
  const icon192 = await page.screenshot({ 
    type: 'png',
    clip: { x: 0, y: 0, width: 192, height: 192 }
  });
  fs.writeFileSync('client/public/icon-192.png', icon192);
  console.log('✅ Generated icon-192.png');

  // Generate 512x512 icon
  await page.setViewport({ width: 512, height: 512 });
  await page.setContent(`
    <html>
      <body style="margin: 0; padding: 0; background: white;">
        <canvas id="canvas" width="512" height="512"></canvas>
        <script>
          const canvas = document.getElementById('canvas');
          const ctx = canvas.getContext('2d');
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0, 512, 512);
          };
          img.src = 'data:image/${imageType};base64,${base64Image}';
        </script>
      </body>
    </html>
  `);

  await page.waitForTimeout(500);
  const icon512 = await page.screenshot({ 
    type: 'png',
    clip: { x: 0, y: 0, width: 512, height: 512 }
  });
  fs.writeFileSync('client/public/icon-512.png', icon512);
  console.log('✅ Generated icon-512.png');

  await browser.close();
  console.log('🎉 Icons generated successfully!');
}

generateIcons().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
