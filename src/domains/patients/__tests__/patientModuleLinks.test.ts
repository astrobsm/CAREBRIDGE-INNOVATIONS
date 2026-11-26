import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { patientModuleLinks } from '../patientModuleLinks';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const app = read('src/App.tsx');

describe('patient hub module links', () => {
  const links = patientModuleLinks('pat 1/x');

  it('every link carries the patient', () => {
    expect(links.length).toBeGreaterThanOrEqual(10);
    for (const l of links) {
      const url = new URL(l.href, 'http://x');
      expect(url.searchParams.get('patientId'), l.id).toBe('pat 1/x');
    }
  });

  it('ids are unique', () => {
    expect(new Set(links.map(l => l.id)).size).toBe(links.length);
  });

  it('every link points at a real route', () => {
    for (const l of links) {
      const path = new URL(l.href, 'http://x').pathname.slice(1);
      expect(app, l.href).toContain(`path="${path}"`);
    }
  });
});

describe('specialty modules read ?patientId=', () => {
  const pages = [
    'src/domains/wounds/pages/WoundProgressMonitorPage.tsx',
    'src/domains/burns/pages/BurnsAssessmentPage.tsx',
    'src/domains/npwt/pages/NPWTPage.tsx',
    'src/domains/skin-graft/pages/SkinGraftMonitorPage.tsx',
    'src/domains/scar/pages/ScarMonitorPage.tsx',
    'src/domains/keloid/pages/KeloidCarePlanningPage.tsx',
    'src/domains/nutrition/pages/NutritionPlannerPage.tsx',
    'src/domains/limb-salvage/pages/LimbSalvagePage.tsx',
    'src/domains/vascular/pages/VascularAssessmentPage.tsx',
    'src/domains/lymphedema/pages/LymphedemaAssessmentPage.tsx',
    'src/domains/medication-chart/pages/MedicationChartPage.tsx',
    'src/domains/treatment-planning/pages/TreatmentPlanningDashboardPage.tsx',
    'src/domains/treatment-planning/pages/NewTreatmentPlanPage.tsx',
  ];
  for (const p of pages) {
    it(p.split('/').pop()!, () => {
      expect(read(p)).toMatch(/searchParams\.get\('patientId'\)/);
    });
  }
});
