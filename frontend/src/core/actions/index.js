/**
 * Action Registry - Initialize all actions.
 * Import this in main.js or App.vue to register all actions.
 */
export { registerAction, registerActions, getAction, getAllActions, getActionDescriptors, executeAction, getActionsByCategory } from './registry'
import { registerTaskActions } from './taskActions'
import { registerLogActions } from './logActions'
import { registerPlanActions } from './planActions'
import { registerFocusActions } from './focusActions'

let initialized = false

export function initActions() {
  if (initialized) return
  registerTaskActions()
  registerLogActions()
  registerPlanActions()
  registerFocusActions()
  initialized = true
}
