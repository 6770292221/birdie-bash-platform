import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import { generateToken } from '../utils/jwt';
import { IUserCreate, IUserLogin } from '../types/user';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password, name, skill, phoneNumber, role = 'user' }: IUserCreate = req.body;

    const missing: string[] = [];
    if (!email) missing.push('email');
    if (!password) missing.push('password');
    if (!name) missing.push('name');
    if (!skill) missing.push('skill');
    if (missing.length) { res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Missing required fields', details: { missing } }); return; }

    const existingUser = await User.findOne({ email });
    if (existingUser) { res.status(400).json({ code: 'USER_EXISTS', message: 'User already exists', details: { email } }); return; }

    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const user = new User({
      email,
      password_hash,
      name,
      skill,
      phoneNumber,
      role,
    });

    await user.save();

    const token = generateToken({
      userId: (user._id as any).toString(),
      email: user.email,
      role: user.role,
      name: user.name,
      phoneNumber: user.phoneNumber ?? null,
    });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id as any,
        email: user.email,
        name: user.name,
        skill: user.skill,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
    });
  } catch (error) { next(error as any); }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password }: IUserLogin = req.body;

    const missing: string[] = [];
    if (!email) missing.push('email');
    if (!password) missing.push('password');
    if (missing.length) { res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Missing required fields', details: { missing } }); return; }

    const user = await User.findOne({ email });
    if (!user) { res.status(401).json({ code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' }); return; }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) { res.status(401).json({ code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' }); return; }

    const token = generateToken({
      userId: (user._id as any).toString(),
      email: user.email,
      role: user.role,
      name: user.name,
      phoneNumber: user.phoneNumber ?? null,
    });

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id as any,
        email: user.email,
        name: user.name,
        skill: user.skill,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
    });
  } catch (error) { next(error as any); }
};

export const verifyToken = (req: Request, res: Response): void => {
  res.status(200).json({
    message: 'Token is valid',
    user: (req as any).user,
  });
};

export const getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) { res.status(400).json({ code: 'VALIDATION_ERROR', message: 'User ID is required' }); return; }

    const user = await User.findById(id);
    if (!user) { res.status(404).json({ code: 'USER_NOT_FOUND', message: 'User not found' }); return; }

    res.status(200).json({
      message: 'User retrieved successfully',
      user: {
        id: user._id as any,
        email: user.email,
        name: user.name,
        skill: user.skill,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
    });
  } catch (error) { next(error as any); }
};

export const getAllUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { limit = '25', offset = '0', role } = req.query as {
      limit?: string;
      offset?: string;
      role?: string;
    };

    const parsedLimit = (() => {
      const value = parseInt(limit ?? '25', 10);
      if (Number.isNaN(value)) return 25;
      return Math.max(1, Math.min(100, value));
    })();

    const parsedOffset = (() => {
      const value = parseInt(offset ?? '0', 10);
      if (Number.isNaN(value)) return 0;
      return Math.max(0, value);
    })();

    const filters: Record<string, unknown> = {};
    if (typeof role === 'string' && role.trim()) {
      filters.role = role.trim();
    }

    const [users, total] = await Promise.all([
      User.find(filters)
        .sort({ createdAt: -1 })
        .skip(parsedOffset)
        .limit(parsedLimit)
        .select('email name skill phoneNumber role createdAt updatedAt'),
      User.countDocuments(filters),
    ]);

    res.status(200).json({
      message: 'Users retrieved successfully',
      users: users.map((user) => ({
        id: user._id as any,
        email: user.email,
        name: user.name,
        skill: user.skill,
        phoneNumber: user.phoneNumber,
        role: user.role,
        createdAt: (user as any).createdAt,
        updatedAt: (user as any).updatedAt,
      })),
      pagination: {
        total,
        limit: parsedLimit,
        offset: parsedOffset,
        hasMore: parsedOffset + users.length < total,
      },
      filters: filters.role ? { role: filters.role } : undefined,
    });
  } catch (error) { next(error as any); }
};

export const getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const headerUserIdRaw = req.headers['x-user-id'];
    const userId = Array.isArray(headerUserIdRaw) ? headerUserIdRaw[0] : headerUserIdRaw;

    if (!userId) {
      res.status(401).json({
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required',
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user) { res.status(404).json({ code: 'USER_NOT_FOUND', message: 'User not found' }); return; }

    res.status(200).json({
      message: 'Profile retrieved successfully',
      user: {
        id: user._id as any,
        email: user.email,
        name: user.name,
        skill: user.skill,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
    });
  } catch (error) { next(error as any); }
};
