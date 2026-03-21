/**
 * 契约页面 - 签署血缘契约
 * 用户创建和加入契约的页面
 */

import { useState, useEffect } from 'react'
import { View, Text, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useUser } from '@/contexts/UserContext'
import { cloudLogin, createContract, joinContract, getMyContracts, getContractDetail, removeMember, refreshInviteCode, getBillsByContract, createCloudBill, getJoinRequests, approveJoinRequest } from '@/services/cloud'
import { getWizardTitle } from '@/services/wizard'
import WizardAvatar from '@/components/WizardAvatar'
import UserLogin from '@/components/UserLogin'
import HowlerRequests from '@/components/HowlerRequests'
import './index.scss'

export default function ContractPage() {
  const { user, userCompanion, isLogged, login } = useUser()
  const [mode, setMode] = useState<'list' | 'create' | 'join' | 'detail'>('list')
  const [contracts, setContracts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [contractName, setContractName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [showAnimation, setShowAnimation] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [cloudUserId, setCloudUserId] = useState<string | null>(null)
  const [currentContract, setCurrentContract] = useState<any>(null)
  const [contractBills, setContractBills] = useState<any[]>([])

  // 检查云端是否已登录
  const checkCloudLogin = async () => {
    try {
      console.log('[Contract] 开始云端登录检查...')
      const result = await cloudLogin(
        userCompanion?.name || '神秘巫师',
        userCompanion?.avatar || ''
      )
      console.log('[Contract] cloudLogin 返回:', JSON.stringify(result))

      if (result.success && result.data) {
        console.log('[Contract] 云端登录成功, userId:', result.data.user._id)
        setCloudUserId(result.data.user._id)
        // 同步存储到本地
        Taro.setStorageSync('cloud_user_id', result.data.user._id)
        return true
      } else {
        console.error('[Contract] cloudLogin 失败:', result.error)
        return false
      }
    } catch (error: any) {
      console.error('[Contract] 云端登录异常:', error)
      Taro.showToast({ title: '登录异常: ' + (error?.message || '未知错误'), icon: 'none' })
      return false
    }
  }

  // 加载契约列表
  const loadContracts = async () => {
    if (!cloudUserId) {
      // 先确保云端已登录
      const loggedIn = await checkCloudLogin()
      if (!loggedIn) return
    }

    setLoading(true)
    try {
      const result = await getMyContracts()
      if (result.success && result.data) {
        setContracts(result.data.contracts || [])
      }
    } catch (error) {
      console.error('加载契约列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // 初始化时检查云端登录状态
    checkCloudLogin().then((loggedIn) => {
      if (loggedIn) {
        loadContracts()
      }
    })
  }, [])

  // 登录
  const handleLogin = async () => {
    try {
      // 直接调用云端登录
      const result = await cloudLogin(
        userCompanion?.name || '神秘巫师',
        userCompanion?.avatar || ''
      )
      console.log('[Contract] handleLogin cloudLogin 返回:', JSON.stringify(result))

      if (result.success && result.data) {
        // 设置云用户ID
        setCloudUserId(result.data.user._id)
        Taro.setStorageSync('cloud_user_id', result.data.user._id)
        // 同时更新本地登录状态
        await login({
          nickName: userCompanion?.name || '神秘巫师',
          avatarUrl: userCompanion?.avatar || ''
        })
        // 加载契约列表
        await loadContracts()
        Taro.showToast({ title: '登录成功', icon: 'success' })
      } else {
        console.error('[Contract] handleLogin 失败:', result.error)
        Taro.showToast({ title: '登录失败: ' + (result.error?.message || '未知'), icon: 'none' })
      }
    } catch (error: any) {
      console.error('[Contract] handleLogin 异常:', error)
      Taro.showToast({ title: '登录异常', icon: 'none' })
    }
  }

  // 创建契约
  const handleCreate = async () => {
    if (!contractName.trim()) {
      Taro.showToast({ title: '请输入契约名称', icon: 'none' })
      return
    }

    setLoading(true)
    try {
      // 先确保云端登录/用户存在
      if (!cloudUserId) {
        console.log('[Contract] 创建契约前先确保云端登录...')
        const loginResult = await cloudLogin(
          userCompanion?.name || '神秘巫师',
          userCompanion?.avatar || ''
        )
        console.log('[Contract] 创建契约前云端登录结果:', JSON.stringify(loginResult))

        if (!loginResult.success || !loginResult.data) {
          Taro.showToast({ title: '请先登录: ' + (loginResult.error?.message || '未知'), icon: 'none' })
          setLoading(false)
          return
        }
        setCloudUserId(loginResult.data.user._id)
      }

      const result = await createContract(contractName.trim())
      console.log('[Contract] createContract 结果:', JSON.stringify(result))
      if (result.success && result.data) {
        Taro.showToast({ title: '契约创建成功', icon: 'success' })
        setShowAnimation(true)
        setContractName('')
        setTimeout(() => {
          setShowAnimation(false)
          setMode('list')
          loadContracts()
        }, 2000)
      } else {
        Taro.showToast({ title: result.error?.message || '创建失败', icon: 'none' })
      }
    } catch (error: any) {
      console.error('[Contract] 创建契约异常:', error)
      Taro.showToast({ title: '创建失败: ' + (error?.message || '未知'), icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  // 加入契约
  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      Taro.showToast({ title: '请输入邀请码', icon: 'none' })
      return
    }

    setLoading(true)
    try {
      // 先确保云端登录/用户存在
      if (!cloudUserId) {
        console.log('[Contract] 加入契约前先确保云端登录...')
        const loginResult = await cloudLogin(
          userCompanion?.name || '神秘巫师',
          userCompanion?.avatar || ''
        )
        console.log('[Contract] 加入契约前云端登录结果:', JSON.stringify(loginResult))

        if (!loginResult.success || !loginResult.data) {
          Taro.showToast({ title: '请先登录: ' + (loginResult.error?.message || '未知'), icon: 'none' })
          setLoading(false)
          return
        }
        setCloudUserId(loginResult.data.user._id)
      }

      const result = await joinContract(inviteCode.trim().toUpperCase())
      console.log('[Contract] joinContract 结果:', JSON.stringify(result))
      if (result.success) {
        Taro.showToast({ title: '加入成功', icon: 'success' })
        setShowAnimation(true)
        setInviteCode('')
        setTimeout(() => {
          setShowAnimation(false)
          setMode('list')
          loadContracts()
        }, 2000)
      } else {
        Taro.showToast({ title: result.error?.message || '加入失败', icon: 'none' })
      }
    } catch (error: any) {
      console.error('[Contract] 加入契约异常:', error)
      Taro.showToast({ title: '加入失败: ' + (error?.message || '未知'), icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  // 进入契约详情
  const handleEnterContract = async (contractId: string) => {
    setLoading(true)
    try {
      const result = await getContractDetail(contractId)
      console.log('[Contract] 获取契约详情结果:', JSON.stringify(result))
      if (result.success && result.data) {
        setCurrentContract(result.data.contract)

        // 同时获取账单列表
        const billsResult = await getBillsByContract(contractId)
        if (billsResult.success && billsResult.data) {
          setContractBills(billsResult.data.bills || [])
        }

        setMode('detail')
      } else {
        Taro.showToast({ title: '获取契约详情失败', icon: 'none' })
      }
    } catch (error) {
      console.error('[Contract] 获取契约详情异常:', error)
      Taro.showToast({ title: '获取契约详情失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  // 复制邀请码（包含巫师等级信息）
  const handleCopyCode = (code: string) => {
    const wizardTitle = getWizardTitle()
    const shareText = `${wizardTitle}邀请你签署一份魔法契约！\n邀请码：${code}\n快来加入吧！`
    Taro.setClipboardData({ data: shareText })
    Taro.showToast({ title: '邀请信息已复制', icon: 'success' })
  }

  // 登录弹窗 - 仅当云端已登录但需要编辑用户信息时显示
  if (showLoginModal && cloudUserId) {
    return (
      <View className='contract-page'>
        <View className='login-modal-overlay' onClick={() => setShowLoginModal(false)}>
          <View className='login-modal-content' onClick={(e) => e.stopPropagation()}>
            <UserLogin onClose={() => setShowLoginModal(false)} />
          </View>
        </View>
      </View>
    )
  }

  // 未登录状态（云端未登录）
  if (!cloudUserId) {
    return (
      <View className='contract-page'>
        <View className='page-header'>
          <View className='header-icon'>📜</View>
          <Text className='header-title'>血缘契约</Text>
        </View>

        <View className='tips-card'>
          <Text className='tips-text'>签署血缘契约，与巫师伙伴共同管理账务</Text>
        </View>

        <View className='login-card' onClick={handleLogin}>
          <View className='login-icon'>🔮</View>
          <View className='login-info'>
            <Text className='login-title'>未登录云端</Text>
            <Text className='login-hint'>点击登录后创建或加入契约</Text>
          </View>
          <View className='login-arrow'>›</View>
        </View>
      </View>
    )
  }

  // 签署动画
  if (showAnimation) {
    return (
      <View className='contract-page'>
        <View className='signing-animation'>
          <View className='pact-scroll'>
            <Text className='pact-text'>契约已签署</Text>
            <View className='pact-seal'>✓</View>
          </View>
        </View>
      </View>
    )
  }

  // 契约列表
  if (mode === 'list') {
    return (
      <View className='contract-page'>
        <View className='page-header'>
          <View className='header-icon'>📜</View>
          <Text className='header-title'>血缘契约</Text>
        </View>

        {/* 操作按钮 */}
        <View className='action-row'>
          <View className='action-btn create-btn' onClick={() => setMode('create')}>
            <Text className='action-icon'>📜</Text>
            <Text className='action-text'>创建契约</Text>
          </View>
          <View className='action-btn join-btn' onClick={() => setMode('join')}>
            <Text className='action-icon'>🔮</Text>
            <Text className='action-text'>加入契约</Text>
          </View>
        </View>

        {/* 用户信息 */}
        <View className='user-bar'>
          <View className='user-info'>
            <WizardAvatar name={user?.avatarUrl || userCompanion?.avatar || ''} size='small' />
            <Text className='user-name'>{user?.nickName || userCompanion?.name || '神秘巫师'}</Text>
          </View>
        </View>

        {/* 契约列表 */}
        <View className='section-title'>我的契约</View>

        {loading ? (
          <View className='loading-state'>
            <Text className='loading-text'>加载中...</Text>
          </View>
        ) : contracts.length === 0 ? (
          <View className='empty-state'>
            <Text className='empty-icon'>📋</Text>
            <Text className='empty-text'>暂无契约</Text>
            <Text className='empty-hint'>创建或加入契约开始记账</Text>
          </View>
        ) : (
          <View className='contract-list'>
            {contracts.map((contract) => (
              <View
                key={contract._id}
                className='contract-item'
                onClick={() => handleEnterContract(contract._id)}
              >
                <View className='contract-main'>
                  <View className='contract-name-row'>
                    <Text className='contract-name'>{contract.name}</Text>
                    <Text className='contract-date'>{contract.displayDate}</Text>
                  </View>
                  <View className='contract-meta'>
                    <Text className='meta-tag'>👥 {contract.members?.length || 0}人</Text>
                    <Text className='meta-tag'>📝 {contract.billCount || 0}笔</Text>
                  </View>
                </View>
                <View className='contract-actions'>
                  <View
                    className='copy-code-btn'
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCopyCode(contract.inviteCode)
                    }}
                  >
                    <Text className='copy-code-text'>复制邀请码</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    )
  }

  // 创建契约
  if (mode === 'create') {
    return (
      <View className='contract-page'>
        <View className='page-header'>
          <View
            className='back-btn'
            onClick={() => setMode('list')}
          >
            <Text className='back-text'>‹ 返回</Text>
          </View>
          <View className='header-icon'>📜</View>
          <Text className='header-title'>创建契约</Text>
        </View>

        <View className='form-card'>
          <View className='form-item'>
            <Text className='form-label'>契约名称</Text>
            <Input
              className='form-input'
              placeholder='例如：周末聚餐'
              placeholderClass='form-placeholder'
              value={contractName}
              onInput={(e) => setContractName(e.detail.value)}
              maxlength={20}
            />
          </View>

          <View className='form-hint-card'>
            <Text className='form-hint-text'>创建者将成为契约的守护者，拥有管理权限</Text>
          </View>

          <View className='form-actions'>
            <View className='cancel-btn' onClick={() => setMode('list')}>
              <Text className='cancel-btn-text'>取消</Text>
            </View>
            <View
              className={`confirm-btn ${loading ? 'loading' : ''}`}
              onClick={handleCreate}
            >
              <Text className='confirm-btn-text'>
                {loading ? '创建中...' : '创建契约'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    )
  }

  // 加入契约
  if (mode === 'join') {
    return (
      <View className='contract-page'>
        <View className='page-header'>
          <View
            className='back-btn'
            onClick={() => setMode('list')}
          >
            <Text className='back-text'>‹ 返回</Text>
          </View>
          <View className='header-icon'>🔮</View>
          <Text className='header-title'>加入契约</Text>
        </View>

        <View className='form-card'>
          <View className='form-item'>
            <Text className='form-label'>邀请码</Text>
            <Input
              className='form-input code-input'
              placeholder='输入6位邀请码'
              placeholderClass='form-placeholder'
              value={inviteCode}
              onInput={(e) => setInviteCode(e.detail.value.toUpperCase())}
              maxlength={6}
            />
          </View>

          <View className='form-hint-card'>
            <Text className='form-hint-text'>向契约成员索要邀请码，即可加入契约</Text>
          </View>

          <View className='form-actions'>
            <View className='cancel-btn' onClick={() => setMode('list')}>
              <Text className='cancel-btn-text'>取消</Text>
            </View>
            <View
              className={`confirm-btn ${loading ? 'loading' : ''}`}
              onClick={handleJoin}
            >
              <Text className='confirm-btn-text'>
                {loading ? '加入中...' : '加入契约'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    )
  }

  // 契约详情
  if (mode === 'detail' && currentContract) {
    const isGuardian = currentContract.guardianId === cloudUserId
    return (
      <View className='contract-page'>
        <View className='page-header'>
          <View
            className='back-btn'
            onClick={() => {
              setMode('list')
              setCurrentContract(null)
            }}
          >
            <Text className='back-text'>‹ 返回</Text>
          </View>
          <View className='header-icon'>📜</View>
          <Text className='header-title'>{currentContract.name}</Text>
        </View>

        {/* 契约信息卡片 */}
        <View className='contract-detail-card'>
          <View className='detail-info-row'>
            <Text className='detail-label'>邀请码</Text>
            <View className='detail-value-row'>
              <Text className='detail-code'>{currentContract.inviteCode}</Text>
              <View
                className='copy-btn'
                onClick={() => handleCopyCode(currentContract.inviteCode)}
              >
                <Text className='copy-btn-text'>复制</Text>
              </View>
            </View>
          </View>
          <View className='detail-info-row'>
            <Text className='detail-label'>我的等级</Text>
            <Text className='detail-value'>{getWizardTitle()}</Text>
          </View>
          <View className='detail-info-row'>
            <Text className='detail-label'>创建时间</Text>
            <Text className='detail-value'>{currentContract.displayDate}</Text>
          </View>
          <View className='detail-info-row'>
            <Text className='detail-label'>我的角色</Text>
            <Text className='detail-value'>{isGuardian ? '👑 守护者' : '✨ 巫师'}</Text>
          </View>
        </View>

        {/* 成员列表 */}
        <View className='section-title'>契约成员 ({currentContract.members?.length || 0})</View>
        <View className='member-list'>
          {currentContract.members?.map((member: any) => (
            <View key={member._id} className='member-item'>
              <View className='member-avatar'>
                <WizardAvatar name={member.avatarUrl || ''} size='small' />
              </View>
              <View className='member-info'>
                <Text className='member-name'>{member.nickname || '神秘巫师'}</Text>
                <Text className='member-role'>
                  {member._id === currentContract.guardianId ? '守护者' : '巫师'}
                </Text>
              </View>
              {isGuardian && member._id !== cloudUserId && (
                <View
                  className='remove-btn'
                  onClick={async () => {
                    const confirm = await Taro.showModal({
                      title: '确认驱逐',
                      content: `确定要将 ${member.nickname || '该巫师'} 驱逐出契约吗？`,
                      confirmText: '驱逐',
                      confirmColor: '#8B0000'
                    })
                    if (confirm.confirm) {
                      setLoading(true)
                      const result = await removeMember(currentContract._id, member._id)
                      setLoading(false)
                      if (result.success) {
                        Taro.showToast({ title: '已驱逐', icon: 'success' })
                        // 刷新详情
                        const detail = await getContractDetail(currentContract._id)
                        if (detail.success && detail.data) {
                          setCurrentContract(detail.data.contract)
                        }
                      } else {
                        Taro.showToast({ title: result.error?.message || '驱逐失败', icon: 'none' })
                      }
                    }
                  }}
                >
                  <Text className='remove-btn-text'>驱逐</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* 账单列表 */}
        <View className='section-title'>账单项 ({contractBills.length})</View>
        <View className='bill-list'>
          {contractBills.length === 0 ? (
            <View className='bill-empty'>
              <Text className='bill-empty-text'>暂无账单</Text>
              <Text className='bill-empty-hint'>去首页施咒页面记账吧</Text>
            </View>
          ) : (
            contractBills.map((bill: any) => (
              <View
                key={bill._id}
                className='subledger-item'
                onClick={() => {
                  // 跳转到施咒页面继续记账，关联到此账单
                  Taro.setStorageSync('active_contract_id', currentContract._id)
                  Taro.setStorageSync('active_bill_id', bill._id)
                  Taro.switchTab({ url: '/pages/index/index' })
                }}
              >
                <View className='subledger-icon'>📜</View>
                <View className='subledger-info'>
                  <Text className='subledger-name'>{bill.eventName || '未命名账单'}</Text>
                  <Text className='subledger-amount'>¥{(bill.totalAmount / 100).toFixed(2)}</Text>
                </View>
                <Text className='check-icon'>›</Text>
              </View>
            ))
          )}
        </View>

        {/* 提示：去首页记账 */}
        <View className='hint-card'>
          <Text className='hint-icon'>💡</Text>
          <Text className='hint-text'>去首页施咒页面记账，账单会自动同步到当前契约</Text>
        </View>

        {/* 跳转到施咒按钮 */}
        <View
          className='go-to-cast-btn'
          onClick={() => {
            // 将契约ID存入本地，跳转后自动选中
            Taro.setStorageSync('active_contract_id', currentContract._id)
            Taro.switchTab({ url: '/pages/index/index' })
          }}
        >
          <Text className='go-to-cast-btn-text'>⚡ 立即去施咒记账</Text>
        </View>

        {/* 守护者功能 */}
        {isGuardian && (
          <View className='guardian-section'>
            <View className='section-title'>👑 守护者特权</View>
            <View className='guardian-actions'>
              <View
                className='guardian-btn'
                onClick={async () => {
                  const confirm = await Taro.showModal({
                    title: '刷新邀请码',
                    content: '刷新后旧邀请码将失效，确定要刷新吗？',
                    confirmText: '刷新'
                  })
                  if (confirm.confirm) {
                    setLoading(true)
                    const result = await refreshInviteCode(currentContract._id)
                    setLoading(false)
                    if (result.success && result.data) {
                      Taro.showToast({ title: '邀请码已刷新', icon: 'success' })
                      // 更新当前契约的邀请码
                      setCurrentContract({ ...currentContract, inviteCode: result.data.inviteCode })
                    } else {
                      Taro.showToast({ title: result.error?.message || '刷新失败', icon: 'none' })
                    }
                  }
                }}
              >
                <Text className='guardian-btn-text'>刷新邀请码</Text>
              </View>
            </View>
          </View>
        )}

        {/* 待审批吼叫信 */}
        <HowlerRequests contractId={currentContract._id} isGuardian={isGuardian} cloudUserId={cloudUserId} onRefresh={() => {
          // 刷新详情
          getContractDetail(currentContract._id).then((detail) => {
            if (detail.success && detail.data) {
              setCurrentContract(detail.data.contract)
            }
          })
        }} />
      </View>
    )
  }

  return null
}
