/**
 * 均分咒动画 - 金币分摊
 * 屏幕中央的一大堆金加隆（硬币）随着咒语炸开，均匀地飞向四周代表不同成员的头像
 */

import { View, Text } from '@tarojs/components'
import './index.scss'

interface SplitSpellAnimationProps {
  isAnimating: boolean
  memberCount: number
  totalAmount: number
  memberAvatars?: string[]
  onComplete?: () => void
}

export default function SplitSpellAnimation({
  isAnimating,
  memberCount,
  totalAmount,
  memberAvatars = [],
  onComplete
}: SplitSpellAnimationProps) {
  if (!isAnimating) return null

  // 计算每人分到的金币数
  const perPerson = memberCount > 0 ? (totalAmount / memberCount / 100).toFixed(2) : '0.00'

  // 生成多个金币的位置和延迟
  const coins = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    delay: Math.random() * 0.5,
    duration: 1 + Math.random() * 0.5,
    startX: 0,
    startY: 0,
    // 目标位置：围绕中心均匀分布
    endX: Math.cos((i / 20) * Math.PI * 2) * 150,
    endY: Math.sin((i / 20) * Math.PI * 2) * 150,
    size: 20 + Math.random() * 15
  }))

  const handleAnimationEnd = () => {
    onComplete?.()
  }

  return (
    <View className='split-spell-overlay' onAnimationEnd={handleAnimationEnd}>
      {/* 背景光芒 */}
      <View className='magic-glow' />

      {/* 中心金币堆 */}
      <View className='coin-pile'>
        <View className='pile-glow' />
        {Array.from({ length: 8 }).map((_, i) => (
          <View
            key={i}
            className='coin'
            style={{
              animationDelay: `${i * 0.05}s`,
              '--size': `${25 + i * 2}px`
            } as any}
          />
        ))}
      </View>

      {/* 飞散的金币 */}
      <View className='flying-coins'>
        {coins.map((coin) => (
          <View
            key={coin.id}
            className='flying-coin'
            style={{
              '--end-x': `${coin.endX}px`,
              '--end-y': `${coin.endY}px`,
              '--delay': `${coin.delay}s`,
              '--duration': `${coin.duration}s`,
              '--size': `${coin.size}px`
            } as any}
          />
        ))}
      </View>

      {/* 目标成员头像 */}
      <View className='target-members'>
        {Array.from({ length: memberCount }).map((_, i) => (
          <View
            key={i}
            className='member-avatar'
            style={{
              '--angle': `${(i / memberCount) * 360}deg`,
              '--delay': `${0.8 + i * 0.1}s`
            } as any}
          >
            <View className='avatar-placeholder'>
              <Text className='avatar-icon'>👤</Text>
            </View>
            <View className='received-coin'>
              <Text className='coin-icon'>🪙</Text>
            </View>
          </View>
        ))}
      </View>

      {/* 金额显示 */}
      <View className='amount-display'>
        <Text className='split-label'>每人</Text>
        <Text className='split-amount'>¥{perPerson}</Text>
      </View>

      {/* 咒语文字 */}
      <View className='spell-text'>
        <Text className='spell-word'>均分咒!</Text>
      </View>
    </View>
  )
}