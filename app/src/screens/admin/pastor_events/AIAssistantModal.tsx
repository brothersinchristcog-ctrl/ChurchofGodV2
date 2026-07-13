import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  Easing
} from 'react-native';
import { colors, radius, spacing, typography } from '../../../theme/Theme';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { sendToGroq, Message, EventDraft, transcribeAudio, extractEventDetails } from '../../../services/groqApi';
import EventConfirmationCard from '../../../components/EventConfirmationCard';
import EventSuccessCard from '../../../components/EventSuccessCard';
import SalesforceService from '../../../services/SalesforceService';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';

let globalActiveRecording: Audio.Recording | null = null;
const parseSafeDate = (dStr: string) => {
  let s = dStr.replace(' ', 'T');
  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date() : d;
};


// --- State Machine Conversation Flow Helpers ---
const getCurrentStep = (draft: EventDraft) => {
  if (!draft.title) return "eventName";
  
  const hasDate = draft.startDateTime ? draft.startDateTime.split('T')[0] : null;
  if (!hasDate) return "date";
  
  const hasStartTime = draft.startDateTime && draft.startDateTime.includes('T') && !draft.startDateTime.endsWith('T00:00:00') && !draft.startDateTime.endsWith('T00:00');
  if (!hasStartTime) return "startTime";
  
  const hasEndTime = draft.endDateTime && draft.endDateTime.includes('T') && !draft.endDateTime.endsWith('T00:00:00') && !draft.endDateTime.endsWith('T00:00');
  if (!hasEndTime) return "endTime";
  
  if (!draft.venueName) return "venue";
  if (!draft.city) return "town";
  if (!draft.address) return "address";
  if (!draft.notes) return "notes";
  return "confirmation";
};

const getChecklistSummary = (draft: EventDraft, lang: 'en' | 'te') => {
  const isTelugu = lang === 'te';
  
  const hasDate = draft.startDateTime ? draft.startDateTime.split('T')[0] : null;
  const hasStartTime = draft.startDateTime && draft.startDateTime.includes('T') && !draft.startDateTime.endsWith('T00:00:00') && !draft.startDateTime.endsWith('T00:00');
  const hasEndTime = draft.endDateTime && draft.endDateTime.includes('T') && !draft.endDateTime.endsWith('T00:00:00') && !draft.endDateTime.endsWith('T00:00');

  const fields = [
    { key: 'eventName', en: 'Event Name', te: 'ఈవెంట్ పేరు', val: draft.title },
    { key: 'date', en: 'Date', te: 'తేదీ', val: hasDate },
    { key: 'startTime', en: 'Start Time', te: 'ప్రారంభ సమయం', val: hasStartTime ? draft.startDateTime?.split('T')[1]?.substring(0, 5) : null },
    { key: 'endTime', en: 'End Time', te: 'ముగింపు సమయం', val: hasEndTime ? draft.endDateTime?.split('T')[1]?.substring(0, 5) : null },
    { key: 'venue', en: 'Venue', te: 'చర్చ్ పేరు', val: draft.venueName },
    { key: 'town', en: 'Town', te: 'పట్టణము', val: draft.city },
    { key: 'address', en: 'Full Address', te: 'పూర్తి చిరునామా', val: draft.address },
    { key: 'notes', en: 'Notes', te: 'గమనికలు', val: draft.notes }
  ];

  const captured = fields.filter(f => f.val);
  const missing = fields.filter(f => !f.val);

  if (captured.length === 0) return "";

  let res = "";
  if (isTelugu) {
    res += "నేను ఈ వివరాలను గుర్తించాను:\n\n";
    captured.forEach(f => {
      res += `${f.te} ✓\n`;
    });
    if (missing.length > 0) {
      res += "\nఇంకా ఈ వివరాలు అవసరం:\n\n";
      missing.forEach(f => {
        res += `${f.te} (తప్పనిసరి)\n`;
      });
    }
  } else {
    res += "I have captured:\n\n";
    captured.forEach(f => {
      res += `${f.en} ✓\n`;
    });
    if (missing.length > 0) {
      res += "\nI still need:\n\n";
      missing.forEach(f => {
        res += `${f.en} (Mandatory)\n`;
      });
    }
  }
  return res;
};

const getNextQuestion = (step: string, lang: 'en' | 'te') => {
  const isTelugu = lang === 'te';
  switch (step) {
    case "eventName":
      return isTelugu ? "<speak>ఈవెంట్ పేరు ఏమిటి?</speak>" : "What is the name of the event?";
    case "date":
      return isTelugu ? "<speak>ఈ సమావేశాన్ని ఏ తేదీన నిర్వహించాలి?</speak>" : "<speak>On which date should I schedule this event?</speak>";
    case "startTime":
      return isTelugu ? "<speak>ఎన్ని గంటలకు ప్రారంభమవుతుంది?</speak>" : "<speak>What time does the event start?</speak>";
    case "endTime":
      return isTelugu ? "<speak>ఎన్ని గంటలకు ముగుస్తుంది?</speak>" : "<speak>What time does the event end?</speak>";
    case "venue":
      return isTelugu ? "<speak>సమావేశం నిర్వహించే చర్చ్ లేదా వేదిక పేరు ఏమిటి?</speak>" : "<speak>What is the name of the church or venue?</speak>";
    case "town":
      return isTelugu ? "<speak>ఈ సమావేశం ఏ పట్టణం లేదా గ్రామంలో జరుగుతుంది?</speak>" : "<speak>Which town or village is the event being held in?</speak>";
    case "address":
      return isTelugu ? "<speak>దయచేసి పూర్తి చిరునామా ఇవ్వండి.</speak>" : "<speak>Please provide the full address of the venue.</speak>";
    case "notes":
      return isTelugu ? "<speak>సభ్యులకు తెలియజేయాలనుకునే సూచనలు లేదా గమనికలు ఏమిటి?</speak>" : "<speak>Please enter any notes or instructions for the members.</speak>";
    default:
      return "";
  }
};

