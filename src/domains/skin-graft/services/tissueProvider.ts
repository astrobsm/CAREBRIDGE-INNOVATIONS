/**
 * Computer-vision provider abstraction for wound-bed tissue analysis.
 *
 * WHY THIS EXISTS
 *
 * Graft take and donor re-epithelialization are both computed from a tissue
 * breakdown of the segmented region. Whatever produces that breakdown is
 * therefore the most safety-critical component in the module, and it must be
 * replaceable without touching the clinical arithmetic that consumes it.
 *
 * WHAT IS ACTUALLY AVAILABLE (searched September 2026)
 *
 * There is no publicly available, licensed, trained model for skin-graft
 * viability or donor-site re-epithelialization from clinical photographs. The
 * published deep-learning work on epithelialization uses optical coherence
 * tomography B-scans, which is a different imaging modality entirely.
 *
 * Trained *wound segmentation* models do exist and are usable — FUSegNet (MIT,
 * Dice 0.927 on chronic wounds) is the strongest — but they segment wound from
 * background; they do not classify tissue, they are trained on diabetic foot
 * ulcers rather than grafts, and the published architecture uses an
 * EfficientNet-B7 encoder far too heavy for an offline-first PWA.
 *
 * So: no trained tissue model is installed, because none fit for this purpose
 * exists to install. This file provides the seam for one, and ships a
 * heuristic that is honest about being a heuristic.
 *
 * ADDING A REAL MODEL
 *
 * Implement `TissueProvider`, register it, and it takes precedence
 * automatically. An ONNX model served from the app's own origin and run through
 * onnxruntime-web is the expected route; `describeOnnxIntegration()` documents
 * the contract a candidate model must satisfy.
 */

import type { ConfidenceBand } from '../types';
import { isMarkerGreen } from '../../../services/woundMeasurementEngine';

export interface TissueAnalysis {
  granulationPct: number;
  sloughPct: number;
  necroticPct: number;
  epithelialPct: number;
  /**
   * Pixels the provider could not confidently assign.
   *
   * Reported rather than absorbed. The previous implementation defaulted
   * ambiguous wound-coloured pixels to granulation, which counts them as
   * VIABLE and inflates graft take — a failing graft reading as healthier than
   * it is. Unclassified area is excluded from both numerator and denominator
   * downstream, so it lowers confidence instead of biasing the answer.
   */
  unclassifiedPct: number;
  /** Fraction of the mask that was classified at all, 0-1. */
  coverage: number;
  providerId: string;
  modelVersion: string;
  isPrototypeEstimator: boolean;
  confidence: ConfidenceBand;
}

export interface TissueProvider {
  id: string;
  label: string;
  modelVersion: string;
  /** True when this is not a trained model. Propagates into stored provenance. */
  isPrototypeEstimator: boolean;
  /** Higher wins when several providers are available. */
  priority: number;
  isAvailable(): Promise<boolean>;
  analyse(canvas: HTMLCanvasElement, mask: boolean[]): Promise<TissueAnalysis>;
}

// ── Heuristic provider ──────────────────────────────────────────────────────

export const HEURISTIC_TISSUE_VERSION = 'heuristic-tissue-hsv-1.0.0';

/** RGB → HSV. Hue in degrees, saturation and value 0-1. */
function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, max === 0 ? 0 : d / max, max];
}

/**
 * Classify one wound-bed pixel.
 *
 * Works in HSV rather than raw RGB because hue is far more stable than the red
 * channel under the lighting a ward photograph is actually taken in — the
 * previous thresholds ("R > 0.5 and G < 0.3") shift meaning entirely between
 * daylight, fluorescent light and flash.
 *
 * Returns null when the pixel does not clearly belong to any class. That is a
 * real answer, not a failure to produce one.
 */
function classifyPixel(r: number, g: number, b: number):
  'granulation' | 'slough' | 'necrotic' | 'epithelial' | null {
  // The calibration marker is not tissue and must never be classified as such.
  if (isMarkerGreen(r, g, b)) return null;

  const [h, s, v] = rgbToHsv(r, g, b);

  // Necrotic / eschar: very dark, whatever its hue. Guarded on saturation so a
  // deep shadow over healthy tissue is left unclassified rather than called
  // necrosis, which would understate graft take.
  if (v < 0.18 && s < 0.55) return 'necrotic';
  if (v < 0.12) return 'necrotic';

  // Too dark or too washed out to read any colour from.
  if (v < 0.22 || v > 0.97) return null;

  const red = h <= 20 || h >= 340;
  const yellow = h > 35 && h <= 70;

  // Granulation: red and saturated. Healthy granulation is vivid.
  if (red && s >= 0.45) return 'granulation';

  // Epithelial: pink or pale — reddish hue but desaturated, and bright. This is
  // new epithelium at the margin and the advancing front on a donor site.
  if (red && s >= 0.12 && s < 0.45 && v >= 0.55) return 'epithelial';

  // Slough: yellow, moderately saturated, not dark.
  if (yellow && s >= 0.25 && v >= 0.35) return 'slough';

  // Everything else — orange-brown transitional tissue, blood film, glare,
  // ambiguous margins — is left unclassified rather than defaulted.
  return null;
}

/** Confidence from how much of the mask was actually classified. */
function coverageConfidence(coverage: number): ConfidenceBand {
  if (coverage < 0.4) return 'uncertain';
  if (coverage < 0.7) return 'low';
  if (coverage < 0.9) return 'moderate';
  return 'high';
}

