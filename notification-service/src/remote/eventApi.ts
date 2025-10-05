import axios from "axios";

export type EventDetail = {
  id?: string; _id?: string;
  eventName?: string; eventDate?: string;
  location?: string; venue?: string;
  status?: string;
  [key: string]: any;
};

// สร้างลิสต์ URL ที่จะลองเรียกตามลำดับ
function candidateUrls(eventId: string): string[] {
  const baseEnv = (process.env.EVENTS_API_BASE || "").trim();
  const pathTmpl = (process.env.EVENTS_API_PATH || "/api/events/:id").trim();
  const path = pathTmpl.replace(":id", eventId);

  const bases: string[] = [];
  if (baseEnv) bases.push(baseEnv);
  if (baseEnv.includes("localhost")) bases.push(baseEnv.replace("localhost", "127.0.0.1"));

  // ค่ามาตรฐานสำหรับ Docker/Host
  bases.push(
    "http://event-service:3003",        // Docker Compose DNS
    "http://host.docker.internal:3003", // app อยู่ใน container, service อยู่บน host
    "http://127.0.0.1:3003"             // รันท้องถิ่นนอก Docker
  );

  // ตัดซ้ำ + เติม path
  return Array.from(new Set(bases)).map(b => `${b}${path}`);
}

export async function fetchEventById(eventId: string): Promise<EventDetail> {
  const urls = candidateUrls(eventId);
  let lastErr: any;

  for (const url of urls) {
    try {
      if (process.env.DEBUG_EVENT_API === "true") console.log("[eventApi] GET", url);

      const res = await axios.get(url, { timeout: 15000, validateStatus: () => true });

      if (res.status >= 200 && res.status < 300) {
        const event = res.data?.event ?? res.data;
        if (event && (event.id || event._id)) return event as EventDetail;

        const e: any = new Error("event not found in response");
        e.response = { status: res.status, data: res.data };
        e.config = { url, method: "GET" as const };
        throw e;
      }

      const e: any = new Error(`EVENTS_API ${res.status}`);
      e.response = { status: res.status, data: res.data };
      e.config = { url, method: "GET" as const };
      throw e;

    } catch (e) {
      lastErr = e;
      // ลองตัวถัดไป
    }
  }

  const err: any = new Error(`Event API unreachable. Tried: ${urls.join(", ")}`);
  if (lastErr?.response) err.response = lastErr.response;
  if ((lastErr as any)?.code) err.code = (lastErr as any).code;
  throw err;
}
