/**
 * WhatsApp PDF Sharing Utility
 * AstroHEALTH Innovations in Healthcare
 *
 * Provides functionality to share PDF documents directly on WhatsApp
 */

import { toast } from 'react-hot-toast';

/**
 * Share a PDF file directly on WhatsApp
 * @param pdfBlob - The PDF blob to share
 * @param fileName - Name of the file
 * @param phoneNumber - Optional phone number to send directly to (with country code, e.g., +2348012345678)
 */
export async function sharePDFOnWhatsApp(
  pdfBlob: Blob,
  fileName: string,
  phoneNumber?: string
): Promise<void> {
  try {
    // Check if Web Share API is available
    if (navigator.share && navigator.canShare) {
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
      
      const shareData = {
        title: 'AstroHEALTH Document',
        text: `Sharing ${fileName}`,
        files: [file],
      };

      if (navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast.success('Document shared successfully!');
        return;
      }
    }

    // Fallback: Create a WhatsApp Web URL
    const url = URL.createObjectURL(pdfBlob);
    const message = encodeURIComponent(`AstroHEALTH Document: ${fileName}`);
    
    // If phone number provided, use direct WhatsApp link
    if (phoneNumber) {
      const cleanNumber = phoneNumber.replace(/[^0-9+]/g, '');
      window.open(`https://wa.me/${cleanNumber}?text=${message}`, '_blank');
    } else {
      // Open WhatsApp Web to choose contact
      window.open(`https://wa.me/?text=${message}`, '_blank');
    }

    // Show instructions to download and share
    toast.success('Opening WhatsApp. Please download the PDF separately and attach it to your message.', {
      duration: 5000,
    });

    // Open the PDF in a new tab so user can download it
    window.open(url, '_blank');

    // Clean up the URL after a delay
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch (error) {
    console.error('Error sharing PDF on WhatsApp:', error);
    toast.error('Failed to share on WhatsApp. Please download and share manually.');
  }
}

/**
 * Generate a shareable WhatsApp link with a message
 * @param message - The message to pre-fill
 * @param phoneNumber - Optional phone number (with country code)
 */
export function generateWhatsAppLink(message: string, phoneNumber?: string): string {
  const encodedMessage = encodeURIComponent(message);
  
  if (phoneNumber) {
    const cleanNumber = phoneNumber.replace(/[^0-9+]/g, '');
    return `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
  }
  
  return `https://wa.me/?text=${encodedMessage}`;
}

/**
 * Share PDF with download and WhatsApp option
 * @param generatePDFFunc - Function that generates the PDF and returns a jsPDF instance
 * @param fileName - Name of the file
 * @param phoneNumber - Optional phone number
 */
export async function downloadAndSharePDF(
  generatePDFFunc: () => Promise<jsPDF | Blob>,
  fileName: string,
  phoneNumber?: string
): Promise<void> {
  try {
    const result = await generatePDFFunc();
    
    let pdfBlob: Blob;
    
    // Check if result is jsPDF instance or Blob
    if (result instanceof Blob) {
      pdfBlob = result;
    } else {
      // It's a jsPDF instance
      pdfBlob = result.output('blob');
    }

    // Download the PDF
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Share on WhatsApp
    await sharePDFOnWhatsApp(pdfBlob, fileName, phoneNumber);

    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch (error) {
    console.error('Error in downloadAndSharePDF:', error);
    toast.error('Failed to download and share PDF');
  }
}

// Import jsPDF type
import type jsPDF from 'jspdf';
