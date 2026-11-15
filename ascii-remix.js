// Pure rendering only: callers resample the source image before passing RGBA.
export const DEFAULT_REMIX = Object.freeze({
  width: 120, brightness: 0, contrast: 1, saturation: 1, stretch: 1,
  invert: false, edges: 0, palette: 'color', ramp: '@%#*+=-:. ', background: '#f8fafc',
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function normalizeRemix(settings = {}) {
  const input = settings && typeof settings === 'object' && !Array.isArray(settings) ? settings : {};
  const options = { ...DEFAULT_REMIX };
  const ranges = { width: [40, 240], brightness: [-100, 100], contrast: [.3, 2.5], saturation: [0, 2], stretch: [.5, 2], edges: [0, 100] };
  for (const [key, [min, max]] of Object.entries(ranges)) {
    const raw = input[key];
    const value = typeof raw === 'number' || (typeof raw === 'string' && raw.trim() !== '') ? Number(raw) : NaN;
    if (Number.isFinite(value)) options[key] = clamp(value, min, max);
  }
  options.width = Math.round(options.width);
  if (typeof input.invert === 'boolean') options.invert = input.invert;
  if (['color', 'mono', 'matrix', 'amber'].includes(input.palette)) options.palette = input.palette;
  if (typeof input.ramp === 'string') {
    const ramp = input.ramp.replace(/[^\x20-\x7e]|[<>&"']/g, '').slice(0, 40);
    if (new Set(ramp).size >= 2) options.ramp = ramp;
  }
  if (typeof input.background === 'string' && /^#[\da-f]{6}$/i.test(input.background)) options.background = input.background;
  return options;
}

export const REMIX_PRESETS = Object.freeze({
  original: Object.freeze(normalizeRemix()),
  matrix: Object.freeze(normalizeRemix({ palette: 'matrix', background: '#050b08', invert: true })),
  amber: Object.freeze(normalizeRemix({ palette: 'amber', background: '#110c04', invert: true })),
  detail: Object.freeze(normalizeRemix({ width: 180, contrast: 1.25 })),
  outline: Object.freeze(normalizeRemix({ edges: 70, palette: 'mono', background: '#f8fafc' })),
});

const luminance = (red, green, blue) => .2126 * red + .7152 * green + .0722 * blue;
const rgb = channels => `rgb(${channels.map(Math.round).join(',')})`;
const escapeGlyph = glyph => glyph.replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

// Replicated borders avoid artificial outlines around an otherwise flat image.
function sobelMagnitude(values, width, height, x, y) {
  const sample = (dx, dy) => values[clamp(y + dy, 0, height - 1) * width + clamp(x + dx, 0, width - 1)];
  const topLeft = sample(-1, -1), top = sample(0, -1), topRight = sample(1, -1);
  const left = sample(-1, 0), right = sample(1, 0);
  const bottomLeft = sample(-1, 1), bottom = sample(0, 1), bottomRight = sample(1, 1);
  const gx = -topLeft + topRight - 2 * left + 2 * right - bottomLeft + bottomRight;
  const gy = -topLeft - 2 * top - topRight + bottomLeft + 2 * bottom + bottomRight;
  return Math.min(255, Math.hypot(gx, gy) / 4);
}

export function remixPixels(pixels, width, height, settings = {}) {
  const length = width * height * 4;
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 ||
      !Number.isSafeInteger(length) || !(Array.isArray(pixels) || ArrayBuffer.isView(pixels)) || pixels.length !== length) {
    throw new TypeError('Invalid RGBA data or dimensions.');
  }
  for (let i = 0; i < length; i++) {
    if (!Number.isFinite(pixels[i]) || pixels[i] < 0 || pixels[i] > 255) throw new TypeError('Invalid RGBA channel.');
  }
  const options = normalizeRemix(settings);
  const tones = new Float64Array(width * height);
  const colors = [];
  const ink = { mono: 'rgb(15,23,42)', matrix: 'rgb(74,222,128)', amber: 'rgb(251,191,36)' };
  for (let cell = 0; cell < tones.length; cell++) {
    const i = cell * 4;
    const alpha = pixels[i + 3] / 255;
    const channels = [0, 1, 2].map(channel => {
      const composited = pixels[i + channel] * alpha + 255 * (1 - alpha);
      return clamp((composited - 128) * options.contrast + 128 + options.brightness * 255 / 100, 0, 255);
    });
    const gray = luminance(...channels);
    if (options.saturation !== 1) {
      for (let channel = 0; channel < 3; channel++) {
        channels[channel] = clamp(gray + (channels[channel] - gray) * options.saturation, 0, 255);
      }
    }
    tones[cell] = luminance(...channels);
    colors.push(options.palette === 'color' ? rgb(channels) : ink[options.palette]);
  }

  const lines = [], htmlLines = [];
  const edgeWeight = options.edges / 100;
  for (let y = 0; y < height; y++) {
    let line = '', htmlLine = '';
    for (let x = 0; x < width; x++) {
      const cell = y * width + x;
      let value = tones[cell];
      if (edgeWeight > 0) {
        // Dense glyphs mark strong edges; flat areas become whitespace.
        const outline = 255 - sobelMagnitude(tones, width, height, x, y);
        value = value * (1 - edgeWeight) + outline * edgeWeight;
      }
      if (options.invert) value = 255 - value;
      const glyph = options.ramp[Math.round(clamp(value, 0, 255) / 255 * (options.ramp.length - 1))];
      line += glyph;
      htmlLine += `<span style="color:${colors[cell]}">${escapeGlyph(glyph)}</span>`;
    }
    lines.push(line);
    htmlLines.push(htmlLine);
  }
  return { text: lines.join('\n'), html: htmlLines.join('\n'), colors, columns: width, rows: height, background: options.background };
}
