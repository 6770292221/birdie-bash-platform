import axios from "axios";

export type AuthUser = {
  id: string;
  email?: string;
  name?: string;
  skill?: string;
  phoneNumber?: string;
  role?: string;
};

function base(): string {
  // e.g. http://localhost:3001
  return (process.env.AUTH_API_BASE || "http://localhost:3001").trim().replace(/\/$/, "");
}

function userPathTemplate(): string {
  // default: /api/auth/user/{id}
  return (process.env.AUTH_API_USER_PATH || "/api/auth/user/{id}").trim();
}

function listPath(): string {
  // optional list endpoint; if not provided, callers should not call list
  return (process.env.AUTH_API_LIST_PATH || "/api/auth/users?role=user&limit=10000&offset=0").trim();
}

export async function fetchUserById(userId: string): Promise<AuthUser | null> {
  if (!userId) return null;
  const url = base() + userPathTemplate().replace("{id}", encodeURIComponent(userId));
  const res = await axios.get(url, { timeout: 10000, validateStatus: () => true });
  if (res.status < 200 || res.status >= 300) {
    const err: any = new Error(`AUTH_API ${res.status}`);
    err.response = { status: res.status, data: res.data };
    err.config = { url, method: "GET" };
    throw err;
  }
  const u = res.data?.user || res.data;
  if (!u) return null;
  return {
    id: u.id || u._id || "",
    email: u.email,
    name: u.name,
    skill: u.skill,
    phoneNumber: u.phoneNumber,
    role: u.role,
  };
}

export async function fetchUsersByIds(ids: string[]): Promise<AuthUser[]> {
  // If the auth service supports a batch endpoint, use it via AUTH_API_BATCH_PATH, else fallback to N calls.
  const batchPath = (process.env.AUTH_API_BATCH_PATH || "").trim();
  if (batchPath) {
    const url = base() + batchPath;
    const res = await axios.post(url, { ids }, { timeout: 15000, validateStatus: () => true });
    if (res.status < 200 || res.status >= 300) {
      const err: any = new Error(`AUTH_API_BATCH ${res.status}`);
      err.response = { status: res.status, data: res.data };
      err.config = { url, method: "POST" };
      throw err;
    }
    const arr = Array.isArray(res.data?.users) ? res.data.users : (Array.isArray(res.data) ? res.data : []);
    return arr.map((u: any) => ({
      id: u.id || u._id || "",
      email: u.email,
      name: u.name,
      skill: u.skill,
      phoneNumber: u.phoneNumber,
      role: u.role,
    }));
  }
  const results: AuthUser[] = [];
  for (const id of ids) {
    try {
      const u = await fetchUserById(id);
      if (u) results.push(u);
    } catch { /* ignore single-user error */ }
  }
  return results;
}

export async function fetchAllUsers(): Promise<AuthUser[]> {
  const url = base() + listPath();
  const res = await axios.get(url, { timeout: 15000, validateStatus: () => true });
  if (res.status < 200 || res.status >= 300) {
    const err: any = new Error(`AUTH_API_LIST ${res.status}`);
    err.response = { status: res.status, data: res.data };
    err.config = { url, method: "GET" };
    throw err;
  }
  const arr = Array.isArray(res.data?.users) ? res.data.users : (Array.isArray(res.data) ? res.data : []);
  return arr.map((u: any) => ({
    id: u.id || u._id || "",
    email: u.email,
    name: u.name,
    skill: u.skill,
    phoneNumber: u.phoneNumber,
    role: u.role,
  }));
}