import { View, Text, ScrollView, Button } from '@tarojs/components'
import Taro, { useRouter, useDidShow, useShareAppMessage, useShareTimeline } from '@tarojs/taro'
import { useState, useMemo, useCallback } from 'react'
import { Bill, SubLedger } from '@/types'
import { 
  getBillsBySubLedger, 
  calculateSubLedgerSettlement,
  getSubLedgerById,
  ParticipantSettlement,
  BillSettlementDetail
} from '@/services/ledger'
import { formatAmount } from '@/utils/settlement'
import { getRandomQuote } from '@/constants/quotes'
import WizardAvatar from '@/components/WizardAvatar'
import './index.scss'

interface ShareData {
  type: 'bill' | 'event'
  eventName: string
  date: number
  // 单账单数据
  billType?: 'simple' | 'multi'
  totalAmount?: number
  participantsCount?: number
  perPerson?: number
  participants?: { id: string; name: string; avatar?: string; paid?: number; shouldPay?: number }[]
  payerId?: string
  payerName?: string
  // 事件数据
  bills?: Bill[]
  settlementData?: {
    participants: ParticipantSettlement[]
    settlements: { from: string; to: string; amount: number }[]
    totalAmount: number
    participantCount: number
    billDetails: BillSettlementDetail[]
  }
}

