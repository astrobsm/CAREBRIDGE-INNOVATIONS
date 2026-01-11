/**
 * Calibration Ruler PDF Generator
 * AstroHEALTH Innovations in Healthcare
 * 
 * Generates printable calibration rulers on A4 paper for wound measurement
 * Each ruler has 0.5mm grid markings for precise wound measurement
 */

import jsPDF from 'jspdf';
import { PDF_COLORS } from './pdfUtils';
import { PDF_FONTS } from './pdfConfig';

// A4 dimensions in mm
const A4_WIDTH = 210;
const A4_HEIGHT = 297;

// Margin in mm
const MARGIN = 10;

// Grid spacing in mm
const GRID_SPACING = 0.5;

// Ruler configurations for different types
interface RulerConfig {
  name: string;
  description: string;
  width: number;  // in mm
  height: number; // in mm
  majorMarks: number; // every X mm for major marks (cm marks)
  minorMarks: number; // every X mm for minor marks
}

const rulerConfigs: RulerConfig[] = [
  {
    name: '15cm Standard Ruler',
    description: 'General purpose wound measurement ruler',
    width: 150,
    height: 25,
    majorMarks: 10,
    minorMarks: 5,
  },
  {
    name: '10cm Compact Ruler',
    description: 'For smaller wounds and tight spaces',
    width: 100,
    height: 20,
    majorMarks: 10,
    minorMarks: 5,
  },
  {
    name: '5cm Mini Ruler',
    description: 'For precision measurement of small wounds',
    width: 50,
    height: 15,
    majorMarks: 10,
    minorMarks: 5,
  },
  {
    name: 'L-Shaped Corner Ruler',
    description: 'For measuring wound length and width simultaneously',
    width: 80,
    height: 80,
    majorMarks: 10,
    minorMarks: 5,
  },
];

