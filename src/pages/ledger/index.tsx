import { View, Text, Input, ScrollView, Button, Image } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { SubLedger, Bill, EventMember } from '@/types'
import { 
  getActiveSubLedgers, 
  createSubLedger, 
  updateSubLedger, 
  deleteSubLedger,
  archiveSubLedger,
  getBillsBySubLedger,
  getRandomEventName,
  calculateSubLedgerSettlement,
  getSubLedgerParticipants,
  saveSubLedgerSettledStatus,
  getSubLedgerSettledStatus,
  ParticipantSettlement,
  BillSettlementDetail,
  addMemberToSubLedger,
  removeMemberFromSubLedger,
  getSubLedgerMembers
} from '@/services/ledger'
import { getCompanions, addCompanion } from '@/services/companions'
import { shareEvent } from '@/services/share'
import { createContract, cloudLogin, getContractDetail } from '@/services/cloud'
import { formatAmount } from '@/utils/settlement'
import { onWizardInfoChanged, WizardInfoChangeData } from '@/services/events'
import WizardAvatar from '@/components/WizardAvatar'
import NewbieGuide, { shouldShowGuide } from '@/components/NewbieGuide'
import UserLogin from '@/components/UserLogin'
import { useUser } from '@/contexts/UserContext'
import './index.scss'

