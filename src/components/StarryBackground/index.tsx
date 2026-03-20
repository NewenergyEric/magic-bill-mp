import { View } from '@tarojs/components'
import { useEffect, useState } from 'react'
import './index.scss'

interface Star {
  id: number
  x: number
  y: number
  size: number
  opacity: number
  duration: number
}

export default function StarryBackground() {
  const [stars, setStars] = useState<Star[]>([])

  useEffect(() => {
    // 生成随机星星
    const newStars: Star[] = []
    for (let i = 0; i < 30; i++) {
      newStars.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.4 + 0.2,
        duration: Math.random() * 3 + 2
      })
    }
    setStars(newStars)
  }, [])

  return (
    <View className='starry-bg'>
      {/* 星星 */}
      {stars.map((star) => (
        <View
          key={star.id}
          className='star'
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size * 2}rpx`,
            height: `${star.size * 2}rpx`,
            opacity: star.opacity,
            animationDuration: `${star.duration}s`
          }}
        />
      ))}

      {/* 顶部光晕 */}
      <View className='top-glow' />
    </View>
  )
}
