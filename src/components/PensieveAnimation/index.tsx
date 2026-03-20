/**
 * 冥想盆动画 - 记忆回溯
 * 屏幕出现水面波纹涟漪，旧的账单数据从"水底"缓缓浮现，背景变为深蓝色
 */

import { View, Text } from '@tarojs/components'
import './index.scss'

interface PensieveAnimationProps {
  isAnimating: boolean
  onComplete?: () => void
}

export default function PensieveAnimation({ isAnimating, onComplete }: PensieveAnimationProps) {
  if (!isAnimating) return null

  const handleAnimationEnd = () => {
    onComplete?.()
  }

  return (
    <View className='pensieve-overlay' onAnimationEnd={handleAnimationEnd}>
      {/* 深蓝色背景 */}
      <View className='pensieve-bg' />

      {/* 水面 */}
      <View className='water-surface'>
        {/* 波纹 */}
        <View className='ripple ripple-1' />
        <View className='ripple ripple-2' />
        <View className='ripple ripple-3' />

        {/* 光斑 */}
        <View className='light-spot spot-1' />
        <View className='light-spot spot-2' />
        <View className='light-spot spot-3' />
      </View>

      {/* 气泡 */}
      <View className='bubbles'>
        <View className='bubble bubble-1' />
        <View className='bubble bubble-2' />
        <View className='bubble bubble-3' />
        <View className='bubble bubble-4' />
        <View className='bubble bubble-5' />
      </View>

      {/* 浮现的记忆内容 */}
      <View className='memory-content'>
        <View className='memory-scroll'>
          <Text className='memory-text'>记忆浮现中...</Text>
        </View>
      </View>

      {/* 冥想盆文字 */}
      <View className='pensieve-text'>
        <Text className='pensieve-word'>冥想盆</Text>
      </View>
    </View>
  )
}