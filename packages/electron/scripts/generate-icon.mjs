import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const svgPath = join(__dirname, '..', 'resources', 'icon.svg');
const pngPath = join(__dirname, '..', 'resources', 'icon.png');

const svgBuffer = readFileSync(svgPath);

await sharp(svgBuffer)
  .resize(1024, 1024)
  .png()
  .toFile(pngPath);

console.log('Icon generated:', pngPath);
