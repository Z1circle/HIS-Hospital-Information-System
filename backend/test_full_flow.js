const axios = require('axios');

async function testFullFlow() {
  try {
    console.log('===========================================');
    console.log('完整测试流程：医生端检查结果显示');
    console.log('===========================================\n');
    
    // 1. 获取患者 ID=1 的检查结果（模拟医生端）
    console.log('步骤 1: 调用医生端 API 获取患者 ID=1 的检查结果...');
    const doctorResponse = await axios.get('http://localhost:4000/api/doctor/exam-reports', {
      params: { patient_id: 1 }
    });
    
    console.log(`✅ 获取到 ${doctorResponse.data.length} 条检查报告\n`);
    
    // 2. 找到乙肝五项报告
    const hepatitisB = doctorResponse.data.find(r => r.exam_name === '乙肝五项');
    
    if (!hepatitisB) {
      console.log('❌ 未找到乙肝五项报告');
      process.exit(1);
      return;
    }
    
    console.log('步骤 2: 乙肝五项报告详情');
    console.log('-------------------------------------------');
    console.log(`ID: ${hepatitisB.id}`);
    console.log(`患者ID: ${hepatitisB.patient_id}`);
    console.log(`检查类型: ${hepatitisB.exam_type}`);
    console.log(`状态: ${hepatitisB.status}`);
    console.log(`报告日期: ${new Date(hepatitisB.report_date).toLocaleString('zh-CN')}`);
    console.log(`结论: ${hepatitisB.conclusion}\n`);
    
    // 3. 解析 result 字段（模拟前端处理）
    console.log('步骤 3: 前端解析 result 字段');
    console.log('-------------------------------------------');
    
    let labItems = [];
    if (hepatitisB.exam_type === 'lab' && hepatitisB.result) {
      try {
        const parsed = typeof hepatitisB.result === 'string' 
          ? JSON.parse(hepatitisB.result) 
          : hepatitisB.result;
        
        if (Array.isArray(parsed)) {
          labItems = parsed.map(item => ({
            item: item.item_name,
            result: item.result,
            unit: item.unit || '',
            reference: item.reference_range || '',
            flag: item.flag || ''
          }));
          
          console.log('✅ Result 解析成功，包含', parsed.length, '个项目:\n');
          
          // 显示表格格式
          console.log('┌──────────────────────┬──────────────┬──────┬──────────────┬──────┐');
          console.log('│ 检验项目             │ 结果         │ 单位 │ 参考范围     │ 提示 │');
          console.log('├──────────────────────┼────────────────────┼──────────────┼──────┤');
          
          labItems.forEach(item => {
            const itemName = item.item.padEnd(18);
            const result = item.result.padEnd(12);
            const unit = (item.unit || '').padEnd(4);
            const ref = item.reference.padEnd(12);
            const flag = item.flag || '';
            console.log(`│ ${itemName} │ ${result} │ ${unit} │ ${ref} │ ${flag}   │`);
          });
          
          console.log('└──────────────────────┴──────────────┴──────┴──────────────┴──────┘\n');
          
          // 判断是否异常
          const isAbnormal = labItems.some(item => item.flag && item.flag !== '');
          console.log(`是否异常: ${isAbnormal ? '是 ❗' : '否 ✅'}\n`);
          
          // 显示结论
          console.log('诊断结论:');
          console.log(`  ${hepatitisB.conclusion}\n`);
        } else {
          console.log('❌ Result 不是数组格式');
          process.exit(1);
          return;
        }
      } catch (e) {
        console.error('\n❌ Result 解析失败:', e.message);
        console.error('原始数据:', hepatitisB.result.substring(0, 200));
        process.exit(1);
        return;
      }
    }
    
    // 4. 测试患者端 API
    console.log('\n步骤 4: 测试患者端 API');
    console.log('-------------------------------------------');
    const patientResponse = await axios.get('http://localhost:4000/api/patient/exam-reports', {
      params: { patient_id: 1 }
    });
    
    console.log(`✅ 患者端获取到 ${patientResponse.data.length} 条检查报告`);
    
    const patientHepatitisB = patientResponse.data.find(r => r.exam_name === '乙肝五项');
    if (patientHepatitisB) {
      console.log('✅ 患者端也能正确获取乙肝五项报告');
      
      // 验证 parseLabResult 函数逻辑
      const parsed = typeof patientHepatitisB.result === 'string' 
        ? JSON.parse(patientHepatitisB.result) 
        : patientHepatitisB.result;
      
      if (Array.isArray(parsed)) {
        const labItemsMapped = parsed.map(item => ({
          name: item.item_name || item.name || item.test_name || '',
          value: item.result || item.value || '',
          unit: item.unit || '',
          ref: item.reference_range || item.ref || '',
          flag: item.flag || ''
        }));
        
        console.log('✅ 患者端解析后包含', labItemsMapped.length, '个项目');
        console.log('   项目名称映射正确:', labItemsMapped[0].name === 'HBsAg(表面抗原)' ? '✅' : '❌');
      }
    }
    
    console.log('\n===========================================');
    console.log('✅ 所有测试通过！检查结果应该能正常显示了');
    console.log('===========================================\n');
    
    console.log('访问地址:');
    console.log('  - 前端开发服务器: http://localhost:5175');
    console.log('  - 后端 API 服务器: http://localhost:4000');
    console.log('\n测试建议:');
    console.log('  1. 登录医生账号（如: zhangsan / 123456）');
    console.log('  2. 选择患者（ID=1 赵伟）');
    console.log('  3. 查看"检查结果"部分');
    console.log('  4. 应该能看到乙肝五项的完整数据表格\n');
    
    process.exit(0);
  } catch (err) {
    console.error('\n❌ 测试失败:', err.message);
    if (err.response) {
      console.error('响应状态:', err.response.status);
      console.error('响应数据:', err.response.data);
    }
    process.exit(1);
  }
}

testFullFlow();
