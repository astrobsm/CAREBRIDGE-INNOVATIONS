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
        onResultRef.current?.(finalTranscript.trim());
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
