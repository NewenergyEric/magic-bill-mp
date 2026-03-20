import { View, Text, Input, Image, ScrollView } from '@tarojs/components'
import Taro, { useShareAppMessage, useShareTimeline } from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { Bill, Participant, SubLedger } from '@/types'
import { formatAmount } from '@/utils/settlement'
import { getRandomQuote } from '@/constants/quotes'
import NewbieGuide, { shouldShowGuide } from '@/components/NewbieGuide'
import WizardAvatar from '@/components/WizardAvatar'
import SharePoster from '@/components/SharePoster'
import UserLogin from '@/components/UserLogin'
import { useUser } from '@/contexts/UserContext'
import {
  getArchivedBills,
  getArchivedSubLedgers,
  getBillsBySubLedger,
  deleteBill as deleteBillFromLedger,
  deleteSubLedger,
  calculateSubLedgerSettlement,
  ParticipantSettlement
} from '@/services/ledger'
import { getCompanions, WizardCompanion } from '@/services/companions'
import { shareBill as shareBillService, shareEvent } from '@/services/share'
import { getMyContracts, getBillsByContract, getContractDetail } from '@/services/cloud'
import './index.scss'

export default function HistoryPage() {
  const { user, isLogged } = useUser()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [bills, setBills] = useState<Bill[]>([])
  const [archivedSubLedgers, setArchivedSubLedgers] = useState<SubLedger[]>([])
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null)
  const [selectedSubLedger, setSelectedSubLedger] = useState<SubLedger | null>(null)
  const [subLedgerBills, setSubLedgerBills] = useState<Bill[]>([])
  const [settlementData, setSettlementData] = useState<ReturnType<typeof calculateSubLedgerSettlement> | null>(null)
  const [showCalcProcess, setShowCalcProcess] = useState(true)
  const [showGuide, setShowGuide] = useState(shouldShowGuide('history'))
  const [currentQuote, setCurrentQuote] = useState('')
  const [showSharePoster, setShowSharePoster] = useState(false)
  const [companions, setCompanions] = useState<WizardCompanion[]>([])
  
  // 编辑事件名称
  const [showEditEvent, setShowEditEvent] = useState(false)
  const [editEventName, setEditEventName] = useState('')
  
  // 显示模式
  const [viewMode, setViewMode] = useState<'subledgers' | 'bills' | 'contracts'>('subledgers')

  // 契约相关状态
  const [contractBills, setContractBills] = useState<any[]>([])
  const [selectedContract, setSelectedContract] = useState<any>(null)
  const [contractList, setContractList] = useState<any[]>([])

  // 加载契约列表
  const loadContractList = async () => {
    try {
      const res = await getMyContracts()
      if (res.success && res.data) {
        setContractList(res.data)
      }
    } catch (e) {
      console.error('[History] 加载契约列表失败', e)
    }
  }

  // 加载契约账单
  const loadContractBills = async (contractId: string) => {
    try {
      const res = await getBillsByContract(contractId)
      if (res.success && res.data) {
        setContractBills(res.data)
      }
    } catch (e) {
      console.error('[History] 加载契约账单失败', e)
    }
  }

  // 选择契约查看
  const handleSelectContractForView = async (contract: any) => {
    setSelectedContract(contract)
    await loadContractBills(contract.contractId)
  }

  // 记录是否从事件详情进入账单详情（用于返回逻辑）
  const [previousSubLedger, setPreviousSubLedger] = useState<SubLedger | null>(null)

  // 分享给朋友
  useShareAppMessage(() => {
    const bill = selectedBill
    const quote = getRandomQuote()
    return {
      title: `🔮 ${bill?.eventName || '魔法账单'} - ¥${bill ? formatAmount(bill.totalAmount) : '0'}`,
      path: '/pages/index/index',
      imageUrl: '' // 可以设置分享图片
    }
  })

  // 分享到朋友圈
  useShareTimeline(() => {
    const bill = selectedBill
    return {
      title: `🔮 ${bill?.eventName || '魔法账单'} - 活点记账`,
      query: '',
      imageUrl: ''
    }
  })

  // 加载数据
  const loadData = () => {
    setArchivedSubLedgers(getArchivedSubLedgers())
    setBills(getArchivedBills())
    setCompanions(getCompanions())  // 加载最新伙伴列表
    loadContractList()  // 加载契约列表
  }

  // 每次进入页面时刷新数据
  useEffect(() => {
    loadData()
    // 首次进入时显示新手引导
    if (shouldShowGuide('history')) {
      setTimeout(() => setShowGuide(true), 500)
    }
  }, [])

  // 页面显示时也刷新
  Taro.useDidShow(() => {
    loadData()
  })

  const handleDeleteBill = (id: string) => {
    deleteBillFromLedger(id)
    loadData()
    setSelectedBill(null)
    
    // 如果是从事件详情进入的，返回到事件详情
    if (previousSubLedger) {
      setSelectedSubLedger(previousSubLedger)
      setSubLedgerBills(getBillsBySubLedger(previousSubLedger._id))
      setPreviousSubLedger(null)
    }
    
    Taro.showToast({ title: '记忆已抹除', icon: 'success' })
  }

  const handleDeleteSubLedger = (id: string) => {
    deleteSubLedger(id)
    loadData()
    setSelectedSubLedger(null)
    setSubLedgerBills([])
    Taro.showToast({ title: '记忆已遗忘', icon: 'success' })
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    const h = String(date.getHours()).padStart(2, '0')
    const min = String(date.getMinutes()).padStart(2, '0')
    return `${y}-${m}-${d} ${h}:${min}`
  }

  // 打开编辑事件名称
  const openEditEvent = () => {
    if (selectedBill) {
      setEditEventName(selectedBill.eventName)
      setShowEditEvent(true)
    }
  }

  // 确认编辑事件名称
  const confirmEditEvent = () => {
    if (selectedBill && editEventName.trim()) {
      const localBills = Taro.getStorageSync('magic_bills') || []
      const updatedBills = localBills.map((b: Bill) => 
        b._id === selectedBill._id ? { ...b, eventName: editEventName.trim() } : b
      )
      Taro.setStorageSync('magic_bills', updatedBills)
      setSelectedBill({ ...selectedBill, eventName: editEventName.trim() })
      loadData()
    }
    setShowEditEvent(false)
  }

  // 分享账单
  const shareBill = () => {
    if (selectedBill) {
      // 使用分享服务跳转到分享页面
      const shareInfo = shareBillService(selectedBill)
      Taro.navigateTo({
        url: `/pages/share/index?type=bill&id=${shareInfo.path.split('id=')[1]}`
      })
    }
  }
  
  // 分享事件
  const shareSubLedger = (subLedger: SubLedger) => {
    const shareInfo = shareEvent(subLedger)
    Taro.navigateTo({
      url: `/pages/share/index?type=event&id=${shareInfo.path.split('id=')[1]}`
    })
  }
  
  // 查看子收支录详情
  const openSubLedgerDetail = (subLedger: SubLedger) => {
    setSelectedSubLedger(subLedger)
    setSubLedgerBills(getBillsBySubLedger(subLedger._id))
    // 计算结算数据
    setSettlementData(calculateSubLedgerSettlement(subLedger._id))
    setShowCalcProcess(true)
  }
  
  // 关闭子收支录详情
  const closeSubLedgerDetail = () => {
    setSelectedSubLedger(null)
    setSubLedgerBills([])
    setSettlementData(null)
    setPreviousSubLedger(null) // 清除记录
  }
  
  // 从事件中点击账单查看
  const openBillFromSubLedger = (bill: Bill, subLedger: SubLedger) => {
    setPreviousSubLedger(subLedger) // 记录来源事件
    setSelectedBill(bill)
    setSelectedSubLedger(null) // 关闭事件弹窗
  }
  
  // 关闭账单详情（带返回逻辑）
  const closeBillDetail = () => {
    setSelectedBill(null)
    // 如果是从事件详情进入的，返回到事件详情
    if (previousSubLedger) {
      setSelectedSubLedger(previousSubLedger)
      setSubLedgerBills(getBillsBySubLedger(previousSubLedger._id))
      setPreviousSubLedger(null)
    }
  }

  return (
    <View className='history-page'>
      {/* Header */}
      <View className='page-header'>
        <View 
          className='help-btn'
          onClick={() => setShowGuide(true)}
        >
          <Text className='help-icon'>?</Text>
        </View>
        <Text className='header-icon'>📜</Text>
        <Text className='header-title'>冥想盆</Text>
        
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

      {/* 说明 */}
      <View className='tips-card'>
        <Text className='tips-text'>存放已完结的账单和记账事件</Text>
      </View>

      {/* 视图切换 */}
      <View className='view-tabs'>
        <View
          className={`tab-item ${viewMode === 'subledgers' ? 'active' : ''}`}
          onClick={() => setViewMode('subledgers')}
        >
          <Text className='tab-text'>归档事件</Text>
        </View>
        <View
          className={`tab-item ${viewMode === 'bills' ? 'active' : ''}`}
          onClick={() => setViewMode('bills')}
        >
          <Text className='tab-text'>单笔归档</Text>
        </View>
        <View
          className={`tab-item ${viewMode === 'contracts' ? 'active' : ''}`}
          onClick={() => {
            setViewMode('contracts')
            if (contractList.length > 0 && !selectedContract) {
              // 自动选中第一个契约
              handleSelectContractForView(contractList[0])
            }
          }}
        >
          <Text className='tab-text'>契约账本</Text>
        </View>
      </View>

      {/* 子收支录归档列表 */}
      {viewMode === 'subledgers' && (
        <>
          {archivedSubLedgers.length === 0 ? (
            <View className='empty-state'>
              <Text className='empty-icon'>📜</Text>
              <Text className='empty-text'>尚无归档的记账事件...</Text>
              <Text className='empty-hint'>在古灵阁中归档后显示在这里</Text>
            </View>
          ) : (
            <View className='subledgers-list'>
              {archivedSubLedgers.map((sl) => (
                <View 
                  key={sl._id} 
                  className='subledger-item'
                  onClick={() => openSubLedgerDetail(sl)}
                >
                  <View className='item-left'>
                    <View className='item-icon'>
                      <Text className='icon-text'>📜</Text>
                    </View>
                    <View className='item-info'>
                      <Text className='item-name'>{sl.name}</Text>
                      <Text className='item-date'>{formatDate(sl.date)}</Text>
                    </View>
                  </View>
                  <View className='item-right'>
                    <Text className='item-amount'>¥{formatAmount(sl.totalAmount)}</Text>
                    <Text className='item-count'>{sl.billIds.length}笔</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {/* 单笔账单归档列表 */}
      {viewMode === 'bills' && (
        <>
          {bills.length === 0 ? (
            <View className='empty-state'>
              <Text className='empty-icon'>📜</Text>
              <Text className='empty-text'>尚无魔法记忆被提取...</Text>
            </View>
          ) : (
            <View className='bills-list'>
              {bills.map((bill) => (
                <View
                  key={bill._id}
                  className='bill-item'
                  onClick={() => setSelectedBill(bill)}
                >
                  <View className={`bill-icon ${bill.type}`}>
                    <Text className='icon-text'>{bill.type === 'simple' ? '⚡' : '✨'}</Text>
                  </View>

                  <View className='bill-info'>
                    <Text className='bill-event'>{bill.eventName}</Text>
                    <Text className='bill-date'>{formatDate(bill.date)}</Text>
                  </View>

                  <View className='bill-amount'>
                    <Text className='amount-value'>¥{formatAmount(bill.totalAmount)}</Text>
                    <Text className='amount-count'>{bill.participantsCount} 位巫师</Text>
                  </View>

                  <Text className='bill-arrow'>→</Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {/* 契约账本视图 */}
      {viewMode === 'contracts' && (
        <>
          {contractList.length === 0 ? (
            <View className='empty-state'>
              <Text className='empty-icon'>📜</Text>
              <Text className='empty-text'>尚无契约账本...</Text>
              <Text className='empty-hint'>在契约页面创建或加入契约</Text>
            </View>
          ) : (
            <View className='contract-contracts-view'>
              {/* 契约列表 */}
              <View className='contract-list-section'>
                <Text className='section-label'>选择契约</Text>
                <ScrollView scrollX className='contract-scroll'>
                  {contractList.map((contract) => (
                    <View
                      key={contract.contractId}
                      className={`contract-chip ${selectedContract?.contractId === contract.contractId ? 'active' : ''}`}
                      onClick={() => handleSelectContractForView(contract)}
                    >
                      <Text className='chip-icon'>📜</Text>
                      <Text className='chip-name'>{contract.name}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>

              {/* 选中契约的账单列表 */}
              {selectedContract && (
                <View className='contract-bills-section'>
                  <Text className='section-label'>
                    {selectedContract.name} - 账单 ({contractBills.length})
                  </Text>
                  {contractBills.length === 0 ? (
                    <View className='empty-state-small'>
                      <Text className='empty-text-small'>暂无账单</Text>
                    </View>
                  ) : (
                    <View className='bills-list'>
                      {contractBills.map((bill) => (
                        <View
                          key={bill._id || bill.billId}
                          className='bill-item'
                        >
                          <View className={`bill-icon ${bill.spellType || 'simple'}`}>
                            <Text className='icon-text'>{bill.spellType === 'multi' ? '✨' : '⚡'}</Text>
                          </View>
                          <View className='bill-info'>
                            <Text className='bill-event'>{bill.eventName}</Text>
                            <Text className='bill-date'>{bill.createdAt ? formatDate(new Date(bill.createdAt).getTime()) : ''}</Text>
                          </View>
                          <View className='bill-amount'>
                            <Text className='amount-value'>¥{formatAmount(bill.totalAmount)}</Text>
                            <Text className='amount-count'>{bill.participants?.length || 0} 位巫师</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </>
      )}

      {/* 子收支录详情弹窗 */}
      {selectedSubLedger && (
        <View 
          className='detail-mask' 
          onClick={closeSubLedgerDetail}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <View className='detail-content' onClick={(e) => e.stopPropagation()}>
            <View className='detail-header'>
              <Text className='detail-title'>{selectedSubLedger.name}</Text>
              <View className='detail-close' onClick={closeSubLedgerDetail}>
                <Text className='close-icon'>✕</Text>
              </View>
            </View>

            <View className='detail-summary'>
              <View className='summary-item'>
                <Text className='summary-label'>总金额</Text>
                <Text className='summary-value'>¥{formatAmount(selectedSubLedger.totalAmount)}</Text>
              </View>
              <View className='summary-item'>
                <Text className='summary-label'>账单数</Text>
                <Text className='summary-value'>{selectedSubLedger.billIds.length}笔</Text>
              </View>
            </View>

            <ScrollView 
              scrollY 
              className='detail-scroll'
              onClick={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
            >

            {/* 账单列表 */}
            <View className='bills-section'>
              <Text className='bills-title'>关联账单</Text>
              {subLedgerBills.length === 0 ? (
                <Text className='no-bills'>暂无关联账单</Text>
              ) : (
                <View className='bills-list-modal'>
                  {subLedgerBills.map((bill) => {
                      // 同步最新名字
                      const getSyncedNames = () => {
                        if (!bill.details?.participants) return `${bill.participantsCount}人`
                        return bill.details.participants.map(p => {
                          const companion = companions.find(c => c.name === p.name)
                          if (companion) return companion.name
                          // 尝试按头像匹配
                          const byAvatar = companions.find(c => c.avatar === p.avatar && c.name !== p.name)
                          return byAvatar?.name || p.name
                        }).join('、')
                      }
                      return (
                      <View
                        key={bill._id}
                        className='bill-item-small'
                        onClick={() => openBillFromSubLedger(bill, selectedSubLedger)}
                      >
                        <View className='bill-type'>
                          <Text className='type-icon'>{bill.type === 'simple' ? '⚡' : '✨'}</Text>
                        </View>
                        <View className='bill-info-small'>
                          <Text className='bill-event-small'>{bill.eventName}</Text>
                          <Text className='bill-participants'>
                            {getSyncedNames()}
                          </Text>
                        </View>
                        <Text className='bill-amount-small'>¥{formatAmount(bill.totalAmount)}</Text>
                      </View>
                    )})}
                </View>
              )}
            </View>

            {/* 计算过程 - 表格形式 */}
            {settlementData && settlementData.participants.length > 0 && (
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
                        
                        // 同步最新头像
                        const syncWizardInfo = (name: string, avatar: string): { name: string; avatar: string } => {
                          let companion = companions.find(c => c.name === name)
                          if (companion) {
                            return { name: companion.name, avatar: companion.avatar || avatar }
                          }
                          companion = companions.find(c => c.avatar === avatar && c.name !== name)
                          if (companion) {
                            return { name: companion.name, avatar: companion.avatar }
                          }
                          return { name, avatar }
                        }
                        const info = syncWizardInfo(p.name, p.avatar || '')
                        
                        return (
                          <View key={p.id} className={`calc-table-row ${isReceive ? 'row-receive' : isPay ? 'row-pay' : ''}`}>
                            <View className='td-avatar'>
                              <WizardAvatar name={info.avatar} className='small' />
                            </View>
                            <Text className='td-name'>{info.name}</Text>
                            <Text className='td-paid'>{formatAmount(p.paid)}</Text>
                            <Text className='td-consumed'>{formatAmount(p.shouldPay)}</Text>
                            <View className='td-balance-wrapper'>
                              {isReceive ? (
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

            </ScrollView>

            <View className='detail-actions'>
              <View className='action-btn share-btn' onClick={() => shareSubLedger(selectedSubLedger)}>
                <Text className='btn-text'>分享</Text>
              </View>
              <View className='action-btn delete-btn' onClick={() => handleDeleteSubLedger(selectedSubLedger._id)}>
                <Text className='btn-text'>遗忘</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* 账单详情弹窗 */}
      {selectedBill && (
        <View className='modal-mask'>
          <View className='modal-content'>
            {/* 关闭按钮 */}
            <View className='modal-close' onClick={closeBillDetail}>
              <Text className='close-icon'>✕</Text>
            </View>
            
            <View className='modal-header'>
              <View className={`modal-icon ${selectedBill.type}`}>
                <Text className='icon-text'>{selectedBill.type === 'simple' ? '⚡' : '✨'}</Text>
              </View>
              <Text className='modal-event' onClick={openEditEvent}>{selectedBill.eventName}</Text>
              <Text className='modal-date'>{formatDate(selectedBill.date)}</Text>
            </View>

            <View className='modal-details'>
              <View className='detail-row'>
                <Text className='detail-label'>总计金加隆</Text>
                <Text className='detail-value'>¥{formatAmount(selectedBill.totalAmount)}</Text>
              </View>
              
              {/* 参与者展示 */}
              {selectedBill.details?.participants && selectedBill.details.participants.length > 0 && (
                <View className='participants-section'>
                  <Text className='participants-label'>参与巫师</Text>
                  <View className='participants-list'>
                    {(() => {
                      // 从伙伴列表同步最新头像和名字
                      const syncWizardInfo = (name: string, originalAvatar: string): { name: string; avatar: string } => {
                        let companion = companions.find(c => c.name === name)
                        if (companion) {
                          return { name: companion.name, avatar: companion.avatar || originalAvatar }
                        }
                        // 如果名字没匹配，尝试按头像匹配（可能是名字改了）
                        companion = companions.find(c => c.avatar === originalAvatar && c.name !== name)
                        if (companion) {
                          return { name: companion.name, avatar: companion.avatar }
                        }
                        return { name, avatar: originalAvatar }
                      }
                      return selectedBill.details!.participants.map((p: Participant) => {
                        const info = syncWizardInfo(p.name, p.avatar || '')
                        return (
                          <View key={p.id} className='participant-item'>
                            <WizardAvatar name={info.avatar} />
                            <Text className='participant-name'>{info.name}</Text>
                          </View>
                        )
                      })
                    })()}
                  </View>
                </View>
              )}

              {selectedBill.type === 'simple' ? (
                <View className='detail-row'>
                  <Text className='detail-label'>每位巫师应付</Text>
                  <Text className='detail-value highlight'>
                    ¥{formatAmount(selectedBill.totalAmount / selectedBill.participantsCount)}
                  </Text>
                </View>
              ) : (
                selectedBill.details?.settlements && selectedBill.details.settlements.length > 0 && (
                  <View className='settlements-section'>
                    <Text className='settlements-label'>清算契约</Text>
                    <View className='settlements-list'>
                      {(() => {
                        // 从伙伴列表同步最新头像和名字
                        const syncWizardInfo = (name: string, originalAvatar: string): { name: string; avatar: string } => {
                          let companion = companions.find(c => c.name === name)
                          if (companion) {
                            return { name: companion.name, avatar: companion.avatar || originalAvatar }
                          }
                          companion = companions.find(c => c.avatar === originalAvatar && c.name !== name)
                          if (companion) {
                            return { name: companion.name, avatar: companion.avatar }
                          }
                          return { name, avatar: originalAvatar }
                        }
                        return selectedBill.details!.settlements!.map((s, i) => {
                          const fromP = selectedBill.details?.participants?.find((p: Participant) => p.name === s.from)
                          const toP = selectedBill.details?.participants?.find((p: Participant) => p.name === s.to)
                          const fromInfo = syncWizardInfo(s.from, fromP?.avatar || '')
                          const toInfo = syncWizardInfo(s.to, toP?.avatar || '')
                          return (
                            <View key={i} className='settlement-item'>
                              <View className='settlement-user'>
                                <WizardAvatar name={fromInfo.avatar} />
                                <Text className='user-name'>{fromInfo.name}</Text>
                              </View>
                              <View className='settlement-arrow'>
                                <Text className='settlement-amount'>¥{formatAmount(s.amount)}</Text>
                                <Text className='arrow-icon'>→</Text>
                              </View>
                              <View className='settlement-user'>
                                <WizardAvatar name={toInfo.avatar} />
                                <Text className='user-name'>{toInfo.name}</Text>
                              </View>
                            </View>
                          )
                        })
                      })()}
                    </View>
                  </View>
                )
              )}
              
              {/* 经典台词 */}
              <View className='quote-section'>
                <Text className='quote-text'>✨ {currentQuote || getRandomQuote()}</Text>
              </View>
            </View>

            <View className='modal-actions'>
              <View className='action-btn share' onClick={shareBill}>
                <Text className='action-text'>📤 分享</Text>
              </View>
              <View className='action-btn delete' onClick={() => handleDeleteBill(selectedBill._id!)}>
                <Text className='action-text'>抹除记忆</Text>
              </View>
              <View className='action-btn confirm' onClick={closeBillDetail}>
                <Text className='action-text'>封存</Text>
              </View>
            </View>
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

      {/* 分享海报 */}
      <SharePoster 
        bill={selectedBill}
        visible={showSharePoster}
        onClose={() => setShowSharePoster(false)}
      />

      {/* 新手引导 */}
      {showGuide && (
        <NewbieGuide type='history' onComplete={() => setShowGuide(false)} />
      )}
    </View>
  )
}