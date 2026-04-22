import pg from 'pg';
import { registerType } from 'pgvector/pg';
import { config } from '../config/env.js';

const { Pool } = pg;

export const pool = new Pool(config.db);

// Initialize PgVector type registration
export async function initDb() {
    pool.on('connect', async (client) => {
        await client.query('CREATE EXTENSION IF NOT EXISTS vector');
        await registerType(client);
    });
    
    // Test connection
    const client = await pool.connect();
    client.release();
    console.log("Database connected and pgvector initialized.");
}