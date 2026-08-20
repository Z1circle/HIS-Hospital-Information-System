/**
 * 拼音匹配工具
 * 支持拼音首字母模糊匹配
 */

// 拼音首字母映射表（简化版，包含常用汉字）
const PINYIN_MAP: Record<string, string[]> = {
  'a': ['阿', '啊', '安', '按', '爱', '艾'],
  'b': ['八', '巴', '白', '百', '半', '包', '保', '报', '背', '本', '鼻', '比', '必', '边', '变', '便', '表', '别', '宾', '冰', '并', '病', '波', '博', '不', '部'],
  'c': ['才', '材', '参', '查', '差', '产', '长', '常', '场', '车', '成', '承', '城', '吃', '持', '齿', '冲', '虫', '出', '初', '除', '触', '穿', '传', '船', '床', '创', '春', '次', '从', '促', '存', '错'],
  'd': ['大', '代', '带', '待', '单', '但', '蛋', '淡', '当', '党', '导', '道', '得', '的', '等', '低', '底', '地', '点', '电', '调', '定', '东', '冬', '动', '都', '毒', '度', '短', '对', '多'],
  'e': ['恶', '恩', '儿', '而', '耳', '二'],
  'f': ['发', '法', '反', '饭', '方', '防', '房', '放', '飞', '非', '费', '分', '风', '封', '服', '福', '府', '复', '父', '付', '腹', '负', '妇'],
  'g': ['改', '概', '感', '干', '敢', '刚', '钢', '高', '搞', '告', '哥', '歌', '格', '个', '给', '根', '跟', '更', '工', '公', '功', '攻', '供', '共', '构', '购', '古', '骨', '股', '固', '故', '顾', '刮', '挂', '关', '观', '官', '管', '光', '广', '规', '归', '贵', '滚', '国', '过'],
  'h': ['哈', '海', '含', '寒', '汉', '号', '好', '合', '和', '河', '核', '黑', '红', '后', '候', '呼', '忽', '胡', '护', '花', '化', '划', '话', '欢', '换', '患', '黄', '回', '会', '婚', '活', '火', '获'],
  'i': [],
  'j': ['机', '基', '级', '极', '急', '集', '计', '记', '技', '季', '加', '家', '价', '假', '架', '间', '检', '简', '见', '建', '健', '江', '将', '讲', '交', '角', '脚', '教', '叫', '接', '节', '结', '解', '姐', '金', '今', '进', '近', '经', '精', '井', '颈', '景', '静', '镜', '九', '酒', '旧', '救', '就', '局', '举', '句', '具', '据', '决', '绝', '军', '均'],
  'k': ['开', '看', '康', '抗', '考', '科', '课', '客', '肯', '空', '孔', '口', '苦', '快', '宽', '款', '况'],
  'l': ['拉', '来', '蓝', '老', '乐', '类', '冷', '离', '李', '理', '力', '立', '利', '连', '脸', '练', '凉', '两', '量', '亮', '了', '林', '临', '淋', '灵', '领', '留', '流', '六', '龙', '楼', '路', '录', '陆', '绿', '乱', '论', '罗', '落'],
  'm': ['马', '买', '卖', '满', '慢', '忙', '毛', '美', '门', '们', '米', '密', '面', '民', '明', '名', '命', '模', '磨', '末', '母', '目', '木'],
  'n': ['那', '拿', '纳', '内', '男', '南', '难', '脑', '闹', '能', '你', '年', '念', '鸟', '尿', '农', '弄', '女', '暖'],
  'o': ['欧', '偶'],
  'p': ['排', '盘', '判', '跑', '配', '皮', '疲', '片', '平', '评', '瓶', '婆', '破', '普'],
  'q': ['七', '期', '其', '奇', '齐', '起', '气', '汽', '器', '千', '前', '钱', '强', '墙', '抢', '桥', '切', '且', '轻', '清', '情', '请', '庆', '穷', '秋', '求', '球', '区', '曲', '取', '去', '全', '缺', '确', '群'],
  'r': ['然', '让', '热', '人', '认', '任', '日', '容', '肉', '入', '如', '乳', '软', '弱'],
  's': ['三', '色', '杀', '沙', '山', '伤', '商', '上', '少', '社', '设', '申', '身', '深', '神', '生', '声', '省', '师', '失', '湿', '十', '石', '时', '实', '识', '史', '始', '世', '市', '示', '事', '视', '试', '室', '收', '手', '首', '受', '书', '输', '熟', '术', '树', '双', '水', '税', '睡', '顺', '说', '思', '死', '四', '送', '苏', '酸', '算', '随', '岁', '损', '所', '索'],
  't': ['他', '它', '她', '台', '太', '态', '谈', '特', '提', '题', '体', '天', '条', '铁', '听', '停', '通', '同', '统', '头', '图', '土', '团', '推', '退', '脱'],
  'u': [],
  'v': [],
  'w': ['外', '玩', '完', '晚', '万', '王', '往', '望', '危', '为', '位', '味', '胃', '卫', '未', '温', '文', '闻', '问', '我', '无', '五', '物', '误'],
  'x': ['西', '吸', '希', '息', '系', '细', '下', '夏', '先', '显', '现', '线', '限', '相', '香', '想', '向', '象', '小', '消', '效', '些', '写', '谢', '心', '新', '信', '行', '形', '型', '醒', '性', '姓', '凶', '胸', '修', '需', '续', '选', '学', '血', '雪', '寻', '询', '训', '迅'],
  'y': ['压', '呀', '牙', '亚', '烟', '严', '研', '言', '颜', '眼', '演', '验', '阳', '养', '样', '药', '要', '也', '业', '叶', '夜', '一', '医', '衣', '依', '移', '已', '以', '艺', '议', '异', '易', '意', '义', '音', '阴', '银', '引', '饮', '应', '英', '硬', '拥', '永', '用', '由', '油', '游', '有', '友', '右', '又', '幼', '于', '鱼', '雨', '语', '玉', '预', '元', '原', '远', '院', '月', '越', '云', '运'],
  'z': ['杂', '在', '早', '造', '则', '增', '展', '站', '张', '章', '长', '掌', '招', '找', '照', '者', '这', '真', '正', '政', '之', '知', '直', '值', '职', '止', '只', '指', '纸', '至', '制', '质', '治', '中', '终', '钟', '种', '重', '周', '州', '洲', '朱', '主', '住', '助', '注', '抓', '专', '转', '赚', '准', '桌', '子', '字', '自', '总', '走', '租', '组', '最', '罪', '左', '做', '作', '坐', '座']
}

