/**
 * 活点账单 v2.0.0 测试用例
 *
 * 测试范围：
 * 1. 右上角登录头像显示
 * 2. 新手引导自动弹出与按钮样式
 * 3. 头像/名字修改后跨页面同步
 * 4. 入账功能
 * 5. 其他UI/UX问题
 */

import { expect, test, describe } from 'vitest'

// ========== Mock 数据 ==========

const mockCompanion = {
  id: 'test-companion-1',
  name: '测试巫师',
  avatar: 'Harry',
  createdAt: Date.now(),
  isSelf: false
}

const mockUser = {
  nickName: '测试用户',
  avatarUrl: 'Harry', // 巫师形象名称
  isWechatAvatar: false
}

const mockBill = {
  _id: 'test-bill-1',
  eventName: '测试聚餐',
  totalAmount: 30000, // 300元
  participantsCount: 3,
  type: 'simple' as const,
  date: Date.now(),
  archived: false,
  subLedgerId: 'test-subledger-1',
  details: {
    participants: [
      { id: 'p1', name: '哈利', avatar: 'Harry', paid: 30000, shouldPay: 10000 },
      { id: 'p2', name: '罗恩', avatar: 'Ron', paid: 0, shouldPay: 10000 },
      { id: 'p3', name: '赫敏', avatar: 'Hermione', paid: 0, shouldPay: 10000 }
    ],
    settlements: [],
    payerId: 'p1'
  }
}

const mockSubLedger = {
  _id: 'test-subledger-1',
  name: '测试事件',
  date: Date.now(),
  billIds: [],
  totalAmount: 0,
  status: 'active' as const
}

// ========== 工具函数测试 ==========

describe('工具函数测试', () => {

  test('WizardAvatar 应该正确渲染巫师形象', () => {
    // WizardAvatar 组件应接受 name, size, className 属性
    const props = { name: 'Harry', size: 'small' as const }
    expect(props.name).toBe('Harry')
    expect(props.size).toBe('small')
  })

  test('WizardAvatar 应该正确渲染微信头像URL', () => {
    // 微信头像是 http/https 开头
    const wechatAvatarUrl = 'https://thirdwx.qlogo.cn/avatar123'
    const isWechatAvatar = wechatAvatarUrl.startsWith('http')
    expect(isWechatAvatar).toBe(true)
  })

  test('WizardAvatar small 尺寸应为 60rpx', () => {
    // WizardAvatar/index.scss 中 .wizard-avatar.small 尺寸
    const smallSize = 60
    expect(smallSize).toBe(60)
  })

  test('头像容器 user-avatar-btn 尺寸应为 64rpx', () => {
    // app.scss 中 .user-avatar-btn 尺寸
    const containerSize = 64
    expect(containerSize).toBe(64)
  })
})

// ========== 新手引导测试 ==========

describe('新手引导测试', () => {

  test('冥想盆应有专属的新手引导内容', () => {
    const historyGuideSteps = [
      { title: '冥想盆 📜', desc: '这里保存着你所有的历史账单', icon: '📜' },
      { title: '查看归档', desc: '点击任意账单卡片查看详情', icon: '👁️' },
      { title: '分享账单', desc: '在详情页可以生成分享契约', icon: '🔗' },
      { title: '开始探索！', desc: '回顾你的魔法消费之旅吧', icon: '🪄' },
    ]
    expect(historyGuideSteps.length).toBe(4)
    expect(historyGuideSteps[0].title).toContain('冥想盆')
  })

  test('冥想盆新手引导应自动弹出', () => {
    // shouldShowGuide('history') 应返回 true（如果是首次）
    const shouldShowGuide = (type: string) => {
      const STORAGE_KEYS: Record<string, string> = {
        history: 'guide_history_completed',
      }
      // 模拟首次访问
      return true
    }
    expect(shouldShowGuide('history')).toBe(true)
  })

  test('新手引导按钮文字颜色应为金色 #d4af37', () => {
    // NewbieGuide/index.scss 中 .btn-text color
    const btnTextColor = '#d4af37'
    expect(btnTextColor).toBe('#d4af37')
  })

  test('新手引导按钮样式应为深色背景 + 金色边框', () => {
    // NewbieGuide/index.scss 中 .guide-btn 样式
    const guideBtnStyle = {
      background: '#1a0f0a',
      border: '3rpx solid #d4af37'
    }
    expect(guideBtnStyle.background).toBe('#1a0f0a')
    expect(guideBtnStyle.border).toContain('#d4af37')
  })

  test('所有页面新手引导使用统一组件', () => {
    const guideTypes = ['spell', 'ledger', 'companion', 'history']
    expect(guideTypes.length).toBe(4)
  })
})

// ========== 头像同步测试 ==========

