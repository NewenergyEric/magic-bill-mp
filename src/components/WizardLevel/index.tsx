import { View, Text } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import './index.scss'

interface WizardLevelProps {
  compact?: boolean  // 紧凑模式，用于顶部显示
}

interface LevelInfo {
  level: number
  name: string
  title: string
  minExp: number
  maxExp: number
  badge: string
  color: string
}

// 巫师等级配置（降低经验要求）
const LEVEL_CONFIG: LevelInfo[] = [
  { level: 1, name: '魔法学徒', title: '见习巫师', minExp: 0, maxExp: 30, badge: '🧹', color: '#8B8B8B' },
  { level: 2, name: '魔法学徒', title: '正式巫师', minExp: 30, maxExp: 70, badge: '🕯️', color: '#4A4A4A' },
  { level: 3, name: '初级巫师', title: '炼金术士', minExp: 70, maxExp: 150, badge: '⚗️', color: '#C0C0C0' },
  { level: 4, name: '初级巫师', title: '咒语师', minExp: 150, maxExp: 300, badge: '✨', color: '#FFD700' },
  { level: 5, name: '中级巫师', title: '魔药大师', minExp: 300, maxExp: 500, badge: '🧪', color: '#9370DB' },
  { level: 6, name: '中级巫师', title: '变形师', minExp: 500, maxExp: 750, badge: '🔮', color: '#4169E1' },
  { level: 7, name: '高级巫师', title: '黑魔法防御师', minExp: 750, maxExp: 1100, badge: '🛡️', color: '#228B22' },
  { level: 8, name: '高级巫师', title: '符咒学家', minExp: 1100, maxExp: 1500, badge: '📜', color: '#DAA520' },
  { level: 9, name: '大法师', title: '首席咒语师', minExp: 1500, maxExp: 2000, badge: '👑', color: '#FF6347' },
  { level: 10, name: '传奇巫师', title: '霍格沃茨教授', minExp: 2000, maxExp: 999999, badge: '🌟', color: '#FF1493' },
]

// 成就配置
const ACHIEVEMENTS = [
  { id: 'first_bill', name: '初次施咒', desc: '完成第一笔记账', icon: '⚡', exp: 50 },
  { id: 'ten_bills', name: '十次施咒', desc: '累计记账10次', icon: '⚡⚡', exp: 100 },
  { id: 'hundred_bills', name: '百次施咒', desc: '累计记账100次', icon: '⚡⚡⚡', exp: 500 },
  { id: 'first_contract', name: '签署契约', desc: '创建或加入第一个契约', icon: '📜', exp: 100 },
  { id: 'five_members', name: '小团体', desc: '契约成员达到5人', icon: '🧙', exp: 150 },
  { id: 'ten_members', name: '大团体', desc: '契约成员达到10人', icon: '🧙🧙', exp: 300 },
  { id: 'seven_day_streak', name: '连续7天', desc: '连续记账7天', icon: '📅', exp: 200 },
  { id: 'thirty_day_streak', name: '连续30天', desc: '连续记账30天', icon: '🔥', exp: 500 },
]

export default function WizardLevel({ compact = false }: WizardLevelProps) {
  const [exp, setExp] = useState(0)
  const [totalBills, setTotalBills] = useState(0)
  const [achievements, setAchievements] = useState<string[]>([])
  const [streak, setStreak] = useState(0)

  // 加载巫师数据
  useEffect(() => {
    const wizardData = Taro.getStorageSync('wizard_data') || {}
    setExp(wizardData.exp || 0)
    setTotalBills(wizardData.totalBills || 0)
    setAchievements(wizardData.achievements || [])
    setStreak(wizardData.streak || 0)
  }, [])

  // 计算当前等级
  const currentLevel = LEVEL_CONFIG.find((l, i) => {
    const next = LEVEL_CONFIG[i + 1]
    return !next || (exp >= l.minExp && exp < next.minExp)
  }) || LEVEL_CONFIG[0]

  // 计算经验进度
  const levelProgress = currentLevel.maxExp === 999999
    ? 100
    : Math.min(100, ((exp - currentLevel.minExp) / (currentLevel.maxExp - currentLevel.minExp)) * 100)

  // 紧凑模式（顶部显示）
  if (compact) {
    return (
      <View className='wizard-level-compact' onClick={() => !compact && showLevelDetail()}>
        <Text className='level-badge'>{currentLevel.badge}</Text>
        <View className='level-info-compact'>
          <Text className='level-title-compact'>{currentLevel.name}</Text>
          <View className='exp-bar-compact'>
            <View className='exp-fill-compact' style={{ width: `${levelProgress}%` }} />
          </View>
        </View>
        <Text className='exp-text-compact'>{exp} EXP</Text>
      </View>
    )
  }

  // 显示等级详情弹窗
  const showLevelDetail = () => {
    // 已解锁的成就
    const unlockedAchievements = ACHIEVEMENTS.filter(a => achievements.includes(a.id))
    // 未解锁的成就
    const lockedAchievements = ACHIEVEMENTS.filter(a => !achievements.includes(a.id))

    Taro.showModal({
      title: `${currentLevel.badge} ${currentLevel.title}`,
      content: `等级: ${currentLevel.level} | 经验: ${exp}/${currentLevel.maxExp}\n连续记账: ${streak} 天\n累计记账: ${totalBills} 次`,
      confirmText: '知道了',
      showCancel: false
    })
  }

  return (
    <View className='wizard-level-card'>
      {/* 等级信息 */}
      <View className='level-header'>
        <View className='level-badge-large' style={{ background: currentLevel.color }}>
          <Text className='badge-icon'>{currentLevel.badge}</Text>
        </View>
        <View className='level-info'>
          <Text className='level-name'>{currentLevel.name}</Text>
          <Text className='level-title-text'>{currentLevel.title}</Text>
        </View>
        <View className='level-number'>
          <Text className='level-num'>Lv.{currentLevel.level}</Text>
        </View>
      </View>

      {/* 经验进度条 */}
      <View className='exp-section'>
        <View className='exp-label'>
          <Text className='exp-current'>{exp}</Text>
          <Text className='exp-separator'>/</Text>
          <Text className='exp-max'>{currentLevel.maxExp === 999999 ? '∞' : currentLevel.maxExp}</Text>
        </View>
        <View className='exp-bar'>
          <View
            className='exp-fill'
            style={{
              width: `${levelProgress}%`,
              background: `linear-gradient(90deg, ${currentLevel.color}, ${currentLevel.color}88)`
            }}
          />
        </View>
        <Text className='exp-hint'>距离升级还需 {currentLevel.maxExp - exp} 经验</Text>
      </View>

      {/* 统计信息 */}
      <View className='stats-row'>
        <View className='stat-item'>
          <Text className='stat-value'>{totalBills}</Text>
          <Text className='stat-label'>累计施咒</Text>
        </View>
        <View className='stat-divider' />
        <View className='stat-item'>
          <Text className='stat-value'>{streak}</Text>
          <Text className='stat-label'>连续天数</Text>
        </View>
        <View className='stat-divider' />
        <View className='stat-item'>
          <Text className='stat-value'>{achievements.length}</Text>
          <Text className='stat-label'>已获成就</Text>
        </View>
      </View>
    </View>
  )
}

// 导出成就列表供外部使用
export { ACHIEVEMENTS, LEVEL_CONFIG }
