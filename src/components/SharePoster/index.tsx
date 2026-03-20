import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useRef } from 'react'
import { Bill, Participant } from '@/types'
import { formatAmount } from '@/utils/settlement'
import { getRandomQuote } from '@/constants/quotes'
import './index.scss'

interface SharePosterProps {
  bill: Bill | null
  visible: boolean
  onClose: () => void
}

export default function SharePoster({ bill, visible, onClose }: SharePosterProps) {
  const quoteRef = useRef('')

  useEffect(() => {
    if (visible && bill) {
      quoteRef.current = getRandomQuote()
    }
  }, [visible, bill])

  const saveAsText = () => {
    if (!bill) return
    
    const quote = quoteRef.current || getRandomQuote()
    
    // 构建分享文本
    let shareText = `🔮 活点记账 - 魔法账单 🔮\n\n`
    shareText += `📜 ${bill.eventName}\n`
    shareText += `💰 总金额：¥${formatAmount(bill.totalAmount)}\n`
    shareText += `👥 参与人数：${bill.participantsCount} 位巫师\n`
    
    if (bill.type === 'simple') {
      shareText += `⚡ 均分咒生效\n`
      shareText += `每人应付：¥${formatAmount(bill.totalAmount / bill.participantsCount)}\n`
    } else {
      shareText += `✨ 清算咒生效\n`
    }
    
    // 添加参与者
    if (bill.details?.participants && bill.details.participants.length > 0) {
      shareText += `\n🧙‍♂️ 参与巫师：\n`
      bill.details.participants.forEach((p: Participant) => {
        shareText += `  • ${p.name}`
        if (p.paid > 0) {
          shareText += ` (支付 ¥${formatAmount(p.paid)})`
        }
        shareText += `\n`
      })
    }
    
    // 添加结算信息
    if (bill.type === 'multi' && bill.details?.settlements && bill.details.settlements.length > 0) {
      shareText += `\n📜 结算方案：\n`
      bill.details.settlements.forEach(s => {
        shareText += `  ${s.from} → ${s.to}: ¥${formatAmount(s.amount)}\n`
      })
    }
    
    // 添加经典台词
    shareText += `\n✨ ${quote}\n`
    shareText += `\n📱 活点记账 - 巫师的AA分账利器`
    
    Taro.setClipboardData({
      data: shareText,
      success: () => {
        Taro.showToast({ title: '已复制，可粘贴分享', icon: 'success' })
      }
    })
  }

  const shareToFriends = () => {
    Taro.showToast({ title: '请点击右上角···分享', icon: 'none' })
  }

  if (!visible || !bill) return null

  const quote = quoteRef.current || getRandomQuote()

  return (
    <View className='share-poster-mask' onClick={onClose}>
      <View className='share-poster-content' onClick={(e) => e.stopPropagation()}>
        <View className='share-poster-header'>
          <Text className='share-title'>分享账单</Text>
          <View className='share-close' onClick={onClose}>
            <Text className='close-icon'>✕</Text>
          </View>
        </View>
        
        {/* 预览卡片 */}
        <View className='share-preview'>
          <View className='preview-header'>
            <Text className='preview-brand'>🔮 活点记账</Text>
          </View>
          
          <View className='preview-event'>{bill.eventName}</View>
          
          <View className='preview-amount'>
            <Text className='amount-label'>总金额</Text>
            <Text className='amount-value'>¥{formatAmount(bill.totalAmount)}</Text>
          </View>
          
          <View className='preview-info'>
            <Text className='info-text'>{bill.participantsCount} 位巫师参与</Text>
            <Text className='info-type'>{bill.type === 'simple' ? '⚡ 均分咒' : '✨ 清算咒'}</Text>
          </View>
          
          {bill.details?.participants && bill.details.participants.length > 0 && (
            <View className='preview-wizards'>
              <Text className='wizards-label'>参与巫师：</Text>
              <Text className='wizards-names'>
                {bill.details.participants.map((p: Participant) => p.name).join(' · ')}
              </Text>
            </View>
          )}
          
          <View className='preview-quote'>
            <Text className='quote-text'>✨ {quote}</Text>
          </View>
          
          <View className='preview-footer'>
            <Text className='footer-text'>📱 活点记账 - 巫师的AA分账利器</Text>
          </View>
        </View>
        
        <View className='share-actions'>
          <Button className='share-btn save-btn' onClick={saveAsText}>
            <Text className='btn-icon'>📋</Text>
            <Text className='btn-text'>复制分享</Text>
          </Button>
          <Button className='share-btn friend-btn' openType='share'>
            <Text className='btn-icon'>📤</Text>
            <Text className='btn-text'>分享好友</Text>
          </Button>
        </View>
      </View>
    </View>
  )
}