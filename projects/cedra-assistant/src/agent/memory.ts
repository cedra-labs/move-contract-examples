import type { ChatMessage } from "../types/chat.ts";

/**
 * Conversation store
 * Key = sessionId (anonymous) OR userId (email)
 */
const store = new Map<string, ChatMessage[]>();

export function getConversation(key: string): ChatMessage[] {
  return store.get(key) ?? [];
}

export function appendMessage(key: string, msg: ChatMessage) {
  const history = store.get(key) ?? [];
  history.push(msg);
  store.set(key, history);
}

/**
 * Merge anonymous session chats into logged-in user chats
 * Called once after successful Google login
 */
export function mergeAnonymousChats(
  sessionId: string,
  userId: string
) {
  if (!sessionId || !userId) return;

  const anonymous = store.get(sessionId);
  if (!anonymous || anonymous.length === 0) return;

  const existing = store.get(userId) ?? [];

  // Merge preserving order
  store.set(userId, [...existing, ...anonymous]);

  // Remove anonymous session history
  store.delete(sessionId);
}
