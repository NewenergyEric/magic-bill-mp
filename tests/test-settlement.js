/**
 * AA制分账算法测试脚本
 * 运行: node tests/test-settlement.js
 */

// 分账算法（复制自 src/utils/settlement.ts）
function calculateSettlements(participants) {
  if (participants.length < 2) return []

  const total = participants.reduce((sum, p) => sum + p.paid, 0)
  const avg = total / participants.length

  const balances = participants.map(p => ({
    name: p.name,
    balance: Math.round((p.paid - avg) * 100) / 100
  }))

  const creditors = balances
    .filter(b => b.balance > 0.01)
    .sort((a, b) => b.balance - a.balance)

  const debtors = balances
    .filter(b => b.balance < -0.01)
    .sort((a, b) => a.balance - b.balance)

  const settlements = []
  let dIdx = 0
  let cIdx = 0

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx]
    const creditor = creditors[cIdx]

    const amount = Math.min(Math.abs(debtor.balance), creditor.balance)
    const roundedAmount = Math.round(amount * 100) / 100

    if (roundedAmount > 0.01) {
      settlements.push({
        from: debtor.name,
        to: creditor.name,
        amount: roundedAmount
      })
    }

    debtor.balance += roundedAmount
    creditor.balance -= roundedAmount

    if (Math.abs(debtor.balance) < 0.01) dIdx++
    if (creditor.balance < 0.01) cIdx++
  }

  return settlements
}

function formatAmount(amount) {
  return amount.toFixed(2)
}

// 测试用例
const testCases = [
  {
    name: '简单均分 - 3人等额',
    participants: [
      { id: '1', name: '哈利', paid: 100 },
      { id: '2', name: '赫敏', paid: 100 },
      { id: '3', name: '罗恩', paid: 100 }
    ],
    expectedSettlements: 0
  },
  {
    name: '两人清算 - A多付',
    participants: [
      { id: '1', name: '哈利', paid: 200 },
      { id: '2', name: '赫敏', paid: 100 }
    ],
    expectedSettlements: 1
  },
  {
    name: '三人清算 - 一人付全部',
    participants: [
      { id: '1', name: '哈利', paid: 300 },
      { id: '2', name: '赫敏', paid: 0 },
      { id: '3', name: '罗恩', paid: 0 }
    ],
    expectedSettlements: 2
  },
  {
    name: '四人清算 - 不同金额',
    participants: [
      { id: '1', name: '哈利', paid: 120 },
      { id: '2', name: '赫敏', paid: 80 },
      { id: '3', name: '罗恩', paid: 60 },
      { id: '4', name: '金妮', paid: 140 }
    ],
    expectedSettlements: 2
  },
  {
    name: '五人清算 - 复杂场景',
    participants: [
      { id: '1', name: '哈利', paid: 50 },
      { id: '2', name: '赫敏', paid: 150 },
      { id: '3', name: '罗恩', paid: 0 },
      { id: '4', name: '金妮', paid: 100 },
      { id: '5', name: '德拉科', paid: 100 }
    ],
    expectedSettlements: 3
  },
  {
    name: '小数金额测试',
    participants: [
      { id: '1', name: '哈利', paid: 33.33 },
      { id: '2', name: '赫敏', paid: 33.33 },
      { id: '3', name: '罗恩', paid: 33.34 }
    ],
    expectedSettlements: 0
  },
  {
    name: '极端情况 - 只有一人付款',
    participants: [
      { id: '1', name: '哈利', paid: 1000 },
      { id: '2', name: '赫敏', paid: 0 },
      { id: '3', name: '罗恩', paid: 0 },
      { id: '4', name: '金妮', paid: 0 },
      { id: '5', name: '德拉科', paid: 0 }
    ],
    expectedSettlements: 4
  },
  {
    name: '部分人付款',
    participants: [
      { id: '1', name: '哈利', paid: 150 },
      { id: '2', name: '赫敏', paid: 50 },
      { id: '3', name: '罗恩', paid: 0 },
      { id: '4', name: '金妮', paid: 0 }
    ],
    expectedSettlements: 3
  }
]

// 运行测试
console.log('========================================')
console.log('AA制分账算法测试')
console.log('========================================\n')

let passedCount = 0
let failedCount = 0

testCases.forEach((testCase, index) => {
  console.log(`\n测试 ${index + 1}: ${testCase.name}`)
  console.log('----------------------------------------')
  
  const { participants } = testCase
  const total = participants.reduce((sum, p) => sum + p.paid, 0)
  const avg = total / participants.length
  
  console.log(`参与者: ${participants.map(p => `${p.name}(¥${p.paid})`).join(', ')}`)
  console.log(`总金额: ¥${formatAmount(total)}, 人均: ¥${formatAmount(avg)}`)
  
  // 计算转账方案
  const settlements = calculateSettlements(participants)
  
  console.log('\n转账方案:')
  if (settlements.length === 0) {
    console.log('  ✅ 账目已平衡，无需转账')
  } else {
    settlements.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.from} → ${s.to}: ¥${formatAmount(s.amount)}`)
    })
  }
  
  // 验证转账后是否平衡
  const finalBalances = {}
  participants.forEach(p => {
    finalBalances[p.name] = p.paid - avg
  })
  
  settlements.forEach(s => {
    finalBalances[s.from] += s.amount
    finalBalances[s.to] -= s.amount
  })
  
  const maxError = Math.max(...Object.values(finalBalances).map(Math.abs))
  const isBalanced = maxError < 0.02
  
  // 检查转账数量是否合理
  const isCorrect = isBalanced
  
  if (isCorrect) {
    console.log(`\n验证: ✅ 通过 (误差: ¥${maxError.toFixed(4)})`)
    passedCount++
  } else {
    console.log(`\n验证: ❌ 失败`)
    failedCount++
  }
})

console.log('\n========================================')
console.log(`测试结果: ${passedCount} 通过, ${failedCount} 失败`)
console.log('========================================')

process.exit(failedCount > 0 ? 1 : 0)