import { fetchAllUsers } from "../remote/authApi";

export type BroadcastPerson = { email?: string; phone?: string };

export async function fetchAllPeopleFromDB(): Promise<BroadcastPerson[]> {
  // Now fetch from Auth API instead of MongoDB
  const users = await fetchAllUsers();

  return users
    .filter(u => u.role === "user")
    .map(u => ({
      email: u.email,
      phone: u.phoneNumber,
    }))
    .filter(p => p.email || p.phone);
}

