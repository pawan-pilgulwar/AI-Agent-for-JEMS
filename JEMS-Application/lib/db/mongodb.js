import { MongoClient } from 'mongodb';
import { ensureSrvDns } from './dns-fallback.cjs';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = 'jems_production';

if (!MONGODB_URI) {
  throw new Error('Missing MONGODB_URI in environment variables');
}

let cached = global.mongo;

if (!cached) {
  cached = global.mongo = { conn: null, db: null };
}

export async function connectToDatabase() {
  if (cached.conn) {
    return cached;
  }

  try {
    await ensureSrvDns(MONGODB_URI);
    const client = new MongoClient(MONGODB_URI, {
      maxPoolSize: 10,
      minPoolSize: 5,
    });

    await client.connect();
    console.log('✓ Connected to MongoDB');

    cached.conn = client;
    cached.db = client.db(MONGODB_DB);

    return cached;
  } catch (error) {
    console.error('✗ MongoDB connection error:', error);
    throw error;
  }
}

export async function getDatabase() {
  const { db } = await connectToDatabase();
  return db;
}

export async function closeDatabase() {
  if (cached.conn) {
    await cached.conn.close();
    cached.conn = null;
    cached.db = null;
    console.log('✓ MongoDB closed');
  }
}