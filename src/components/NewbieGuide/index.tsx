import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import './index.scss'

interface GuideStep {
  title: string
  desc: string
  icon: string
}

// 施咒页面引导步骤
const SPELL_GUIDE_STEPS: GuideStep[] = [
  { title: '欢迎来到活点记账！', desc: '霍格沃茨巫师们的AA分账神器', icon: '🧙‍♂️' },
  { title: '均分咒 ⚡', desc: '输入总金额，添加巫师，一键平摊费用', icon: '⚡' },
  { title: '清算咒 ✨', desc: '记录每位巫师的垫付金额，自动生成最优结算方案', icon: '✨' },
  { title: '入账归档', desc: '施咒完成后，选择事件入账或归档到冥想盆', icon: '📜' },
  { title: '开始施咒吧！', desc: '点击下方按钮，开启魔法分账之旅', icon: '🪄' },
]

// 收支录页面引导步骤
const LEDGER_GUIDE_STEPS: GuideStep[] = [
  { title: '古灵阁 🏦', desc: '这里记录着你所有的魔法消费事件', icon: '🏦' },
  { title: '创建事件', desc: '点击 + 创建记账事件，如聚餐、旅行等', icon: '➕' },
  { title: '快速操作', desc: '每张卡片都有「记账」和「结算」按钮，方便快捷', icon: '⚡' },
  { title: '查看详情', desc: '点击卡片查看完整的账单记录、收支明细和结算方案', icon: '📊' },
  { title: '计算过程', desc: '展开计算过程，了解每人应收应付的详细来源', icon: '🧮' },
  { title: '开始记账！', desc: '点击「开始记账」或卡片上的按钮，前往施咒', icon: '🪄' },
]

// 伙伴页面引导步骤
const COMPANION_GUIDE_STEPS: GuideStep[] = [
  { title: '巫师伙伴 👥', desc: '创建你的伙伴清单，分账时快速召唤', icon: '👥' },
  { title: '添加伙伴', desc: '点击「+ 添加新伙伴」创建巫师伙伴', icon: '➕' },
  { title: '快速选择', desc: '施咒时点击「召唤伙伴」按钮，一键选择多位伙伴', icon: '⚡' },
  { title: '修改伙伴', desc: '点击头像改头像，点击名字改名字', icon: '✏️' },
  { title: '开始添加！', desc: '添加你的第一批巫师伙伴吧', icon: '🪄' },
]

// 冥想盆页面引导步骤
const HISTORY_GUIDE_STEPS: GuideStep[] = [
  { title: '冥想盆 📜', desc: '这里保存着你所有的历史账单', icon: '📜' },
  { title: '查看归档', desc: '点击任意账单卡片查看详情', icon: '👁️' },
  { title: '分享账单', desc: '在详情页可以生成分享契约', icon: '🔗' },
  { title: '开始探索！', desc: '回顾你的魔法消费之旅吧', icon: '🪄' },
]

interface NewbieGuideProps {
  onComplete: () => void
  type?: 'spell' | 'ledger' | 'companion' | 'history'
}

const STORAGE_KEYS = {
  spell: 'guide_spell_completed',
  ledger: 'guide_ledger_completed',
  companion: 'guide_companion_completed',
  history: 'guide_history_completed',
}

// 检查是否需要显示引导
export function shouldShowGuide(type: 'spell' | 'ledger' | 'companion' | 'history'): boolean {
  try {
    return !Taro.getStorageSync(STORAGE_KEYS[type])
  } catch {
    return true
  }
}

// 标记引导完成
export function markGuideCompleted(type: 'spell' | 'ledger' | 'companion' | 'history'): void {
  Taro.setStorageSync(STORAGE_KEYS[type], true)
}

// 重置所有引导（用于测试）
export function resetAllGuides(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    Taro.removeStorageSync(key)
  })
}

export default function NewbieGuide({ onComplete, type = 'spell' }: NewbieGuideProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [visible, setVisible] = useState(false)
  
  // 根据类型选择引导步骤
  const guideSteps = type === 'ledger'
    ? LEDGER_GUIDE_STEPS
    : type === 'companion'
      ? COMPANION_GUIDE_STEPS
      : type === 'history'
        ? HISTORY_GUIDE_STEPS
        : SPELL_GUIDE_STEPS
  
  useEffect(() => {
    // 延迟显示动画
    setTimeout(() => setVisible(true), 300)
  }, [])

  const handleNext = () => {
    if (currentStep < guideSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handleSkip = () => {
    handleComplete()
  }

  const handleComplete = () => {
    setVisible(false)
    setTimeout(() => {
      markGuideCompleted(type)
      onComplete()
    }, 300)
  }

  const step = guideSteps[currentStep]
  const isLastStep = currentStep === guideSteps.length - 1

  return (
    <View className={`guide-mask ${visible ? 'visible' : ''}`}>
      <View className={`guide-content ${visible ? 'visible' : ''}`}>
        {/* 跳过按钮 */}
        {!isLastStep && (
          <View className='guide-skip' onClick={handleSkip}>
            <Text className='skip-text'>跳过</Text>
          </View>
        )}
        
        {/* 步骤图标 */}
        <View className='guide-icon-wrap'>
          <Text className='guide-icon'>{step.icon}</Text>
          <View className='icon-glow' />
        </View>
        
        {/* 步骤标题 */}
        <Text className='guide-title'>{step.title}</Text>
        <Text className='guide-desc'>{step.desc}</Text>
        
        {/* 进度指示器 */}
        <View className='guide-dots'>
          {guideSteps.map((_, idx) => (
            <View 
              key={idx} 
              className={`dot ${idx === currentStep ? 'active' : ''} ${idx < currentStep ? 'done' : ''}`}
            />
          ))}
        </View>
        
        {/* 按钮 */}
        <View className='guide-btn' onClick={handleNext}>
          <Text className='btn-text'>{isLastStep ? '知道了' : '下一步'}</Text>
        </View>
      </View>
      
      {/* 装饰粒子 */}
      <View className='particle p1'>✨</View>
      <View className='particle p2'>⭐</View>
      <View className='particle p3'>💫</View>
    </View>
  )
}