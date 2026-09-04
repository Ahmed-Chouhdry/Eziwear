export type UserRole = 'customer' | 'admin';

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: 'active' | 'suspended';
  createdAt?: string;
}

export interface Address {
  id: number;
  name: string;
  phone: string;
  address: string;
  city: string;
  area?: string;
  postalCode?: string;
  isDefault?: boolean;
}

export interface AuthResult {
  token: string;
  user: User;
}

export interface LoginPayload {
  identifier: string; // email or phone
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  phone?: string;
  password: string;
}
