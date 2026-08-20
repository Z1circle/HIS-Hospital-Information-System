const axios = require('axios');

async function testAPI() {
  try {
    console.log('=== 测试医生端检查结果 API ===\n');
    
    // 获取患者 ID=1 的检查结果
    const response = await axios.get('http://localhost:4000/api/doctor/exam-reports', {
      params: { patient_id: 1 }
    });
    
    console.log(`获取到 ${response.data.length} 条检查报告\n`);
    
    // 找到乙肝五项报告
    const hepatitisB = response.data.find(r => r.exam_name === '乙肝五项');
    
    if (hepatitisB) {
      console.log('=== 乙肝五项报告详情 ===');
      console.log('ID:', hepatitisB.id);
      console.log('患者ID:', hepatitisB.patient_id);
      console.log('检查类型:', hepatitisB.exam_type);
      console.log('状态:', hepatitisB.status);
      console.log('报告日期:', hepatitisB.report_date);
      console.log('结论:', hepatitisB.conclusion);
      console.log('\n原始 result 字段（前200字符）:');
      console.log(hepatitisB.result.substring(0, 200) + '...');
      
      // 解析 result
      try {
        const parsed = JSON.parse(hepatitisB.result);
        console.log('\n✅ Result 解析成功，包含', parsed.length, '个项目:');
        parsed.forEach((item, idx) => {
          console.log(`  ${idx + 1}. ${item.item_name}: ${item.result} [参考: ${item.reference_range}]`);
        });
        
        // 模拟前端解析
        const labItems = parsed.map(item => ({
          item: item.item_name,
          result: item.result,
          unit: item.unit || '',
          reference: item.reference_range || '',
          flag: item.flag || ''
        }));
        
        console.log('\n✅ 前端解析后的 labItems:');
        labItems.forEach((item, idx) => {
          console.log(`  ${idx + 1}. ${item.item} | 结果: ${item.result} | 单位: ${item.unit} | 参考: ${item.reference} | 提示: ${item.flag}`);
        });
        
        const isAbnormal = labItems.some(item => item.flag && item.flag !== '');
        console.log('\n是否异常:', isAbnormal ? '是' : '否');
        
      } catch (e) {
        console.error('\n❌ Result 解析失败:', e.message);
      }
    } else {
      console.log('❌ 未找到乙肝五项报告');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ API 调用失败:', err.message);
    process.exit(1);
  }
}

testAPI();
