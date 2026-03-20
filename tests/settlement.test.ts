/**
 * AA制分账算法测试
 * 测试各种场景的分账计算
 */

import { calculateSettlements, formatAmount } from '../src/utils/settlement'
import type { Participant } from '../src/types'

describe('AA制分账算法测试', () => {

  describe('场景1: 简单均分 - 3人等额', () => {
    it('3人各付100，应无需转账', () => {
      const participants: Participant[] = [
        { id: '1', name: '哈利', paid: 100, avatar: 'Harry' },
        { id: '2', name: '赫敏', paid: 100, avatar: 'Hermione' },
        { id: '3', name: '罗恩', paid: 100, avatar: 'Ron' }
      ]

      const settlements = calculateSettlements(participants)
      expect(settlements.length).toBe(0)
    })
  })

  describe('场景2: 两人清算 - A多付', () => {
    it('哈利付200，赫敏付100，应各需支付50给哈利', () => {
      const participants: Participant[] = [
        { id: '1', name: '哈利', paid: 200, avatar: 'Harry' },
        { id: '2', name: '赫敏', paid: 100, avatar: 'Hermione' }
      ]

      const settlements = calculateSettlements(participants)
      expect(settlements.length).toBe(1)
      expect(settlements[0].from).toBe('赫敏')
      expect(settlements[0].to).toBe('哈利')
      expect(settlements[0].amount).toBe(50)
    })
  })

  describe('场景3: 三人清算 - 一人付全部', () => {
    it('哈利付300，赫敏和罗恩付0，应各付100给哈利', () => {
      const participants: Participant[] = [
        { id: '1', name: '哈利', paid: 300, avatar: 'Harry' },
        { id: '2', name: '赫敏', paid: 0, avatar: 'Hermione' },
        { id: '3', name: '罗恩', paid: 0, avatar: 'Ron' }
      ]

      const settlements = calculateSettlements(participants)
      expect(settlements.length).toBe(2)

      // 赫敏应付100
      const hermioneSettlement = settlements.find(s => s.from === '赫敏')
      expect(hermioneSettlement?.amount).toBe(100)

      // 罗恩应付100
      const ronSettlement = settlements.find(s => s.from === '罗恩')
      expect(ronSettlement?.amount).toBe(100)
    })
  })

  describe('场景4: 四人清算 - 不同金额', () => {
    it('总400，人均100', () => {
      const participants: Participant[] = [
        { id: '1', name: '哈利', paid: 120, avatar: 'Harry' },
        { id: '2', name: '赫敏', paid: 80, avatar: 'Hermione' },
        { id: '3', name: '罗恩', paid: 60, avatar: 'Ron' },
        { id: '4', name: '金妮', paid: 140, avatar: 'Ginny' }
      ]

      const settlements = calculateSettlements(participants)
      const total = participants.reduce((sum, p) => sum + p.paid, 0)
      const avg = total / participants.length

      expect(total).toBe(400)
      expect(avg).toBe(100)

      // 验证转账后是否平衡
      const finalBalances: Record<string, number> = {}
      participants.forEach(p => {
        finalBalances[p.name] = p.paid - avg
      })

      settlements.forEach(s => {
        finalBalances[s.from] += s.amount
        finalBalances[s.to] -= s.amount
      })

      const isBalanced = Object.values(finalBalances).every(b => Math.abs(b) < 0.02)
      expect(isBalanced).toBe(true)
    })
  })

  describe('场景5: 边界情况 - 一人付少量', () => {
    it('总120，人均40', () => {
      const participants: Participant[] = [
        { id: '1', name: '哈利', paid: 100, avatar: 'Harry' },
        { id: '2', name: '赫敏', paid: 10, avatar: 'Hermione' },
        { id: '3', name: '罗恩', paid: 10, avatar: 'Ron' }
      ]

      const total = participants.reduce((sum, p) => sum + p.paid, 0)
      const avg = total / participants.length

      expect(total).toBe(120)
      expect(avg).toBe(40)
    })
  })

  describe('金额格式化', () => {
    it('分应正确转换为元', () => {
      expect(formatAmount(10000)).toBe('100.00')
      expect(formatAmount(1)).toBe('0.01')
      expect(formatAmount(0)).toBe('0.00')
      expect(formatAmount(123456)).toBe('1234.56')
    })
  })
})
