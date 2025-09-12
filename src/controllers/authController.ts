import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import { generateToken } from '../utils/jwt';
import { IUserCreate, IUserLogin } from '../types/user';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, skill, role = 'user' }: IUserCreate = req.body;

    if (!email || !password || !name || !skill) {
      res.status(400).json({ error: 'Email, password, name, and skill are required' });
      return;
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ error: 'User already exists' });
      return;
    }

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
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password }: IUserLogin = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = generateToken({
      userId: (user._id as any).toString(),
      email: user.email,
      role: user.role,
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
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const verifyToken = (req: Request, res: Response): void => {
  res.status(200).json({
    message: 'Token is valid',
    user: (req as any).user,
  });
};