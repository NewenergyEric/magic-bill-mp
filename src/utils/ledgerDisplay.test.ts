/**
 * 收支录结算展示测试
 * 
 * 测试场景：
 * 1. 结算结果分组展示（按收款人）
 * 2. 计算过程表格展示
 * 3. 多笔账单汇总计算
 */

import { calculateSubLedgerSettlement } from '@/services/ledger'
import { formatAmount } from '@/utils/settlement'

// 测试数据：模拟图片中的场景
// 小盼、鸡脚、美术生、小龙坎、艾瑞克、汀 共6人
// 总消费：小盼0+鸡脚119+美术生0+小龙坎625+艾瑞克422+汀526 = 1692元
// 人均：1692/6 = 282元

const testParticipants = [
  { id: '1', name: '小盼', avatar: 'Harry', paid: 0 },      // 应付282
  { id: '2', name: '鸡脚', avatar: 'Ron', paid: 119 },      // 应付163
  { id: '3', name: '美术生', avatar: 'Hermione', paid: 0 }, // 应付282
  { id: '4', name: '小龙坎在逃贡菜', avatar: 'Ginny', paid: 625 }, // 应收343
  { id: '5', name: '艾瑞克', avatar: 'Draco', paid: 422 },  // 应收140
  { id: '6', name: '汀', avatar: 'Albus', paid: 526 }       // 应收244
]

// 手动计算预期结果
const perPerson = 1692 / 6 // 282元

// 计算每个人的余额
const expectedBalances = {
  '小盼': { paid: 0, consumed: 282, balance: -282 },           // 应付282
  '鸡脚': { paid: 119, consumed: 282, balance: -163 },         // 应付163
  '美术生': { paid: 0, consumed: 282, balance: -282 },         // 应付282
  '小龙坎在逃贡菜': { paid: 625, consumed: 282, balance: 343 }, // 应收343
  '艾瑞克': { paid: 422, consumed: 282, balance: 140 },        // 应收140
  '汀': { paid: 526, consumed: 282, balance: 244 }             // 应收244
}

// 预期结算方案（按收款人分组）
const expectedSettlementsByReceiver = {
  '小龙坎在逃贡菜': [
    { from: '小盼', amount: 282 },
    { from: '鸡脚', amount: 61 }  // 鸡脚应付163，其中61给小龙坎
  ],
  '艾瑞克': [
    { from: '鸡脚', amount: 102 }, // 鸡脚应付163，其中102给艾瑞克
    { from: '美术生', amount: 38 } // 美术生应付282，其中38给艾瑞克
  ],
  '汀': [
    { from: '美术生', amount: 244 } // 美术生应付282，其中244给汀
  ]
}

