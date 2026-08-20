const {Pool} = require('pg');
const pool = new Pool({user:'postgres',host:'localhost',database:'hisdb',password:'1234',port:5432});

async function fixDuplicates() {
  const client = await pool.connect();
  try {
    // Remove duplicate exam_items - keep the one with the lowest id for each unique (exam_type, name, category)
    const deleteResult = await client.query(`
      DELETE FROM exam_items
      WHERE id NOT IN (
        SELECT MIN(id)
        FROM exam_items
        GROUP BY exam_type, name, category
      )
    `);
    console.log('Deleted duplicate exam_items:', deleteResult.rowCount);
    
    // Add unique constraint to prevent future duplicates
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'exam_items_unique_type_name_category'
        ) THEN
          ALTER TABLE exam_items ADD CONSTRAINT exam_items_unique_type_name_category UNIQUE (exam_type, name, category);
          RAISE NOTICE 'Added unique constraint';
        END IF;
      END $$;
    `);
    console.log('Unique constraint added');
    
    // Verify
    const verify = await client.query(`
      SELECT name, exam_type, category, COUNT(*) as count
      FROM exam_items
      WHERE is_active = true
      GROUP BY name, exam_type, category
      HAVING COUNT(*) > 1
    `);
    console.log('Remaining duplicates:', verify.rows.length);
    
    const totalExamItems = await client.query('SELECT COUNT(*) as total FROM exam_items WHERE is_active = true');
    console.log('Total active exam_items:', totalExamItems.rows[0].total);
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}
fixDuplicates();
