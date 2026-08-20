<template>
  <div class="diagnosis-dict-page">
    <div class="page-actions">
      <div class="search-bar">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索诊断名称/ICD编码..."
          prefix-icon="Search"
          clearable
          style="width: 300px"
          @input="handleSearch"
        />
        <el-select v-model="filterType" placeholder="诊断类型" clearable style="width: 150px; margin-left: 12px">
          <el-option label="西医诊断" value="western" />
          <el-option label="中医诊断" value="chinese" />
        </el-select>
      </div>
      <div class="action-buttons">
        <el-button icon="Download" @click="downloadTemplate">下载模板</el-button>
        <el-button icon="Upload" type="primary" @click="handleImport">批量导入</el-button>
        <el-button icon="Plus" type="primary" @click="handleAdd">新增诊断</el-button>
      </div>
    </div>

    <div class="diagnosis-table glass-card">
      <el-table :data="filteredDiagnosis" stripe style="width: 100%">
        <el-table-column prop="icd_code" label="ICD编码" width="120" />
        <el-table-column prop="name" label="诊断名称" min-width="200" />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="row.type === 'western' ? 'primary' : 'success'" size="small">
              {{ row.type === 'western' ? '西医' : '中医' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="category" label="分类" width="150" />
        <el-table-column prop="description" label="描述" min-width="250" show-overflow-tooltip />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link icon="Edit" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button size="small" type="danger" link icon="Delete" @click="handleDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑诊断' : '新增诊断'"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form :model="diagnosisForm" :rules="diagnosisRules" ref="diagnosisFormRef" label-width="100px">
        <el-form-item label="ICD编码" prop="icd_code">
          <el-input v-model="diagnosisForm.icd_code" placeholder="请输入ICD编码" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="诊断名称" prop="name">
          <el-input v-model="diagnosisForm.name" placeholder="请输入诊断名称" />
        </el-form-item>
        <el-form-item label="诊断类型" prop="type">
          <el-radio-group v-model="diagnosisForm.type">
            <el-radio value="western">西医诊断</el-radio>
            <el-radio value="chinese">中医诊断</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-select v-model="diagnosisForm.category" placeholder="请选择分类" style="width: 100%">
            <el-option label="呼吸系统" value="呼吸系统" />
            <el-option label="消化系统" value="消化系统" />
            <el-option label="循环系统" value="循环系统" />
            <el-option label="神经系统" value="神经系统" />
            <el-option label="内分泌系统" value="内分泌系统" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="diagnosisForm.description"
            type="textarea"
            :rows="4"
            placeholder="请输入诊断描述"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveDiagnosis">保存</el-button>
      </template>
    </el-dialog>

    <!-- 批量导入弹窗 -->
    <el-dialog v-model="importDialogVisible" title="批量导入诊断" width="500px">
      <el-upload
        drag
        action="/api/admin/diagnosis/import"
        accept=".xlsx,.xls"
        :on-success="handleImportSuccess"
        :on-error="handleImportError"
      >
        <el-icon :size="50" color="#409EFF"><UploadFilled /></el-icon>
        <div style="margin-top: 16px">将文件拖到此处，或点击上传</div>
        <div style="margin-top: 8px; font-size: 12px; color: #999">支持 .xlsx、.xls 格式</div>
      </el-upload>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'

const searchKeyword = ref('')
const filterType = ref('')
const dialogVisible = ref(false)
const importDialogVisible = ref(false)
const isEdit = ref(false)
const diagnosisFormRef = ref()

const diagnosisList = ref([
  { id: 1, icd_code: 'J00', name: '急性鼻咽炎', type: 'western', category: '呼吸系统', description: '鼻咽部急性炎症' },
  { id: 2, name: '感冒', type: 'chinese', category: '呼吸系统', description: '风寒感冒' },
  { id: 3, icd_code: 'I10', name: '原发性高血压', type: 'western', category: '循环系统', description: '血压持续升高' },
  { id: 4, icd_code: 'K21.9', name: '胃食管反流病', type: 'western', category: '消化系统', description: '胃内容物反流至食管' },
  { id: 5, icd_code: 'J20.9', name: '急性支气管炎', type: 'western', category: '呼吸系统', description: '支气管急性炎症反应' },
  { id: 6, icd_code: 'E11.9', name: '2型糖尿病', type: 'western', category: '内分泌系统', description: '非胰岛素依赖型糖尿病' },
  { id: 7, icd_code: 'I25.1', name: '冠状动脉粥样硬化性心脏病', type: 'western', category: '循环系统', description: '冠心病稳定型心绞痛' },
  { id: 8, icd_code: 'M17.9', name: '膝关节骨性关节炎', type: 'western', category: '骨骼肌肉系统', description: '膝关节退行性变' },
  { id: 9, icd_code: 'K29.7', name: '慢性胃炎', type: 'western', category: '消化系统', description: '胃粘膜慢性炎症' },
  { id: 10, icd_code: 'N20.0', name: '肾结石', type: 'western', category: '泌尿系统', description: '肾盂内结石形成' },
  { id: 11, icd_code: 'J45.9', name: '支气管哮喘', type: 'western', category: '呼吸系统', description: '气道慢性炎症性疾病' },
  { id: 12, icd_code: 'I63.9', name: '脑梗死', type: 'western', category: '神经系统', description: '缺血性脑卒中' },
  { id: 13, icd_code: 'E78.5', name: '高脂血症', type: 'western', category: '内分泌系统', description: '血脂代谢异常' },
  { id: 14, icd_code: 'M54.5', name: '腰椎间盘突出症', type: 'western', category: '骨骼肌肉系统', description: '腰椎间盘髓核突出' },
  { id: 15, icd_code: 'K80.2', name: '胆囊结石', type: 'western', category: '消化系统', description: '胆囊内结石形成' },
  { id: 16, icd_code: 'N39.0', name: '泌尿道感染', type: 'western', category: '泌尿系统', description: '细菌性泌尿道感染' },
  { id: 17, icd_code: 'L20.9', name: '湿疹', type: 'western', category: '皮肤系统', description: '过敏性皮肤炎症' },
  { id: 18, icd_code: 'H25.9', name: '老年性白内障', type: 'western', category: '眼科', description: '晶状体混浊' },
  { id: 19, name: '肝肾阴虚', type: 'chinese', category: '中医内科', description: '肝肾阴液亏损，虚火上炎' },
  { id: 20, name: '脾胃虚弱', type: 'chinese', category: '中医内科', description: '脾胃运化功能减弱' },
  { id: 21, icd_code: 'J15.9', name: '细菌性肺炎', type: 'western', category: '呼吸系统', description: '肺部细菌感染' },
  { id: 22, icd_code: 'I48.9', name: '心房颤动', type: 'western', category: '循环系统', description: '心律失常性房颤' },
  { id: 23, icd_code: 'K25.9', name: '胃溃疡', type: 'western', category: '消化系统', description: '胃粘膜溃烂性病变' },
  { id: 24, icd_code: 'E03.9', name: '甲状腺功能减退症', type: 'western', category: '内分泌系统', description: '甲状腺激素分泌不足' },
  { id: 25, icd_code: 'M06.9', name: '类风湿关节炎', type: 'western', category: '骨骼肌肉系统', description: '自身免疫性关节炎症' },
  { id: 26, icd_code: 'J30.4', name: '过敏性鼻炎', type: 'western', category: '耳鼻喉科', description: '鼻腔过敏反应' },
  { id: 27, icd_code: 'K59.0', name: '便秘', type: 'western', category: '消化系统', description: '排便功能障碍' },
  { id: 28, icd_code: 'G47.0', name: '失眠症', type: 'western', category: '神经系统', description: '睡眠障碍' },
  { id: 29, icd_code: 'R51', name: '头痛', type: 'western', category: '神经系统', description: '头部疼痛不适' },
  { id: 30, icd_code: 'M79.1', name: '肌筋膜炎', type: 'western', category: '骨骼肌肉系统', description: '肌肉筋膜慢性劳损' },
  { id: 31, icd_code: 'I11.9', name: '高血压性心脏病', type: 'western', category: '循环系统', description: '高血压导致的心脏病变' },
  { id: 32, icd_code: 'J44.9', name: '慢性阻塞性肺疾病', type: 'western', category: '呼吸系统', description: 'COPD慢性气道阻塞' },
  { id: 33, icd_code: 'K76.0', name: '脂肪肝', type: 'western', category: '消化系统', description: '肝细胞内脂肪堆积' },
  { id: 34, icd_code: 'N40', name: '前列腺增生', type: 'western', category: '泌尿系统', description: '良性前列腺增生' },
  { id: 35, icd_code: 'E05.9', name: '甲状腺功能亢进', type: 'western', category: '内分泌系统', description: '甲亢、代谢亢进' },
  { id: 36, name: '气血两虚', type: 'chinese', category: '中医内科', description: '气虚与血虚并见' },
  { id: 37, name: '肝郁气滞', type: 'chinese', category: '中医内科', description: '肝气郁结、气机不畅' },
  { id: 38, icd_code: 'H40.1', name: '原发性开角型青光眼', type: 'western', category: '眼科', description: '眼压升高致视神经损伤' },
  { id: 39, icd_code: 'H66.9', name: '中耳炎', type: 'western', category: '耳鼻喉科', description: '中耳腔炎症' },
  { id: 40, icd_code: 'L50.0', name: '荨麻疹', type: 'western', category: '皮肤系统', description: '过敏性皮疹' },
  { id: 41, icd_code: 'G44.1', name: '偏头痛', type: 'western', category: '神经系统', description: '血管神经性头痛' },
  { id: 42, icd_code: 'K52.9', name: '急性胃肠炎', type: 'western', category: '消化系统', description: '胃肠道急性炎症' },
  { id: 43, icd_code: 'J06.9', name: '急性上呼吸道感染', type: 'western', category: '呼吸系统', description: '上呼吸道病毒感染' },
  { id: 44, icd_code: 'N30.9', name: '膀胱炎', type: 'western', category: '泌尿系统', description: '膀胱粘膜炎症' },
  { id: 45, icd_code: 'I20.9', name: '心绞痛', type: 'western', category: '循环系统', description: '冠状动脉供血不足' },
  { id: 46, icd_code: 'M81.9', name: '骨质疏松症', type: 'western', category: '骨骼肌肉系统', description: '骨密度降低' },
  { id: 47, name: '痰湿内阻', type: 'chinese', category: '中医内科', description: '水湿痰饮停滞体内' },
  { id: 48, icd_code: 'D50.9', name: '缺铁性贫血', type: 'western', category: '血液系统', description: '铁缺乏导致贫血' },
  { id: 49, icd_code: 'F41.9', name: '焦虑障碍', type: 'western', category: '精神心理', description: '广泛性焦虑症' },
  { id: 50, icd_code: 'F32.9', name: '抑郁症', type: 'western', category: '精神心理', description: '抑郁发作' },
  { id: 51, icd_code: 'I50.9', name: '心力衰竭', type: 'western', category: '循环系统', description: '心功能不全综合征' },
  { id: 52, icd_code: 'J18.9', name: '社区获得性肺炎', type: 'western', category: '呼吸系统', description: '院外感染性肺炎' },
  { id: 53, icd_code: 'K81.9', name: '胆囊炎', type: 'western', category: '消化系统', description: '胆囊炎症' },
  { id: 54, icd_code: 'N18.9', name: '慢性肾脏病', type: 'western', category: '泌尿系统', description: '肾功能进行性下降' },
  { id: 55, icd_code: 'C34.9', name: '肺癌', type: 'western', category: '肿瘤科', description: '原发性支气管肺癌' },
  { id: 56, icd_code: 'C50.9', name: '乳腺癌', type: 'western', category: '肿瘤科', description: '乳腺恶性肿瘤' },
  { id: 57, icd_code: 'C16.9', name: '胃癌', type: 'western', category: '肿瘤科', description: '胃部恶性肿瘤' },
  { id: 58, icd_code: 'C18.9', name: '结肠癌', type: 'western', category: '肿瘤科', description: '结肠恶性肿瘤' },
  { id: 59, icd_code: 'C22.0', name: '肝细胞癌', type: 'western', category: '肿瘤科', description: '原发性肝癌' },
  { id: 60, icd_code: 'G40.9', name: '癫痫', type: 'western', category: '神经系统', description: '脑神经元异常放电' },
  { id: 61, icd_code: 'G20', name: '帕金森病', type: 'western', category: '神经系统', description: '神经退行性疾病' },
  { id: 62, icd_code: 'G30.9', name: '阿尔茨海默病', type: 'western', category: '神经系统', description: '老年性痴呆' },
  { id: 63, icd_code: 'M16.9', name: '髋关节骨性关节炎', type: 'western', category: '骨骼肌肉系统', description: '髋关节退行性病变' },
  { id: 64, icd_code: 'M51.1', name: '腰椎间盘突出伴神经根病', type: 'western', category: '骨骼肌肉系统', description: '坐骨神经痛' },
  { id: 65, icd_code: 'S72.0', name: '股骨颈骨折', type: 'western', category: '骨骼肌肉系统', description: '髋部骨折' },
  { id: 66, icd_code: 'S52.5', name: '桡骨远端骨折', type: 'western', category: '骨骼肌肉系统', description: 'Colles骨折' },
  { id: 67, icd_code: 'T81.4', name: '术后伤口感染', type: 'western', category: '外科', description: '手术后切口感染' },
  { id: 68, icd_code: 'I26.9', name: '肺栓塞', type: 'western', category: '循环系统', description: '肺动脉栓塞' },
  { id: 69, icd_code: 'I61.9', name: '脑出血', type: 'western', category: '神经系统', description: '颅内出血性脑卒中' },
  { id: 70, icd_code: 'K85.9', name: '急性胰腺炎', type: 'western', category: '消化系统', description: '胰腺急性炎症' },
  { id: 71, icd_code: 'K74.6', name: '肝硬化', type: 'western', category: '消化系统', description: '肝脏纤维化病变' },
  { id: 72, name: '湿热内蕴', type: 'chinese', category: '中医内科', description: '湿热邪气蕴结体内' },
  { id: 73, name: '血瘀证', type: 'chinese', category: '中医内科', description: '瘀血内停、阻滞脉络' },
  { id: 74, icd_code: 'O80.9', name: '正常分娩', type: 'western', category: '妇产科', description: '足月顺产' },
  { id: 75, icd_code: 'O26.9', name: '妊娠期高血压', type: 'western', category: '妇产科', description: '妊娠相关高血压' },
  { id: 76, icd_code: 'D25.9', name: '子宫肌瘤', type: 'western', category: '妇产科', description: '子宫平滑肌瘤' },
  { id: 77, icd_code: 'N92.0', name: '月经过多', type: 'western', category: '妇产科', description: '月经量异常增多' },
  { id: 78, icd_code: 'P07.3', name: '早产儿', type: 'western', category: '儿科', description: '胎龄小于37周新生儿' },
  { id: 79, icd_code: 'A09.9', name: '急性胃肠炎（婴幼儿）', type: 'western', category: '儿科', description: '婴幼儿腹泻' },
  { id: 80, icd_code: 'J03.9', name: '急性扁桃体炎', type: 'western', category: '耳鼻喉科', description: '扁桃体急性炎症' },
  { id: 81, icd_code: 'J32.9', name: '慢性鼻窦炎', type: 'western', category: '耳鼻喉科', description: '鼻窦慢性炎症' },
  { id: 82, icd_code: 'H10.9', name: '结膜炎', type: 'western', category: '眼科', description: '结膜炎症' },
  { id: 83, icd_code: 'H52.1', name: '近视', type: 'western', category: '眼科', description: '屈光不正' },
  { id: 84, icd_code: 'L30.9', name: '皮炎', type: 'western', category: '皮肤系统', description: '皮肤炎症' },
  { id: 85, icd_code: 'L40.9', name: '银屑病', type: 'western', category: '皮肤系统', description: '慢性炎症性皮肤病' },
  { id: 86, icd_code: 'B02.9', name: '带状疱疹', type: 'western', category: '皮肤系统', description: '水痘-带状疱疹病毒感染' },
  { id: 87, icd_code: 'K04.0', name: '牙髓炎', type: 'western', category: '口腔科', description: '牙髓组织炎症' },
  { id: 88, icd_code: 'K05.3', name: '慢性牙周炎', type: 'western', category: '口腔科', description: '牙周组织慢性炎症' },
  { id: 89, icd_code: 'E66.9', name: '肥胖症', type: 'western', category: '内分泌系统', description: '体脂异常蓄积' },
  { id: 90, icd_code: 'M10.0', name: '痛风', type: 'western', category: '风湿免疫', description: '高尿酸血症及痛风性关节炎' },
  { id: 91, icd_code: 'M32.9', name: '系统性红斑狼疮', type: 'western', category: '风湿免疫', description: 'SLE自身免疫病' },
  { id: 92, icd_code: 'M45.9', name: '强直性脊柱炎', type: 'western', category: '风湿免疫', description: '中轴关节慢性炎症' },
  { id: 93, icd_code: 'I83.9', name: '下肢静脉曲张', type: 'western', category: '外科', description: '下肢浅静脉扩张' },
  { id: 94, icd_code: 'K40.9', name: '腹股沟疝', type: 'western', category: '外科', description: '腹股沟区疝囊突出' },
  { id: 95, icd_code: 'R10.4', name: '腹痛', type: 'western', category: '消化系统', description: '腹部疼痛不适' },
  { id: 96, icd_code: 'R42', name: '眩晕', type: 'western', category: '神经系统', description: '头晕目眩' },
  { id: 97, icd_code: 'R05', name: '咳嗽', type: 'western', category: '呼吸系统', description: '呼吸道刺激症状' },
  { id: 98, icd_code: 'R50.9', name: '发热', type: 'western', category: '其他', description: '体温异常升高' },
  { id: 99, icd_code: 'I27.0', name: '原发性肺动脉高压', type: 'western', category: '循环系统', description: '肺动脉压力增高' },
  { id: 100, icd_code: 'B37.0', name: '口腔念珠菌病', type: 'western', category: '口腔科', description: '鹅口疮真菌感染' },
  { id: 101, name: '心脾两虚', type: 'chinese', category: '中医内科', description: '心脾气血亏虚' },
  { id: 102, name: '阴虚火旺', type: 'chinese', category: '中医内科', description: '阴液不足、虚火上炎' },
  { id: 103, name: '风寒束表', type: 'chinese', category: '中医内科', description: '风寒外邪侵袭体表' },
  { id: 104, name: '肾阳虚衰', type: 'chinese', category: '中医内科', description: '肾阳不足、温煦失职' },
  { id: 105, name: '肺脾气虚', type: 'chinese', category: '中医内科', description: '肺脾气虚、卫表不固' },
  { id: 106, icd_code: 'I42.0', name: '扩张型心肌病', type: 'western', category: '循环系统', description: '心肌扩张、心功能减退' },
  { id: 107, icd_code: 'G51.0', name: '面神经麻痹', type: 'western', category: '神经系统', description: '周围性面瘫' },
  { id: 108, icd_code: 'M75.0', name: '肩关节周围炎', type: 'western', category: '骨骼肌肉系统', description: '冻结肩' },
  { id: 109, icd_code: 'D63.8', name: '糖尿病肾病', type: 'western', category: '内分泌系统', description: '糖尿病并发肾病' },
  { id: 110, icd_code: 'H35.3', name: '糖尿病性视网膜病变', type: 'western', category: '眼科', description: '糖尿病眼底并发症' },
])

const diagnosisForm = ref({
  id: 0,
  icd_code: '',
  name: '',
  type: 'western',
  category: '',
  description: ''
})

const diagnosisRules = {
  name: [{ required: true, message: '请输入诊断名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择诊断类型', trigger: 'change' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }]
}

const filteredDiagnosis = computed(() => {
  return diagnosisList.value.filter(item => {
    const matchKeyword = !searchKeyword.value ||
      item.name.includes(searchKeyword.value) ||
      item.icd_code?.includes(searchKeyword.value)
    const matchType = !filterType.value || item.type === filterType.value
    return matchKeyword && matchType
  })
})

const handleSearch = () => {}

const handleAdd = () => {
  isEdit.value = false
  diagnosisForm.value = {
    id: 0,
    icd_code: '',
    name: '',
    type: 'western',
    category: '',
    description: ''
  }
  dialogVisible.value = true
}

const handleEdit = (item: any) => {
  isEdit.value = true
  diagnosisForm.value = { ...item }
  dialogVisible.value = true
}

const handleDelete = (item: any) => {
  ElMessageBox.confirm(`确定要删除诊断"${item.name}"吗？`, '确认删除', {
    type: 'warning'
  }).then(() => {
    diagnosisList.value = diagnosisList.value.filter(d => d.id !== item.id)
    ElMessage.success('删除成功')
  })
}

const saveDiagnosis = () => {
  diagnosisFormRef.value?.validate((valid: boolean) => {
    if (valid) {
      if (isEdit.value) {
        const index = diagnosisList.value.findIndex(d => d.id === diagnosisForm.value.id)
        if (index !== -1) {
          diagnosisList.value[index] = { ...diagnosisForm.value }
        }
        ElMessage.success('修改成功')
      } else {
        diagnosisList.value.push({
          ...diagnosisForm.value,
          id: Date.now()
        })
        ElMessage.success('新增成功')
      }
      dialogVisible.value = false
    }
  })
}

const downloadTemplate = () => {
  ElMessage.success('模板下载成功')
}

const handleImport = () => {
  importDialogVisible.value = true
}

const handleImportSuccess = () => {
  ElMessage.success('导入成功')
  importDialogVisible.value = false
}

const handleImportError = () => {
  ElMessage.error('导入失败，请检查文件格式')
}
</script>

<style scoped>
.diagnosis-dict-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.search-bar {
  display: flex;
  align-items: center;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.glass-card {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(66, 153, 225, 0.1);
  border-radius: 16px;
  padding: 24px;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 2px 12px rgba(66, 153, 225, 0.08);
}

.glass-card:hover {
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 12px 40px rgba(66, 153, 225, 0.15);
  border-color: rgba(66, 153, 225, 0.25);
}

:deep(.el-table) {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  overflow: hidden;
}

:deep(.el-table th) {
  background: linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%);
  color: #4299E1;
  font-weight: 600;
  border-bottom: 1px solid rgba(66, 153, 225, 0.1);
}

:deep(.el-table tr) {
  background: rgba(255, 255, 255, 0.95);
}

:deep(.el-table tr:hover > td) {
  background: rgba(66, 153, 225, 0.05) !important;
}

:deep(.el-table td) {
  border-bottom: 1px solid rgba(66, 153, 225, 0.08);
  color: #4A5568;
}

:deep(.el-table--striped .el-table__body tr.el-table__row--striped td) {
  background: rgba(66, 153, 225, 0.03);
}

:deep(.el-button--small) {
  border-radius: 8px;
  font-size: 13px;
}

:deep(.el-input__wrapper) {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(66, 153, 225, 0.06);
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 4px 15px rgba(66, 153, 225, 0.15);
}

:deep(.el-input__inner) {
  color: #2D3748;
}

:deep(.el-input__placeholder) {
  color: #A0AEC0;
}

:deep(.el-form-item__label) {
  color: #4A5568;
  font-weight: 600;
}

:deep(.el-radio__label) {
  color: #4A5568;
}

:deep(.el-radio__inner) {
  border-color: rgba(66, 153, 225, 0.2);
}

:deep(.el-radio__input.is-checked .el-radio__inner) {
  background: #4299E1;
  border-color: #4299E1;
}

:deep(.el-upload-dragger) {
  background: linear-gradient(135deg, #EBF8FF 0%, #E0F2FE 100%);
  border: 2px dashed rgba(66, 153, 225, 0.2);
}

:deep(.el-upload-dragger:hover) {
  border-color: #4299E1;
  background: rgba(66, 153, 225, 0.05);
}

:deep(.el-button--primary) {
  background: linear-gradient(135deg, #4299E1 0%, #2B6CB0 100%);
  border: none;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(66, 153, 225, 0.3);
}

:deep(.el-button--primary:hover) {
  background: linear-gradient(135deg, #3182CE 0%, #2C5282 100%);
  box-shadow: 0 6px 20px rgba(66, 153, 225, 0.4);
}

:deep(.el-select .el-input__wrapper) {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(66, 153, 225, 0.06);
}
</style>