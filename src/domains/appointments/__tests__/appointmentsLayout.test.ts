// ---------------------------------------------------------------------------
// The appointment diary fits a small phone: the twelve-column table only
// starts at md, phones get wrapped cards, and the toolbar's segmented
// controls share the width instead of running off the screen.
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const page = readFileSync(join(process.cwd(), 'src/domains/appointments/pages/AppointmentsPage.tsx'), 'utf8');

describe('Appointment diary on phones', () => {
  it('the table grid is md-and-up only', () => {
    expect(page).toMatch(/className="hidden md:grid grid-cols-12/);
    expect(page).toMatch(/flex flex-wrap items-center[^`]*md:grid md:grid-cols-12/);
    // Bare column spans remain only in the (hidden on phones) header row.
    expect(page.match(/className="col-span-\d/g)?.length).toBe(6);
  });

  it('the view and date-range buttons share the width', () => {
    expect(page.match(/flex-1 lg:flex-none/g)?.length).toBeGreaterThanOrEqual(3);
  });
});
