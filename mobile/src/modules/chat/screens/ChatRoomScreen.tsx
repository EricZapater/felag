import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Button,
  Dialog,
  Menu,
  Portal,
  RadioButton,
  Text,
  TextInput as PaperInput,
} from 'react-native-paper';
import { useChatStore } from '../store';
import { useAuthStore } from '@/modules/auth/store';
import { Message, ParticipantUser, ReportReason } from '../types';

interface Props {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route?: {
    params?: {
      conversationId?: string;
      otherParticipant?: ParticipantUser;
      userId?: string;
      matchId?: string;
    };
  };
}

export default function ChatRoomScreen({ navigation, route }: Props) {
  const params = route?.params;
  const initialConvId = params?.conversationId;
  const initialOtherParticipant = params?.otherParticipant;
  const targetUserId = params?.userId || initialOtherParticipant?.id;
  const matchId = params?.matchId;

  const { user: currentUser } = useAuthStore();
  const {
    conversations,
    messages,
    isLoadingMessages,
    isSending,
    fetchMessages,
    sendMessage,
    markConversationAsRead,
    createOrGetConversation,
    blockUser,
    reportUser,
  } = useChatStore();

  const [conversationId, setConversationId] = useState<string | null>(initialConvId || null);
  const [otherParticipant, setOtherParticipant] = useState<ParticipantUser | null>(
    initialOtherParticipant || null
  );
  const [inputText, setInputText] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);

  // Block modal state
  const [blockDialogVisible, setBlockDialogVisible] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);

  // Report modal state
  const [reportDialogVisible, setReportDialogVisible] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>('harassment');
  const [reportDetails, setReportDetails] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  // Initialize conversation if only userId was provided
  useEffect(() => {
    async function init() {
      if (!conversationId && targetUserId) {
        try {
          const conv = await createOrGetConversation(targetUserId, matchId);
          setConversationId(conv.id);
          setOtherParticipant(conv.other_participant);
        } catch (err: any) {
          Alert.alert('Error', err.message || 'No s’ha pogut iniciar la conversa.');
        }
      }
    }
    init();
  }, [conversationId, targetUserId, matchId, createOrGetConversation]);

  // Load conversation details from store if available
  useEffect(() => {
    if (conversationId) {
      const conv = conversations.find((c) => c.id === conversationId);
      if (conv) {
        setOtherParticipant(conv.other_participant);
      }
      fetchMessages(conversationId);
      markConversationAsRead(conversationId);
    }
  }, [conversationId, conversations, fetchMessages, markConversationAsRead]);

  const conversationMessages = conversationId ? messages[conversationId] || [] : [];

  const handleSend = async () => {
    if (!inputText.trim() || !conversationId || isSending) return;
    const text = inputText;
    setInputText('');
    try {
      await sendMessage(conversationId, text);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No s’ha pogut enviar el missatge');
      setInputText(text); // Restore text on failure
    }
  };

  const handleBlock = async () => {
    if (!targetUserId) return;
    setIsBlocking(true);
    try {
      await blockUser(targetUserId);
      setBlockDialogVisible(false);
      setIsBlocking(false);
      Alert.alert('Usuari bloquejat', 'Has bloquejat aquest usuari correctament.', [
        { text: 'D’acord', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      setIsBlocking(false);
      Alert.alert('Error', err.message || 'No s’ha pogut bloquejar l’usuari');
    }
  };

  const handleReport = async () => {
    if (!targetUserId) return;
    if (reportDetails.trim().length < 5) {
      Alert.alert('Detalls insuficients', 'Si us plau, descriu el motiu amb almenys 5 caràcters.');
      return;
    }
    setIsReporting(true);
    try {
      await reportUser(targetUserId, reportReason, reportDetails.trim());
      setReportDialogVisible(false);
      setIsReporting(false);
      setReportDetails('');
      Alert.alert(
        'Denúncia enviada',
        'Gràcies per ajudar a mantenir segura la comunitat FELAG. El nostre equip revisarà el cas.',
        [{ text: 'D’acord' }]
      );
    } catch (err: any) {
      setIsReporting(false);
      Alert.alert('Error', err.message || 'No s’ha pogut enviar la denúncia');
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const formatMessageTime = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const renderMessageItem = ({ item }: { item: Message }) => {
    const isOutgoing = item.sender_id === currentUser?.id;

    return (
      <View
        style={[
          styles.msgBox,
          isOutgoing ? styles.msgBoxOutgoing : styles.msgBoxIncoming,
        ]}
      >
        <View
          style={[
            styles.bubble,
            isOutgoing ? styles.bubbleOutgoing : styles.bubbleIncoming,
          ]}
        >
          <Text
            style={[
              styles.bubbleText,
              isOutgoing ? styles.bubbleTextOutgoing : styles.bubbleTextIncoming,
            ]}
          >
            {item.content}
          </Text>
        </View>
        <Text
          style={[
            styles.msgTime,
            isOutgoing ? styles.msgTimeOutgoing : styles.msgTimeIncoming,
          ]}
        >
          {formatMessageTime(item.created_at)}
          {isOutgoing ? ' • Enviat' : ''}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.chatHeader}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerUser}
          onPress={() => {
            if (targetUserId) {
              navigation.navigate('PublicProfile', { userId: targetUserId });
            }
          }}
          activeOpacity={0.7}
        >
          {otherParticipant?.avatar_url ? (
            <Image
              source={{ uri: otherParticipant.avatar_url }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {getInitials(otherParticipant?.name)}
              </Text>
            </View>
          )}
          <View style={styles.headerUserInfo}>
            <Text style={styles.headerName} numberOfLines={1}>
              {otherParticipant?.name || 'Viatger FELAG'}
            </Text>
            {otherParticipant?.origin_summary ? (
              <Text style={styles.headerSub} numberOfLines={1}>
                📍 {otherParticipant.origin_summary}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>

        {/* Options menu */}
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <TouchableOpacity
              onPress={() => setMenuVisible(true)}
              style={styles.menuAnchor}
              activeOpacity={0.7}
            >
              <Text style={styles.menuIcon}>⋮</Text>
            </TouchableOpacity>
          }
        >
          {targetUserId && (
            <Menu.Item
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate('PublicProfile', { userId: targetUserId });
              }}
              title="Veure perfil de FELAGI"
              leadingIcon="account-circle"
            />
          )}
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              setBlockDialogVisible(true);
            }}
            title="Bloquejar usuari"
            leadingIcon="block-helper"
          />
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              setReportDialogVisible(true);
            }}
            title="Denunciar usuari"
            leadingIcon="alert-octagon"
          />
        </Menu>
      </View>

      {/* Messages Area */}
      <View style={styles.messagesArea}>
        <View style={styles.secBadgeContainer}>
          <View style={styles.secBadge}>
            <Text style={styles.secBadgeText}>🔒 Xifrat en repòs AES-256</Text>
          </View>
        </View>

        {isLoadingMessages && conversationMessages.length === 0 ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color="#C85A32" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={conversationMessages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessageItem}
            contentContainerStyle={styles.messagesListContent}
            onContentSizeChange={() => {
              if (conversationMessages.length > 0) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
            ListEmptyComponent={
              <View style={styles.emptyMessages}>
                <Text style={styles.emptyMessagesText}>
                  Inicia la conversa amb {otherParticipant?.name || 'aquest FELAGI'}. Els teus missatges estan protegits.
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* Bottom Input Bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.inputField}
          placeholder="Missatge..."
          placeholderTextColor="#786C65"
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[
            styles.btnSend,
            (!inputText.trim() || isSending) && styles.btnSendDisabled,
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || isSending}
          activeOpacity={0.8}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.btnSendText}>➤</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Block Dialog */}
      <Portal>
        <Dialog
          visible={blockDialogVisible}
          onDismiss={() => setBlockDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Bloquejar usuari</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogText}>
              Estàs segur que vols bloquejar {otherParticipant?.name || 'aquest usuari'}? No
              podrà enviar-te missatges ni podràs veure les seves coincidències.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              textColor="#786C65"
              onPress={() => setBlockDialogVisible(false)}
              disabled={isBlocking}
            >
              Cancel·lar
            </Button>
            <Button
              textColor="#D32F2F"
              loading={isBlocking}
              disabled={isBlocking}
              onPress={handleBlock}
            >
              Bloquejar
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Report Dialog */}
        <Dialog
          visible={reportDialogVisible}
          onDismiss={() => setReportDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Denunciar usuari</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall" style={styles.dialogSubtitle}>
              Selecciona el motiu de la denúncia per a moderació:
            </Text>

            <RadioButton.Group
              onValueChange={(val) => setReportReason(val as ReportReason)}
              value={reportReason}
            >
              <RadioButton.Item
                label="Assetjament o conductes ofensives"
                value="harassment"
                color="#C85A32"
                labelStyle={styles.radioLabel}
              />
              <RadioButton.Item
                label="Correu brossa o publicitat (Spam)"
                value="spam"
                color="#C85A32"
                labelStyle={styles.radioLabel}
              />
              <RadioButton.Item
                label="Contingut inapropiat"
                value="inappropriate_content"
                color="#C85A32"
                labelStyle={styles.radioLabel}
              />
              <RadioButton.Item
                label="Preocupació per la seguretat"
                value="safety_concern"
                color="#C85A32"
                labelStyle={styles.radioLabel}
              />
              <RadioButton.Item
                label="Altres motius"
                value="other"
                color="#C85A32"
                labelStyle={styles.radioLabel}
              />
            </RadioButton.Group>

            <PaperInput
              mode="outlined"
              label="Detalls de la denúncia"
              placeholder="Explica breument què ha passat..."
              value={reportDetails}
              onChangeText={setReportDetails}
              multiline
              numberOfLines={3}
              style={styles.reportInput}
              outlineColor="#E8E2D9"
              activeOutlineColor="#C85A32"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              textColor="#786C65"
              onPress={() => setReportDialogVisible(false)}
              disabled={isReporting}
            >
              Cancel·lar
            </Button>
            <Button
              textColor="#C85A32"
              loading={isReporting}
              disabled={isReporting || reportDetails.trim().length < 5}
              onPress={handleReport}
            >
              Enviar denúncia
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F6F0',
  },
  chatHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2D9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
  },
  backBtnText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#C85A32',
    lineHeight: 24,
  },
  headerUser: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F4ECE1',
    borderWidth: 2,
    borderColor: '#C85A32',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#C85A32',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#703817',
  },
  headerUserInfo: {
    marginLeft: 10,
    flex: 1,
  },
  headerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C221E',
  },
  headerSub: {
    fontSize: 10,
    color: '#703817',
    fontWeight: '600',
    marginTop: 1,
  },
  menuAnchor: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  menuIcon: {
    fontSize: 20,
    color: '#786C65',
    fontWeight: 'bold',
  },
  messagesArea: {
    flex: 1,
  },
  secBadgeContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  secBadge: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E2D9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  secBadgeText: {
    fontSize: 10,
    color: '#786C65',
    fontWeight: '600',
  },
  messagesListContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  msgBox: {
    maxWidth: '80%',
    marginVertical: 4,
  },
  msgBoxIncoming: {
    alignSelf: 'flex-start',
  },
  msgBoxOutgoing: {
    alignSelf: 'flex-end',
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  bubbleIncoming: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E2D9',
    borderBottomLeftRadius: 2,
  },
  bubbleOutgoing: {
    backgroundColor: '#C85A32',
    borderBottomRightRadius: 2,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 19,
  },
  bubbleTextIncoming: {
    color: '#2C221E',
  },
  bubbleTextOutgoing: {
    color: '#FFFFFF',
  },
  msgTime: {
    fontSize: 9,
    marginTop: 3,
  },
  msgTimeIncoming: {
    color: '#786C65',
  },
  msgTimeOutgoing: {
    color: '#786C65',
    textAlign: 'right',
  },
  inputBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8E2D9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputField: {
    flex: 1,
    backgroundColor: '#FAF7F2',
    borderWidth: 1,
    borderColor: '#E8E2D9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: '#2C221E',
    maxHeight: 100,
  },
  btnSend: {
    backgroundColor: '#C85A32',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnSendDisabled: {
    backgroundColor: '#DDCFBF',
  },
  btnSendText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyMessages: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyMessagesText: {
    textAlign: 'center',
    color: '#786C65',
    fontSize: 13,
    lineHeight: 18,
  },
  dialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  dialogTitle: {
    color: '#2C221E',
    fontWeight: 'bold',
  },
  dialogSubtitle: {
    color: '#786C65',
    marginBottom: 8,
  },
  dialogText: {
    color: '#4A3E39',
    lineHeight: 20,
  },
  radioLabel: {
    fontSize: 13,
    color: '#2C221E',
  },
  reportInput: {
    marginTop: 12,
    backgroundColor: '#FAF7F2',
    fontSize: 13,
  },
});
