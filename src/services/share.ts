import Taro from '@tarojs/taro'
import { Bill, SubLedger } from '@/types'
import { getBillsBySubLedger, calculateSubLedgerSettlement } from './ledger'
import { getRandomQuote } from '@/constants/quotes'


/**
 * 分享数据接口
 */
export interface ShareBillData {
  eventName: string
  date: number
  billType: 'simple' | 'multi'
  totalAmount: number  // 单位：分
  participantsCount: number
  perPerson: number    // 单位：分
  participants: { id: string; name: string; avatar?: string; paid?: number; shouldPay?: number }[]
  payerId?: string     // 均分咒付款人ID
  payerName?: string   // 均分咒付款人名称
}

export interface ShareEventData {
  eventName: string
  date: number
  bills: Bill[]
  settlementData: ReturnType<typeof calculateSubLedgerSettlement>
}

/**
 * 生成分享链接参数
 * 注意：Bill.totalAmount 单位是分，需要保持一致
 */
export function generateBillShareParams(bill: Bill): string {
  // 找到付款人
  const payerId = bill.details?.payerId
  const payer = bill.details?.participants?.find(p => p.id === payerId)
  
  const shareData: ShareBillData = {
    eventName: bill.eventName,
    date: bill.date,
    billType: bill.type,
    totalAmount: bill.totalAmount,  // 保持分单位
    participantsCount: bill.participantsCount,
    perPerson: Math.round(bill.totalAmount / bill.participantsCount),  // 分单位
    participants: bill.details?.participants?.map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      paid: p.paid || 0,  // 分单位
      shouldPay: Math.round(bill.totalAmount / bill.participantsCount)  // 分单位
    })) || [],
    payerId,
    payerName: payer?.name
  }
  
  return encodeURIComponent(JSON.stringify(shareData))
}

export function generateEventShareParams(subLedger: SubLedger): string {
  const bills = getBillsBySubLedger(subLedger._id)
  const settlementData = calculateSubLedgerSettlement(subLedger._id)
  
  const shareData: ShareEventData = {
    eventName: subLedger.name,
    date: subLedger.date,
    bills: bills,
    settlementData: {
      participants: settlementData.participants,
      settlements: settlementData.settlements,
      totalAmount: settlementData.totalAmount,
      participantCount: settlementData.participantCount,
      billDetails: settlementData.billDetails
    }
  }
  
  return encodeURIComponent(JSON.stringify(shareData))
}

/**
 * 分享单账单
 */
export function shareBill(bill: Bill) {
  const params = generateBillShareParams(bill)
  
  return {
    title: getRandomQuote(),
    path: `/pages/share/index?type=bill&id=${params}`,
    imageUrl: '' // 可以设置分享图片
  }
}

/**
 * 分享事件
 */
export function shareEvent(subLedger: SubLedger) {
  const params = generateEventShareParams(subLedger)
  
  return {
    title: getRandomQuote(),
    path: `/pages/share/index?type=event&id=${params}`,
    imageUrl: '' // 可以设置分享图片
  }
}

/**
 * 调用微信分享（需要用户点击右上角）
 */
export function showShareMenu() {
  Taro.showShareMenu({
    withShareTicket: true
  })
}