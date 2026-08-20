const axios = require('axios');

async function testDateFilter() {
  try {
    console.log('===========================================');
    console.log('测试检查结果日期筛选功能');
    console.log('===========================================\n');
    
    // 获取患者 ID=1 的检查结果
    const response = await axios.get('http://localhost:4000/api/doctor/exam-reports', {
      params: { patient_id: 1 }
    });
    
    console.log(`✅ 获取到 ${response.data.length} 条检查报告\n`);
    
    // 按日期分组
    const reportsByDate = {};
    response.data.forEach(report => {
      const date = new Date(report.report_date || report.created_at);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      if (!reportsByDate[dateKey]) {
        reportsByDate[dateKey] = [];
      }
      reportsByDate[dateKey].push(report);
    });
    
    console.log(' 按日期分组的检查结果:');
    console.log('-------------------------------------------');
    
    const sortedDates = Object.keys(reportsByDate).sort().reverse();
    
    sortedDates.forEach((date, idx) => {
      const reports = reportsByDate[date];
      console.log(`\n${idx === 0 ? '⭐' : '  '} ${date} (${reports.length} 项检查)`);
      reports.forEach(r => {
        console.log(`   - ${r.exam_name} [${r.exam_type === 'lab' ? '检验科' : '放射科'}]`);
      });
    });
    
    console.log('\n===========================================');
    console.log('前端显示逻辑说明:');
    console.log('===========================================');
    console.log('1. 默认显示: 最新日期的所有检查报告');
    console.log(`   → 当前显示: ${sortedDates[0]} 的 ${reportsByDate[sortedDates[0]].length} 项检查`);
    console.log('\n2. 日期筛选: 用户可以选择特定日期查看');
    console.log('   → 选择后只显示该日期的检查报告');
    console.log('\n3. 查看全部: 点击"查看全部"按钮清除筛选');
    console.log('   → 显示所有日期的检查报告');
    console.log('\n4. 排序规则: 按报告日期降序排列（最新的在前）');
    console.log('===========================================\n');
    
    process.exit(0);
  } catch (err) {
    console.error('\n❌ 测试失败:', err.message);
    process.exit(1);
  }
}

testDateFilter();
