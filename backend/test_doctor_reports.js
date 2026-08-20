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
  console.log('=== 测试医生查看报告接口 ===\n');
  
  const result = await get('http://localhost:4000/api/doctor/exam-reports?patient_id=3');
  console.log('患者3的检查报告:', result.length, '条');
  
  result.forEach(r => {
    console.log(`\n报告ID: ${r.id}`);
    console.log(`  检查项目: ${r.exam_name}`);
    console.log(`  类型: ${r.exam_type}`);
    console.log(`  状态: ${r.status}`);
    console.log(`  报告日期: ${r.report_date}`);
    console.log(`  检查所见: ${r.findings || '无'}`);
    console.log(`  结论: ${r.conclusion || '无'}`);
    console.log(`  结果: ${r.result || '无'}`);
    console.log(`  是否异常: ${r.is_critical ? '是' : '否'}`);
  });
  
  console.log('\n=== 测试完成 ===');
}

main().catch(console.error);