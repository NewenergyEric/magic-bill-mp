/**
 * 离线状态指示器 - 自动书写羽毛笔
 * 当断网时显示正在书写的羽毛笔动画，联网后消失
 */

import { useState, useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [showTransition, setShowTransition] = useState(false)

  useEffect(() => {
    // 检查初始网络状态
    const checkNetwork = () => {
      const networkType = Taro.getNetworkType()
      const online = networkType && networkType !== 'none'
      setIsOnline(online)
    }

    checkNetwork()

    // 监听网络状态变化
    const unsubscribe = Taro.onNetworkStatusChange((res) => {
      const online = res.networkType !== 'none'
      setIsOnline(online)

      // 联网时显示消失动画
      if (online) {
        setShowTransition(true)
        setTimeout(() => setShowTransition(false), 1000)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // 在线状态不显示
  if (isOnline && !showTransition) {
    return null
  }

  // 联网时的消失动画
  if (showTransition) {
    return (
      <View className='offline-indicator sync-complete'>
        <View className='quill-container fading'>
          <View className='quill-body'>
            <View className='quill-feather'>
              <View className='feather-line line-1' />
              <View className='feather-line line-2' />
              <View className='feather-line line-3' />
            </View>
            <View className='quill-nib' />
          </View>
          <View className='golden-glow' />
        </View>
        <Text className='sync-text'>同步完成 ✨</Text>
      </View>
    )
  }

  // 离线状态显示羽毛笔
  return (
    <View className='offline-indicator'>
      <View className='quill-container writing'>
        <View className='paper-bg'>
          <View className='writing-line line-1' />
          <View className='writing-line line-2' />
          <View className='writing-line line-3' />
        </View>
        <View className='quill-body'>
          <View className='quill-feather'>
            <View className='feather' />
            <View className='feather' />
            <View className='feather' />
          </View>
          <View className='quill-shaft' />
          <View className='quill-nib' />
        </View>
        <View className='ink-trail'>
          <View className='ink-drop drop-1' />
          <View className='ink-drop drop-2' />
          <View className='ink-drop drop-3' />
        </View>
      </View>
      <Text className='offline-text'>离线记账中...</Text>
    </View>
  )
}