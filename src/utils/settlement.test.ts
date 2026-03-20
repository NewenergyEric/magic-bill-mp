/**
 * 结算计算逻辑测试用例
 * 
 * 测试场景：
 * 1. 均分咒：多人均分账单
 * 2. 清算咒：各付各的，计算差额
 * 3. 混合场景：多笔账单混合
 */

import { calculateSettlements, formatAmount, calculatePerPerson } from './settlement'

// 测试辅助函数
function assertEqual(actual: any, expected: any, testName: string) {
  const actualStr = JSON.stringify(actual)
  const expectedStr = JSON.stringify(expected)
  if (actualStr !== expectedStr) {
    console.error(`❌ ${testName}`)
    console.error(`   期望: ${expectedStr}`)
    console.error(`   实际: ${actualStr}`)
    return false
  }
  console.log(`✅ ${testName}`)
  return true
}

// 测试用例
export function runSettlementTests() {
  console.log('\n========== 结算计算测试 ==========\n')
  
  let passed = 0
  let total = 0

  // ========== 测试1：均分咒 - 3人均分300元 ==========
  console.log('【测试1：均分咒 - 3人均分300元】')
  total++
  
  // 场景：3人吃饭花了300元，人均100元
  // 如果A付了300元，B和C没付
  // 结果：A应收200，B应付100，C应付100
  // 结算方案：B给A 100，C给A 100
  
  const test1Participants = [
    { id: '1', name: 'A', avatar: 'Harry', paid: 300 },  // A付了300
    { id: '2', name: 'B', avatar: 'Ron', paid: 0 },       // B没付
    { id: '3', name: 'C', avatar: 'Hermione', paid: 0 }   // C没付
  ]
  
  const test1Result = calculateSettlements(test1Participants)
  
  console.log('  参与者支付情况：')
  test1Participants.forEach(p => console.log(`    ${p.name}: 已付 ${p.paid}元`))
  
  console.log('  结算方案：')
  test1Result.forEach(s => console.log(`    ${s.from} → ${s.to}: ${s.amount}元`))
  
  // 验证结算方案
  const expectedSettlements1 = [
    { from: 'B', to: 'A', amount: 100 },
    { from: 'C', to: 'A', amount: 100 }
  ]
  
  if (JSON.stringify(test1Result) === JSON.stringify(expectedSettlements1)) {
    console.log('  ✅ 结算方案正确\n')
    passed++
  } else {
    console.log('  ❌ 结算方案错误')
    console.log(`     期望: ${JSON.stringify(expectedSettlements1)}`)
    console.log(`     实际: ${JSON.stringify(test1Result)}\n`)
  }

  // ========== 测试2：清算咒 - 3人各付不同金额 ==========
  console.log('【测试2：清算咒 - 3人各付不同金额，总额300元】')
  total++
  
  // 场景：3人消费300元
  // A付了100，B付了150，C付了50
  // 人均：100元
  // A: 100-100=0 (已平账)
  // B: 150-100=50 (应收50)
  // C: 50-100=-50 (应付50)
  // 结算方案：C给B 50元
  
  const test2Participants = [
    { id: '1', name: 'A', avatar: 'Harry', paid: 100 },
    { id: '2', name: 'B', avatar: 'Ron', paid: 150 },
    { id: '3', name: 'C', avatar: 'Hermione', paid: 50 }
  ]
  
  const test2Result = calculateSettlements(test2Participants)
  
  console.log('  参与者支付情况：')
  test2Participants.forEach(p => console.log(`    ${p.name}: 已付 ${p.paid}元`))
  
  console.log('  结算方案：')
  test2Result.forEach(s => console.log(`    ${s.from} → ${s.to}: ${s.amount}元`))
  
  const expectedSettlements2 = [
    { from: 'C', to: 'B', amount: 50 }
  ]
  
  if (JSON.stringify(test2Result) === JSON.stringify(expectedSettlements2)) {
    console.log('  ✅ 结算方案正确\n')
    passed++
  } else {
    console.log('  ❌ 结算方案错误')
    console.log(`     期望: ${JSON.stringify(expectedSettlements2)}`)
    console.log(`     实际: ${JSON.stringify(test2Result)}\n`)
  }

  // ========== 测试3：复杂场景 - 4人多种支付 ==========
  console.log('【测试3：复杂场景 - 4人消费400元】')
  total++
  
  // 场景：4人消费400元，人均100元
  // A付了200，B付了100，C付了100，D没付
  // A: 200-100=100 (应收100)
  // B: 100-100=0 (已平账)
  // C: 100-100=0 (已平账)
  // D: 0-100=-100 (应付100)
  // 结算方案：D给A 100元
  
  const test3Participants = [
    { id: '1', name: 'A', avatar: 'Harry', paid: 200 },
    { id: '2', name: 'B', avatar: 'Ron', paid: 100 },
    { id: '3', name: 'C', avatar: 'Hermione', paid: 100 },
    { id: '4', name: 'D', avatar: 'Ginny', paid: 0 }
  ]
  
  const test3Result = calculateSettlements(test3Participants)
  
  console.log('  参与者支付情况：')
  test3Participants.forEach(p => console.log(`    ${p.name}: 已付 ${p.paid}元`))
  
  console.log('  结算方案：')
  test3Result.forEach(s => console.log(`    ${s.from} → ${s.to}: ${s.amount}元`))
  
  const expectedSettlements3 = [
    { from: 'D', to: 'A', amount: 100 }
  ]
  
  if (JSON.stringify(test3Result) === JSON.stringify(expectedSettlements3)) {
    console.log('  ✅ 结算方案正确\n')
    passed++
  } else {
    console.log('  ❌ 结算方案错误')
    console.log(`     期望: ${JSON.stringify(expectedSettlements3)}`)
    console.log(`     实际: ${JSON.stringify(test3Result)}\n`)
  }

  // ========== 测试4：多对多结算 ==========
  console.log('【测试4：多对多结算 - 4人消费400元，2应收2应付】')
  total++
  
  // 场景：4人消费400元，人均100元
  // A付了250，B付了150，C付了0，D付了0
  // A: 250-100=150 (应收150)
  // B: 150-100=50 (应收50)
  // C: 0-100=-100 (应付100)
  // D: 0-100=-100 (应付100)
  // 结算方案：C给A 100，D给A 50，D给B 50
  
  const test4Participants = [
    { id: '1', name: 'A', avatar: 'Harry', paid: 250 },
    { id: '2', name: 'B', avatar: 'Ron', paid: 150 },
    { id: '3', name: 'C', avatar: 'Hermione', paid: 0 },
    { id: '4', name: 'D', avatar: 'Ginny', paid: 0 }
  ]
  
  const test4Result = calculateSettlements(test4Participants)
  
  console.log('  参与者支付情况：')
  test4Participants.forEach(p => console.log(`    ${p.name}: 已付 ${p.paid}元`))
  
  console.log('  结算方案：')
  test4Result.forEach(s => console.log(`    ${s.from} → ${s.to}: ${s.amount}元`))
  
  // 验证总金额正确（C和D各付100，总共200，给A和B）
  const totalToPay = test4Result.reduce((sum, s) => sum + s.amount, 0)
  const totalToReceive = 150 + 50 // A应收150 + B应收50
  
  if (Math.abs(totalToPay - totalToReceive) < 0.01) {
    console.log('  ✅ 结算金额平衡正确\n')
    passed++
  } else {
    console.log('  ❌ 结算金额不平衡')
    console.log(`     应收总额: ${totalToReceive}`)
    console.log(`     实付总额: ${totalToPay}\n`)
  }

  // ========== 测试5：金额格式化 ==========
  console.log('【测试5：金额格式化】')
  total++
  
  const test5_1 = formatAmount(30000)  // 300元 = 30000分
  const test5_2 = formatAmount(10050)  // 100.5元 = 10050分
  const test5_3 = formatAmount(0)
  
  console.log(`  30000分 = ¥${test5_1} (期望: 300.00)`)
  console.log(`  10050分 = ¥${test5_2} (期望: 100.50)`)
  console.log(`  0分 = ¥${test5_3} (期望: 0.00)`)
  
  if (test5_1 === '300.00' && test5_2 === '100.50' && test5_3 === '0.00') {
    console.log('  ✅ 金额格式化正确\n')
    passed++
  } else {
    console.log('  ❌ 金额格式化错误\n')
  }

  // ========== 测试6：人均计算 ==========
  console.log('【测试6：人均计算】')
  total++
  
  const test6_1 = calculatePerPerson(30000, 3)  // 300元3人
  const test6_2 = calculatePerPerson(10000, 4)  // 100元4人
  
  console.log(`  300元3人人均 = ¥${test6_1} (期望: 100)`)
  console.log(`  100元4人人均 = ¥${test6_2} (期望: 25)`)
  
  if (test6_1 === 100 && test6_2 === 25) {
    console.log('  ✅ 人均计算正确\n')
    passed++
  } else {
    console.log('  ❌ 人均计算错误\n')
  }

  // ========== 汇总 ==========
  console.log('========================================')
  console.log(`测试结果: ${passed}/${total} 通过`)
  console.log('========================================\n')
  
  return { passed, total }
}

// 如果直接运行此文件
if (typeof require !== 'undefined' && require.main === module) {
  runSettlementTests()
}

export default runSettlementTests