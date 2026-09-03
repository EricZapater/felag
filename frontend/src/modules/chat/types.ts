export interface ParticipantUser {
  id: string;
  name: string;
  avatar_url?: string | null;
  origin_summary?: string;
}

export interface Conversation {
  id: string;
  match_id?: string | null;
  other_participant: ParticipantUser;
  last_message_preview?: string | null;
  last_message_at: string;
  unread_count: number;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

export interface CreateConversationRequest {
  recipient_id: string;
  match_id?: string;
}

export interface SendMessageRequest {
  content: string;
}

export interface BlockedUser {
  id: string;
  user_id: string;
  name: string;
  avatar_url?: string | null;
  blocked_at: string;
}

export type ReportUserReason =
  | 'spam'
  | 'harassment'
  | 'inappropriate_content'
  | 'safety_concern'
  | 'other';

export interface ReportUserRequest {
  reason: ReportUserReason;
  details: string;
}

export interface SuccessResponse {
  success: boolean;
  message?: string;
}

export interface ErrorResponse {
  code: string;
  message: string;
}

export interface WSChatMessage {
  type?: string;
  conversation_id: string;
  message?: Message;
  content?: string;
  sender_id?: string;
}