const getFinalSummaryText = (draft: EventDraft, lang: 'en' | 'te') => {
  const isTelugu = lang === 'te';
  
  const dateVal = draft.startDateTime ? draft.startDateTime.split('T')[0] : '';
  const startTimeVal = draft.startDateTime && draft.startDateTime.includes('T') ? draft.startDateTime.split('T')[1].substring(0, 5) : '';
  const endTimeVal = draft.endDateTime && draft.endDateTime.includes('T') ? draft.endDateTime.split('T')[1].substring(0, 5) : '';
  
  // Calculate duration
  let durationStr = "";
  if (draft.startDateTime && draft.endDateTime) {
    try {
      const diffMs = new Date(draft.endDateTime).getTime() - new Date(draft.startDateTime).getTime();
      const diffMins = Math.max(0, Math.floor(diffMs / 60000));
      const hrs = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      if (isTelugu) {
        durationStr = `${hrs > 0 ? hrs + ' గంటల ' : ''}${mins > 0 ? mins + ' నిమిషాలు' : ''}`;
      } else {
        durationStr = `${hrs > 0 ? hrs + ' Hours ' : ''}${mins > 0 ? mins + ' Minutes' : ''}`;
      }
    } catch(e) {}
  }

  if (isTelugu) {
    return `దయచేసి ఈవెంట్ వివరాలను ఒకసారి పరిశీలించండి.

ఈవెంట్ పేరు: ${draft.title || ''}
తేదీ: ${dateVal}
సమయం: ${startTimeVal} నుండి ${endTimeVal} వరకు
వ్యవధి: ${durationStr}
చర్చ్ / వేదిక: ${draft.venueName || ''}
పట్టణం / గ్రామం: ${draft.city || ''}
పూర్తి చిరునామా: ${draft.address || ''}
గమనికలు: ${draft.notes || ''}

<speak>ఈ ఈవెంట్ను సృష్టించనా?</speak>`;
  } else {
    return `Please review the event details.

Event Name: ${draft.title || ''}
Date: ${dateVal}
Time: ${startTimeVal} – ${endTimeVal}
Duration: ${durationStr}
Venue: ${draft.venueName || ''}
Town/Village: ${draft.city || ''}
Full Address: ${draft.address || ''}
Notes: ${draft.notes || ''}

<speak>Would you like me to create this event?</speak>`;
  }
};

