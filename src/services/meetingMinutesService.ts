/**
 * Meeting Minutes Service
 * AstroHEALTH Innovations in Healthcare
 * 
 * Comprehensive service for:
 * - Live speech-to-text transcription during meetings
 * - AI-powered summary generation with key points extraction
 * - Meeting minutes PDF generation for email/WhatsApp sharing
 * - Recording management and transcript processing
 */

import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import { MeetingMinutesOps } from '../database/operations';
import { syncRecord } from './cloudSyncService';
import type {
  MeetingMinutes,
  MeetingTranscriptSegment,
  MeetingKeyPoint,
  VideoConference,
} from '../types';

// Type declarations for Web Speech API (not in standard lib)
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

// ============================================================
// ROOM CODE GENERATOR
// ============================================================

/**
 * Generate a unique, readable meeting room code
 * Format: XXX-XXXX-XXX (alphanumeric, easy to share)
 */
export function generateMeetingRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
  const generateSegment = (length: number) => {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  };
  return `${generateSegment(3)}-${generateSegment(4)}-${generateSegment(3)}`;
}

/**
 * Generate a simpler 6-character room code
 */
export function generateSimpleRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// ============================================================
// LIVE TRANSCRIPTION SERVICE
// ============================================================

export interface TranscriptionSession {
  isActive: boolean;
  segments: MeetingTranscriptSegment[];
  currentSpeaker: string;
  startTime: Date;
  onTranscriptUpdate?: (segments: MeetingTranscriptSegment[]) => void;
}

let transcriptionSession: TranscriptionSession | null = null;
let recognitionInstance: any = null; // SpeechRecognition type handled at runtime

/**
 * Start live transcription for a meeting
 */
export function startLiveTranscription(
  speakerName: string,
  onTranscriptUpdate?: (segments: MeetingTranscriptSegment[]) => void,
  onError?: (error: string) => void
): boolean {
  // Check browser support
  const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) {
    onError?.('Speech recognition not supported in this browser');
    return false;
  }

  try {
    recognitionInstance = new SpeechRecognition();
    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = 'en-US';
    recognitionInstance.maxAlternatives = 1;

    transcriptionSession = {
      isActive: true,
      segments: [],
      currentSpeaker: speakerName,
      startTime: new Date(),
      onTranscriptUpdate,
    };

    let segmentStartTime = 0;

    recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
      if (!transcriptionSession) return;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript.trim();
        
        if (result.isFinal && transcript.length > 0) {
          const now = Date.now();
          const elapsedSeconds = (now - transcriptionSession.startTime.getTime()) / 1000;
          
          const segment: MeetingTranscriptSegment = {
            id: uuidv4(),
            speakerName: transcriptionSession.currentSpeaker,
            text: transcript,
            startTime: segmentStartTime,
            endTime: elapsedSeconds,
            confidence: result[0].confidence || 0.9,
            isEdited: false,
          };
          
          transcriptionSession.segments.push(segment);
          segmentStartTime = elapsedSeconds;
          
          transcriptionSession.onTranscriptUpdate?.(transcriptionSession.segments);
        }
      }
    };

    recognitionInstance.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        onError?.(`Speech recognition error: ${event.error}`);
      }
    };

    recognitionInstance.onend = () => {
      // Restart if still active (handles browser auto-stop)
      if (transcriptionSession?.isActive && recognitionInstance) {
        try {
          recognitionInstance.start();
        } catch {
          // Ignore restart errors
        }
      }
    };

    recognitionInstance.start();
    return true;
  } catch (error) {
    console.error('Failed to start transcription:', error);
    onError?.('Failed to start speech recognition');
    return false;
  }
}

/**
 * Stop live transcription
 */
export function stopLiveTranscription(): MeetingTranscriptSegment[] {
  const segments = transcriptionSession?.segments || [];
  
  if (recognitionInstance) {
    try {
      recognitionInstance.stop();
    } catch {
      // Ignore stop errors
    }
    recognitionInstance = null;
  }
  
  if (transcriptionSession) {
    transcriptionSession.isActive = false;
  }
  transcriptionSession = null;
  
  return segments;
}

/**
 * Change the current speaker during transcription
 */
export function setCurrentSpeaker(speakerName: string): void {
  if (transcriptionSession) {
    transcriptionSession.currentSpeaker = speakerName;
  }
}

/**
 * Get current transcription status
 */
export function getTranscriptionStatus(): { isActive: boolean; segmentCount: number } {
  return {
    isActive: transcriptionSession?.isActive || false,
    segmentCount: transcriptionSession?.segments.length || 0,
  };
}

