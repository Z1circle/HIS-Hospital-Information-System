// 处理超时未支付的缴费订单
const { Pool } = require('pg');

// 从环境变量获取数据库连接信息（与主服务器相同的配置）
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'hisdb',
  password: process.env.DB_PASSWORD || '1234',
  port: parseInt(process.env.DB_PORT) || 5432,
  max: parseInt(process.env.DB_MAX_CONNECTIONS) || 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

// 取消超时未支付的订单
async function cancelTimeoutPayments() {
  console.log(`[${new Date().toISOString()}] 开始处理超时未支付订单...`);

  try {
    // 查找超过5小时未支付的订单
    const timeoutHours = 5;
    const result = await pool.query(`
      SELECT id, order_no, patient_id, patient_name, total_amount, order_type, source_id
      FROM payment_orders
      WHERE payment_status = 'unpaid' 
        AND created_at < NOW() - INTERVAL '${timeoutHours} hours'
    `);

    if (result.rows.length === 0) {
      console.log(`没有找到超时未支付的订单`);
      return;
    }

    console.log(`找到 ${result.rows.length} 个超时未支付的订单`);

    for (const row of result.rows) {
      // 开启事务处理
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // 更新订单状态为已取消
        await client.query(`
          UPDATE payment_orders 
          SET payment_status = 'cancelled', 
              updated_at = CURRENT_TIMESTAMP 
          WHERE id = $1
        `, [row.id]);

        // 根据订单类型更新相关表的状态
        if (row.order_type === 'exam') {
          // 如果是检验检查订单，更新exam_requests表状态
          await client.query(`
            UPDATE exam_requests 
            SET status = 'cancelled' 
            WHERE id = $1
          `, [row.source_id]);
        } else if (row.order_type === 'prescription') {
          // 如果是处方订单，更新invoices表状态
          await client.query(`
            UPDATE invoices 
            SET payment_status = 'cancelled' 
            WHERE presc_id = $1
          `, [row.source_id]);
        }

        await client.query('COMMIT');
        console.log(`订单 ${row.order_no} 已成功取消`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`取消订单 ${row.order_no} 时发生错误:`, error.message);
      } finally {
        client.release();
      }
    }

    console.log(`[${new Date().toISOString()}] 超时订单处理完成`);
  } catch (error) {
    console.error(`处理超时订单时发生错误:`, error.message);
  }
}

module.exports = { cancelTimeoutPayments };