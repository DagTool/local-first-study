/**
 * MSW Server — test setup
 *
 * Dùng trong unit/integration tests (Node.js environment).
 * E2E tests dùng Playwright route interception thay vì MSW.
 */

import { setupServer } from 'msw/node'
import { driveHandlers } from './drive-handlers'

export const mswServer = setupServer(...driveHandlers)
