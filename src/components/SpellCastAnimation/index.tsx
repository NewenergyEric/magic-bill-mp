/**
 * 施咒动画 - 施展记账咒
 * 点击"+"号时，图标变为一根魔杖，划出一个"Z"字形闪电光效
 */

import { View, Text } from '@tarojs/components'
import './index.scss'

interface SpellCastAnimationProps {
  isAnimating: boolean
  onComplete?: () => void
}

export default function SpellCastAnimation({ isAnimating, onComplete }: SpellCastAnimationProps) {
  if (!isAnimating) return null

  return (
    <View className='spell-cast-overlay' onAnimationEnd={onComplete}>
      {/* 背景光晕 */}
      <View className='spell-bg-glow' />

      {/* 魔杖 */}
      <View className='wand-container'>
        <View className='wand'>
          <View className='wand-tip' />
          <View className='wand-shaft' />
          <View className='wand-handle' />
        </View>
      </View>

      {/* Z字形闪电 */}
      <View className='lightning-container'>
        <View className='lightning-segment seg-1' />
        <View className='lightning-segment seg-2' />
        <View className='lightning-segment seg-3' />
        <View className='lightning-segment seg-4' />
      </View>

      {/* 火花 */}
      <View className='sparkles'>
        <View className='sparkle sp-1' />
        <View className='sparkle sp-2' />
        <View className='sparkle sp-3' />
        <View className='sparkle sp-4' />
        <View className='sparkle sp-5' />
        <View className='sparkle sp-6' />
      </View>

      {/* 烟雾效果 */}
      <View className='smoke-container'>
        <View className='smoke smoke-1' />
        <View className='smoke smoke-2' />
        <View className='smoke smoke-3' />
      </View>

      {/* 咒语文字 */}
      <View className='spell-text'>
        <Text className='spell-word'>施咒成功!</Text>
      </View>
    </View>
  )
}