export default function SharePage() {
  const router = useRouter()
  const [shareData, setShareData] = useState<ShareData | null>(null)
  const [loading, setLoading] = useState(true)
  
  // 随机台词（使用 useMemo 确保只在数据加载时更新一次）
  const quote = useMemo(() => getRandomQuote(), [shareData])

  useDidShow(() => {
    loadShareData()
  })

  const loadShareData = () => {
    const { type, id } = router.params
    
    if (!type || !id) {
      setLoading(false)
      return
    }

    try {
      // 解码分享数据
      const decodedData = JSON.parse(decodeURIComponent(id))
      
      if (type === 'bill') {
        // 单账单分享
        setShareData({
          type: 'bill',
          eventName: decodedData.eventName,
          date: decodedData.date,
          billType: decodedData.billType,
          totalAmount: decodedData.totalAmount,
          participantsCount: decodedData.participantsCount,
          perPerson: decodedData.perPerson,
          participants: decodedData.participants,
          payerId: decodedData.payerId,
          payerName: decodedData.payerName
        })
      } else if (type === 'event') {
        // 事件分享
        setShareData({
          type: 'event',
          eventName: decodedData.eventName,
          date: decodedData.date,
          bills: decodedData.bills,
          settlementData: decodedData.settlementData
        })
      }
    } catch (e) {
      console.error('Failed to parse share data:', e)
    }
    
    setLoading(false)
  }

  const formatDate = (timestamp: number | undefined | null) => {
    if (!timestamp || typeof timestamp !== 'number' || isNaN(timestamp)) {
      return '未知日期'
    }
    const date = new Date(timestamp)
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}.${m}.${d}`
  }

  const goToHome = () => {
    Taro.switchTab({ url: '/pages/index/index' })
  }

  // 获取当前页面分享参数
  const getShareParams = useCallback(() => {
    const { type, id } = router.params
    return { type, id }
  }, [router.params])

  // 分享给微信好友
  useShareAppMessage(() => {
    const { type, id } = getShareParams()
    const totalAmount = shareData?.totalAmount || shareData?.settlementData?.totalAmount || 0
    const totalYuan = totalAmount / 100
    
    return {
      title: `🔮 ${shareData?.eventName || '魔法账单'} - ¥${totalYuan.toFixed(2)}`,
      path: `/pages/share/index?type=${type}&id=${id}`,
      imageUrl: ''
    }
  })

  // 分享到朋友圈
  useShareTimeline(() => {
    return {
      title: `🔮 ${shareData?.eventName || '魔法账单'} - 活点账单`,
      query: `type=${router.params.type}&id=${router.params.id}`,
      imageUrl: ''
    }
  })

  // 点击分享按钮，引导用户点击右上角分享
  const handleShareClick = () => {
    Taro.showModal({
      title: '分享账单',
      content: '请点击右上角「...」按钮，选择「发送给朋友」或「分享到朋友圈」',
      showCancel: false,
      confirmText: '知道了'
    })
  }

  // 渲染单账单分享
  const renderBillShare = () => {
    if (!shareData) return null

    const totalYuan = (shareData.totalAmount || 0) / 100
    const perPersonYuan = (shareData.perPerson || 0) / 100

    return (
      <View className='share-content'>
        {/* 幽默台词 - 放在最上面 */}
        <View className='quote-banner'>
          <Text className='quote-icon'>✨</Text>
          <Text className='quote-text'>{quote}</Text>
        </View>
        
        {/* 魔法羊皮纸卡片 */}
        <View className='parchment-card'>
          {/* 顶部装饰 */}
          <View className='card-decoration top'>
            <View className='deco-line' />
            <Text className='deco-icon'>{shareData.billType === 'simple' ? '⚡' : '✨'}</Text>
            <View className='deco-line' />
          </View>
          
          {/* 事件名称 */}
          <View className='card-header'>
            <Text className='event-name'>{shareData.eventName}</Text>
            <Text className='event-date'>{formatDate(shareData.date)}</Text>
          </View>
          
          {/* 总花费 */}
          <View className='total-section'>
            <View className='total-label'>
              <Text className='label-text'>总花费</Text>
              <View className='label-seal'>
                <Text className='seal-text'>✦</Text>
              </View>
            </View>
            <Text className='total-amount'>¥ {totalYuan.toFixed(2)}</Text>
            <View className='total-meta'>
              <Text className='meta-item'>共 {shareData.participantsCount} 位巫师</Text>
              <Text className='meta-divider'>·</Text>
              <Text className='meta-item'>人均 ¥{perPersonYuan.toFixed(2)}</Text>
            </View>
          </View>
          
          {/* 参与巫师 */}
          <View className='wizards-section'>
            <View className='section-header'>
              <Text className='section-icon'>🧙</Text>
              <Text className='section-title'>参与巫师</Text>
            </View>
            <View className='wizards-grid'>
              {shareData.participants?.map((p, idx) => {
                const isPayer = p.id === shareData.payerId
                return (
                  <View key={idx} className={`wizard-card ${isPayer ? 'is-payer' : ''}`}>
                    <View className='wizard-avatar'>
                      <WizardAvatar name={p.avatar || ''} className='share-size' />
                      {isPayer && <Text className='payer-badge'>付款人</Text>}
                    </View>
                    <Text className='wizard-name'>{p.name}</Text>
                  </View>
                )
              })}
            </View>
          </View>
          
          {/* 清算契约 - 优化布局 */}
          <View className='contract-section'>
            <View className='section-header'>
              <Text className='section-icon'>📜</Text>
              <Text className='section-title'>清算契约</Text>
            </View>
            {shareData.payerName ? (
              <View className='simple-contract'>
                {shareData.participants?.filter(p => p.id !== shareData.payerId).map((p, idx) => (
                  <View key={idx} className='simple-contract-item'>
                    <View className='contract-from'>
                      <WizardAvatar name={p.avatar || ''} className='tiny' />
                      <Text className='from-name'>{p.name}</Text>
                    </View>
                    <View className='contract-arrow'>
                      <Text className='arrow-amount'>¥{perPersonYuan.toFixed(2)}</Text>
                      <Text className='arrow-icon'>→</Text>
                    </View>
                    <View className='contract-to'>
                      <WizardAvatar name={shareData.participants?.find(w => w.id === shareData.payerId)?.avatar || ''} className='tiny' />
                      <Text className='to-name'>{shareData.payerName}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View className='contract-list'>
                {shareData.participants?.map((p, idx) => {
                  const balance = (p.paid || 0) - (p.shouldPay || 0)
                  const balanceYuan = balance / 100
                  if (Math.abs(balance) < 1) return null
                  
                  return (
                    <View key={idx} className={`contract-item ${balance > 0 ? 'receive' : 'pay'}`}>
                      <View className='contract-wizard'>
                        <WizardAvatar name={p.avatar || ''} className='small' />
                        <Text className='contract-name'>{p.name}</Text>
                      </View>
                      <Text className='contract-action'>
                        {balance > 0 ? '应收' : '应付'}
                      </Text>
                      <Text className='contract-amount'>¥{Math.abs(balanceYuan).toFixed(2)}</Text>
                    </View>
                  )
                })}
              </View>
            )}
          </View>
          
          {/* 底部装饰 */}
          <View className='card-decoration bottom'>
            <View className='deco-line' />
            <Text className='deco-icon'>✨</Text>
            <View className='deco-line' />
          </View>
        </View>
      </View>
    )
  }

  // 渲染事件分享
  const renderEventShare = () => {
    if (!shareData || !shareData.settlementData) return null

    const { settlementData } = shareData

    return (
      <View className='share-content'>
        {/* 幽默台词 - 放在最上面 */}
        <View className='quote-banner'>
          <Text className='quote-icon'>✨</Text>
          <Text className='quote-text'>{quote}</Text>
        </View>
        
        {/* 魔法羊皮纸卡片 */}
        <View className='parchment-card'>
          {/* 顶部装饰 */}
          <View className='card-decoration top'>
            <View className='deco-line' />
            <Text className='deco-icon'>📜</Text>
            <View className='deco-line' />
          </View>
          
          {/* 事件名称 */}
          <View className='card-header'>
            <Text className='event-name'>{shareData.eventName}</Text>
            <Text className='event-date'>{formatDate(shareData.date)}</Text>
          </View>
          
          {/* 总花费 */}
          <View className='total-section'>
            <View className='total-label'>
              <Text className='label-text'>总花费</Text>
              <View className='label-seal'>
                <Text className='seal-text'>✦</Text>
              </View>
            </View>
            <Text className='total-amount'>¥ {formatAmount(settlementData.totalAmount)}</Text>
            <View className='total-meta'>
              <Text className='meta-item'>共 {settlementData.participantCount} 位巫师</Text>
              <Text className='meta-divider'>·</Text>
              <Text className='meta-item'>{settlementData.billDetails?.length || 0} 笔账单</Text>
            </View>
          </View>
          
          {/* 参与巫师 */}
          <View className='wizards-section'>
            <View className='section-header'>
              <Text className='section-icon'>🧙</Text>
              <Text className='section-title'>参与巫师</Text>
            </View>
            <View className='wizards-grid'>
              {settlementData.participants.map((p, idx) => (
                <View key={idx} className='wizard-card'>
                  <View className='wizard-avatar'>
                    <WizardAvatar name={p.avatar || ''} className='share-size' />
                  </View>
                  <Text className='wizard-name'>{p.name}</Text>
                  <View className='wizard-detail'>
                    <Text className='detail-paid'>付 ¥{formatAmount(p.paid)}</Text>
                    <Text className='detail-should'>应 ¥{formatAmount(p.shouldPay)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
          
          {/* 清算契约 */}
          {settlementData.settlements.length > 0 && (
            <View className='contract-section'>
              <View className='section-header'>
                <Text className='section-icon'>⚖️</Text>
                <Text className='section-title'>清算契约</Text>
              </View>
              <View className='settlement-list'>
                {settlementData.settlements.map((s, idx) => {
                  const fromP = settlementData.participants.find(p => p.name === s.from)
                  const toP = settlementData.participants.find(p => p.name === s.to)
                  return (
                    <View key={idx} className='settlement-item'>
                      <View className='settlement-user from'>
                        <WizardAvatar name={fromP?.avatar || ''} className='small' />
                        <Text className='user-name'>{s.from}</Text>
                      </View>
                      <View className='settlement-arrow'>
                        <Text className='arrow-amount'>¥{formatAmount(s.amount)}</Text>
                        <Text className='arrow-icon'>→</Text>
                      </View>
                      <View className='settlement-user to'>
                        <WizardAvatar name={toP?.avatar || ''} className='small' />
                        <Text className='user-name'>{s.to}</Text>
                      </View>
                    </View>
                  )
                })}
              </View>
            </View>
          )}
          
          {/* 底部装饰 */}
          <View className='card-decoration bottom'>
            <View className='deco-line' />
            <Text className='deco-icon'>✨</Text>
            <View className='deco-line' />
          </View>
        </View>
      </View>
    )
  }

  if (loading) {
    return (
      <View className='share-page loading'>
        <Text className='loading-text'>加载中...</Text>
      </View>
    )
  }

  if (!shareData) {
    return (
      <View className='share-page empty'>
        <View className='empty-content'>
          <Text className='empty-icon'>📜</Text>
          <Text className='empty-text'>分享内容不存在或已过期</Text>
          <Button className='go-home-btn' onClick={goToHome}>开始记账</Button>
        </View>
      </View>
    )
  }

  return (
    <View className='share-page'>
      <ScrollView scrollY className='share-scroll'>
        {shareData.type === 'bill' ? renderBillShare() : renderEventShare()}
        
        <View className='share-footer'>
          <Text className='footer-text'>来自「活点账单」魔法账本</Text>
        </View>
      </ScrollView>
      
      <View className='bottom-bar'>
        <Button className='share-btn' onClick={handleShareClick}>
          <Text className='btn-icon'>📤</Text>
          <Text className='btn-text'>分享给好友</Text>
        </Button>
        <Button className='start-btn' onClick={goToHome}>
          <Text className='btn-icon'>🪄</Text>
          <Text className='btn-text'>我也来施咒记账</Text>
        </Button>
      </View>
    </View>
  )
}