// Function to draw a single ruler with 0.5mm grid
function drawRuler(
  doc: jsPDF,
  x: number,
  y: number,
  config: RulerConfig,
  isLShaped: boolean = false
): { width: number; height: number } {
  const { width, height, majorMarks, minorMarks, name } = config;
  
  // Set line properties
  doc.setDrawColor(0, 0, 0);
  
  if (isLShaped) {
    // Draw L-shaped ruler
    const armWidth = 20;
    const armLength = width;
    
    // Outer border of L-shape
    doc.setLineWidth(0.3);
    
    // Horizontal arm
    doc.rect(x, y + armLength - armWidth, armLength, armWidth);
    
    // Vertical arm
    doc.rect(x, y, armWidth, armLength);
    
    // Draw grid on horizontal arm (0.5mm spacing)
    doc.setLineWidth(0.05);
    doc.setDrawColor(200, 200, 200);
    for (let i = 0; i <= armLength; i += GRID_SPACING) {
      const posX = x + i;
      doc.line(posX, y + armLength - armWidth, posX, y + armLength);
    }
    for (let i = 0; i <= armWidth; i += GRID_SPACING) {
      const posY = y + armLength - armWidth + i;
      doc.line(x, posY, x + armLength, posY);
    }
    
    // Draw grid on vertical arm (0.5mm spacing)
    for (let i = 0; i <= armLength - armWidth; i += GRID_SPACING) {
      const posY = y + i;
      doc.line(x, posY, x + armWidth, posY);
    }
    for (let i = 0; i <= armWidth; i += GRID_SPACING) {
      const posX = x + i;
      doc.line(posX, y, posX, y + armLength - armWidth);
    }
    
    // Draw measurement marks on horizontal arm
    doc.setDrawColor(0, 0, 0);
    for (let i = 0; i <= armLength; i += 1) {
      const posX = x + i;
      let markHeight = 2;
      
      if (i % majorMarks === 0) {
        markHeight = 8;
        doc.setLineWidth(0.3);
        // Add cm label
        if (i > 0 && i < armLength) {
          doc.setFontSize(6);
          doc.setTextColor(0, 0, 0);
          doc.text(`${i / 10}`, posX, y + armLength - 2, { align: 'center' });
        }
      } else if (i % minorMarks === 0) {
        markHeight = 5;
        doc.setLineWidth(0.2);
      } else {
        markHeight = 3;
        doc.setLineWidth(0.1);
      }
      
      doc.line(posX, y + armLength - armWidth, posX, y + armLength - armWidth + markHeight);
    }
    
    // Draw measurement marks on vertical arm
    for (let i = 0; i <= armLength - armWidth; i += 1) {
      const posY = y + i;
      let markWidth = 2;
      
      if (i % majorMarks === 0) {
        markWidth = 8;
        doc.setLineWidth(0.3);
        // Add cm label
        if (i > 0) {
          doc.setFontSize(6);
          doc.setTextColor(0, 0, 0);
          doc.text(`${i / 10}`, x + 10, posY + 1, { align: 'center' });
        }
      } else if (i % minorMarks === 0) {
        markWidth = 5;
        doc.setLineWidth(0.2);
      } else {
        markWidth = 3;
        doc.setLineWidth(0.1);
      }
      
      doc.line(x, posY, x + markWidth, posY);
    }
    
    // Add name label in corner
    doc.setFontSize(5);
    doc.setTextColor(100, 100, 100);
    doc.text(name, x + 3, y + armLength - 3);
    
    return { width: armLength, height: armLength };
  } else {
    // Regular rectangular ruler
    
    // Draw outer border
    doc.setLineWidth(0.3);
    doc.rect(x, y, width, height);
    
    // Draw 0.5mm grid
    doc.setLineWidth(0.05);
    doc.setDrawColor(220, 220, 220);
    
    // Vertical grid lines (0.5mm apart)
    for (let i = 0; i <= width; i += GRID_SPACING) {
      const posX = x + i;
      doc.line(posX, y, posX, y + height);
    }
    
    // Horizontal grid lines (0.5mm apart)
    for (let i = 0; i <= height; i += GRID_SPACING) {
      const posY = y + i;
      doc.line(x, posY, x + width, posY);
    }
    
    // Draw measurement marks
    doc.setDrawColor(0, 0, 0);
    for (let i = 0; i <= width; i += 1) {
      const posX = x + i;
      let markHeight = 2;
      
      if (i % majorMarks === 0) {
        markHeight = height * 0.5;
        doc.setLineWidth(0.4);
        // Add cm label
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
        doc.text(`${i / 10}`, posX, y + height - 2, { align: 'center' });
      } else if (i % minorMarks === 0) {
        markHeight = height * 0.35;
        doc.setLineWidth(0.25);
      } else {
        markHeight = height * 0.2;
        doc.setLineWidth(0.1);
      }
      
      // Top marks
      doc.line(posX, y, posX, y + markHeight);
      // Bottom marks (inverted)
      doc.line(posX, y + height, posX, y + height - markHeight);
    }
    
    // Add ruler name and description
    doc.setFontSize(6);
    doc.setTextColor(100, 100, 100);
    doc.text(name, x + width / 2, y + height / 2 - 1, { align: 'center' });
    doc.setFontSize(4);
    doc.text('AstroHEALTH - Cut along outer border', x + width / 2, y + height / 2 + 2, { align: 'center' });
    
    return { width, height };
  }
}

// Draw cutting guides (dashed lines)
function drawCuttingGuide(doc: jsPDF, x: number, y: number, width: number, height: number): void {
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.2);
  doc.setLineDashPattern([2, 2], 0);
  doc.rect(x - 2, y - 2, width + 4, height + 4);
  doc.setLineDashPattern([], 0);
}