export default function AIAssistantModal({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "👋 Hello Pastor! I can help you create a church event. Tap the button below to begin." }
  ]);
  const [selectedLang, setSelectedLang] = useState<'en' | 'te'>('en');

  useEffect(() => {
    if (messages.length === 1 && messages[0].role === 'assistant') {
      if (selectedLang === 'te') {
        setMessages([{ role: 'assistant', content: "👋 నమస్కారం పాస్టర్ గారు! నేను మీకు ఈవెంట్ క్రియేట్ చేయడంలో సహాయం చేయగలను. దిగువ బటన్‌ను నొక్కండి." }]);
      } else {
        setMessages([{ role: 'assistant', content: "👋 Hello Pastor! I can help you create a church event. Tap the button below to begin." }]);
      }
    }
  }, [selectedLang]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [draft, setDraft] = useState<EventDraft>({});
  const [isConfirmationReady, setIsConfirmationReady] = useState(false);
  const [isSuccessVisible, setIsSuccessVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [lastInputWasVoice, setLastInputWasVoice] = useState(false);
  const [speakingMessageIndex, setSpeakingMessageIndex] = useState<number | null>(null);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [voiceState, setVoiceState] = useState<'idle'|'listening'|'thinking'|'speaking'>('idle');
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  
  const handleVoiceTapRef = useRef<() => Promise<void>>(async () => {});
  
  const scrollViewRef = useRef<ScrollView>(null);
  const isHandlingVoiceRef = useRef(false);

  const waveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVoiceMode && voiceState === 'listening') {
      Animated.loop(
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true
        })
      ).start();
    } else {
      waveAnim.stopAnimation();
      waveAnim.setValue(0);
    }
  }, [isVoiceMode, voiceState]);

  const opacity1 = waveAnim.interpolate({ inputRange: [0, 0.2, 0.4, 1], outputRange: [0.3, 1, 0.3, 0.3] });
  const opacity2 = waveAnim.interpolate({ inputRange: [0, 0.2, 0.4, 0.6, 1], outputRange: [0.3, 0.3, 1, 0.3, 0.3] });
  const opacity3 = waveAnim.interpolate({ inputRange: [0, 0.4, 0.6, 0.8, 1], outputRange: [0.3, 0.3, 0.3, 1, 0.3] });

  const containsTelugu = (text: string) => /[\u0C00-\u0C7F]/.test(text);

  const speakMessage = async (text: string, index: number) => {
    try {
      const isCurrentlySpeaking = await Speech.isSpeakingAsync();
      if (isCurrentlySpeaking) {
        await Speech.stop();
        if (speakingMessageIndex === index) {
          setSpeakingMessageIndex(null);
          return;
        }
      }
      setSpeakingMessageIndex(index);

      // Extract <speak> tag if present
      let textToSpeak = text;
      const speakMatch = textToSpeak.match(/<speak>([\s\S]*?)<\/speak>/i);
      if (speakMatch && speakMatch[1]) {
        textToSpeak = speakMatch[1];
      }

      // Clean the text before speaking — strip updateDraft tags and emojis that break TTS
      const cleanText = textToSpeak
        .replace(/<updateDraft>[\s\S]*?<\/updateDraft>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/[\u{1F300}-\u{1FFFF}]/gu, '')
        .trim();
      
      if (!cleanText) return;
      
      const isTelugu = containsTelugu(cleanText) || selectedLang === 'te';
      const targetLang = isTelugu ? 'te-IN' : 'en-US';
      
      const options: any = {
        language: targetLang,
        pitch: 1.0,
        rate: 0.9,
        volume: 1.0,
        onDone: () => setSpeakingMessageIndex(null),
        onStopped: () => setSpeakingMessageIndex(null),
        onError: (err: any) => {
          console.error("Speech Error:", err);
          setSpeakingMessageIndex(null);
        },
      };

      if (isTelugu) {
        // Check if a Telugu voice is available; log a warning if not
        const voices = await Speech.getAvailableVoicesAsync();
        const teluguVoice = voices.find(v => v.language && v.language.toLowerCase().startsWith('te'));
        if (teluguVoice) {
          options.voice = teluguVoice.identifier;
        } else {
          console.warn('No Telugu voice found on this device. Install a Telugu TTS engine from device settings.');
          // Still try with language code — Android may use a generic fallback
        }
      } else {
        const voices = await Speech.getAvailableVoicesAsync();
        const availableVoices = voices.filter(v => v.language.startsWith('en'));
        const maleNames = ['alex', 'daniel', 'aaron', 'fred', 'rishi', 'arthur', 'bruce'];
        const isMale = (v: any) => v.name && (v.name.toLowerCase().includes('male') || maleNames.some(name => v.name.toLowerCase().includes(name)));
        
        let bestVoice = availableVoices.find(v => isMale(v) && v.quality === Speech.VoiceQuality.Enhanced) 
                     || availableVoices.find(v => isMale(v))
                     || availableVoices.find(v => v.quality === Speech.VoiceQuality.Enhanced) 
                     || availableVoices[0];
                     
        if (bestVoice) {
          options.voice = bestVoice.identifier;
        }
      }
      
      Speech.speak(cleanText, options);
    } catch (err) {
      console.error("Speech catch error:", err);
      setSpeakingMessageIndex(null);
    }
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (globalActiveRecording) {
        globalActiveRecording.stopAndUnloadAsync().catch(() => {});
        globalActiveRecording = null;
      }
      Speech.stop();
    };
  }, []);

  useEffect(() => {
    // Scroll to bottom when messages change
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const checkAndSetConflicts = async (currentDraft: EventDraft = draft): Promise<string[]> => {
    if (!currentDraft.startDateTime) return [];
    try {
      const { checkScheduleConflicts } = require('../../../utils/schedule');
      const startMs = parseSafeDate(currentDraft.startDateTime).getTime();
      const conflicts = await checkScheduleConflicts(
        currentDraft.startDateTime,
        startMs,
        currentDraft.durationMinutes || 60
      );
      if (conflicts && conflicts.length > 0) {
        setConflictWarning(`You already have another event scheduled at this time: ${conflicts.join(', ')}`);
        return conflicts;
      } else {
        setConflictWarning(null);
        return [];
      }
    } catch (e) {
      console.warn('Conflict check failed', e);
      setConflictWarning(null);
      return [];
    }
  };

  const handleSend = async (textToSend: string = inputText) => {
    if (!textToSend.trim()) return;

    setInputText('');
    Speech.stop();

    const userText = textToSend.trim();
    const newMessages: Message[] = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);

    // Short-circuit: draft ready + user confirms
    const confirmWords = ['yes', 'confirm', 'save', 'create', 'ok', 'sure', 'yeah', 'do it', 'perfect', 'yep', 'అవును', 'క్రియేట్ చేయండి', 'సరే', 'చేయండి', 'సేవ్'];
    if (draft.isReadyForConfirmation && confirmWords.some(w => userText.toLowerCase().includes(w))) {
      setMessages([...newMessages, { role: 'assistant', content: selectedLang === 'te' ? "నేను మీకోసం కన్ఫర్మేషన్ కార్డ్‌ని సిద్ధం చేసాను. దయచేసి వివరాలను పరిశీలించండి." : "I have prepared the confirmation card for you. Please review the details." }]);
      setIsLoading(true);
      await checkAndSetConflicts();
      setIsLoading(false);
      setIsConfirmationReady(true);
      return;
    }

    setIsLoading(true);
    if (isVoiceMode) setVoiceState('thinking');

    try {
      const currentStep = getCurrentStep(draft);
      const nextDraft = { ...draft };

      // ─── CORRECTION DETECTION: Let pastor fix any previously entered field ───
      // Detect phrases like "change town to Guntur", "wrong address, it's Main Road",
      // "actually the venue is CSI Church", "no update address to ..."
      const lowerText = userText.toLowerCase();
      const correctionTriggers = [
        'change', 'update', 'correct', 'wrong', 'actually', 'no ', 'not ',
        'meant', 'typo', 'fix', 'replace', 'edit', 'modify',
        'మార్చు', 'సరిదిద్దు', 'కాదు', 'మళ్ళీ', 'తప్పు', 'అప్‌డేట్'
      ];
      const isCorrectionIntent = correctionTriggers.some(t => lowerText.includes(t));

      if (isCorrectionIntent) {
        // Determine which field the pastor wants to correct
        const fieldDetectors: Array<{
          field: keyof typeof nextDraft,
          en: string[],
          te: string[],
          valueExtract: (t: string) => string | null
        }> = [
          {
            field: 'title',
            en: ['event name', 'name of the event', 'event title', 'title'],
            te: ['ఈవెంట్ పేరు', 'సమావేశం పేరు'],
            valueExtract: (t) => {
              const m = t.match(/(?:to|is|as|:)\s+(.+)$/i);
              return m ? m[1].trim() : null;
            }
          },
          {
            field: 'venueName',
            en: ['venue', 'church', 'hall', 'place'],
            te: ['వేదిక', 'చర్చ్', 'స్థలం'],
            valueExtract: (t) => {
              const m = t.match(/(?:to|is|as|:)\s+(.+)$/i);
              return m ? m[1].trim() : null;
            }
          },
          {
            field: 'city',
            en: ['town', 'city', 'village', 'location'],
            te: ['పట్టణం', 'గ్రామం', 'నగరం', 'స్థానం'],
            valueExtract: (t) => {
              const m = t.match(/(?:to|is|as|:)\s+(.+)$/i);
              return m ? m[1].trim() : null;
            }
          },
          {
            field: 'address',
            en: ['address', 'full address', 'location is', 'place is'],
            te: ['చిరునామా', 'అడ్రస్', 'పూర్తి చిరునామా'],
            valueExtract: (t) => {
              const m = t.match(/(?:to|is|as|:)\s+(.+)$/i);
              return m ? m[1].trim() : null;
            }
          },
          {
            field: 'notes',
            en: ['note', 'notes', 'instructions', 'message'],
            te: ['గమనికలు', 'సూచనలు', 'నోట్స్'],
            valueExtract: (t) => {
              const m = t.match(/(?:to|is|as|:)\s+(.+)$/i);
              return m ? m[1].trim() : null;
            }
          },
        ];

        let corrected = false;
        for (const detector of fieldDetectors) {
          const matchesField = 
            detector.en.some(k => lowerText.includes(k)) ||
            detector.te.some(k => userText.includes(k));
          
          if (matchesField) {
            // Extract the new value from the message
            const newValue = detector.valueExtract(userText);
            if (newValue) {
              (nextDraft as any)[detector.field] = newValue;
              corrected = true;

              // Acknowledge the correction and re-ask the current step
              const ack = selectedLang === 'te'
                ? `సరే, నేను అప్‌డేట్ చేసాను. ✓

${getNextQuestion(currentStep, selectedLang).replace(/<\/?speak>/gi, '')}`
                : `Got it, I've updated that. ✓

${getNextQuestion(currentStep, selectedLang).replace(/<\/?speak>/gi, '')}`;

              setDraft(nextDraft);
              setMessages([...newMessages, { role: 'assistant', content: ack }]);
              
              if (isVoiceMode) {
                setVoiceState('speaking');
                setSpeakingMessageIndex(newMessages.length);
                const isTelugu = selectedLang === 'te';
                const options: any = {
                  language: isTelugu ? 'te-IN' : 'en-US',
                  pitch: 1.0, rate: 0.95, volume: 1.0,
                  onDone: () => { setSpeakingMessageIndex(null); startRecordingFn(); },
                  onStopped: () => { setSpeakingMessageIndex(null); if (isVoiceMode) startRecordingFn(); },
                  onError: () => { setSpeakingMessageIndex(null); if (isVoiceMode) startRecordingFn(); }
                };
                const voices = await Speech.getAvailableVoicesAsync();
                if (isTelugu) {
                  const v = voices.find(v => v.language?.toLowerCase().startsWith('te'));
                  if (v) options.voice = v.identifier;
                }
                Speech.speak(getNextQuestion(currentStep, selectedLang).replace(/<\/?speak>/gi, ''), options);
              }

              setIsLoading(false);
              if (isVoiceMode) setVoiceState('listening');
              return;
            }
          }
        }
        // If no field detected from correction intent, fall through to normal switch
      }

      // ─── STATE MACHINE: App decides what to save, LLM only parses dates/times ───
      switch (currentStep) {
        case 'eventName': {
          // Detect trigger/intent phrases that should NOT be saved as event name
          const triggerPhrases = [
            'i want to create', 'create an event', 'create event', 'schedule an event',
            'new event', 'plan an event', 'add event', 'make an event',
            'ఒక ఈవెంట్', 'ఈవెంట్ క్రియేట్', 'సమావేశం క్రియేట్'
          ];
          const isTrigger = triggerPhrases.some(p => userText.toLowerCase().includes(p));

          if (isTrigger) {
            // Don't save, just re-ask the event name question
            // nextDraft remains unchanged, getCurrentStep will return 'eventName' again
            // and the question will be re-shown at the bottom
          } else {
            // Accept any non-trivial text as event name directly — no LLM needed
            nextDraft.title = userText;
          }
          break;
        }

        case 'date': {
          // Use LLM to parse natural date (July 26, రేపు, tomorrow, etc.)
          try {
            const extracted = await extractEventDetails(userText, draft, currentStep, selectedLang);
            if (extracted.date) {
              const existingTime = (draft.startDateTime && draft.startDateTime.includes('T') && !draft.startDateTime.endsWith('T00:00:00'))
                ? draft.startDateTime.split('T')[1]
                : '00:00:00';
              nextDraft.startDateTime = `${extracted.date}T${existingTime}`;
            } else {
              // Raw digit fallback: "26" → current month day 26
              const dayMatch = userText.match(/\b(\d{1,2})\b/);
              if (dayMatch) {
                const now = new Date();
                const yr = now.getFullYear();
                const mo = String(now.getMonth() + 1).padStart(2, '0');
                const day = dayMatch[1].padStart(2, '0');
                nextDraft.startDateTime = `${yr}-${mo}-${day}T00:00:00`;
              } else {
                nextDraft.startDateTime = draft.startDateTime || `${new Date().toISOString().split('T')[0]}T00:00:00`;
              }
            }
          } catch {
            const dayMatch = userText.match(/\b(\d{1,2})\b/);
            if (dayMatch) {
              const now = new Date();
              const yr = now.getFullYear();
              const mo = String(now.getMonth() + 1).padStart(2, '0');
              const day = dayMatch[1].padStart(2, '0');
              nextDraft.startDateTime = `${yr}-${mo}-${day}T00:00:00`;
            }
          }
          break;
        }

        case 'startTime': {
          // Use LLM to parse "6 PM", "సాయంత్రం 6", "18:00"
          try {
            const extracted = await extractEventDetails(userText, draft, currentStep, selectedLang);
            if (extracted.startTime && draft.startDateTime) {
              const datePart = draft.startDateTime.split('T')[0];
              const timePart = extracted.startTime.length === 5 ? extracted.startTime + ':00' : extracted.startTime;
              nextDraft.startDateTime = `${datePart}T${timePart}`;
            } else {
              // Raw fallback: look for HH:MM or H PM patterns
              const timeMatch = userText.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|AM|PM)?/i);
              if (timeMatch && draft.startDateTime) {
                let h = parseInt(timeMatch[1]);
                const m = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
                const period = timeMatch[3]?.toLowerCase();
                if (period === 'pm' && h < 12) h += 12;
                if (period === 'am' && h === 12) h = 0;
                const datePart = draft.startDateTime.split('T')[0];
                nextDraft.startDateTime = `${datePart}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`;
              }
            }
          } catch {
            const timeMatch = userText.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|AM|PM)?/i);
            if (timeMatch && draft.startDateTime) {
              let h = parseInt(timeMatch[1]);
              const m = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
              const period = timeMatch[3]?.toLowerCase();
              if (period === 'pm' && h < 12) h += 12;
              if (period === 'am' && h === 12) h = 0;
              const datePart = draft.startDateTime.split('T')[0];
              nextDraft.startDateTime = `${datePart}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`;
            }
          }
          break;
        }

        case 'endTime': {
          try {
            const extracted = await extractEventDetails(userText, draft, currentStep, selectedLang);
            if (extracted.endTime && nextDraft.startDateTime) {
              const datePart = nextDraft.startDateTime.split('T')[0];
              const timePart = extracted.endTime.length === 5 ? extracted.endTime + ':00' : extracted.endTime;
              nextDraft.endDateTime = `${datePart}T${timePart}`;
            } else {
              const timeMatch = userText.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|AM|PM)?/i);
              if (timeMatch && nextDraft.startDateTime) {
                let h = parseInt(timeMatch[1]);
                const m = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
                const period = timeMatch[3]?.toLowerCase();
                if (period === 'pm' && h < 12) h += 12;
                if (period === 'am' && h === 12) h = 0;
                const datePart = nextDraft.startDateTime.split('T')[0];
                nextDraft.endDateTime = `${datePart}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`;
              }
            }
          } catch {
            const timeMatch = userText.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|AM|PM)?/i);
            if (timeMatch && nextDraft.startDateTime) {
              let h = parseInt(timeMatch[1]);
              const m = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
              const period = timeMatch[3]?.toLowerCase();
              if (period === 'pm' && h < 12) h += 12;
              if (period === 'am' && h === 12) h = 0;
              const datePart = nextDraft.startDateTime.split('T')[0];
              nextDraft.endDateTime = `${datePart}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`;
            }
          }
          break;
        }

        case 'venue':
          nextDraft.venueName = userText;
          break;

        case 'town':
          nextDraft.city = userText;
          break;

        case 'address':
          nextDraft.address = userText;
          break;

        case 'notes':
          nextDraft.notes = userText;
          break;
      }

      // Check conflicts
      await checkAndSetConflicts(nextDraft);

      // Determine next step and build response
      const nextStep = getCurrentStep(nextDraft);
      let responseText = "";

      if (nextStep === "confirmation") {
        nextDraft.isReadyForConfirmation = true;
        responseText = getFinalSummaryText(nextDraft, selectedLang);
      } else {
        const question = getNextQuestion(nextStep, selectedLang);
        responseText = question.replace(/<\/?speak>/gi, "").trim();
      }

      setDraft(nextDraft);
      setMessages([...newMessages, { role: 'assistant', content: responseText }]);

      // Voice mode TTS
      if (isVoiceMode) {
        setVoiceState('speaking');
        setSpeakingMessageIndex(newMessages.length);

        const isTelugu = containsTelugu(responseText) || selectedLang === 'te';
        const targetLang = isTelugu ? 'te-IN' : 'en-US';

        const options: any = {
          language: targetLang,
          pitch: 1.0,
          rate: 0.95,
          volume: 1.0,
          onDone: () => { setSpeakingMessageIndex(null); startRecordingFn(); },
          onStopped: () => { setSpeakingMessageIndex(null); if (isVoiceMode) startRecordingFn(); },
          onError: (err: any) => { console.error("Auto Speech Error:", err); setSpeakingMessageIndex(null); if (isVoiceMode) startRecordingFn(); }
        };

        let textToSpeak = responseText;
        const speakMatch = textToSpeak.match(/<speak>([\s\S]*?)<\/speak>/i);
        if (speakMatch && speakMatch[1]) textToSpeak = speakMatch[1];

        const cleanResponseText = textToSpeak
          .replace(/<updateDraft>[\s\S]*?<\/updateDraft>/gi, '')
          .replace(/<[^>]+>/g, '')
          .replace(/[\u{1F300}-\u{1FFFF}]/gu, '')
          .trim();

        if (isTelugu) {
          const voices = await Speech.getAvailableVoicesAsync();
          const teluguVoice = voices.find(v => v.language && v.language.toLowerCase().startsWith('te'));
          if (teluguVoice) options.voice = teluguVoice.identifier;
        } else {
          const voices = await Speech.getAvailableVoicesAsync();
          const availableVoices = voices.filter(v => v.language.startsWith('en'));
          const maleNames = ['alex', 'daniel', 'aaron', 'fred', 'rishi', 'arthur', 'bruce'];
          const isMale = (v: any) => v.name && (v.name.toLowerCase().includes('male') || maleNames.some(n => v.name.toLowerCase().includes(n)));
          const bestVoice = availableVoices.find(v => isMale(v) && v.quality === Speech.VoiceQuality.Enhanced)
                         || availableVoices.find(v => isMale(v))
                         || availableVoices.find(v => v.quality === Speech.VoiceQuality.Enhanced)
                         || availableVoices[0];
          if (bestVoice) options.voice = bestVoice.identifier;
        }

        Speech.speak(cleanResponseText, options);
      }

    } catch (e: any) {
      console.error(e);
      Alert.alert("Error", "Could not process your input. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const startRecordingFn = async () => {
    const permission = await Audio.requestPermissionsAsync();
    if (permission.status === 'granted') {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      if (globalActiveRecording) {
        try { await globalActiveRecording.stopAndUnloadAsync(); } catch(e) {}
        globalActiveRecording = null;
      }
      if (recording) {
        try { await recording.stopAndUnloadAsync(); } catch(e) {}
        setRecording(null);
      }

      try {
        let silenceStartTime: number | null = null;
        let hasSpoken = false;

        const { recording: newRecording } = await Audio.Recording.createAsync(
          { ...Audio.RecordingOptionsPresets.LOW_QUALITY, isMeteringEnabled: true },
          (status) => {
            if (status.isRecording && status.metering !== undefined) {
              const isSpeaking = status.metering > -35; 
              if (isSpeaking) {
                hasSpoken = true;
                silenceStartTime = null;
              } else if (hasSpoken) {
                if (silenceStartTime === null) {
                  silenceStartTime = Date.now();
                } else if (Date.now() - silenceStartTime > 1500) {
                  // 1.5 seconds of silence -> Auto stop!
                  newRecording.setOnRecordingStatusUpdate(null);
                  if (handleVoiceTapRef.current) handleVoiceTapRef.current();
                }
              }
            }
          },
          200
        );
        globalActiveRecording = newRecording;
        setRecording(newRecording);
        setIsRecording(true);
        if (isVoiceMode) setVoiceState('listening');
      } catch (createErr: any) {
        Alert.alert("Microphone Error", "Microphone could not be started.");
      }
    } else {
      Alert.alert("Permission Required", "Please grant microphone permission.");
    }
  };

  const handleVoiceTap = async (forceExit: boolean = false) => {
    if (isHandlingVoiceRef.current) return;
    isHandlingVoiceRef.current = true;

    try {
      if (forceExit || (isVoiceMode && voiceState !== 'listening')) {
        // User tapped the Voice UI button to exit Voice Mode
        setIsVoiceMode(false);
        Speech.stop();
        if (recording || globalActiveRecording) {
          try { await (recording || globalActiveRecording)?.stopAndUnloadAsync(); } catch(e){}
        }
        setIsRecording(false);
        setRecording(null);
        globalActiveRecording = null;
        setMessages(prev => [...prev, { role: 'system', content: 'Voice Chat Ended' }]);
        return;
      }

      if (isRecording) {
        // User tapped the Big Mic to stop recording and send
        setIsRecording(false);
        setIsTranscribing(true);

        const recToStop = recording || globalActiveRecording;
        if (recToStop) {
          try {
            try { await recToStop.stopAndUnloadAsync(); } catch(e) { console.log('Recording already unloaded, proceeding...'); }
            const uri = recToStop.getURI();
            setRecording(null);
            globalActiveRecording = null;

            if (uri) {
              const text = await transcribeAudio(uri, selectedLang);
              if (text && text.trim()) {
                setInputText(text);
                setLastInputWasVoice(true);
                // Auto-send in voice mode
                if (isVoiceMode) {
                  handleSend(text);
                }
              }
            }
          } catch (e: any) {
            console.error(e);
            if (e?.message && e.message.includes('429')) {
              Alert.alert("Server busy", "The server is currently busy. Please try again in a moment.");
            } else {
              Alert.alert("Audio Error", "We could not understand your audio. Please speak again.");
            }
          }
        }
        setIsTranscribing(false);
      } else {
        // User tapped the mic to START voice mode
        setIsVoiceMode(true);
        setVoiceState('listening');
        startRecordingFn();
      }
    } catch (err) {
      console.error('Failed to handle recording', err);
      setIsRecording(false);
      setIsTranscribing(false);
    } finally {
      isHandlingVoiceRef.current = false;
    }
  };

  useEffect(() => {
    handleVoiceTapRef.current = handleVoiceTap;
  }, [handleVoiceTap]);

  const saveEvent = async () => {
    try {
      Speech.stop(); // Stop any ongoing speech when user clicks save
      setIsSaving(true);

      let startDateTimeStr = draft.startDateTime ? parseSafeDate(draft.startDateTime).toISOString() : new Date().toISOString();
      let endDateTimeStr = draft.endDateTime ? parseSafeDate(draft.endDateTime).toISOString() : '';
      if (!endDateTimeStr) {
        const d = new Date(startDateTimeStr);
        d.setHours(d.getHours() + 1);
        endDateTimeStr = d.toISOString();
      }

      const fullLocation = [draft.venueName, draft.city, draft.address]
        .filter(Boolean)
        .join(' — ');
      const payload = {
        Subject: draft.title || 'Untitled Event',
        StartDateTime: startDateTimeStr,
        EndDateTime: endDateTimeStr,
        Location: fullLocation,
        Description: draft.notes || ''
      };
      
      await SalesforceService.createPastorEvent(payload);
      setIsSuccessVisible(true);
    } catch (e: any) {
      Alert.alert("Error", "Could not save the event. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: '#fff' }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 80}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: '#fff' }]} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBadge}>
            <Text style={styles.backBadgeText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.langToggleContainer}>
            <TouchableOpacity 
              style={[styles.langButton, selectedLang === 'en' && styles.langButtonActive]}
              onPress={() => setSelectedLang('en')}
            >
              <Text style={[styles.langButtonText, selectedLang === 'en' && styles.langButtonTextActive]}>English</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.langButton, selectedLang === 'te' && styles.langButtonActive]}
              onPress={() => setSelectedLang('te')}
            >
              <Text style={[styles.langButtonText, selectedLang === 'te' && styles.langButtonTextActive]}>తెలుగు</Text>
            </TouchableOpacity>
          </View>
        </View>

      {isSuccessVisible ? (
        <View style={styles.confirmationContainer}>
          <EventSuccessCard onDone={() => navigation.navigate('Dashboard', { refresh: true })} />
        </View>
      ) : isConfirmationReady ? (
        <View style={styles.confirmationContainer}>
          <EventConfirmationCard 
            draft={draft} 
            onConfirm={saveEvent}
            onEdit={() => {
              setIsConfirmationReady(false);
              setConflictWarning(null);
              if (isVoiceMode) {
                setVoiceState('listening');
                startRecordingFn();
              }
            }}
            isSaving={isSaving}
            conflictWarning={conflictWarning}
          />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView ref={scrollViewRef} style={styles.chatArea} contentContainerStyle={{ padding: spacing.md }}>
            {messages.map((msg, idx) => {
              if (msg.role === 'system') {
                return (
                  <View key={idx} style={styles.systemMessageContainer}>
                    <Text style={styles.systemMessageText}>{msg.content}</Text>
                  </View>
                );
              }
              return (
                <View key={idx}>
                  <View 
                    style={[
                      styles.messageBubble, 
                      msg.role === 'user' ? styles.userBubble : styles.aiBubble
                    ]}
                  >
                    {msg.role === 'assistant' && (
                      <Ionicons name="sparkles" size={14} color={colors.primaryDark} style={{ marginRight: 6, marginTop: 2 }} />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={[
                        styles.messageText, 
                        msg.role === 'user' ? styles.userText : styles.aiText
                      ]}>
                        {msg.content?.replace(/<updateDraft>[\s\S]*?<\/updateDraft>/gi, '').replace(/<\/?speak>/gi, '').trim()}
                      </Text>
                    </View>
                    {msg.role === 'assistant' && (
                      <TouchableOpacity 
                        style={{ paddingLeft: 8, justifyContent: 'flex-end', paddingBottom: 2 }}
                        onPress={() => speakMessage(msg.content || '', idx)}
                      >
                        <Ionicons 
                          name={speakingMessageIndex === idx ? "stop-circle" : "volume-high"} 
                          size={20} 
                          color={speakingMessageIndex === idx ? colors.error : colors.primary} 
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  {/* Suggested action badges below last AI message */}
                  {!isConfirmationReady && !isLoading && idx === messages.length - 1 && msg.role === 'assistant' && (
                    <View style={{ flexDirection: 'row', paddingBottom: spacing.sm, paddingLeft: 4, gap: 8, flexWrap: 'wrap', marginTop: 4, marginBottom: spacing.md }}>

                      {/* Create Event badge — only on the welcome message before pastor starts */}
                      {messages.length === 1 && !draft.title && (
                        <TouchableOpacity
                          style={{ backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: colors.primary }}
                          onPress={() => {
                            const q = selectedLang === 'te' ? 'ఈవెంట్ పేరు ఏమిటి?' : 'What is the name of the event?';
                            setMessages(prev => [...prev, { role: 'assistant', content: q }]);
                          }}
                        >
                          <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 14 }}>
                            {selectedLang === 'te' ? '📅 ఈవెంట్ క్రియేట్ చేయండి' : '📅 Create Event'}
                          </Text>
                        </TouchableOpacity>
                      )}

                      {/* Yes create it badge — when all fields are collected */}
                      {draft.isReadyForConfirmation && (
                        <TouchableOpacity
                          style={{ backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: colors.success }}
                          onPress={() => handleSend(selectedLang === 'te' ? 'అవును, క్రియేట్ చేయండి' : 'Yes, create it')}
                        >
                          <Text style={{ color: colors.success, fontWeight: '700', fontSize: 14 }}>
                            {selectedLang === 'te' ? '✅ అవును, క్రియేట్ చేయండి' : '✅ Yes, Create Event'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
            {isLoading && (
              <View style={[styles.messageBubble, styles.aiBubble, { width: 60 }]}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            )}
          </ScrollView>

          {/* Draft Preview Bar */}
          {Object.keys(draft).length > 0 && (
            <View style={styles.draftPreviewBar}>
              <Text style={styles.draftPreviewText} numberOfLines={1}>
                <Ionicons name="document-text-outline" size={12} /> Drafting: {draft.title || 'Event'} {draft.startDateTime ? '📅' : ''}
              </Text>
            </View>
          )}

          <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                placeholder={isVoiceMode ? (voiceState === 'listening' ? 'Listening...' : voiceState === 'thinking' ? 'Thinking...' : 'Speaking...') : "Type or use voice..."}
                placeholderTextColor={isVoiceMode ? colors.primary : colors.textTertiary}
                value={inputText}
                onChangeText={(txt) => {
                  setInputText(txt);
                  if (!txt.trim()) setLastInputWasVoice(false);
                }}
                multiline
                editable={!isVoiceMode}
              />

              <View style={{ marginBottom: 4, marginRight: 4 }}>
                {isVoiceMode ? (
                  <TouchableOpacity 
                    style={styles.endBadge} 
                    onPress={() => handleVoiceTap(true)}
                  >
                    {voiceState === 'thinking' ? (
                      <ActivityIndicator size="small" color="#fff" style={{ marginRight: 4 }} />
                    ) : voiceState === 'speaking' ? (
                      <Ionicons name="volume-high" size={16} color="#fff" style={{ marginRight: 4 }} />
                    ) : (
                      <View style={{ flexDirection: 'row', marginRight: 6, alignItems: 'center', height: 16 }}>
                        <Animated.View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#fff', opacity: opacity1, marginRight: 2 }} />
                        <Animated.View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#fff', opacity: opacity2, marginRight: 2 }} />
                        <Animated.View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#fff', opacity: opacity3 }} />
                      </View>
                    )}
                    <Text style={styles.endBadgeText}>End</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={styles.actionButton} 
                    onPress={() => inputText.trim() ? handleSend() : handleVoiceTap()}
                    disabled={inputText.trim() ? isLoading : isTranscribing}
                  >
                    {isTranscribing || (inputText.trim() && isLoading) ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : inputText.trim() ? (
                      <Ionicons name="send" size={20} color={colors.primary} style={{ marginLeft: 2 }} />
                    ) : (
                      <Ionicons name="mic" size={22} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>
      )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgSecondary
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: 0,
    paddingBottom: spacing.sm,
    backgroundColor: '#fff',
  },
  backBadge: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  chatArea: {
    flex: 1
  },
  messageBubble: {
    maxWidth: '80%',
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    flexDirection: 'row'
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderBottomRightRadius: 0
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderBottomLeftRadius: 0,
    borderWidth: 1,
    borderColor: colors.border
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    flex: 1
  },
  userText: {
    color: '#fff'
  },
  aiText: {
    color: colors.textPrimary
  },
  draftPreviewBar: {
    backgroundColor: '#ffffff',
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  draftPreviewText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600'
  },
  inputContainer: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: '#fff',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 20,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: spacing.md,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
    color: colors.textPrimary
  },
  actionButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    marginRight: 4,
  },
  confirmationContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg
  },
  endBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  endBadgeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  systemMessageContainer: {
    alignSelf: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginVertical: 8,
  },
  systemMessageText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  langToggleContainer: {
    flexDirection: 'row',
    marginLeft: 'auto',
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  langButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
  },
  langButtonActive: {
    backgroundColor: colors.primary,
  },
  langButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  langButtonTextActive: {
    color: '#fff',
  },
});


