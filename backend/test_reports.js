const http = require('http');

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

async function main() {
  console.log('=== 验证修复效果 ===\n');
  
  console.log('1. 检查患者报告查询 - 检验报告');
  const labRes = await get('http://localhost:4000/api/patient/lab-reports?patient_id=3');
  console.log('   检验科报告:', labRes.length, '条');
  labRes.forEach(r => console.log(`     - ${r.exam_name} (${r.exam_type})`));
  
  console.log('\n2. 检查患者报告查询 - 影像报告');
  const imagingRes = await get('http://localhost:4000/api/patient/exam-reports?patient_id=3');
  console.log('   影像科报告:', imagingRes.length, '条');
  imagingRes.forEach(r => console.log(`     - ${r.exam_name} (${r.exam_type})`));
  
  console.log('\n3. 检查影像科待检查队列');
  const pendingRes = await get('http://localhost:4000/api/radiologist/pending');
  console.log('   待检查队列:', pendingRes.length, '条');
  pendingRes.forEach(r => console.log(`     - ${r.patient_name}: ${r.exam_name} (status:${r.status}, payment:${r.payment_status})`));
  
  console.log('\n4. 检查影像科检查中队列');
  const processingRes = await get('http://localhost:4000/api/radiologist/processing');
  console.log('   检查中队列:', processingRes.length, '条');
  processingRes.forEach(r => console.log(`     - ${r.patient_name}: ${r.exam_name} (status:${r.status})`));
  
  console.log('\n=== 验证完成 ===');
}

main().catch(console.error);