// Generate 15cm rulers page
function generate15cmRulersPage(doc: jsPDF): void {
  const config = rulerConfigs[0]; // 15cm ruler
  const rulerHeight = config.height;
  const rulerWidth = config.width;
  const spacing = 8;
  
  let currentY = MARGIN + 20;
  
  // Page title
  doc.setFontSize(14);
  doc.setTextColor(...PDF_COLORS.primary);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('15cm Calibration Rulers - Standard Size', A4_WIDTH / 2, MARGIN + 10, { align: 'center' });
  
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text('Print at 100% scale (no scaling) • Cut along dashed lines • 0.5mm grid for precision', A4_WIDTH / 2, MARGIN + 16, { align: 'center' });
  
  // Calculate how many rulers fit
  const maxRulers = Math.floor((A4_HEIGHT - MARGIN * 2 - 25) / (rulerHeight + spacing));
  
  for (let i = 0; i < maxRulers; i++) {
    const x = (A4_WIDTH - rulerWidth) / 2;
    const y = currentY;
    
    drawCuttingGuide(doc, x, y, rulerWidth, rulerHeight);
    drawRuler(doc, x, y, config);
    
    currentY += rulerHeight + spacing;
  }
  
  // Footer
  doc.setFontSize(6);
  doc.setTextColor(150, 150, 150);
  doc.text(`CareBridge Innovations in Healthcare • Generated: ${new Date().toLocaleDateString()}`, A4_WIDTH / 2, A4_HEIGHT - 5, { align: 'center' });
}

// Generate 10cm compact rulers page
function generate10cmRulersPage(doc: jsPDF): void {
  const config = rulerConfigs[1]; // 10cm ruler
  const rulerHeight = config.height;
  const rulerWidth = config.width;
  const spacingX = 6;
  const spacingY = 6;
  
  let currentY = MARGIN + 20;
  
  // Page title
  doc.setFontSize(14);
  doc.setTextColor(...PDF_COLORS.primary);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('10cm Calibration Rulers - Compact Size', A4_WIDTH / 2, MARGIN + 10, { align: 'center' });
  
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text('Print at 100% scale (no scaling) • Cut along dashed lines • 0.5mm grid for precision', A4_WIDTH / 2, MARGIN + 16, { align: 'center' });
  
  // 2 columns of rulers
  const colWidth = rulerWidth + spacingX;
  const startX = (A4_WIDTH - colWidth * 2 + spacingX) / 2;
  
  const maxRows = Math.floor((A4_HEIGHT - MARGIN * 2 - 25) / (rulerHeight + spacingY));
  
  for (let row = 0; row < maxRows; row++) {
    for (let col = 0; col < 2; col++) {
      const x = startX + col * colWidth;
      const y = currentY;
      
      drawCuttingGuide(doc, x, y, rulerWidth, rulerHeight);
      drawRuler(doc, x, y, config);
    }
    currentY += rulerHeight + spacingY;
  }
  
  // Footer
  doc.setFontSize(6);
  doc.setTextColor(150, 150, 150);
  doc.text(`CareBridge Innovations in Healthcare • Generated: ${new Date().toLocaleDateString()}`, A4_WIDTH / 2, A4_HEIGHT - 5, { align: 'center' });
}

// Generate 5cm mini rulers page
function generate5cmRulersPage(doc: jsPDF): void {
  const config = rulerConfigs[2]; // 5cm ruler
  const rulerHeight = config.height;
  const rulerWidth = config.width;
  const spacingX = 5;
  const spacingY = 5;
  
  let currentY = MARGIN + 20;
  
  // Page title
  doc.setFontSize(14);
  doc.setTextColor(...PDF_COLORS.primary);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('5cm Calibration Rulers - Mini Size', A4_WIDTH / 2, MARGIN + 10, { align: 'center' });
  
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text('Print at 100% scale (no scaling) • Cut along dashed lines • 0.5mm grid for precision', A4_WIDTH / 2, MARGIN + 16, { align: 'center' });
  
  // 3 columns of rulers
  const colWidth = rulerWidth + spacingX;
  const startX = (A4_WIDTH - colWidth * 3 + spacingX) / 2;
  
  const maxRows = Math.floor((A4_HEIGHT - MARGIN * 2 - 25) / (rulerHeight + spacingY));
  
  for (let row = 0; row < maxRows; row++) {
    for (let col = 0; col < 3; col++) {
      const x = startX + col * colWidth;
      const y = currentY;
      
      drawCuttingGuide(doc, x, y, rulerWidth, rulerHeight);
      drawRuler(doc, x, y, config);
    }
    currentY += rulerHeight + spacingY;
  }
  
  // Footer
  doc.setFontSize(6);
  doc.setTextColor(150, 150, 150);
  doc.text(`CareBridge Innovations in Healthcare • Generated: ${new Date().toLocaleDateString()}`, A4_WIDTH / 2, A4_HEIGHT - 5, { align: 'center' });
}

