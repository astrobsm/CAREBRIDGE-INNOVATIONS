// Meal Plan PDF Generator
// Generates professional meal plan PDFs with CareBridge branding
// Supports download and WhatsApp sharing

import jsPDF from 'jspdf';
import { format } from 'date-fns';
import {
  addBrandedHeader,
  addBrandedFooter,
  addSectionTitle,
  checkNewPage,
  PDF_COLORS,
} from './pdfUtils';
import { PDF_FONTS } from './pdfConfig';

// ==================== TYPES ====================

export interface MealPlanPDFOptions {
  patientName?: string;
  hospitalNumber?: string;
  age?: number;
  gender?: string;
  weight?: number;
  height?: number;
  diagnosis?: string;
  
  planType: 'wound_healing' | 'weight_loss' | 'weight_gain' | 'clinical_nutrition' | 'general';
  
  // Nutritional targets
  calorieTarget: number;
  proteinTarget: number;
  fluidTarget?: number;
  vitaminCTarget?: number;
  zincTarget?: number;
  
  // Meal plan details
  mealPlan: {
    breakfast: string[];
    midMorning?: string[];
    lunch: string[];
    afternoon?: string[];
    dinner: string[];
    evening?: string[];
    bedtime?: string[];
  };
  
  // Additional info
  proteinFoods?: string[];
  vitaminCFoods?: string[];
  zincFoods?: string[];
  foodsToEat?: string[];
  foodsToAvoid?: string[];
  supplements?: string[];
  hydrationTips?: string[];
  exerciseRecommendations?: string[];
  warnings?: string[];
  
  // Specific result info
  woundType?: string;
  woundGrade?: string;
  healingStage?: string;
  estimatedHealingTime?: string;
  
  // Weight management
  currentBMI?: number;
  targetBMI?: number;
  weightChange?: number;
  weeksNeeded?: number;
  dailyDeficit?: number;
}

// ==================== PDF GENERATOR ====================

