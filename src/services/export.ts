/**
 * 导出服务 - 魔法卷轴导出
 * 支持将账单数据导出为CSV格式
 */

import Taro from '@tarojs/taro'
import { Bill } from '@/types'
import { getBills, getArchivedSubLedgers, getBillsBySubLedger } from './ledger'
import { getCompanions } from './companions'

/**
 * 格式化金额（分转元）
 */
const formatAmount = (cents: number): string => {
  return (cents / 100).toFixed(2)
}

/**
 * 格式化日期
 */
const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d} ${h}:${min}`
}

/**
 * 转义CSV字段
 */
const escapeCSV = (field: string | number): string => {
  const str = String(field)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * 导出所有账单为CSV
 */
export function exportAllBills(): boolean {
  try {
    const bills = getBills()
    const companions = getCompanions()

    // CSV表头
    const headers = ['日期', '类型', '事件名称', '总金额', '人数', '参与者', '付款人', '结算详情']

    // 构建CSV行
    const rows = bills.map(bill => {
      const payerName = bill.details?.payerName || ''
      const participants = bill.details?.participants || []

      // 获取同步后的名字
      const getSyncedName = (p: { name: string; avatar?: string }) => {
        const companion = companions.find(c => c.name === p.name)
        if (companion) return companion.name
        const byAvatar = companions.find(c => c.avatar === p.avatar && c.name !== p.name)
        return byAvatar?.name || p.name
      }

      const participantNames = participants.map(p => getSyncedName(p)).join('、')

      // 结算详情
      let settlementDetail = ''
      if (bill.type === 'multi' && bill.details?.settlements) {
        settlementDetail = bill.details.settlements
          .map(s => `${s.from}→${s.to}:¥${formatAmount(s.amount)}`)
          .join('; ')
      } else if (bill.type === 'simple') {
        settlementDetail = `每人¥${formatAmount(bill.totalAmount / bill.participantsCount)}`
      }

      return [
        formatDate(bill.date),
        bill.type === 'simple' ? '均分咒' : '清算咒',
        bill.eventName,
        `¥${formatAmount(bill.totalAmount)}`,
        bill.participantsCount.toString(),
        participantNames,
        payerName,
        settlementDetail
      ].map(escapeCSV).join(',')
    })

    // 构建CSV内容
    const csvContent = [headers.join(','), ...rows].join('\n')

    // 使用微信的文件管理器保存
    const fileName = `魔法账单_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.csv`

    // 创建临时文件路径
    const fs = Taro.getFileSystemManager()
    const filePath = `${Taro.env.USER_DATA_PATH}/${fileName}`

    fs.writeFile({
      path: filePath,
      data: csvContent,
      encoding: 'utf-8',
      success: () => {
        Taro.openDocument({
          filePath: filePath,
          fileType: 'csv',
          showMenu: true,
          success: () => {
            console.log('导出成功')
          },
          fail: (err) => {
            console.error('打开文件失败:', err)
            Taro.showToast({ title: '导出失败', icon: 'none' })
          }
        })
      },
      fail: (err) => {
        console.error('写入文件失败:', err)
        Taro.showToast({ title: '导出失败', icon: 'none' })
      }
    })

    return true
  } catch (error) {
    console.error('导出失败:', error)
    Taro.showToast({ title: '导出失败', icon: 'none' })
    return false
  }
}

/**
 * 导出一个事件的账单
 */
export function exportSubLedger(subLedgerId: string): boolean {
  try {
    const subLedgers = getArchivedSubLedgers()
    const subLedger = subLedgers.find(s => s._id === subLedgerId)

    if (!subLedger) {
      Taro.showToast({ title: '事件不存在', icon: 'none' })
      return false
    }

    const bills = getBillsBySubLedger(subLedgerId)
    const companions = getCompanions()

    // CSV表头
    const headers = ['日期', '类型', '事件名称', '总金额', '人数', '参与者', '付款人', '结算详情']

    // 构建CSV行
    const rows = bills.map(bill => {
      const payerName = bill.details?.payerName || ''
      const participants = bill.details?.participants || []

      const getSyncedName = (p: { name: string; avatar?: string }) => {
        const companion = companions.find(c => c.name === p.name)
        if (companion) return companion.name
        const byAvatar = companions.find(c => c.avatar === p.avatar && c.name !== p.name)
        return byAvatar?.name || p.name
      }

      const participantNames = participants.map(p => getSyncedName(p)).join('、')

      let settlementDetail = ''
      if (bill.type === 'multi' && bill.details?.settlements) {
        settlementDetail = bill.details.settlements
          .map(s => `${s.from}→${s.to}:¥${formatAmount(s.amount)}`)
          .join('; ')
      } else if (bill.type === 'simple') {
        settlementDetail = `每人¥${formatAmount(bill.totalAmount / bill.participantsCount)}`
      }

      return [
        formatDate(bill.date),
        bill.type === 'simple' ? '均分咒' : '清算咒',
        bill.eventName,
        `¥${formatAmount(bill.totalAmount)}`,
        bill.participantsCount.toString(),
        participantNames,
        payerName,
        settlementDetail
      ].map(escapeCSV).join(',')
    })

    // 添加汇总行
    const totalAmount = bills.reduce((sum, b) => sum + b.totalAmount, 0)
    rows.push('') // 空行
    rows.push(escapeCSV(`汇总,,,¥${formatAmount(totalAmount)},${bills.length}笔,,,`))

    // 构建CSV内容
    const csvContent = [headers.join(','), ...rows].join('\n')

    // 使用微信的文件管理器保存
    const fileName = `${subLedger.name}_账单_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.csv`
    const fs = Taro.getFileSystemManager()
    const filePath = `${Taro.env.USER_DATA_PATH}/${fileName}`

    fs.writeFile({
      path: filePath,
      data: csvContent,
      encoding: 'utf-8',
      success: () => {
        Taro.openDocument({
          filePath: filePath,
          fileType: 'csv',
          showMenu: true,
          success: () => {
            Taro.showToast({ title: '导出成功', icon: 'success' })
          },
          fail: (err) => {
            console.error('打开文件失败:', err)
            Taro.showToast({ title: '导出失败', icon: 'none' })
          }
        })
      },
      fail: (err) => {
        console.error('写入文件失败:', err)
        Taro.showToast({ title: '导出失败', icon: 'none' })
      }
    })

    return true
  } catch (error) {
    console.error('导出失败:', error)
    Taro.showToast({ title: '导出失败', icon: 'none' })
    return false
  }
}