/**
 * 获取汉字的拼音首字母
 * @param char 单个汉字
 * @returns 拼音首字母，如果不在映射表中则返回空字符串
 */
export function getPinyinInitial(char: string): string {
  for (const [initial, chars] of Object.entries(PINYIN_MAP)) {
    if (chars.includes(char)) {
      return initial
    }
  }
  return ''
}

/**
 * 获取字符串的拼音首字母
 * @param str 字符串
 * @returns 拼音首字母字符串
 */
export function getPinyinInitials(str: string): string {
  let initials = ''
  for (let i = 0; i < str.length; i++) {
    const char = str[i]
    if (isChineseChar(char)) {
      initials += getPinyinInitial(char)
    } else {
      initials += char.toLowerCase()
    }
  }
  return initials
}

/**
 * 判断是否为中文字符
 * @param char 字符
 * @returns 是否为中文字符
 */
export function isChineseChar(char: string): boolean {
  return char.charCodeAt(0) >= 0x4e00 && char.charCodeAt(0) <= 0x9fa5
}

/**
 * 模糊匹配拼音首字母
 * 支持不连续的首字母匹配，例如 "fx" 可以匹配 "发热"、"分析" 等
 * @param input 输入的拼音首字母
 * @param target 目标字符串
 * @returns 是否匹配
 */
export function fuzzyMatchPinyin(input: string, target: string): boolean {
  if (!input || !target) return false

  const lowerInput = input.toLowerCase()
  const lowerTarget = target.toLowerCase()

  // 1. 直接包含匹配
  if (lowerTarget.includes(lowerInput)) {
    return true
  }

  // 2. 拼音首字母匹配
  const targetInitials = getPinyinInitials(target)
  if (targetInitials.includes(lowerInput)) {
    return true
  }

  // 3. 不连续的首字母匹配（模糊匹配）
  let inputIndex = 0
  let targetIndex = 0

  while (inputIndex < lowerInput.length && targetIndex < target.length) {
    const inputChar = lowerInput[inputIndex]
    const targetChar = target[targetIndex]

    // 如果是中文字符，检查首字母
    if (isChineseChar(targetChar)) {
      const targetInitial = getPinyinInitial(targetChar).toLowerCase()
      if (targetInitial === inputChar) {
        inputIndex++
      }
    } else if (targetChar.toLowerCase() === inputChar) {
      // 如果是英文字符，直接比较
      inputIndex++
    }

    targetIndex++
  }

  return inputIndex === lowerInput.length
}

/**
 * 计算匹配分数（用于排序）
 * @param input 输入字符串
 * @param target 目标字符串
 * @returns 匹配分数，分数越高匹配度越高
 */
export function getMatchScore(input: string, target: string): number {
  if (!input || !target) return 0

  const lowerInput = input.toLowerCase()
  const lowerTarget = target.toLowerCase()

  let score = 0

  // 1. 完全匹配（最高分）
  if (lowerTarget === lowerInput) {
    score += 100
  }

  // 2. 开头匹配
  if (lowerTarget.startsWith(lowerInput)) {
    score += 80
  }

  // 3. 包含匹配
  if (lowerTarget.includes(lowerInput)) {
    score += 60
  }

  // 4. 拼音首字母完全匹配
  const targetInitials = getPinyinInitials(target)
  if (targetInitials === lowerInput) {
    score += 70
  }

  // 5. 拼音首字母开头匹配
  if (targetInitials.startsWith(lowerInput)) {
    score += 50
  }

  // 6. 模糊匹配
  if (fuzzyMatchPinyin(input, target)) {
    score += 40
  }

  // 7. 长度惩罚（越长匹配度越低）
  score -= (target.length - input.length) * 2

  return Math.max(0, score)
}

/**
 * 按拼音首字母过滤并排序
 * @param items 待过滤的项目列表
 * @param input 输入字符串
 * @param keyFn 获取字符串的函数
 * @returns 过滤并排序后的列表
 */
export function filterByPinyin<T>(
  items: T[],
  input: string,
  keyFn: (item: T) => string
): T[] {
  if (!input) return items

  const filtered = items.filter(item => {
    const str = keyFn(item)
    return fuzzyMatchPinyin(input, str)
  })

  // 按匹配分数排序
  filtered.sort((a, b) => {
    const scoreA = getMatchScore(input, keyFn(a))
    const scoreB = getMatchScore(input, keyFn(b))
    return scoreB - scoreA
  })

  return filtered
}