// ============================================================
// AI-POWERED SUMMARY GENERATION
// ============================================================

/**
 * Generate AI-powered summary from transcript
 * Uses heuristics and keyword extraction for offline operation
 */
export function generateAISummary(
  transcript: MeetingTranscriptSegment[],
  meetingTitle: string,
  meetingType: string
): {
  summary: string;
  keyPoints: MeetingKeyPoint[];
  actionItems: MeetingKeyPoint[];
  decisionsReached: string[];
  discussionHighlights: string[];
  nextSteps: string[];
} {
  const fullText = transcript.map(s => s.text).join(' ');
  
  // Extract key patterns
  const actionPatterns = [
    /(?:will|should|must|need to|going to|has to|have to)\s+(.+)/gi,
    /(?:action item|task|todo|to-do)[\s:]+(.+)/gi,
    /(?:please|kindly)\s+(.+)/gi,
  ];
  
  const decisionPatterns = [
    /(?:we (?:decided|agreed|concluded)|decision|decided to|agreed to)\s+(.+)/gi,
    /(?:it was agreed|consensus|final decision)\s+(.+)/gi,
  ];
  
  const discussionPatterns = [
    /(?:discussed|talked about|reviewed|considered)\s+(.+)/gi,
    /(?:regarding|concerning|about)\s+(.+)/gi,
  ];
  
  const nextStepPatterns = [
    /(?:next step|follow up|follow-up|next meeting)\s+(.+)/gi,
    /(?:by next|before|deadline)\s+(.+)/gi,
  ];

  // Extract action items
  const actionItems: MeetingKeyPoint[] = [];
  actionPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(fullText)) !== null) {
      const content = match[1].trim();
      if (content.length > 10 && content.length < 200) {
        actionItems.push({
          id: uuidv4(),
          type: 'action_item',
          content: content.charAt(0).toUpperCase() + content.slice(1),
          priority: 'medium',
          status: 'pending',
          relatedTranscriptIds: [],
        });
      }
    }
  });

  // Extract decisions
  const decisionsReached: string[] = [];
  decisionPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(fullText)) !== null) {
      const decision = match[1].trim();
      if (decision.length > 10 && decision.length < 200) {
        decisionsReached.push(decision.charAt(0).toUpperCase() + decision.slice(1));
      }
    }
  });

  // Extract discussion highlights (take most important sentences)
  const discussionHighlights: string[] = [];
  discussionPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(fullText)) !== null) {
      const highlight = match[1].trim();
      if (highlight.length > 15 && highlight.length < 200) {
        discussionHighlights.push(highlight.charAt(0).toUpperCase() + highlight.slice(1));
      }
    }
  });

  // Extract next steps
  const nextSteps: string[] = [];
  nextStepPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(fullText)) !== null) {
      const step = match[1].trim();
      if (step.length > 10 && step.length < 200) {
        nextSteps.push(step.charAt(0).toUpperCase() + step.slice(1));
      }
    }
  });

  // Generate key points (combination of important items)
  const keyPoints: MeetingKeyPoint[] = [
    ...actionItems.slice(0, 5),
    ...decisionsReached.slice(0, 3).map((d) => ({
      id: uuidv4(),
      type: 'decision' as const,
      content: d,
      priority: 'high' as const,
      status: 'completed' as const,
      relatedTranscriptIds: [],
    })),
  ];

  // Generate summary
  const participantCount = new Set(transcript.map(s => s.speakerName)).size;
  const durationMinutes = transcript.length > 0
    ? Math.round((transcript[transcript.length - 1].endTime - transcript[0].startTime) / 60)
    : 0;
  
  const summary = generateMeetingSummaryText(
    meetingTitle,
    meetingType,
    participantCount,
    durationMinutes,
    actionItems.length,
    decisionsReached.length,
    discussionHighlights.slice(0, 3)
  );

  return {
    summary,
    keyPoints,
    actionItems: actionItems.slice(0, 10),
    decisionsReached: [...new Set(decisionsReached)].slice(0, 5),
    discussionHighlights: [...new Set(discussionHighlights)].slice(0, 5),
    nextSteps: [...new Set(nextSteps)].slice(0, 5),
  };
}