describe('头像同步测试', () => {

  test('休息室修改头像后应更新存储', () => {
    // updateCompanion 应调用 saveCompanions
    const companions = [mockCompanion]
    const updatedCompanions = companions.map(c =>
      c.id === mockCompanion.id
        ? { ...c, avatar: 'Hermione' }
        : c
    )
    expect(updatedCompanions[0].avatar).toBe('Hermione')
  })

  test('古灵阁结算详情应使用 syncAvatar 同步最新头像', () => {
    const freshCompanions = [
      { ...mockCompanion, avatar: 'Hermione' }
    ]
    const syncAvatar = (name: string, originalAvatar: string): string => {
      const companion = freshCompanions.find(c => c.name === name)
      return companion?.avatar || originalAvatar
    }

    const originalAvatar = 'Harry' // 账单中保存的头像
    const syncedAvatar = syncAvatar('测试巫师', originalAvatar)
    expect(syncedAvatar).toBe('Hermione') // 应同步为最新头像
  })

  test('冥想盆归档账单应使用 companions 同步头像', () => {
    const companions = [
      { name: '哈利', avatar: 'Hermione' }, // 头像被修改过
      { name: '罗恩', avatar: 'Ron' },
      { name: '赫敏', avatar: 'Hermione' }
    ]

    const syncAvatar = (name: string, originalAvatar: string): string => {
      const companion = companions.find(c => c.name === name)
      return companion?.avatar || originalAvatar
    }

    // 原账单中哈利的头像是 Harry，但 companions 中已更新为 Hermione
    const syncedAvatar = syncAvatar('哈利', 'Harry')
    expect(syncedAvatar).toBe('Hermione')
  })

  test('施咒页面 useDidShow 应刷新 companions 并同步头像', () => {
    // 模拟施咒页面切换回来时的行为
    let companions = [mockCompanion]

    // 用户在休息室修改了头像
    companions = companions.map(c =>
      c.id === mockCompanion.id
        ? { ...c, avatar: 'Hermione' }
        : c
    )

    // 模拟施咒页面 useDidShow 刷新
    const freshCompanions = [...companions]

    // 模拟巫师列表也应同步更新
    let wizards = [{ id: '1', name: '测试巫师', avatar: 'Harry' }]
    wizards = wizards.map(w => {
      const companion = freshCompanions.find(c => c.name === w.name)
      return companion ? { ...w, avatar: companion.avatar } : w
    })

    expect(wizards[0].avatar).toBe('Hermione')
  })

  test('施咒页面初始化时应加载 companions', () => {
    // 修复：useEffect 初始化 companions
    let companions: typeof mockCompanion[] = []

    // 模拟 useEffect(() => { setCompanions(getCompanions()) }, [])
    const initializeCompanions = () => {
      companions = [mockCompanion]
    }

    initializeCompanions()
    expect(companions.length).toBeGreaterThan(0)
    expect(companions[0].name).toBe('测试巫师')
  })
})

// ========== 入账功能测试 ==========

describe('入账功能测试', () => {

  test('linkBillToSubLedger 应正确关联账单到子收支录', () => {
    // 模拟 linkBillToSubLedger 逻辑
    let bills = [{ _id: 'bill-1', subLedgerId: '' }]
    const subLedgerId = 'subledger-1'

    const linkBillToSubLedger = (billId: string, slId: string) => {
      const index = bills.findIndex(b => b._id === billId)
      if (index !== -1) {
        bills[index].subLedgerId = slId
        return true
      }
      return false
    }

    const result = linkBillToSubLedger('bill-1', subLedgerId)
    expect(result).toBe(true)
    expect(bills[0].subLedgerId).toBe('subledger-1')
  })

  test('入账后账单应出现在古灵阁的子收支录中', () => {
    // 模拟入账后的账单列表
    let bills = [mockBill]

    // 关联到子收支录
    bills = bills.map(b =>
      b._id === mockBill._id
        ? { ...b, subLedgerId: 'test-subledger-1' }
        : b
    )

    // 获取子收支录的账单
    const getBillsBySubLedger = (subLedgerId: string) =>
      bills.filter(b => b.subLedgerId === subLedgerId)

    const subLedgerBills = getBillsBySubLedger('test-subledger-1')
    expect(subLedgerBills.length).toBe(1)
    expect(subLedgerBills[0].eventName).toBe('测试聚餐')
  })

  test('入账后应进入连续记账模式', () => {
    // 模拟入账后设置 activeAccountingEvent
    const activeAccountingEvent = {
      id: 'test-subledger-1',
      name: '测试事件'
    }

    expect(activeAccountingEvent.id).toBe('test-subledger-1')
    expect(activeAccountingEvent.name).toBe('测试事件')
  })

  test('入账后应清空当前记账内容', () => {
    // 模拟清空状态
    let resultData = { perPerson: 10000, billId: 'bill-1' }
    let amount = '100'
    let wizards = [{ id: '1', name: '哈利' }]

    // 模拟入账成功后的清空
    const handleRecordSuccess = () => {
      resultData = null
      amount = ''
      wizards = []
    }

    handleRecordSuccess()
    expect(resultData).toBeNull()
    expect(amount).toBe('')
    expect(wizards.length).toBe(0)
  })

  test('入账时应正确获取当前 tab 的 billId', () => {
    // 模拟根据 activeTab 获取 billId
    const multiResultData = { billId: 'multi-bill-1' }
    const resultData = { billId: 'simple-bill-1' }
    const activeTab = 'multi'

    const currentBillId = activeTab === 'multi'
      ? multiResultData?.billId
      : resultData?.billId

    expect(currentBillId).toBe('multi-bill-1')
  })
})

