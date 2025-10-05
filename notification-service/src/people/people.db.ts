import User from "../models/User";

export type BroadcastPerson = { email?: string; phone?: string };

export async function fetchAllPeopleFromDB(): Promise<BroadcastPerson[]> {
  const users = await User.find(
    { role: "user" },
    { email: 1, phoneNumber: 1 }
  ).lean();

  return users
    .map(u => ({
      email: (u as any).email as string | undefined,
      phone: (u as any).phoneNumber as string | undefined,
    }))
    .filter(p => p.email || p.phone);
}
