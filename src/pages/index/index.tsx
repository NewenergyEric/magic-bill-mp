import { View, Text, Image, Input, Button } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState, useEffect } from 'react'
import homeBg from '@/assets/home-bg.png'
import { getCompanions, WizardCompanion, canSelectCompanion, addOrUpdateCompanion } from '@/services/companions'
import { WIZARDS } from '@/constants/wizards'
import { Bill, Participant, Settlement, SubLedger } from '@/types'
import {
  getActiveSubLedgers,
  linkBillToSubLedger,
  saveBill as saveBillToLedger,
  createSubLedger,
  getRandomEventName
} from '@/services/ledger'
import { shareBill } from '@/services/share'
import { onWizardInfoChanged, WizardInfoChangeData } from '@/services/events'
import { cloudLogin, getContractDetail, getBillsByContract, createCloudBill, getMyContracts } from '@/services/cloud'
import { addExpAndCheckAchievements, getLevelBadge, getLevelTitle } from '@/services/wizard'
import WizardAvatar from '@/components/WizardAvatar'
import NewbieGuide, { shouldShowGuide } from '@/components/NewbieGuide'
import UserLogin from '@/components/UserLogin'
import WizardLevel from '@/components/WizardLevel'
import { useUser } from '@/contexts/UserContext'
import './index.scss'

