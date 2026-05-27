/**
 * Focus-related actions for the Action Registry.
 */
import { registerActions } from './registry'
import api from '@/api'

export function registerFocusActions() {
  registerActions([
    {
      name: 'getFocusStats',
      description: '查询专注统计数据，包括今日/累计时长和价值',
      category: 'focus',
      inputSchema: {
        type: 'object',
        properties: {
          date: { type: 'string', description: '日期 YYYY-MM-DD，默认今天' }
        }
      },
      handler: async (params) => {
        const now = new Date()
        const dateStr = params.date || `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
        const [daily, cumulative, value] = await Promise.all([
          api.getDailyStats(dateStr),
          api.getCumulativeStats(),
          api.getFocusValue(dateStr)
        ])
        return { daily, cumulative, value }
      }
    },
    {
      name: 'getBalance',
      description: '查询当前虚拟价值余额',
      category: 'focus',
      inputSchema: { type: 'object', properties: {} },
      handler: async () => {
        const balance = await api.getBalance()
        return { balance }
      }
    }
  ])
}
