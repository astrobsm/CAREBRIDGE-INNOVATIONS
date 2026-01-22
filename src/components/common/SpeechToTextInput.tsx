/**
 * SpeechToTextInput Component
 * AstroHEALTH Innovations in Healthcare
 * 
 * A stable speech-to-text input component that preserves text
 * across state changes and works on both phones and laptops.
 * Uses the Web Speech API with proper error handling and
 * continuous recognition mode for extended dictation.
 */

import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Square,
  Loader2,
  AlertCircle,
  X,
} from 'lucide-react';

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
  onspeechend: ((this: SpeechRecognition, ev: Event) => void) | null;
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

interface SpeechToTextInputProps {
  /** Current value of the text field */
  value: string;
  /** Callback when text changes */
  onChange: (text: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether to use textarea (true) or input (false) */
  multiline?: boolean;
  /** Number of rows for textarea */
  rows?: number;
  /** Additional CSS classes */
  className?: string;
  /** Label for the field */
  label?: string;
  /** Help text */
  helpText?: string;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Error message */
  error?: string;
  /** Required field */
  required?: boolean;
  /** Field name for form registration */
  name?: string;
  /** Maximum length */
  maxLength?: number;
  /** Whether to show inline mic button */
  showInlineMic?: boolean;
  /** Auto-restart recording when it stops */
  autoRestart?: boolean;
}

// Check if speech recognition is available
const isSpeechRecognitionSupported = () => {
  return typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
};

export interface SpeechToTextInputRef {
  startListening: () => void;
  stopListening: () => void;
  isListening: boolean;
}

export const SpeechToTextInput = forwardRef<SpeechToTextInputRef, SpeechToTextInputProps>(({
  value = '',
  onChange,
  placeholder = 'Type or speak...',
  multiline = false,
  rows = 3,
  className = '',
  label,
  helpText,
  disabled = false,
  error,
  required = false,
  name,
  maxLength,
  showInlineMic = true,
  autoRestart = false,
}, ref) => {
  // Use refs to store values that need to persist across renders
  const currentValueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isInitializedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoRestartRef = useRef(autoRestart);
  
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [recognitionError, setRecognitionError] = useState<string | null>(null);

  // Keep refs in sync with latest props
  useEffect(() => {
    currentValueRef.current = value;
  }, [value]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    autoRestartRef.current = autoRestart;
  }, [autoRestart]);

  // Initialize speech recognition
  useEffect(() => {
    if (!isSpeechRecognitionSupported()) {
      return;
    }

    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionConstructor();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setRecognitionError(null);
      // Sync the current value ref when starting - this is critical!
      // The value might have changed since last recognition
    };

    recognition.onend = () => {
      setIsListening(false);
      // Commit any pending interim transcript
      setInterimTranscript(prev => {
        if (prev) {
          const currentVal = currentValueRef.current || '';
          const spacer = currentVal && 
            !currentVal.endsWith(' ') && 
            !currentVal.endsWith('.') && 
            !currentVal.endsWith(',') ? ' ' : '';
          const newValue = currentVal + spacer + prev;
          currentValueRef.current = newValue;
          onChangeRef.current(newValue);
        }
        return '';
      });
      
      // Auto-restart if enabled and no error
      if (autoRestartRef.current && recognitionRef.current) {
        restartTimeoutRef.current = setTimeout(() => {
          try {
            recognitionRef.current?.start();
          } catch (e) {
            // Ignore if already started
          }
        }, 100);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      
      // Clear any pending restarts
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }
      
      switch (event.error) {
        case 'no-speech':
          // This is normal, don't show error
          break;
        case 'audio-capture':
          setRecognitionError('No microphone found. Please check your microphone.');
          break;
        case 'not-allowed':
          setRecognitionError('Microphone access denied. Please allow microphone access in your browser settings.');
          break;
        case 'network':
          setRecognitionError('Network error. Please check your internet connection.');
          break;
        case 'aborted':
          // User aborted, don't show error
          break;
        default:
          setRecognitionError(`Speech recognition error: ${event.error}`);
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
        // Immediately append final transcript to the stored value
        const currentVal = currentValueRef.current || '';
        const spacer = currentVal && 
          !currentVal.endsWith(' ') && 
          !currentVal.endsWith('.') && 
          !currentVal.endsWith(',') ? ' ' : '';
        const newValue = currentVal + spacer + finalTranscript;
        currentValueRef.current = newValue;
        onChangeRef.current(newValue);
      }
      
      setInterimTranscript(interim);
    };

    recognitionRef.current = recognition;

    return () => {
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, []); // No dependencies - uses refs for all dynamic values

  // Start/stop listening
  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      setRecognitionError('Speech recognition not available in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    setRecognitionError(null);
    try {
      recognitionRef.current.start();
    } catch (err) {
      // May already be started
      console.error('Failed to start recognition:', err);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore if already stopped
      }
    }
  }, [isListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    startListening,
    stopListening,
    isListening,
  }), [startListening, stopListening, isListening]);

  // Handle text input change
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    currentValueRef.current = newValue;
    onChange(newValue);
    setInterimTranscript('');
  }, [onChange]);

  // Clear error on dismiss
  const dismissError = useCallback(() => {
    setRecognitionError(null);
  }, []);

  // Display value includes interim transcript
  const displayValue = value + (interimTranscript ? (value ? ' ' : '') + interimTranscript : '');

  const inputClasses = `input w-full ${isListening ? 'pr-20 ring-2 ring-red-300 border-red-300' : showInlineMic ? 'pr-12' : ''} ${error ? 'border-red-500' : ''} ${className}`;

  const commonProps = {
    ref: inputRef as any,
    name,
    value: displayValue,
    onChange: handleTextChange,
    placeholder: isListening ? 'Listening... Speak now' : placeholder,
    disabled: disabled || isListening,
    maxLength,
    className: inputClasses,
    'aria-label': label,
    'aria-invalid': !!error,
  };

  return (
    <div className="speech-to-text-input w-full">
      {label && (
        <label className="label flex items-center gap-2 mb-1">
          <span className="flex items-center gap-1">
            {label}
            {required && <span className="text-red-500">*</span>}
          </span>
          {isSpeechRecognitionSupported() && (
            <span className="text-xs text-gray-400 ml-auto flex items-center gap-1">
              <Mic size={12} />
              Voice enabled
            </span>
          )}
        </label>
      )}

      <div className="relative">
        {/* Input/Textarea */}
        {multiline ? (
          <textarea
            {...commonProps}
            rows={rows}
            style={{ resize: 'vertical' }}
          />
        ) : (
          <input
            {...commonProps}
            type="text"
          />
        )}

        {/* Inline controls */}
        {showInlineMic && isSpeechRecognitionSupported() && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {/* Recording indicator */}
            <AnimatePresence>
              {isListening && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-1 mr-1"
                >
                  <motion.div
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="w-2 h-2 bg-red-500 rounded-full"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mic button */}
            <button
              type="button"
              onClick={toggleListening}
              disabled={disabled}
              className={`p-1.5 rounded-md transition-all ${
                isListening
                  ? 'bg-red-500 text-white hover:bg-red-600 shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
              }`}
              title={isListening ? 'Stop recording' : 'Start voice input'}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>

            {/* Stop button when listening */}
            {isListening && (
              <button
                type="button"
                onClick={stopListening}
                className="p-1.5 rounded-md bg-gray-700 text-white hover:bg-gray-800 transition-all"
                title="Stop"
              >
                <Square size={14} />
              </button>
            )}
          </div>
        )}

        {/* Interim transcript indicator */}
        {interimTranscript && (
          <div className="absolute bottom-1 left-2 text-xs text-gray-400 italic pointer-events-none">
            <span className="flex items-center gap-1">
              <Loader2 size={10} className="animate-spin" />
              Processing speech...
            </span>
          </div>
        )}
      </div>

      {/* Help text */}
      {helpText && !error && !recognitionError && (
        <p className="text-xs text-gray-500 mt-1">{helpText}</p>
      )}

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
          <AlertCircle size={14} />
          {error}
        </p>
      )}

      {/* Recognition error */}
      {recognitionError && (
        <div className="text-sm text-amber-600 mt-1 flex items-center gap-1 bg-amber-50 p-2 rounded-md">
          <AlertCircle size={14} className="flex-shrink-0" />
          <span className="flex-1">{recognitionError}</span>
          <button
            type="button"
            onClick={dismissError}
            className="p-0.5 hover:bg-amber-100 rounded"
            title="Dismiss error"
            aria-label="Dismiss error"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Browser support warning (only show if no label) */}
      {!isSpeechRecognitionSupported() && !label && showInlineMic && (
        <p className="text-xs text-amber-600 mt-1">
          Voice input requires Chrome, Edge, or Safari.
        </p>
      )}
    </div>
  );
});

SpeechToTextInput.displayName = 'SpeechToTextInput';

export default SpeechToTextInput;
