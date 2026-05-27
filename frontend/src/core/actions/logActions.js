/**
 * Task Log actions for the Action Registry.
 */
import { registerActions } from './registry'
import api from '@/api'

export function registerLogActions() {
  registerActions([
    {
      name: 'addTaskLog',
      description: '给任务添加一条日志/进度记录',
      category: 'log',
      inputSchema: {
        type: 'object',
        properties: {
          task_id: { type: 'number', description: '任务ID' },
          content: { type: 'string', description: '日志内容' },
          progress: { type: 'string', description: '当前进度说明' },
          next_step: { type: 'string', description: '下一步计划' }
        },
        required: ['task_id', 'content']
      },
      handler: async (params) => {
        const log = await api.createTaskLog(params.task_id, {
          content: params.content,
          progress: params.progress || '',
          next_step: params.next_step || ''
        })
        return log
      }
    },
    {
      name: 'queryTaskLogs',
      description: '查询某个任务的日志列表',
      category: 'log',
      inputSchema: {
        type: 'object',
        properties: {
          task_id: { type: 'number', description: '任务ID' }
        },
        required: ['task_id']
      },
      handler: async (params) => {
        return await api.getTaskLogs(params.task_id)
      }
    }
  ])
}
