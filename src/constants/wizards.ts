// 巫师头像配置
// 使用单独的头像图片 - 只包含实际存在的文件

export interface WizardConfig {
  name: string
  avatar: string  // 图片文件名（不含扩展名）
}

// 所有巫师头像列表（只包含存在的文件）
export const WIZARDS: WizardConfig[] = [
  { name: '哈利', avatar: 'Harry' },
  { name: '赫敏', avatar: 'Hermione' },
  { name: '罗恩', avatar: 'Ron' },
  { name: '金妮', avatar: 'Ginny' },
  { name: '德拉科', avatar: 'Darco' },
  { name: '邓布利多', avatar: 'Albus' },
  { name: '斯内普', avatar: 'Ssnape' },
  { name: '海格', avatar: 'Hagrid' },
  { name: '秋张', avatar: 'Cho' },
  { name: '弗雷德', avatar: 'Fred' },
  { name: '珀西', avatar: 'Percy' },
  { name: '巴克比克', avatar: 'Buckbeak' },
  { name: '费尔奇', avatar: 'Filch' },
  { name: '拉环', avatar: 'Griphook' },
  { name: '海德薇', avatar: 'Hedwig' },
  { name: '金斯莱', avatar: 'Kingsley' },
  { name: '卢修斯', avatar: 'Lucius' },
  { name: '卢平', avatar: 'Lupin' },
  { name: '疯眼汉', avatar: 'Mad-Eya' },
  { name: '纳威', avatar: 'Neville' },
  { name: '皮皮鬼', avatar: 'Peeves' },
  { name: '庞弗雷', avatar: 'Pomfrey' },
  { name: '罗斯默塔', avatar: 'Rosmerta' },
  { name: '斯普劳特', avatar: 'Sprout' },
  { name: '血人巴罗', avatar: 'The Bloody Baron' },
  { name: '胖夫人', avatar: 'The Fat Lady' },
  { name: '唐克斯', avatar: 'Tonks' },
  { name: '特里劳妮', avatar: 'Trelawney' },
  { name: '乌姆里奇', avatar: 'Umbridge' },
  { name: '扎卡赖斯', avatar: 'Zacharias' },
]

// 默认巫师名字列表
export const DEFAULT_WIZARD_NAMES = WIZARDS.map(w => w.name)

// 根据名字获取巫师配置
export function getWizardConfig(name: string): WizardConfig {
  // 先尝试精确匹配
  const found = WIZARDS.find(w => w.name === name || w.avatar === name)
  if (found) return found
  
  // 再尝试部分匹配
  const partial = WIZARDS.find(w => name.includes(w.name) || w.name.includes(name))
  if (partial) return partial
  
  // 默认返回哈利
  return WIZARDS[0]
}