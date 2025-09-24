import axios from 'axios';
import { env } from '../config/env';

// Using LINE Notify token — simplest path for demo
export async function sendLine(message: string): Promise<{ id: string }> {
  if (!env.line.notifyToken) return { id: 'DEV-NO-LINE' };
  const res = await axios.post('https://notify-api.line.me/api/notify', new URLSearchParams({ message }), {
    headers: { Authorization: `Bearer ${env.line.notifyToken}` }
  });
  return { id: String(res.data?.message || 'LINE-NOTIFY') };
}
