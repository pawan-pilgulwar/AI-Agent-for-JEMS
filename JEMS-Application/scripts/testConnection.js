const { MongoClient } = require('mongodb');

async function testConnection() {
  if (!process.env.MONGODB_URI) {
    console.error('✗ MONGODB_URI not set in .env.local');
    console.error('Add your MongoDB connection string to .env.local');
    process.exit(1);
  }

  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    // Works around Node DNS servers that refuse SRV lookups (see lib/db/dns-fallback.cjs).
    await require("../lib/db/dns-fallback.cjs").ensureSrvDns(process.env.MONGODB_URI);
    await client.connect();
    console.log('✓ Connected to MongoDB');

    const db = client.db('jems_production');

    // Test ping
    // const admin = db.admin();
    // const result = await admin.ping();
    // console.log('✓ Ping successful');

    // List collections
    const collections = await db.listCollections().toArray();
    console.log(`\n✓ Collections: ${collections.length}`);
    collections.forEach(c => {
      console.log(`  • ${c.name}`);
    });

    console.log('\n✓✓✓ Database connection verified! ✓✓✓\n');

  } catch (error) {
    console.error('✗ Connection failed:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

testConnection();