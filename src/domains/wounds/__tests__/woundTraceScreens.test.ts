/**
 * The scale and tracing screens, and how the assessment uses them.
 *
 * The blank scale / trace canvas on Android came from re-loading the photo
 * from an object URL the camera had already released; the screens now draw
 * from the decoded frame. A photo with no marker no longer leaves the tracing
 * in pixels: the clinician sets the scale from a card, ruler or coin.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { REFERENCE_OBJECTS, scaleFromLine, MIN_LINE_DISPLAY_PX } from '../components/WoundCalibrationPicker';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

describe('manual scale from a reference object', () => {
  it('converts a line drawn on the preview back to source pixels', () => {
    // A 85.6 mm card edge drawn as 214 px on a 640 px preview of a 3200 px frame
    // is 1070 source px: 125 px/cm.
    expect(scaleFromLine(214, 640, 3200, 8.56)).toBeCloseTo(125, 6);
    // The same line on a preview half the size gives the same scale.
    expect(scaleFromLine(107, 320, 3200, 8.56)).toBeCloseTo(125, 6);
  });

  it('gives no scale without a line, a size or a preview', () => {
    expect(scaleFromLine(0, 640, 3200, 8.56)).toBe(0);
    expect(scaleFromLine(200, 640, 3200, 0)).toBe(0);
    expect(scaleFromLine(200, 0, 3200, 8.56)).toBe(0);
  });

  it('offers card, ruler and a custom size, with the ISO card dimensions', () => {
    const byId = Object.fromEntries(REFERENCE_OBJECTS.map(r => [r.id, r.cm]));
    expect(byId.card).toBe(8.56);
    expect(byId.card_short).toBe(5.398);
    expect(byId.ruler10).toBe(10);
    expect(byId.custom).toBe(0);
    expect(MIN_LINE_DISPLAY_PX).toBeGreaterThan(0);
  });
});

describe('the screens draw from the decoded photograph', () => {
  const page = read('src/domains/wounds/pages/WoundProgressMonitorPage.tsx');
  const tracer = read('src/components/clinical/WoundTracer.tsx');
  const picker = read('src/domains/wounds/components/WoundCalibrationPicker.tsx');

  it('the assessment passes the decoded frame to both screens', () => {
    expect((page.match(/source=\{traceSource\.canvas\}/g) || []).length).toBe(2);
    expect(page).not.toMatch(/createObjectURL\(file\)/);
  });

  it('both screens say when a photograph cannot be shown', () => {
    expect(tracer).toContain('The photograph could not be displayed');
    expect(picker).toContain('The photograph could not be displayed');
  });

  it('the scale screen uses pointer events, not separate touch and mouse handlers', () => {
    expect(picker).toMatch(/onPointerDown=\{beginDrag\}/);
    expect(picker).not.toMatch(/onTouchStart|onMouseDown/);
  });

  it('a missing marker leads to setting the scale, not a pixel-only trace', () => {
    expect(page).toMatch(/<WoundCalibrationPicker/);
    expect(page).toMatch(/setCalibType\(`manual:\$\{referenceLabel\}`\)/);
  });

  it('a traced wound records its tissues and caliper dimensions', () => {
    expect(page).toMatch(/surfaceKinds=\{WOUND_TRACE_KINDS\}/);
    expect(page).toMatch(/assignRemainder/);
    expect(page).toMatch(/traceDimensionsCm\(total\.points, tracingPixelsPerCm\)/);
    expect(page).toMatch(/granulationPct: composition\.percent\.granulation/);
  });

  it('an auto-measured photo can be traced, with the detected outline offered not imposed', () => {
    expect(page).toMatch(/suggestedOutline=\{traceSource\.suggestedOutline\}/);
    expect(tracer).toContain('Use detected outline');
  });

  it('the tracer zooms and pans for precision on phones', () => {
    expect(tracer).toMatch(/aria-label="Zoom in"/);
    expect(tracer).toMatch(/if \(mode !== 'draw'\) return;/);
  });
});