function generateMeetingSummaryText(
  title: string,
  type: string,
  participants: number,
  duration: number,
  actionCount: number,
  decisionCount: number,
  highlights: string[]
): string {
  const typeLabel = type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
  
  let summary = `This ${typeLabel.toLowerCase()} titled "${title}" was attended by ${participants} participant${participants !== 1 ? 's' : ''} and lasted approximately ${duration} minute${duration !== 1 ? 's' : ''}.`;
  
  if (decisionCount > 0) {
    summary += ` The meeting resulted in ${decisionCount} key decision${decisionCount !== 1 ? 's' : ''}.`;
  }
  
  if (actionCount > 0) {
    summary += ` ${actionCount} action item${actionCount !== 1 ? 's were' : ' was'} identified for follow-up.`;
  }
  
  if (highlights.length > 0) {
    summary += ` Key discussion topics included: ${highlights.slice(0, 2).join('; ')}.`;
  }
  
  return summary;
}

// ============================================================
// MEETING MINUTES CREATION & MANAGEMENT
// ============================================================

/**
 * Create new meeting minutes from a conference
 */
export async function createMeetingMinutes(
  conference: VideoConference,
  hostId: string,
  hostName: string,
  hospitalId?: string
): Promise<MeetingMinutes> {
  const minutes: MeetingMinutes = {
    id: uuidv4(),
    conferenceId: conference.id,
    hospitalId,
    
    title: conference.title || 'Untitled Meeting',
    meetingType: 'team_meeting',
    meetingDate: new Date(),
    startTime: new Date(),
    location: 'Virtual Meeting',
    roomCode: conference.roomCode,
    
    hostId,
    hostName,
    attendees: conference.participants.map(p => ({
      id: p.id,
      oderId: p.oderId,
      userId: p.oderId,
      userName: p.userName,
      userRole: p.userRole,
      joinedAt: p.joinedAt || new Date(),
      leftAt: p.leftAt,
      contributions: 0,
    })),
    
    agenda: [],
    transcript: [],
    rawTranscriptText: '',
    
    aiSummary: '',
    keyPoints: [],
    actionItems: [],
    decisionsReached: [],
    discussionHighlights: [],
    nextSteps: [],
    
    hasRecording: false,
    
    status: 'draft',
    sharedWith: [],
    exportedFormats: [],
    
    createdBy: hostId,
    createdByName: hostName,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await MeetingMinutesOps.create(minutes);
  syncRecord('meetingMinutes', minutes as unknown as Record<string, unknown>);
  
  return minutes;
}

/**
 * Finalize meeting minutes with AI-generated content
 */
export async function finalizeMeetingMinutes(
  minutesId: string,
  endTime: Date,
  finalizedBy: string,
  recordingUrl?: string,
  recordingDuration?: number
): Promise<MeetingMinutes | null> {
  const minutes = await MeetingMinutesOps.getById(minutesId);
  if (!minutes) return null;

  // Calculate duration
  const duration = Math.round((endTime.getTime() - minutes.startTime.getTime()) / 60000);

  // Generate AI summary
  const aiContent = generateAISummary(
    minutes.transcript,
    minutes.title,
    minutes.meetingType
  );

  // Update attendee contributions
  const attendeesWithContributions = minutes.attendees.map(attendee => ({
    ...attendee,
    contributions: minutes.transcript.filter(s => s.speakerName === attendee.userName).length,
    participationDuration: attendee.leftAt
      ? Math.round((new Date(attendee.leftAt).getTime() - new Date(attendee.joinedAt).getTime()) / 60000)
      : duration,
  }));

  const updates: Partial<MeetingMinutes> = {
    endTime,
    duration,
    attendees: attendeesWithContributions,
    aiSummary: aiContent.summary,
    keyPoints: aiContent.keyPoints,
    actionItems: aiContent.actionItems,
    decisionsReached: aiContent.decisionsReached,
    discussionHighlights: aiContent.discussionHighlights,
    nextSteps: aiContent.nextSteps,
    hasRecording: !!recordingUrl,
    recordingUrl,
    recordingDuration,
    status: 'finalized',
    finalizedAt: new Date(),
    finalizedBy,
    updatedAt: new Date(),
  };

  await MeetingMinutesOps.update(minutesId, updates);
  const updatedMinutes = await MeetingMinutesOps.getById(minutesId);
  if (updatedMinutes) {
    syncRecord('meetingMinutes', updatedMinutes as unknown as Record<string, unknown>);
  }

  return updatedMinutes || null;
}

/**
 * Add transcript segment to existing minutes
 */
export async function addTranscriptToMinutes(
  minutesId: string,
  segment: Omit<MeetingTranscriptSegment, 'id' | 'isEdited'>
): Promise<void> {
  await MeetingMinutesOps.addTranscriptSegment(minutesId, segment);
}

// ============================================================
// PDF EXPORT FOR SHARING
// ============================================================

/**
 * Generate PDF of meeting minutes
 */
export function generateMeetingMinutesPDF(minutes: MeetingMinutes): Blob {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let y = margin;

  // Helper functions
  const addHeader = (text: string, size: number = 16) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', 'bold');
    doc.text(text, margin, y);
    y += size / 2 + 4;
  };

  const addSubheader = (text: string) => {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(text, margin, y);
    y += 8;
  };

  const addText = (text: string, indent: number = 0) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(text, contentWidth - indent);
    doc.text(lines, margin + indent, y);
    y += lines.length * 5 + 2;
  };

  const addBullet = (text: string) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const bulletChar = '•';
    doc.text(bulletChar, margin + 5, y);
    const lines = doc.splitTextToSize(text, contentWidth - 15);
    doc.text(lines, margin + 12, y);
    y += lines.length * 5 + 2;
  };

  const checkPageBreak = (requiredSpace: number) => {
    if (y + requiredSpace > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // Title and Logo area
  doc.setFillColor(0, 102, 204);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('MEETING MINUTES', margin, 25);
  doc.setFontSize(10);
  doc.text('AstroHEALTH', pageWidth - margin - 50, 25);
  
  y = 50;
  doc.setTextColor(0, 0, 0);

  // Meeting Details
  addHeader(minutes.title, 18);
  y += 5;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${format(new Date(minutes.meetingDate), 'EEEE, MMMM d, yyyy')}`, margin, y);
  y += 6;
  doc.text(`Time: ${format(new Date(minutes.startTime), 'h:mm a')} - ${minutes.endTime ? format(new Date(minutes.endTime), 'h:mm a') : 'Ongoing'}`, margin, y);
  y += 6;
  doc.text(`Duration: ${minutes.duration || 0} minutes`, margin, y);
  y += 6;
  doc.text(`Meeting Type: ${minutes.meetingType.replace('_', ' ').toUpperCase()}`, margin, y);
  y += 6;
  doc.text(`Room Code: ${minutes.roomCode}`, margin, y);
  y += 6;
  doc.text(`Host: ${minutes.hostName}`, margin, y);
  y += 10;

  // Attendees
  checkPageBreak(30);
  addSubheader('ATTENDEES');
  minutes.attendees.forEach(attendee => {
    addBullet(`${attendee.userName} (${attendee.userRole.replace('_', ' ')})`);
  });
  y += 5;

  // Summary
  if (minutes.aiSummary) {
    checkPageBreak(40);
    addSubheader('EXECUTIVE SUMMARY');
    addText(minutes.aiSummary);
    y += 5;
  }

  // Key Decisions
  if (minutes.decisionsReached.length > 0) {
    checkPageBreak(30);
    addSubheader('KEY DECISIONS');
    minutes.decisionsReached.forEach((decision) => {
      addBullet(decision);
    });
    y += 5;
  }

  // Action Items
  if (minutes.actionItems.length > 0) {
    checkPageBreak(30);
    addSubheader('ACTION ITEMS');
    minutes.actionItems.forEach((item) => {
      const assignee = item.assigneeName ? ` - Assigned to: ${item.assigneeName}` : '';
      const dueDate = item.dueDate ? ` (Due: ${format(new Date(item.dueDate), 'MMM d, yyyy')})` : '';
      addBullet(`${item.content}${assignee}${dueDate}`);
    });
    y += 5;
  }

  // Discussion Highlights
  if (minutes.discussionHighlights.length > 0) {
    checkPageBreak(30);
    addSubheader('DISCUSSION HIGHLIGHTS');
    minutes.discussionHighlights.forEach(highlight => {
      addBullet(highlight);
    });
    y += 5;
  }

  // Next Steps
  if (minutes.nextSteps.length > 0) {
    checkPageBreak(30);
    addSubheader('NEXT STEPS');
    minutes.nextSteps.forEach(step => {
      addBullet(step);
    });
    y += 5;
  }

  // Full Transcript (optional - can be lengthy)
  if (minutes.transcript.length > 0) {
    checkPageBreak(30);
    doc.addPage();
    y = margin;
    addSubheader('FULL TRANSCRIPT');
    y += 5;
    
    minutes.transcript.forEach(segment => {
      checkPageBreak(20);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`[${formatTime(segment.startTime)}] ${segment.speakerName}:`, margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(segment.text, contentWidth - 10);
      doc.text(lines, margin + 5, y);
      y += lines.length * 4 + 4;
    });
  }

  // Footer
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Generated by AstroHEALTH | ${format(new Date(), 'MMM d, yyyy h:mm a')} | Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  return doc.output('blob');
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Download PDF of meeting minutes
 */
export function downloadMeetingMinutesPDF(minutes: MeetingMinutes): void {
  const blob = generateMeetingMinutesPDF(minutes);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Meeting_Minutes_${format(new Date(minutes.meetingDate), 'yyyy-MM-dd')}_${minutes.title.replace(/\s+/g, '_').slice(0, 30)}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Get shareable URL/data for WhatsApp
 */
export function getWhatsAppShareData(minutes: MeetingMinutes): { text: string; url?: string } {
  const text = `📋 *Meeting Minutes*
  
*${minutes.title}*
📅 ${format(new Date(minutes.meetingDate), 'EEEE, MMMM d, yyyy')}
⏱️ Duration: ${minutes.duration || 0} minutes
👥 Attendees: ${minutes.attendees.length}

*Summary:*
${minutes.aiSummary || 'No summary available'}

${minutes.actionItems.length > 0 ? `*Action Items (${minutes.actionItems.length}):*
${minutes.actionItems.slice(0, 3).map((item, i) => `${i + 1}. ${item.content}`).join('\n')}
${minutes.actionItems.length > 3 ? `...and ${minutes.actionItems.length - 3} more` : ''}` : ''}

${minutes.decisionsReached.length > 0 ? `*Decisions:*
${minutes.decisionsReached.slice(0, 3).map((d) => `• ${d}`).join('\n')}` : ''}

_Generated by AstroHEALTH_`;

  return { text: encodeURIComponent(text) };
}

/**
 * Get email share data
 */
export function getEmailShareData(minutes: MeetingMinutes): { subject: string; body: string } {
  const subject = `Meeting Minutes: ${minutes.title} - ${format(new Date(minutes.meetingDate), 'MMM d, yyyy')}`;
  
  const body = `Meeting Minutes

Title: ${minutes.title}
Date: ${format(new Date(minutes.meetingDate), 'EEEE, MMMM d, yyyy')}
Time: ${format(new Date(minutes.startTime), 'h:mm a')} - ${minutes.endTime ? format(new Date(minutes.endTime), 'h:mm a') : 'Ongoing'}
Duration: ${minutes.duration || 0} minutes
Type: ${minutes.meetingType.replace('_', ' ')}
Host: ${minutes.hostName}

ATTENDEES:
${minutes.attendees.map(a => `• ${a.userName} (${a.userRole.replace('_', ' ')})`).join('\n')}

SUMMARY:
${minutes.aiSummary || 'No summary available'}

${minutes.decisionsReached.length > 0 ? `KEY DECISIONS:
${minutes.decisionsReached.map((d, i) => `${i + 1}. ${d}`).join('\n')}
` : ''}
${minutes.actionItems.length > 0 ? `ACTION ITEMS:
${minutes.actionItems.map((item, i) => `${i + 1}. ${item.content}${item.assigneeName ? ` (Assigned: ${item.assigneeName})` : ''}`).join('\n')}
` : ''}
${minutes.nextSteps.length > 0 ? `NEXT STEPS:
${minutes.nextSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')}
` : ''}
---
Generated by AstroHEALTH Healthcare Management System
`;

  return { subject, body: encodeURIComponent(body) };
}

/**
 * Open WhatsApp share dialog
 */
export function shareViaWhatsApp(minutes: MeetingMinutes): void {
  const { text } = getWhatsAppShareData(minutes);
  window.open(`https://wa.me/?text=${text}`, '_blank');
}

/**
 * Open email compose with meeting minutes
 */
export function shareViaEmail(minutes: MeetingMinutes, recipientEmail?: string): void {
  const { subject, body } = getEmailShareData(minutes);
  const mailto = recipientEmail 
    ? `mailto:${recipientEmail}?subject=${subject}&body=${body}`
    : `mailto:?subject=${subject}&body=${body}`;
  window.open(mailto);
}

// Export service object
export const MeetingMinutesService = {
  generateRoomCode: generateMeetingRoomCode,
  generateSimpleRoomCode,
  startTranscription: startLiveTranscription,
  stopTranscription: stopLiveTranscription,
  setCurrentSpeaker,
  getTranscriptionStatus,
  generateAISummary,
  createMinutes: createMeetingMinutes,
  finalizeMinutes: finalizeMeetingMinutes,
  addTranscript: addTranscriptToMinutes,
  generatePDF: generateMeetingMinutesPDF,
  downloadPDF: downloadMeetingMinutesPDF,
  shareWhatsApp: shareViaWhatsApp,
  shareEmail: shareViaEmail,
  getWhatsAppShareData,
  getEmailShareData,
};

export default MeetingMinutesService;
