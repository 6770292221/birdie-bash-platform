import axios from "axios";
import nodemailer from "nodemailer";
import { fetchEventById } from "../remote/eventApi";
import { fetchUserById, fetchUsersByIds, fetchAllUsers } from "../remote/authApi";

type EventKind = "created" | "updated" | "deleted";

// ===== SMS Whitelist =====
// ใส่เลขใน ENV แบบคอมมา: SMS_WHITELIST=66812345678,66987654321,+66999999999
function _digits(s?: string) {
  return String(s || "").replace(/\D+/g, "");
}
function _variants(num: string) {
  const d = _digits(num);
  const v = new Set<string>([d]);
  if (d.startsWith("0")) v.add("66" + d.slice(1));
  if (d.startsWith("66")) v.add("0" + d.slice(2));
  return Array.from(v);
}
function buildSmsWhitelist() {
  const raw = (process.env.SMS_WHITELIST || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const set = new Set<string>();
  for (const x of raw) for (const v of _variants(x)) set.add(v);
  return set;
}
const SMS_WHITELIST = buildSmsWhitelist();

function isSmsWhitelisted(phone?: string) {
  if (!phone) return false;
  // ต้องอยู่ใน whitelist เท่านั้น ถึงจะส่ง
  const cand = _variants(phone);
  for (const v of cand) if (SMS_WHITELIST.has(v)) return true;
  return false;
}

function maskPhone(phone?: string) {
  const d = _digits(phone);
  if (!d) return "(no-phone)";
  if (d.length <= 4) return "*".repeat(Math.max(0, d.length - 1)) + d.slice(-1);
  return d.slice(0, 2) + "*".repeat(Math.max(0, d.length - 6)) + d.slice(-4);
}

// -------- Utilities --------
type Person = { email?: string; phone?: string };

function parseChannels(): Array<"email" | "sms"> {
  const raw = (process.env.BROADCAST_CHANNELS || "email,sms")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const set = new Set<"email" | "sms">();
  for (const x of raw) if (x === "email" || x === "sms") set.add(x);
  return Array.from(set);
}

function uniqPersons(list: Person[]): Person[] {
  const seen = new Set<string>();
  const out: Person[] = [];
  for (const p of list) {
    const key = `${p.email || ""}|${p.phone || ""}`;
    if (key === "|") continue;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(p);
    }
  }
  return out;
}

// ---------- registration-service: players (ดึงผู้ที่ join อีเวนต์) ----------
async function fetchPlayersByEventId(eventId: string) {
  const base = (process.env.REG_API_BASE || "http://localhost:3005").trim();
  const pathTmpl = (process.env.REG_API_PLAYERS_PATH || "/api/registration/events/:id/players?limit=1000&offset=0").trim();
  const url = `${base}${pathTmpl.replace(":id", eventId)}`;

  const res = await axios.get(url, { timeout: 15000, validateStatus: () => true });
  if (res.status < 200 || res.status >= 300) {
    const e: any = new Error(`REG_API ${res.status}`);
    e.response = { status: res.status, data: res.data };
    e.config = { url, method: "GET" as const };
    throw e;
  }
  return res.data?.players || [];
}

// map players -> contacts (member ใช้ข้อมูลจาก Auth API, guest ใช้ข้อมูลจาก player เอง)
async function resolvePlayersContacts(players: any[]): Promise<Person[]> {
  const withUser = players.filter((p: any) => p?.userId);
  const userIds = withUser.map((p: any) => p.userId);

  let users: Array<{ email?: string; phoneNumber?: string }> = [];
  if (userIds.length) {
    users = (await fetchUsersByIds(userIds)).map((u) => ({
      email: u.email,
      phoneNumber: u.phoneNumber,
    }));
  }

  const usersById = new Map<string, { email?: string; phoneNumber?: string }>();
  for (const [i, u] of users.entries()) usersById.set(String(userIds[i] || ""), u);

  const contacts: Person[] = [];

  for (const p of players) {
    if (p.userId) {
      const u = usersById.get(p.userId);
      if (u?.email || u?.phoneNumber)
        contacts.push({ email: u?.email, phone: u?.phoneNumber });
      else if (p.email || p.phoneNumber)
        contacts.push({ email: p.email || undefined, phone: p.phoneNumber || undefined });
    } else {
      // guest: ใช้เฉพาะ phone/email จาก player
      if (p.email || p.phoneNumber)
        contacts.push({ email: p.email || undefined, phone: p.phoneNumber || undefined });
    }
  }

  return uniqPersons(contacts);
}

