/** Complications, each with a Clavien–Dindo grade and the grade's definition as help. */
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2 } from 'lucide-react';
import type { ClavienDindoGrade, GradedComplication } from '../../../types';
import { CLAVIEN_DINDO } from '../journey/clavienDindo';

export default function ComplicationsEditor({ value, onChange, source }: {
  value: GradedComplication[];
  onChange: (v: GradedComplication[]) => void;
  source: GradedComplication['source'];
}) {
  const [desc, setDesc] = useState('');
  const [grade, setGrade] = useState<ClavienDindoGrade>('I');
  const def = CLAVIEN_DINDO.find(g => g.grade === grade)!;
  const add = () => {
    if (!desc.trim()) return;
    onChange([...value, { id: uuidv4(), description: desc.trim(), grade, recordedAt: new Date(), source }]);
    setDesc('');
  };
  return (
    <div data-testid="complications-editor">
      {value.length === 0 && <p className="text-sm text-gray-500 mb-2">No complications recorded.</p>}
      <ul className="space-y-1 mb-2">
        {value.map(c => (
          <li key={c.id} className="flex items-start justify-between gap-2 bg-gray-50 rounded px-2 py-1.5 text-sm">
            <span><span className="font-semibold">Clavien–Dindo {c.grade}{c.ongoing ? 'd' : ''}</span> — {c.description}</span>
            <span className="flex items-center gap-2 flex-shrink-0">
              <label className="text-xs flex items-center gap-1" title="Still present (suffix d)">
                <input type="checkbox" checked={!!c.ongoing} onChange={e => onChange(value.map(x => x.id === c.id ? { ...x, ongoing: e.target.checked } : x))} />ongoing
              </label>
              <button type="button" onClick={() => onChange(value.filter(x => x.id !== c.id))} className="text-red-500" aria-label="Remove"><Trash2 className="w-4 h-4" /></button>
            </span>
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
        <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Complication (e.g. haematoma)" className="border rounded-lg px-3 py-2 text-sm" />
        <select value={grade} onChange={e => setGrade(e.target.value as ClavienDindoGrade)} className="border rounded-lg px-2 py-2 text-sm" aria-label="Clavien-Dindo grade">
          {CLAVIEN_DINDO.map(g => <option key={g.grade} value={g.grade}>{g.label}</option>)}
        </select>
        <button type="button" onClick={add} className="flex items-center justify-center gap-1 text-sm bg-gray-800 text-white rounded-lg px-3 py-2"><Plus className="w-4 h-4" />Add</button>
      </div>
      <p className="text-xs text-gray-500 mt-1"><span className="font-semibold">{def.label}:</span> {def.definition}</p>
      <p className="text-[11px] text-gray-400 mt-1">Clavien–Dindo classification: Dindo et al., Ann Surg 2004; Clavien et al., Ann Surg 2009.</p>
    </div>
  );
}
