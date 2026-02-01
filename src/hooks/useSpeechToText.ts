/**
 * useSpeechToText Hook
 * AstroHEALTH Innovations in Healthcare
 * 
 * Lightweight, stable speech-to-text hook for use with form inputs.
 * Uses Web Speech API with robust error handling and browser compatibility.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  isSpeechRecognitionSupported, 
  getSpeechRecognitionConstructor 
} from '../types/webSpeech';
import type { 
  SpeechRecognition, 
  SpeechRecognitionEvent, 
  SpeechRecognitionErrorEvent 
} from '../types/webSpeech';

export interface UseSpeechToTextOptions {
  /** Language for speech recognition (default: 'en-US') */
  language?: string;
  /** Whether to use continuous mode (default: false for single utterances) */
  continuous?: boolean;
  /** Callback when final transcript is received */
  onResult?: (transcript: string) => void;
  /** Callback on error */
  onError?: (error: string) => void;
}

export interface UseSpeechToTextReturn {
  /** Whether speech recognition is currently active */
  isListening: boolean;
  /** Interim (unconfirmed) transcript while speaking */
  interimTranscript: string;
  /** Current error message if any */
  error: string | null;
  /** Whether speech recognition is supported in this browser */
  isSupported: boolean;
  /** Start listening for speech */
  startListening: () => void;
  /** Stop listening */
  stopListening: () => void;
  /** Toggle listening state */
  toggleListening: () => void;
  /** Clear any error state */
  clearError: () => void;
}

export function useSpeechToText(options: UseSpeechToTextOptions = {}): UseSpeechToTextReturn {
  const { 
    language = 'en-US', 
    continuous = false,
    onResult,
    onError
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  
  // Android-specific deduplication tracking
  const processedTranscriptsRef = useRef<Set<string>>(new Set());
  const lastResultTimestampRef = useRef(0);
  const lastFinalTranscriptRef = useRef('');
  
  // Keep callback refs updated
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);
  
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const isSupported = isSpeechRecognitionSupported();

  // Initialize recognition instance
  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognitionConstructor = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionConstructor) return;

    const recognition = new SpeechRecognitionConstructor();
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      // Reset Android deduplication tracking
      processedTranscriptsRef.current.clear();
      lastResultTimestampRef.current = 0;
      lastFinalTranscriptRef.current = '';
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      
      let errorMessage: string;
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again.';
          break;
        case 'audio-capture':
          errorMessage = 'No microphone found. Please check your microphone.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone access denied. Please allow microphone access.';
          break;
        case 'network':
          errorMessage = 'Network error. Please check your connection.';
          break;
        case 'aborted':
          // User cancelled, not an error
          errorMessage = '';
          break;
        default:
          errorMessage = `Speech error: ${event.error}`;
      }
      
      if (errorMessage) {
        setError(errorMessage);
        onErrorRef.current?.(errorMessage);
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

      setInterimTranscript(interim);

      if (finalTranscript) {
        const trimmedTranscript = finalTranscript.trim();
        
        // Skip empty or already processed transcripts (exact duplicates)
        if (!trimmedTranscript || processedTranscriptsRef.current.has(trimmedTranscript.toLowerCase())) {
          return;
        }
        
        // Skip if result comes too quickly (< 100ms) with same/similar content - Android bug
        const now = Date.now();
        if (now - lastResultTimestampRef.current < 100) {
          return;
        }
        lastResultTimestampRef.current = now;
        
        // Android sends overlapping results that cause "word word word" pattern
        // Check if the new transcript overlaps with what was just sent
        let deduplicatedTranscript = trimmedTranscript;
        const lastTranscript = lastFinalTranscriptRef.current;
        
        if (lastTranscript) {
          const lastWords = lastTranscript.toLowerCase().split(/\s+/);
          const newWords = trimmedTranscript.toLowerCase().split(/\s+/);
          const originalNewWords = trimmedTranscript.split(/\s+/);
          
          // Find overlapping words at the junction
          let overlapCount = 0;
          for (let i = 1; i <= Math.min(lastWords.length, newWords.length); i++) {
            const endSlice = lastWords.slice(-i);
            const startSlice = newWords.slice(0, i);
            if (endSlice.join(' ') === startSlice.join(' ')) {
              overlapCount = i;
            }
          }
          
          // If there's overlap, remove the duplicate portion
          if (overlapCount > 0) {
            const deduplicatedWords = originalNewWords.slice(overlapCount);
            if (deduplicatedWords.length === 0) {
              return; // Entire transcript was duplicate
            }
            deduplicatedTranscript = deduplicatedWords.join(' ');
          }
        }
        
        // Track this transcript to prevent duplicates
        processedTranscriptsRef.current.add(trimmedTranscript.toLowerCase());
        lastFinalTranscriptRef.current = trimmedTranscript;
        
        onResultRef.current?.(deduplicatedTranscript);
        if (!continuous) {
          // Auto-stop after getting result in non-continuous mode
          recognition.stop();
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore abort errors
        }
      }
    };
  }, [language, continuous, isSupported]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      setError('Speech recognition not available');
      return;
    }

    setError(null);
    setInterimTranscript('');

    try {
      recognitionRef.current.start();
    } catch (err) {
      // Already started - stop and restart
      try {
        recognitionRef.current.stop();
        setTimeout(() => {
          recognitionRef.current?.start();
        }, 100);
      } catch {
        setError('Failed to start speech recognition');
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop errors
      }
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isListening,
    interimTranscript,
    error,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
    clearError,
  };
}

/**
 * Higher-order component wrapper for inputs with speech support
 */
interface SpeechEnabledInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Whether to append or replace text */
  appendMode?: boolean;
}

export function useSpeechEnabledInput({
  value,
  onChange,
  appendMode = true,
}: Pick<SpeechEnabledInputProps, 'value' | 'onChange' | 'appendMode'>) {
  const valueRef = useRef(value);
  
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const handleSpeechResult = useCallback((transcript: string) => {
    if (appendMode) {
      const currentValue = valueRef.current;
      const spacer = currentValue && !currentValue.endsWith(' ') ? ' ' : '';
      onChange(currentValue + spacer + transcript);
    } else {
      onChange(transcript);
    }
  }, [onChange, appendMode]);

  const speech = useSpeechToText({
    onResult: handleSpeechResult,
  });

  return speech;
}
