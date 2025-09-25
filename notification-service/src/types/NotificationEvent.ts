export type Channel = 'email' | 'sms' | 'line';

export interface NotificationPayload {
  to?: {
    email?: string;
    phone?: string; // E.164 e.g. +6691xxxxxxx
    lineUserId?: string;
  };

  member?: {
    userId: string;
    email?: string;
    phone?: string;
    lineUserId?: string;
  };

  message: string;
  source: string;
}

export interface NotificationEvent {
  channels: Channel[];
  payload: NotificationPayload;
  meta?: Record<string, any>;
}
