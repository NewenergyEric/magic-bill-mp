/**
 * 结算动画 - 魔法平衡
 * 两个巫师的债务对冲时，两道不同颜色的光束碰撞并抵消，最后化为漫天金色的纸屑
 */

import { View, Text } from '@tarojs/components'
import './index.scss'

interface SettlementAnimationProps {
  isAnimating: boolean
  settlements?: Array<{
    from: string
    to: string
    amount: number
  }>
  onComplete?: () => void
}

export default function SettlementAnimation({
  isAnimating,
  settlements = [],
  onComplete
}: SettlementAnimationProps) {
  if (!isAnimating) return null

  const handleAnimationEnd = () => {
    onComplete?.()
  }

  // 生成纸屑
  const confetti = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 2 + Math.random() * 2,
    color: ['#c9a227', '#ffd700', '#722f37', '#f5e6c8'][Math.floor(Math.random() * 4)],
    size: 5 + Math.random() * 10
  }))

  return (
    <View className='settlement-overlay' onAnimationEnd={handleAnimationEnd}>
      {/* 背景 */}
      <View className='settlement-bg' />

      {/* 对冲光束 */}
      <View className='light-beams'>
        {/* 左边的光束（红色/蓝色） */}
        <View className='light-beam left-beam'>
          <View className='beam-core' />
          <View className='beam-glow' />
        </View>

        {/* 右边的光束（绿色/金色） */}
        <View className='light-beam right-beam'>
          <View className='beam-core' />
          <View className='beam-glow' />
        </View>
      </View>

      {/* 碰撞中心 */}
      <View className='collision-center'>
        <View className='collision-flash' />
        <View className='collision-ring ring-1' />
        <View className='collision-ring ring-2' />
        <View className='collision-ring ring-3' />
      </View>

      {/* 结算信息 */}
      <View className='settlement-info'>
        {settlements.length > 0 ? (
          settlements.map((s, i) => (
            <View key={i} className='settlement-item' style={{ animationDelay: `${1.5 + i * 0.3}s` }}>
              <Text className='from-name'>{s.from}</Text>
              <Text className='arrow'>→</Text>
              <Text className='to-name'>{s.to}</Text>
              <Text className='settle-amount'>¥{(s.amount / 100).toFixed(2)}</Text>
            </View>
          ))
        ) : (
          <View className='settlement-item'>
            <Text className='balance-text'>账目已结清!</Text>
          </View>
        )}
      </View>

      {/* 金色纸屑 */}
      <View className='confetti-container'>
        {confetti.map((c) => (
          <View
            key={c.id}
            className='confetti'
            style={{
              left: `${c.x}%`,
              animationDelay: `${c.delay}s`,
              animationDuration: `${c.duration}s`,
              backgroundColor: c.color,
              width: `${c.size}px`,
              height: `${c.size * 0.6}px`
            } as any}
          />
        ))}
      </View>

      {/* 文字 */}
      <View className='settlement-text'>
        <Text className='equilibrium-word'>魔法平衡</Text>
      </View>
    </View>
  )
}