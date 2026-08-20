const {Pool} = require('pg');
const pool = new Pool({user:'postgres',host:'localhost',database:'hisdb',password:'1234',port:5432});

async function fixSchema() {
  const client = await pool.connect();
  try {
    // Fix 1: Add missing columns to exam_requests
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exam_requests' AND column_name='started_at') THEN
          ALTER TABLE exam_requests ADD COLUMN started_at TIMESTAMP;
          RAISE NOTICE 'Added started_at column';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exam_requests' AND column_name='received_at') THEN
          ALTER TABLE exam_requests ADD COLUMN received_at TIMESTAMP;
          RAISE NOTICE 'Added received_at column';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exam_requests' AND column_name='received_by') THEN
          ALTER TABLE exam_requests ADD COLUMN received_by INTEGER;
          RAISE NOTICE 'Added received_by column';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exam_requests' AND column_name='notify_sent') THEN
          ALTER TABLE exam_requests ADD COLUMN notify_sent BOOLEAN DEFAULT false;
          RAISE NOTICE 'Added notify_sent column';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exam_items' AND column_name='is_common') THEN
          ALTER TABLE exam_items ADD COLUMN is_common BOOLEAN DEFAULT false;
          RAISE NOTICE 'Added is_common column to exam_items';
        END IF;
      END $$;
    `);
    console.log('Schema fixed successfully');
  } catch (err) {
    console.error('Fix error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}
fixSchema();
