export type Channel = 'email' | 'sms' | 'line' | 'webPush';

export interface NotificationPayload {
  to?: { email?: string; phone?: string; lineUserId?: string; };
  member?: { userId: string; email?: string; phone?: string; lineUserId?: string; };
  message?: string;
  source: string;
}

export interface TemplateSpec {
  id: string;
  data: Record<string, any>;
}

export interface NotificationEvent {
  channels: Channel[];
  payload: NotificationPayload;
  template?: TemplateSpec;
  meta?: Record<string, any>;
}
