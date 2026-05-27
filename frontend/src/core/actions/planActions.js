/**
 * Daily Plan actions for the Action Registry.
 */
import { registerActions } from './registry'
import api from '@/api'

export function registerPlanActions() {
  registerActions([
    {
      name: 'createDailyPlan',
      description: '在今日规划中添加一条规划项',
      category: 'plan',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: '规划标题' },
          note: { type: 'string', description: '备注/思路' },
          date: { type: 'string', description: '日期 YYYY-MM-DD，默认今天' },
          linked_plan_id: { type: 'number', description: '关联的任务ID' }
        },
        required: ['title']
      },
      handler: async (params) => {
        const now = new Date()
        const dateStr = params.date || `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
        return await api.createDailyPlan({
          date: dateStr,
          title: params.title,
          note: params.note || '',
          linked_plan_id: params.linked_plan_id || null
        })
      }
    },
    {
      name: 'queryDailyPlans',
      description: '查询某天的规划列表',
      category: 'plan',
      inputSchema: {
        type: 'object',
        properties: {
          date: { type: 'string', description: '日期 YYYY-MM-DD，默认今天' }
        }
      },
      handler: async (params) => {
        const now = new Date()
        const dateStr = params.date || `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
        return await api.getDailyPlans(dateStr)
      }
    }
  ])
}