// ---------- creator contact (แจ้งผู้สร้างอีเวนต์) ----------
async function resolveCreatorContact(ev: any): Promise<Person[]> {
  const creatorId = ev?.createdBy || ev?.creatorId;
  if (!creatorId) return [];
  const u = await fetchUserById(String(creatorId));
  if (u?.email || u?.phoneNumber) {
    return [{ email: u.email, phone: u.phoneNumber }];
  }
  return [];
}

// ---------- mail / sms ----------
const transporter = nodemailer.createTransport({
  // ภายใน Docker ให้ตั้ง SMTP_HOST=mailhog, SMTP_PORT=1025
  host: process.env.SMTP_HOST || "localhost",
  port: Number(process.env.SMTP_PORT || 1025),
  secure: false,
});

async function sendEmail(to: string, subject: string, html: string) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || "BBP Notify <no-reply@bbp.local>",
    to,
    subject,
    html,
    // ให้มี plain text เผื่อไคลเอนต์ที่อ่านได้แต่ข้อความล้วน
    text: html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
  });
}

// ส่ง SMS (enforce whitelist + logging)
async function sendSMS(destination: string, text: string): Promise<boolean> {
  if (!isSmsWhitelisted(destination)) {
    console.log("[sms] SKIP (not whitelisted)", maskPhone(destination), `len=${text?.length || 0}`);
    return false;
  }

  const base = (process.env.SMSOK_BASE || "https://api.smsok.co").replace(/\/+$/, "");
  const auth = process.env.SMSOK_AUTH || "";
  const sender =
    process.env.FORCE_NO_SENDER === "true" ? undefined : process.env.SMS_SENDER || undefined;
  const payload: any = {
    text,
    destinations: [{ destination }],
    callback_url: process.env.SMS_CALLBACK_URL || undefined,
    callback_method: "POST",
  };
  if (sender) payload.sender = sender;

  console.log("[sms] SEND ->", maskPhone(destination), `len=${text?.length || 0}`);

  const res = await axios.post(`${base}/s`, payload, {
    headers: { "Content-Type": "application/json", Authorization: auth },
    timeout: 15000,
    validateStatus: () => true,
  });

  if (res.status < 200 || res.status >= 300) {
    console.error("[sms] ERR", res.status, maskPhone(destination), res.data);
    const e: any = new Error(`SMS provider ${res.status}`);
    e.response = { status: res.status, data: res.data };
    throw e;
  }

  console.log("[sms] OK", maskPhone(destination));
  return true;
}

