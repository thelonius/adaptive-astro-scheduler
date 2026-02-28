
import { query } from '../src/database/connection';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkDb() {
    try {
        const users = await query('SELECT count(*) FROM users');
        const charts = await query('SELECT count(*) FROM natal_charts');
        console.log(`Users: ${users.rows[0].count}`);
        console.log(`Natal Charts: ${charts.rows[0].count}`);

        if (parseInt(charts.rows[0].count) > 0) {
            const latest = await query('SELECT name, birth_date FROM natal_charts LIMIT 5');
            console.log('Latest charts:', latest.rows);
        }
    } catch (e) {
        console.error('Error querying DB:', e.message);
    } finally {
        process.exit();
    }
}

checkDb();
