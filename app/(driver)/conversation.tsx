import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, Linking, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Send, MapPin, User } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { TypingIndicator } from '@/components/TypingIndicator';
import { MessageAlert } from '@/components/MessageAlert';

interface Message {
  id: string;
  sender_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface ConversationDetails {
  id: string;
  order_id: string;
  client_name: string;
  client_phone: string;
  client_whatsapp?: string;
  client_photo_url?: string | null;
}

export default function DriverConversationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const conversationId = params.conversationId as string;
  const { profile } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversation, setConversation] = useState<ConversationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [showMessageAlert, setShowMessageAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState({ text: '', sender: '' });
  const scrollViewRef = useRef<ScrollView>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadConversationDetails();
    loadMessages();
    markMessagesAsRead();
    const unsubscribeMessages = subscribeToMessages();
    const unsubscribeTyping = subscribeToTypingIndicators();

    return () => {
      unsubscribeMessages();
      unsubscribeTyping();
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      updateTypingStatus(false);
    };
  }, [conversationId]);

  const loadConversationDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('order_conversations')
        .select(`
          id,
          order_id,
          client:user_profiles!client_id (
            first_name,
            last_name,
            phone,
            whatsapp_number,
            profile_photo_url
          )
        `)
        .eq('id', conversationId)
        .single();

      if (error) throw error;

      if (data) {
        const clientData = data.client as any;
        setConversation({
          id: data.id,
          order_id: data.order_id,
          client_name: `${clientData?.first_name} ${clientData?.last_name}`,
          client_phone: clientData?.phone || '',
          client_whatsapp: clientData?.whatsapp_number,
          client_photo_url: clientData?.profile_photo_url,
        });
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const loadMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('order_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async () => {
    if (!profile?.id) return;

    try {
      await supabase
        .from('order_messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .eq('is_read', false)
        .neq('sender_id', profile.id);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const playNotificationSound = async () => {
    if (Platform.OS === 'web') {
      try {
        const audio1 = new window.Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
        audio1.volume = 1.0;
        await audio1.play().catch(err => console.error('Error playing web audio:', err));

        setTimeout(async () => {
          const audio2 = new window.Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
          audio2.volume = 1.0;
          await audio2.play().catch(err => console.error('Error playing web audio:', err));
        }, 400);
      } catch (error) {
        console.error('Error playing web notification sound:', error);
      }
      return;
    }

    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        allowsRecordingIOS: false,
      });

      const { sound: sound1 } = await Audio.Sound.createAsync(
        { uri: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3' },
        {
          shouldPlay: true,
          volume: 1.0,
          isLooping: false,
        }
      );

      soundRef.current = sound1;
      await sound1.playAsync();

      sound1.setOnPlaybackStatusUpdate(async (status: any) => {
        if (status.didJustFinish) {
          await sound1.unloadAsync();

          const { sound: sound2 } = await Audio.Sound.createAsync(
            { uri: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3' },
            {
              shouldPlay: true,
              volume: 1.0,
              isLooping: false,
            }
          );

          soundRef.current = sound2;
          await sound2.playAsync();

          sound2.setOnPlaybackStatusUpdate((status2: any) => {
            if (status2.didJustFinish) {
              sound2.unloadAsync();
            }
          });
        }
      });
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  };

  const subscribeToMessages = () => {
    console.log('Setting up driver message subscription for conversation:', conversationId);
    const channel = supabase
      .channel(`order_messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log('New message received in driver conversation:', payload);
          const newMessage = payload.new as Message;
          setMessages((current) => [...current, newMessage]);
          setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

          if (newMessage.sender_id !== profile?.id) {
            console.log('Playing notification for incoming driver message');
            markMessagesAsRead();
            playNotificationSound();
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            setAlertMessage({
              text: newMessage.message,
              sender: conversation?.client_name || 'Client',
            });
            setShowMessageAlert(true);
          }
        }
      )
      .subscribe((status) => {
        console.log('Driver conversation subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to driver conversation messages');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Channel error for driver conversation messages');
        }
      });

    return () => {
      console.log('Unsubscribing from driver conversation messages');
      supabase.removeChannel(channel);
    };
  };

  const subscribeToTypingIndicators = () => {
    const channel = supabase
      .channel(`typing:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const typingData = payload.new as any;
          if (typingData && typingData.user_id !== profile?.id) {
            setIsOtherUserTyping(typingData.is_typing);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const updateTypingStatus = async (isTyping: boolean) => {
    if (!profile?.id) return;

    try {
      const { error } = await supabase
        .from('typing_indicators')
        .upsert({
          conversation_id: conversationId,
          user_id: profile.id,
          is_typing: isTyping,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'conversation_id,user_id'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  };

  const handleTextChange = (text: string) => {
    setNewMessage(text);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (text.trim()) {
      updateTypingStatus(true);

      typingTimeoutRef.current = setTimeout(() => {
        updateTypingStatus(false);
      }, 3000);
    } else {
      updateTypingStatus(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !profile) return;

    setSending(true);
    try {
      const messageText = newMessage.trim();
      const messageData = {
        conversation_id: conversationId,
        sender_id: profile.id,
        message: messageText,
      };

      const { error } = await supabase.from('order_messages').insert(messageData);

      if (error) throw error;

      await supabase
        .from('order_conversations')
        .update({
          last_message: messageText,
          last_message_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      if (conversation?.client_whatsapp && profile.user_type === 'driver') {
        const whatsappUrl = `https://wa.me/${conversation.client_whatsapp}?text=${encodeURIComponent(messageText)}`;
        console.log('WhatsApp notification URL:', whatsappUrl);
      }

      setNewMessage('');
      updateTypingStatus(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer le message');
    } finally {
      setSending(false);
    }
  };

  const shareLocation = async () => {
    if (!profile?.latitude || !profile?.longitude) {
      Alert.alert('Position non disponible', 'Veuillez d\'abord enregistrer votre position GPS');
      return;
    }

    setSending(true);
    try {
      const mapUrl = `https://www.google.com/maps/search/?api=1&query=${profile.latitude},${profile.longitude}`;
      const messageText = `📍 Ma position: ${mapUrl}`;
      const messageData = {
        conversation_id: conversationId,
        sender_id: profile.id,
        message: messageText,
      };

      const { error } = await supabase.from('order_messages').insert(messageData);

      if (error) throw error;

      await supabase
        .from('order_conversations')
        .update({
          last_message: messageText,
          last_message_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      if (conversation?.client_whatsapp) {
        const whatsappMessage = `Voici ma position: ${mapUrl}`;
        const whatsappUrl = `https://wa.me/${conversation.client_whatsapp}?text=${encodeURIComponent(whatsappMessage)}`;
        console.log('WhatsApp location URL:', whatsappUrl);
      }
    } catch (error) {
      console.error('Error sharing location:', error);
      Alert.alert('Erreur', 'Impossible de partager la position');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    if (diffInDays === 0) {
      return `Aujourd'hui à ${timeStr}`;
    } else if (diffInDays === 1) {
      return `Hier à ${timeStr}`;
    } else {
      const dateStr = date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      return `${dateStr} à ${timeStr}`;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <MessageAlert
        visible={showMessageAlert}
        message={alertMessage.text}
        senderName={alertMessage.sender}
        onDismiss={() => setShowMessageAlert(false)}
      />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={24} color="#000" />
        </TouchableOpacity>
        {conversation?.client_photo_url ? (
          <Image
            source={{ uri: conversation.client_photo_url }}
            style={styles.clientPhoto}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.clientPhotoPlaceholder}>
            <User size={20} color="#fff" />
          </View>
        )}
        <View style={styles.headerInfo}>
          <Text style={styles.title}>{conversation?.client_name || 'Chargement...'}</Text>
          {conversation?.order_id && (
            <Text style={styles.subtitle}>Commande #{conversation.order_id.slice(0, 8)}</Text>
          )}
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((message) => {
          const isOwn = message.sender_id === profile?.id;
          const isLocation = message.message.includes('maps');
          return (
            <View
              key={message.id}
              style={[styles.messageBubble, isOwn ? styles.ownMessage : styles.otherMessage]}
            >
              {isLocation ? (
                <TouchableOpacity
                  style={styles.locationMessage}
                  onPress={() => {
                    const urlMatch = message.message.match(/https:\/\/[^\s]+/);
                    if (urlMatch) {
                      Linking.openURL(urlMatch[0]);
                    }
                  }}
                >
                  <MapPin size={20} color={isOwn ? '#fff' : '#2563eb'} />
                  <Text style={[styles.messageText, isOwn && styles.ownMessageText]}>
                    {message.message}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={[styles.messageText, isOwn && styles.ownMessageText]}>
                  {message.message}
                </Text>
              )}
              <Text style={[styles.messageTime, isOwn && styles.ownMessageTime]}>
                {formatTime(message.created_at)}
              </Text>
            </View>
          );
        })}
        <TypingIndicator
          userName={conversation?.client_name || 'Client'}
          visible={isOtherUserTyping}
        />
      </ScrollView>

      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={styles.locationButton}
          onPress={shareLocation}
          disabled={sending}
        >
          <MapPin size={24} color="#2563eb" />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Tapez votre message..."
          value={newMessage}
          onChangeText={handleTextChange}
          multiline
          maxLength={500}
          editable={!sending}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!newMessage.trim() || sending}
        >
          <Send size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  clientPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#f5f5f5',
  },
  clientPhotoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    gap: 12,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
    gap: 4,
  },
  ownMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#2563eb',
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  locationMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  messageText: {
    fontSize: 15,
    color: '#1a1a1a',
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 11,
    color: '#999',
    alignSelf: 'flex-end',
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 8,
  },
  locationButton: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 15,
    color: '#1a1a1a',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
