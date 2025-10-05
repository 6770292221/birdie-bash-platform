import axios from "axios";

function normalizeTH(msisdn: string): string {
  const s = msisdn.replace(/[^0-9+]/g, "");
  if (s.startsWith("+")) return s;           // assume already E.164
  if (s.startsWith("0")) return "+66" + s.slice(1);
  if (s.startsWith("66")) return "+" + s;    // allow 66xxxxxxxxx
  return s;                                  // last resort
}

export async function sendSmsOne(destination: string, text: string) {
  const dest = normalizeTH(destination);

  const payload = {
    sender: process.env.SMS_SENDER || "SMSOK",
    text,
    destinations: [{ destination: dest }],
    callback_url: process.env.SMS_CALLBACK_URL || undefined,
    callback_method: process.env.SMS_CALLBACK_URL ? "POST" : undefined,
  };

  try {
    const res = await axios.post(
      `${process.env.SMSOK_BASE || "https://api.smsok.co"}/s`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": process.env.SMSOK_AUTH!,
        },
        timeout: 15000,
        validateStatus: () => true, // เราจะเช็คเอง
      }
    );

    if (res.status < 200 || res.status >= 300) {
      throw new Error(`SMS provider ${res.status}: ${JSON.stringify(res.data)}`);
    }
  } catch (e: any) {
    // โยน error ออกไปให้ service จับและ log รายคน
    throw new Error(`[sms] axios error: ${e?.message || e}`);
  }
}
