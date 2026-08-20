const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'hisdb',
  password: '1234',
  port: 5432
});

const generateBiography = (name, title, specialty, deptName) => {
  const experienceYears = {
    '主任医师': Math.floor(Math.random() * 15) + 20,
    '副主任医师': Math.floor(Math.random() * 10) + 12,
    '主治医师': Math.floor(Math.random() * 8) + 6,
    '住院医师': Math.floor(Math.random() * 5) + 2,
    '副主任技师': Math.floor(Math.random() * 10) + 10,
    '主管检验师': Math.floor(Math.random() * 8) + 6,
    '检验师': Math.floor(Math.random() * 5) + 2
  };
  
  const years = experienceYears[title] || 10;
  
  const specialtyTemplates = {
    '呼吸内科': `主任医师，从事内科临床工作${years}余年，擅长呼吸系统疾病的诊治，包括慢性阻塞性肺疾病、哮喘、肺炎、肺结核等。在肺部感染性疾病、间质性肺病及危重症患者的救治方面有丰富经验，发表学术论文20余篇。`,
    '心血管内科': `${title}，医学硕士，从事心血管内科工作${years}年，擅长高血压、冠心病、心律失常、心力衰竭等疾病的诊治，在心脏介入治疗方面有较高造诣，注重患者的长期健康管理。`,
    '中医内科': `${title}，中医世家传人，从事中医临床工作${years}年，擅长运用传统中医理论治疗脾胃病、心血管病、糖尿病、风湿病等疑难病症，辨证论治，疗效确切，深受患者信赖。`,
    '针灸推拿': `${title}，针灸推拿专家，擅长运用针刺、艾灸、推拿等中医治疗方法治疗颈椎病、腰椎间盘突出症、肩周炎、面瘫等疾病，手法独特，对疼痛性疾病有较好的治疗效果。`,
    '普外科': `${title}，从事外科临床工作${years}年，擅长普外科常见疾病的手术治疗，包括胆囊切除术、阑尾炎切除术、胃肠手术等，手术技艺精湛，术后恢复快，并发症少。`,
    '骨科': `${title}，骨科专家，擅长关节置换、脊柱外科、创伤骨科等领域，在人工关节置换、颈椎病、腰椎间盘突出症的手术治疗方面有丰富经验，注重术后康复指导。`,
    '妇科': `${title}，妇产科专家，擅长妇科肿瘤、不孕症、妇科炎症等疾病的诊治，在妇科微创手术方面有较高水平，关注女性健康，注重人文关怀。`,
    '小儿呼吸': `${title}，儿科专家，擅长小儿呼吸系统疾病、小儿传染病的诊治，在小儿哮喘、肺炎、支气管炎等疾病的治疗方面有丰富经验，深受患儿家长信赖。`,
    '皮肤病': `${title}，皮肤科专家，擅长各种皮肤病的诊治，包括湿疹、银屑病、痤疮、白癜风等，在皮肤激光治疗、过敏性皮肤病的诊治方面有深入研究。`,
    '白内障': `${title}，眼科专家，擅长白内障超声乳化手术、青光眼手术、眼底病诊治等，在复杂白内障手术方面有较高造诣，已完成数千例白内障手术，术后视力恢复良好。`,
    '耳鼻喉': `${title}，耳鼻喉科专家，从事耳鼻喉科工作${years}年，擅长中耳炎、鼻窦炎、咽喉炎、声带疾病等的诊治，在人工耳蜗植入、鼻腔鼻窦手术方面有丰富经验。`,
    '中医妇科': `${title}，中医妇科专家，擅长中医药治疗妇科疾病，包括月经不调、痛经、不孕症、盆腔炎等，注重辨证论治，疗效显著。`,
    '消化内科': `${title}，毕业于北京医科大学，从事消化内科工作${years}年，擅长慢性胃炎、消化性溃疡、肝硬化、胰腺炎等疾病的诊治，精通胃镜、肠镜检查及内镜下治疗技术。`,
    '内分泌科': `内分泌科专家，${title}，擅长糖尿病、甲状腺疾病、骨质疏松症、肥胖症等内分泌代谢疾病的个体化治疗，注重患者的长期血糖管理和生活方式干预。`,
    '神经内科': `${title}，神经内科专家，擅长脑血管疾病、帕金森病、癫痫、头痛等疾病的诊治，在神经介入治疗、神经康复方面有丰富经验。`,
    '急诊科': `${title}，从事急诊医学工作${years}年，擅长各种急危重症的抢救，包括心肺复苏、休克、急性心肌梗死、脑血管意外等，具备扎实的急救技能和丰富的临床经验。`,
    '医学影像': `${title}，医学影像专家，擅长X线、CT、MRI等影像学诊断，在肺部、腹部、骨骼系统疾病的影像诊断方面有较高水平，注重影像与临床的结合。`,
    '临床检验': `${title}，从事临床检验工作${years}年，擅长临床生化检验、血液检验、微生物检验等，在检验质量控制、实验室管理方面有丰富经验，确保检验结果准确可靠。`,
    '化学检验': `${title}，化学检验专家，擅长临床化学检验项目的检测与分析，在肝功能、肾功能、血糖、血脂等检验项目的质量控制方面有深入研究。`,
    '超声诊断': `${title}，超声诊断专家，擅长腹部超声、心血管超声、妇产科超声等检查，在超声引导下的介入治疗方面有丰富经验，诊断准确率高。`,
    '放射治疗': `${title}，放射治疗专家，擅长肿瘤的放射治疗，包括三维适形放疗、调强放疗等，在肺癌、食管癌、乳腺癌等肿瘤的综合治疗方面有丰富经验。`,
    '重症医学': `${title}，重症医学科主任，从事重症医学工作${years}年，擅长各种危重症患者的监护与救治，包括严重感染、多器官功能衰竭、创伤等，具备扎实的重症医学理论和丰富的临床经验。`,
    '麻醉科': `${title}，麻醉科专家，擅长临床麻醉、疼痛治疗、重症监护等，在心血管手术麻醉、神经外科手术麻醉方面有较高造诣，确保手术患者的安全。`,
    '药学': `${title}，从事临床药学工作${years}年，擅长药物治疗方案的制定和优化，在抗菌药物合理使用、药物不良反应监测方面有丰富经验，重视临床药师与医生的协作，确保患者用药安全有效。`,
    '医学管理': `${title}，医学管理专家，擅长医院药事管理、药品采购与供应、药品质量监督等，在医院药事管理规范化建设方面有丰富经验，确保药房工作高效有序运行。`
  };
  
  const template = specialtyTemplates[specialty] || specialtyTemplates[deptName] ||
    `${title}，从事${deptName || '医疗'}工作${years}年，具有丰富的临床经验，擅长${specialty || '相关疾病'}的诊治，注重患者的诊疗体验和康复效果。`;
  
  return template;
};

(async () => {
  try {
    const doctorsResult = await pool.query('SELECT doc.id, doc.name, doc.title, doc.specialty, doc.biography, d.name as dept_name FROM doctors doc LEFT JOIN departments d ON doc.department_id = d.id');
    const doctors = doctorsResult.rows;
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const doctor of doctors) {
      if (!doctor.biography || doctor.biography.trim().length < 50) {
        const bio = generateBiography(doctor.name, doctor.title, doctor.specialty, doctor.dept_name);
        await pool.query('UPDATE doctors SET biography = $1 WHERE id = $2', [bio, doctor.id]);
        console.log(`已更新医生ID ${doctor.id} - ${doctor.name}: ${bio.slice(0, 30)}...`);
        updatedCount++;
      } else {
        skippedCount++;
      }
    }
    
    await pool.end();
    console.log(`\n完成！共更新 ${updatedCount} 位医生的简介，跳过 ${skippedCount} 位已有完整简介的医生。`);
  } catch (err) {
    console.error('错误:', err.message);
    process.exit(1);
  }
})();