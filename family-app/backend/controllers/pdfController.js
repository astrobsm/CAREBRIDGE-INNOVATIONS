const PDFDocument = require('pdfkit');
const db = require('../config/db');

// Color palette matching app theme
const COLORS = {
  primary: [108, 99, 255],
  secondary: [255, 107, 157],
  success: [16, 185, 129],
  warning: [245, 158, 11],
  danger: [239, 68, 68],
  text: [30, 30, 60],
  textLight: [120, 120, 150],
  bg: [248, 249, 255],
  white: [255, 255, 255],
};

function rgbStr(arr) { return arr; }

function drawHeader(doc, title, subtitle) {
  // Purple gradient header bar
  doc.rect(0, 0, doc.page.width, 100).fill(rgbStr(COLORS.primary));
  doc.fillColor(rgbStr(COLORS.white))
     .fontSize(24).font('Helvetica-Bold')
     .text(title, 40, 30, { width: doc.page.width - 80 });
  doc.fontSize(11).font('Helvetica')
     .text(subtitle, 40, 62, { width: doc.page.width - 80 });
  doc.fillColor(rgbStr(COLORS.text));
  doc.y = 120;
}

function drawSectionTitle(doc, icon, title) {
  if (doc.y > doc.page.height - 100) doc.addPage();
  doc.moveDown(0.5);
  const y = doc.y;
  doc.rect(40, y, doc.page.width - 80, 30)
     .fill([240, 240, 255]);
  doc.fillColor(rgbStr(COLORS.primary))
     .fontSize(13).font('Helvetica-Bold')
     .text(`${icon}  ${title}`, 50, y + 8, { width: doc.page.width - 100 });
  doc.fillColor(rgbStr(COLORS.text));
  doc.y = y + 40;
}

function drawTableHeader(doc, columns) {
  if (doc.y > doc.page.height - 80) doc.addPage();
  const y = doc.y;
  doc.rect(40, y, doc.page.width - 80, 22).fill(rgbStr(COLORS.primary));
  doc.fillColor(rgbStr(COLORS.white)).fontSize(9).font('Helvetica-Bold');
  let x = 50;
  for (const col of columns) {
    doc.text(col.label, x, y + 6, { width: col.width, align: col.align || 'left' });
    x += col.width;
  }
  doc.fillColor(rgbStr(COLORS.text));
  doc.y = y + 24;
}

function drawTableRow(doc, columns, values, isAlt) {
  if (doc.y > doc.page.height - 50) {
    doc.addPage();
    drawTableHeader(doc, columns);
  }
  const y = doc.y;
  if (isAlt) {
    doc.rect(40, y, doc.page.width - 80, 20).fill([248, 248, 255]);
  }
  doc.fillColor(rgbStr(COLORS.text)).fontSize(8.5).font('Helvetica');
  let x = 50;
  for (let i = 0; i < columns.length; i++) {
    const val = values[i] != null ? String(values[i]) : '-';
    doc.text(val, x, y + 5, { width: columns[i].width, align: columns[i].align || 'left' });
    x += columns[i].width;
  }
  doc.y = y + 20;
}

function statusLabel(status) {
  if (!status) return '-';
  return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
}