export default function LedgerPage() {
  const { user, isLogged, userCompanion } = useUser()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [subLedgers, setSubLedgers] = useState<SubLedger[]>([])
  const [selectedSubLedger, setSelectedSubLedger] = useState<SubLedger | null>(null)
  const [subLedgerBills, setSubLedgerBills] = useState<Bill[]>([])
  const [settlementData, setSettlementData] = useState<ReturnType<typeof calculateSubLedgerSettlement> | null>(null)
  
  // 账单详情弹窗
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null)
  const [billDetail, setBillDetail] = useState<BillSettlementDetail | null>(null)
  
  // 计算过程折叠状态
  const [showCalcProcess, setShowCalcProcess] = useState(false)
  
  // 结清状态
  const [settledStatus, setSettledStatus] = useState<Record<string, boolean>>({})
  
  // 创建子收支录
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newSubLedgerName, setNewSubLedgerName] = useState('')
  const [enableCloudSync, setEnableCloudSync] = useState(false)  // 云端同步开关
  
  // 编辑子收支录名称
  const [showEditModal, setShowEditModal] = useState(false)
  const [editSubLedgerId, setEditSubLedgerId] = useState('')
  const [editSubLedgerName, setEditSubLedgerName] = useState('')
  
  // 新手引导
  const [showGuide, setShowGuide] = useState(false)

  // 邀请相关
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [currentInviteCode, setCurrentInviteCode] = useState('')
  const [currentInviteName, setCurrentInviteName] = useState('')
  const [inviteMode, setInviteMode] = useState<'new' | 'existing'>('existing')
  const [inviteLink, setInviteLink] = useState('')
  const [creatingContract, setCreatingContract] = useState(false)

  // 添加自定义巫师相关
  const [showAddWizard, setShowAddWizard] = useState(false)
  const [newWizardName, setNewWizardName] = useState('')
  const [newWizardAvatar, setNewWizardAvatar] = useState('')
  
  // 邀请目标成员（用于升级自定义巫师）
  const [inviteTargetMember, setInviteTargetMember] = useState<EventMember | null>(null)

  // 显示邀请弹窗（新建后邀请）
  const openInviteForNew = async (subLedger: SubLedger) => {
    setCurrentInviteSubLedger(subLedger)
    setInviteMode('new')
    setShowInviteModal(true)
  }

  // 显示邀请弹窗（已有事件邀请）
  const handleShowInvite = async (subLedger: SubLedger) => {
    if (!subLedger.cloudId) {
      Taro.showToast({ title: '该事件未开启共享', icon: 'none' })
      return
    }

    try {
      const res = await getContractDetail(subLedger.cloudId)
      if (res.success && res.data?.contract) {
        setCurrentInviteCode(res.data.contract.inviteCode || '')
        setCurrentInviteName(subLedger.name)
        setInviteMode('existing')
        setShowInviteModal(true)
      } else {
        Taro.showToast({ title: '获取邀请码失败', icon: 'none' })
      }
    } catch (e) {
      console.error('[Invite] 获取邀请码失败', e)
      Taro.showToast({ title: '获取邀请码失败', icon: 'none' })
    }
  }

  // 关闭邀请弹窗
  const closeInviteModal = () => {
    setShowInviteModal(false)
    setCurrentInviteSubLedger(null)
    setCurrentInviteCode('')
    setInviteLink('')
    setShowAddWizard(false)
    setNewWizardName('')
    setNewWizardAvatar('')
    setInviteTargetMember(null)
    setCreatingContract(false)
  }

  // 添加自定义巫师到事件
  const handleAddWizardToRoom = () => {
    if (!newWizardName.trim()) {
      Taro.showToast({ title: '请输入巫师名字', icon: 'none' })
      return
    }

    // 添加到休息室
    const newCompanion = addCompanion({
      name: newWizardName.trim(),
      avatar: newWizardAvatar || '🧙'
    })

    // 添加到事件成员列表
    if (currentInviteSubLedger) {
      const member = addMemberToSubLedger(currentInviteSubLedger._id, {
        name: newWizardName.trim(),
        avatar: newWizardAvatar || '🧙',
        type: 'custom'
      })
      
      if (member) {
        Taro.showToast({ title: '已添加成员', icon: 'success' })
      } else {
        Taro.showToast({ title: '该成员已存在', icon: 'none' })
      }
    }

    setShowAddWizard(false)
    setNewWizardName('')
    setNewWizardAvatar('')
    loadData()
  }

  // 发送微信邀请（自动创建云端契约并直接分享）
  const handleSendInvite = async () => {
    const subLedger = currentInviteSubLedger
    if (!subLedger) return

    setCreatingContract(true)
    try {
      // 如果还没有cloudId，先创建云端契约
      if (!subLedger.cloudId) {
        const loginResult = await cloudLogin()
        if (!loginResult.success || !loginResult.data) {
          Taro.showToast({ title: '请先登录', icon: 'none' })
          setCreatingContract(false)
          return
        }

        const contractResult = await createContract(subLedger.name)
        if (contractResult.success && contractResult.data?.contract) {
          // 更新本地事件的cloudId
          updateSubLedger(subLedger._id, { cloudId: contractResult.data.contract._id })
          setCurrentInviteSubLedger({ ...subLedger, cloudId: contractResult.data.contract._id })
          setCurrentInviteCode(contractResult.data.contract.inviteCode || '')
          Taro.showToast({ title: '已开启云端共享', icon: 'success' })
          loadData()
          
          // 直接复制链接并提示用户分享
          const inviteCode = contractResult.data.contract.inviteCode
          if (inviteCode) {
            const shareLink = `magic-bill://join?code=${inviteCode}`
            Taro.setClipboardData({
              data: shareLink,
              success: () => {
                Taro.showModal({
                  title: '邀请链接已复制',
                  content: `链接 ${shareLink} 已复制到剪贴板，发送给微信好友即可邀请加入「${subLedger.name}」`,
                  showCancel: false,
                  confirmText: '知道了'
                })
              }
            })
          }
        } else {
          Taro.showToast({ title: '开启共享失败', icon: 'none' })
        }
      } else {
        // 已有cloudId，获取邀请码并生成链接
        let inviteCode = currentInviteCode
        if (!inviteCode) {
          const res = await getContractDetail(subLedger.cloudId)
          if (res.success && res.data?.contract) {
            inviteCode = res.data.contract.inviteCode || ''
            setCurrentInviteCode(inviteCode)
          }
        }
        
        if (inviteCode) {
          const shareLink = `magic-bill://join?code=${inviteCode}`
          Taro.setClipboardData({
            data: shareLink,
            success: () => {
              Taro.showModal({
                title: '邀请链接已复制',
                content: `链接 ${shareLink} 已复制到剪贴板，发送给微信好友即可邀请加入「${subLedger.name}」`,
                showCancel: false,
                confirmText: '知道了'
              })
            }
          })
        }
      }
    } catch (e) {
      console.error('[Invite] 创建云端契约失败', e)
      Taro.showToast({ title: '邀请失败', icon: 'none' })
    } finally {
      setCreatingContract(false)
    }
  }

  // 复制邀请链接
  const handleCopyInviteLink = () => {
    if (currentInviteCode) {
      const shareLink = `magic-bill://join?code=${currentInviteCode}`
      Taro.setClipboardData({
        data: shareLink,
        success: () => {
          Taro.showToast({ title: '邀请链接已复制', icon: 'success' })
        }
      })
    }
  }

  // 将巫师关联到事件
  const linkWizardToSubLedger = (subLedgerId: string, wizardName: string) => {
    // 本地实现：巫师名称存储在事件的参与者中
    // 这里简化处理，实际可以从账单中获取
  }
  
  useDidShow(() => {
    loadData()
  })
  
  // 检查是否需要显示新手引导
  useEffect(() => {
    if (shouldShowGuide('ledger')) {
      setTimeout(() => setShowGuide(true), 500)
    }
  }, [])

  // 监听巫师信息变更事件（实时同步结算数据）
  useEffect(() => {
    const unsubscribe = onWizardInfoChanged((data: WizardInfoChangeData) => {
      // 如果有打开的结算详情，重新计算
      if (selectedSubLedger) {
        const newSettlementData = calculateSubLedgerSettlement(selectedSubLedger._id)
        setSettlementData(newSettlementData)
      }
    })
    return unsubscribe
  }, [selectedSubLedger])

  const loadData = () => {
    setSubLedgers(getActiveSubLedgers())
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  // 格式化短日期
  const formatShortDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${m}-${d}`
  }

  // 打开子收支录详情（显示结算方案）
  const openSubLedgerDetail = (subLedger: SubLedger) => {
    setSelectedSubLedger(subLedger)
    setSubLedgerBills(getBillsBySubLedger(subLedger._id))
    setSettlementData(calculateSubLedgerSettlement(subLedger._id))
    // 加载结清状态
    setSettledStatus(getSubLedgerSettledStatus(subLedger._id))
    setShowCalcProcess(true) // 默认展开计算过程
  }

  // 关闭子收支录详情
  const closeSubLedgerDetail = () => {
    setSelectedSubLedger(null)
    setSubLedgerBills([])
    setSettlementData(null)
    setSettledStatus({})
  }
  
  // 切换结清状态
  const toggleSettledStatus = (participantId: string) => {
    const newStatus = {
      ...settledStatus,
      [participantId]: !settledStatus[participantId]
    }
    setSettledStatus(newStatus)
    if (selectedSubLedger) {
      saveSubLedgerSettledStatus(selectedSubLedger._id, newStatus)
    }
  }

  // 快速结算（直接在卡片显示结算信息）
  const quickSettle = (subLedger: SubLedger, e: any) => {
    e.stopPropagation()
    openSubLedgerDetail(subLedger)
  }

  // 打开创建弹窗
  const openCreateModal = () => {
    setNewSubLedgerName(getRandomEventName())
    setShowCreateModal(true)
  }

  // 确认创建
  const confirmCreate = async () => {
    if (!newSubLedgerName.trim()) {
      Taro.showToast({ title: '请输入名称', icon: 'none' })
      return
    }

    // 先确保登录（获取用户信息）
    const loginResult = await cloudLogin()

    // 创建本地事件，创建者作为第一个成员
    const newSubLedger = createSubLedger(
      newSubLedgerName.trim(),
      loginResult.data?.userId,
      userCompanion?.name || '创建者',
      userCompanion?.avatar || '🧙'
    )

    setShowCreateModal(false)
    setNewSubLedgerName('')
    setEnableCloudSync(false)
    loadData()

    Taro.showToast({ title: '创建成功', icon: 'success' })

    // 立即打开邀请界面（添加成员）
    setCurrentInviteSubLedger(newSubLedger)
    setShowInviteModal(true)
  }

  // 当前正在邀请的事件
  const [currentInviteSubLedger, setCurrentInviteSubLedger] = useState<SubLedger | null>(null)

  // 打开编辑弹窗
  const openEditModal = (subLedger: SubLedger) => {
    setEditSubLedgerId(subLedger._id)
    setEditSubLedgerName(subLedger.name)
    setShowEditModal(true)
  }

  // 确认编辑
  const confirmEdit = () => {
    if (!editSubLedgerName.trim()) {
      Taro.showToast({ title: '请输入名称', icon: 'none' })
      return
    }
    updateSubLedger(editSubLedgerId, { name: editSubLedgerName.trim() })
    setShowEditModal(false)
    loadData()
    if (selectedSubLedger && selectedSubLedger._id === editSubLedgerId) {
      setSelectedSubLedger({ ...selectedSubLedger, name: editSubLedgerName.trim() })
    }
    Taro.showToast({ title: '修改成功', icon: 'success' })
  }

  // 归档子收支录
  const handleArchive = (subLedger: SubLedger) => {
    Taro.showModal({
      title: '确认归档',
      content: `确定要归档「${subLedger.name}」吗？归档后将移至冥想盆。`,
      success: (res) => {
        if (res.confirm) {
          archiveSubLedger(subLedger._id)
          loadData()
          if (selectedSubLedger && selectedSubLedger._id === subLedger._id) {
            closeSubLedgerDetail()
          }
          Taro.showToast({ title: '已归档', icon: 'success' })
        }
      }
    })
  }

  // 遗忘子收支录
  const handleDelete = (subLedger: SubLedger) => {
    Taro.showModal({
      title: '确认遗忘',
      content: `确定要遗忘「${subLedger.name}」吗？此操作不可恢复。`,
      success: (res) => {
        if (res.confirm) {
          deleteSubLedger(subLedger._id)
          loadData()
          if (selectedSubLedger && selectedSubLedger._id === subLedger._id) {
            closeSubLedgerDetail()
          }
          Taro.showToast({ title: '已遗忘', icon: 'success' })
        }
      }
    })
  }

  // 分享事件
  const handleShareEvent = (subLedger: SubLedger) => {
    const shareInfo = shareEvent(subLedger)
    
    // 跳转到分享页面
    Taro.navigateTo({
      url: `/pages/share/index?type=event&id=${shareInfo.path.split('id=')[1]}`
    })
  }

  // 开始记账
  const startAccounting = () => {
    // 检查是否有活跃事件，如果有，则直接开启最近一个活跃事件的连续记账模式
    const activeSubLedgers = getActiveSubLedgers()
    if (activeSubLedgers.length > 0) {
      // 默认取最新的一个
      Taro.setStorageSync('active_accounting_subledger_id', activeSubLedgers[0]._id)
    }
    Taro.switchTab({ url: '/pages/index/index' })
  }

  // 获取事件参与者（用于卡片显示），同步最新头像
  const getParticipants = (subLedgerId: string) => {
    const rawParticipants = getSubLedgerParticipants(subLedgerId)
    const freshCompanions = getCompanions()

    // 同步最新头像
    return rawParticipants.map(p => {
      const companion = freshCompanions.find(c => c.name === p.name)
      if (companion) {
        return { name: companion.name, avatar: companion.avatar || p.avatar }
      }
      // 如果名字没匹配，尝试按头像匹配（可能是名字改了）
      const byAvatar = freshCompanions.find(c => c.avatar === p.avatar && c.name !== p.name)
      if (byAvatar) {
        return { name: byAvatar.name, avatar: byAvatar.avatar }
      }
      return p
    })
  }

  // 渲染结算详情
  const renderSettlementDetail = () => {
    if (!settlementData || !selectedSubLedger) return null

    // 从伙伴列表同步最新头像和名字
    const freshCompanions = getCompanions()

    // 同步巫师信息：如果名字变了，返回新名字和新头像
    const syncWizardInfo = (name: string, avatar: string): { name: string; avatar: string } => {
      // 先按名字匹配
      let companion = freshCompanions.find(c => c.name === name)
      if (companion) {
        return { name: companion.name, avatar: companion.avatar || avatar }
      }
      // 如果名字没匹配到，尝试按头像匹配（名字可能被改了）
      companion = freshCompanions.find(c => c.avatar === avatar && c.name !== name)
      if (companion) {
        return { name: companion.name, avatar: companion.avatar }
      }
      return { name, avatar }
    }

    // 兼容旧的 syncAvatar 调用
    const syncAvatar = (name: string, originalAvatar: string): string => {
      return syncWizardInfo(name, originalAvatar).avatar
    }

    return (
      <View className='settlement-detail'>
        {/* 总览 */}
        <View className='settlement-summary'>
          <View className='summary-item'>
            <Text className='summary-label'>消耗金加隆</Text>
            <Text className='summary-value'>¥{formatAmount(settlementData.totalAmount)}</Text>
          </View>
          <View className='summary-item'>
            <Text className='summary-label'>参与人数</Text>
            <Text className='summary-value'>{settlementData.participantCount}人</Text>
          </View>
          <View className='summary-item'>
            <Text className='summary-label'>人均</Text>
            <Text className='summary-value'>¥{formatAmount(settlementData.participantCount > 0 ? settlementData.totalAmount / settlementData.participantCount : 0)}</Text>
          </View>
        </View>

        {/* 账单记录（可点击查看详情）- 放在最前面 */}
        {subLedgerBills.length > 0 && (
          <View className='bills-section'>
            <Text className='section-title'>账单记录 ({subLedgerBills.length}笔)</Text>
            <ScrollView scrollY className='bills-scroll'>
              {subLedgerBills.map((bill) => {
                const billDetail = settlementData.billDetails?.find(bd => bd.billId === bill._id)
                return (
                  <View 
                    key={bill._id} 
                    className='bill-item'
                    hoverClass='bill-item-hover'
                    onClick={() => {
                      console.log('点击账单记录:', bill.eventName, bill._id)
                      // 先设置 billDetail，再设置 selectedBill
                      // 这样可以在渲染弹窗时保证数据可用
                      setBillDetail(billDetail || null)
                      setTimeout(() => {
                        setSelectedBill(bill)
                      }, 10)
                    }}
                  >
                    <View className='bill-type'>
                      <Text className='type-icon'>{bill.type === 'simple' ? '⚡' : '✨'}</Text>
                    </View>
                    <View className='bill-info'>
                      <Text className='bill-event'>{bill.eventName}</Text>
                      <Text className='bill-meta'>{bill.participantsCount}人参与 · 人均¥{formatAmount(bill.participantsCount > 0 ? bill.totalAmount / bill.participantsCount : 0)}</Text>
                    </View>
                    <Text className='bill-amount'>¥{formatAmount(bill.totalAmount)}</Text>
                    <Text className='bill-arrow'>›</Text>
                  </View>
                )
              })}
            </ScrollView>
          </View>
        )}

        {/* 参与者明细 - 以巫师为核心显示应收/付关系 */}
        {settlementData.settlements && settlementData.settlements.length > 0 && (
          <View className='participants-section'>
            <Text className='section-title'>收支明细</Text>
            <Text className='section-hint'>每位巫师的转账安排</Text>
            <View className='wizard-settlements-list'>
              {settlementData.participants
                .filter(p => {
                  // 只显示有转账安排的巫师（需要支付或需要收款）
                  const hasPayment = settlementData.settlements.some(s => s.from === p.name)
                  const hasReceive = settlementData.settlements.some(s => s.to === p.name)
                  return hasPayment || hasReceive
                })
                .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
                .map((participant) => {
                  // 找出该巫师需要支付给谁或从谁收取
                  const needsToPay = settlementData.settlements
                    .filter(s => s.from === participant.name)
                    .map(s => ({
                      to: s.to,
                      amount: s.amount,
                      toParticipant: settlementData.participants.find(p => p.name === s.to)
                    }))
                  
                  const needsToReceive = settlementData.settlements
                    .filter(s => s.to === participant.name)
                    .map(s => ({
                      from: s.from,
                      amount: s.amount,
                      fromParticipant: settlementData.participants.find(p => p.name === s.from)
                    }))
                  
                  const isReceiver = participant.balance > 0
                  const isSettled = settledStatus[participant.id] || false
                  
                  return (
                    <View
                      key={participant.id}
                      className={`wizard-settlement-card ${isReceiver ? 'receiver' : 'payer'}`}
                      onClick={() => toggleSettledStatus(participant.id)}
                    >
                      <View className='wizard-header'>
                        <View className='wizard-info'>
                          <WizardAvatar name={syncAvatar(participant.name, participant.avatar || '')} className='small' />
                          <Text className='wizard-name'>{syncWizardInfo(participant.name, participant.avatar || '').name}</Text>
                          {isSettled && <View className='settled-badge'>✓</View>}
                        </View>
                        <View className={`balance-tag ${isReceiver ? 'receive' : 'pay'}`}>
                          <Text className='balance-label'>{isReceiver ? '应收' : '应付'}</Text>
                          <Text className='balance-amount'>¥{formatAmount(Math.abs(participant.balance))}</Text>
                        </View>
                      </View>

                      {/* 金额明细：垫付和消费 */}
                      <View className='amount-summary'>
                        <View className='amount-item'>
                          <Text className='amount-label'>垫付</Text>
                          <Text className='amount-value paid'>¥{formatAmount(participant.paid)}</Text>
                        </View>
                        <View className='amount-divider'></View>
                        <View className='amount-item'>
                          <Text className='amount-label'>消费</Text>
                          <Text className='amount-value consumed'>¥{formatAmount(participant.shouldPay)}</Text>
                        </View>
                      </View>

                      {/* 需要支付给谁 */}
                      {needsToPay.length > 0 && (
                        <View className='settlement-details'>
                          <Text className='detail-label'>需支付给：</Text>
                          {needsToPay.map((item, idx) => {
                            const toInfo = syncWizardInfo(item.to, item.toParticipant?.avatar || '')
                            return (
                            <View key={idx} className='detail-row pay-row'>
                              <View className='target-wizard'>
                                <WizardAvatar name={toInfo.avatar} className='tiny' />
                                <Text className='target-name'>{toInfo.name}</Text>
                              </View>
                              <Text className='detail-amount'>¥{formatAmount(item.amount)}</Text>
                            </View>
                          )})}
                        </View>
                      )}

                      {/* 将从谁收到 */}
                      {needsToReceive.length > 0 && (
                        <View className='settlement-details'>
                          <Text className='detail-label'>将收到来自：</Text>
                          {needsToReceive.map((item, idx) => {
                            const fromInfo = syncWizardInfo(item.from, item.fromParticipant?.avatar || '')
                            return (
                            <View key={idx} className='detail-row receive-row'>
                              <View className='target-wizard'>
                                <WizardAvatar name={fromInfo.avatar} className='tiny' />
                                <Text className='target-name'>{fromInfo.name}</Text>
                              </View>
                              <Text className='detail-amount'>¥{formatAmount(item.amount)}</Text>
                            </View>
                          )})}
                        </View>
                      )}
                      
                      {/* 结清状态提示 */}
                      <View className='settle-status-hint'>
                        <Text className='hint-text'>{isSettled ? '已结清 ✓' : '点击确认结清'}</Text>
                      </View>
                    </View>
                  )
                })}
            </View>
          </View>
        )}

        {/* 计算过程 - 表格形式 */}
        {settlementData.participants.length > 0 && (
          <View className='calc-process-section'>
            <View 
              className='section-header clickable' 
              onClick={() => setShowCalcProcess(!showCalcProcess)}
            >
              <Text className='section-title'>计算过程</Text>
              <Text className='toggle-icon'>{showCalcProcess ? '▼' : '▶'}</Text>
            </View>
            
            {showCalcProcess && (
              <View className='calc-process-content'>
                {/* 表格表头 */}
                <View className='calc-table-header'>
                  <Text className='th-avatar'></Text>
                  <Text className='th-name'>巫师</Text>
                  <Text className='th-paid'>垫付(¥)</Text>
                  <Text className='th-consumed'>消费(¥)</Text>
                  <Text className='th-balance'>结算(¥)</Text>
                </View>
                
                {/* 表格内容 */}
                <View className='calc-table-body'>
                  {settlementData.participants.map((p) => {
                    const isReceive = p.balance > 1
                    const isPay = p.balance < -1
                    const isSettled = settledStatus[p.id] || false
                    
                    return (
                      <View key={p.id} className={`calc-table-row ${isReceive ? 'row-receive' : isPay ? 'row-pay' : ''}`}>
                        <View className='td-avatar'>
                          <WizardAvatar name={syncAvatar(p.name, p.avatar || '')} className='small' />
                        </View>
                        <Text className='td-name'>{p.name}</Text>
                        <Text className='td-paid'>{formatAmount(p.paid)}</Text>
                        <Text className='td-consumed'>{formatAmount(p.shouldPay)}</Text>
                        <View className='td-balance-wrapper'>
                          {isSettled ? (
                            <Text className='td-balance zero'>已结清</Text>
                          ) : isReceive ? (
                            <>
                              <Text className='balance-label-text receive'>收</Text>
                              <Text className='td-balance positive'>{formatAmount(p.balance)}</Text>
                            </>
                          ) : isPay ? (
                            <>
                              <Text className='balance-label-text pay'>付</Text>
                              <Text className='td-balance negative'>{formatAmount(Math.abs(p.balance))}</Text>
                            </>
                          ) : (
                            <Text className='td-balance zero'>平账</Text>
                          )}
                        </View>
                      </View>
                    )
                  })}
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    )
  }

  // 渲染账单详情弹窗（与施咒后结果卡片一致）
  const renderBillDetailModal = () => {
    if (!selectedBill) return null

    const perPerson = selectedBill.participantsCount > 0
      ? Math.round(selectedBill.totalAmount / selectedBill.participantsCount)
      : 0
    const payerId = selectedBill.details?.payerId
    const participants = selectedBill.details?.participants || []

    // 从伙伴列表同步最新头像和名字
    const freshCompanions = getCompanions()

    const syncWizardInfo = (name: string, avatar: string): { name: string; avatar: string } => {
      let companion = freshCompanions.find(c => c.name === name)
      if (companion) {
        return { name: companion.name, avatar: companion.avatar || avatar }
      }
      companion = freshCompanions.find(c => c.avatar === avatar && c.name !== name)
      if (companion) {
        return { name: companion.name, avatar: companion.avatar }
      }
      return { name, avatar }
    }

    const syncAvatar = (name: string, originalAvatar: string): string => {
      return syncWizardInfo(name, originalAvatar).avatar
    }

    const payer = participants.find(p => p.id === payerId)
    
    return (
      <View className='result-mask' onClick={() => {
        setSelectedBill(null)
        setBillDetail(null)
      }}>
        <View className='result-card' onClick={(e) => e.stopPropagation()}>
          {/* 均分咒详情 */}
          {selectedBill.type === 'simple' ? (
            <>
              <View className='result-header'>
                <Text className='result-title'>⚡ 均分咒</Text>
                <View className='result-close' onClick={() => {
                  setSelectedBill(null)
                  setBillDetail(null)
                }}>
                  <Text className='close-icon'>✕</Text>
                </View>
              </View>
              
              <View className='result-event'>{selectedBill.eventName}</View>
              
              <View className='result-main'>
                <Text className='result-label'>每位巫师需支付</Text>
                <Text className='result-amount'>¥{formatAmount(perPerson)}</Text>
              </View>
              
              <View className='result-details'>
                <View className='detail-item'>
                  <Text className='detail-label'>总金额</Text>
                  <Text className='detail-value'>¥{formatAmount(selectedBill.totalAmount)}</Text>
                </View>
                <View className='detail-item'>
                  <Text className='detail-label'>参与人数</Text>
                  <Text className='detail-value'>{selectedBill.participantsCount}人</Text>
                </View>
                {payer && (
                  <View className='detail-item'>
                    <Text className='detail-label'>付款人</Text>
                    <Text className='detail-value highlight'>{payer.name}</Text>
                  </View>
                )}
              </View>

              {/* 支付记录 - 每个巫师的垫付和消费 */}
              <View className='payment-records-section'>
                <Text className='section-title'>支付记录</Text>
                <View className='payment-records-list'>
                  {participants.map((p) => {
                    const paid = p.paid || 0
                    const consumed = perPerson
                    const balance = paid - consumed
                    const isPayer = p.id === payerId
                    const syncedInfo = syncWizardInfo(p.name, p.avatar || '')
                    return (
                      <View key={p.id} className={`payment-record-item ${isPayer ? 'is-payer' : ''}`}>
                        <View className='record-user'>
                          <WizardAvatar name={syncedInfo.avatar} className='small' />
                          <Text className='record-name'>{syncedInfo.name}</Text>
                          {isPayer && <Text className='payer-tag'>付款人</Text>}
                        </View>
                        <View className='record-amounts'>
                          <View className='record-amount-item'>
                            <Text className='record-label'>垫付</Text>
                            <Text className={`record-value ${paid > 0 ? 'positive' : ''}`}>¥{formatAmount(paid)}</Text>
                          </View>
                          <View className='record-amount-item'>
                            <Text className='record-label'>消费</Text>
                            <Text className='record-value'>¥{formatAmount(consumed)}</Text>
                          </View>
                          <View className='record-amount-item'>
                            <Text className='record-label'>{balance >= 0 ? '应收' : '应付'}</Text>
                            <Text className={`record-value ${balance >= 0 ? 'receive' : 'pay'}`}>
                              ¥{formatAmount(Math.abs(balance))}
                            </Text>
                          </View>
                        </View>
                      </View>
                    )
                  })}
                </View>
              </View>

              {/* 清算契约 */}
              {payer && payerId && (
                <View className='settlements-section'>
                  <Text className='section-title'>清算契约</Text>
                  {participants.filter(p => p.id !== payerId).length === 0 ? (
                    <Text className='no-settlement'>付款人已支付全部金额</Text>
                  ) : (
                    participants.filter(p => p.id !== payerId).map((p, idx) => {
                      const pInfo = syncWizardInfo(p.name, p.avatar || '')
                      const payerInfo = syncWizardInfo(payer.name, payer.avatar || '')
                      return (
                      <View key={idx} className='settlement-item'>
                        <View className='settlement-user'>
                          <WizardAvatar name={pInfo.avatar} />
                          <Text className='user-name'>{pInfo.name}</Text>
                        </View>
                        <View className='settlement-arrow'>
                          <Text className='arrow-amount'>¥{formatAmount(perPerson)}</Text>
                          <Text className='arrow-icon'>→</Text>
                        </View>
                        <View className='settlement-user'>
                          <WizardAvatar name={payerInfo.avatar} />
                          <Text className='user-name'>{payerInfo.name}</Text>
                        </View>
                      </View>
                    )})
                  )}
                </View>
              )}

              <View className='result-wizards'>
                <Text className='section-title'>参与巫师</Text>
                <View className='wizards-grid'>
                  {participants.map((p) => {
                    const pInfo = syncWizardInfo(p.name, p.avatar || '')
                    return (
                    <View key={p.id} className={`result-wizard-item ${p.id === payerId ? 'is-payer' : ''}`}>
                      <WizardAvatar name={pInfo.avatar} />
                      <Text className='result-wizard-name'>{pInfo.name}</Text>
                      {p.id === payerId && <Text className='payer-badge'>付款人</Text>}
                    </View>
                  )})}
                </View>
              </View>
            </>
          ) : (
            <>
              {/* 清算咒详情 */}
              <View className='result-header'>
                <Text className='result-title'>✨ 清算咒</Text>
                <View className='result-close' onClick={() => {
                  setSelectedBill(null)
                  setBillDetail(null)
                }}>
                  <Text className='close-icon'>✕</Text>
                </View>
              </View>

              <View className='result-event'>{selectedBill.eventName}</View>

              <View className='result-main'>
                <Text className='result-label'>总支出</Text>
                <Text className='result-amount'>¥{formatAmount(selectedBill.totalAmount)}</Text>
              </View>

              {/* 支付记录 - 每个巫师的垫付和消费 */}
              <View className='payment-records-section'>
                <Text className='section-title'>支付记录</Text>
                <View className='payment-records-list'>
                  {participants.map((p) => {
                    const paid = p.paid || 0
                    const consumed = p.shouldPay || 0
                    const balance = paid - consumed
                    const syncedInfo = syncWizardInfo(p.name, p.avatar || '')
                    return (
                      <View key={p.id} className='payment-record-item'>
                        <View className='record-user'>
                          <WizardAvatar name={syncedInfo.avatar} className='small' />
                          <Text className='record-name'>{syncedInfo.name}</Text>
                        </View>
                        <View className='record-amounts'>
                          <View className='record-amount-item'>
                            <Text className='record-label'>垫付</Text>
                            <Text className={`record-value ${paid > 0 ? 'positive' : ''}`}>¥{formatAmount(paid)}</Text>
                          </View>
                          <View className='record-amount-item'>
                            <Text className='record-label'>消费</Text>
                            <Text className='record-value'>¥{formatAmount(consumed)}</Text>
                          </View>
                          <View className='record-amount-item'>
                            <Text className='record-label'>{balance >= 0 ? '应收' : '应付'}</Text>
                            <Text className={`record-value ${balance >= 0 ? 'receive' : 'pay'}`}>
                              ¥{formatAmount(Math.abs(balance))}
                            </Text>
                          </View>
                        </View>
                      </View>
                    )
                  })}
                </View>
              </View>

              {/* 结算方案 */}
              {selectedBill.details?.settlements && selectedBill.details.settlements.length > 0 && (
                <View className='settlements-section'>
                  <Text className='section-title'>清算契约</Text>
                  {selectedBill.details.settlements.map((s, idx) => {
                    const fromP = participants.find(p => p.name === s.from)
                    const toP = participants.find(p => p.name === s.to)
                    const fromInfo = syncWizardInfo(s.from, fromP?.avatar || '')
                    const toInfo = syncWizardInfo(s.to, toP?.avatar || '')
                    return (
                      <View key={idx} className='settlement-item'>
                        <View className='settlement-user'>
                          <WizardAvatar name={fromInfo.avatar} />
                          <Text className='user-name'>{fromInfo.name}</Text>
                        </View>
                        <View className='settlement-arrow'>
                          <Text className='arrow-amount'>¥{formatAmount(s.amount)}</Text>
                          <Text className='arrow-icon'>→</Text>
                        </View>
                        <View className='settlement-user'>
                          <WizardAvatar name={toInfo.avatar} />
                          <Text className='user-name'>{toInfo.name}</Text>
                        </View>
                      </View>
                    )
                  })}
                </View>
              )}

              <View className='result-wizards'>
                <Text className='section-title'>参与巫师</Text>
                <View className='wizards-grid'>
                  {participants.map((p) => {
                    const pInfo = syncWizardInfo(p.name, p.avatar || '')
                    return (
                    <View key={p.id} className='result-wizard-item'>
                      <WizardAvatar name={pInfo.avatar} />
                      <Text className='result-wizard-name'>{pInfo.name}</Text>
                    </View>
                  )})}
                </View>
              </View>
            </>
          )}

          <View className='result-actions'>
            <Button className='result-confirm-btn' onClick={() => {
              setSelectedBill(null)
              setBillDetail(null)
            }}>
              <Text>关闭</Text>
            </Button>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View className='ledger-page'>
      {/* Header */}
      <View className='page-header'>
        <View 
          className='help-btn'
          onClick={() => setShowGuide(true)}
        >
          <Text className='help-icon'>?</Text>
        </View>
        <Text className='header-icon'>🏦</Text>
        <Text className='header-title'>古灵阁</Text>
        
        {/* 用户头像入口 */}
        <View
          className='user-avatar-btn'
          onClick={() => setShowLoginModal(true)}
        >
          {isLogged && user?.avatarUrl ? (
            <WizardAvatar name={user.avatarUrl} size='small' />
          ) : (
            <View className='avatar-placeholder-small'>
              <Text className='placeholder-text-small'>未登录</Text>
            </View>
          )}
        </View>
      </View>

      {/* 登录弹窗 */}
      {showLoginModal && (
        <View className='login-modal-overlay' onClick={() => setShowLoginModal(false)}>
          <View className='login-modal-content' onClick={(e) => e.stopPropagation()}>
            <UserLogin onClose={() => setShowLoginModal(false)} />
          </View>
        </View>
      )}

      {/* 开始记账按钮 */}
      <View className='start-btn' onClick={startAccounting}>
        <Text className='start-icon'>⚡</Text>
        <Text className='start-text'>挥动魔杖</Text>
      </View>

      {/* 子收支录列表 */}
      <View className='section-header'>
        <Text className='section-title'>记账事件</Text>
        <View className='add-btn' onClick={openCreateModal}>
          <Text className='add-icon'>+</Text>
        </View>
      </View>

      {subLedgers.length === 0 ? (
        <View className='empty-state'>
          <Text className='empty-icon'>📝</Text>
          <Text className='empty-text'>还没有记录</Text>
          <Text className='empty-hint'>点击上方 + 创建第一个记账事件</Text>
        </View>
      ) : (
        <View className='sub-ledger-list'>
          {subLedgers.map((subLedger) => {
            const participants = getParticipants(subLedger._id)
            return (
              <View 
                key={subLedger._id} 
                className='event-card'
                onClick={() => openSubLedgerDetail(subLedger)}
              >
                {/* 卡片头部 */}
                <View className='card-header'>
                  <View className='card-title-row'>
                    <Text className='card-title'>{subLedger.name}</Text>
                    <Text className='card-date'>{formatDate(subLedger.date)}</Text>
                  </View>
                </View>

                {/* 参与者头像 */}
                <View className='card-participants'>
                  <View className='avatars-row'>
                    {participants.slice(0, 5).map((p, idx) => (
                      <View key={idx} className='avatar-wrapper' style={{ zIndex: 5 - idx }}>
                        <WizardAvatar name={p.avatar || ''} />
                      </View>
                    ))}
                    {participants.length > 5 && (
                      <View className='more-avatar'>
                        <Text className='more-text'>+{participants.length - 5}</Text>
                      </View>
                    )}
                  </View>
                  <Text className='participant-count'>{participants.length}人参与</Text>
                </View>

                {/* 金额和操作 */}
                <View className='card-footer'>
                  <View className='amount-info'>
                    <Text className='amount-label'>总支出</Text>
                    <Text className='amount-value'>¥{formatAmount(subLedger.totalAmount)}</Text>
                  </View>
                  <View className='card-actions'>
                    <View 
                      className='account-btn'
                      onClick={(e) => {
                        e.stopPropagation()
                        Taro.switchTab({ url: '/pages/index/index' })
                      }}
                    >
                      <Text className='account-icon'>⚡</Text>
                      <Text className='account-text'>记账</Text>
                    </View>
                    <View 
                      className='quick-settle-btn'
                      onClick={(e) => quickSettle(subLedger, e)}
                    >
                      <Text className='settle-icon'>✨</Text>
                      <Text className='settle-text'>结算</Text>
                    </View>
                  </View>
                </View>
              </View>
            )
          })}
        </View>
      )}

      {/* 详情弹窗 */}
      {selectedSubLedger && (
        <View className='detail-mask' onClick={closeSubLedgerDetail}>
          <View className='detail-content' onClick={(e) => e.stopPropagation()}>
            <View className='detail-header'>
              <Text className='detail-title'>{selectedSubLedger.name}</Text>
              {selectedSubLedger.cloudId && <Text className='cloud-badge'>📜 共享</Text>}
              <View className='detail-close' onClick={closeSubLedgerDetail}>
                <Text className='close-icon'>✕</Text>
              </View>
            </View>

            {/* 成员管理区域 */}
            <View className='members-section'>
              <View className='section-header'>
                <Text className='section-title'>参与成员 ({selectedSubLedger.members?.length || 0})</Text>
                <View className='add-member-btn' onClick={() => {
                  setCurrentInviteSubLedger(selectedSubLedger)
                  setShowInviteModal(true)
                }}>
                  <Text className='add-icon'>+</Text>
                  <Text className='add-text'>添加</Text>
                </View>
              </View>
              <View className='members-list'>
                {(!selectedSubLedger.members || selectedSubLedger.members.length === 0) ? (
                  <Text className='no-members'>暂无成员，点击添加</Text>
                ) : (
                  selectedSubLedger.members.map(member => (
                    <View key={member.id} className='member-item'>
                      <View className='member-avatar'>
                        <WizardAvatar name={member.avatar || '🧙'} size='small' />
                      </View>
                      <Text className='member-name'>{member.name}</Text>
                      {member.type === 'wechat' && <Text className='member-type'>微信</Text>}
                      {member.type === 'custom' && !member.wechatOpenid && (
                        <View 
                          className='invite-link'
                          onClick={() => {
                            setCurrentInviteSubLedger(selectedSubLedger)
                            setInviteTargetMember(member)
                            setShowInviteModal(true)
                          }}
                        >
                          <Text className='invite-link-text'>邀请</Text>
                        </View>
                      )}
                    </View>
                  ))
                )}
              </View>
            </View>

            {renderSettlementDetail()}

            <View className='detail-actions'>
              {/* 主操作按钮行 */}
              <View className='detail-actions-primary'>
                <View className='action-btn primary' onClick={() => {
                  Taro.setStorageSync('active_accounting_subledger_id', selectedSubLedger._id)
                  closeSubLedgerDetail()
                  startAccounting()
                }}>
                  <Text className='btn-text'>{subLedgerBills.length > 0 ? '继续记账' : '开始记账'}</Text>
                </View>
              </View>
              {/* 次操作按钮行 */}
              <View className='detail-actions-secondary'>
                <View className='action-btn share' onClick={() => handleShareEvent(selectedSubLedger)}>
                  <Text className='btn-text'>分享</Text>
                </View>
                <View className='action-btn archive' onClick={() => handleArchive(selectedSubLedger)}>
                  <Text className='btn-text'>归档</Text>
                </View>
                <View className='action-btn secondary' onClick={() => openEditModal(selectedSubLedger)}>
                  <Text className='btn-text'>编辑</Text>
                </View>
                <View className='action-btn danger' onClick={() => handleDelete(selectedSubLedger)}>
                  <Text className='btn-text'>遗忘</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* 创建弹窗 */}
      {showCreateModal && (
        <View className='modal-mask' onClick={() => setShowCreateModal(false)}>
          <View className='modal-content' onClick={(e) => e.stopPropagation()}>
            <Text className='modal-title'>新建记账事件</Text>
            <Input
              className='modal-input'
              value={newSubLedgerName}
              onInput={(e) => setNewSubLedgerName(e.detail.value)}
              placeholder='请输入事件名称'
            />
            {/* 云端同步开关 */}
            <View className='cloud-sync-toggle' onClick={() => setEnableCloudSync(!enableCloudSync)}>
              <View className='toggle-left'>
                <Text className='toggle-icon'>📜</Text>
                <View className='toggle-text'>
                  <Text className='toggle-title'>共享事件</Text>
                  <Text className='toggle-desc'>开启后可邀请微信好友共同记账</Text>
                </View>
              </View>
              <View className={`toggle-switch ${enableCloudSync ? 'active' : ''}`}>
                <View className='toggle-knob' />
              </View>
            </View>
            <View className='modal-actions'>
              <Text className='modal-cancel' onClick={() => {
                setShowCreateModal(false)
                setEnableCloudSync(false)
              }}>取消</Text>
              <Text className='modal-confirm' onClick={confirmCreate}>施法创建</Text>
            </View>
          </View>
        </View>
      )}

      {/* 邀请弹窗 */}
      {showInviteModal && (
        <View className='modal-mask' onClick={() => closeInviteModal()}>
          <View className='modal-content' onClick={(e) => e.stopPropagation()}>
            <Text className='modal-title'>📜 邀请巫师加入「{currentInviteSubLedger?.name}」</Text>

            {/* 添加自定义巫师 */}
            {!showAddWizard ? (
              <>
                <Text className='modal-hint'>添加巫师或发送微信邀请</Text>

                <View className='invite-actions'>
                  {/* 添加自定义巫师按钮 */}
                  <View className='invite-action-btn' onClick={() => setShowAddWizard(true)}>
                    <Text className='action-icon'>🧙</Text>
                    <Text className='action-text'>添加自定义巫师</Text>
                  </View>

                  {/* 发送微信邀请按钮 */}
                  <View className={`invite-action-btn ${creatingContract ? 'disabled' : ''}`} onClick={creatingContract ? undefined : handleSendInvite}>
                    <Text className='action-icon'>📱</Text>
                    <Text className='action-text'>{creatingContract ? '创建中...' : '发送微信邀请'}</Text>
                  </View>
                </View>

                {/* 如果已有邀请码，显示邀请链接 */}
                {currentInviteCode && (
                  <View className='invite-link-section'>
                    <Text className='section-label'>邀请链接</Text>
                    <View className='invite-link-box'>
                      <Text className='invite-link'>magic-bill://join?code={currentInviteCode}</Text>
                    </View>
                    <View className='copy-btn' onClick={handleCopyInviteLink}>
                      <Text className='copy-btn-text'>复制链接</Text>
                    </View>
                  </View>
                )}
              </>
            ) : (
              <>
                {/* 添加巫师表单 */}
                <Text className='modal-hint'>设置巫师名字和头像</Text>
                <Input
                  className='modal-input'
                  value={newWizardName}
                  onInput={(e) => setNewWizardName(e.detail.value)}
                  placeholder='输入巫师名字'
                />
                <View className='avatar-picker'>
                  {['🧙', '🧝', '🧚', '🦹', '🧛', '🧜'].map(emoji => (
                    <View
                      key={emoji}
                      className={`avatar-option ${newWizardAvatar === emoji ? 'selected' : ''}`}
                      onClick={() => setNewWizardAvatar(emoji)}
                    >
                      <Text className='avatar-emoji'>{emoji}</Text>
                    </View>
                  ))}
                </View>
                <View className='modal-actions'>
                  <Text className='modal-cancel' onClick={() => setShowAddWizard(false)}>取消</Text>
                  <Text className='modal-confirm' onClick={handleAddWizardToRoom}>确认添加</Text>
                </View>
              </>
            )}

            {/* 底部关闭按钮 */}
            <View className='modal-close-hint' onClick={closeInviteModal}>
              <Text className='close-hint-text'>稍后再说</Text>
            </View>
          </View>
        </View>
      )}

      {/* 编辑弹窗 */}
      {showEditModal && (
        <View className='modal-mask' onClick={() => setShowEditModal(false)}>
          <View className='modal-content' onClick={(e) => e.stopPropagation()}>
            <Text className='modal-title'>修改事件名称</Text>
            <Input
              className='modal-input'
              value={editSubLedgerName}
              onInput={(e) => setEditSubLedgerName(e.detail.value)}
              placeholder='请输入事件名称'
            />
            <View className='modal-actions'>
              <Text className='modal-cancel' onClick={() => setShowEditModal(false)}>取消</Text>
              <Text className='modal-confirm' onClick={confirmEdit}>确认</Text>
            </View>
          </View>
        </View>
      )}

      {/* 账单详情弹窗 */}
      {renderBillDetailModal()}

      {/* 新手引导 */}
      {showGuide && (
        <NewbieGuide 
          type='ledger'
          onComplete={() => setShowGuide(false)} 
        />
      )}
    </View>
  )
}