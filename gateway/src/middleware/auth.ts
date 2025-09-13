import jwt from "jsonwebtoken";
import type { NextFunction, Response } from "express";
import type { RequestWithUser, UserClaims } from "../types/auth";

export function attachUserFromJwt(secret: string) {
  return (req: RequestWithUser, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, secret) as UserClaims;
      req.user = decoded;
    } catch (_e) {
      // Do not throw here; let requireAuth enforce when needed
    }
    next();
  };
}

export function requireAuth(req: RequestWithUser, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required", code: "AUTHENTICATION_REQUIRED" });
    return;
  }
  next();
}

export function requireAdmin(req: RequestWithUser, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ 
      error: "Authentication required", 
      code: "AUTHENTICATION_REQUIRED" 
    });
    return;
  }
  
  if (req.user.role !== "admin") {
    res.status(403).json({
      error: "Admin privileges required",
      code: "INSUFFICIENT_PERMISSIONS",
      details: {
        userId: req.user.userId,
        currentRole: req.user.role,
        requiredRole: "admin"
      }
    });
    return;
  }
  
  next();
}

export function forwardUserHeaders(proxyReq: any, req: RequestWithUser) {
  if (req.user) {
    proxyReq.setHeader("x-user-id", req.user.userId);
    proxyReq.setHeader("x-user-email", req.user.email);
    proxyReq.setHeader("x-user-role", req.user.role);
    proxyReq.setHeader("x-authenticated", "true");
  }
}