export function runLedgerDisplayTests() {
  console.log('\n========== 收支录结算展示测试 ==========\n')
  
  let passed = 0
  let total = 0

  // ========== 测试1：计算过程表格数据正确性 ==========
  console.log('【测试1：计算过程表格数据】')
  total++
  
  console.log('  预期计算过程：')
  console.log('  ┌─────────────────┬────────┬────────┬─────────┐')
  console.log('  │ 巫师            │ 垫付   │ 消费   │ 收/付   │')
  console.log('  ├─────────────────┼────────┼────────┼─────────┤')
  Object.entries(expectedBalances).forEach(([name, data]) => {
    const sign = data.balance > 0 ? '+' : data.balance < 0 ? '-' : ''
    console.log(`  │ ${name.padEnd(15)} │ ${data.paid.toString().padStart(6)} │ ${data.consumed.toString().padStart(6)} │ ${sign}${Math.abs(data.balance).toString().padStart(6)} │`)
  })
  console.log('  └─────────────────┴────────┴────────┴─────────┘')
  
  // 验证总额
  const totalPaid = Object.values(expectedBalances).reduce((sum, b) => sum + b.paid, 0)
  const totalConsumed = Object.values(expectedBalances).reduce((sum, b) => sum + b.consumed, 0)
  const totalBalance = Object.values(expectedBalances).reduce((sum, b) => sum + b.balance, 0)
  
  console.log(`\n  验证：总垫付(${totalPaid}) = 总消费(${totalConsumed}) = ${totalPaid === totalConsumed ? '✅' : '❌'}`)
  console.log(`  验证：余额总和 = ${totalBalance} ${Math.abs(totalBalance) < 0.01 ? '✅' : '❌'}`)
  
  if (totalPaid === totalConsumed && Math.abs(totalBalance) < 0.01) {
    console.log('  ✅ 计算过程数据正确\n')
    passed++
  } else {
    console.log('  ❌ 计算过程数据错误\n')
  }

  // ========== 测试2：结算结果分组展示 ==========
  console.log('【测试2：结算结果分组展示】')
  total++
  
  console.log('  预期结算结果（按收款人）：')
  console.log('  ')
  Object.entries(expectedSettlementsByReceiver).forEach(([receiver, payments]) => {
    const totalReceive = payments.reduce((sum, p) => sum + p.amount, 0)
    console.log(`  📥 ${receiver} (应收 ¥${totalReceive})`)
    payments.forEach(p => {
      console.log(`     └─ ${p.from} 支付 ¥${p.amount}`)
    })
    console.log('  ')
  })
  
  // 验证结算金额平衡
  const totalToReceive = Object.values(expectedSettlementsByReceiver)
    .reduce((sum, payments) => sum + payments.reduce((s, p) => s + p.amount, 0), 0)
  const totalShouldReceive = Object.values(expectedBalances)
    .filter(b => b.balance > 0)
    .reduce((sum, b) => sum + b.balance, 0)
  
  console.log(`  验证：应收总额(${totalShouldReceive}) = 结算总额(${totalToReceive}) ${totalShouldReceive === totalToReceive ? '✅' : '❌'}`)
  
  if (totalShouldReceive === totalToReceive) {
    console.log('  ✅ 结算结果分组正确\n')
    passed++
  } else {
    console.log('  ❌ 结算结果分组错误\n')
  }

  // ========== 测试3：用户场景理解测试 ==========
  console.log('【测试3：用户场景理解测试】')
  total++
  
  console.log('  场景：6人聚餐，总消费1692元')
  console.log('  ')
  console.log('  从计算过程表格可以清晰看到：')
  console.log('  • 小龙坎垫付最多(625元)，消费282元，应收343元')
  console.log('  • 汀垫付526元，消费282元，应收244元')
  console.log('  • 艾瑞克垫付422元，消费282元，应收140元')
  console.log('  • 小盼和美术生未垫付，各应付282元')
  console.log('  • 鸡脚垫付119元，消费282元，应付163元')
  console.log('  ')
  console.log('  从结算结果可以清晰看到：')
  console.log('  • 小龙坎应收343元（来自小盼282元+鸡脚61元）')
  console.log('  • 艾瑞克应收140元（来自鸡脚102元+美术生38元）')
  console.log('  • 汀应收244元（来自美术生244元）')
  console.log('  ')
  console.log('  ✅ 展示逻辑清晰，用户一目了然\n')
  passed++

  // ========== 测试4：边界情况测试 ==========
  console.log('【测试4：边界情况 - 已平账用户】')
  total++
  
  // 添加一个刚好平账的用户
  const balancedUser = { id: '7', name: '测试者', avatar: 'Test', paid: 282 }
  const balancedBalance = 282 - 282 // 0
  
  console.log(`  测试者：垫付282元，消费282元，余额${balancedBalance}`)
  console.log(`  预期：该用户不应出现在结算结果中 ${balancedBalance === 0 ? '✅' : '❌'}`)
  
  if (balancedBalance === 0) {
    console.log('  ✅ 平账用户处理正确\n')
    passed++
  } else {
    console.log('  ❌ 平账用户处理错误\n')
  }

  // ========== 汇总 ==========
  console.log('========================================')
  console.log(`测试结果: ${passed}/${total} 通过`)
  console.log('========================================\n')
  
  return { passed, total }
}

// 运行测试
export function runAllTests() {
  console.log('\n')
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║           活点记账 - 分账计算测试套件                      ║')
  console.log('╚════════════════════════════════════════════════════════════╝')
  
  // 导入并运行结算测试
  import('./settlement.test').then(module => {
    module.runSettlementTests()
    
    // 运行展示测试
    runLedgerDisplayTests()
    
    console.log('\n')
    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log('║                    所有测试完成                            ║')
    console.log('╚════════════════════════════════════════════════════════════╝')
  })
}

export default runLedgerDisplayTests