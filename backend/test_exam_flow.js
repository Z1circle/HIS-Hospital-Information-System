const http = require('http');

function post(url, data) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    };
    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve(body); } });
    });
    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
  });
}

function put(url, data) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    };
    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve(body); } });
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
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve(body); } });
    }).on('error', reject);
  });
}

async function main() {
  console.log('=== 验证影像科检查流程 ===\n');
  
  // 获取待检查队列
  const pendingRes = await get('http://localhost:4000/api/radiologist/pending');
  console.log('初始待检查队列:', pendingRes.length, '条');
  
  // 找到一个 status=received 的申请来开始检查
  let receivedRequest = pendingRes.find(r => r.status === 'received');
  if (!receivedRequest) {
    // 如果没有 received 的，找一个 pending 的先接收
    const pendingRequest = pendingRes.find(r => r.status === 'pending');
    if (pendingRequest) {
      console.log(`\n接收申请: ${pendingRequest.patient_name} - ${pendingRequest.exam_name}`);
      await put(`http://localhost:4000/api/radiologist/exam-request/${pendingRequest.id}/receive`, { received_by: 1 });
      receivedRequest = pendingRequest;
    }
  }
  
  if (receivedRequest) {
    console.log(`\n开始检查: ${receivedRequest.patient_name} - ${receivedRequest.exam_name}`);
    const startRes = await put(`http://localhost:4000/api/radiologist/exam-request/${receivedRequest.id}/start`, {});
    console.log('开始检查响应:', startRes.status);
  }
  
  // 再次获取队列
  console.log('\n--- 检查后队列状态 ---');
  
  const pendingRes2 = await get('http://localhost:4000/api/radiologist/pending');
  console.log('待检查队列:', pendingRes2.length, '条');
  
  const processingRes = await get('http://localhost:4000/api/radiologist/processing');
  console.log('检查中队列:', processingRes.length, '条');
  processingRes.forEach(r => console.log(`  - ${r.patient_name}: ${r.exam_name} (status:${r.status})`));
  
  console.log('\n=== 验证完成 ===');
}

main().catch(console.error);