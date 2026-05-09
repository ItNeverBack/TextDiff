/**
 * TextDiff 国际化 (i18n) 类型定义
 * 参考: TextDiff-DevPlan.md Week 13 国际化
 */

/** 支持的语言 */
export type Language = 'zh-CN' | 'en-US'

/** 翻译键名 - 菜单 */
export type MenuTranslationKey =
  | 'menu.file'
  | 'menu.edit'
  | 'menu.view'
  | 'menu.session'
  | 'menu.tools'
  | 'menu.help'
  | 'menu.file.openPair'
  | 'menu.file.openLeft'
  | 'menu.file.openRight'
  | 'menu.file.openDirectoryPair'
  | 'menu.file.pasteText'
  | 'menu.file.directoryCompare'
  | 'menu.file.mergeView'
  | 'menu.file.saveSession'
  | 'menu.edit.swapFiles'
  | 'menu.edit.collapseUnchanged'
  | 'menu.view.splitView'
  | 'menu.view.unifiedView'
  | 'menu.view.directoryView'
  | 'menu.view.mergeView'
  | 'menu.view.toggleTheme'
  | 'menu.session.newTab'
  | 'menu.session.closeTab'
  | 'menu.session.history'
  | 'menu.tools.ignoreRules'
  | 'menu.tools.preferences'
  | 'menu.help.shortcuts'
  | 'menu.help.about'
  | 'menu.quit'

/** 翻译键名 - 工具栏 */
export type ToolbarTranslationKey =
  | 'toolbar.openPair'
  | 'toolbar.openLeft'
  | 'toolbar.openRight'
  | 'toolbar.openDirectoryPair'
  | 'toolbar.ignore'
  | 'toolbar.ignoreWhitespace'
  | 'toolbar.ignoreCase'
  | 'toolbar.ignoreLineEnding'
  | 'toolbar.more'
  | 'toolbar.diffNav'
  | 'toolbar.diffCount'
  | 'toolbar.firstDiff'
  | 'toolbar.prevDiff'
  | 'toolbar.nextDiff'
  | 'toolbar.lastDiff'
  | 'toolbar.viewMode'
  | 'toolbar.splitView'
  | 'toolbar.unifiedView'
  | 'toolbar.directoryView'
  | 'toolbar.mergeView'
  | 'toolbar.collapseUnchanged'
  | 'toolbar.search'

/** 翻译键名 - 状态栏 */
export type StatusBarTranslationKey =
  | 'status.diff'
  | 'status.chunks'
  | 'status.added'
  | 'status.deleted'
  | 'status.modified'
  | 'status.computing'
  | 'status.algorithm'
  | 'status.time'
  | 'status.line'
  | 'status.column'

/** 翻译键名 - 对话框 */
export type DialogTranslationKey =
  | 'dialog.ok'
  | 'dialog.cancel'
  | 'dialog.close'
  | 'dialog.save'
  | 'dialog.apply'
  | 'dialog.reset'
  | 'dialog.delete'
  | 'dialog.confirm'
  | 'dialog.ignorePanel.title'
  | 'dialog.ignorePanel.whitespace'
  | 'dialog.ignorePanel.whitespaceNone'
  | 'dialog.ignorePanel.whitespaceLeadingTrailing'
  | 'dialog.ignorePanel.whitespaceAll'
  | 'dialog.ignorePanel.ignoreCase'
  | 'dialog.ignorePanel.ignoreLineEnding'
  | 'dialog.ignorePanel.ignoreComments'
  | 'dialog.ignorePanel.customRules'
  | 'dialog.ignorePanel.addRule'
  | 'dialog.ignorePanel.algorithm'
  | 'dialog.ignorePanel.myers'
  | 'dialog.ignorePanel.patience'
  | 'dialog.ignorePanel.histogram'
  | 'dialog.ignorePanel.addPrefixPlaceholder'
  | 'dialog.ignorePanel.prefixExists'
  | 'dialog.paste.title'
  | 'dialog.paste.leftText'
  | 'dialog.paste.rightText'
  | 'dialog.paste.compare'
  | 'dialog.paste.errorBothEmpty'
  | 'dialog.paste.errorLeftEmpty'
  | 'dialog.paste.errorRightEmpty'
  | 'dialog.paste.compareFailed'
  | 'dialog.paste.leftPlaceholder'
  | 'dialog.paste.rightPlaceholder'
  | 'dialog.settings.title'
  | 'dialog.settings.editor'
  | 'dialog.settings.fontSize'
  | 'dialog.settings.fontFamily'
  | 'dialog.settings.tabSize'
  | 'dialog.settings.diff'
  | 'dialog.settings.defaultIgnoreWhitespace'
  | 'dialog.settings.defaultIgnoreCase'
  | 'dialog.settings.defaultIgnoreLineEnding'
  | 'dialog.settings.defaultAlgorithm'
  | 'dialog.settings.theme'
  | 'dialog.settings.themeLight'
  | 'dialog.settings.themeDark'
  | 'dialog.settings.themeSystem'
  | 'dialog.settings.language'
  | 'dialog.settings.display'
  | 'dialog.settings.showInvisibleChars'
  | 'dialog.settings.commentPrefixes'
  | 'dialog.settings.contextLines'
  | 'dialog.settings.foldUnchanged'
  | 'dialog.shortcuts.title'
  | 'dialog.session.title'
  | 'dialog.session.search'
  | 'dialog.session.noSessions'
  | 'dialog.session.confirmDelete'
  | 'dialog.session.noSearchResults'
  | 'dialog.session.loadTitle'
  | 'dialog.session.deleteTitle'
  | 'dialog.session.hint'
  | 'dialog.unsaved.title'
  | 'dialog.unsaved.message'
  | 'dialog.unsaved.remaining'
  | 'dialog.unsaved.save'
  | 'dialog.unsaved.discard'
  | 'dialog.unsaved.saveAll'
  | 'dialog.unsaved.discardAll'
  | 'dialog.unsaved.batchMessage'
  | 'dialog.unsaved.applyToAll'
  | 'dialog.resetConfirm.title'
  | 'dialog.resetConfirm.general'
  | 'dialog.resetConfirm.editor'
  | 'dialog.resetConfirm.diff'
  | 'dialog.resetConfirm.shortcuts'

