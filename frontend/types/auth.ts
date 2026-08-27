import type { CreatorCategory, SocialPlatform, UserRole } from "@/types";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string;
  /** Only present/true for real Django staff/superuser accounts — the actual authorization boundary for /manage. */
  isStaff?: boolean;
  isSuperuser?: boolean;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface CreatorRegisterPayload {
  fullName: string;
  username: string;
  email: string;
  password: string;
  platforms: SocialPlatform[];
  category: CreatorCategory;
}

export interface BrandRegisterPayload {
  companyName: string;
  contactName: string;
  email: string;
  password: string;
  website?: string;
}
