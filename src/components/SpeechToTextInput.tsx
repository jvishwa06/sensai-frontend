"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

interface SpeechToTextInputProps {
    value: string;
    onChange: (value: string) => void;
    onKeyPress?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
    disabled?: boolean;
    autoFocus?: boolean;
    className?: string;
    style?: React.CSSProperties;
    id?: string;
}

// Check if browser supports speech recognition
const getSpeechRecognition = () => {
    if (typeof window === 'undefined') return null;
    
    return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
};

export default function SpeechToTextInput({
    value,
    onChange,
    onKeyPress,
    placeholder = "Type or speak your answer...",
    disabled = false,
    autoFocus = false,
    className = "",
    style = {},
    id
}: SpeechToTextInputProps) {
    const [isListening, setIsListening] = useState(false);
    const [isSpeechSupported, setIsSpeechSupported] = useState(false);
    const [speechError, setSpeechError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [interimText, setInterimText] = useState('');
    
    const recognitionRef = useRef<any>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const lastProcessedLength = useRef(0);

    // Check speech recognition support on mount
    useEffect(() => {
        const SpeechRecognitionClass = getSpeechRecognition();
        setIsSpeechSupported(!!SpeechRecognitionClass);
        
        if (SpeechRecognitionClass) {
            const recognition = new SpeechRecognitionClass();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';
            
            recognition.onstart = () => {
                setIsListening(true);
                setIsProcessing(false);
                setSpeechError(null);
                setInterimText('');
                lastProcessedLength.current = value.length;
            };
            
            recognition.onresult = (event: any) => {
                let finalTranscript = '';
                let interimTranscript = '';
                
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }
                
                // Update interim text for real-time display
                setInterimText(interimTranscript);
                
                // Add final transcript to the existing value
                if (finalTranscript) {
                    const baseText = value.substring(0, lastProcessedLength.current);
                    const newValue = baseText + (baseText && !baseText.endsWith(' ') ? ' ' : '') + finalTranscript.trim();
                    onChange(newValue);
                    lastProcessedLength.current = newValue.length;
                    setInterimText('');
                }
            };
            
            recognition.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error);
                setSpeechError(event.error);
                setIsListening(false);
                setIsProcessing(false);
                setInterimText('');
            };
            
            recognition.onend = () => {
                setIsListening(false);
                setIsProcessing(false);
                setInterimText('');
            };
            
            recognitionRef.current = recognition;
        }
        
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    // Handle speech recognition toggle
    const toggleSpeechRecognition = () => {
        if (!recognitionRef.current || disabled) return;
        
        if (isListening) {
            recognitionRef.current.stop();
        } else {
            setIsProcessing(true);
            try {
                recognitionRef.current.start();
            } catch (error) {
                console.error('Error starting speech recognition:', error);
                setSpeechError('Failed to start speech recognition');
                setIsProcessing(false);
            }
        }
    };

    // Handle textarea changes
    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
        adjustTextareaHeight();
    };

    // Auto-resize textarea
    const adjustTextareaHeight = () => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        textarea.style.height = 'auto';
        const lineHeight = 24;
        const maxHeight = lineHeight * 6;
        const newHeight = Math.min(textarea.scrollHeight, maxHeight);
        textarea.style.height = `${newHeight}px`;
        
        if (textarea.scrollHeight > maxHeight) {
            textarea.style.overflowY = 'scroll';
        } else {
            textarea.style.overflowY = 'hidden';
        }
    };

    // Adjust height when value changes
    useEffect(() => {
        adjustTextareaHeight();
    }, [value]);

    // Focus handling
    useEffect(() => {
        if (autoFocus && textareaRef.current && !disabled) {
            textareaRef.current.focus();
        }
    }, [autoFocus, disabled]);

    // Display value including interim results
    const displayValue = value + (interimText ? (value && !value.endsWith(' ') ? ' ' : '') + interimText : '');

    return (
        <div className="relative flex items-center w-full">
            {/* Speech recognition button */}
            {isSpeechSupported && (
                <button
                    type="button"
                    onClick={toggleSpeechRecognition}
                    disabled={disabled || isProcessing}
                    className={`
                        absolute left-3 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200
                        ${isListening 
                            ? 'bg-red-500 text-white shadow-lg animate-pulse' 
                            : 'bg-gray-600 hover:bg-gray-700 text-gray-300 hover:text-white'
                        }
                        ${disabled || isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                    title={isListening ? 'Stop listening' : 'Start voice input'}
                >
                    {isProcessing ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : isListening ? (
                        <div className="relative">
                            <Mic size={16} />
                            {/* Pulsing dots around mic to show it's listening */}
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-ping opacity-75"></div>
                            <div className="absolute -bottom-1 -left-1 w-1.5 h-1.5 bg-white rounded-full animate-ping opacity-50" style={{ animationDelay: '0.3s' }}></div>
                        </div>
                    ) : (
                        <Mic size={16} />
                    )}
                </button>
            )}

            {/* Textarea */}
            <textarea
                ref={textareaRef}
                id={id}
                value={displayValue}
                onChange={handleTextareaChange}
                onKeyPress={onKeyPress}
                placeholder={placeholder}
                disabled={disabled}
                className={`
                    w-full bg-transparent text-white resize-none placeholder-gray-400
                    ${isSpeechSupported ? 'pl-12' : 'pl-4'} pr-4 py-3
                    min-h-[40px] max-h-[144px] 
                    ${className}
                `}
                style={{
                    border: "none",
                    outline: "none",
                    boxShadow: "none",
                    lineHeight: "20px",
                    fontSize: "14px",
                    ...style
                }}
                rows={1}
            />

            {/* Status indicators */}
            {isListening && (
                <div className="absolute right-3 flex items-center space-x-2">
                    <div className="flex items-center space-x-0.5 h-5">
                        <div className="w-1 h-4 bg-red-500 rounded animate-pulse"></div>
                        <div className="w-1 h-2 bg-red-400 rounded animate-pulse self-center" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-1 h-5 bg-red-500 rounded animate-pulse"></div>
                        <div className="w-1 h-3 bg-red-400 rounded animate-pulse self-center" style={{ animationDelay: '0.3s' }}></div>
                    </div>
                    <Volume2 size={14} className="text-red-500" />
                </div>
            )}

            {/* Error message */}
            {speechError && (
                <div className="absolute -top-8 left-0 right-0 text-xs text-red-400 text-center">
                    {speechError === 'not-allowed' && 'Microphone access denied'}
                    {speechError === 'no-speech' && 'No speech detected'}
                    {speechError === 'network' && 'Network error'}
                    {speechError && !['not-allowed', 'no-speech', 'network'].includes(speechError) && 'Speech recognition error'}
                </div>
            )}
        </div>
    );
}
