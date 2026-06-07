// Weekly duty / task schedule PDF for the Family domain.
// Produces an A4 landscape PDF: one section per child, plus a master grid.
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Child, Task, TaskAssignment } from '../types';

export interface AssignmentRow extends TaskAssignment {
  task?: Task;
  child?: Child;
}

const DAY_LABELS_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function isoWeekStart(d: Date): Date {
  const x = new Date(d);
  const dow = x.getDay();              // 0=Sun..6=Sat
  const isoDow = dow === 0 ? 7 : dow;  // 1=Mon..7=Sun
  x.setDate(x.getDate() - (isoDow - 1));
  x.setHours(0,0,0,0);
  return x;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function freqMatchesDay(t: Task | undefined, dayIdx0to6: number, dayIdxMonFirst: number): boolean {
  if (!t || !t.frequency) return true; // assume one-off / undefined → show on its due day only
  switch (t.frequency) {
    case 'daily':    return true;
    case 'weekdays': return dayIdx0to6 >= 1 && dayIdx0to6 <= 5;
    case 'weekends': return dayIdx0to6 === 0 || dayIdx0to6 === 6;
    case 'weekly':
    case 'monthly':
    case 'once':     return false; // shown only on the row's due date logic, handled separately
    case 'custom':   return (t.days_of_week || []).includes(dayIdx0to6);
    default:         return true;
  }
}

function timeLabel(t: Task | undefined): string {
  if (!t) return '';
  const parts: string[] = [];
  if (t.scheduled_time) parts.push(t.scheduled_time.slice(0,5));
  if (t.duration_minutes) parts.push(`${t.duration_minutes}m`);
  return parts.join(' · ');
}

/** Generate the PDF and trigger a download. */
export function generateWeeklySchedulePdf(opts: {
  familyName: string;
  children: Child[];
  assignments: AssignmentRow[];
  weekStart?: Date;
}): void {
  const weekStart = isoWeekStart(opts.weekStart || new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  // Filter assignments to this week (by due_date OR completed_at). If a task
  // has no due_date we still include it (it's "ongoing this week").
  const inWeek = opts.assignments.filter(a => {
    const anchor = a.due_date || a.completed_at;
    if (!anchor) return true;
    const t = new Date(anchor);
    return t >= weekStart && t <= new Date(weekEnd.getTime() + 86_399_000);
  });

  const childIndex: Record<string, Child> = {};
  for (const c of opts.children) childIndex[c.id] = c;

  const doc = new jsPDF('l', 'mm', 'a4');           // landscape A4: 297×210mm
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 10;

  // -------- Title block --------
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
  doc.text('Weekly Duty / Task Schedule', margin, 14);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  doc.text(opts.familyName, margin, 20);
  doc.text(`Week: ${fmtDate(weekStart)} – ${fmtDate(weekEnd)}`, margin, 25);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageW - margin, 25, { align: 'right' });

  doc.setDrawColor(200);
  doc.line(margin, 28, pageW - margin, 28);

  // -------- Master grid: children × weekdays --------
  // Columns: Day | each child
  const days: { label: string; date: Date; dow0Sun: number; }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart); d.setDate(d.getDate() + i);
    // weekStart is a Monday (ISO) → i=0 Mon..i=6 Sun
    const dowMon0 = i;                  // 0=Mon..6=Sun
    const dow0Sun = (dowMon0 + 1) % 7;  // 0=Sun..6=Sat
    days.push({
      label: `${DAY_LABELS_FULL[dow0Sun]}\n${pad(d.getDate())}/${pad(d.getMonth()+1)}`,
      date: d,
      dow0Sun,
    });
  }

  const head = [['Day', ...opts.children.map(c => c.first_name)]];

  function cellFor(child: Child, dayDow0Sun: number, dayDate: Date): string {
    const items: string[] = [];
    for (const a of inWeek) {
      if (a.child_id !== child.id) continue;
      const t = a.task;
      const due = a.due_date ? new Date(a.due_date) : null;
      const isOneOff = (t?.frequency || 'once') === 'once'
                    || t?.frequency === 'weekly'
                    || t?.frequency === 'monthly';
      let show = false;
      if (isOneOff && due) {
        show = due.toDateString() === dayDate.toDateString();
      } else {
        show = freqMatchesDay(t, dayDow0Sun, dayDow0Sun);
      }
      if (!show) continue;
      const tm = timeLabel(t);
      items.push(`${tm ? `[${tm}] ` : ''}${t?.title || '(task)'}`);
    }
    return items.length ? items.join('\n') : '—';
  }

  const body: string[][] = days.map(d => [
    d.label,
    ...opts.children.map(c => cellFor(c, d.dow0Sun, d.date)),
  ]);

  autoTable(doc, {
    head,
    body,
    startY: 32,
    margin: { left: margin, right: margin },
    styles: { fontSize: 8, cellPadding: 2, valign: 'top', overflow: 'linebreak' },
    headStyles: { fillColor: [219, 39, 119], textColor: 255, halign: 'center' }, // pink-600
    columnStyles: {
      0: { cellWidth: 24, fontStyle: 'bold', halign: 'center', fillColor: [249, 250, 251] },
    },
    didDrawPage: () => {
      // Footer
      doc.setFontSize(8); doc.setTextColor(120);
      doc.text(
        'AstroHEALTH · Family · weekly schedule',
        margin,
        doc.internal.pageSize.getHeight() - 6
      );
      doc.text(
        `Page ${doc.getNumberOfPages()}`,
        pageW - margin,
        doc.internal.pageSize.getHeight() - 6,
        { align: 'right' }
      );
      doc.setTextColor(0);
    },
  });

  // -------- Per-child detail (one table each) --------
  for (const child of opts.children) {
    const childRows = inWeek.filter(a => a.child_id === child.id);
    if (!childRows.length) continue;

    doc.addPage('a4', 'l');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
    doc.text(`${child.first_name} ${child.last_name || ''}`.trim(), margin, 14);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text(`Week: ${fmtDate(weekStart)} – ${fmtDate(weekEnd)}`, margin, 20);

    autoTable(doc, {
      startY: 24,
      margin: { left: margin, right: margin },
      head: [['Task', 'Category', 'Priority', 'When', 'Days', 'Due', 'Reward', 'Penalty', 'Status']],
      body: childRows.map(r => {
        const t = r.task;
        const dow = (t?.days_of_week || []).map(i => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][i]).join('/');
        return [
          t?.title || '',
          t?.category || '',
          t?.priority || '',
          timeLabel(t) || (t?.frequency || ''),
          t?.frequency === 'custom' ? dow : (t?.frequency || ''),
          r.due_date ? new Date(r.due_date).toLocaleDateString() : '—',
          t?.reward_amount ? `₦${Number(t.reward_amount).toLocaleString()}` : '—',
          t?.penalty_amount ? `₦${Number(t.penalty_amount).toLocaleString()}` : '—',
          (r.approval_status && r.approval_status !== 'not_required')
            ? `${r.status} (${r.approval_status})`
            : r.status,
        ];
      }),
      styles: { fontSize: 8, cellPadding: 1.5, overflow: 'linebreak' },
      headStyles: { fillColor: [219, 39, 119], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 22 }, 2: { cellWidth: 18 },
        3: { cellWidth: 26 }, 4: { cellWidth: 28 },
        5: { cellWidth: 24 }, 6: { cellWidth: 22 }, 7: { cellWidth: 22 },
      },
    });
  }

  const fname = `family-schedule-${weekStart.toISOString().slice(0,10)}.pdf`;
  doc.save(fname);
}
