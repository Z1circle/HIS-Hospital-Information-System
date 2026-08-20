-- 创建缴费订单表
CREATE TABLE IF NOT EXISTS payment_orders (
  id SERIAL PRIMARY KEY,
  order_no VARCHAR(50) UNIQUE NOT NULL,
  patient_id INTEGER REFERENCES patients(id),
  patient_name VARCHAR(50),
  doctor_id INTEGER REFERENCES doctors(id),
  doctor_name VARCHAR(50),
  department_id INTEGER REFERENCES departments(id),
  department_name VARCHAR(50),
  order_type VARCHAR(20) NOT NULL, -- 'exam', 'prescription', 'registration'
  source_id INTEGER, -- 关联的原始ID
  items JSONB DEFAULT '[]',
  total_amount DECIMAL(10,2) DEFAULT 0,
  payment_status VARCHAR(20) DEFAULT 'unpaid',
  payment_method VARCHAR(20),
  transaction_no VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);