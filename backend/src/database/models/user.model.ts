/**
 * User Model
 *
 * Represents a user in the system
 */

export interface User {
  id: string;
  email: string | null;
  telegram_id: number | null;
  username: string | null;
  created_at: Date;
  updated_at: Date;
  last_seen_at: Date | null;
  is_active: boolean;
  metadata: Record<string, any>;
}

export interface CreateUserInput {
  email?: string;
  telegram_id?: number;
  username?: string;
  metadata?: Record<string, any>;
}

export interface UpdateUserInput {
  email?: string;
  username?: string;
  last_seen_at?: Date;
  is_active?: boolean;
  metadata?: Record<string, any>;
}
