/**
 * VoiceDictation Component
 * AstroHEALTH Innovations in Healthcare
 * 
 * Comprehensive speech-to-text component for medical dictation
 * with AI-powered text enhancement for proper medical expressions.
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

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

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
  /** Error message */
  error?: string;
  /** Required field */
  required?: boolean;
  /** Field name for form registration */
  name?: string;
}

// Check if speech recognition is available
const isSpeechRecognitionSupported = () => {
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
};

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

  // Initialize speech recognition
  useEffect(() => {
    if (!isSpeechRecognitionSupported()) {
      setRecognitionError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionConstructor();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setRecognitionError(null);
    };

    recognition.onend = () => {
      setIsListening(false);
      // Append any remaining interim transcript
      if (interimTranscript) {
        onChange(value + (value ? ' ' : '') + interimTranscript);
        setInterimTranscript('');
      }
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

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interim += transcript;
        }
      }

      if (finalTranscript) {
        // Add proper spacing and punctuation
        const spacer = value && !value.endsWith(' ') && !value.endsWith('.') && !value.endsWith(',') ? ' ' : '';
        onChange(value + spacer + finalTranscript);
      }
      setInterimTranscript(interim);
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