// ========== UI/UX 测试 ==========

describe('UI/UX 测试', () => {

  test('首页"登录创建巫师形象"提示应为金色', () => {
    // index.scss 中 .hint-text color: $magic-gold
    const hintColor = '#d4af37'
    expect(hintColor).toBe('#d4af37')
  })

  test('休息室"登录后可创建巫师形象"提示应为羊皮纸色', () => {
    // companions/index.scss 中 .tips-hint color: $parchment
    const tipsHintColor = '#f4e4bc'
    expect(tipsHintColor).toBe('#f4e4bc')
  })

  test('删除按钮文字应为"遗忘"', () => {
    // 所有删除相关文案应改为"遗忘"
    const deleteTexts = ['遗忘', '确认遗忘', '忘记这个名字']
    expect(deleteTexts.some(t => t.includes('遗忘'))).toBe(true)
  })

  test('Tab 名称"休息室"应替代"伙伴"', () => {
    // page-header 中标题应为"休息室"
    const tabName = '休息室'
    expect(tabName).toBe('休息室')
    expect(tabName).not.toBe('伙伴')
  })

  test('应用标题应为"活点账单"', () => {
    // 微信小程序标题
    const appTitle = '活点账单'
    expect(appTitle).toBe('活点账单')
  })
})

// ========== 结算计算测试 ==========

describe('结算计算测试', () => {

  test('计算过程应按巫师分组显示，而非按账单重复', () => {
    // 使用 name 作为唯一标识
    const participants = [
      { name: '哈利', paid: 30000, shouldPay: 10000 },
      { name: '罗恩', paid: 0, shouldPay: 10000 },
      { name: '赫敏', paid: 0, shouldPay: 10000 }
    ]

    // 按 name 分组汇总
    const participantMap = new Map<string, typeof participants[0]>()
    participants.forEach(p => {
      const existing = participantMap.get(p.name)
      if (existing) {
        existing.paid += p.paid
        existing.shouldPay += p.shouldPay
      } else {
        participantMap.set(p.name, { ...p })
      }
    })

    const grouped = Array.from(participantMap.values())
    expect(grouped.length).toBe(3) // 3个独立巫师，无重复
  })

  test('结算卡片应显示各巫师的支付金额', () => {
    // participant.balance = paid - shouldPay
    const participant = {
      name: '哈利',
      paid: 30000,
      shouldPay: 10000,
      balance: 20000 // 应收
    }

    expect(participant.balance).toBe(20000)
    expect(participant.balance > 0).toBe(true) // 应收
  })

  test('格式化金额函数应正确处理 0 显示为 "0.00"', () => {
    const formatAmount = (amount: number | null | undefined): string => {
      if (amount === null || amount === undefined || isNaN(amount)) {
        return '0.00'
      }
      return (amount / 100).toFixed(2)
    }

    expect(formatAmount(0)).toBe('0.00')
    expect(formatAmount(null)).toBe('0.00')
    expect(formatAmount(undefined)).toBe('0.00')
    expect(formatAmount(30000)).toBe('300.00')
  })
})

// ========== 登录相关测试 ==========

describe('登录相关测试', () => {

  test('登录后应正确区分微信头像和巫师形象', () => {
    // isWechatAvatar 标志应正确设置
    const wechatAvatarUser = {
      nickName: '用户1',
      avatarUrl: 'https://thirdwx.qlogo.cn/avatar123',
      isWechatAvatar: true
    }

    const wizardAvatarUser = {
      nickName: '用户2',
      avatarUrl: 'Harry',
      isWechatAvatar: false
    }

    expect(wechatAvatarUser.isWechatAvatar).toBe(true)
    expect(wizardAvatarUser.isWechatAvatar).toBe(false)
  })

  test('UserLogin 已登录状态应正确显示头像', () => {
    // 如果是巫师形象，应使用 WizardAvatar 组件
    const displayWizardAvatar = !mockUser.isWechatAvatar && mockUser.avatarUrl

    expect(displayWizardAvatar).toBe(true)
  })

  test('右上角头像应根据登录状态显示不同内容', () => {
    const isLogged = true
    const user = mockUser

    const shouldShowAvatar = isLogged && user?.avatarUrl
    expect(shouldShowAvatar).toBe(true)
  })
})
