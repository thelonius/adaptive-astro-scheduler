import { pool } from '../connection';
import type {
  NatalChart,
  CreateNatalChartInput,
  UpdateNatalChartInput,
  NatalChartSummary,
} from '../models/natal-chart.model';

/**
 * Natal Chart Repository
 *
 * Handles all database operations for natal charts
 */

export class NatalChartRepository {
  /**
   * Create a new natal chart
   */
  async create(data: CreateNatalChartInput): Promise<NatalChart> {
    const query = `
      INSERT INTO natal_charts (
        user_id, name, birth_date, birth_time, birth_location,
        planets, houses, aspects, lunar_day, moon_phase, house_system
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      data.user_id || null,
      data.name || 'My Chart',
      data.birth_date,
      data.birth_time,
      JSON.stringify(data.birth_location),
      JSON.stringify(data.planets),
      JSON.stringify(data.houses),
      JSON.stringify(data.aspects),
      data.lunar_day ? JSON.stringify(data.lunar_day) : null,
      data.moon_phase || null,
      data.house_system || 'placidus',
    ];

    const result = await pool.query<NatalChart>(query, values);
    return this.deserialize(result.rows[0]);
  }

  /**
   * Find natal chart by ID
   */
  async findById(id: string): Promise<NatalChart | null> {
    const query = 'SELECT * FROM natal_charts WHERE id = $1';
    const result = await pool.query<NatalChart>(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.deserialize(result.rows[0]);
  }

  /**
   * Find all natal charts for a user
   */
  async findByUserId(userId: string): Promise<NatalChartSummary[]> {
    const query = `
      SELECT id, name, birth_date, birth_location, created_at
      FROM natal_charts
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query, [userId]);
    return result.rows.map(row => ({
      ...row,
      birth_location: typeof row.birth_location === 'string'
        ? JSON.parse(row.birth_location)
        : row.birth_location,
    }));
  }

  /**
   * Find all guest/anonymous natal charts
   */
  async findGuestCharts(limit: number = 100): Promise<NatalChartSummary[]> {
    const query = `
      SELECT id, name, birth_date, birth_location, created_at
      FROM natal_charts
      WHERE user_id IS NULL
      ORDER BY created_at DESC
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);
    return result.rows.map(row => ({
      ...row,
      birth_location: typeof row.birth_location === 'string'
        ? JSON.parse(row.birth_location)
        : row.birth_location,
    }));
  }

  /**
   * Update a natal chart
   */
  async update(id: string, data: UpdateNatalChartInput): Promise<NatalChart | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }

    if (data.birth_date !== undefined) {
      updates.push(`birth_date = $${paramIndex++}`);
      values.push(data.birth_date);
    }

    if (data.birth_time !== undefined) {
      updates.push(`birth_time = $${paramIndex++}`);
      values.push(data.birth_time);
    }

    if (data.birth_location !== undefined) {
      updates.push(`birth_location = $${paramIndex++}`);
      values.push(JSON.stringify(data.birth_location));
    }

    if (data.planets !== undefined) {
      updates.push(`planets = $${paramIndex++}`);
      values.push(JSON.stringify(data.planets));
    }

    if (data.houses !== undefined) {
      updates.push(`houses = $${paramIndex++}`);
      values.push(JSON.stringify(data.houses));
    }

    if (data.aspects !== undefined) {
      updates.push(`aspects = $${paramIndex++}`);
      values.push(JSON.stringify(data.aspects));
    }

    if (data.lunar_day !== undefined) {
      updates.push(`lunar_day = $${paramIndex++}`);
      values.push(data.lunar_day ? JSON.stringify(data.lunar_day) : null);
    }

    if (data.moon_phase !== undefined) {
      updates.push(`moon_phase = $${paramIndex++}`);
      values.push(data.moon_phase);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const query = `
      UPDATE natal_charts
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query<NatalChart>(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    return this.deserialize(result.rows[0]);
  }

  /**
   * Delete a natal chart
   */
  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM natal_charts WHERE id = $1';
    const result = await pool.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  /**
   * Delete all natal charts for a user
   */
  async deleteByUserId(userId: string): Promise<number> {
    const query = 'DELETE FROM natal_charts WHERE user_id = $1';
    const result = await pool.query(query, [userId]);
    return result.rowCount || 0;
  }

  /**
   * Count natal charts for a user
   */
  async countByUserId(userId: string): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM natal_charts WHERE user_id = $1';
    const result = await pool.query<{ count: string }>(query, [userId]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Deserialize JSON fields from database
   */
  private deserialize(row: any): NatalChart {
    return {
      ...row,
      birth_location: typeof row.birth_location === 'string'
        ? JSON.parse(row.birth_location)
        : row.birth_location,
      planets: typeof row.planets === 'string'
        ? JSON.parse(row.planets)
        : row.planets,
      houses: typeof row.houses === 'string'
        ? JSON.parse(row.houses)
        : row.houses,
      aspects: typeof row.aspects === 'string'
        ? JSON.parse(row.aspects)
        : row.aspects,
      lunar_day: row.lunar_day && typeof row.lunar_day === 'string'
        ? JSON.parse(row.lunar_day)
        : row.lunar_day,
    };
  }
}

export const natalChartRepository = new NatalChartRepository();
