import axios from "axios";
import nodemailer from "nodemailer";
import User from "../models/User";
import { fetchEventById } from "../remote/eventApi";
import { fetchAllPeopleFromDB } from "../people/people.db";

type EventKind = "created" | "updated" | "deleted";

// -------- Utilities --------
type Person = { email?: string; phone?: string };

function parseChannels(): Array<"email"|"sms"> {
  const raw = (process.env.BROADCAST_CHANNELS || "email,sms")
    .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  const set = new Set<"email"|"sms">();
  for (const x of raw) if (x === "email" || x === "sms") set.add(x);
  return Array.from(set);
}

function uniqPersons(list: Person[]): Person[] {
  const seen = new Set<string>();
  const out: Person[] = [];
  for (const p of list) {
    const key = `${p.email || ""}|${p.phone || ""}`;
    if (key === "|") continue;
    if (!seen.has(key)) { seen.add(key); out.push(p); }
  }
  return out;
}

// ---------- registration-service: players (ดึงผู้ที่ join อีเวนต์) ----------
async function fetchPlayersByEventId(eventId: string) {
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

// map players -> contacts (member ใช้ข้อมูลจาก User model, guest ใช้ข้อมูลจาก player เอง)
async function resolvePlayersContacts(players: any[]): Promise<Person[]> {
  const withUser = players.filter((p: any) => p?.userId);
  const userIds = withUser.map((p: any) => p.userId);

  let users: Array<{email?: string; phoneNumber?: string}> = [];
  if (userIds.length) {
    users = await User.find({ _id: { $in: userIds } }, { email:1, phoneNumber:1 }).lean();
  }

  const usersById = new Map<string, {email?: string; phoneNumber?: string}>();
  for (const u of users) usersById.set((u as any)._id?.toString?.() || "", u);

  const contacts: Person[] = [];

  for (const p of players) {
    if (p.userId) {
      const u = usersById.get(p.userId);
      if (u?.email || u?.phoneNumber) contacts.push({ email: u?.email, phone: u?.phoneNumber });
      else if (p.email || p.phoneNumber) contacts.push({ email: p.email || undefined, phone: p.phoneNumber || undefined });
    } else {
      // guest: ใช้เฉพาะ phone/email จาก player
      if (p.email || p.phoneNumber) contacts.push({ email: p.email || undefined, phone: p.phoneNumber || undefined });
    }
  }

  return uniqPersons(contacts);
}

// ---------- NEW: creator contact (แจ้งผู้สร้างอีเวนต์) ----------
async function resolveCreatorContact(ev: any): Promise<Person[]> {
  // ใช้ ev.createdBy เป็น userId ไปค้นใน User model
  const creatorId = ev?.createdBy;
  if (!creatorId) return [];
  const u = await User.findById(creatorId, { email: 1, phoneNumber: 1 }).lean();
  if (u?.email || u?.phoneNumber) {
    return [{ email: u.email || undefined, phone: u.phoneNumber || undefined }];
  }
  return [];
}

// ---------- mail / sms ----------
const transporter = nodemailer.createTransport({
  // ภายใน Docker ให้ตั้ง SMTP_HOST=mailhog, SMTP_PORT=1025
  host: process.env.SMTP_HOST || "localhost",
  port: Number(process.env.SMTP_PORT || 1025),
  secure: false
});

async function sendEmail(to: string, subject: string, html: string) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || "BBP Notify <no-reply@bbp.local>",
    to,
    subject,
    html,
    // ให้มี plain text เผื่อไคลเอนต์ที่อ่านได้แต่ข้อความล้วน
    text: html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  });
}

async function sendSMS(destination: string, text: string) {
  const base = (process.env.SMSOK_BASE || "https://api.smsok.co").replace(/\/+$/, "");
  const auth = process.env.SMSOK_AUTH || "";
  const sender = process.env.FORCE_NO_SENDER === "true" ? undefined : (process.env.SMS_SENDER || undefined);
  const payload: any = {
    text,
    destinations: [{ destination }],
    callback_url: process.env.SMS_CALLBACK_URL || undefined,
    callback_method: "POST"
  };
  if (sender) payload.sender = sender;

  const res = await axios.post(`${base}/s`, payload, {
    headers: { "Content-Type": "application/json", "Authorization": auth },
    timeout: 15000,
    validateStatus: () => true
  });
  if (res.status < 200 || res.status >= 300) {
    const e: any = new Error(`SMS provider ${res.status}`);
    e.response = { status: res.status, data: res.data };
    throw e;
  }
}

