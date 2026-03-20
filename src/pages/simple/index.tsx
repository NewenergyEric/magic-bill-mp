import { View, Text, Input, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { saveBill } from '@/services/cloud'
import { WIZARDS } from '@/constants/wizards'
import { Bill, Participant } from '@/types'
import WizardAvatar from '@/components/WizardAvatar'
import './index.scss'

const MAGIC_EVENTS = [
  '购买《高级魔药制作》二手书',
  '古灵阁金库年度管理费',
  '三把扫帚黄油啤酒团购',
  '韦斯莱笑话商店整蛊产品',
  '蜂蜜公爵糖果店大采购',
  '奥利凡德魔杖抛光护理',
  '霍格莫德村周末团建经费',
  '禁林探险应急补给包',
  '魁地奇世界杯决赛门票',
  '猫头鹰邮递及棚屋清洁费',
]

export default function SimplePage() {
  const [amount, setAmount] = useState('')
  const [peopleCount, setPeopleCount] = useState('2')
  const [wizards, setWizards] = useState<Participant[]>([])

  useEffect(() => {
    const count = Math.min(Math.max(parseInt(peopleCount) || 0, 1), 30)
    const newWizards: Participant[] = []
    for (let i = 0; i < count; i++) {
      const char = WIZARDS[i % WIZARDS.length]
      newWizards.push({
        id: Math.random().toString(),
        name: char.name.split(' ')[0],
        avatar: char.name,
        paid: 0
      })
    }
    setWizards(newWizards)
  }, [peopleCount])

  const addWizard = () => {
    if (wizards.length >= 30) return
    const char = WIZARDS[wizards.length % WIZARDS.length]
    setWizards([...wizards, {
      id: Math.random().toString(),
      name: char.name.split(' ')[0],
      avatar: char.name,
      paid: 0
    }])
    setPeopleCount((wizards.length + 1).toString())
  }

  const calculate = async () => {
    const a = parseFloat(amount)
    if (a <= 0 || wizards.length <= 0) {
      Taro.showToast({ title: '请输入有效金额', icon: 'none' })
      return
    }

    const perPerson = a / wizards.length
    const eventName = MAGIC_EVENTS[Math.floor(Math.random() * MAGIC_EVENTS.length)]

    const bill: Omit<Bill, '_id' | 'userId'> = {
      type: 'simple',
      eventName,
      totalAmount: a,
      participantsCount: wizards.length,
      date: Date.now()
    }

    try {
      await saveBill(bill)
    } catch {
      const localBills = Taro.getStorageSync('magic_bills') || []
      localBills.unshift({ ...bill, _id: Date.now().toString(), userId: 'local' })
      Taro.setStorageSync('magic_bills', localBills)
    }

    Taro.showModal({
      title: '咒语生效！',
      content: `每位巫师需支付 ${perPerson.toFixed(2)} 加隆`,
      showCancel: false,
      confirmText: '确认'
    })
  }

  return (
    <View className='simple-page'>
      <View className='parchment-card'>
        <View className='card-header'>
          <Text className='card-icon'>⚡</Text>
          <Text className='card-title'>均分咒</Text>
        </View>

        <View className='form-section'>
          <Text className='form-label'>金库总额</Text>
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

        <View className='form-section'>
          <Text className='form-label'>巫师人数 (1-30)</Text>
          <View className='count-row'>
            <Input
              className='count-input'
              type='number'
              value={peopleCount}
              onInput={(e) => setPeopleCount(e.detail.value)}
            />
            <Button className='add-btn' size='mini' onClick={addWizard}>
              <Text className='add-btn-icon'>👤</Text>
              <Text>召唤新巫师</Text>
            </Button>
          </View>
        </View>

        {/* 巫师网格 */}
        <View className='wizards-grid'>
          {wizards.map((w) => (
            <View key={w.id} className='wizard-item'>
              <WizardAvatar name={w.name} />
              <Text className='wizard-name'>{w.name}</Text>
            </View>
          ))}
        </View>

        <Button className='calc-button' onClick={calculate}>
          <Text className='calc-icon'>⚡</Text>
          <Text className='calc-text'>施展均分咒</Text>
        </Button>
      </View>
    </View>
  )
}