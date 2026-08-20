const http = require('http');

function post(url, data) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    };
    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve(body);
        }
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
  });
}

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve(body);
        }
      });
    }).on('error', reject);
  });
}

async function testPrescription() {
  console.log('=== 测试1: 创建处方 ===');
  try {
    const prescData = {
      patient_id: 3,
      doctor_id: 2,
      registration_id: 80,
      type: 'western',
      items: [
        {
          item_name: '阿莫西林胶囊',
          quantity: 2,
          unit: '盒',
          price: 25.00,
          dosage: '口服',
          frequency: '每日3次',
          days: 3
        },
        {
          item_name: '布洛芬缓释胶囊',
          quantity: 1,
          unit: '盒',
          price: 18.00,
          dosage: '口服',
          frequency: '每日2次',
          days: 2
        }
      ]
    };
    
    const res = await post('http://localhost:4000/api/doctor/prescription', prescData);
    console.log('处方创建成功:', JSON.stringify(res).substring(0, 200));
    return res;
  } catch (err) {
    console.error('处方创建失败:', err.message);
    return null;
  }
}

async function testExamRequest() {
  console.log('\n=== 测试2: 创建影像检查申请 ===');
  try {
    const examData = {
      patient_id: 3,
      doctor_id: 2,
      registration_id: 80,
      exam_type: 'radiology',
      exam_name: '胸部CT平扫',
      clinical_diagnosis: '咳嗽待查',
      urgency: 'normal',
      amount: 280.00
    };
    
    const res = await post('http://localhost:4000/api/doctor/exam-request', examData);
    console.log('检查申请创建成功:', JSON.stringify(res).substring(0, 200));
    return res;
  } catch (err) {
    console.error('检查申请创建失败:', err.message);
    return null;
  }
}

async function testPaymentOrders(patientId) {
  console.log('\n=== 测试3: 获取患者缴费订单 ===');
  try {
    const res = await get(`http://localhost:4000/api/payment/orders?patient_id=${patientId}`);
    console.log('缴费订单:', res.length, '条');
    res.forEach(order => {
      console.log(`  type:${order.order_type}, amount:${order.total_amount}, status:${order.payment_status}`);
    });
    return res;
  } catch (err) {
    console.error('获取缴费订单失败:', err.message);
    return [];
  }
}

async function testRadiologyQueue() {
  console.log('\n=== 测试4: 影像科队列 ===');
  try {
    const res = await get('http://localhost:4000/api/radiologist/pending');
    if (Array.isArray(res)) {
      console.log('影像科待检查队列:', res.length, '条');
      res.forEach(item => {
        console.log(`  patient:${item.patient_name}, exam:${item.exam_name}, type:${item.exam_type}, status:${item.status}, payment_status:${item.payment_status}`);
      });
      return res;
    } else {
      console.log('影像科队列返回:', JSON.stringify(res));
      return [];
    }
  } catch (err) {
    console.error('获取影像科队列失败:', err.message);
    return [];
  }
}

async function testPayment(order) {
  if (!order) return;
  console.log(`\n=== 测试5: 缴费 ${order.order_no} ===`);
  try {
    let payUrl = '';
    let payData = {};
    
    if (order.order_type === 'exam') {
      payUrl = 'http://localhost:4000/api/exam-request/pay';
      payData = {
        request_id: order.source_id,
        patient_id: order.patient_id,
        payment_method: 'wechat'
      };
    } else {
      payUrl = 'http://localhost:4000/api/payment/pay';
      payData = {
        presc_id: order.source_id,
        patient_id: order.patient_id,
        payment_method: 'wechat'
      };
    }
    
    const res = await post(payUrl, payData);
    console.log('缴费成功:', JSON.stringify(res));
  } catch (err) {
    console.error('缴费失败:', err.message);
  }
}

async function main() {
  console.log('开始测试 HIS 系统流程...\n');
  
  await testPrescription();
  await testExamRequest();
  
  const orders = await testPaymentOrders(3);
  
  if (orders.length > 0 && orders[0].payment_status === 'unpaid') {
    await testPayment(orders[0]);
  }
  
  await testPaymentOrders(3);
  await testRadiologyQueue();
  
  console.log('\n=== 测试完成 ===');
}

main().catch(console.error);