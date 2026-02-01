/**
 * VoiceDictation Component
 * AstroHEALTH Innovations in Healthcare
 * 
 * Comprehensive speech-to-text component for medical dictation
 * with AI-powered text enhancement for proper medical expressions.
 * Now includes OCR/Scan-to-Text for handwritten notes.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Square,
  RefreshCw,
  Copy,
  Check,
  Volume2,
  Loader2,
  AlertCircle,
  Wand2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { enhanceMedicalText, type MedicalTextContext } from '@services/aiTextEnhancementService';
import type { 
  SpeechRecognition, 
  SpeechRecognitionEvent, 
  SpeechRecognitionErrorEvent 
} from '../../types/webSpeech';
import { isSpeechRecognitionSupported, getSpeechRecognitionConstructor } from '../../types/webSpeech';
import ScanToText from './ScanToText';

interface VoiceDictationProps {
  /** Current value of the text field */
  value: string;
  /** Callback when text changes */
  onChange: (text: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Number of rows for textarea */
  rows?: number;
  /** Additional CSS classes */
  className?: string;
  /** Label for the field */
  label?: string;
  /** Help text */
  helpText?: string;
  /** Medical context for AI enhancement */
  medicalContext?: MedicalTextContext;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Whether to show the AI enhance button */
  showAIEnhance?: boolean;
  /** Whether to show the OCR/Scan-to-Text button */
  showScanToText?: boolean;
  /** Error message */
  error?: string;
  /** Required field */
  required?: boolean;
  /** Field name for form registration */
  name?: string;
}

