// Messaging API layer — wraps the real Django REST endpoints (see lib/endpoints.ts)
// and normalizes snake_case backend shapes into the app's camelCase `Conversation`/
// `ChatMessage` types.
//
// REST layer for messaging: initial page load, conversation list, attachment
// uploads (no attachment support over the WebSocket). Live message/typing/
// read/presence updates go over the Channels WebSocket instead — see
// lib/ws/conversation-socket.ts and features/messaging/messaging-app.tsx.
import { apiClient } from "@/lib/api";
import { ENDPOINTS, conversationMessages } from "@/lib/endpoints";
import type { ChatMessage, Conversation, MessageAttachment, UserRole } from "@/types";

/** DRF's paginated list envelope. */
interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

interface ApiParticipant {
  id: number;
  email: string;
  role: UserRole;
}

interface ApiAttachment {
  id: number;
  file: string;
  file_name: string;
  content_type: string;
  uploaded_at: string;
}

export interface ApiMessage {
  id: number;
  conversation: number;
  sender_email: string;
  body: string;
  is_read: boolean;
  attachments: ApiAttachment[];
  created_at: string;
}

interface ApiConversation {
  id: number;
  participants: ApiParticipant[];
  participant_ids?: number[];
  campaign: number | null;
  last_message: ApiMessage | null;
  created_at: string;
  updated_at: string;
}

function inferAttachmentType(contentType: string): MessageAttachment["type"] {
  if (contentType.startsWith("image/")) return "image";
  if (contentType.startsWith("video/")) return "video";
  return "file";
}

function normalizeAttachment(att: ApiAttachment): MessageAttachment {
  return {
    id: String(att.id),
    name: att.file_name || att.file.split("/").pop() || "attachment",
    type: att.content_type ? inferAttachmentType(att.content_type) : undefined,
    url: att.file,
  };
}

export function normalizeMessage(msg: ApiMessage, currentUserEmail?: string): ChatMessage {
  const isOwn = currentUserEmail != null && msg.sender_email === currentUserEmail;
  return {
    id: String(msg.id),
    conversationId: String(msg.conversation),
    senderId: msg.sender_email,
    senderName: isOwn ? "You" : msg.sender_email,
    text: msg.body,
    createdAt: msg.created_at,
    attachments: msg.attachments?.length ? msg.attachments.map(normalizeAttachment) : undefined,
    isOwn,
    isRead: msg.is_read,
  };
}

/**
 * Picks the "other" participant to represent the conversation with in the UI (list
 * row, chat header). The backend models conversations as an unordered set of
 * participants, not "me + them", so this resolves it client-side.
 */
function normalizeConversation(conv: ApiConversation, currentUserEmail?: string): Conversation {
  const other = conv.participants.find((p) => p.email !== currentUserEmail) ?? conv.participants[0];
  const last = conv.last_message;
  return {
    id: String(conv.id),
    participantId: other ? String(other.id) : "",
    participantName: other?.email ?? "Unknown",
    participantRole: other?.role ?? "creator",
    lastMessage: last?.body ?? "",
    lastMessageAt: last?.created_at ?? conv.updated_at,
    // Computing a real unread count would mean fetching every conversation's full
    // message list just for a badge — too heavy for a list view. Omitted for real data.
    unreadCount: 0,
    campaignId: conv.campaign != null ? String(conv.campaign) : undefined,
  };
}

export async function listConversations(currentUserEmail?: string): Promise<Conversation[]> {
  const page = await apiClient.get<Paginated<ApiConversation>>(ENDPOINTS.conversations);
  return page.results.map((c) => normalizeConversation(c, currentUserEmail));
}

export async function listMessages(conversationId: string, currentUserEmail?: string): Promise<ChatMessage[]> {
  const page = await apiClient.get<Paginated<ApiMessage>>(conversationMessages(conversationId));
  return page.results.map((m) => normalizeMessage(m, currentUserEmail));
}

/** Back-compat alias kept for existing callers. */
export const getMessages = listMessages;

/**
 * Sends a message, optionally with one attachment (image or PDF, ≤10MB —
 * matches backend/apps/messaging's MESSAGE_ATTACHMENT_EXTENSIONS). A single
 * multipart POST creates the Message and its Attachment together.
 */
export async function sendMessage(
  conversationId: string,
  body: string,
  currentUserEmail?: string,
  attachmentFile?: File,
): Promise<ChatMessage> {
  let created: ApiMessage;
  if (attachmentFile) {
    const formData = new FormData();
    formData.append("body", body);
    formData.append("attachment", attachmentFile);
    created = await apiClient.upload<ApiMessage>(conversationMessages(conversationId), formData);
  } else {
    created = await apiClient.post<ApiMessage>(conversationMessages(conversationId), { body });
  }
  return normalizeMessage(created, currentUserEmail);
}

export async function createConversation(participantIds: number[], campaignId?: number): Promise<Conversation> {
  const created = await apiClient.post<ApiConversation>(ENDPOINTS.conversations, {
    participant_ids: participantIds,
    campaign: campaignId ?? null,
  });
  return normalizeConversation(created);
}
