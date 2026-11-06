/**
 * Tetanus: asked once, in the core, for every traumatic, burn or open wound
 * a module opts in for (`includeCore: { <phase>: ['tetanus'] }`, optionally
 * conditioned with `coreShowWhen['core.tetanus']`).
 *
 * The plan rule (coreRules.tetanus) follows the UK Green Book chapter 30
 * (Tetanus, updated 2019) table for the management of tetanus-prone wounds,
 * which agrees with the WHO tetanus position paper (2017).
 */
import type { EncounterSection } from '../../data/encounterModel';

export const TETANUS: EncounterSection = {
  id: 'core.tetanus',
  title: 'Tetanus',
  intent: 'Immunisation status and how tetanus-prone the wound is decide vaccine and immunoglobulin (Green Book ch. 30; WHO 2017).',
  fields: [
    {
      id: 'core.tetanus', label: 'Tetanus immunisation status', kind: 'select', important: true,
      help: 'Ask on every wound with any breach of skin — it is the item most often missed. Treat an unknown history as not immunised.',
      // Values kept from the encounter model's TETANUS_FIELD so earlier answers read the same.
      options: [
        { value: 'up_to_date', label: 'Up to date for age (primary course complete, boosters as scheduled)' },
        { value: 'given_today', label: 'Given today' },
        // Green Book table 30.1 separates a complete primary course whose
        // booster is overdue (HTIG only for a high-risk wound) from an
        // incomplete primary course (HTIG for any tetanus-prone wound).
        { value: 'due', label: 'Primary course complete, but booster not up to date (e.g. last dose over 10 years ago)', flag: 'amber',
          flagReason: 'Tetanus prophylaxis is outstanding for this wound.' },
        { value: 'primary_incomplete', label: 'Primary course incomplete (fewer than 3 doses)', flag: 'amber',
          flagReason: 'Incomplete primary course: vaccine now, and immunoglobulin as well for a tetanus-prone wound (Green Book ch. 30).' },
        { value: 'unknown', label: 'Not immunised, or not known', flag: 'amber',
          flagReason: 'Treat an unknown immunisation history as incomplete.' },
      ],
    },
    {
      id: 'core.tetanus_wound', label: 'Tetanus risk of the wound', kind: 'select',
      showWhen: { field: 'core.tetanus', equals: ['due', 'primary_incomplete', 'unknown'] },
      help: 'Green Book: tetanus-prone = puncture, devitalised tissue, contact with soil or manure, foreign body, compound fracture, burn, or surgery delayed over 6 hours; high-risk = heavy contamination with soil / manure or extensive devitalised tissue.',
      options: [
        { value: 'clean', label: 'Clean wound' },
        { value: 'prone', label: 'Tetanus-prone' },
        { value: 'high_risk', label: 'High-risk tetanus-prone' },
      ],
    },
  ],
};
