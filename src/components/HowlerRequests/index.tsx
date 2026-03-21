/**
 * 吼叫信请求组件 - 显示和管理加入申请
 */

import { View, Text } from '@tarojs/components'
import Taro, { useState, useEffect } from '@tarojs/taro'
import { getJoinRequests, approveJoinRequest } from '@/services/cloud'
import WizardAvatar from '@/components/WizardAvatar'
import './index.scss'

interface HowlerRequestsProps {
  contractId: string
  isGuardian: boolean
  cloudUserId: string | null
  onRefresh: () => void
}

export default function HowlerRequests({ contractId, isGuardian, cloudUserId, onRefresh }: HowlerRequestsProps) {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // 加载申请列表
  const loadRequests = async () => {
    if (!isGuardian || !contractId) return

    setLoading(true)
    try {
      const result = await getJoinRequests(contractId)
      if (result.success && result.data?.requests) {
        setRequests(result.data.requests)
      }
    } catch (e) {
      console.error('[HowlerRequests] 加载申请失败', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [contractId, isGuardian])

  // 处理审批
  const handleApprove = async (requestId: string, approve: boolean) => {
    const action = approve ? '批准' : '拒绝'
    const confirm = await Taro.showModal({
      title: `确认${action}`,
      content: `确定要${action}该巫师的加入申请吗？`,
      confirmText: action,
      confirmColor: approve ? '#4CAF50' : '#f44336'
    })

    if (!confirm.confirm) return

    setLoading(true)
    try {
      const result = await approveJoinRequest(requestId, approve)
      if (result.success) {
        Taro.showToast({ title: result.data?.message || action + '成功', icon: 'success' })
        loadRequests()
        onRefresh()
      } else {
        Taro.showToast({ title: result.error?.message || action + '失败', icon: 'none' })
      }
    } catch (e) {
      console.error('[HowlerRequests] 审批失败', e)
      Taro.showToast({ title: action + '失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  if (!isGuardian) return null

  if (requests.length === 0) return null

  return (
    <View className='howler-requests'>
      <View className='section-title'>📬 吼叫信 ({requests.length})</View>
      <View className='request-list'>
        {requests.map((request) => (
          <View key={request._id} className='request-item'>
            <View className='request-avatar'>
              <WizardAvatar name={request.avatarUrl || ''} size='small' />
            </View>
            <View className='request-info'>
              <Text className='request-name'>{request.nickname || '神秘巫师'}</Text>
              <Text className='request-time'>
                {new Date(request.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <View className='request-actions'>
              <View
                className='approve-btn'
                onClick={() => handleApprove(request._id, true)}
              >
                <Text className='approve-text'>✓ 批准</Text>
              </View>
              <View
                className='reject-btn'
                onClick={() => handleApprove(request._id, false)}
              >
                <Text className='reject-text'>✕ 拒绝</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}
