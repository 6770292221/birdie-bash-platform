export type SkillType = 'S' | 'P' | 'BG' | 'N';

export interface IUser {
  email: string;
  password_hash: string;
  role: 'admin' | 'user';
  name: string;
  skill: SkillType;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserCreate {
  email: string;
  password: string;
  name: string;
  skill: SkillType;
  role?: 'admin' | 'user';
}

export interface IUserLogin {
  email: string;
  password: string;
}