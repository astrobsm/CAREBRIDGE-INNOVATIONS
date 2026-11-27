/**
 * Optional Claude vision enrichment for a wound photograph.
 *
 * Split out of aiWoundMeasurement so the on-device measurement can be shared
 * without this network path. It calls the authenticated /api/ai-vision proxy,
 * so only the signed-in EMR (WoundProgressMonitorPage) imports it. The public
 * no-login wound tool must never import this module: see
 * src/domains/wounds/public-tool/__tests__/noEmrImports.test.ts.
 */

import type { AiWoundAssessment } from './aiWoundMeasurement';

/**
 * System prompt for the optional Claude vision enrichment layer
 * (see analyzeWoundWithAI below).
 *
 * Deliberately conservative: the model is told to underestimate healing rather
 * than overestimate, because an over-optimistic reading is the one that delays
 * escalation. Geometry from this layer is treated as a cross-check only — the
 * calibrated on-device measurement remains authoritative.
 */
const WOUND_ANALYSIS_PROMPT = `You are an expert wound assessment AI for a plastic surgery department.

Analyze this wound image and provide a structured JSON assessment.

IMPORTANT RULES:
- If a calibration reference (ruler, coin, A4 paper) is visible, use it to estimate real-world dimensions
- If no calibration reference, estimate based on anatomical landmarks and indicate lower confidence
- Describe wound characteristics using NPUAP/EPUAP/TIME framework terminology
- Be conservative — underestimate healing progress rather than overestimate

Return ONLY valid JSON with this structure:
{
  "wound_type": "string (surgical, traumatic, pressure_ulcer, burn, keloid, graft_site, flap, other)",
  "location": "string (anatomical location)",
  "dimensions": {
    "length_cm": number,
    "width_cm": number,
    "depth_cm": number | null,
    "area_cm2": number,
    "calibration_used": boolean,
    "calibration_type": "ruler|coin|paper|anatomical_estimate|none"
  },
  "wound_bed": {
    "granulation_pct": number,
    "slough_pct": number,
    "necrotic_pct": number,
    "epithelialization_pct": number
  },
  "edges": "string (well-defined, undermined, rolled, macerated, attached, not_attached)",
  "exudate": "string (none, scant, moderate, copious)",
  "exudate_type": "string (serous, serosanguinous, sanguinous, purulent)",
  "surrounding_skin": "string (healthy, erythematous, macerated, indurated, edematous)",
  "signs_of_infection": ["string"],
  "color_assessment": "string (red/pink=healthy granulation, yellow=slough, black=necrotic, mixed)",
  "healing_stage": "string (inflammatory, proliferative, remodeling, chronic/stalled)",
  "graft_viability": "string (if applicable: viable, partial_take, failed, N/A)",
  "flap_status": "string (if applicable: viable, congested, pale, necrotic, N/A)",
  "observations": "string (free text clinical observations)",
  "confidence": number (0-1, overall assessment confidence)
}`;

/**
 * Hybrid AI enrichment — qualitative wound-bed assessment via Claude vision.
 *
 * This is a SUPPLEMENT to the on-device measurement, never a replacement.
 * Geometry (length, width, area, contour) always comes from the calibrated
 * on-device CV path, which is deterministic and works offline; the model is
 * asked only for the qualitative picture it is actually good at — tissue
 * composition, edges, exudate, signs of infection, healing stage.
 *
 * Returns null on ANY failure (offline, proxy not configured, malformed
 * output). That is deliberate: the Monitor is offline-first, so a missing
 * enrichment layer must degrade to the on-device result silently rather than
 * block a clinician mid-ward-round.
 */
export async function analyzeWoundWithAI(
  imageBase64: string,
  _patientId: string | number,
  opts?: { woundRecordId?: string; calibrationType?: string; calibrationValue?: string; signal?: AbortSignal }
): Promise<AiWoundAssessment | null> {
  // Cheap pre-check: don't attempt a round-trip with no network.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;
  if (!imageBase64) return null;

  const imageDataUrl = imageBase64.startsWith('data:')
    ? imageBase64
    : `data:image/jpeg;base64,${imageBase64}`;

  let system = WOUND_ANALYSIS_PROMPT;
  if (opts?.calibrationType && opts?.calibrationValue) {
    system += `\n\nCALIBRATION INFO: A ${opts.calibrationType} is visible in the image. Use it as reference (${opts.calibrationValue}).`;
  }

  try {
    const { proxyVisionJson } = await import('../../../services/aiProxy');
    const analysis = await proxyVisionJson<AiWoundAssessment>(
      imageDataUrl,
      system,
      'Analyze this wound image and provide the structured assessment.',
      { signal: opts?.signal },
    );
    return analysis && typeof analysis === 'object' ? analysis : null;
  } catch (e) {
    console.warn('[WoundMonitor] AI wound assessment unavailable:', (e as Error)?.message);
    return null;
  }
}