export function VoiceDictation({
  value,
  onChange,
  placeholder = 'Start speaking or type here...',
  rows = 4,
  className = '',
  label,
  helpText,
  medicalContext = 'general',
  disabled = false,
  showAIEnhance = true,
  showScanToText = true,
  error,
  required = false,
  name,
}: VoiceDictationProps) {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Use refs to track current values for use in event handlers
  // This prevents stale closures in the speech recognition callbacks
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const interimTranscriptRef = useRef(interimTranscript);
  
  // Track processed results to prevent duplication (especially on Android)
  const lastProcessedIndexRef = useRef(-1);
  const lastProcessedTranscriptRef = useRef('');
  const allProcessedTranscriptsRef = useRef<Set<string>>(new Set());
  const lastResultTimestampRef = useRef(0);
  
  // Keep refs in sync with current values
  useEffect(() => {
    valueRef.current = value;
  }, [value]);
  
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  
  useEffect(() => {
    interimTranscriptRef.current = interimTranscript;
  }, [interimTranscript]);

  // Initialize speech recognition
  useEffect(() => {
    if (!isSpeechRecognitionSupported()) {
      setRecognitionError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    const SpeechRecognitionConstructor = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionConstructor) return;
    
    const recognition = new SpeechRecognitionConstructor();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setRecognitionError(null);
      // Reset tracking refs when starting new recognition session
      lastProcessedIndexRef.current = -1;
      lastProcessedTranscriptRef.current = '';
      allProcessedTranscriptsRef.current = new Set();
      lastResultTimestampRef.current = Date.now();
    };

    recognition.onend = () => {
      setIsListening(false);
      // Append any remaining interim transcript using refs for current values
      const currentInterim = interimTranscriptRef.current;
      if (currentInterim && currentInterim.trim()) {
        const currentValue = valueRef.current;
        const trimmedInterim = currentInterim.trim();
        const needsSpace = currentValue && currentValue.length > 0 && !currentValue.endsWith(' ') && !currentValue.endsWith('\n');
        const newValue = currentValue + (needsSpace ? ' ' : '') + trimmedInterim;
        onChangeRef.current(newValue);
        valueRef.current = newValue;
      }
      setInterimTranscript('');
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      
      switch (event.error) {
        case 'no-speech':
          setRecognitionError('No speech detected. Please try again.');
          break;
        case 'audio-capture':
          setRecognitionError('No microphone found. Please check your microphone.');
          break;
        case 'not-allowed':
          setRecognitionError('Microphone access denied. Please allow microphone access.');
          break;
        case 'network':
          setRecognitionError('Network error. Please check your connection.');
          break;
        default:
          setRecognitionError(`Error: ${event.error}`);
      }
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interim = '';

      // Process only new results to prevent duplication (critical for Android)
      // Android can fire multiple onresult events for the same final result
      const startIndex = Math.max(event.resultIndex, lastProcessedIndexRef.current + 1);
      
      for (let i = startIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          // Mark this index as processed
          lastProcessedIndexRef.current = i;
          finalTranscript += transcript;
        } else {
          interim += transcript;
        }
      }

      // Always update interim transcript for visual feedback
      setInterimTranscript(interim);

      if (finalTranscript) {
        const trimmedTranscript = finalTranscript.trim();
        
        // Skip empty transcripts
        if (!trimmedTranscript) {
          return;
        }
        
        // Skip if this exact transcript was just processed (Android can duplicate)
        if (trimmedTranscript === lastProcessedTranscriptRef.current) {
          return;
        }
        
        // Skip if we've already processed this transcript in this session
        if (allProcessedTranscriptsRef.current.has(trimmedTranscript)) {
          return;
        }
        
        // Skip if result comes too quickly (< 100ms) with same/similar content - Android bug
        const now = Date.now();
        if (now - lastResultTimestampRef.current < 100) {
          return;
        }
        lastResultTimestampRef.current = now;
        
        // Also check if the current value already ends with this transcript (another duplication case)
        const currentValue = valueRef.current;
        if (currentValue && currentValue.trim().endsWith(trimmedTranscript)) {
          return;
        }
        
        // Check if this transcript contains words that are already at the end of current value
        // This handles the case where Android sends "word word word" pattern
        if (currentValue) {
          const currentWords = currentValue.trim().toLowerCase().split(/\s+/);
          const newWords = trimmedTranscript.toLowerCase().split(/\s+/);
          
          // Check if the new transcript starts with the same words that end the current value
          // This is the "complaints complaints of" pattern
          if (currentWords.length > 0 && newWords.length > 0) {
            // Find overlapping words at the junction
            let overlapCount = 0;
            for (let i = 1; i <= Math.min(currentWords.length, newWords.length); i++) {
              const endSlice = currentWords.slice(-i);
              const startSlice = newWords.slice(0, i);
              if (endSlice.join(' ') === startSlice.join(' ')) {
                overlapCount = i;
              }
            }
            
            // If there's significant overlap, remove the duplicate portion
            if (overlapCount > 0) {
              const deduplicatedWords = newWords.slice(overlapCount);
              if (deduplicatedWords.length === 0) {
                // Entire transcript was duplicate
                return;
              }
              // Use deduplicated transcript
              finalTranscript = deduplicatedWords.join(' ');
            }
          }
        }
        
        const finalTrimmed = finalTranscript.trim();
        if (!finalTrimmed) {
          return;
        }
        
        // Update last processed transcript and add to set
        lastProcessedTranscriptRef.current = trimmedTranscript;
        allProcessedTranscriptsRef.current.add(trimmedTranscript);
        
        // Determine if we need a space between existing text and new text
        let newValue: string;
        if (!currentValue || currentValue.length === 0) {
          // First entry - just use the transcript
          newValue = finalTrimmed;
        } else {
          // Check if current value ends with space or punctuation
          const lastChar = currentValue.charAt(currentValue.length - 1);
          const needsSpace = lastChar !== ' ' && lastChar !== '\n';
          newValue = currentValue + (needsSpace ? ' ' : '') + finalTrimmed;
        }
        
        // Update via callback
        onChangeRef.current(newValue);
        // Update ref immediately so next result has correct value
        valueRef.current = newValue;
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Start/stop listening
  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
      toast.error('Speech recognition not available');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setRecognitionError(null);
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('Failed to start recognition:', err);
        setRecognitionError('Failed to start speech recognition');
      }
    }
  }, [isListening]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  // Clear text
  const clearText = useCallback(() => {
    onChange('');
    setInterimTranscript('');
  }, [onChange]);

  // Copy text
  const copyText = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setIsCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  }, [value]);

  // AI enhance text
  const handleEnhance = useCallback(async () => {
    if (!value.trim()) {
      toast.error('No text to enhance');
      return;
    }

    setIsEnhancing(true);
    try {
      const enhanced = await enhanceMedicalText(value, medicalContext);
      onChange(enhanced);
      toast.success('Text enhanced with medical formatting');
    } catch (err) {
      console.error('Enhancement failed:', err);
      toast.error('Failed to enhance text');
    } finally {
      setIsEnhancing(false);
    }
  }, [value, medicalContext, onChange]);

  // Text-to-speech for playback
  const speakText = useCallback(() => {
    if (!value.trim()) {
      toast.error('No text to speak');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(value);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }, [value]);

  const displayText = value + (interimTranscript ? (value ? ' ' : '') + interimTranscript : '');

  return (
    <div className={`voice-dictation ${className}`}>
      {label && (
        <label className="label flex items-center gap-2">
          {label}
          {required && <span className="text-red-500">*</span>}
          <span className="text-xs text-gray-400 ml-auto flex items-center gap-1">
            <Mic size={12} />
            Voice enabled
          </span>
        </label>
      )}

      <div className="relative">
        {/* Main textarea */}
        <textarea
          ref={textareaRef}
          name={name}
          value={displayText}
          onChange={(e) => {
            onChange(e.target.value);
            setInterimTranscript('');
          }}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled || isListening}
          className={`input w-full pr-12 ${isListening ? 'bg-red-50 border-red-300' : ''} ${error ? 'border-red-500' : ''}`}
          style={{ resize: 'vertical' }}
        />

        {/* Interim transcript indicator */}
        {interimTranscript && (
          <div className="absolute bottom-2 left-3 text-sm text-gray-400 italic">
            Listening...
          </div>
        )}

        {/* Recording indicator */}
        <AnimatePresence>
          {isListening && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute top-2 right-2 flex items-center gap-2"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="w-3 h-3 bg-red-500 rounded-full"
              />
              <span className="text-xs text-red-600 font-medium">Recording</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Control buttons */}
      <div className="flex flex-wrap items-center gap-2 mt-2">
        {/* Voice controls */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={toggleListening}
            disabled={disabled || !isSpeechRecognitionSupported()}
            className={`p-2 rounded-md transition-colors ${
              isListening
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
            title={isListening ? 'Stop recording' : 'Start recording'}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          {isListening && (
            <button
              type="button"
              onClick={stopListening}
              className="p-2 rounded-md bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
              title="Stop"
            >
              <Square size={18} />
            </button>
          )}
        </div>

        {/* Text controls */}
        <div className="flex items-center gap-1">
          {showAIEnhance && (
            <button
              type="button"
              onClick={handleEnhance}
              disabled={disabled || isEnhancing || !value.trim()}
              className="flex items-center gap-1 px-3 py-2 rounded-md bg-purple-100 text-purple-700 hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Enhance with AI"
            >
              {isEnhancing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Wand2 size={16} />
              )}
              <span className="text-sm">AI Enhance</span>
            </button>
          )}

          {showScanToText && (
            <ScanToText
              onTextRecognized={(text) => {
                // Append scanned text to existing value
                const newValue = value ? `${value}\n${text}` : text;
                onChange(newValue);
              }}
              buttonLabel="Scan"
              size="sm"
              disabled={disabled}
              medicalContext={true}
            />
          )}

          <button
            type="button"
            onClick={speakText}
            disabled={disabled || !value.trim()}
            className="p-2 rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-50"
            title="Listen to text"
          >
            <Volume2 size={18} />
          </button>

          <button
            type="button"
            onClick={copyText}
            disabled={disabled || !value.trim()}
            className="p-2 rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-50"
            title="Copy text"
          >
            {isCopied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
          </button>

          <button
            type="button"
            onClick={clearText}
            disabled={disabled || (!value && !interimTranscript)}
            className="p-2 rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-50"
            title="Clear text"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        {/* Character count */}
        <div className="ml-auto text-xs text-gray-400">
          {value.length} characters
        </div>
      </div>

      {/* Help text */}
      {helpText && !error && !recognitionError && (
        <p className="text-sm text-gray-500 mt-1">{helpText}</p>
      )}

      {/* Error message */}
      {(error || recognitionError) && (
        <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
          <AlertCircle size={14} />
          {error || recognitionError}
        </p>
      )}

      {/* Browser support warning */}
      {!isSpeechRecognitionSupported() && (
        <p className="text-sm text-amber-600 mt-1 flex items-center gap-1">
          <AlertCircle size={14} />
          Voice dictation requires Chrome, Edge, or Safari browser.
        </p>
      )}
    </div>
  );
}

export default VoiceDictation;