export const heuristicTissueProvider: TissueProvider = {
  id: 'heuristic-hsv',
  label: 'Colour analysis (prototype)',
  modelVersion: HEURISTIC_TISSUE_VERSION,
  isPrototypeEstimator: true,
  priority: 0,

  async isAvailable() {
    return true; // no weights, no network, always usable
  },

  async analyse(canvas, mask) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const empty: TissueAnalysis = {
      granulationPct: 0, sloughPct: 0, necroticPct: 0, epithelialPct: 0,
      unclassifiedPct: 0, coverage: 0,
      providerId: this.id, modelVersion: this.modelVersion,
      isPrototypeEstimator: true, confidence: 'uncertain',
    };
    if (!ctx || !canvas.width || !canvas.height) return empty;

    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let granulation = 0, slough = 0, necrotic = 0, epithelial = 0, unclassified = 0, total = 0;

    for (let i = 0; i < mask.length; i++) {
      if (!mask[i]) continue;
      total++;
      const p = i * 4;
      switch (classifyPixel(data[p], data[p + 1], data[p + 2])) {
        case 'granulation': granulation++; break;
        case 'slough': slough++; break;
        case 'necrotic': necrotic++; break;
        case 'epithelial': epithelial++; break;
        default: unclassified++;
      }
    }

    if (total === 0) return empty;

    const pct = (n: number) => Math.round((n / total) * 1000) / 10;
    const classified = total - unclassified;
    const coverage = classified / total;

    return {
      granulationPct: pct(granulation),
      sloughPct: pct(slough),
      necroticPct: pct(necrotic),
      epithelialPct: pct(epithelial),
      unclassifiedPct: pct(unclassified),
      coverage,
      providerId: this.id,
      modelVersion: this.modelVersion,
      isPrototypeEstimator: true,
      confidence: coverageConfidence(coverage),
    };
  },
};

// ── Registry ────────────────────────────────────────────────────────────────

const providers: TissueProvider[] = [heuristicTissueProvider];

/**
 * Register a provider. A trained model registered here outranks the heuristic
 * automatically, provided it reports a higher priority and is available.
 */
export function registerTissueProvider(provider: TissueProvider): void {
  const existing = providers.findIndex(p => p.id === provider.id);
  if (existing >= 0) providers[existing] = provider;
  else providers.push(provider);
}

export function listTissueProviders(): TissueProvider[] {
  return [...providers].sort((a, b) => b.priority - a.priority);
}

/**
 * The best provider currently usable.
 *
 * Availability is checked rather than assumed, so a model whose weights failed
 * to load falls back to the heuristic instead of failing the analysis. It never
 * returns nothing: the heuristic has no dependencies and is always available.
 */
export async function selectTissueProvider(): Promise<TissueProvider> {
  for (const p of listTissueProviders()) {
    try {
      if (await p.isAvailable()) return p;
    } catch {
      // A provider that throws while reporting availability is not available.
    }
  }
  return heuristicTissueProvider;
}

/** Analyse using the best available provider. */
export async function analyseTissue(
  canvas: HTMLCanvasElement,
  mask: boolean[],
): Promise<TissueAnalysis> {
  const provider = await selectTissueProvider();
  return provider.analyse(canvas, mask);
}

// ── Contract for a future trained model ─────────────────────────────────────

/**
 * What a candidate model must satisfy to be installed here.
 *
 * Written down because the decision not to ship one was deliberate, and the
 * next person needs the criteria rather than the conclusion.
 */
export function describeOnnxIntegration(): {
  requirements: string[];
  candidates: { name: string; licence: string; suitability: string }[];
} {
  return {
    requirements: [
      'Outputs per-pixel tissue classes, not just wound-versus-background — graft take needs the breakdown, not the outline.',
      'Small enough to lazy-load over mobile data: the main bundle is already ~7 MB, so a model above roughly 10 MB needs its own cache strategy.',
      'Exportable to ONNX and runnable via onnxruntime-web, or convertible to TensorFlow.js, which is already a dependency.',
      'A licence permitting clinical use and redistribution. MIT or Apache-2.0; a repository with no licence grants no rights.',
      'Training data representative of grafted and donor sites, and of the skin tones of the patients it will be used on.',
      'Documented validation with per-class performance. A model whose necrosis Dice is around 0.5 is not usable for a viability percentage.',
    ],
    candidates: [
      {
        name: 'FUSegNet (mrinal054/FUSegNet)',
        licence: 'MIT',
        suitability:
          'Strongest trained wound model found: Dice 0.927 on chronic wounds. But it segments wound from background rather than classifying tissue, is trained on diabetic foot ulcers rather than grafts, and its EfficientNet-B7 encoder is far too heavy for this PWA. Usable as a segmentation upgrade; it cannot supply viability.',
      },
      {
        name: 'uwm-bigdata/wound-segmentation',
        licence: 'None stated',
        suitability:
          'Keras, so TensorFlow.js conversion would be straightforward. Unusable as it stands: a repository with no licence reserves all rights.',
      },
      {
        name: 'Hugging Face wound classifiers',
        licence: 'Mixed / often unstated',
        suitability:
          'Whole-image classifiers, not segmentation, with undocumented training data and no published validation. Wrapping one of these in clinical language would be worse than the honest heuristic.',
      },
    ],
  };
}
