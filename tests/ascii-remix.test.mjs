import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

let source;
try {
  source = await fs.readFile(new URL('../ascii-remix.js', import.meta.url), 'utf8');
} catch {
  assert.fail('The pure ASCII remix engine must exist in ascii-remix.js');
}
const engine = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const { DEFAULT_REMIX, normalizeRemix, remixPixels } = engine;

const EXPECTED_DEFAULT = {
  width: 120, brightness: 0, contrast: 1, saturation: 1, stretch: 1,
  invert: false, edges: 0, palette: 'color', ramp: '@%#*+=-:. ', background: '#f8fafc',
};
const rgba = (...colors) => new Uint8ClampedArray(colors.flat());

test('normalization clamps numeric settings and ignores invalid or unknown values', () => {
  assert.deepEqual(normalizeRemix({
    width: 500, brightness: -500, contrast: 9, saturation: -2, stretch: 0,
    invert: true, edges: 110, palette: 'matrix', background: '#A0b1C2', extra: 'ignored',
  }), {
    ...EXPECTED_DEFAULT, width: 240, brightness: -100, contrast: 2.5,
    saturation: 0, stretch: .5, invert: true, edges: 100, palette: 'matrix', background: '#A0b1C2',
  });
  assert.deepEqual(normalizeRemix({
    width: 1, brightness: 900, contrast: -1, saturation: 3, stretch: 9, edges: -1,
  }), {
    ...EXPECTED_DEFAULT, width: 40, brightness: 100, contrast: .3,
    saturation: 2, stretch: 2,
  });
  assert.equal(normalizeRemix({ width: '121.8', brightness: '25' }).width, 122);
  assert.equal(normalizeRemix({ brightness: '25' }).brightness, 25);
  assert.deepEqual(normalizeRemix({
    width: NaN, brightness: Infinity, contrast: 'bad', saturation: null,
    stretch: '', invert: 'false', edges: false, palette: 'unknown', background: 'red',
  }), EXPECTED_DEFAULT);
  assert.deepEqual(normalizeRemix(null), EXPECTED_DEFAULT);
  assert.deepEqual(normalizeRemix([]), EXPECTED_DEFAULT);
});

test('background accepts exactly six hexadecimal digits and no trailing line terminators', () => {
  for (const background of ['#ffffff\n', '#ffffff\r', '#ffffff\r\n', '#ffffff\u2028', ' #ffffff', '#fff', '#ffffffff', '#gggggg', 'url(javascript:alert(1))']) {
    assert.equal(normalizeRemix({ background }).background, EXPECTED_DEFAULT.background);
  }
  assert.equal(normalizeRemix({ background: '#123AbC' }).background, '#123AbC');
});

test('invalid dimensions and malformed RGBA data fail before rendering', () => {
  const pixel = rgba([0, 0, 0, 255]);
  for (const [width, height] of [[0, 1], [1, 0], [-1, 1], [1.5, 1], [1, NaN], [Infinity, 1], ['1', 1], [Number.MAX_SAFE_INTEGER, 2]]) {
    assert.throws(() => remixPixels(pixel, width, height), /RGBA|dimension|wymiar|dane/i);
  }
  for (const invalid of [null, undefined, {}, '0000', [], [0, 0, 0], [0, 0, 0, 255, 0], [0, 0, NaN, 255], [-1, 0, 0, 255], [256, 0, 0, 255], ['0', 0, 0, 255], new Array(4), new DataView(new ArrayBuffer(4))]) {
    assert.throws(() => remixPixels(invalid, 1, 1), /RGBA|dimension|wymiar|dane/i);
  }
  assert.equal(remixPixels([0, 0, 0, 255], 1, 1).text, '@');
});

test('brightness and contrast alter both glyph mapping and RGB from the original input', () => {
  const pixels = rgba([100, 100, 100, 255], [180, 180, 180, 255]);
  const baseline = remixPixels(pixels, 2, 1);
  const bright = remixPixels(pixels, 2, 1, { brightness: 20 });
  const dark = remixPixels(pixels, 2, 1, { brightness: -20 });
  const contrast = remixPixels(pixels, 2, 1, { contrast: 2 });
  assert.deepEqual(bright.colors, ['rgb(151,151,151)', 'rgb(231,231,231)']);
  assert.deepEqual(dark.colors, ['rgb(49,49,49)', 'rgb(129,129,129)']);
  assert.deepEqual(contrast.colors, ['rgb(72,72,72)', 'rgb(232,232,232)']);
  assert.notEqual(bright.text, baseline.text);
  assert.notEqual(dark.text, baseline.text);
  assert.notEqual(contrast.text, baseline.text);
  assert.deepEqual(remixPixels(pixels, 2, 1), baseline, 'adjustments must never accumulate');
  assert.deepEqual(remixPixels(rgba([0, 0, 0, 0]), 1, 1, { brightness: -20 }).colors, ['rgb(204,204,204)'], 'alpha composites before adjustments');
});

