import React, { useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Header } from '../../components/Header';
import { colors } from '../../constants/colors';
import { spacing, radius } from '../../constants/spacing';

const SEED = [
  { id: '1', from: 'bot', text: 'Hi! How can we help you today?' },
  { id: '2', from: 'bot', text: 'This is a demo chat — type a message to see it appear.' },
];

export function SupportChatScreen() {
  const navigation = useNavigation();
  const [messages, setMessages] = useState(SEED);
  const [draft, setDraft] = useState('');

  const send = () => {
    const t = draft.trim();
    if (!t) return;
    const id = String(Date.now());
    setMessages((m) => [...m, { id, from: 'user', text: t }]);
    setDraft('');
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          id: `${id}-r`,
          from: 'bot',
          text: 'Thanks! A specialist will follow up shortly (demo reply).',
        },
      ]);
    }, 600);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title="Support" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View
              style={[
                styles.bubble,
                item.from === 'user' ? styles.bubbleUser : styles.bubbleBot,
              ]}
            >
              <Text
                style={[
                  styles.bubbleText,
                  item.from === 'user' && styles.bubbleTextUser,
                ]}
              >
                {item.text}
              </Text>
            </View>
          )}
        />
        <View style={styles.inputRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Type a message"
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
            multiline
          />
          <Pressable style={styles.send} onPress={send}>
            <Text style={styles.sendText}>Send</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  list: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  bubble: {
    maxWidth: '85%',
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  bubbleBot: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
  },
  bubbleText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 20,
  },
  bubbleTextUser: {
    color: colors.surface,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.text,
    marginRight: spacing.sm,
  },
  send: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  sendText: {
    color: colors.surface,
    fontWeight: '700',
  },
});
