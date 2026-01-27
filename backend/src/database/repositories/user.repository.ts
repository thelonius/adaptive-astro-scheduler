import { pool } from '../connection';
import type { User, CreateUserInput, UpdateUserInput } from '../models/user.model';

export class UserRepository {
  async findByTelegramId(telegramId: number): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE telegram_id = $1';
    const result = await pool.query<User>(query, [telegramId]);
    return result.rows[0] || null;
  }

  async findById(id: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await pool.query<User>(query, [id]);
    return result.rows[0] || null;
  }

  async create(data: CreateUserInput): Promise<User> {
    const query = `
      INSERT INTO users (email, telegram_id, username, metadata)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [
      data.email || null,
      data.telegram_id || null,
      data.username || null,
      data.metadata || {},
    ];
    const result = await pool.query<User>(query, values);
    return result.rows[0];
  }

  async update(id: string, data: UpdateUserInput): Promise<User | null> {
    // Dynamic update query
    const updates: string[] = [];
    const values: any[] = [id];
    let paramIndex = 2;

    if (data.email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(data.email);
    }
    if (data.username !== undefined) {
      updates.push(`username = $${paramIndex++}`);
      values.push(data.username);
    }
    if (data.last_seen_at !== undefined) {
      updates.push(`last_seen_at = $${paramIndex++}`);
      values.push(data.last_seen_at);
    }
    if (data.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(data.is_active);
    }
    if (data.metadata !== undefined) {
        updates.push(`metadata = COALESCE(metadata, '{}'::jsonb) || $${paramIndex++}`);
        values.push(data.metadata);
    }

    if (updates.length === 0) return this.findById(id);

    updates.push(`updated_at = NOW()`);

    const query = `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query<User>(query, values);
    return result.rows[0] || null;
  }
}

// Export singleton instance
export const userRepository = new UserRepository();