// ---------- templates (ภาษาอังกฤษ) ----------
function emailHtml(type: EventKind, ev: any) {
  const title =
    type === "created" ? "New Event" : type === "updated" ? "Event Updated" : "Event Canceled";
  const badge = type === "created" ? "#10b981" : type === "updated" ? "#3b82f6" : "#ef4444";

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

// ---------- main (event: created/updated/deleted) ----------
export async function broadcastByEventId(eventId: string, type: EventKind) {
  // ดึงรายละเอียดอีเวนต์จาก Event Service (ต้องมี createdBy ด้วยเพื่อแจ้งผู้สร้าง)
  const ev = await fetchEventById(eventId);

  // คัดคนที่จะส่ง:
  // - deleted → ผู้ที่ join ทั้งหมด + ผู้สร้าง
  // - created/updated → ผู้ใช้ทั้งหมด (role=user) จาก Auth API
  let targets: Person[] = [];
  if (type === "deleted") {
    const players = await fetchPlayersByEventId(eventId);
    const playerContacts = await resolvePlayersContacts(players);
    const creator = await resolveCreatorContact(ev);
    targets = [...playerContacts, ...creator];
  } else {
    const users = await fetchAllUsers(); // ✅ ดึงจาก Auth API
    const contacts = users
      .filter((u) => u.role === "user")
      .map((u) => ({ email: u.email, phone: u.phoneNumber }));
    targets = uniqPersons(contacts);
  }

  // ช่องทางที่เปิดใช้งาน และโหมด dry-run
  const channels = parseChannels();
  const dryRun = (process.env.DRY_RUN || "false").toLowerCase() === "true";

  let emails = 0,
    sms = 0;
  if (!targets.length) return { emails, sms, people: 0, dryRun };

  // หัวเรื่องอีเมลภาษาอังกฤษ
  const subj =
    type === "deleted"
      ? `Event canceled: ${ev.eventName || ""}`
      : type === "updated"
      ? `Event updated: ${ev.eventName || ""}`
      : `New event: ${ev.eventName || ""}`;

  const html = emailHtml(type, ev);
  const text = smsText(type, ev);

  // ส่งรายคน (จับ error ต่อคน ไม่ให้ทั้งงานล้ม)
  for (const p of targets) {
    try {
      if (dryRun) continue;

      if (channels.includes("email") && p.email) {
        try {
          await sendEmail(p.email, subj, html);
          emails++;
        } catch (e) {
          console.error("[email] send error to", p.email, (e as any)?.message || e);
        }
      }
      if (channels.includes("sms") && p.phone) {
        try {
          await sendSMS(p.phone, text);
          sms++;
        } catch (e) {
          console.error("[sms] send error to", p.phone, (e as any)?.message || e);
        }
      }
    } catch {
      // เงียบไว้ — อย่าให้ผู้รับคนเดียวทำให้ทั้งรอบล้ม
    }
  }

  return { emails, sms, people: targets.length, dryRun };
}

// ---------- participant.joined (member/guest) ----------
export async function broadcastParticipantJoined(payload: any) {
  type Person = { email?: string; phone?: string };

  const channels = parseChannels();
  const dryRun = (process.env.DRY_RUN || "false").toLowerCase() === "true";

  const eventId = payload?.data?.eventId as string | undefined;
  if (!eventId) return { emails: 0, sms: 0, people: 0, dryRun, note: "no eventId" };

  // 1) ดึงข้อมูลอีเวนต์ + ผู้สร้าง
  const ev = await fetchEventById(eventId);

  const creatorContacts: Person[] = [];
  try {
    const creatorId = ev?.createdBy || ev?.creatorId;
    if (creatorId) {
      const u = await fetchUserById(String(creatorId));
      if (u?.email || u?.phoneNumber) {
        creatorContacts.push({ email: u.email, phone: u.phoneNumber });
      }
    }
  } catch {}

  // 2) ผู้เข้าร่วม (participant)
  const userType = String(payload?.data?.userType || "");
  const participant: Person[] = [];
  let memberDisplayName: string | undefined; // เก็บชื่อไว้ใช้เป็น label สำหรับ member

  if (userType === "member") {
    // member → ดึงจาก Auth API ด้วย userId
    const uid = payload?.data?.userId as string | undefined;
    if (uid) {
      try {
        const u = await fetchUserById(uid);
        if (u?.email || u?.phoneNumber) {
          participant.push({ email: u.email, phone: u.phoneNumber });
        }
        // ตั้งชื่อสำหรับแสดงผล (ถ้ามี)
        memberDisplayName = u?.name || payload?.data?.playerName || uid;
      } catch {
        memberDisplayName = payload?.data?.playerName || uid;
      }
    } else {
      memberDisplayName = payload?.data?.playerName || "Member";
    }
  } else if (userType === "guest") {
    // guest → ใช้ข้อมูลที่มากับ payload เท่านั้น (ไม่เรียก Registration API)
    const pEmail = payload?.data?.playerEmail as string | undefined;
    const pPhone = payload?.data?.playerPhone as string | undefined;
    if (pEmail || pPhone) {
      participant.push({ email: pEmail, phone: pPhone });
    }
  }

  // 3) เนื้อหาแจ้งเตือน
  const evName =
    (ev?.eventName || ev?.name || ev?.title || ev?._id || eventId) as string;

  // *** กติกาใหม่ ***
  // - guest: ใช้ playerName เสมอ (ถ้าไม่มีให้ fallback เป็น "Guest") — ไม่โชว์ playerId
  // - member: ใช้ memberDisplayName (ถ้ามี) ไม่งั้น fallback เป็น userId / playerName
  const joinerLabel =
    userType === "guest"
      ? (payload?.data?.playerName || "Guest")
      : (memberDisplayName ||
        payload?.data?.playerName ||
        payload?.data?.userId ||
        payload?.data?.playerId ||
        "Member");

  // ผู้สร้าง
  const subjCreator = `[Event] ${joinerLabel} joined "${evName}"`;
  const htmlCreator = `<p>Participant <b>${joinerLabel}</b> has joined your event <b>${evName}</b>.</p>`;
  const textCreator = `Participant ${joinerLabel} joined "${evName}".`;

  // ผู้ join (เฉพาะกรณีมีช่องทางติดต่อ)
  const subjJoiner = `[Event] You are registered for "${evName}"`;
  const htmlJoiner = `<p>You have successfully joined the event <b>${evName}</b>.</p>`;
  const textJoiner = `You are registered for "${evName}".`;

  // 4) ส่ง
  let emails = 0, sms = 0, people = 0;

  // → ผู้สร้าง
  for (const p of creatorContacts) {
    people++;
    try {
      if (channels.includes("email") && p.email) { await sendEmail(p.email, subjCreator, htmlCreator); emails++; }
      if (channels.includes("sms") && p.phone) { await sendSMS(p.phone, textCreator); sms++; }
    } catch {}
  }

  // → ผู้ join (guest จะส่งเฉพาะกรณี payload มี email/phone)
  for (const p of participant) {
    people++;
    try {
      if (channels.includes("email") && p.email) { await sendEmail(p.email, subjJoiner, htmlJoiner); emails++; }
      if (channels.includes("sms") && p.phone) { await sendSMS(p.phone, textJoiner); sms++; }
    } catch {}
  }

  return {
    emails,
    sms,
    people,
    dryRun,
    recipients: { creator: creatorContacts.length, participant: participant.length },
  };
}

// ส่งหาเจ้าของ Event และผู้ที่ Cancel เอง (participant.cancelled)
export async function broadcastParticipantCancelled(payload: any) {
  type Person = { email?: string; phone?: string };

  const channels = parseChannels();
  const dryRun = (process.env.DRY_RUN || "false").toLowerCase() === "true";

  const eventId = payload?.data?.eventId as string | undefined;
  const playerId = payload?.data?.playerId as string | undefined;
  if (!eventId || !playerId) {
    return { emails: 0, sms: 0, people: 0, dryRun, note: "missing eventId/playerId" };
  }

  // 1) ดึงข้อมูลอีเวนต์ + ผู้สร้าง
  const ev = await fetchEventById(eventId);

  const creatorContacts: Person[] = [];
  try {
    const creatorId = ev?.createdBy || ev?.creatorId;
    if (creatorId) {
      const u = await fetchUserById(String(creatorId));
      if (u?.email || u?.phoneNumber) creatorContacts.push({ email: u.email, phone: u.phoneNumber });
    }
  } catch {}

  // 2) หา "ผู้ที่ยกเลิก" จากรายการ players ของอีเวนต์ แล้วหาช่องทางติดต่อ/ชื่อที่ถูกต้อง
  const players = await fetchPlayersByEventId(eventId).catch(() => []);
  const p = Array.isArray(players) ? players.find((x: any) => String(x?.playerId) === String(playerId)) : undefined;

  let cancelerContact: Person | undefined;
  let cancelerLabel: string | undefined;

  if (p) {
    if (p.userId) {
      // MEMBER → ดึง contact และชื่อจาก Auth API ก่อน แล้วค่อย fallback
      try {
        const u = await fetchUserById(String(p.userId));
        if (u?.email || u?.phoneNumber) cancelerContact = { email: u.email, phone: u.phoneNumber };
        cancelerLabel =
          u?.name ||
          p?.name ||                           // เผื่อ registration ใส่ชื่อไว้ (มักจะว่างสำหรับ member)
          payload?.data?.playerName ||
          String(p.userId);
      } catch {
        // fallback หากดึง user ไม่ได้
        if (p?.email || p?.phoneNumber) cancelerContact = { email: p.email || undefined, phone: p.phoneNumber || undefined };
        cancelerLabel = p?.name || payload?.data?.playerName || String(p.userId) || "Member";
      }
    } else {
      // GUEST → ใช้ข้อมูลที่มากับ players เท่านั้น
      if (p?.email || p?.phoneNumber) cancelerContact = { email: p.email || undefined, phone: p.phoneNumber || undefined };
      cancelerLabel = p?.name || payload?.data?.playerName || "Guest";
    }
  } else {
    // หา player ไม่เจอ → อย่างน้อยให้มี label ที่พอเดาได้
    cancelerLabel = payload?.data?.playerName || payload?.data?.canceledBy || playerId || "Participant";
  }

  // 3) เนื้อหาแจ้งเตือน
  const evName = (ev?.eventName || ev?.name || ev?.title || ev?._id || eventId) as string;

  const subjCreator = `[Event] ${cancelerLabel} canceled their registration for "${evName}"`;
  const htmlCreator = `<p><b>${cancelerLabel}</b> has <b>canceled</b> their registration for <b>${evName}</b>.</p>`;
  const textCreator = `${cancelerLabel} canceled their registration for "${evName}".`;

  const subjCanceler = `[Event] You have canceled your registration for "${evName}"`;
  const htmlCanceler = `<p>You have <b>canceled</b> your registration for <b>${evName}</b>.</p>`;
  const textCanceler = `You have canceled your registration for "${evName}".`;

  // 4) ส่ง
  let emails = 0, sms = 0, people = 0;

  // → เจ้าของอีเวนต์
  for (const p of creatorContacts) {
    people++;
    try {
      if (channels.includes("email") && p.email) { await sendEmail(p.email, subjCreator, htmlCreator); emails++; }
      if (channels.includes("sms") && p.phone) { await sendSMS(p.phone, textCreator); sms++; }
    } catch {}
  }

  // → ผู้ที่ยกเลิก (ถ้ามี contact)
  if (cancelerContact) {
    people++;
    try {
      if (channels.includes("email") && cancelerContact.email) { await sendEmail(cancelerContact.email, subjCanceler, htmlCanceler); emails++; }
      if (channels.includes("sms") && cancelerContact.phone) { await sendSMS(cancelerContact.phone, textCanceler); sms++; }
    } catch {}
  }

  return {
    emails, sms, people, dryRun,
    recipients: { creator: creatorContacts.length, canceler: cancelerContact ? 1 : 0 }
  };
}

// ===== Payment: ส่งหา "ผู้เล่นคนเดียว" =====
export async function broadcastPaymentPending(payload: any) {
  type Person = { email?: string; phone?: string };

  const channels = parseChannels();
  const dryRun = (process.env.DRY_RUN || "false").toLowerCase() === "true";

  const eventId  = String(payload?.event_id || "");
  const playerId = String(payload?.player_id || "");
  const amount   = Number(payload?.amount || 0);
  const currency = String(payload?.currency || "").toUpperCase();
  const qrUrl    = String(payload?.qr_code_uri || "");

  if (!eventId || !playerId) return { emails: 0, sms: 0, people: 0, dryRun, note: "missing eventId/playerId" };

  const ev = await fetchEventById(eventId);
  const evName = (ev?.eventName || ev?.name || ev?.title || ev?._id || eventId) as string;

  // หา player จากรายการ players ทั้งหมดของอีเวนต์
  const players = await fetchPlayersByEventId(eventId).catch(() => []);
  const p = Array.isArray(players) ? players.find((x: any) => String(x?.playerId) === playerId) : undefined;

  if (!p) return { emails: 0, sms: 0, people: 0, dryRun, note: "player not found" };

  // สร้าง contact ของ player เดียว
  let contact: Person | undefined;
  let displayName = p?.name || "Participant";

  if (p?.userId) {
    try {
      const u = await fetchUserById(String(p.userId));
      if (u?.email || u?.phoneNumber) contact = { email: u.email, phone: u.phoneNumber };
      displayName = u?.name || p?.name || displayName;
    } catch {
      if (p?.email || p?.phoneNumber) contact = { email: p.email || undefined, phone: p.phoneNumber || undefined };
    }
  } else {
    if (p?.email || p?.phoneNumber) contact = { email: p.email || undefined, phone: p.phoneNumber || undefined };
    displayName = p?.name || "Guest";
  }

  if (!contact) return { emails: 0, sms: 0, people: 0, dryRun, note: "no contact channel" };

  // เนื้อหา
  const title = `[Payment] Pending for "${evName}"`;
  const html = `
    <p>Hi <b>${displayName}</b>,</p>
    <p>Your payment is <b>pending</b> for <b>${evName}</b>.</p>
    <p><b>Amount:</b> ${amount} ${currency}</p>
    ${qrUrl ? `<p><b>QR Code:</b> <a href="${qrUrl}" target="_blank" rel="noopener">Click to open</a></p>` : ""}
  `;
  const text = `Payment pending for "${evName}". Amount: ${amount} ${currency}.` + (qrUrl ? ` QR: ${qrUrl}` : "");

  let emails = 0, sms = 0, people = 0;
  people = 1;

  try {
    if (channels.includes("email") && contact.email) { await sendEmail(contact.email, title, html); emails++; }
    if (channels.includes("sms") && contact.phone) { await sendSMS(contact.phone, text); sms++; }
  } catch {}

  return { emails, sms, people, dryRun, recipients: { player: 1 } };
}

export async function broadcastPaymentCompleted(payload: any) {
  type Person = { email?: string; phone?: string };

  const channels = parseChannels();
  const dryRun = (process.env.DRY_RUN || "false").toLowerCase() === "true";

  const eventId  = String(payload?.event_id || "");
  const playerId = String(payload?.player_id || "");
  const amount   = Number(payload?.amount || 0);
  const currency = String(payload?.currency || "").toUpperCase();

  if (!eventId || !playerId) return { emails: 0, sms: 0, people: 0, dryRun, note: "missing eventId/playerId" };

  const ev = await fetchEventById(eventId);
  const evName = (ev?.eventName || ev?.name || ev?.title || ev?._id || eventId) as string;

  const players = await fetchPlayersByEventId(eventId).catch(() => []);
  const p = Array.isArray(players) ? players.find((x: any) => String(x?.playerId) === playerId) : undefined;

  if (!p) return { emails: 0, sms: 0, people: 0, dryRun, note: "player not found" };

  let contact: Person | undefined;
  let displayName = p?.name || "Participant";

  if (p?.userId) {
    try {
      const u = await fetchUserById(String(p.userId));
      if (u?.email || u?.phoneNumber) contact = { email: u.email, phone: u.phoneNumber };
      displayName = u?.name || p?.name || displayName;
    } catch {
      if (p?.email || p?.phoneNumber) contact = { email: p.email || undefined, phone: p.phoneNumber || undefined };
    }
  } else {
    if (p?.email || p?.phoneNumber) contact = { email: p.email || undefined, phone: p.phoneNumber || undefined };
    displayName = p?.name || "Guest";
  }

  if (!contact) return { emails: 0, sms: 0, people: 0, dryRun, note: "no contact channel" };

  const title = `[Payment] Completed for "${evName}"`;
  const html = `
    <p>Hi <b>${displayName}</b>,</p>
    <p>Your payment is <b>completed</b> for <b>${evName}</b>.</p>
    <p><b>Amount:</b> ${amount} ${currency}</p>
  `;
  const text = `Payment completed for "${evName}". Amount: ${amount} ${currency}.`;

  let emails = 0, sms = 0, people = 0;
  people = 1;

  try {
    if (channels.includes("email") && contact.email) { await sendEmail(contact.email, title, html); emails++; }
    if (channels.includes("sms") && contact.phone) { await sendSMS(contact.phone, text); sms++; }
  } catch {}

  return { emails, sms, people, dryRun, recipients: { player: 1 } };
}

