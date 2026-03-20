// 清理测试数据服务
import Taro from '@tarojs/taro'
import { CloudResponse } from '@/types'

export async function clearContractTestData(): Promise<CloudResponse<any>> {
  try {
    const result = await Taro.cloud.callFunction({
      name: 'clearContracts',
      data: {}
    })
    console.log('[Clear] 清理结果:', result.result)
    return result.result as CloudResponse<any>
  } catch (error) {
    console.error('[Clear] 清理失败:', error)
    return {
      success: false,
      error: { code: 'CLEAR_ERROR', message: String(error) }
    }
  }
}
