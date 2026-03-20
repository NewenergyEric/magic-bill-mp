import { View, Text, Input, Button } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import { getCompanions, WizardCompanion, addOrUpdateCompanion } from '@/services/companions'
import { WIZARDS } from '@/constants/wizards'
import { Bill, Participant, Settlement, SubLedger } from '@/types'
import { 
  getActiveSubLedgers, 
  linkBillToSubLedger,
  saveBill as saveBillToLedger,
  createSubLedger,
  getRandomEventName
} from '@/services/ledger'
import WizardAvatar from '@/components/WizardAvatar'
import './index.scss'

const MAGIC_EVENTS = [
  '购买《高级魔药制作》二手书',
  '古灵阁金库年度管理费',
  '三把扫帚黄油啤酒团购',
  '韦斯莱笑话商店整蛊产品',
  '蜂蜜公爵糖果店大采购',
  '奥利凡德魔杖抛光护理',
]

export default function MultiPage() {
  const [wizards, setWizards] = useState<Participant[]>([])
  const [editingWizard, setEditingWizard] = useState<string | null>(null)
  const [tempPaid, setTempPaid] = useState('')
  const [companions, setCompanions] = useState<WizardCompanion[]>([])
  const [showCompanionPicker, setShowCompanionPicker] = useState(false)
  const [selectedCompanionIds, setSelectedCompanionIds] = useState<string[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  
  // 动画和结果
  const [isCalculating, setIsCalculating] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [resultData, setResultData] = useState<{ eventName: string; total: number; settlements: Settlement[]; billId?: string } | null>(null)
  
  // 编辑事件名称
  const [showEditEvent, setShowEditEvent] = useState(false)
  const [editEventName, setEditEventName] = useState('')
  
  // 子收支录相关
  const [subLedgers, setSubLedgers] = useState<SubLedger[]>([])
  const [showSubLedgerPicker, setShowSubLedgerPicker] = useState(false)
  const [selectedSubLedgerId, setSelectedSubLedgerId] = useState('')
  
  // 新建事件
  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const [newEventName, setNewEventName] = useState('')
  
  useDidShow(() => {
    setCompanions(getCompanions())
    setSubLedgers(getActiveSubLedgers())
  })

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
    const toAdd = companions.filter(c => selectedCompanionIds.includes(c.id) && !wizards.find(w => w.id === c.id))
    const newWizards = toAdd.map(c => ({
      id: c.id,
      name: c.name,
      avatar: c.avatar,
      paid: 0
    }))
    setWizards([...wizards, ...newWizards])
    setSelectedCompanionIds([])
    setShowCompanionPicker(false)
  }

  // 添加随机巫师
  const addRandomWizard = () => {
    if (!newName.trim()) {
      Taro.showToast({ title: '请输入姓名', icon: 'none' })
      return
    }
    const avatar = getRandomAvatar()
    const wizardName = newName.trim()
    setWizards([...wizards, {
      id: Date.now().toString(),
      name: wizardName,
      avatar,
      paid: 0
    }])
    // 同步到伙伴列表
    addOrUpdateCompanion(wizardName, avatar)
    setCompanions(getCompanions())
    setNewName('')
    setShowAddForm(false)
  }

  const removeWizard = (id: string) => {
    setWizards(wizards.filter(w => w.id !== id))
  }

  const updatePaid = () => {
    if (editingWizard) {
      setWizards(wizards.map(w => w.id === editingWizard ? { ...w, paid: parseFloat(tempPaid) || 0 } : w))
      setEditingWizard(null)
      setTempPaid('')
    }
  }

  const calculate = async () => {
    if (wizards.length < 2) {
      Taro.showToast({ title: '请至少添加2位巫师', icon: 'none' })
      return
    }

    // 显示动画
    setIsCalculating(true)
    await new Promise(resolve => setTimeout(resolve, 2000))

    const total = wizards.reduce((s, w) => s + w.paid, 0)
    const avg = total / wizards.length

    const balances = wizards.map(w => ({ name: w.name, balance: w.paid - avg }))
    const debtors = balances.filter(b => b.balance < 0).sort((a, b) => a.balance - b.balance)
    const creditors = balances.filter(b => b.balance > 0).sort((a, b) => b.balance - a.balance)

    const settlements: Settlement[] = []
    let dIdx = 0, cIdx = 0
    while (dIdx < debtors.length && cIdx < creditors.length) {
      const amount = Math.min(Math.abs(debtors[dIdx].balance), creditors[cIdx].balance)
      if (amount > 0.01) settlements.push({ from: debtors[dIdx].name, to: creditors[cIdx].name, amount })
      debtors[dIdx].balance += amount
      creditors[cIdx].balance -= amount
      if (Math.abs(debtors[dIdx].balance) < 0.01) dIdx++
      if (Math.abs(creditors[cIdx].balance) < 0.01) cIdx++
    }

    const eventName = MAGIC_EVENTS[Math.floor(Math.random() * MAGIC_EVENTS.length)]

    const bill: Omit<Bill, '_id' | 'userId'> = {
      type: 'multi',
      eventName,
      totalAmount: total,
      participantsCount: wizards.length,
      date: Date.now(),
      details: { participants: wizards, settlements }
    }

    // 保存账单
    const savedBill = saveBillToLedger(bill)

    setIsCalculating(false)
    setResultData({ eventName, total, settlements, billId: savedBill._id })
    setShowResult(true)
  }

  // 关闭结果
  const closeResult = () => {
    setShowResult(false)
    setResultData(null)
  }

  // 关联到子收支录
  const handleLinkToSubLedger = () => {
    console.log('handleLinkToSubLedger called', { 
      billId: resultData?.billId, 
      selectedSubLedgerId,
      subLedgers: subLedgers.length
    })
    
    if (!resultData?.billId) {
      Taro.showToast({ title: '账单数据错误', icon: 'none' })
      return
    }
    
    if (!selectedSubLedgerId) {
      Taro.showToast({ title: '请选择记账事件', icon: 'none' })
      return
    }
    
    const success = linkBillToSubLedger(resultData.billId, selectedSubLedgerId)
    console.log('linkBillToSubLedger result:', success)
    
    if (success) {
      setShowSubLedgerPicker(false)
      setShowResult(false)
      setSelectedSubLedgerId('')
      setResultData(null)
      setWizards([])
      Taro.showToast({ title: '入账成功', icon: 'success' })
    } else {
      Taro.showToast({ title: '入账失败', icon: 'none' })
    }
  }

  // 入账并关联
  const saveToLedger = () => {
    setSelectedSubLedgerId('') // 重置选择状态
    setSubLedgers(getActiveSubLedgers())
    setShowSubLedgerPicker(true)
  }
  
  // 创建新事件并关联
  const createAndLinkEvent = () => {
    if (!newEventName.trim()) {
      Taro.showToast({ title: '请输入事件名称', icon: 'none' })
      return
    }
    const newSubLedger = createSubLedger(newEventName.trim())
    if (resultData?.billId) {
      const success = linkBillToSubLedger(resultData.billId, newSubLedger._id)
      if (success) {
        setShowCreateEvent(false)
        setShowSubLedgerPicker(false)
        setShowResult(false)
        setNewEventName('')
        setSelectedSubLedgerId('')
        setResultData(null)
        setWizards([])
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
  }
  
  // 打开新建事件弹窗
  const openCreateEvent = () => {
    setNewEventName(getRandomEventName())
    setShowCreateEvent(true)
  }
  
  // 单独归档
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
          Taro.showToast({ title: '已归档到冥想盆', icon: 'success' })
        }
      }
    })
  }

  // 打开编辑事件名称
  const openEditEvent = () => {
    if (resultData) {
      setEditEventName(resultData.eventName)
      setShowEditEvent(true)
    }
  }

  // 确认编辑事件名称
  const confirmEditEvent = () => {
    if (resultData && editEventName.trim()) {
      setResultData({ ...resultData, eventName: editEventName.trim() })
      // 更新本地存储的账单
      const localBills = Taro.getStorageSync('magic_bills') || []
      if (localBills.length > 0) {
        localBills[0].eventName = editEventName.trim()
        Taro.setStorageSync('magic_bills', localBills)
      }
    }
    setShowEditEvent(false)
  }

  return (
    <View className='multi-page'>
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
              value={newName}
              onInput={(e) => setNewName(e.detail.value)}
              placeholder='输入姓名'
              autoFocus
            />
            <Text className='cancel-text' onClick={() => { setShowAddForm(false); setNewName('') }}>取消</Text>
            <Text className='confirm-text' onClick={addRandomWizard}>确认</Text>
          </View>
        )}

        {/* 巫师列表 */}
        <View className='wizards-list'>
          {wizards.length === 0 ? (
            <View className='empty-wizards'>
              <Text className='empty-text'>点击上方按钮召唤巫师</Text>
            </View>
          ) : (
            wizards.map((w, index) => (
              <View 
                key={w.id} 
                className={`wizard-row ${w.paid > 0 ? 'has-paid' : ''}`}
                onClick={() => {
                  setEditingWizard(w.id)
                  setTempPaid(w.paid.toString())
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
                  <Text className='amount-value'>{w.paid > 0 ? `¥${w.paid.toFixed(2)}` : '¥0.00'}</Text>
                </View>
                <View className='remove-btn' onClick={(e) => { e.stopPropagation(); removeWizard(w.id) }}>
                  <Text className='remove-icon'>✕</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* 统计信息 */}
        {wizards.length > 0 && (
          <View className='stats-bar'>
            <Text className='stats-text'>共 {wizards.length} 位巫师</Text>
            <Text className='stats-total'>总计: ¥{wizards.reduce((s, w) => s + w.paid, 0).toFixed(2)}</Text>
          </View>
        )}

        {wizards.length >= 2 && (
          <Button className='calc-button' onClick={calculate}>
            <Text className='calc-icon'>✨</Text>
            <Text className='calc-text'>施展清算咒</Text>
          </Button>
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
      {showResult && resultData && (
        <View className='result-mask' onClick={closeResult}>
          <View className='result-card' onClick={(e) => e.stopPropagation()}>
            <View className='result-header'>
              <Text className='result-title'>✨ 清算咒生效！</Text>
              <View className='result-close' onClick={closeResult}>
                <Text className='close-icon'>✕</Text>
              </View>
            </View>
            
            <View className='result-event' onClick={openEditEvent}>{resultData.eventName}</View>
            
            <View className='result-main'>
              <Text className='result-label'>总支出</Text>
              <Text className='result-amount'>¥{resultData.total.toFixed(2)}</Text>
            </View>

            {/* 结算详情 */}
            <View className='settlements-section'>
              <Text className='section-title'>结算方案</Text>
              {resultData.settlements.length === 0 ? (
                <Text className='no-settlement'>无需结算，大家已平摊！</Text>
              ) : (
                resultData.settlements.map((s, idx) => {
                  const fromWizard = wizards.find(w => w.name === s.from)
                  const toWizard = wizards.find(w => w.name === s.to)
                  return (
                    <View key={idx} className='settlement-item'>
                      <View className='settlement-user'>
                        <WizardAvatar name={fromWizard?.avatar || ''} />
                        <Text className='user-name'>{s.from}</Text>
                      </View>
                      <View className='settlement-arrow'>
                        <Text className='arrow-amount'>¥{s.amount.toFixed(2)}</Text>
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
              <Button className='result-save-btn' onClick={saveToLedger}>
                <Text>入账</Text>
              </Button>
              <Button className='result-archive-btn' onClick={archiveBill}>
                <Text>归档</Text>
              </Button>
              <Button className='result-confirm-btn' onClick={closeResult}>
                <Text>完成</Text>
              </Button>
            </View>
          </View>
        </View>
      )}

      {/* 编辑金额弹窗 */}
      {editingWizard && (
        <View className='modal-mask' onClick={() => setEditingWizard(null)}>
          <View className='modal-content' onClick={(e) => e.stopPropagation()}>
            <Text className='modal-title'>输入垫付金额</Text>
            
            <View className='modal-avatar'>
              <WizardAvatar name={wizards.find(w => w.id === editingWizard)?.avatar || ''} className='large' />
              <Text className='modal-name'>{wizards.find(w => w.id === editingWizard)?.name}</Text>
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
              <Text className='modal-confirm' onClick={updatePaid}>确认</Text>
            </View>
          </View>
        </View>
      )}

      {/* 伙伴选择弹窗 - 多选 */}
      {showCompanionPicker && (
        <View className='modal-mask' onClick={() => setShowCompanionPicker(false)}>
          <View className='companion-picker' onClick={(e) => e.stopPropagation()}>
            <View className='picker-header'>
              <Text className='picker-title'>选择伙伴 (已选 {selectedCompanionIds.length} 位)</Text>
              <View className='picker-close' onClick={() => { setSelectedCompanionIds([]); setShowCompanionPicker(false) }}>
                <Text className='close-icon'>✕</Text>
              </View>
            </View>
            
            {companions.length === 0 ? (
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
                  {companions.map((companion) => {
                    const isSelected = selectedCompanionIds.includes(companion.id)
                    const alreadyAdded = wizards.find(w => w.id === companion.id)
                    return (
                      <View 
                        key={companion.id} 
                        className={`picker-item ${isSelected ? 'selected' : ''} ${alreadyAdded ? 'disabled' : ''}`}
                        onClick={() => !alreadyAdded && toggleCompanionSelect(companion)}
                      >
                        <View className={`checkbox ${isSelected ? 'checked' : ''}`}>
                          {isSelected && <Text className='check-mark'>✓</Text>}
                        </View>
                        <WizardAvatar name={companion.avatar} />
                        <Text className='picker-name'>{companion.name}</Text>
                        {alreadyAdded && <Text className='already-added'>已添加</Text>}
                      </View>
                    )
                  })}
                </View>
                {selectedCompanionIds.length > 0 && (
                  <View className='picker-footer'>
                    <Button className='confirm-add-btn' onClick={confirmAddCompanions}>
                      确认添加 {selectedCompanionIds.length} 位伙伴
                    </Button>
                  </View>
                )}
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
                          console.log('Selected subledger:', sl._id, sl.name);
                          setSelectedSubLedgerId(sl._id); 
                        }}
                      >
                        <View className='subledger-icon'>📜</View>
                        <View className='subledger-info'>
                          <Text className='subledger-name'>{sl.name}</Text>
                          <Text className='subledger-amount'>¥{sl.totalAmount.toFixed(2)}</Text>
                        </View>
                        {isSelected && <Text className='check-icon'>✓</Text>}
                      </View>
                    )
                  })}
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
    </View>
  )
}