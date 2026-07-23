import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
  ImageBackground,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { diagnosePlant, type PlantDiagnosis } from '@/lib/finds';

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'doctor';
  timestamp: Date;
};

export default function PlantDoctor() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    photoUri?: string;
    plantName?: string;
    location?: string;
    date?: string;
    note?: string;
    autoTrigger?: string;
  }>();
  const plantName = params.plantName ?? 'your plant';

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Initialize with greeting message or auto-diagnostic flow
  useEffect(() => {
    const isAuto = params.autoTrigger === 'true';
    const initDate = params.date || new Date().toLocaleDateString();
    const initLoc = params.location || 'Nearby';
    const initNote = params.note || '';

    const welcomeMsg: Message = {
      id: 'welcome',
      text: `Hello! I am your AI Plant Doctor. 🌿\n\nI see you've successfully logged your ${plantName} in your Garden! I am reviewing your log data to diagnose its health.`,
      sender: 'doctor',
      timestamp: new Date(),
    };

    if (isAuto) {
      const userMsgText = `📋 *Log Details*:\n• Date: ${initDate}\n• Location: ${initLoc}\n• Notes: "${initNote || 'None'}"\n\nDoctor, please analyze my plant's health.`;

      const userMsg: Message = {
        id: 'auto-user',
        text: userMsgText,
        sender: 'user',
        timestamp: new Date(),
      };

      setMessages([welcomeMsg, userMsg]);
      setIsTyping(true);

      let active = true;
      (async () => {
        // Real diagnosis from the diagnose-plant edge function (Gemini). Needs the photo —
        // without it there's nothing to analyze, so fall back to the generic care tips.
        let finalDiagnosis: string;
        try {
          if (!params.photoUri) throw new Error('no photo');
          const result = await diagnosePlant(params.photoUri, initNote || undefined);
          finalDiagnosis = `🩺 *Health Diagnosis & Recommendations*:\n\n${formatDiagnosis(result)}`;
        } catch {
          finalDiagnosis = `🩺 *Health Diagnosis & Recommendations*:\n\n${generateDoctorResponse(
            initNote || 'general care'
          )}\n\n_(Live analysis was unavailable, so these are general care tips.)_`;
        }
        if (!active) return;
        setMessages((prev) => [
          ...prev,
          {
            id: 'auto-diagnosis',
            text: finalDiagnosis,
            sender: 'doctor',
            timestamp: new Date(),
          },
        ]);
        setIsTyping(false);
      })();

      return () => {
        active = false;
      };
    } else {
      setMessages([
        {
          id: 'welcome',
          text: `Hello! I am your AI Plant Doctor. 🌿\n\nI've examined the photo of your ${plantName}. What issues are you experiencing with it? (e.g. brown leaf tips, yellowing, watering queries, or general care advice?)`,
          sender: 'doctor',
          timestamp: new Date(),
        },
      ]);
    }
  }, [plantName, params.autoTrigger]);

  // Render the edge function's structured report as a chat message.
  const formatDiagnosis = (d: PlantDiagnosis): string => {
    const confidence = Number.isFinite(d.confidence)
      ? ` (${Math.round(d.confidence * 100)}% confidence)`
      : '';
    const steps = (d.action_plan ?? []).map((s) => `• ${s}`).join('\n');
    return [
      `*${d.diagnosis}*${confidence}`,
      d.description,
      steps && `*What to do:*\n${steps}`,
    ]
      .filter(Boolean)
      .join('\n\n');
  };

  const generateDoctorResponse = (userText: string): string => {
    const text = userText.toLowerCase();
    
    // Custom responses based on keywords & plantName
    if (text.includes('water') || text.includes('drown') || text.includes('dry') || text.includes('wet')) {
      return `Watering issues are the most common cause of stress for a ${plantName}. \n\nTypically, you should wait until the top 1-2 inches of soil are dry before watering again. Ensure your pot has drainage holes at the bottom so the roots don't sit in stagnant water, which causes root rot.`;
    }
    
    if (text.includes('brown') || text.includes('spot') || text.includes('yellow') || text.includes('leaf') || text.includes('leaves')) {
      return `Brown leaf tips on a ${plantName} often point to low humidity or drafty conditions. Yellowing leaves usually suggest overwatering, while crispy brown spots can mean sunburn from direct exposure. \n\nI recommend trimming damaged leaves with clean pruning shears and checking the light levels.`;
    }

    if (text.includes('soil') || text.includes('repot') || text.includes('potting') || text.includes('dirt')) {
      return `A well-draining soil mix is essential for a ${plantName}. Use a blend of peat moss, perlite, and regular potting soil. \n\nOnly repot if you see roots growing out of the drainage holes, typically once every 12 to 18 months during spring.`;
    }

    if (text.includes('sun') || text.includes('light') || text.includes('dark') || text.includes('shadow')) {
      return `Most indoor species like the ${plantName} thrive in bright, indirect sunlight. If it is in direct sunlight, the leaves may scorch. If it is in a dark corner, growth will slow and leaves may drop. \n\nTry moving it closer to an east or north-facing window.`;
    }

    return `Based on the photo and log details, your ${plantName} appears to be in solid overall health! The foliage is vibrant and shows no immediate signs of pests, severe disease, or nutrient deficiencies.\n\nHere are key care diagnostics to keep it thriving:\n• Light: Place in a spot with bright, indirect sunlight (avoid harsh midday direct sun).\n• Water: Hydrate thoroughly only when the top 1-2 inches of soil feel dry to the touch.\n• Environment: Keep in a warm, draft-free room to prevent leaf dropping.`;
  };

  const handleSend = () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Math.random().toString(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // Simulate AI Doctor typing response
    setTimeout(() => {
      const doctorMessage: Message = {
        id: Math.random().toString(),
        text: generateDoctorResponse(userMessage.text),
        sender: 'doctor',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, doctorMessage]);
      setIsTyping(false);
    }, 1500);
  };

  // Auto-scroll list when new messages arrive
  useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, isTyping]);

  const renderItem = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.doctorRow]}>
        {!isUser && (
          <View style={styles.doctorAvatar}>
            <MaterialCommunityIcons name="doctor" size={18} color="#FFF" />
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.doctorBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userText : styles.doctorText]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <ImageBackground
        source={require('@/assets/images/waterlilies.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(252, 237, 235, 0.9)', 'rgba(247, 241, 230, 0.95)', 'rgba(246, 253, 243, 0.98)']}
          style={StyleSheet.absoluteFill}
        />

        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => {
                if (params.autoTrigger === 'true') {
                  router.replace('/(tabs)');
                } else {
                  router.back();
                }
              }}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#1B391C" />
            </TouchableOpacity>
            <View style={styles.headerTitleWrap}>
              <Text style={styles.headerTitle}>Plant Doctor</Text>
              <Text style={styles.headerSubtitle}>AI Diagnostic Chat</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          {/* Plant Reference Card */}
          {params.photoUri && (
            <View style={styles.plantRefCard}>
              <Image source={{ uri: params.photoUri }} style={styles.plantRefImage} />
              <View style={styles.plantRefInfo}>
                <Text style={styles.plantRefLabel}>CONSULTATION SPECIMEN</Text>
                <Text style={styles.plantRefName}>{plantName}</Text>
              </View>
            </View>
          )}

          {/* Chat Messages */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardView}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
          >
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.chatList}
              showsVerticalScrollIndicator={false}
              ListFooterComponent={
                isTyping ? (
                  <View style={[styles.messageRow, styles.doctorRow, { opacity: 0.8 }]}>
                    <View style={styles.doctorAvatar}>
                      <MaterialCommunityIcons name="doctor" size={18} color="#FFF" />
                    </View>
                    <View style={[styles.bubble, styles.doctorBubble, styles.typingBubble]}>
                      <ActivityIndicator size="small" color="#D9637A" style={{ marginRight: 6 }} />
                      <Text style={styles.typingText}>Doctor is analyzing...</Text>
                    </View>
                  </View>
                ) : null
              }
            />

            {/* Input Bar */}
            <View style={styles.inputBar}>
              <TextInput
                style={styles.input}
                placeholder={`Ask about your ${plantName}...`}
                placeholderTextColor="rgba(27, 57, 28, 0.4)"
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={handleSend}
                returnKeyType="send"
              />
              <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
                <MaterialCommunityIcons name="send" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FCEDEB' },
  backgroundImage: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(27, 57, 28, 0.08)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  headerTitleWrap: { alignItems: 'center' },
  headerTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 20,
    color: '#1B391C',
  },
  headerSubtitle: {
    fontFamily: 'Author-Variable',
    fontSize: 12,
    color: '#D9637A',
    fontWeight: '600',
    marginTop: 1,
  },
  plantRefCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  plantRefImage: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  plantRefInfo: { flex: 1 },
  plantRefLabel: {
    fontFamily: 'Author-Variable',
    fontSize: 9,
    fontWeight: '700',
    color: '#D9637A',
    letterSpacing: 0.5,
  },
  plantRefName: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 15,
    color: '#1B391C',
    marginTop: 1,
  },
  keyboardView: { flex: 1 },
  chatList: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 16,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    maxWidth: '85%',
  },
  userRow: {
    alignSelf: 'flex-end',
  },
  doctorRow: {
    alignSelf: 'flex-start',
    gap: 8,
  },
  doctorAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#7C9A78',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userBubble: {
    backgroundColor: '#D9637A',
    borderBottomRightRadius: 4,
  },
  doctorBubble: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  messageText: {
    fontFamily: 'Author-Variable',
    fontSize: 15.5,
    lineHeight: 21,
  },
  userText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  doctorText: {
    color: '#1B391C',
  },
  typingText: {
    fontFamily: 'Author-Variable',
    fontSize: 14,
    color: 'rgba(27, 57, 28, 0.6)',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    marginHorizontal: 16,
    marginBottom: Platform.OS === 'ios' ? 0 : 16,
    borderRadius: 25,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(27, 57, 28, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  input: {
    flex: 1,
    fontFamily: 'Author-Variable',
    fontSize: 15,
    paddingHorizontal: 12,
    color: '#1B391C',
    height: 40,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D9637A',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