exports.downloadChildPdf = async (req, res) => {
  const parentId = req.user.id;
  const childId = req.params.childId;

  try {
    // Verify child belongs to parent
    const childResult = await db.query(
      `SELECT c.*, w.balance, w.base_stipend 
       FROM children c 
       LEFT JOIN wallets w ON w.child_id = c.id 
       WHERE c.id = $1 AND c.parent_id = $2 AND c.is_active = TRUE`,
      [childId, parentId]
    );

    if (childResult.rows.length === 0) {
      return res.status(404).json({ error: 'Child not found' });
    }

    const child = childResult.rows[0];
    const childName = `${child.first_name} ${child.last_name || ''}`.trim();

    // Fetch task assignments for this child
    const tasksResult = await db.query(
      `SELECT t.title AS task_title, t.description, t.category, t.priority,
              ta.status, ta.due_date, ta.completed_at, ta.notes
       FROM task_assignments ta
       JOIN tasks t ON t.id = ta.task_id
       WHERE ta.child_id = $1 AND t.is_active = TRUE
       ORDER BY 
         CASE ta.status WHEN 'pending' THEN 1 WHEN 'in_progress' THEN 2 ELSE 3 END,
         ta.due_date ASC NULLS LAST`,
      [childId]
    );

    // Fetch chore assignments for this child
    const choresResult = await db.query(
      `SELECT ci.title AS chore_title, ci.description, ci.icon, ci.points,
              cs.title AS schedule_title, cs.start_date, cs.end_date, cs.status AS schedule_status
       FROM chore_assignments ca
       JOIN chore_items ci ON ci.id = ca.chore_item_id
       JOIN chore_schedules cs ON cs.id = ci.schedule_id
       WHERE ca.child_id = $1
       ORDER BY cs.start_date DESC, ci.title`,
      [childId]
    );

    // Fetch recent daily logs for this child
    const logsResult = await db.query(
      `SELECT ci.title AS chore_title, ci.icon, cdl.log_date, cdl.status, cdl.rating,
              cdl.parent_comment, cs.title AS schedule_title
       FROM chore_daily_logs cdl
       JOIN chore_assignments ca ON ca.id = cdl.chore_assignment_id
       JOIN chore_items ci ON ci.id = ca.chore_item_id
       JOIN chore_schedules cs ON cs.id = ci.schedule_id
       WHERE ca.child_id = $1
       ORDER BY cdl.log_date DESC, ci.title
       LIMIT 60`,
      [childId]
    );

    // Build PDF
    const doc = new PDFDocument({ 
      size: 'A4', 
      margin: 40,
      info: {
        Title: `${childName} - Tasks & Chores Report`,
        Author: 'Family App',
      }
    });

    // Set response headers
    const safeFilename = childName.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}_Report.pdf"`);
    doc.pipe(res);

    // ── Page 1: Header ──
    drawHeader(doc, `${childName}'s Report`, `Generated on ${new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`);

    // Child info summary
    const age = child.date_of_birth
      ? Math.floor((Date.now() - new Date(child.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null;

    doc.fontSize(10).font('Helvetica');
    const infoY = doc.y;
    doc.rect(40, infoY, doc.page.width - 80, 50).lineWidth(0.5).strokeColor(rgbStr(COLORS.primary)).stroke();
    doc.fillColor(rgbStr(COLORS.textLight)).text('Age:', 55, infoY + 10).fillColor(rgbStr(COLORS.text));
    doc.text(age != null ? `${age} years` : 'N/A', 130, infoY + 10);
    doc.fillColor(rgbStr(COLORS.textLight)).text('Gender:', 250, infoY + 10).fillColor(rgbStr(COLORS.text));
    doc.text(child.gender || 'N/A', 330, infoY + 10);
    doc.fillColor(rgbStr(COLORS.textLight)).text('Wallet Balance:', 55, infoY + 30).fillColor(rgbStr(COLORS.text));
    doc.text(`₦${parseFloat(child.balance || 0).toLocaleString()}`, 165, infoY + 30);
    doc.fillColor(rgbStr(COLORS.textLight)).text('Monthly Stipend:', 250, infoY + 30).fillColor(rgbStr(COLORS.text));
    doc.text(`₦${parseFloat(child.base_stipend || 0).toLocaleString()}`, 370, infoY + 30);
    doc.y = infoY + 65;

    // ── TASKS SECTION ──
    drawSectionTitle(doc, '🎯', `Assigned Tasks (${tasksResult.rows.length})`);

    if (tasksResult.rows.length === 0) {
      doc.fontSize(9).font('Helvetica').fillColor(rgbStr(COLORS.textLight))
         .text('No tasks assigned yet.', 50, doc.y);
      doc.moveDown();
    } else {
      const taskCols = [
        { label: 'Task', width: 150 },
        { label: 'Category', width: 80 },
        { label: 'Priority', width: 60 },
        { label: 'Status', width: 80 },
        { label: 'Due Date', width: 80 },
        { label: 'Notes', width: 65 },
      ];
      drawTableHeader(doc, taskCols);
      tasksResult.rows.forEach((t, i) => {
        drawTableRow(doc, taskCols, [
          t.task_title,
          statusLabel(t.category),
          statusLabel(t.priority),
          statusLabel(t.status),
          t.due_date ? new Date(t.due_date).toLocaleDateString('en-GB') : '-',
          t.notes || '-',
        ], i % 2 === 1);
      });
    }

    // ── CHORES SECTION ──
    drawSectionTitle(doc, '🧹', `Assigned Chores (${choresResult.rows.length})`);

    if (choresResult.rows.length === 0) {
      doc.fontSize(9).font('Helvetica').fillColor(rgbStr(COLORS.textLight))
         .text('No chores assigned yet.', 50, doc.y);
      doc.moveDown();
    } else {
      const choreCols = [
        { label: 'Chore', width: 130 },
        { label: 'Schedule', width: 120 },
        { label: 'Points', width: 50, align: 'center' },
        { label: 'Period', width: 130 },
        { label: 'Status', width: 85 },
      ];
      drawTableHeader(doc, choreCols);
      choresResult.rows.forEach((c, i) => {
        const period = c.start_date && c.end_date
          ? `${new Date(c.start_date).toLocaleDateString('en-GB')} - ${new Date(c.end_date).toLocaleDateString('en-GB')}`
          : '-';
        drawTableRow(doc, choreCols, [
          `${c.icon || ''} ${c.chore_title}`,
          c.schedule_title,
          c.points || '0',
          period,
          statusLabel(c.schedule_status),
        ], i % 2 === 1);
      });
    }

    // ── DAILY CHORE LOGS SECTION ──
    drawSectionTitle(doc, '📋', `Recent Daily Assessments (${logsResult.rows.length})`);

    if (logsResult.rows.length === 0) {
      doc.fontSize(9).font('Helvetica').fillColor(rgbStr(COLORS.textLight))
         .text('No daily assessments recorded yet.', 50, doc.y);
      doc.moveDown();
    } else {
      const logCols = [
        { label: 'Date', width: 80 },
        { label: 'Chore', width: 130 },
        { label: 'Schedule', width: 110 },
        { label: 'Status', width: 70 },
        { label: 'Rating', width: 50, align: 'center' },
        { label: 'Comment', width: 75 },
      ];
      drawTableHeader(doc, logCols);
      logsResult.rows.forEach((l, i) => {
        const ratingStars = l.rating ? '★'.repeat(l.rating) + '☆'.repeat(5 - l.rating) : '-';
        drawTableRow(doc, logCols, [
          new Date(l.log_date).toLocaleDateString('en-GB'),
          `${l.icon || ''} ${l.chore_title}`,
          l.schedule_title,
          statusLabel(l.status),
          ratingStars,
          l.parent_comment || '-',
        ], i % 2 === 1);
      });
    }

    // Footer on each page
    const pageCount = doc.bufferedPageRange();
    for (let i = 0; i < pageCount.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(7).font('Helvetica').fillColor(rgbStr(COLORS.textLight));
      doc.text(
        `Family App  •  Page ${i + 1} of ${pageCount.count}  •  Generated ${new Date().toLocaleDateString('en-GB')}`,
        40, doc.page.height - 30,
        { align: 'center', width: doc.page.width - 80 }
      );
    }

    doc.end();
  } catch (err) {
    console.error('PDF generation error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate PDF' });
    }
  }
};
