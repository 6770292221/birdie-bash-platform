import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import User from './models/User';
import { generateToken } from './utils/jwt';
import { IUserCreate, IUserLogin } from './types/user';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password, name, skill, role = 'user' }: IUserCreate = req.body;

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
