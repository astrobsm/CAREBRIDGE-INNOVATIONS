import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, GraduationCap, Trophy, Trash2, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';
import { getFamilyClient } from '../../../services/familyClient';
import { useFamilyCtx } from '../context';
import { subscribeFamilyChanges } from '../hooks/useFamilyRealtime';
import type { Child, SchoolPerformance, Award, AwardCategory, AwardIssuerType } from '../types';

interface SPRow extends SchoolPerformance { child?: Child }
interface AwardRow extends Award { child?: Child }

const EMPTY_SP = {
  child_id: '', school_name: '', class_or_grade: '', term: '', academic_year: '',
  report_date: new Date().toISOString().slice(0,10),
  average_score: '', position_in_class: '', class_size: '',
  attendance_pct: '', conduct_grade: '', teacher_remark: '', parent_remark: '',
  next_term_begins: '',
};

const EMPTY_AW = {
  child_id: '', title: '', category: 'academic' as AwardCategory,
  issuer: '', issuer_type: 'school' as AwardIssuerType,
  date_awarded: new Date().toISOString().slice(0,10),
  description: '', certificate_url: '',
};

export default function FamilySchool() {
  const { parent } = useFamilyCtx();
  const [children, setChildren] = useState<Child[]>([]);
  const [reports, setReports] = useState<SPRow[]>([]);
  const [awards, setAwards] = useState<AwardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'reports' | 'awards'>('reports');
  const [chartChildId, setChartChildId] = useState<string>('');
  const [showSP, setShowSP] = useState(false);
  const [showAW, setShowAW] = useState(false);
  const [sp, setSP] = useState(EMPTY_SP);
  const [aw, setAW] = useState(EMPTY_AW);
  const [busy, setBusy] = useState(false);

  async function load() {
    const fam = getFamilyClient();
    const [kidsRes, spRes, awRes] = await Promise.all([
      fam.from('children').select('*').eq('parent_id', parent.id).eq('is_active', true).order('first_name'),
      fam.from('school_performance').select('*, child:children!inner(*)').eq('child.parent_id', parent.id).order('report_date', { ascending: false }),
      fam.from('awards').select('*, child:children!inner(*)').eq('child.parent_id', parent.id).order('date_awarded', { ascending: false }),
    ]);
    const kids = (kidsRes.data as Child[]) || [];
    setChildren(kids);
    setReports((spRes.data as SPRow[]) || []);
    setAwards((awRes.data as AwardRow[]) || []);
    if (!chartChildId && kids.length) setChartChildId(kids[0].id);
    setLoading(false);
  }
  useEffect(() => {
    load();
    const unsub = subscribeFamilyChanges(parent.id, load);
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parent.id]);

  async function addSP(e: React.FormEvent) {
    e.preventDefault();
    if (!sp.child_id) { toast.error('Pick a child'); return; }
    setBusy(true);
    const fam = getFamilyClient();
    const payload = {
      child_id: sp.child_id,
      recorded_by: parent.id,
      school_name: sp.school_name || null,
      class_or_grade: sp.class_or_grade || null,
      term: sp.term || null,
      academic_year: sp.academic_year || null,
      report_date: sp.report_date,
      average_score: sp.average_score ? Number(sp.average_score) : null,
      position_in_class: sp.position_in_class ? Number(sp.position_in_class) : null,
      class_size: sp.class_size ? Number(sp.class_size) : null,
      attendance_pct: sp.attendance_pct ? Number(sp.attendance_pct) : null,
      conduct_grade: sp.conduct_grade || null,
      teacher_remark: sp.teacher_remark || null,
      parent_remark: sp.parent_remark || null,
      next_term_begins: sp.next_term_begins || null,
    };
    const { error } = await fam.from('school_performance').insert(payload);
    if (error) toast.error(error.message); else toast.success('Report card saved');
    setSP(EMPTY_SP); setShowSP(false); setBusy(false); load();
  }

  async function addAW(e: React.FormEvent) {
    e.preventDefault();
    if (!aw.child_id || !aw.title) { toast.error('Child and title are required'); return; }
    setBusy(true);
    const fam = getFamilyClient();
    const { error } = await fam.from('awards').insert({
      child_id: aw.child_id,
      recorded_by: parent.id,
      title: aw.title,
      category: aw.category,
      issuer: aw.issuer || null,
      issuer_type: aw.issuer_type,
      date_awarded: aw.date_awarded,
      description: aw.description || null,
      certificate_url: aw.certificate_url || null,
    });
    if (error) toast.error(error.message); else toast.success('Award saved');
    setAW(EMPTY_AW); setShowAW(false); setBusy(false); load();
  }

  async function delSP(id: string) {
    if (!confirm('Delete this report card?')) return;
    const fam = getFamilyClient();
    const { error } = await fam.from('school_performance').delete().eq('id', id);
    if (error) toast.error(error.message); else load();
  }
  async function delAW(id: string) {
    if (!confirm('Delete this award?')) return;
    const fam = getFamilyClient();
    const { error } = await fam.from('awards').delete().eq('id', id);
    if (error) toast.error(error.message); else load();
  }

  const chartData = useMemo(() => {
    if (!chartChildId) return [];
    return reports
      .filter(r => r.child_id === chartChildId)
      .map(r => ({
        date: r.report_date,
        label: r.term ? `${r.term}${r.academic_year ? ' · ' + r.academic_year : ''}` : r.report_date,
        average: r.average_score != null ? Number(r.average_score) : null,
        attendance: r.attendance_pct != null ? Number(r.attendance_pct) : null,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [reports, chartChildId]);

  const selectedChild = children.find(c => c.id === chartChildId);

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">School performance & awards</h2>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-gray-300 overflow-hidden text-sm">
            <button onClick={()=>setTab('reports')} className={`px-3 py-1.5 inline-flex items-center gap-1 ${tab==='reports' ? 'bg-pink-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
              <GraduationCap size={14}/> Reports
            </button>
            <button onClick={()=>setTab('awards')} className={`px-3 py-1.5 inline-flex items-center gap-1 ${tab==='awards' ? 'bg-pink-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
              <Trophy size={14}/> Awards
            </button>
          </div>
          {tab === 'reports' ? (
            <button onClick={()=>setShowSP(s=>!s)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-pink-600 text-white text-sm hover:bg-pink-700">
              <Plus size={14}/> {showSP?'Cancel':'New report'}
            </button>
          ) : (
            <button onClick={()=>setShowAW(s=>!s)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-pink-600 text-white text-sm hover:bg-pink-700">
              <Plus size={14}/> {showAW?'Cancel':'New award'}
            </button>
          )}
        </div>
      </div>

      {/* REPORTS TAB */}
      {tab === 'reports' && (
        <>
          {showSP && (
            <form onSubmit={addSP} className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="text-sm">Child *
                <select required className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={sp.child_id} onChange={(e)=>setSP({...sp,child_id:e.target.value})}>
                  <option value="">— Select —</option>
                  {children.map(c=><option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                </select>
              </label>
              <label className="text-sm">Report date *
                <input type="date" required className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={sp.report_date} onChange={(e)=>setSP({...sp,report_date:e.target.value})}/>
              </label>
              <label className="text-sm">School
                <input className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={sp.school_name} onChange={(e)=>setSP({...sp,school_name:e.target.value})}/>
              </label>
              <label className="text-sm">Class / Grade
                <input placeholder="e.g. Primary 3, JSS 1" className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={sp.class_or_grade} onChange={(e)=>setSP({...sp,class_or_grade:e.target.value})}/>
              </label>
              <label className="text-sm">Term
                <input placeholder="e.g. Term 1" className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={sp.term} onChange={(e)=>setSP({...sp,term:e.target.value})}/>
              </label>
              <label className="text-sm">Academic year
                <input placeholder="2025/2026" className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={sp.academic_year} onChange={(e)=>setSP({...sp,academic_year:e.target.value})}/>
              </label>
              <label className="text-sm">Average score (%)
                <input type="number" step="0.01" min="0" max="100" className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={sp.average_score} onChange={(e)=>setSP({...sp,average_score:e.target.value})}/>
              </label>
              <label className="text-sm">Attendance (%)
                <input type="number" step="0.1" min="0" max="100" className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={sp.attendance_pct} onChange={(e)=>setSP({...sp,attendance_pct:e.target.value})}/>
              </label>
              <label className="text-sm">Position in class
                <input type="number" min="1" className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={sp.position_in_class} onChange={(e)=>setSP({...sp,position_in_class:e.target.value})}/>
              </label>
              <label className="text-sm">Class size
                <input type="number" min="1" className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={sp.class_size} onChange={(e)=>setSP({...sp,class_size:e.target.value})}/>
              </label>
              <label className="text-sm">Conduct
                <input placeholder="e.g. Excellent, A" className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={sp.conduct_grade} onChange={(e)=>setSP({...sp,conduct_grade:e.target.value})}/>
              </label>
              <label className="text-sm">Next term begins
                <input type="date" className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={sp.next_term_begins} onChange={(e)=>setSP({...sp,next_term_begins:e.target.value})}/>
              </label>
              <label className="text-sm md:col-span-2">Teacher's remark
                <textarea rows={2} className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={sp.teacher_remark} onChange={(e)=>setSP({...sp,teacher_remark:e.target.value})}/>
              </label>
              <label className="text-sm md:col-span-2">Parent's remark
                <textarea rows={2} className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={sp.parent_remark} onChange={(e)=>setSP({...sp,parent_remark:e.target.value})}/>
              </label>
              <div className="md:col-span-2">
                <button disabled={busy} className="px-3 py-1.5 rounded-md bg-pink-600 text-white text-sm disabled:opacity-60">{busy?'Saving…':'Save report'}</button>
              </div>
            </form>
          )}

          {children.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <BarChart3 size={16} className="text-pink-600"/> Academic trend{selectedChild ? ` — ${selectedChild.first_name}` : ''}
                </div>
                <select className="border rounded-md px-2 py-1 text-sm" value={chartChildId} onChange={e=>setChartChildId(e.target.value)} aria-label="Select child for chart">
                  {children.map(c=><option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                </select>
              </div>
              {chartData.length < 2 ? (
                <div className="text-xs text-gray-500 py-8 text-center">Need at least 2 reports for {selectedChild?.first_name ?? 'this child'} to draw a chart.</div>
              ) : (
                <div className="w-full h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                      <XAxis dataKey="label" tick={{ fontSize: 10 }}/>
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }}/>
                      <Tooltip contentStyle={{ fontSize: 12 }}/>
                      <Legend wrapperStyle={{ fontSize: 12 }}/>
                      <Line type="monotone" dataKey="average" stroke="#db2777" name="Average %" connectNulls dot={{ r: 3 }}/>
                      <Line type="monotone" dataKey="attendance" stroke="#0ea5e9" name="Attendance %" connectNulls dot={{ r: 3 }}/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {loading ? <div className="text-sm text-gray-500">Loading…</div> : reports.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center text-sm text-gray-500">No report cards yet.</div>
          ) : (
            <ul className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
              {reports.map(r=>(
                <li key={r.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900">
                        {r.child?.first_name} · {r.term || r.report_date}{r.academic_year ? ` · ${r.academic_year}` : ''}
                      </div>
                      <div className="text-xs text-gray-500">
                        {r.school_name && `${r.school_name} · `}{r.class_or_grade && `${r.class_or_grade} · `}{r.report_date}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs">
                        {r.average_score != null && <span className="px-2 py-0.5 rounded bg-pink-50 text-pink-700 border border-pink-200 font-mono">avg {r.average_score}%</span>}
                        {r.position_in_class != null && <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">pos {r.position_in_class}{r.class_size ? `/${r.class_size}` : ''}</span>}
                        {r.attendance_pct != null && <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">att {r.attendance_pct}%</span>}
                        {r.conduct_grade && <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">conduct {r.conduct_grade}</span>}
                      </div>
                      {r.teacher_remark && <div className="text-xs text-gray-700 mt-1"><b>Teacher:</b> {r.teacher_remark}</div>}
                      {r.parent_remark && <div className="text-xs text-gray-700"><b>Parent:</b> {r.parent_remark}</div>}
                    </div>
                    <button onClick={()=>delSP(r.id)} title="Delete" aria-label="Delete report" className="text-gray-400 hover:text-red-600 p-1">
                      <Trash2 size={14}/>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* AWARDS TAB */}
      {tab === 'awards' && (
        <>
          {showAW && (
            <form onSubmit={addAW} className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="text-sm">Child *
                <select required className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={aw.child_id} onChange={(e)=>setAW({...aw,child_id:e.target.value})}>
                  <option value="">— Select —</option>
                  {children.map(c=><option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                </select>
              </label>
              <label className="text-sm">Date awarded *
                <input type="date" required className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={aw.date_awarded} onChange={(e)=>setAW({...aw,date_awarded:e.target.value})}/>
              </label>
              <label className="text-sm md:col-span-2">Award title *
                <input required placeholder="e.g. Best in Mathematics" className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={aw.title} onChange={(e)=>setAW({...aw,title:e.target.value})}/>
              </label>
              <label className="text-sm">Category
                <select className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={aw.category} onChange={(e)=>setAW({...aw,category:e.target.value as AwardCategory})}>
                  <option value="academic">Academic</option>
                  <option value="sports">Sports</option>
                  <option value="spiritual">Spiritual</option>
                  <option value="character">Character</option>
                  <option value="leadership">Leadership</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="text-sm">Issuer type
                <select className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={aw.issuer_type} onChange={(e)=>setAW({...aw,issuer_type:e.target.value as AwardIssuerType})}>
                  <option value="school">School</option>
                  <option value="church">Church</option>
                  <option value="community">Community</option>
                  <option value="competition">Competition</option>
                  <option value="other">Other organization</option>
                </select>
              </label>
              <label className="text-sm md:col-span-2">Issuer (school or organization name)
                <input placeholder="e.g. Greenfield Academy / Lions Club" className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={aw.issuer} onChange={(e)=>setAW({...aw,issuer:e.target.value})}/>
              </label>
              <label className="text-sm md:col-span-2">Description
                <textarea rows={2} className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={aw.description} onChange={(e)=>setAW({...aw,description:e.target.value})}/>
              </label>
              <label className="text-sm md:col-span-2">Certificate URL (optional)
                <input type="url" placeholder="https://…" className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={aw.certificate_url} onChange={(e)=>setAW({...aw,certificate_url:e.target.value})}/>
              </label>
              <div className="md:col-span-2">
                <button disabled={busy} className="px-3 py-1.5 rounded-md bg-pink-600 text-white text-sm disabled:opacity-60">{busy?'Saving…':'Save award'}</button>
              </div>
            </form>
          )}

          {loading ? <div className="text-sm text-gray-500">Loading…</div> : awards.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center text-sm text-gray-500">No awards yet.</div>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {awards.map(a=>(
                <li key={a.id} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Trophy size={16} className="text-amber-500 flex-shrink-0"/>
                        <div className="text-sm font-semibold text-gray-900 truncate">{a.title}</div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {a.child?.first_name} · {a.date_awarded}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1 text-[10px]">
                        {a.category && <span className="px-1.5 py-0.5 rounded bg-pink-50 text-pink-700 border border-pink-200">{a.category}</span>}
                        {a.issuer_type && <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">{a.issuer_type}</span>}
                      </div>
                      {a.issuer && <div className="text-xs text-gray-700 mt-1"><b>Issuer:</b> {a.issuer}</div>}
                      {a.description && <div className="text-xs text-gray-600 mt-1">{a.description}</div>}
                      {a.certificate_url && (
                        <a href={a.certificate_url} target="_blank" rel="noopener noreferrer" className="text-xs text-pink-600 hover:underline mt-1 inline-block">View certificate →</a>
                      )}
                    </div>
                    <button onClick={()=>delAW(a.id)} title="Delete" aria-label="Delete award" className="text-gray-400 hover:text-red-600 p-1">
                      <Trash2 size={14}/>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