/** 翻译键名 - 合并视图 */
export type MergeTranslationKey =
  | 'merge.base'
  | 'merge.left'
  | 'merge.right'
  | 'merge.result'
  | 'merge.conflict'
  | 'merge.useBase'
  | 'merge.useLeft'
  | 'merge.useRight'
  | 'merge.editManually'
  | 'merge.autoMerge'
  | 'merge.prevConflict'
  | 'merge.nextConflict'
  | 'merge.saveResult'

/** 翻译键名 - 目录视图 */
export type DirectoryTranslationKey =
  | 'directory.equal'
  | 'directory.modified'
  | 'directory.leftOnly'
  | 'directory.rightOnly'
  | 'directory.expandingAll'
  | 'directory.collapseAll'
  | 'directory.filter'
  | 'directory.recentDirectories'
  | 'directory.selectDir'
  | 'directory.clickToSelect'
  | 'directory.changeDir'
  | 'directory.dropHint'
  | 'directory.justNow'
  | 'directory.minutesAgo'
  | 'directory.hoursAgo'
  | 'directory.daysAgo'
  | 'directory.fileCount'
  | 'directory.compareTitle'
  | 'directory.compareDescription'
  | 'directory.startCompare'
  | 'directory.leftDir'
  | 'directory.rightDir'
  | 'directory.usageTip'
  | 'directory.usageTipContent'

/** 翻译键名 - 搜索 */
export type SearchTranslationKey =
  | 'search.regex'
  | 'search.caseSensitive'
  | 'search.wholeWord'
  | 'search.searchInLeft'
  | 'search.searchInRight'
  | 'search.matchesCount'
  | 'search.atLine'
  | 'search.noResults'
  | 'search.hint'
  | 'search.columnLineNumber'
  | 'search.columnContent'
  | 'search.columnPosition'
  | 'search.moreResults'
  | 'search.navigate'
  | 'search.quickNavigate'
  | 'search.firstMatch'
  | 'search.prevMatch'
  | 'search.nextMatch'
  | 'search.lastMatch'

/** 翻译键名 - DropZone */
export type DropzoneTranslationKey =
  | 'dropzone.dropTitle'
  | 'dropzone.moreFiles'
  | 'dropzone.filesCount'
  | 'dropzone.willAddToRight'
  | 'dropzone.willAddToBoth'
  | 'dropzone.hint'
  | 'dropzone.readingFiles'

/** 翻译键名 - Diff 类型 */
export type DiffTypeTranslationKey =
  | 'diff.type.insert'
  | 'diff.type.delete'
  | 'diff.type.replace'

/** 翻译键名 - Unified View */
export type UnifiedViewTranslationKey =
  | 'unifiedView.title'

/** 翻译键名 - 快捷键分组 */
export type ShortcutsGroupTranslationKey =
  | 'shortcuts.group.fileOps'
  | 'shortcuts.group.tabManagement'
  | 'shortcuts.group.viewMode'
  | 'shortcuts.group.directory'
  | 'shortcuts.group.diffNavigation'
  | 'shortcuts.group.other'
  | 'shortcuts.hint'
  | 'shortcuts.available'
  | 'shortcuts.editHint'
  | 'shortcuts.pressKeys'
  | 'shortcuts.conflictError'
  | 'shortcuts.custom'
  | 'shortcuts.searchPlaceholder'

/** 翻译键名 - 通用 */
export type CommonTranslationKey =
  | 'app.name'
  | 'app.description'
  | 'app.version'
  | 'loading'
  | 'error'
  | 'success'
  | 'warning'
  | 'empty'
  | 'welcome.title'
  | 'welcome.description'
  | 'welcome.openFiles'
  | 'welcome.pasteText'
  | 'welcome.recentSessions'
  | 'tab.newTab'
  | 'tab.untitled'
  | 'file.encoding'
  | 'file.lineEnding'
  | 'file.lines'
  | 'file.size'
  | 'common.clear'
  | 'common.processing'
  | 'common.characters'
  | 'common.chunks'
  | 'common.clearSearch'
  | 'common.totalCount'
  | 'common.sessionsCount'
  | 'common.filteredFrom'
  | 'common.close'
  | 'common.left'
  | 'common.right'
  | 'common.noDiffData'
  | 'common.loadFailed'
  | 'common.retry'

/** 所有翻译键名 */
export type TranslationKey =
  | MenuTranslationKey
  | ToolbarTranslationKey
  | StatusBarTranslationKey
  | DialogTranslationKey
  | MergeTranslationKey
  | DirectoryTranslationKey
  | SearchTranslationKey
  | DropzoneTranslationKey
  | DiffTypeTranslationKey
  | UnifiedViewTranslationKey
  | ShortcutsGroupTranslationKey
  | CommonTranslationKey

/** 翻译字典 */
export type TranslationDictionary = Record<TranslationKey, string>

/** 所有语言的字典 */
export type LocaleDictionary = Record<Language, TranslationDictionary>
