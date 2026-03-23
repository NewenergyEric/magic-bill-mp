import { View, Text, Button, Image } from '@tarojs/components'
import Taro, { useRouter, useShareAppMessage } from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { cloudLogin, joinContract } from '@/services/cloud'
import { useUser } from '@/contexts/UserContext'
import WizardAvatar from '@/components/WizardAvatar'
import './index.scss'

export default function InvitePage() {
  const router = useRouter()
  const { isLogged, userCompanion } = useUser()
  const [loading, setLoading] = useState(false)
  const [joined, setJoined] = useState(false)
  const [eventName, setEventName] = useState('')
  const [inviteCode, setInviteCode] = useState('')

  useEffect(() => {
    const { code, name } = router.params
    if (code) {
      setInviteCode(code)
      if (name) {
        setEventName(decodeURIComponent(name))
      }
    }
  }, [router.params])

  // 配置分享给朋友
  useShareAppMessage(() => {
    return {
      title: `邀请你加入「${eventName}」共同记账`,
      path: `/pages/invite/index?code=${inviteCode}&name=${encodeURIComponent(eventName)}`,
      imageUrl: '/assets/share-invite.png'
    }
  })

  const handleJoin = async () => {
    if (!inviteCode) {
      Taro.showToast({ title: '邀请码无效', icon: 'none' })
      return
    }

    setLoading(true)
    try {
      // 确保登录
      if (!isLogged) {
        const loginResult = await cloudLogin(
          userCompanion?.name || '神秘巫师',
          userCompanion?.avatar || ''
        )
        if (!loginResult.success) {
          Taro.showToast({ title: '登录失败', icon: 'none' })
          setLoading(false)
          return
        }
      }

      // 加入契约
      const result = await joinContract(inviteCode)
      if (result.success) {
        setJoined(true)
        Taro.showToast({ title: '加入成功！', icon: 'success' })
      } else {
        Taro.showToast({ title: result.message || '加入失败', icon: 'none' })
      }
    } catch (e) {
      console.error('[Invite] 加入失败', e)
      Taro.showToast({ title: '加入失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const handleGoHome = () => {
    Taro.switchTab({ url: '/pages/index/index' })
  }

  const handleShare = () => {
    // 触发分享
  }

  return (
    <View className='invite-page'>
      <View className='invite-bg'>
        <View className='invite-overlay' />
      </View>

      <View className='invite-content'>
        {/* 标题 */}
        <View className='invite-header'>
          <Text className='invite-icon'>📜</Text>
          <Text className='invite-title'>魔法账单邀请</Text>
        </View>

        {/* 卡片 */}
        <View className='invite-card'>
          {eventName && (
            <View className='event-name'>
              <Text className='name-label'>事件名称</Text>
              <Text className='name-text'>{eventName}</Text>
            </View>
          )}

          {!joined ? (
            <>
              <Text className='invite-desc'>
                好友邀请你加入「{eventName || '共享账单'}」，
                共同记账，轻松分账！
              </Text>

              <View className='invite-actions'>
                <Button
                  className='join-btn'
                  onClick={handleJoin}
                  loading={loading}
                  disabled={loading}
                >
                  {loading ? '加入中...' : '立即加入'}
                </Button>
              </View>

              <View className='share-section'>
                <Button className='share-btn' openType='share' onClick={handleShare}>
                  <Text className='share-btn-text'>转发给好友</Text>
                </Button>
              </View>
            </>
          ) : (
            <>
              <View className='success-icon'>✨</View>
              <Text className='success-text'>已成功加入！</Text>
              <Text className='success-hint'>现在可以和好友一起记账了</Text>
              
              <Button className='go-home-btn' onClick={handleGoHome}>
                开始记账
              </Button>
            </>
          )}
        </View>

        {/* 功能说明 */}
        <View className='features'>
          <View className='feature-item'>
            <Text className='feature-icon'>🧙</Text>
            <Text className='feature-text'>多人协作记账</Text>
          </View>
          <View className='feature-item'>
            <Text className='feature-icon'>📊</Text>
            <Text className='feature-text'>自动分账计算</Text>
          </View>
          <View className='feature-item'>
            <Text className='feature-icon'>🔒</Text>
            <Text className='feature-text'>云端数据同步</Text>
          </View>
        </View>
      </View>
    </View>
  )
}