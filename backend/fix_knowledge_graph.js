const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', password: '1234', host: 'localhost', port: 5432, database: 'hisdb' });

async function exec(sql, params = []) {
  try { return await pool.query(sql, params); } catch(e) { console.error('SQL Error:', e.message); return null; }
}

async function fixKnowledgeGraph() {
  console.log('=== FIXING KNOWLEDGE GRAPH ===\n');
  
  console.log('Step 1: Delete invalid knowledge graph relations...');
  const del = await exec('DELETE FROM knowledge_graph');
  console.log(`  Deleted ${del ? del.rowCount : 0} relations`);
  
  console.log('\nStep 2: Getting valid hot keywords...');
  const diseases = await exec("SELECT id, keyword FROM hot_keywords WHERE node_type = 'disease' ORDER BY id");
  const symptoms = await exec("SELECT id, keyword FROM hot_keywords WHERE node_type = 'symptom' ORDER BY id");
  const drugs = await exec("SELECT id, keyword FROM hot_keywords WHERE node_type = 'drug' ORDER BY id");
  const tests = await exec("SELECT id, keyword FROM hot_keywords WHERE node_type = 'test' ORDER BY id");
  
  console.log(`  Diseases: ${diseases.rows.length}`);
  console.log(`  Symptoms: ${symptoms.rows.length}`);
  console.log(`  Drugs: ${drugs.rows.length}`);
  console.log(`  Tests: ${tests.rows.length}`);
  
  const diseaseList = diseases.rows;
  const symptomList = symptoms.rows;
  const drugList = drugs.rows;
  const testList = tests.rows;
  
  console.log('\nStep 3: Creating knowledge graph relations...');
  let created = 0;
  
  const diseaseSymptomsMap = {
    1: [0, 1, 2, 3],
    2: [0, 2, 4, 5],
    3: [6, 7, 8],
    4: [9, 10, 11],
    5: [12, 13, 14],
    6: [15, 16],
    7: [17, 18],
    8: [19, 20],
  };
  
  for (const [diseaseIdx, symptomIndices] of Object.entries(diseaseSymptomsMap)) {
    const dIdx = parseInt(diseaseIdx);
    if (dIdx >= diseaseList.length) continue;
    const diseaseId = diseaseList[dIdx].id;
    
    for (const sIdx of symptomIndices) {
      if (sIdx >= symptomList.length) continue;
      const symptomId = symptomList[sIdx].id;
      
      await exec(
        `INSERT INTO knowledge_graph (source_type, source_id, target_type, target_id, relation_type, weight, is_active)
         VALUES ('disease', $1, 'symptom', $2, 'has_symptom', $3, true)`,
        [diseaseId, symptomId, (0.8 + Math.random() * 0.4).toFixed(2)]
      );
      created++;
    }
  }
  
  const diseaseDrugsMap = {
    1: [0, 1],
    2: [2, 3],
    3: [4, 5],
    4: [6, 7],
    5: [8, 9],
    6: [10, 11],
    7: [12, 13],
    8: [14, 15],
  };
  
  for (const [diseaseIdx, drugIndices] of Object.entries(diseaseDrugsMap)) {
    const dIdx = parseInt(diseaseIdx);
    if (dIdx >= diseaseList.length) continue;
    const diseaseId = diseaseList[dIdx].id;
    
    for (const drIdx of drugIndices) {
      if (drIdx >= drugList.length) continue;
      const drugId = drugList[drIdx].id;
      
      await exec(
        `INSERT INTO knowledge_graph (source_type, source_id, target_type, target_id, relation_type, weight, is_active)
         VALUES ('disease', $1, 'drug', $2, 'has_drug', $3, true)`,
        [diseaseId, drugId, (0.9 + Math.random() * 0.3).toFixed(2)]
      );
      created++;
    }
  }
  
  const diseaseTestsMap = {
    1: [0, 1],
    2: [2, 3],
    3: [4, 5],
    4: [6, 7],
    5: [0, 2],
    6: [1, 3],
    7: [4, 6],
    8: [5, 7],
  };
  
  for (const [diseaseIdx, testIndices] of Object.entries(diseaseTestsMap)) {
    const dIdx = parseInt(diseaseIdx);
    if (dIdx >= diseaseList.length) continue;
    const diseaseId = diseaseList[dIdx].id;
    
    for (const tIdx of testIndices) {
      if (tIdx >= testList.length) continue;
      const testId = testList[tIdx].id;
      
      await exec(
        `INSERT INTO knowledge_graph (source_type, source_id, target_type, target_id, relation_type, weight, is_active)
         VALUES ('disease', $1, 'test', $2, 'test_for', $3, true)`,
        [diseaseId, testId, (0.85 + Math.random() * 0.35).toFixed(2)]
      );
      created++;
    }
  }
  
  for (let i = 0; i < diseaseList.length - 1; i++) {
    for (let j = i + 1; j < Math.min(i + 3, diseaseList.length); j++) {
      await exec(
        `INSERT INTO knowledge_graph (source_type, source_id, target_type, target_id, relation_type, weight, is_active)
         VALUES ('disease', $1, 'disease', $2, 'related_to', $3, true)`,
        [diseaseList[i].id, diseaseList[j].id, (0.5 + Math.random() * 0.3).toFixed(2)]
      );
      created++;
    }
  }
  
  console.log(`\nCreated ${created} knowledge graph relations`);
  
  const verify = await exec('SELECT COUNT(*) as cnt FROM knowledge_graph');
  console.log(`\n=== VERIFICATION ===`);
  console.log(`Knowledge graph relations: ${verify.rows[0].cnt}`);
  
  const sample = await exec('SELECT * FROM knowledge_graph LIMIT 5');
  console.log('Sample relations:');
  sample.rows.forEach(r => {
    console.log(`  ${r.id}: ${r.source_type}(${r.source_id}) -> ${r.relation_type} -> ${r.target_type}(${r.target_id})`);
  });
  
  await pool.end();
}

fixKnowledgeGraph().catch(e => { console.error('FAILED:', e.message); pool.end(); });