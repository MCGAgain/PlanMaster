/**
 * Task-related actions for the Action Registry.
 */
import { registerActions } from './registry'
import api from '@/api'

export function registerTaskActions() {
  registerActions([
    {
      name: 'createTask',
      description: '创建一个新的任务/计划',
      category: 'task',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: '任务标题' },
          plan_type: { type: 'string', enum: ['today', 'weekly', 'monthly', 'yearly'], description: '任务类型' },
          description: { type: 'string', description: '任务描述' },
          priority: { type: 'number', description: '优先级 1-100' },
          due_date: { type: 'string', description: '截止日期 YYYY-MM-DD' }
        },
        required: ['title']
      },
      confirmRequired: true,
      handler: async (params) => {
        const body = {
          title: params.title,
          plan_type: params.plan_type || 'today',
          description: params.description || '',
          priority: params.priority || 0,
          virtual_value: params.virtual_value || 0,
          due_date: params.due_date || null
        }
        const plan = await api.createPlan(body)
        return plan
      }
    },
    {
      name: 'updateTask',
      description: '更新一个已有任务的信息',
      category: 'task',
      inputSchema: {
        type: 'object',
        properties: {
          task_id: { type: 'number', description: '任务ID' },
          title: { type: 'string' },
          description: { type: 'string' },
          priority: { type: 'number' },
          progress: { type: 'number' },
          due_date: { type: 'string' }
        },
        required: ['task_id']
      },
      confirmRequired: true,
      handler: async (params) => {
        const { task_id, ...updates } = params
        const plan = await api.updatePlan(task_id, updates)
        return plan
      }
    },
    {
      name: 'completeTask',
      description: '标记一个任务为已完成',
      category: 'task',
      inputSchema: {
        type: 'object',
        properties: {
          task_id: { type: 'number', description: '任务ID' }
        },
        required: ['task_id']
      },
      handler: async (params) => {
        const result = await api.completePlan(params.task_id)
        return result
      }
    },
    {
      name: 'deleteTask',
      description: '删除一个任务',
      category: 'task',
      inputSchema: {
        type: 'object',
        properties: {
          task_id: { type: 'number', description: '任务ID' }
        },
        required: ['task_id']
      },
      confirmRequired: true,
      handler: async (params) => {
        await api.deletePlan(params.task_id)
        return { deleted: true }
      }
    },
    {
      name: 'queryTasks',
      description: '查询任务列表，可按类型和关键词筛选',
      category: 'task',
      inputSchema: {
        type: 'object',
        properties: {
          plan_type: { type: 'string', enum: ['today', 'weekly', 'monthly', 'yearly', 'important'], description: '任务类型' },
          keyword: { type: 'string', description: '搜索关键词' }
        }
      },
      handler: async (params) => {
        if (params.plan_type === 'important') {
          return await api.getImportantItems()
        }
        const plans = await api.getPlans(params.plan_type || 'today')
        if (params.keyword) {
          const kw = params.keyword.toLowerCase()
          return plans.filter(p =>
            p.title.toLowerCase().includes(kw) ||
            (p.description || '').toLowerCase().includes(kw)
          )
        }
        return plans
      }
    }
  ])
}
