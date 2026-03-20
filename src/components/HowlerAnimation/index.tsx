/**
 * 吼叫信动画 - 异议申诉
 * 点击异议时，账单卡片变成一个红色的信封，信封长出嘴巴并剧烈抖动
 */

import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

interface HowlerAnimationProps {
  isAnimating: boolean
  billInfo?: {
    amount: number
    payerName: string
  }
  onComplete?: () => void
}

export default function HowlerAnimation({ isAnimating, billInfo, onComplete }: HowlerAnimationProps) {
  if (!isAnimating) return null

  // 震动反馈
  Taro.vibrateLong()

  const handleAnimationEnd = () => {
    // 动画完成后触发短震动
    Taro.vibrateShort()
    onComplete?.()
  }

  return (
    <View className='howler-overlay' onAnimationEnd={handleAnimationEnd}>
      {/* 背景红光 */}
      <View className='howler-bg-glow' />

      {/* 信封主体 */}
      <View className='envelope-container'>
        <View className='envelope'>
          {/* 信封封口 */}
          <View className='envelope-flap' />

          {/* 信封身体 */}
          <View className='envelope-body'>
            {/* 嘴巴 */}
            <View className='mouth'>
              <View className='mouth-inner'>
                <View className='tooth tooth-left' />
                <View className='tooth tooth-right' />
                <View className='tongue' />
              </View>
            </View>
          </View>

          {/* 愤怒的眉毛 */}
          <View className='angry-eyebrows'>
            <View className='eyebrow left' />
            <View className='eyebrow right' />
          </View>

          {/* 眼睛 */}
          <View className='angry-eyes'>
            <View className='eye left'>
              <View className='pupil' />
            </View>
            <View className='eye right'>
              <View className='pupil' />
            </View>
          </View>
        </View>

        {/* 火焰效果 */}
        <View className='flames'>
          <View className='flame flame-1' />
          <View className='flame flame-2' />
          <View className='flame flame-3' />
        </View>
      </View>

      {/* 账单信息 */}
      {billInfo && (
        <View className='bill-info'>
          <Text className='bill-text'>
            {billInfo.payerName} 的账单
          </Text>
          <Text className='bill-amount'>
            ¥{billInfo.amount.toFixed(2)}
          </Text>
        </View>
      )}

      {/* 咆哮文字 */}
      <View className='howler-text'>
        <Text className='roar-word'>这不公平!</Text>
      </View>
    </View>
  )
}