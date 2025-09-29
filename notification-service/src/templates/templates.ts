function getNested(obj: any, path: string) {
  return path.split('.').reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);
}
export function render(tpl: string, data: Record<string, any>): string {
  return tpl.replace(/{{\s*([\w.]+)\s*}}/g, (_m, key) => {
    const v = getNested(data, key);
    return (v === undefined || v === null) ? `{{${key}}}` : String(v);
  });
}

export const messageTemplates = {
  'event.created': {
    email: { subject: 'กิจกรรมใหม่: {{eventName}}', body: 'มีกิจกรรมใหม่ "{{eventName}}" วันที่ {{eventDate}} ที่ {{location}}' },
    sms: 'กิจกรรมใหม่: {{eventName}} วันที่ {{eventDate}}',
    webPush: { title: '🎉 กิจกรรมใหม่', body: '{{eventName}} - {{eventDate}}' },
    line: 'มีกิจกรรมใหม่ "{{eventName}}" วันที่ {{eventDate}} ที่ {{location}} มาร่วมกันเถอะ!'
  },
  'event.updated': {
    email: { subject: 'แก้ไขกิจกรรม: {{eventName}}', body: 'กิจกรรม "{{eventName}}" มีการเปลี่ยนแปลง' },
    sms: 'แก้ไขกิจกรรม: {{eventName}}',
    webPush: { title: '📝 แก้ไขกิจกรรม', body: '{{eventName}} มีการเปลี่ยนแปลง' }
  }
} as const;

export type TemplateId = keyof typeof messageTemplates;

export function buildMessages(
  id: TemplateId,
  data: Record<string, any>
): { emailSubject: string; emailBody: string; sms?: string; line?: string; webPush?: { title: string; body: string } } {
  const t = messageTemplates[id];
  const emailSubject = t.email ? render(t.email.subject, data) : 'Notification';
  const emailBody    = t.email ? render(t.email.body, data)    : '';
  const sms          = t.sms   ? render(t.sms, data)           : undefined;
  const line         = (t as any).line ? render((t as any).line, data) : undefined;
  const webPush      = t.webPush ? { title: render(t.webPush.title, data), body: render(t.webPush.body, data) } : undefined;
  return { emailSubject, emailBody, sms, line, webPush };
}