// Generate L-shaped rulers page
function generateLShapedRulersPage(doc: jsPDF): void {
  const config = rulerConfigs[3]; // L-shaped ruler
  const rulerSize = 80;
  const spacing = 10;
  
  // Page title
  doc.setFontSize(14);
  doc.setTextColor(...PDF_COLORS.primary);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('L-Shaped Corner Rulers - For Length & Width', A4_WIDTH / 2, MARGIN + 10, { align: 'center' });
  
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text('Print at 100% scale (no scaling) • Cut along dashed lines • 0.5mm grid for precision', A4_WIDTH / 2, MARGIN + 16, { align: 'center' });
  
  // 2 L-shaped rulers side by side
  const startY = MARGIN + 25;
  const colWidth = rulerSize + spacing;
  const startX = (A4_WIDTH - colWidth * 2 + spacing) / 2;
  
  // First row
  for (let col = 0; col < 2; col++) {
    const x = startX + col * colWidth;
    const y = startY;
    
    drawCuttingGuide(doc, x, y, rulerSize, rulerSize);
    drawRuler(doc, x, y, config, true);
  }
  
  // Second row
  const secondRowY = startY + rulerSize + spacing;
  for (let col = 0; col < 2; col++) {
    const x = startX + col * colWidth;
    const y = secondRowY;
    
    drawCuttingGuide(doc, x, y, rulerSize, rulerSize);
    drawRuler(doc, x, y, config, true);
  }
  
  // Third row
  const thirdRowY = secondRowY + rulerSize + spacing;
  for (let col = 0; col < 2; col++) {
    const x = startX + col * colWidth;
    const y = thirdRowY;
    
    drawCuttingGuide(doc, x, y, rulerSize, rulerSize);
    drawRuler(doc, x, y, config, true);
  }
  
  // Usage instructions
  const instructionsY = thirdRowY + rulerSize + 15;
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.dark);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('How to Use:', MARGIN, instructionsY);
  
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.setFontSize(8);
  const instructions = [
    '1. Place the L-shaped ruler at the wound corner',
    '2. Align one arm along the wound length',
    '3. Read width from the perpendicular arm',
    '4. Record measurements in centimeters',
  ];
  
  instructions.forEach((instruction, i) => {
    doc.text(instruction, MARGIN, instructionsY + 5 + i * 4);
  });
  
  // Footer
  doc.setFontSize(6);
  doc.setTextColor(150, 150, 150);
  doc.text(`CareBridge Innovations in Healthcare • Generated: ${new Date().toLocaleDateString()}`, A4_WIDTH / 2, A4_HEIGHT - 5, { align: 'center' });
}