export default function Index() {
  const { user, isLogged, userCompanion } = useUser()
  const [showSplash, setShowSplash] = useState(true)
  const [activeTab, setActiveTab] = useState<'simple' | 'multi'>('simple')
  const [showLoginModal, setShowLoginModal] = useState(false)
  
  // 均分咒状态
  const [amount, setAmount] = useState('')
  const [wizards, setWizards] = useState<Participant[]>([])
  const [payerId, setPayerId] = useState<string>('')  // 均分咒付款人ID
  
  // 伙伴相关
  const [companions, setCompanions] = useState<WizardCompanion[]>([])
  const [showCompanionPicker, setShowCompanionPicker] = useState(false)
  const [selectedCompanionIds, setSelectedCompanionIds] = useState<string[]>([])
  
  // 动画和结果
  const [isCalculating, setIsCalculating] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [resultData, setResultData] = useState<{ perPerson: number; eventName: string; total: number; count: number; billId?: string; payerId?: string; payerName?: string } | null>(null)

  // 编辑事件名称
  const [showEditEvent, setShowEditEvent] = useState(false)
  const [editEventName, setEditEventName] = useState('')
  
  // 新手引导
  const [showGuide, setShowGuide] = useState(false)
  
  // 子收支录相关
  const [subLedgers, setSubLedgers] = useState<SubLedger[]>([])
  const [showSubLedgerPicker, setShowSubLedgerPicker] = useState(false)
  const [selectedSubLedgerId, setSelectedSubLedgerId] = useState<string>('')
  const [activeAccountingEvent, setActiveAccountingEvent] = useState<{id: string, name: string} | null>(null)
  
  // 是否首次进入（用于控制启动页只显示一次）
  const [hasSeenSplash, setHasSeenSplash] = useState(false)
  
  // 新建事件（在入账弹窗中）
  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const [newEventName, setNewEventName] = useState('')
  
  
  // 均分咒：添加巫师
  const [showSimpleAddForm, setShowSimpleAddForm] = useState(false)
  const [simpleNewWizardName, setSimpleNewWizardName] = useState('')
  
  // ========== 清算咒状态 ==========
  const [multiWizards, setMultiWizards] = useState<Participant[]>([])
  const [editingWizard, setEditingWizard] = useState<string | null>(null)
  const [tempPaid, setTempPaid] = useState('')
  const [multiResultData, setMultiResultData] = useState<{ eventName: string; total: number; settlements: Settlement[]; billId?: string } | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newWizardName, setNewWizardName] = useState('')

  // 加载契约列表（用于获取cloudId对应的契约信息）
  const loadContracts = async () => {
    try {
      const res = await getMyContracts()
      if (res.success && res.data?.contracts) {
        // 契约列表已加载，可以在需要时使用
        console.log('[Contract] 获取契约列表成功', res.data.contracts.length)
      }
    } catch (e) {
      console.log('[Contract] 获取契约列表失败', e)
    }
  }

  useEffect(() => {
    loadContracts()
  }, [])

  // 加载账单的参与者，继续记账
  const loadBillParticipants = async (billId: string, cloudId?: string) => {
    // 从subLedger获取cloudId
    const currentSubLedger = subLedgers.find(sl => sl._id === selectedSubLedgerId)
    const targetCloudId = cloudId || currentSubLedger?.cloudId
    if (!targetCloudId) {
      console.log('[Contract] cloudId 为空，无法加载账单')
      return
    }

    try {
      console.log('[Contract] 加载账单参与者', { billId, targetCloudId })
      const res = await getBillsByContract(targetCloudId)
      console.log('[Contract] getBillsByContract 返回:', JSON.stringify(res))

      if (res.success && res.data?.bills) {
        const bill = res.data.bills.find((b: any) => b._id === billId)
        console.log('[Contract] 找到账单:', JSON.stringify(bill))

        if (bill && bill.participants && Array.isArray(bill.participants)) {
          const participants = bill.participants.map((p: any) => ({
            id: p.memberId || p.userId || '',
            name: p.name || '巫师',
            avatar: p.avatar || '',
            paid: p.paid || 0
          }))
          console.log('[Contract] 转换后的参与者:', JSON.stringify(participants))

          if (activeTab === 'simple') {
            setWizards(participants)
          } else {
            setMultiWizards(participants)
          }
          Taro.showToast({ title: '已加载账单参与者', icon: 'none' })
        } else {
          console.log('[Contract] 账单没有参与者或参与者不是数组', bill?.participants)
        }
      }
    } catch (e) {
      console.log('[Contract] 加载账单参与者失败', e)
    }
  }

  // 选择共享事件后自动获取云端参与者
  const handleSelectCloudEvent = async (cloudId: string) => {
    try {
      const res = await getContractDetail(cloudId)
      if (res.success && res.data?.contract) {
        const members = res.data.contract.members || []
        // 将契约成员转换为参与者
        const participants: Participant[] = members.map((m: any) => ({
          id: m.userId,
          name: m.nickname || '巫师',
          avatar: m.avatar || ''
        }))

        // 填充到当前巫师列表
        if (activeTab === 'simple') {
          setWizards(participants)
        } else {
          setMultiWizards(participants)
        }

        console.log('[Cloud Event] 已填充云端成员', participants.length)
        Taro.showToast({ title: '已加载共享成员', icon: 'none' })
      }
    } catch (e) {
      console.log('[Cloud Event] 获取云端成员失败', e)
      Taro.showToast({ title: '获取成员失败', icon: 'none' })
    }
  }

  // 清除成员，回到本地记账模式
  const clearMembers = () => {
    if (activeTab === 'simple') {
      setWizards([])
    } else {
      setMultiWizards([])
    }
  }

  // 显示邀请巫师弹窗
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteCode, setInviteCode] = useState('')

  // 加入契约相关
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joinLoading, setJoinLoading] = useState(false)

  // 显示加入契约弹窗
  const handleShowJoinContract = () => {
    setJoinCode('')
    setShowJoinModal(true)
  }

  // 执行加入契约
  const handleJoinContract = async () => {
    if (!joinCode.trim()) {
      Taro.showToast({ title: '请输入邀请码', icon: 'none' })
      return
    }

    setJoinLoading(true)
    try {
      // 先确保云端登录
      const loginResult = await cloudLogin(
        userCompanion?.name || '神秘巫师',
        userCompanion?.avatar || ''
      )
      if (!loginResult.success || !loginResult.data) {
        Taro.showToast({ title: '请先登录', icon: 'none' })
        setJoinLoading(false)
        return
      }

      const { joinContract } = require('@/services/cloud')
      const result = await joinContract(joinCode.trim().toUpperCase())

      if (result.success && result.data) {
        Taro.showToast({ title: '加入成功', icon: 'success' })
        setShowJoinModal(false)
        // 刷新契约列表
        loadContracts()
        // 刷新事件列表
        setSubLedgers(getActiveSubLedgers())
      } else {
        Taro.showToast({ title: result.error?.message || '加入失败', icon: 'none' })
      }
    } catch (e: any) {
      console.error('[Join] 加入契约失败', e)
      Taro.showToast({ title: e.message || '加入失败', icon: 'none' })
    } finally {
      setJoinLoading(false)
    }
  }

  const handleShowInvite = async () => {
    const currentSubLedger = subLedgers.find(sl => sl._id === selectedSubLedgerId)
    if (!currentSubLedger?.cloudId) {
      Taro.showToast({ title: '请先选择一个共享事件', icon: 'none' })
      return
    }

    try {
      const res = await getContractDetail(currentSubLedger.cloudId)
      if (res.success && res.data?.contract?.inviteCode) {
        setInviteCode(res.data.contract.inviteCode)
        setShowInviteModal(true)
      } else {
        Taro.showToast({ title: '获取邀请码失败', icon: 'none' })
      }
    } catch (e) {
      console.error('[Invite] 获取邀请码失败', e)
      Taro.showToast({ title: '获取邀请码失败', icon: 'none' })
    }
  }

  const handleCopyInviteCode = () => {
    if (inviteCode) {
      Taro.setClipboardData({
        data: inviteCode,
        success: () => {
          Taro.showToast({ title: '邀请码已复制', icon: 'success' })
        }
      })
    }
  }

  useDidShow(() => {
    const freshCompanions = getCompanions()
    setCompanions(freshCompanions)
    setSubLedgers(getActiveSubLedgers())
    // 如果已经看过启动页，从其他页面切换回来时不再显示启动页
    if (hasSeenSplash) {
      setShowSplash(false)
    }

    // 同步更新已添加巫师的名字和头像（根据伙伴列表）
    // 使用 id 匹配而不是 name，因为名字可能已被修改
    if (wizards.length > 0) {
      setWizards(prev => prev.map(w => {
        // 先尝试按名字匹配
        let companion = freshCompanions.find(c => c.name === w.name)
        // 如果名字没匹配到，尝试按头像匹配（可能是名字被改了）
        if (!companion) {
          companion = freshCompanions.find(c => c.avatar === w.avatar && c.name !== w.name)
        }
        if (companion) {
          return { ...w, name: companion.name, avatar: companion.avatar }
        }
        return w
      }))
    }
    if (multiWizards.length > 0) {
      setMultiWizards(prev => prev.map(w => {
        // 先尝试按名字匹配
        let companion = freshCompanions.find(c => c.name === w.name)
        // 如果名字没匹配到，尝试按头像匹配
        if (!companion) {
          companion = freshCompanions.find(c => c.avatar === w.avatar && c.name !== w.name)
        }
        if (companion) {
          return { ...w, name: companion.name, avatar: companion.avatar }
        }
        return w
      }))
    }

    // 检查是否有跨页面传来的记账事件上下文
    const activeSubLedgerId = Taro.getStorageSync('active_accounting_subledger_id')
    if (activeSubLedgerId) {
      const activeSubLedger = getActiveSubLedgers().find(sl => sl._id === activeSubLedgerId)
      if (activeSubLedger) {
        setActiveAccountingEvent({ id: activeSubLedger._id, name: activeSubLedger.name })
      }
      // 取出后清除，防止下次直接进来又触发
      Taro.removeStorageSync('active_accounting_subledger_id')
    }
  })
  
  // 初始化加载伙伴列表
  useEffect(() => {
    setCompanions(getCompanions())
  }, [])

  // 监听巫师信息变更事件（实时同步）
  useEffect(() => {
    const unsubscribe = onWizardInfoChanged((data: WizardInfoChangeData) => {
      // 更新均分咒巫师列表
      setWizards(prev => prev.map(w => {
        if (w.name === data.oldName || w.avatar === data.oldAvatar) {
          return { ...w, name: data.newName, avatar: data.newAvatar }
        }
        return w
      }))
      // 更新清算咒巫师列表
      setMultiWizards(prev => prev.map(w => {
        if (w.name === data.oldName || w.avatar === data.oldAvatar) {
          return { ...w, name: data.newName, avatar: data.newAvatar }
        }
        return w
      }))
      // 更新结果数据中的付款人名字
      if (resultData && resultData.payerName === data.oldName) {
        setResultData(prev => prev ? { ...prev, payerName: data.newName } : null)
      }
      // 刷新伙伴列表
      setCompanions(getCompanions())
    })
    return unsubscribe
  }, [resultData])

  // 关闭启动页时记录
  const handleSplashClose = () => {
    setShowSplash(false)
    setHasSeenSplash(true)
  }
  
  // 检查是否需要显示新手引导
  useEffect(() => {
    if (!showSplash && shouldShowGuide('spell')) {
      setTimeout(() => setShowGuide(true), 500)
    }
  }, [showSplash])

  // 随机选择一个头像
  const getRandomAvatar = () => {
    const usedAvatars = wizards.map(w => w.avatar)
    const available = WIZARDS.filter(w => !usedAvatars.includes(w.avatar))
    if (available.length === 0) return WIZARDS[Math.floor(Math.random() * WIZARDS.length)].avatar
    return available[Math.floor(Math.random() * available.length)].avatar
  }

  // 切换伙伴选择
  const toggleCompanionSelect = (companion: WizardCompanion) => {
    if (selectedCompanionIds.includes(companion.id)) {
      setSelectedCompanionIds(selectedCompanionIds.filter(id => id !== companion.id))
    } else {
      setSelectedCompanionIds([...selectedCompanionIds, companion.id])
    }
  }

  // 确认添加选中的伙伴
  const confirmAddCompanions = () => {
    // 处理自己
    const includeSelf = selectedCompanionIds.includes('self')
    const toAdd = companions.filter(c => selectedCompanionIds.includes(c.id))
    
    const newWizards: Array<{id: string; name: string; avatar: string; paid: number}> = toAdd.map(c => ({
      id: c.id,
      name: c.name,
      avatar: c.avatar,
      paid: 0
    }))
    
    // 如果选择了自己
    if (includeSelf && userCompanion) {
      newWizards.unshift({
        id: 'self',
        name: user?.nickName || '我',
        avatar: userCompanion.avatar,
        paid: 0
      })
    }

    // 添加伙伴
    if (activeTab === 'multi') {
      // 清算咒模式：添加到 multiWizards
      const existing = multiWizards.find(w => w.id === newWizards[0]?.id)
      if (!existing && newWizards.length > 0) {
        setMultiWizards([...multiWizards, ...newWizards])
        Taro.showToast({ title: `已添加${newWizards.length}位伙伴`, icon: 'success' })
      }
    } else {
      // 均分咒模式：添加到 wizards
      const existing = wizards.find(w => w.id === newWizards[0]?.id)
      if (!existing && newWizards.length > 0) {
        const finalWizards = [...wizards, ...newWizards]
        setWizards(finalWizards)
        // 均分咒：如果没有设置付款人，默认第一个巫师为付款人
        if (!payerId && finalWizards.length > 0) {
          setPayerId(finalWizards[0].id)
        }
      }
    }
    
    setSelectedCompanionIds([])
    setShowCompanionPicker(false)
  }

  // 移除巫师
  const removeWizard = (id: string) => {
    const newWizards = wizards.filter(w => w.id !== id)
    setWizards(newWizards)
    // 如果移除的是付款人，重新设置第一个为付款人
    if (payerId === id && newWizards.length > 0) {
      setPayerId(newWizards[0].id)
    } else if (newWizards.length === 0) {
      setPayerId('')
    }
  }

  // 计算均分
  const calculate = async () => {
    const a = parseFloat(amount)  // 用户输入的是元
    if (a <= 0) {
      Taro.showToast({ title: '请输入有效金额', icon: 'none' })
      return
    }
    if (wizards.length <= 0) {
      Taro.showToast({ title: '请添加至少1位巫师', icon: 'none' })
      return
    }

    // 显示动画
    setIsCalculating(true)

    // 模拟动画时间
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // 转换为分存储，避免浮点数问题
    const aInCents = Math.round(a * 100)
    const perPersonInCents = wizards.length > 0 ? Math.round(aInCents / wizards.length) : 0
    const eventName = getRandomEventName()
    
    // 确定付款人（如果没有选择，默认第一个巫师）
    const actualPayerId = payerId || (wizards.length > 0 ? wizards[0].id : '')
    const payer = wizards.find(w => w.id === actualPayerId)

    // 为参与者设置 paid 字段：付款人支付全部金额，其他人支付0
    const participantsWithPaid = wizards.map(w => ({
      ...w,
      paid: w.id === actualPayerId ? aInCents : 0  // 单位：分
    }))

    const bill: Omit<Bill, '_id' | 'userId'> = {
      type: 'simple',
      eventName,
      totalAmount: aInCents,  // 单位：分
      participantsCount: wizards.length,
      date: Date.now(),
      details: {
        participants: participantsWithPaid,
        settlements: [],
        payerId: actualPayerId
      }
    }

    // 保存账单
    let savedBill = saveBillToLedger(bill)

    // 如果选择了有cloudId的事件，同时创建云端账单
    const currentSubLedger = subLedgers.find(sl => sl._id === selectedSubLedgerId)
    if (currentSubLedger?.cloudId) {
      try {
        // 构建云端账单参与者
        const cloudParticipants = participantsWithPaid.map(w => ({
          userId: w.id,
          name: w.name,
          avatar: w.avatar || '',
          paid: w.paid,
          consumed: perPersonInCents
        }))

        // 调用云端创建账单
        const cloudRes = await createCloudBill({
          contractId: currentSubLedger.cloudId,
          eventName,
          spellType: 'simple',
          totalAmount: aInCents,
          avgInCents: perPersonInCents,
          participants: cloudParticipants
        })

        if (cloudRes.success && cloudRes.data?.bill?._id) {
          // 更新本地账单，标记为已同步
          savedBill = saveBillToLedger({
            ...savedBill,
            cloudId: cloudRes.data.bill._id,
            contractId: currentSubLedger.cloudId
          })
          console.log('[Contract] 云端账单创建成功', cloudRes.data)
        } else {
          console.log('[Contract] 云端账单创建失败', cloudRes.message)
        }
      } catch (e) {
        console.log('[Contract] 创建云端账单异常', e)
      }
    }

    setIsCalculating(false)
    setResultData({
      perPerson: perPersonInCents,  // 单位：分
      eventName,
      total: aInCents,  // 单位：分
      count: wizards.length,
      billId: savedBill._id,
      payerId: actualPayerId,
      payerName: payer?.name || ''
    })

    // 增加经验值
    const expResult = addExpAndCheckAchievements()
    if (expResult.levelUp) {
      Taro.showToast({
        title: `升级！${getLevelBadge(expResult.newExp)} ${getLevelTitle(expResult.newExp)}`,
        icon: 'none',
        duration: 2000
      })
    }

    setShowResult(true)
  }

  // 关闭结果
  const closeResult = () => {
    setShowResult(false)
    setResultData(null)
  }

  // 重置均分咒结果（重新编辑）
  const resetSimpleResult = () => {
    Taro.showModal({
      title: '确认重置',
      content: '重置后可重新编辑金额和参与者，确定要重置吗？',
      success: (res) => {
        if (res.confirm) {
          setShowResult(false)
          setResultData(null)
          // 保留金额和参与者，方便用户修改
        }
      }
    })
  }

  // 打开编辑事件名称
  const openEditEvent = () => {
    // 根据当前 tab 获取事件名称
    if (activeTab === 'multi' && multiResultData) {
      setEditEventName(multiResultData.eventName)
      setShowEditEvent(true)
    } else if (resultData) {
      setEditEventName(resultData.eventName)
      setShowEditEvent(true)
    }
  }

  // 确认编辑事件名称
  const confirmEditEvent = () => {
    if (!editEventName.trim()) {
      setShowEditEvent(false)
      return
    }
    
    // 根据当前 tab 更新对应的结果数据
    if (activeTab === 'multi' && multiResultData) {
      setMultiResultData({ ...multiResultData, eventName: editEventName.trim() })
      // 更新本地存储的账单
      if (multiResultData.billId) {
        const localBills = Taro.getStorageSync('magic_bills') || []
        const billIndex = localBills.findIndex((b: Bill) => b._id === multiResultData.billId)
        if (billIndex !== -1) {
          localBills[billIndex].eventName = editEventName.trim()
          Taro.setStorageSync('magic_bills', localBills)
        }
      }
    } else if (resultData) {
      setResultData({ ...resultData, eventName: editEventName.trim() })
      // 更新本地存储的账单
      if (resultData.billId) {
        const localBills = Taro.getStorageSync('magic_bills') || []
        const billIndex = localBills.findIndex((b: Bill) => b._id === resultData.billId)
        if (billIndex !== -1) {
          localBills[billIndex].eventName = editEventName.trim()
          Taro.setStorageSync('magic_bills', localBills)
        }
      }
    }
    setShowEditEvent(false)
  }

  // 关联到子收支录
  const handleLinkToSubLedger = () => {
    // 根据当前 tab 决定使用哪个 billId
    const currentBillId = activeTab === 'multi' 
      ? multiResultData?.billId 
      : resultData?.billId
    
    console.log('handleLinkToSubLedger called', { 
      activeTab,
      billId: currentBillId, 
      selectedSubLedgerId 
    })
    
    if (!currentBillId || !selectedSubLedgerId) {
      Taro.showToast({ title: '请选择记账事件', icon: 'none' })
      return
    }
    
    const success = linkBillToSubLedger(currentBillId, selectedSubLedgerId)
    console.log('linkBillToSubLedger result:', success)
    
    if (success) {
      setShowSubLedgerPicker(false)
      setShowResult(false)
      setSelectedSubLedgerId('')
      
      // 入账后进入此事件的连续记账模式
      const linkedSubLedger = subLedgers.find(sl => sl._id === selectedSubLedgerId)
      if (linkedSubLedger) {
        setActiveAccountingEvent({ id: linkedSubLedger._id, name: linkedSubLedger.name })
      }

      // 清空当前记账内容，便于继续记账
      if (activeTab === 'multi') {
        setMultiResultData(null)
        setMultiWizards([])  // 清空清算咒巫师列表
      } else {
        setResultData(null)
        setAmount('')
        setWizards([])  // 清空均分咒巫师列表
        setPayerId('')  // 清空付款人
      }
      
      Taro.showToast({ title: '入账成功', icon: 'success' })
    } else {
      Taro.showToast({ title: '入账失败', icon: 'none' })
    }
  }

  // 入账并关联
  const saveToLedger = () => {
    // 根据当前 tab 决定使用哪个 billId
    const currentBillId = activeTab === 'multi' 
      ? multiResultData?.billId 
      : resultData?.billId

    if (!currentBillId) {
      Taro.showToast({ title: '账单获取失败', icon: 'none' })
      return
    }

    if (activeAccountingEvent) {
      // 连续记账模式：直接入账，清空当前内容
      const success = linkBillToSubLedger(currentBillId, activeAccountingEvent.id)
      if (success) {
        setShowResult(false)
        if (activeTab === 'multi') {
          setMultiResultData(null)
          setMultiWizards([])  // 清空清算咒巫师列表
        } else {
          setResultData(null)
          setAmount('')
          setWizards([])  // 清空均分咒巫师列表
          setPayerId('')  // 清空付款人
        }
        Taro.showToast({ title: `已记入「${activeAccountingEvent.name}」`, icon: 'success' })
      } else {
        Taro.showToast({ title: '入账失败', icon: 'none' })
      }
    } else {
      setSelectedSubLedgerId('') // 重置选择状态
      setShowSubLedgerPicker(true)
      setSubLedgers(getActiveSubLedgers())
    }
  }
  
  // 创建新事件并关联
  const createAndLinkEvent = () => {
    // 根据当前 tab 决定使用哪个 billId
    const currentBillId = activeTab === 'multi' 
      ? multiResultData?.billId 
      : resultData?.billId
    
    console.log('createAndLinkEvent called', { 
      activeTab,
      newEventName, 
      billId: currentBillId 
    })
    
    if (!newEventName.trim()) {
      Taro.showToast({ title: '请输入事件名称', icon: 'none' })
      return
    }
    
    try {
      const newSubLedger = createSubLedger(newEventName.trim())
      console.log('newSubLedger created:', newSubLedger)
      
      if (currentBillId) {
        const success = linkBillToSubLedger(currentBillId, newSubLedger._id)
        console.log('linkBillToSubLedger result:', success)
        
        if (success) {
          setShowCreateEvent(false)
          setShowSubLedgerPicker(false)
          setShowResult(false)
          setNewEventName('')
          setSelectedSubLedgerId('')
          
          setActiveAccountingEvent({ id: newSubLedger._id, name: newSubLedger.name })
          
          if (activeTab === 'multi') {
            setMultiResultData(null)
            setMultiWizards(prev => prev.map(w => ({ ...w, paid: 0, shouldPay: 0, balance: 0 })))
          } else {
            setResultData(null)
            setAmount('')
          }
          
          Taro.showToast({ title: '已创建并入账', icon: 'success' })
        } else {
          Taro.showToast({ title: '入账失败', icon: 'none' })
        }
      } else {
        setShowCreateEvent(false)
        setShowSubLedgerPicker(false)
        setNewEventName('')
        Taro.showToast({ title: '事件已创建', icon: 'success' })
      }
    } catch (error) {
      console.error('createAndLinkEvent error:', error)
      Taro.showToast({ title: '创建失败', icon: 'none' })
    }
  }
  
  // 打开新建事件弹窗
  const openCreateEvent = () => {
    console.log('openCreateEvent called')
    const randomName = getRandomEventName()
    console.log('random name:', randomName)
    setNewEventName(randomName)
    setShowCreateEvent(true)
    console.log('showCreateEvent set to true')
  }

  // 单独归档（不入账到事件）
  const archiveBill = () => {
    if (!resultData?.billId) return
    Taro.showModal({
      title: '确认归档',
      content: '确定要将此账单归档到冥想盆吗？',
      success: (res) => {
        if (res.confirm) {
          const bills = Taro.getStorageSync('magic_bills') || []
          const index = bills.findIndex((b: Bill) => b._id === resultData.billId)
          if (index !== -1) {
            bills[index].archived = true
            Taro.setStorageSync('magic_bills', bills)
          }
          setShowResult(false)
          setResultData(null)
          Taro.showToast({ title: '已归档至冥想盆', icon: 'success' })
        }
      }
    })
  }

  // 分享结果
  const handleShareResult = (type: 'simple' | 'multi') => {
    // 构建临时账单对象用于分享
    const tempBill: Bill = {
      _id: '',
      userId: 'local',
      type: type,
      eventName: type === 'simple' ? resultData?.eventName || '' : multiResultData?.eventName || '',
      totalAmount: type === 'simple' ? (resultData?.total || 0) : (multiResultData?.total || 0),
      participantsCount: type === 'simple' ? resultData?.count || 0 : multiWizards.length,
      date: Date.now(),
      details: {
        participants: type === 'simple' ? wizards : multiWizards,
        settlements: type === 'simple' ? [] : (multiResultData?.settlements || []),
        payerId: type === 'simple' ? resultData?.payerId : undefined
      }
    }
    
    const shareInfo = shareBill(tempBill)
    
    // 跳转到分享页面
    Taro.navigateTo({
      url: `/pages/share/index?type=bill&id=${shareInfo.path.split('id=')[1]}`
    })
  }

  // 均分咒：手动添加巫师（同时同步到伙伴列表）
  const addSimpleWizard = () => {
    if (!simpleNewWizardName.trim()) {
      Taro.showToast({ title: '请输入姓名', icon: 'none' })
      return
    }
    const avatar = getRandomAvatar()
    const wizardName = simpleNewWizardName.trim()
    
    const newWizard: Participant = {
      id: Date.now().toString(),
      name: wizardName,
      avatar,
      paid: 0
    }
    
    const finalWizards = [...wizards, newWizard]
    setWizards(finalWizards)
    
    // 如果没有设置付款人，默认新巫师为付款人
    if (!payerId) {
      setPayerId(newWizard.id)
    }
    
    // 同步到伙伴列表（如果不存在则添加）
    addOrUpdateCompanion(wizardName, avatar)
    // 刷新伙伴列表状态
    setCompanions(getCompanions())
    
    setSimpleNewWizardName('')
    setShowSimpleAddForm(false)
    Taro.showToast({ title: '添加成功', icon: 'success' })
  }

  // ========== 清算咒函数 ==========
  
  // 清算咒：随机选择头像
  const getMultiRandomAvatar = () => {
    const usedAvatars = multiWizards.map(w => w.avatar)
    const available = WIZARDS.filter(w => !usedAvatars.includes(w.avatar))
    if (available.length === 0) return WIZARDS[Math.floor(Math.random() * WIZARDS.length)].avatar
    return available[Math.floor(Math.random() * available.length)].avatar
  }

  // 清算咒：添加巫师（同时同步到伙伴列表）
  const addMultiWizard = () => {
    if (!newWizardName.trim()) {
      Taro.showToast({ title: '请输入姓名', icon: 'none' })
      return
    }
    const avatar = getMultiRandomAvatar()
    const wizardName = newWizardName.trim()
    
    // 添加到清算咒列表
    setMultiWizards([...multiWizards, {
      id: Date.now().toString(),
      name: wizardName,
      avatar,
      paid: 0
    }])
    
    // 同步到伙伴列表（如果不存在则添加）
    addOrUpdateCompanion(wizardName, avatar)
    // 刷新伙伴列表状态，使两个咒语都能召唤刚添加的巫师
    setCompanions(getCompanions())
    
    setNewWizardName('')
    setShowAddForm(false)
  }

  // 清算咒：移除巫师
  const removeMultiWizard = (id: string) => {
    setMultiWizards(multiWizards.filter(w => w.id !== id))
  }

  // 清算咒：更新垫付金额（用户输入的是元，转换为分存储）
  const updateMultiPaid = () => {
    if (editingWizard) {
      const paidInCents = Math.round((parseFloat(tempPaid) || 0) * 100)
      setMultiWizards(multiWizards.map(w => w.id === editingWizard ? { ...w, paid: paidInCents } : w))
      setEditingWizard(null)
      setTempPaid('')
    }
  }

  // 清算咒：计算
  const calculateMulti = async () => {
    if (multiWizards.length < 2) {
      Taro.showToast({ title: '请至少添加2位巫师', icon: 'none' })
      return
    }

    setIsCalculating(true)
    await new Promise(resolve => setTimeout(resolve, 1500))

    // multiWizards 中的 paid 已经是分单位
    const totalInCents = multiWizards.reduce((s, w) => s + w.paid, 0)
    const avgInCents = Math.round(totalInCents / multiWizards.length)

    const balances = multiWizards.map(w => ({ name: w.name, balance: w.paid - avgInCents }))
    const debtors = balances.filter(b => b.balance < -0.5).sort((a, b) => a.balance - b.balance)
    const creditors = balances.filter(b => b.balance > 0.5).sort((a, b) => b.balance - a.balance)

    const settlements: Settlement[] = []
    let dIdx = 0, cIdx = 0
    while (dIdx < debtors.length && cIdx < creditors.length) {
      const amountInCents = Math.min(Math.abs(debtors[dIdx].balance), creditors[cIdx].balance)
      if (amountInCents > 0.5) settlements.push({ from: debtors[dIdx].name, to: creditors[cIdx].name, amount: Math.round(amountInCents) })
      debtors[dIdx].balance += amountInCents
      creditors[cIdx].balance -= amountInCents
      if (Math.abs(debtors[dIdx].balance) < 0.5) dIdx++
      if (Math.abs(creditors[cIdx].balance) < 0.5) cIdx++
    }

    const eventName = getRandomEventName()

    const bill: Omit<Bill, '_id' | 'userId'> = {
      type: 'multi',
      eventName,
      totalAmount: totalInCents,  // 单位：分
      participantsCount: multiWizards.length,
      date: Date.now(),
      details: { participants: multiWizards, settlements }
    }

    const savedBill = saveBillToLedger(bill)

    // 如果选择了有cloudId的事件，同时创建云端账单
    const currentSubLedger = subLedgers.find(sl => sl._id === selectedSubLedgerId)
    if (currentSubLedger?.cloudId) {
      try {
        const cloudParticipants = multiWizards.map(w => ({
          userId: w.id,
          name: w.name,
          avatar: w.avatar || '',
          paid: w.paid,
          consumed: avgInCents
        }))

        const cloudRes = await createCloudBill({
          contractId: currentSubLedger.cloudId,
          eventName,
          spellType: 'multi',
          totalAmount: totalInCents,
          avgInCents,
          participants: cloudParticipants
        })

        if (cloudRes.success && cloudRes.data?.bill?._id) {
          saveBillToLedger({
            ...savedBill,
            cloudId: cloudRes.data.bill._id,
            contractId: currentSubLedger.cloudId
          })
          console.log('[Contract] 云端账单创建成功', cloudRes.data)
        }
      } catch (e) {
        console.log('[Contract] 创建云端账单异常', e)
      }
    }

    setIsCalculating(false)
    setMultiResultData({ eventName, total: totalInCents, settlements, billId: savedBill._id })

    // 增加经验值
    const expResult = addExpAndCheckAchievements()
    if (expResult.levelUp) {
      Taro.showToast({
        title: `升级！${getLevelBadge(expResult.newExp)} ${getLevelTitle(expResult.newExp)}`,
        icon: 'none',
        duration: 2000
      })
    }

    setShowResult(true)
  }

  // 清算咒：关闭结果
  const closeMultiResult = () => {
    setShowResult(false)
    setMultiResultData(null)
  }

  // 清算咒：重置（重新编辑）
  const resetMultiResult = () => {
    Taro.showModal({
      title: '确认重置',
      content: '重置后可重新编辑参与者和垫付金额，确定要重置吗？',
      success: (res) => {
        if (res.confirm) {
          setShowResult(false)
          setMultiResultData(null)
          // 保留参与者，方便用户修改
        }
      }
    })
  }

  // 清算咒：归档
  const archiveMultiBill = () => {
    if (!multiResultData?.billId) return
    Taro.showModal({
      title: '确认归档',
      content: '确定要将此账单归档到冥想盆吗？',
      success: (res) => {
        if (res.confirm) {
          const bills = Taro.getStorageSync('magic_bills') || []
          const index = bills.findIndex((b: Bill) => b._id === multiResultData.billId)
          if (index !== -1) {
            bills[index].archived = true
            Taro.setStorageSync('magic_bills', bills)
          }
          setShowResult(false)
          setMultiResultData(null)
          setMultiWizards([])
          Taro.showToast({ title: '已归档至冥想盆', icon: 'success' })
        }
      }
    })
  }

  // 启动页
  if (showSplash) {
    return (
      <View className='splash-page'>
        <Image 
          className='splash-bg' 
          src={homeBg} 
          mode='aspectFill'
        />
        <View className='splash-overlay' />
        <View className='splash-content'>
          <Text className='splash-title'>活点账单</Text>
          <View className='splash-divider' />
          <View 
            className='magic-start-button'
            onClick={handleSplashClose}
          >
            <Text className='button-text'>梅林的胡子！巫师们要开始算账了！</Text>
          </View>
          
          {/* 登录入口 */}
          <View className='splash-login-hint' onClick={() => {
            setShowLoginModal(true)
          }}>
            <Text className='hint-text'>🧙 登录创建自己的巫师形象</Text>
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
      </View>
    )
  }

  // 主页面
  return (
    <View className='home-page'>
      {/* Header */}
      <View className='header'>
        <View 
          className='help-btn'
          onClick={() => setShowGuide(true)}
        >
          <Text className='help-icon'>?</Text>
        </View>
        <Text className='header-icon'>✨</Text>
        <Text className='header-title'>活点账单</Text>
        
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

      {/* 巫师等级条 */}
      <WizardLevel compact />

      {/* 登录弹窗 */}
      {showLoginModal && (
        <View className='login-modal-overlay' onClick={() => setShowLoginModal(false)}>
          <View className='login-modal-content' onClick={(e) => e.stopPropagation()}>
            <UserLogin onClose={() => setShowLoginModal(false)} />
          </View>
        </View>
      )}

      {/* 连续记账横幅 */}
      {activeAccountingEvent && (
        <View className='active-event-banner'>
          <Text className='banner-icon'>🎩</Text>
          <Text className='banner-text'>正在为「{activeAccountingEvent.name}」记账</Text>
          <View className='banner-close' onClick={() => setActiveAccountingEvent(null)}>
            <Text className='close-text'>退出</Text>
          </View>
        </View>
      )}

      {/* Navigation */}
      <View className='nav-bar'>
        <View 
          className={`nav-item ${activeTab === 'simple' ? 'active' : ''}`}
          onClick={() => setActiveTab('simple')}
        >
          <Text className='nav-icon'>⚡</Text>
          <Text className='nav-label'>均分咒</Text>
        </View>
        <View className='nav-divider' />
        <View 
          className={`nav-item ${activeTab === 'multi' ? 'active' : ''}`}
          onClick={() => setActiveTab('multi')}
        >
          <Text className='nav-icon'>✨</Text>
          <Text className='nav-label'>清算咒</Text>
        </View>
      </View>

      {/* 事件选择器 */}
      <View className='contract-selector' onClick={() => setShowSubLedgerPicker(true)}>
        <Text className='selector-icon'>
          {selectedSubLedgerId && subLedgers.find(sl => sl._id === selectedSubLedgerId)?.cloudId ? '📜' : '📋'}
        </Text>
        <Text className='selector-text'>
          {selectedSubLedgerId
            ? subLedgers.find(sl => sl._id === selectedSubLedgerId)?.name || '选择事件'
            : '选择事件'}
        </Text>
        <Text className='selector-arrow'>▼</Text>
      </View>

      {/* Main Content */}
      <View className='main-content'>
        {/* 均分咒 */}
        {activeTab === 'simple' && (
          <View className='parchment-card'>
            <View className='card-header'>
              <Text className='card-icon'>⚡</Text>
              <Text className='card-title'>均分咒</Text>
            </View>

            <View className='form-section'>
              <Text className='form-label'>消耗金加隆</Text>
              <View className='input-row'>
                <Text className='input-icon'>💰</Text>
                <Input
                  className='amount-input'
                  type='digit'
                  placeholder='0.00'
                  value={amount}
                  onInput={(e) => setAmount(e.detail.value)}
                />
              </View>
            </View>

            {/* 添加巫师按钮 */}
            <View className='form-section'>
              <Text className='form-label'>参与巫师 ({wizards.length}/30)</Text>
              <View className='add-buttons'>
                {companions.length > 0 && (
                  <Button
                    className='add-companion-btn'
                    size='mini'
                    onClick={() => setShowCompanionPicker(true)}
                  >
                    <Text className='btn-icon'>🧙</Text>
                    <Text>召唤伙伴</Text>
                  </Button>
                )}
                {/* 如果选择了共享事件，显示邀请巫师按钮 */}
                {selectedSubLedgerId && subLedgers.find(sl => sl._id === selectedSubLedgerId)?.cloudId && (
                  <Button
                    className='add-random-btn'
                    size='mini'
                    onClick={() => handleShowInvite()}
                  >
                    <Text className='btn-icon'>📜</Text>
                    <Text>邀请巫师</Text>
                  </Button>
                )}
                <Button
                  className='add-random-btn'
                  size='mini'
                  onClick={() => setShowSimpleAddForm(true)}
                >
                  <Text className='btn-icon'>✏️</Text>
                  <Text>添加巫师</Text>
                </Button>
              </View>
            </View>

            {/* 添加表单 */}
            {showSimpleAddForm && (
              <View className='add-form-inline'>
                <Input
                  className='name-input'
                  type='text'
                  value={simpleNewWizardName}
                  onInput={(e) => setSimpleNewWizardName(e.detail.value)}
                  placeholder='输入姓名'
                  autoFocus
                />
                <Text className='cancel-text' onClick={() => { setShowSimpleAddForm(false); setSimpleNewWizardName('') }}>取消</Text>
                <Text className='confirm-text' onClick={addSimpleWizard}>确认</Text>
              </View>
            )}

            {/* 巫师列表 */}
            <View className='wizards-list-simple'>
              {wizards.length === 0 ? (
                <View className='empty-wizards'>
                  <Text className='empty-text'>点击上方按钮召唤巫师</Text>
                </View>
              ) : (
                <>
                  {wizards.map((w) => (
                    <View 
                      key={w.id} 
                      className={`wizard-item-simple ${payerId === w.id ? 'is-payer' : ''}`}
                      onClick={() => setPayerId(w.id)}
                    >
                      <WizardAvatar name={w.avatar} />
                      <Text className='wizard-name'>{w.name}</Text>
                      {payerId === w.id && <Text className='payer-tag'>付款人</Text>}
                      <View className='remove-btn' onClick={(e) => { e.stopPropagation(); removeWizard(w.id); }}>
                        <Text className='remove-icon'>✕</Text>
                      </View>
                    </View>
                  ))}
                  {wizards.length > 0 && (
                    <Text className='payer-hint'>💡 {payerId ? '点击头像可更换付款人' : '点击选择付款人'}</Text>
                  )}
                </>
              )}
            </View>
          </View>
        )}

        {/* 清算咒 */}
        {activeTab === 'multi' && (
          <View className='parchment-card'>
            <View className='card-header'>
              <Text className='card-icon'>✨</Text>
              <Text className='card-title'>清算咒</Text>
            </View>

            {/* 添加按钮 */}
            <View className='add-buttons'>
              {companions.length > 0 && (
                <Button 
                  className='add-companion-btn' 
                  size='mini' 
                  onClick={() => setShowCompanionPicker(true)}
                >
                  <Text className='btn-icon'>🧙</Text>
                  <Text>召唤伙伴</Text>
                </Button>
              )}
              <Button 
                className='add-random-btn' 
                size='mini' 
                onClick={() => setShowAddForm(true)}
              >
                <Text className='btn-icon'>+</Text>
                <Text>添加巫师</Text>
              </Button>
            </View>

            {/* 添加表单 */}
            {showAddForm && (
              <View className='add-form-inline'>
                <Input
                  className='name-input'
                  type='text'
                  value={newWizardName}
                  onInput={(e) => setNewWizardName(e.detail.value)}
                  placeholder='输入姓名'
                  autoFocus
                />
                <Text className='cancel-text' onClick={() => { setShowAddForm(false); setNewWizardName('') }}>取消</Text>
                <Text className='confirm-text' onClick={addMultiWizard}>确认</Text>
              </View>
            )}

            {/* 巫师列表 */}
            <View className='wizards-list-multi'>
              {multiWizards.length === 0 ? (
                <View className='empty-wizards'>
                  <Text className='empty-text'>点击上方按钮召唤巫师</Text>
                </View>
              ) : (
                multiWizards.map((w, index) => (
                  <View 
                    key={w.id} 
                    className={`wizard-row ${w.paid > 0 ? 'has-paid' : ''}`}
                    onClick={() => {
                      setEditingWizard(w.id)
                      // 将分转换为元显示
                      setTempPaid((w.paid / 100).toFixed(2).replace(/\.?0+$/, '') || '0')
                    }}
                  >
                    <View className='wizard-index'>
                      <Text className='index-num'>{index + 1}</Text>
                    </View>
                    <View className='wizard-avatar-wrap'>
                      <WizardAvatar name={w.avatar} />
                    </View>
                    <View className='wizard-info'>
                      <Text className='wizard-name'>{w.name}</Text>
                      <Text className='wizard-label'>点击设置金额</Text>
                    </View>
                    <View className='wizard-amount'>
                      <Text className='amount-value'>{w.paid > 0 ? `¥${(w.paid / 100).toFixed(2)}` : '¥0.00'}</Text>
                    </View>
                    <View className='remove-btn' onClick={(e) => { e.stopPropagation(); removeMultiWizard(w.id) }}>
                      <Text className='remove-icon'>✕</Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* 统计信息 */}
            {multiWizards.length > 0 && (
              <View className='stats-bar'>
                <Text className='stats-text'>共 {multiWizards.length} 位巫师</Text>
                <Text className='stats-total'>总计: ¥{(multiWizards.reduce((s, w) => s + w.paid, 0) / 100).toFixed(2)}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* 固定底部操作栏 */}
      <View className='fixed-bottom-bar'>
        {activeTab === 'simple' && (
          <>
            <View className='bar-info'>
              <View className='info-item'>
                <Text className='info-label'>金额</Text>
                <Text className='info-value'>{amount || '¥0'}</Text>
              </View>
              <View className='info-divider' />
              <View className='info-item'>
                <Text className='info-label'>人数</Text>
                <Text className='info-value'>{wizards.length}人</Text>
              </View>
            </View>
            <View 
              className={`bar-action-btn ${!amount || wizards.length === 0 ? 'disabled' : ''}`}
              onClick={() => {
                if (amount && wizards.length > 0) calculate()
              }}
            >
              <Text className='action-icon'>⚡</Text>
              <Text className='action-text'>施展均分咒</Text>
            </View>
          </>
        )}
        
        {activeTab === 'multi' && (
          <>
            <View className='bar-info'>
              <View className='info-item'>
                <Text className='info-label'>总额</Text>
                <Text className='info-value'>¥{(multiWizards.reduce((s, w) => s + w.paid, 0) / 100).toFixed(2)}</Text>
              </View>
              <View className='info-divider' />
              <View className='info-item'>
                <Text className='info-label'>人数</Text>
                <Text className='info-value'>{multiWizards.length}人</Text>
              </View>
            </View>
            <View 
              className={`bar-action-btn ${multiWizards.length < 2 ? 'disabled' : ''}`}
              onClick={() => {
                if (multiWizards.length >= 2) calculateMulti()
              }}
            >
              <Text className='action-icon'>✨</Text>
              <Text className='action-text'>施展清算咒</Text>
            </View>
          </>
        )}
      </View>

      {/* 计算动画 */}
      {isCalculating && (
        <View className='calc-animation-mask'>
          <View className='calc-animation'>
            <View className='magic-wand'>🪄</View>
            <View className='magic-book'>📖</View>
            <Text className='calc-text-anim'>正在施展咒语...</Text>
          </View>
        </View>
      )}

      {/* 结果弹窗 */}
      {showResult && (resultData || multiResultData) && (
        <View className='result-mask' onClick={activeTab === 'simple' ? closeResult : closeMultiResult}>
          <View className='result-card' onClick={(e) => e.stopPropagation()}>
            {/* 均分咒结果 */}
            {activeTab === 'simple' && resultData && (
              <>
                <View className='result-header'>
                  <Text className='result-title'>⚡ 咒语生效！</Text>
                  <View className='result-close' onClick={closeResult}>
                    <Text className='close-icon'>✕</Text>
                  </View>
                </View>
                
                <View className='result-event' onClick={openEditEvent}>{resultData.eventName}</View>
                
                <View className='result-main'>
                  <Text className='result-label'>每位巫师需支付</Text>
                  <Text className='result-amount'>¥{(resultData.perPerson / 100).toFixed(2)}</Text>
                </View>
                
                <View className='result-details'>
                  <View className='detail-item'>
                    <Text className='detail-label'>总金额</Text>
                    <Text className='detail-value'>¥{(resultData.total / 100).toFixed(2)}</Text>
                  </View>
                  <View className='detail-item'>
                    <Text className='detail-label'>参与人数</Text>
                    <Text className='detail-value'>{resultData.count}人</Text>
                  </View>
                  {resultData.payerName && (
                    <View className='detail-item'>
                      <Text className='detail-label'>付款人</Text>
                      <Text className='detail-value highlight'>{resultData.payerName}</Text>
                    </View>
                  )}
                </View>

                {/* 付款提示 - 改为清算契约形式 */}
                {resultData.payerName && resultData.payerId && (
                  <View className='settlements-section'>
                    <Text className='section-title'>清算契约</Text>
                    {wizards.filter(w => w.id !== resultData.payerId).length === 0 ? (
                      <Text className='no-settlement'>付款人已支付全部金额</Text>
                    ) : (
                      wizards.filter(w => w.id !== resultData.payerId).map((w, idx) => {
                        const payerWizard = wizards.find(wz => wz.id === resultData.payerId)
                        return (
                          <View key={idx} className='settlement-item'>
                            <View className='settlement-user'>
                              <WizardAvatar name={w.avatar} />
                              <Text className='user-name'>{w.name}</Text>
                            </View>
                            <View className='settlement-arrow'>
                              <Text className='arrow-amount'>¥{(resultData.perPerson / 100).toFixed(2)}</Text>
                              <Text className='arrow-icon'>→</Text>
                            </View>
                            <View className='settlement-user'>
                              <WizardAvatar name={payerWizard?.avatar || ''} />
                              <Text className='user-name'>{resultData.payerName}</Text>
                            </View>
                          </View>
                        )
                      })
                    )}
                  </View>
                )}

                <View className='result-wizards'>
                  {wizards.map((w) => (
                    <View key={w.id} className={`result-wizard-item ${w.id === resultData.payerId ? 'is-payer' : ''}`}>
                      <WizardAvatar name={w.avatar} />
                      <Text className='result-wizard-name'>{w.name}</Text>
                      {w.id === resultData.payerId && <Text className='payer-badge'>付款人</Text>}
                    </View>
                  ))}
                </View>

                <View className='result-actions'>
                  {/* 主操作按钮行 */}
                  <View className='result-actions-primary'>
                    <Button className='result-btn result-share-btn' onClick={() => handleShareResult('simple')}>
                      <Text>分享</Text>
                    </Button>
                    <Button className='result-btn result-save-btn' onClick={saveToLedger}>
                      <Text>{activeAccountingEvent ? '直接入账' : '入账'}</Text>
                    </Button>
                  </View>
                  {/* 次操作按钮行 */}
                  <View className='result-actions-secondary'>
                    <Button className='result-btn result-reset-btn' onClick={resetSimpleResult}>
                      <Text>重置</Text>
                    </Button>
                    <Button className='result-btn result-archive-btn' onClick={archiveBill}>
                      <Text>归档</Text>
                    </Button>
                    <Button className='result-btn result-confirm-btn' onClick={closeResult}>
                      <Text>继续</Text>
                    </Button>
                  </View>
                </View>
              </>
            )}

            {/* 清算咒结果 */}
            {activeTab === 'multi' && multiResultData && (
              <>
                <View className='result-header'>
                  <Text className='result-title'>✨ 清算咒生效！</Text>
                  <View className='result-close' onClick={closeMultiResult}>
                    <Text className='close-icon'>✕</Text>
                  </View>
                </View>
                
                <View className='result-event' onClick={openEditEvent}>{multiResultData.eventName}</View>
                
                <View className='result-main'>
                  <Text className='result-label'>消耗金加隆</Text>
                  <Text className='result-amount'>¥{(multiResultData.total / 100).toFixed(2)}</Text>
                </View>

                {/* 结算方案 */}
                <View className='settlements-section'>
                  <Text className='section-title'>结算方案</Text>
                  {multiResultData.settlements.length === 0 ? (
                    <Text className='no-settlement'>无需结算，大家已平摊！</Text>
                  ) : (
                    multiResultData.settlements.map((s, idx) => {
                      const fromWizard = multiWizards.find(w => w.name === s.from)
                      const toWizard = multiWizards.find(w => w.name === s.to)
                      return (
                        <View key={idx} className='settlement-item'>
                          <View className='settlement-user'>
                            <WizardAvatar name={fromWizard?.avatar || ''} />
                            <Text className='user-name'>{s.from}</Text>
                          </View>
                          <View className='settlement-arrow'>
                            <Text className='arrow-amount'>¥{(s.amount / 100).toFixed(2)}</Text>
                            <Text className='arrow-icon'>→</Text>
                          </View>
                          <View className='settlement-user'>
                            <WizardAvatar name={toWizard?.avatar || ''} />
                            <Text className='user-name'>{s.to}</Text>
                          </View>
                        </View>
                      )
                    })
                  )}
                </View>

                <View className='result-actions'>
                  {/* 主操作按钮行 */}
                  <View className='result-actions-primary'>
                    <Button className='result-btn result-share-btn' onClick={() => handleShareResult('multi')}>
                      <Text>分享</Text>
                    </Button>
                    <Button className='result-btn result-save-btn' onClick={saveToLedger}>
                      <Text>{activeAccountingEvent ? '直接入账' : '入账'}</Text>
                    </Button>
                  </View>
                  {/* 次操作按钮行 */}
                  <View className='result-actions-secondary'>
                    <Button className='result-btn result-reset-btn' onClick={resetMultiResult}>
                      <Text>重置</Text>
                    </Button>
                    <Button className='result-btn result-archive-btn' onClick={archiveMultiBill}>
                      <Text>归档</Text>
                    </Button>
                    <Button className='result-btn result-confirm-btn' onClick={closeMultiResult}>
                      <Text>继续</Text>
                    </Button>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      )}

      {/* 伙伴选择弹窗 - 多选 */}
      {showCompanionPicker && (
        <View className='modal-mask' onClick={() => {
          setShowCompanionPicker(false)
        }}>
          <View className='companion-picker' onClick={(e) => e.stopPropagation()}>
            <View className='picker-header'>
              <Text className='picker-title'>
                {`选择伙伴 (已选 ${selectedCompanionIds.length} 位)`}
              </Text>
              <View className='picker-close' onClick={() => {
                setSelectedCompanionIds([])
                setShowCompanionPicker(false)
              }}>
                <Text className='close-icon'>✕</Text>
              </View>
            </View>
            
{companions.length === 0 && !userCompanion ? (
              <View className='picker-empty'>
                <Text className='empty-text'>还没有伙伴</Text>
                <Text 
                  className='go-add-btn' 
                  onClick={() => {
                    setShowCompanionPicker(false)
                    Taro.switchTab({ url: '/pages/companions/index' })
                  }}
                >
                  去添加
                </Text>
              </View>
            ) : (
              <>
                <View className='companions-picker-list'>
                  {/* 可添加的伙伴（已登录且有头像或未登录但有头像） */}
                  {(() => {
                    const availableCompanions = companions.filter(c => {
                      const selectable = canSelectCompanion(c, isLogged)
                      const alreadyAdded = activeTab === 'multi'
                        ? multiWizards.find(w => w.name === c.name)
                        : wizards.find(w => w.name === c.name)
                      return selectable && !alreadyAdded
                    })
                    
                    const addedCompanions = companions.filter(c => {
                      const alreadyAdded = activeTab === 'multi'
                        ? multiWizards.find(w => w.name === c.name)
                        : wizards.find(w => w.name === c.name)
                      return alreadyAdded
                    })
                    
                    const unavailableCompanions = companions.filter(c => {
                      const selectable = canSelectCompanion(c, isLogged)
                      const alreadyAdded = activeTab === 'multi'
                        ? multiWizards.find(w => w.name === c.name)
                        : wizards.find(w => w.name === c.name)
                      return !selectable && !alreadyAdded
                    })
                    
                    const selfName = user?.nickName || '我'
                    const selfAlreadyAdded = activeTab === 'multi'
                      ? multiWizards.find(w => w.name === selfName)
                      : wizards.find(w => w.name === selfName)
                    const selfSelectable = isLogged && userCompanion
                    
                    return (
                      <>
                        {/* 可添加的伙伴 */}
                        {(availableCompanions.length > 0 || (selfSelectable && !selfAlreadyAdded)) && (
                          <>
                            <View className='picker-group-title available'>可添加</View>
                            
                            {/* 自己选项 */}
                            {selfSelectable && !selfAlreadyAdded && (
                              <View 
                                className={`picker-item self-item ${selectedCompanionIds.includes('self') ? 'selected' : ''}`}
                                onClick={() => {
                                  if (userCompanion) {
                                    toggleCompanionSelect({ id: 'self', name: selfName, avatar: userCompanion.avatar, createdAt: 0 })
                                  }
                                }}
                              >
                                <View className={`checkbox ${selectedCompanionIds.includes('self') ? 'checked' : ''}`}>
                                  {selectedCompanionIds.includes('self') && <Text className='check-mark'>✓</Text>}
                                </View>
                                {userCompanion ? (
                                  <WizardAvatar name={userCompanion.avatar} />
                                ) : (
                                  <View className='avatar-placeholder-picker'>👤</View>
                                )}
                                <Text className='picker-name'>{selfName}</Text>
                                <Text className='status-tag login-hint'>自己</Text>
                              </View>
                            )}
                            
                            {/* 伙伴列表 */}
                            {availableCompanions.filter(c => !c.isSelf).map((companion) => {
                              const isSelected = selectedCompanionIds.includes(companion.id)
                              return (
                                <View 
                                  key={companion.id} 
                                  className={`picker-item ${isSelected ? 'selected' : ''}`}
                                  onClick={() => {
                                    toggleCompanionSelect(companion)
                                  }}
                                >
                                  <View className={`checkbox ${isSelected ? 'checked' : ''}`}>
                                    {isSelected && <Text className='check-mark'>✓</Text>}
                                  </View>
                                  {companion.avatar ? (
                                    <WizardAvatar name={companion.avatar} />
                                  ) : (
                                    <View className='avatar-placeholder-picker'>👤</View>
                                  )}
                                  <Text className='picker-name'>{companion.name}</Text>
                                </View>
                              )
                            })}
                          </>
                        )}
                        
                        {/* 已添加的伙伴 */}
                        {addedCompanions.length > 0 && (
                          <>
                            <View className='picker-group-divider' />
                            <View className='picker-group-title'>已添加</View>
                            {addedCompanions.filter(c => !c.isSelf).map((companion) => {
                              return (
                                <View 
                                  key={companion.id} 
                                  className='picker-item disabled'
                                >
                                  <View className={`checkbox checked`}>
                                    <Text className='check-mark'>✓</Text>
                                  </View>
                                  {companion.avatar ? (
                                    <WizardAvatar name={companion.avatar} />
                                  ) : (
                                    <View className='avatar-placeholder-picker'>👤</View>
                                  )}
                                  <Text className='picker-name'>{companion.name}</Text>
                                  <Text className='status-tag already-added'>已添加</Text>
                                </View>
                              )
                            })}
                          </>
                        )}
                        
                        {/* 不可添加的伙伴 */}
                        {unavailableCompanions.length > 0 && (
                          <>
                            <View className='picker-group-divider' />
                            <View className='picker-group-title unavailable'>不可添加</View>
                            {unavailableCompanions.filter(c => !c.isSelf).map((companion) => {
                              return (
                                <View 
                                  key={companion.id} 
                                  className='picker-item disabled'
                                >
                                  <View className={`checkbox`} />
                                  {companion.avatar ? (
                                    <WizardAvatar name={companion.avatar} />
                                  ) : (
                                    <View className='avatar-placeholder-picker'>👤</View>
                                  )}
                                  <Text className='picker-name'>{companion.name}</Text>
                                  {!isLogged && companion.isSelf && (
                                    <Text className='status-tag login-hint'>未登录</Text>
                                  )}
                                  {!companion.avatar && (
                                    <Text className='status-tag no-avatar-hint'>无头像</Text>
                                  )}
                                </View>
                              )
                            })}
                          </>
                        )}
                      </>
                    )
                  })()}
                </View>
                <View className='picker-footer'>
                  <Button className='confirm-add-btn' onClick={confirmAddCompanions}>
                    {`确认添加 ${selectedCompanionIds.length} 位伙伴`}
                  </Button>
                </View>
              </>
            )}
          </View>
        </View>
      )}

      {/* 编辑事件名称弹窗 */}
      {showEditEvent && (
        <View className='edit-modal-mask' onClick={() => setShowEditEvent(false)}>
          <View className='edit-event-modal' onClick={(e) => e.stopPropagation()}>
            <Text className='edit-modal-title'>修改事件名称</Text>
            <Input 
              className='edit-event-input'
              value={editEventName}
              onInput={(e) => setEditEventName(e.detail.value)}
              placeholder='请输入事件名称'
            />
            <View className='edit-modal-actions'>
              <Text className='edit-cancel' onClick={() => setShowEditEvent(false)}>取消</Text>
              <Text className='edit-confirm' onClick={confirmEditEvent}>确认</Text>
            </View>
          </View>
        </View>
      )}

      {/* 子收支录选择弹窗 */}
      {showSubLedgerPicker && (
        <View className='subledger-mask' onClick={() => setShowSubLedgerPicker(false)}>
          <View className='subledger-picker' onClick={(e) => e.stopPropagation()}>
            <View className='picker-header'>
              <Text className='picker-title'>选择记账事件</Text>
              <View className='picker-close' onClick={() => setShowSubLedgerPicker(false)}>
                <Text className='close-icon'>✕</Text>
              </View>
            </View>
            
            {/* 新建事件按钮 */}
            <View className='create-event-btn' onClick={(e) => { e.stopPropagation(); openCreateEvent(); }}>
              <Text className='create-icon'>+</Text>
              <Text className='create-text'>新建事件</Text>
            </View>
            
            {subLedgers.length === 0 ? (
              <View className='picker-empty'>
                <Text className='empty-text'>还没有记账事件</Text>
                <Text className='empty-hint'>点击上方按钮新建一个</Text>
              </View>
            ) : (
              <>
                <View className='subledger-picker-list'>
                  {subLedgers.map((sl) => {
                    const isSelected = selectedSubLedgerId === sl._id
                    return (
                      <View 
                        key={sl._id} 
                        className={`subledger-item ${isSelected ? 'selected' : ''}`}
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          console.log('Selected subledger:', sl._id, sl.name, 'cloudId:', sl.cloudId);
                          setSelectedSubLedgerId(sl._id); 
                          // 如果有cloudId，自动获取云端参与者
                          if (sl.cloudId) {
                            handleSelectCloudEvent(sl.cloudId)
                          }
                        }}
                      >
                        <View className='subledger-icon'>{sl.cloudId ? '📜' : '📋'}</View>
                        <View className='subledger-info'>
                          <Text className='subledger-name'>{sl.name}</Text>
                          <Text className='subledger-amount'>¥{(sl.totalAmount / 100).toFixed(2)}</Text>
                        </View>
                        {isSelected && <Text className='check-icon'>✓</Text>}
                      </View>
                    )
                  })}
                </View>

                {/* 加入共享事件入口 */}
                <View className='join-contract-entry' onClick={(e) => {
                  e.stopPropagation();
                  setShowSubLedgerPicker(false);
                  handleShowJoinContract();
                }}>
                  <Text className='join-icon'>➕</Text>
                  <Text className='join-text'>加入共享事件</Text>
                </View>

                <View className='picker-footer'>
                  <Button className='confirm-add-btn' onClick={(e) => { e.stopPropagation(); handleLinkToSubLedger(); }}>
                    确认入账
                  </Button>
                </View>
              </>
            )}
          </View>
        </View>
      )}

      {/* 邀请巫师弹窗 */}
      {showInviteModal && (
        <View className='modal-mask' onClick={() => setShowInviteModal(false)}>
          <View className='modal-content' onClick={(e) => e.stopPropagation()}>
            <Text className='modal-title'>📜 邀请巫师</Text>
            <Text className='modal-hint'>分享邀请码，好友加入后即可共同记账</Text>
            <View className='invite-code-box'>
              <Text className='invite-code'>{inviteCode}</Text>
            </View>
            <View className='modal-actions'>
              <View className='modal-cancel' onClick={(e) => { e.stopPropagation(); setShowInviteModal(false); }}>关闭</View>
              <View className='modal-confirm' onClick={(e) => { e.stopPropagation(); handleCopyInviteCode(); }}>复制邀请码</View>
            </View>
          </View>
        </View>
      )}

      {/* 加入契约弹窗 */}
      {showJoinModal && (
        <View className='modal-mask' onClick={() => setShowJoinModal(false)}>
          <View className='modal-content' onClick={(e) => e.stopPropagation()}>
            <Text className='modal-title'>📜 加入共享事件</Text>
            <Text className='modal-hint'>输入好友发来的邀请码，即可加入共享记账</Text>
            <Input
              className='modal-input'
              value={joinCode}
              onInput={(e) => setJoinCode(e.detail.value)}
              placeholder='请输入6位邀请码'
              maxlength={6}
              style={{ textTransform: 'uppercase', letterSpacing: 4, textAlign: 'center' as const }}
            />
            <View className='modal-actions'>
              <Text className='modal-cancel' onClick={() => setShowJoinModal(false)}>取消</Text>
              <Text className='modal-confirm' onClick={handleJoinContract}>{joinLoading ? '加入中...' : '确认加入'}</Text>
            </View>
          </View>
        </View>
      )}

      {/* 新建事件弹窗 */}
      {showCreateEvent && (
        <View className='create-event-mask' onClick={() => setShowCreateEvent(false)}>
          <View className='modal-content' onClick={(e) => e.stopPropagation()}>
            <Text className='modal-title'>新建记账事件</Text>
            <Input
              className='modal-input'
              value={newEventName}
              onInput={(e) => setNewEventName(e.detail.value)}
              placeholder='请输入事件名称'
            />
            <View className='modal-actions'>
              <View className='modal-cancel' onClick={(e) => { e.stopPropagation(); setShowCreateEvent(false); }}>取消</View>
              <View className='modal-confirm' onClick={(e) => { e.stopPropagation(); createAndLinkEvent(); }}>创建并关联</View>
            </View>
          </View>
        </View>
      )}

      {/* 清算咒 - 编辑金额弹窗 */}
      {editingWizard && (
        <View className='modal-mask' onClick={() => setEditingWizard(null)}>
          <View className='modal-content' onClick={(e) => e.stopPropagation()}>
            <Text className='modal-title'>输入垫付金额</Text>
            
            <View className='modal-avatar'>
              <WizardAvatar name={multiWizards.find(w => w.id === editingWizard)?.avatar || ''} className='large' />
              <Text className='modal-name'>{multiWizards.find(w => w.id === editingWizard)?.name}</Text>
            </View>

            <Input
              className='modal-input'
              type='digit'
              value={tempPaid}
              onInput={(e) => setTempPaid(e.detail.value)}
              placeholder='0.00'
              autoFocus
            />

            <View className='modal-actions'>
              <Text className='modal-cancel' onClick={() => setEditingWizard(null)}>取消</Text>
              <Text className='modal-confirm' onClick={updateMultiPaid}>确认</Text>
            </View>
          </View>
        </View>
      )}

      {/* 新手引导 */}
      {showGuide && (
        <NewbieGuide type='spell' onComplete={() => setShowGuide(false)} />
      )}

      {/* 施咒动画 */}
    </View>
  )
}