export function generateMealPlanPDF(options: MealPlanPDFOptions): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // CRITICAL: Ensure white background
  doc.setFillColor(...PDF_COLORS.white);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Plan type titles
  const planTitles: Record<string, string> = {
    wound_healing: 'Wound Healing Meal Plan',
    weight_loss: 'Weight Loss Meal Plan',
    weight_gain: 'Weight Gain Meal Plan',
    clinical_nutrition: 'Clinical Nutrition Plan',
    general: 'Personalized Meal Plan',
  };
  
  // Add header
  let y = addBrandedHeader(doc, {
    title: planTitles[options.planType] || 'Meal Plan',
    subtitle: `Generated on ${format(new Date(), 'MMMM d, yyyy')}`,
    hospitalName: 'CareBridge Innovations in Healthcare',
    hospitalPhone: '09028724839',
    hospitalEmail: 'info.carebridge@gmail.com',
  });

  // Patient info box if available
  if (options.patientName) {
    doc.setFillColor(240, 253, 244); // Light green
    doc.roundedRect(15, y, pageWidth - 30, 25, 3, 3, 'F');
    doc.setDrawColor(...PDF_COLORS.success);
    doc.roundedRect(15, y, pageWidth - 30, 25, 3, 3, 'S');
    
    doc.setTextColor(...PDF_COLORS.dark);
    doc.setFontSize(10);
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.text('Patient:', 20, y + 8);
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.text(options.patientName, 40, y + 8);
    
    if (options.hospitalNumber) {
      doc.setFont(PDF_FONTS.primary, 'bold');
      doc.text('Hospital No:', 100, y + 8);
      doc.setFont(PDF_FONTS.primary, 'normal');
      doc.text(options.hospitalNumber, 125, y + 8);
    }
    
    const details: string[] = [];
    if (options.age) details.push(`Age: ${options.age} yrs`);
    if (options.gender) details.push(`Gender: ${options.gender}`);
    if (options.weight) details.push(`Weight: ${options.weight} kg`);
    if (options.height) details.push(`Height: ${options.height} cm`);
    
    if (details.length > 0) {
      doc.text(details.join('  |  '), 20, y + 16);
    }
    
    if (options.diagnosis) {
      doc.setFont(PDF_FONTS.primary, 'bold');
      doc.text('Diagnosis:', 20, y + 22);
      doc.setFont(PDF_FONTS.primary, 'normal');
      doc.text(options.diagnosis, 45, y + 22);
    }
    
    y += 32;
  }

  // Nutritional Targets Summary
  y = addSectionTitle(doc, y, 'Daily Nutritional Targets', 'success');
  
  // Create boxes for targets
  const boxWidth = (pageWidth - 40) / 4;
  const targets = [
    { label: 'Calories', value: `${options.calorieTarget}`, unit: 'kcal', color: [255, 237, 213] as [number, number, number] },
    { label: 'Protein', value: `${options.proteinTarget}`, unit: 'g', color: [254, 226, 226] as [number, number, number] },
    { label: 'Fluids', value: options.fluidTarget ? `${Math.round(options.fluidTarget / 1000)}` : '-', unit: 'L', color: [219, 234, 254] as [number, number, number] },
    { label: options.vitaminCTarget ? 'Vitamin C' : 'Fiber', value: options.vitaminCTarget ? `${options.vitaminCTarget}` : '25-30', unit: 'mg/g', color: [254, 249, 195] as [number, number, number] },
  ];
  
  targets.forEach((target, i) => {
    const x = 15 + (i * boxWidth) + (i * 3);
    doc.setFillColor(...target.color);
    doc.roundedRect(x, y, boxWidth, 20, 2, 2, 'F');
    
    doc.setTextColor(...PDF_COLORS.dark);
    doc.setFontSize(14);
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.text(target.value, x + boxWidth / 2, y + 10, { align: 'center' });
    
    doc.setFontSize(8);
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.text(`${target.label} (${target.unit})`, x + boxWidth / 2, y + 17, { align: 'center' });
  });
  
  y += 28;

  // Wound-specific info
  if (options.planType === 'wound_healing' && options.woundType) {
    doc.setFillColor(254, 243, 199); // Light yellow
    doc.roundedRect(15, y, pageWidth - 30, 16, 2, 2, 'F');
    
    doc.setTextColor(...PDF_COLORS.dark);
    doc.setFontSize(9);
    const woundInfo = [
      `Wound Type: ${options.woundType}`,
      options.woundGrade ? `Severity: ${options.woundGrade}` : '',
      options.healingStage ? `Stage: ${options.healingStage}` : '',
      options.estimatedHealingTime ? `Est. Healing: ${options.estimatedHealingTime}` : '',
    ].filter(Boolean).join('  |  ');
    doc.text(woundInfo, pageWidth / 2, y + 10, { align: 'center' });
    y += 22;
  }

  // Weight management info
  if ((options.planType === 'weight_loss' || options.planType === 'weight_gain') && options.weightChange) {
    doc.setFillColor(219, 234, 254); // Light blue
    doc.roundedRect(15, y, pageWidth - 30, 16, 2, 2, 'F');
    
    doc.setTextColor(...PDF_COLORS.dark);
    doc.setFontSize(9);
    const weightInfo = [
      `Target: ${options.planType === 'weight_loss' ? 'Lose' : 'Gain'} ${options.weightChange} kg`,
      options.currentBMI ? `Current BMI: ${options.currentBMI}` : '',
      options.targetBMI ? `Target BMI: ${options.targetBMI}` : '',
      options.weeksNeeded ? `Timeline: ${options.weeksNeeded} weeks` : '',
      options.dailyDeficit ? `Daily ${options.planType === 'weight_loss' ? 'Deficit' : 'Surplus'}: ${Math.abs(options.dailyDeficit)} kcal` : '',
    ].filter(Boolean).join('  |  ');
    doc.text(weightInfo, pageWidth / 2, y + 10, { align: 'center' });
    y += 22;
  }

  // Daily Meal Plan
  y = checkNewPage(doc, y, 80);
  y = addSectionTitle(doc, y, 'Daily Meal Plan (African Foods)', 'success');
  
  const mealSections = [
    { name: '🌅 Breakfast', items: options.mealPlan.breakfast },
    { name: '🍎 Mid-Morning Snack', items: options.mealPlan.midMorning },
    { name: '☀️ Lunch', items: options.mealPlan.lunch },
    { name: '🍇 Afternoon Snack', items: options.mealPlan.afternoon },
    { name: '🌙 Dinner', items: options.mealPlan.dinner },
    { name: '🌃 Evening', items: options.mealPlan.evening },
    { name: '😴 Bedtime', items: options.mealPlan.bedtime },
  ].filter(section => section.items && section.items.length > 0);

  // Two-column layout for meals
  const colWidth = (pageWidth - 40) / 2;
  let col = 0;
  let colY = y;
  
  mealSections.forEach((section, index) => {
    const itemsHeight = 10 + (section.items!.length * 5);
    
    // Check if we need a new page
    if (colY + itemsHeight > pageHeight - 30) {
      if (col === 0) {
        col = 1;
        colY = y;
      } else {
        doc.addPage();
        y = 20;
        colY = y;
        col = 0;
        addBrandedFooter(doc, doc.getNumberOfPages(), undefined, 'CareBridge Innovations - Nutrition Department');
      }
    }
    
    const x = 15 + (col * (colWidth + 10));
    
    // Meal section box
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(x, colY, colWidth, itemsHeight, 2, 2, 'F');
    
    // Meal title
    doc.setTextColor(...PDF_COLORS.success);
    doc.setFontSize(10);
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.text(section.name, x + 3, colY + 6);
    
    // Meal items
    doc.setTextColor(...PDF_COLORS.dark);
    doc.setFontSize(8);
    doc.setFont(PDF_FONTS.primary, 'normal');
    
    section.items!.forEach((item, i) => {
      const cleanItem = item.replace(/[🥚🐟🍗🐄🐐🫘🥜🥛🐌🦐🍊🥭🍋🍈🥒🍅🫑🥬🥗🍍🥩🦪🐔🌾❌]/g, '').trim();
      const truncatedItem = cleanItem.length > 45 ? cleanItem.substring(0, 42) + '...' : cleanItem;
      doc.text(`• ${truncatedItem}`, x + 3, colY + 12 + (i * 5));
    });
    
    colY += itemsHeight + 4;
    
    // Switch to second column after 3 meals
    if (index === 2 && col === 0) {
      col = 1;
      colY = y;
    }
  });
  
  y = Math.max(colY, y) + 10;

  // Protein-Rich Foods
  if (options.proteinFoods && options.proteinFoods.length > 0) {
    y = checkNewPage(doc, y, 40);
    y = addSectionTitle(doc, y, 'Protein-Rich Foods for Healing', 'danger');
    
    doc.setTextColor(...PDF_COLORS.dark);
    doc.setFontSize(8);
    doc.setFont(PDF_FONTS.primary, 'normal');
    
    options.proteinFoods.slice(0, 6).forEach((food, i) => {
      const cleanFood = food.replace(/[🥚🐟🍗🐄🐐🫘🥜🥛🐌🦐]/g, '').trim();
      doc.text(`• ${cleanFood}`, 15 + ((i % 2) * 95), y + (Math.floor(i / 2) * 5));
    });
    y += Math.ceil(options.proteinFoods.slice(0, 6).length / 2) * 5 + 5;
  }

  // Foods to Avoid
  if (options.foodsToAvoid && options.foodsToAvoid.length > 0) {
    y = checkNewPage(doc, y, 30);
    y = addSectionTitle(doc, y, 'Foods to Limit or Avoid', 'danger');
    
    doc.setTextColor(...PDF_COLORS.dark);
    doc.setFontSize(8);
    
    options.foodsToAvoid.slice(0, 6).forEach((food, i) => {
      const cleanFood = food.replace(/❌/g, '').trim();
      doc.text(`✗ ${cleanFood}`, 15, y + (i * 5));
    });
    y += options.foodsToAvoid.slice(0, 6).length * 5 + 5;
  }

  // Hydration Tips
  if (options.hydrationTips && options.hydrationTips.length > 0) {
    y = checkNewPage(doc, y, 30);
    y = addSectionTitle(doc, y, 'Hydration Guidelines', 'info');
    
    doc.setTextColor(...PDF_COLORS.dark);
    doc.setFontSize(8);
    
    options.hydrationTips.slice(0, 4).forEach((tip, i) => {
      doc.text(`💧 ${tip}`, 15, y + (i * 5));
    });
    y += options.hydrationTips.slice(0, 4).length * 5 + 5;
  }

  // Supplements
  if (options.supplements && options.supplements.length > 0) {
    y = checkNewPage(doc, y, 25);
    y = addSectionTitle(doc, y, 'Recommended Supplements', 'info');
    
    doc.setTextColor(...PDF_COLORS.dark);
    doc.setFontSize(8);
    
    options.supplements.forEach((supp, i) => {
      doc.text(`💊 ${supp}`, 15, y + (i * 5));
    });
    y += options.supplements.length * 5 + 5;
  }

  // Exercise Recommendations
  if (options.exerciseRecommendations && options.exerciseRecommendations.length > 0) {
    y = checkNewPage(doc, y, 30);
    y = addSectionTitle(doc, y, 'Exercise Recommendations', 'success');
    
    doc.setTextColor(...PDF_COLORS.dark);
    doc.setFontSize(8);
    
    options.exerciseRecommendations.slice(0, 5).forEach((rec, i) => {
      doc.text(`🏃 ${rec}`, 15, y + (i * 5));
    });
    y += options.exerciseRecommendations.slice(0, 5).length * 5 + 5;
  }

  // Warnings
  if (options.warnings && options.warnings.length > 0) {
    y = checkNewPage(doc, y, 25);
    
    doc.setFillColor(254, 226, 226);
    const warningsHeight = 8 + (options.warnings.length * 5);
    doc.roundedRect(15, y, pageWidth - 30, warningsHeight, 2, 2, 'F');
    
    doc.setTextColor(220, 38, 38);
    doc.setFontSize(9);
    doc.setFont(PDF_FONTS.primary, 'bold');
    doc.text('⚠️ Clinical Considerations:', 20, y + 6);
    
    doc.setFont(PDF_FONTS.primary, 'normal');
    doc.setFontSize(8);
    options.warnings.forEach((warning, i) => {
      doc.text(`• ${warning}`, 20, y + 12 + (i * 5));
    });
  }

  // Add footer
  addBrandedFooter(doc, 1, 1, 'CareBridge Innovations in Healthcare - Nutrition Department');

  return doc;
}

