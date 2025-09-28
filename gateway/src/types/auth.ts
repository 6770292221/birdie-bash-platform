export interface UserClaims {
  userId: string;
  email: string;
  role: string;
  name?: string;
  phoneNumber?: string | null;
}

import type { Request } from "express";
export interface RequestWithUser extends Request {
  user?: UserClaims;
}