// Generate grid reference page (pure 0.5mm grid for calibration verification)
function generateGridReferencePage(doc: jsPDF): void {
  // Page title
  doc.setFontSize(14);
  doc.setTextColor(...PDF_COLORS.primary);
  doc.setFont(PDF_FONTS.primary, 'bold');
  doc.text('0.5mm Grid Reference Sheet', A4_WIDTH / 2, MARGIN + 10, { align: 'center' });
  
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont(PDF_FONTS.primary, 'normal');
  doc.text('Use this sheet to verify print accuracy • Each small square = 0.5mm × 0.5mm', A4_WIDTH / 2, MARGIN + 16, { align: 'center' });
  
  // Draw grid area
  const gridX = MARGIN + 10;
  const gridY = MARGIN + 25;
  const gridWidth = A4_WIDTH - MARGIN * 2 - 20;
  const gridHeight = A4_HEIGHT - MARGIN * 2 - 50;
  
  // Outer border
  doc.setLineWidth(0.5);
  doc.setDrawColor(0, 0, 0);
  doc.rect(gridX, gridY, gridWidth, gridHeight);
  
  // Draw 0.5mm grid
  doc.setLineWidth(0.05);
  doc.setDrawColor(200, 200, 200);
  
  for (let i = 0; i <= gridWidth; i += GRID_SPACING) {
    doc.line(gridX + i, gridY, gridX + i, gridY + gridHeight);
  }
  
  for (let i = 0; i <= gridHeight; i += GRID_SPACING) {
    doc.line(gridX, gridY + i, gridX + gridWidth, gridY + i);
  }
  
  // Draw 1mm grid (darker)
  doc.setLineWidth(0.1);
  doc.setDrawColor(180, 180, 180);
  
  for (let i = 0; i <= gridWidth; i += 1) {
    doc.line(gridX + i, gridY, gridX + i, gridY + gridHeight);
  }
  
  for (let i = 0; i <= gridHeight; i += 1) {
    doc.line(gridX, gridY + i, gridX + gridWidth, gridY + i);
  }
  
  // Draw cm grid (even darker with labels)
  doc.setLineWidth(0.3);
  doc.setDrawColor(100, 100, 100);
  
  for (let i = 0; i <= gridWidth; i += 10) {
    doc.line(gridX + i, gridY, gridX + i, gridY + gridHeight);
    // Label
    if (i > 0 && i < gridWidth) {
      doc.setFontSize(6);
      doc.setTextColor(0, 0, 0);
      doc.text(`${i / 10}`, gridX + i, gridY - 2, { align: 'center' });
    }
  }
  
  for (let i = 0; i <= gridHeight; i += 10) {
    doc.line(gridX, gridY + i, gridX + gridWidth, gridY + i);
    // Label
    if (i > 0 && i < gridHeight) {
      doc.setFontSize(6);
      doc.setTextColor(0, 0, 0);
      doc.text(`${i / 10}`, gridX - 3, gridY + i + 1, { align: 'right' });
    }
  }
  
  // Legend
  const legendY = gridY + gridHeight + 8;
  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);
  
  // Light gray = 0.5mm
  doc.setFillColor(200, 200, 200);
  doc.rect(MARGIN + 10, legendY, 5, 3, 'F');
  doc.text('= 0.5mm grid', MARGIN + 17, legendY + 2.5);
  
  // Medium gray = 1mm
  doc.setFillColor(180, 180, 180);
  doc.rect(MARGIN + 50, legendY, 5, 3, 'F');
  doc.text('= 1mm grid', MARGIN + 57, legendY + 2.5);
  
  // Dark gray = 1cm
  doc.setFillColor(100, 100, 100);
  doc.rect(MARGIN + 85, legendY, 5, 3, 'F');
  doc.text('= 1cm grid', MARGIN + 92, legendY + 2.5);
  
  // Footer
  doc.setFontSize(6);
  doc.setTextColor(150, 150, 150);
  doc.text(`CareBridge Innovations in Healthcare • Generated: ${new Date().toLocaleDateString()}`, A4_WIDTH / 2, A4_HEIGHT - 5, { align: 'center' });
}

// Main export function to generate complete calibration ruler PDF
export function generateCalibrationRulerPDF(): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  
  const pageWidth = A4_WIDTH;
  const pageHeight = A4_HEIGHT;
  
  // CRITICAL: Ensure white background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Page 1: 15cm Standard Rulers
  generate15cmRulersPage(doc);
  
  // Page 2: 10cm Compact Rulers
  doc.addPage();
  generate10cmRulersPage(doc);
  
  // Page 3: 5cm Mini Rulers
  doc.addPage();
  generate5cmRulersPage(doc);
  
  // Page 4: L-Shaped Corner Rulers
  doc.addPage();
  generateLShapedRulersPage(doc);
  
  // Page 5: Grid Reference Sheet
  doc.addPage();
  generateGridReferencePage(doc);
  
  // Save the PDF
  doc.save('CareBridge_Wound_Calibration_Rulers.pdf');
}

// Export individual page generators for specific needs
export {
  generate15cmRulersPage,
  generate10cmRulersPage,
  generate5cmRulersPage,
  generateLShapedRulersPage,
  generateGridReferencePage,
};
