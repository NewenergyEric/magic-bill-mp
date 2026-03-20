// 巫师成长系统服务
import Taro from '@tarojs/taro'

interface WizardData {
  exp: number
  totalBills: number
  achievements: string[]
  streak: number
  lastBillDate: number
}

const WIZARD_DATA_KEY = 'wizard_data'

// 每次记账奖励经验
const EXP_PER_BILL = 10

// 成就配置
export const ACHIEVEMENTS = {
  FIRST_BILL: 'first_bill',
  TEN_BILLS: 'ten_bills',
  HUNDRED_BILLS: 'hundred_bills',
  FIRST_CONTRACT: 'first_contract',
  FIVE_MEMBERS: 'five_members',
  TEN_MEMBERS: 'ten_members',
  SEVEN_DAY_STREAK: 'seven_day_streak',
  THIRTY_DAY_STREAK: 'thirty_day_streak',
}

export function getWizardData(): WizardData {
  const data = Taro.getStorageSync(WIZARD_DATA_KEY) || {}
  return {
    exp: data.exp || 0,
    totalBills: data.totalBills || 0,
    achievements: data.achievements || [],
    streak: data.streak || 0,
    lastBillDate: data.lastBillDate || 0
  }
}

function saveWizardData(data: WizardData) {
  Taro.setStorageSync(WIZARD_DATA_KEY, data)
}

export function addExpAndCheckAchievements(amount: number = EXP_PER_BILL): { newExp: number; newAchievements: string[]; levelUp: boolean } {
  const data = getWizardData()
  const oldLevel = getLevel(data.exp)
  data.exp += amount
  data.totalBills += 1

  // 检查连续天数
  const now = Date.now()
  const oneDayMs = 24 * 60 * 60 * 1000
  const lastDate = new Date(data.lastBillDate).toDateString()
  const today = new Date(now).toDateString()

  if (lastDate !== today) {
    const daysDiff = Math.floor((now - data.lastBillDate) / oneDayMs)
    if (daysDiff === 1) {
      data.streak += 1
    } else if (daysDiff > 1) {
      data.streak = 1
    }
    data.lastBillDate = now
  }

  // 检查成就
  const newAchievements: string[] = []
  if (data.totalBills === 1 && !data.achievements.includes(ACHIEVEMENTS.FIRST_BILL)) {
    data.achievements.push(ACHIEVEMENTS.FIRST_BILL)
    newAchievements.push(ACHIEVEMENTS.FIRST_BILL)
  }
  if (data.totalBills === 10 && !data.achievements.includes(ACHIEVEMENTS.TEN_BILLS)) {
    data.achievements.push(ACHIEVEMENTS.TEN_BILLS)
    newAchievements.push(ACHIEVEMENTS.TEN_BILLS)
  }
  if (data.totalBills === 100 && !data.achievements.includes(ACHIEVEMENTS.HUNDRED_BILLS)) {
    data.achievements.push(ACHIEVEMENTS.HUNDRED_BILLS)
    newAchievements.push(ACHIEVEMENTS.HUNDRED_BILLS)
  }
  if (data.streak >= 7 && !data.achievements.includes(ACHIEVEMENTS.SEVEN_DAY_STREAK)) {
    data.achievements.push(ACHIEVEMENTS.SEVEN_DAY_STREAK)
    newAchievements.push(ACHIEVEMENTS.SEVEN_DAY_STREAK)
  }
  if (data.streak >= 30 && !data.achievements.includes(ACHIEVEMENTS.THIRTY_DAY_STREAK)) {
    data.achievements.push(ACHIEVEMENTS.THIRTY_DAY_STREAK)
    newAchievements.push(ACHIEVEMENTS.THIRTY_DAY_STREAK)
  }

  saveWizardData(data)

  const newLevel = getLevel(data.exp)
  return {
    newExp: data.exp,
    newAchievements,
    levelUp: newLevel > oldLevel
  }
}

export function unlockContractAchievement() {
  const data = getWizardData()
  if (!data.achievements.includes(ACHIEVEMENTS.FIRST_CONTRACT)) {
    data.achievements.push(ACHIEVEMENTS.FIRST_CONTRACT)
    data.exp += 50 // 签署契约奖励50经验
    saveWizardData(data)
  }
}

// 计算等级（降低后的经验要求）
export function getLevel(exp: number): number {
  if (exp >= 2000) return 10
  if (exp >= 1500) return 9
  if (exp >= 1100) return 8
  if (exp >= 750) return 7
  if (exp >= 500) return 6
  if (exp >= 300) return 5
  if (exp >= 150) return 4
  if (exp >= 70) return 3
  if (exp >= 30) return 2
  return 1
}

// 获取等级名称
export function getLevelName(level: number): string {
  const names: Record<number, string> = {
    1: '魔法学徒', 2: '魔法学徒', 3: '初级巫师',
    4: '初级巫师', 5: '中级巫师', 6: '中级巫师',
    7: '高级巫师', 8: '高级巫师', 9: '大法师', 10: '传奇巫师'
  }
  return names[level] || '魔法学徒'
}

// 获取等级称号
export function getLevelTitle(level: number): string {
  const titles: Record<number, string> = {
    1: '见习巫师', 2: '正式巫师', 3: '炼金术士',
    4: '咒语师', 5: '魔药大师', 6: '变形师',
    7: '黑魔法防御师', 8: '符咒学家', 9: '首席咒语师', 10: '霍格沃茨教授'
  }
  return titles[level] || '见习巫师'
}

// 获取等级徽章
export function getLevelBadge(level: number): string {
  const badges: Record<number, string> = {
    1: '🧹', 2: '🕯️', 3: '⚗️', 4: '✨', 5: '🧪',
    6: '🔮', 7: '🛡️', 8: '📜', 9: '👑', 10: '🌟'
  }
  return badges[level] || '🧹'
}

// 获取完整的巫师头衔（徽章+称号）
export function getWizardTitle(): string {
  const data = getWizardData()
  const level = getLevel(data.exp)
  return `${getLevelBadge(level)} ${getLevelTitle(level)}`
}
