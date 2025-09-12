import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from '../types/auth';

export const gatewayAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // For non-protected routes, continue without user info
      next();
      return;
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    
    const decoded = jwt.verify(token, secret) as any;
    
    // Add user information to headers for downstream services
    req.headers['x-user-id'] = decoded.userId;
    req.headers['x-user-email'] = decoded.email;
    req.headers['x-user-role'] = decoded.role;
    
    // Also add to request object for local use
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };
    
    next();
  } catch (error) {
    console.error('Gateway auth error:', error);
    res.status(401).json({ 
      error: 'Invalid token',
      code: 'UNAUTHORIZED'
    });
  }
};

export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user || !req.user.userId) {
    res.status(401).json({ 
      error: 'Authentication required',
      code: 'AUTHENTICATION_REQUIRED'
    });
    return;
  }
  next();
};