// ==================== DOWNLOAD FUNCTION ====================

export function downloadMealPlanPDF(options: MealPlanPDFOptions): void {
  const doc = generateMealPlanPDF(options);
  
  const planTypeNames: Record<string, string> = {
    wound_healing: 'Wound_Healing',
    weight_loss: 'Weight_Loss',
    weight_gain: 'Weight_Gain',
    general: 'Nutrition',
  };
  
  const planName = planTypeNames[options.planType] || 'Meal_Plan';
  const patientName = options.patientName?.replace(/\s+/g, '_') || 'Patient';
  const date = format(new Date(), 'yyyy-MM-dd');
  
  doc.save(`CareBridge_${planName}_${patientName}_${date}.pdf`);
}

// ==================== WHATSAPP SHARE FUNCTION ====================

export async function shareMealPlanOnWhatsApp(options: MealPlanPDFOptions): Promise<void> {
  const doc = generateMealPlanPDF(options);
  
  // Generate blob
  const pdfBlob = doc.output('blob');
  
  // Create a summary message for WhatsApp
  const planTypeNames: Record<string, string> = {
    wound_healing: 'Wound Healing',
    weight_loss: 'Weight Loss',
    weight_gain: 'Weight Gain',
    general: 'Nutrition',
  };
  
  const planName = planTypeNames[options.planType] || 'Meal Plan';
  
  let message = `🍽️ *${planName} Meal Plan*\n`;
  message += `📅 Date: ${format(new Date(), 'MMMM d, yyyy')}\n`;
  if (options.patientName) message += `👤 Patient: ${options.patientName}\n`;
  message += `\n📊 *Daily Targets:*\n`;
  message += `• Calories: ${options.calorieTarget} kcal\n`;
  message += `• Protein: ${options.proteinTarget}g\n`;
  if (options.fluidTarget) message += `• Fluids: ${Math.round(options.fluidTarget / 1000)}L\n`;
  
  message += `\n🥗 *Sample Meals:*\n`;
  if (options.mealPlan.breakfast.length > 0) {
    message += `• Breakfast: ${options.mealPlan.breakfast[0].replace(/[🥚🐟🍗🐄🐐🫘🥜🥛🐌🦐❌]/g, '').substring(0, 40)}\n`;
  }
  if (options.mealPlan.lunch.length > 0) {
    message += `• Lunch: ${options.mealPlan.lunch[0].replace(/[🥚🐟🍗🐄🐐🫘🥜🥛🐌🦐❌]/g, '').substring(0, 40)}\n`;
  }
  if (options.mealPlan.dinner.length > 0) {
    message += `• Dinner: ${options.mealPlan.dinner[0].replace(/[🥚🐟🍗🐄🐐🫘🥜🥛🐌🦐❌]/g, '').substring(0, 40)}\n`;
  }
  
  message += `\n📱 Generated by CareBridge Innovations in Healthcare`;
  
  // Check if Web Share API is available and supports files
  if (navigator.share && navigator.canShare) {
    const file = new File([pdfBlob], `MealPlan_${format(new Date(), 'yyyy-MM-dd')}.pdf`, { type: 'application/pdf' });
    
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: `${planName} Meal Plan`,
          text: message,
          files: [file],
        });
        return;
      } catch (error) {
        // User cancelled or error - fall through to WhatsApp URL method
        console.log('Share cancelled or failed, trying WhatsApp URL');
      }
    }
  }
  
  // Fallback: Open WhatsApp with message (without file)
  // First save the PDF for user to attach manually
  downloadMealPlanPDF(options);
  
  // Then open WhatsApp with message
  const encodedMessage = encodeURIComponent(message + '\n\n📎 PDF downloaded - please attach it manually');
  const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
  
  window.open(whatsappUrl, '_blank');
}
