import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const SOURCE_IMAGE = '/Users/a/.gemini/antigravity/brain/003bad98-1469-4120-ab34-b984b201969c/.user_uploaded/media_1794694451192_82462e17.jpg';

function createIco(pngBuffers) {
  const count = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  let offset = headerSize + count * dirEntrySize;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // ICO type
  header.writeUInt16LE(count, 4); // count of images

  const entries = [];
  for (const item of pngBuffers) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(item.width >= 256 ? 0 : item.width, 0);
    entry.writeUInt8(item.height >= 256 ? 0 : item.height, 1);
    entry.writeUInt8(0, 2); // color palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(item.buffer.length, 8); // size
    entry.writeUInt32LE(offset, 12); // offset
    entries.push(entry);
    offset += item.buffer.length;
  }

  return Buffer.concat([header, ...entries, ...pngBuffers.map(p => p.buffer)]);
}

async function main() {
  console.log('Generating favicons and icons from:', SOURCE_IMAGE);

  // Generate PNG sizes
  const sizes = [16, 32, 48, 180, 192, 512];
  const pngs = {};

  for (const size of sizes) {
    pngs[size] = await sharp(SOURCE_IMAGE)
      .resize(size, size, { fit: 'cover' })
      .png({ compressionLevel: 9 })
      .toBuffer();
    console.log(`Generated ${size}x${size} PNG (${pngs[size].length} bytes)`);
  }

  // Multi-resolution ICO (16, 32, 48)
  const icoBuffer = createIco([
    { width: 16, height: 16, buffer: pngs[16] },
    { width: 32, height: 32, buffer: pngs[32] },
    { width: 48, height: 48, buffer: pngs[48] },
  ]);
  console.log(`Generated multi-resolution ICO (${icoBuffer.length} bytes)`);

  // Write files
  await fs.writeFile(path.join(process.cwd(), 'src/app/favicon.ico'), icoBuffer);
  await fs.writeFile(path.join(process.cwd(), 'public/favicon.ico'), icoBuffer);
  await fs.writeFile(path.join(process.cwd(), 'src/app/icon.png'), pngs[32]);
  await fs.writeFile(path.join(process.cwd(), 'src/app/apple-icon.png'), pngs[180]);
  await fs.writeFile(path.join(process.cwd(), 'public/icon.png'), pngs[32]);
  await fs.writeFile(path.join(process.cwd(), 'public/apple-touch-icon.png'), pngs[180]);
  await fs.writeFile(path.join(process.cwd(), 'public/icon-192.png'), pngs[192]);
  await fs.writeFile(path.join(process.cwd(), 'public/icon-512.png'), pngs[512]);

  console.log('All favicon and app icon files have been successfully written!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
