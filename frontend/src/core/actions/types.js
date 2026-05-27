/**
 * Action Registry Types
 *
 * Each action has:
 * - name: unique identifier
 * - description: what the action does (for AI context)
 * - inputSchema: JSON schema for parameters
 * - handler: async function(params) => result
 * - confirmRequired: boolean, whether user confirmation is needed
 */

/**
 * @typedef {Object} ActionDefinition
 * @property {string} name
 * @property {string} description
 * @property {Object} inputSchema
 * @property {Function} handler
 * @property {boolean} [confirmRequired=false]
 * @property {string} [category]
 */

/**
 * @typedef {Object} ActionResult
 * @property {boolean} success
 * @property {*} data
 * @property {string} [message]
 * @property {string} [error]
 */
