import axios from "axios";

export async function fetchPlayersByEventId(eventId: string) {
  const base = (process.env.REG_API_BASE || "http://registration-service:3005").trim();
  const pathTmpl = (process.env.REG_API_PLAYERS_PATH || "/api/registration/events/:id/players?limit=1000&offset=0").trim();
  const url = `${base}${pathTmpl.replace(":id", eventId)}`;

  const res = await axios.get(url, { timeout: 15000, validateStatus: () => true });
  if (res.status < 200 || res.status >= 300) {
    const e: any = new Error(`REG_API ${res.status}`);
    e.response = { status: res.status, data: res.data };
    e.config = { url, method: "GET" };
    throw e;
  }
  return res.data?.players || [];
}