test('saturation desaturates or intensifies adjusted colors without altering the source', () => {
  const pixels = rgba([200, 80, 20, 255]);
  const baseline = remixPixels(pixels, 1, 1);
  const gray = remixPixels(pixels, 1, 1, { saturation: 0 });
  assert.deepEqual(gray.colors, ['rgb(101,101,101)']);
  assert.equal(gray.text, baseline.text, 'desaturation retains perceptual luminance');
  assert.deepEqual(remixPixels(pixels, 1, 1, { saturation: 2 }).colors, ['rgb(255,59,0)']);
  assert.deepEqual(Array.from(pixels), [200, 80, 20, 255]);
});

test('invert reverses luminance mapping without inverting RGB colors', () => {
  const pixels = rgba([0, 0, 0, 255], [255, 255, 255, 255], [255, 0, 0, 255]);
  const baseline = remixPixels(pixels, 3, 1);
  const inverted = remixPixels(pixels, 3, 1, { invert: true });
  assert.equal(inverted.text, ' @:');
  assert.deepEqual(inverted.colors, baseline.colors);
  assert.notEqual(inverted.html, baseline.html);
});

test('palettes recolor every cell without changing the luminance-derived glyphs', () => {
  const pixels = rgba([200, 80, 20, 255], [0, 128, 255, 255]);
  const baseline = remixPixels(pixels, 2, 1);
  const outputs = ['mono', 'matrix', 'amber'].map(palette => remixPixels(pixels, 2, 1, { palette, background: '#010203' }));
  for (const result of outputs) {
    assert.equal(result.text, baseline.text);
    assert.notDeepEqual(result.colors, baseline.colors);
    assert.equal(result.colors[0], result.colors[1], 'non-color palettes use a consistent ink');
    assert.equal(result.background, '#010203');
    assert.match(result.html, /^<span style="color:rgb\(\d+,\d+,\d+\)">/);
  }
  const channels = result => result.colors[0].match(/\d+/g).map(Number);
  const [red, green, blue] = channels(outputs[1]);
  assert.ok(green > red && green > blue, 'matrix uses green ink');
  const [amberRed, amberGreen, amberBlue] = channels(outputs[2]);
  assert.ok(amberRed > amberGreen && amberGreen > amberBlue, 'amber uses warm ink');
  assert.equal(new Set(outputs.map(result => result.colors[0])).size, 3);
});

