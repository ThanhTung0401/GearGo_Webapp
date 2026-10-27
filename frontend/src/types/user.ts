// ─── User Accounts Types ──────────────────────────────────────────────────────

import type { Role } from "./common";

export interface StaffAccount {
  id: string; // NV-001
  username: string;
  name: string;
  password?: string;
  role: "Quản trị viên" | "Nhân viên kho" | "Nhân viên chăm sóc KH";
  phone: string;
  email: string;
  status: "active" | "locked";
  lockedReason?: string;
  permissions?: string[];
  createdAt: string;
}

export interface CustomerAccount {
  id: string; // KH001
  name: string;
  phone: string;
  email: string;
  password?: string;
  address: string;
  status: "active" | "locked";
  lockedReason?: string;
  createdAt: string;
  totalOrders: number;
  totalSpent: number;
  currentDeposit: number;
}

export interface CurrentUser {
  id?: string;
  username?: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  permissions?: string[];
  address?: string;
}
