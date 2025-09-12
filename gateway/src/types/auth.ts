export interface UserClaims {
  userId: string;
  email: string;
  role: string;
}

import type { Request } from "express";
export interface RequestWithUser extends Request {
  user?: UserClaims;
}