// ---------- templates (ภาษาอังกฤษ) ----------
function emailHtml(type: EventKind, ev: any) {
  const title =
    type === "created" ? "New Event" :
    type === "updated" ? "Event Updated" : "Event Canceled";
  const badge =
    type === "created" ? "#10b981" :
    type === "updated" ? "#3b82f6" : "#ef4444";

  return `
  <div style="font-family:system-ui,Arial,sans-serif;max-width:640px;margin:auto">
    <div style="padding:12px 16px;background:${badge};color:white;border-radius:12px 12px 0 0">
      <strong>${title}</strong>
    </div>
    <div style="border:1px solid #eee;border-top:none;padding:16px;border-radius:0 0 12px 12px">
      <p><b>Name:</b> ${ev.eventName || "-"}</p>
      <p><b>Date:</b> ${ev.eventDate || "-"}</p>
      <p><b>Venue:</b> ${ev.venue || ev.location || "-"}</p>
      ${type === "deleted" ? `<p style="color:#ef4444"><b>Status:</b> Canceled</p>` : ""}
      <hr style="border:none;border-top:1px solid #eee;margin:16px 0">
      <small>Sent by BBP Notification Service</small>
    </div>
  </div>`;
}

function smsText(type: EventKind, ev: any) {
  const name = ev.eventName || "";
  const date = ev.eventDate || "";
  const venue = ev.venue || ev.location || "";
  if (type === "deleted") {
    return `Event canceled: ${name} • ${date} • ${venue}`.trim();
  }
  if (type === "updated") {
    return `Event updated: ${name} • ${date} • ${venue}`.trim();
  }
  return `New event: ${name} • ${date} • ${venue}`.trim();
}

// ---------- main ----------
export async function broadcastByEventId(eventId: string, type: EventKind) {
  // ดึงรายละเอียดอีเวนต์จาก Event Service (ต้องมี createdBy ด้วยเพื่อแจ้งผู้สร้าง)
  const ev = await fetchEventById(eventId);

  // คัดคนที่จะส่ง:
  // - deleted → ผู้ที่ join ทั้งหมด + ผู้สร้าง
  // - created/updated → ผู้ใช้ทั้งหมด (role=user)
  let targets: Person[] = [];
  if (type === "deleted") {
    const players = await fetchPlayersByEventId(eventId);
    const playerContacts = await resolvePlayersContacts(players);
    const creator = await resolveCreatorContact(ev);   // <<<< เพิ่มจุดนี้
    targets = [...playerContacts, ...creator];
  } else {
    targets = await fetchAllPeopleFromDB();
  }
  targets = uniqPersons(targets);

  // ช่องทางที่เปิดใช้งาน และโหมด dry-run
  const channels = parseChannels();
  const dryRun = (process.env.DRY_RUN || "false").toLowerCase() === "true";

  let emails = 0, sms = 0;
  if (!targets.length) return { emails, sms, people: 0, dryRun };

  // หัวเรื่องอีเมลภาษาอังกฤษ
  const subj =
    type === "deleted" ? `Event canceled: ${ev.eventName || ""}` :
    type === "updated" ? `Event updated: ${ev.eventName || ""}` :
                        `New event: ${ev.eventName || ""}`;

  const html = emailHtml(type, ev);
  const text = smsText(type, ev);

  // ส่งรายคน (จับ error ต่อคน ไม่ให้ทั้งงานล้ม)
  for (const p of targets) {
    try {
      if (dryRun) continue;

      if (channels.includes("email") && p.email) {
        try { await sendEmail(p.email, subj, html); emails++; }
        catch (e) { console.error("[email] send error to", p.email, (e as any)?.message || e); }
      }
      if (channels.includes("sms") && p.phone) {
        try { await sendSMS(p.phone, text); sms++; }
        catch (e) { console.error("[sms] send error to", p.phone, (e as any)?.message || e); }
      }
    } catch {
      // เงียบไว้ — อย่าให้ผู้รับคนเดียวทำให้ทั้งรอบล้ม
    }
  }

  return { emails, sms, people: targets.length, dryRun };
}