test('custom ramps contain only safe printable ASCII with a bounded usable alphabet', () => {
  const unsafe = '\u0000\n\t<>"\'&Ż😀@# ';
  assert.equal(normalizeRemix({ ramp: unsafe }).ramp, '@# ');
  for (const ramp of ['', '@@@', '      ', '<>"\'&\n😀', 'x'.repeat(40) + 'y', null]) {
    assert.equal(normalizeRemix({ ramp }).ramp, EXPECTED_DEFAULT.ramp);
  }
  const longRamp = '@#'.repeat(40);
  assert.equal(normalizeRemix({ ramp: longRamp }).ramp, longRamp.slice(0, 40));
  const printable = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('');
  assert.match(normalizeRemix({ ramp: printable }).ramp, /^[\x20-\x7e]{2,40}$/);
  const result = remixPixels(rgba([0, 0, 0, 255], [255, 255, 255, 255]), 2, 1, {
    ramp: '<&"\'@.>', background: '#ffffff; color:red',
  });
  assert.equal(result.text, '@.');
  assert.equal(result.background, EXPECTED_DEFAULT.background);
  assert.equal(result.html, '<span style="color:rgb(0,0,0)">@</span><span style="color:rgb(255,255,255)">.</span>');
  assert.doesNotMatch(result.html.replace(/<span style="color:rgb\(\d+,\d+,\d+\)">|<\/span>/g, ''), /[<>&"']/);
});

test('edge strength blends a real spatial outline, leaving flat regions blank at full strength', () => {
  const width = 5, height = 5;
  const vertical = rgba(...Array.from({ length: width * height }, (_, i) => {
    const value = i % width < 3 ? 0 : 255;
    return [value, value, value, 255];
  }));
  const baseline = remixPixels(vertical, width, height);
  const outlined = remixPixels(vertical, width, height, { edges: 100 });
  assert.equal(outlined.text, Array(height).fill('  @@ ').join('\n'));
  assert.notEqual(outlined.text, baseline.text);
  assert.deepEqual(outlined.colors, baseline.colors, 'edges only change the glyph mapping');
  const blended = remixPixels(vertical, width, height, { edges: 50 });
  assert.notEqual(blended.text, baseline.text);
  assert.notEqual(blended.text, outlined.text);
  const horizontal = rgba(...Array.from({ length: width * height }, (_, i) => {
    const value = Math.floor(i / width) < 3 ? 0 : 255;
    return [value, value, value, 255];
  }));
  assert.equal(remixPixels(horizontal, width, height, { edges: 100 }).text, ['     ', '     ', '@@@@@', '@@@@@', '     '].join('\n'));
  const flat = rgba(...Array.from({ length: width * height }, () => [128, 128, 128, 255]));
  assert.equal(remixPixels(flat, width, height, { edges: 100 }).text, Array(height).fill('     ').join('\n'));
  assert.equal(remixPixels(rgba([0, 0, 0, 255]), 1, 1, { edges: 100 }).text, ' ');
});

test('presets are complete normalized immutable settings that render distinct looks', () => {
  const { REMIX_PRESETS } = engine;
  assert.ok(REMIX_PRESETS, 'REMIX_PRESETS must be exported');
  assert.deepEqual(Object.keys(REMIX_PRESETS).sort(), ['amber', 'detail', 'matrix', 'original', 'outline']);
  assert.deepEqual(REMIX_PRESETS.original, EXPECTED_DEFAULT);
  const pixels = rgba(...Array.from({ length: 25 }, (_, i) => [i % 5 < 3 ? 20 : 220, Math.floor(i / 5) * 50, 80, 255]));
  const results = Object.values(REMIX_PRESETS).map(preset => {
    assert.deepEqual(Object.keys(preset).sort(), Object.keys(EXPECTED_DEFAULT).sort());
    assert.deepEqual(normalizeRemix(preset), preset);
    assert.ok(Object.isFrozen(preset));
    return remixPixels(pixels, 5, 5, preset);
  });
  assert.ok(Object.isFrozen(REMIX_PRESETS));
  assert.ok(Object.isFrozen(DEFAULT_REMIX));
  assert.equal(new Set(results.map(result => result.html)).size, 5);
  assert.equal(REMIX_PRESETS.detail.width, 180);
  assert.equal(REMIX_PRESETS.detail.contrast, 1.25);
  assert.equal(REMIX_PRESETS.outline.edges, 70);
  assert.equal(REMIX_PRESETS.outline.palette, 'mono');
  for (const key of ['matrix', 'amber']) {
    assert.equal(REMIX_PRESETS[key].palette, key);
    const background = REMIX_PRESETS[key].background.slice(1).match(/../g).map(hex => parseInt(hex, 16));
    assert.ok(Math.max(...background) < 40, `${key} needs a dark background`);
  }
  const settings = Object.freeze({ brightness: 15, ramp: '#. ', palette: 'amber' });
  const snapshot = JSON.stringify({ defaults: DEFAULT_REMIX, presets: REMIX_PRESETS, settings, pixels: Array.from(pixels) });
  const normalized = normalizeRemix(settings);
  normalized.width = 240;
  normalized.ramp = 'changed';
  remixPixels(pixels, 5, 5, settings);
  assert.equal(JSON.stringify({ defaults: DEFAULT_REMIX, presets: REMIX_PRESETS, settings, pixels: Array.from(pixels) }), snapshot);
  assert.notStrictEqual(normalizeRemix(), normalizeRemix());
});

// Dimensions describe the already-resampled input; the engine never resizes it.
test('defaults preserve the existing luminance ramp, transparency and row layout', () => {
  assert.deepEqual(DEFAULT_REMIX, EXPECTED_DEFAULT);
  assert.deepEqual(normalizeRemix(), EXPECTED_DEFAULT);
  const pixels = rgba(
    [0, 0, 0, 255], [255, 255, 255, 255], [255, 0, 0, 255],
    [0, 128, 255, 255], [0, 0, 0, 0], [40, 80, 120, 128],
  );
  const result = remixPixels(pixels, 3, 2);
  const expected = [];
  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3] / 255;
    const luminance = (.2126 * pixels[i] + .7152 * pixels[i + 1] + .0722 * pixels[i + 2]) * alpha + 255 * (1 - alpha);
    expected.push(EXPECTED_DEFAULT.ramp[Math.min(9, Math.round(luminance / 255 * 9))]);
  }
  assert.equal(result.text, expected.slice(0, 3).join('') + '\n' + expected.slice(3).join(''));
  assert.deepEqual(result.colors, [
    'rgb(0,0,0)', 'rgb(255,255,255)', 'rgb(255,0,0)',
    'rgb(0,128,255)', 'rgb(255,255,255)', 'rgb(147,167,187)',
  ]);
  assert.equal(result.columns, 3);
  assert.equal(result.rows, 2);
  assert.equal(result.background, '#f8fafc');
  assert.match(result.html, /<span style="color:rgb\(255,0,0\)">#<\/span>/);
  assert.equal(result.html.replace(/<[^>]*>/g, ''), result.text);
});
