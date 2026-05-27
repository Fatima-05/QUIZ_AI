import fs from 'node:fs';
import { PNG } from 'pngjs';
import jpeg from 'jpeg-js';

export function decode(file) {
  const buf = fs.readFileSync(file);
  if (buf[0] === 0x89 && buf[1] === 0x50) {
    const png = PNG.sync.read(buf);
    return { data: new Uint8ClampedArray(png.data), width: png.width, height: png.height };
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    const jp = jpeg.decode(buf, { formatAsRGBA: true, useTArray: true });
    return { data: new Uint8ClampedArray(jp.data), width: jp.width, height: jp.height };
  }
  throw new Error('Unsupported image format (PNG or JPG only).');
}
