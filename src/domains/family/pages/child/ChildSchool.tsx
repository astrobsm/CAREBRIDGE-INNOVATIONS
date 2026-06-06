import { useEffect, useState } from 'react';
import { Trophy, GraduationCap } from 'lucide-react';
import { getFamilyClient } from '../../../services/familyClient';
import { subscribeFamilyChanges } from '../../hooks/useFamilyRealtime';
import type { SchoolPerformance, Award } from '../types';
import { useChildCtx } from './childCtx';

export default function ChildSchool() {
  const { session } = useChildCtx();
  const [reports, setReports] = useState<SchoolPerformance[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const fam = getFamilyClient();
    const [spRes, awRes] = await Promise.all([
      fam.from('school_performance').select('*').eq('child_id', session.child_id).order('report_date', { ascending: false }),
      fam.from('awards').select('*').eq('child_id', session.child_id).order('date_awarded', { ascending: false }),
    ]);
    setReports((spRes.data as SchoolPerformance[]) || []);
    setAwards((awRes.data as Award[]) || []);
    setLoading(false);
  }
  useEffect(() => {
    load();
    const unsub = subscribeFamilyChanges(session.parent_id, load);
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.child_id]);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <GraduationCap className="text-pink-600" size={18}/>
        <h2 className="text-lg font-semibold text-gray-900">My school & awards</h2>
      </div>

      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Report cards</h3>
        {loading ? <div className="text-sm text-gray-500">Loading…</div> : reports.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-6 text-center text-sm text-gray-500">No report cards yet.</div>
        ) : (
          <ul className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
            {reports.map(r=>(
              <li key={r.id} className="px-4 py-3">
                <div className="text-sm font-medium text-gray-900">
                  {r.term || r.report_date}{r.academic_year ? ` · ${r.academic_year}` : ''}
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
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-2 mt-4 flex items-center gap-1"><Trophy size={14} className="text-amber-500"/> Awards</h3>
        {loading ? null : awards.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-6 text-center text-sm text-gray-500">No awards yet.</div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {awards.map(a=>(
              <li key={a.id} className="bg-white border border-gray-200 rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <Trophy size={16} className="text-amber-500 flex-shrink-0"/>
                  <div className="text-sm font-semibold text-gray-900 truncate">{a.title}</div>
                </div>
                <div className="text-xs text-gray-500 mt-1">{a.date_awarded}{a.issuer ? ` · ${a.issuer}` : ''}</div>
                {a.description && <div className="text-xs text-gray-600 mt-1">{a.description}</div>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
