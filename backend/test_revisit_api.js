const axios = require('axios');

(async () => {
  try {
    console.log('测试 /api/doctor/revisit-patients API...');
    
    // 测试获取复诊患者列表
    const res = await axios.get('http://localhost:4000/api/doctor/revisit-patients', {
      params: { doctor_id: 1 }
    });
    
    console.log('响应状态:', res.status);
    console.log('返回数据:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('错误:', err.message);
    if (err.response) {
      console.error('响应状态:', err.response.status);
      console.error('响应数据:', err.response.data);
    }
  }
})();
