import { registerDiffHandlers } from './diff.handler'
import { registerFileHandlers } from './file.handler'
import { registerSessionHandlers } from './session.handler'
import { registerSettingsHandlers } from './settings.handler'
import { registerDialogHandlers } from './dialog.handler'
import { registerDirectoryHandlers } from './directory.handler'
import { registerSyncHandlers } from './sync.handler'
import { registerReportHandlers } from './report.handler'

export function registerIpcHandlers(): void {
  registerFileHandlers()
  registerDiffHandlers()
  registerDirectoryHandlers()
  registerSessionHandlers()
  registerSettingsHandlers()
  registerDialogHandlers()
  registerSyncHandlers()
  registerReportHandlers()
}
