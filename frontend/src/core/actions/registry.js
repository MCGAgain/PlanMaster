/**
 * Action Registry - Central hub for all app actions.
 *
 * Actions register themselves here. AI module only reads from this registry.
 * New features just need to register their actions, no AI module changes needed.
 */

const actions = new Map()
const categories = new Map()

/**
 * Register an action.
 * @param {import('./types').ActionDefinition} definition
 */
export function registerAction(definition) {
  if (!definition.name) throw new Error('Action must have a name')
  if (!definition.handler) throw new Error(`Action "${definition.name}" must have a handler`)
  actions.set(definition.name, {
    confirmRequired: false,
    category: 'general',
    ...definition
  })
  if (definition.category) {
    if (!categories.has(definition.category)) categories.set(definition.category, [])
    categories.get(definition.category).push(definition.name)
  }
}

/**
 * Register multiple actions at once.
 * @param {import('./types').ActionDefinition[]} defs
 */
export function registerActions(defs) {
  defs.forEach(registerAction)
}

/**
 * Get a registered action by name.
 * @param {string} name
 * @returns {import('./types').ActionDefinition|null}
 */
export function getAction(name) {
  return actions.get(name) || null
}

/**
 * Get all registered actions.
 * @returns {import('./types').ActionDefinition[]}
 */
export function getAllActions() {
  return Array.from(actions.values())
}

/**
 * Get action names and descriptions (for AI context).
 * @returns {Object[]}
 */
export function getActionDescriptors() {
  return Array.from(actions.values()).map(a => ({
    name: a.name,
    description: a.description,
    inputSchema: a.inputSchema,
    confirmRequired: a.confirmRequired,
    category: a.category
  }))
}

/**
 * Execute an action by name.
 * @param {string} name
 * @param {Object} params
 * @returns {Promise<import('./types').ActionResult>}
 */
export async function executeAction(name, params = {}) {
  const action = actions.get(name)
  if (!action) {
    return { success: false, error: `Unknown action: ${name}` }
  }
  try {
    const data = await action.handler(params)
    return { success: true, data, message: `${action.description} 完成` }
  } catch (e) {
    return { success: false, error: e.message || 'Action failed' }
  }
}

/**
 * Get actions grouped by category.
 * @returns {Object<string, import('./types').ActionDefinition[]>}
 */
export function getActionsByCategory() {
  const grouped = {}
  for (const action of actions.values()) {
    const cat = action.category || 'general'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(action)
  }
  return grouped
}
