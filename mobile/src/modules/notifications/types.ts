export type NotificationType = 'new_match' | 'trip_reminder' | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any> | null;
  read: boolean;
  created_at: string;
}

export interface PushTokenRequest {
  token: string;
  device_type?: 'ios' | 'android' | 'web';
}

export interface SuccessResponse {
  success: boolean;
  message?: string;
}

export interface ErrorResponse {
  code: string;
  message: string;
}
