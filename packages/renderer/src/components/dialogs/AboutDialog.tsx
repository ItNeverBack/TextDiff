import { useI18n } from '../../hooks/useI18n'

interface AboutDialogProps {
  open: boolean
  onClose: () => void
}

export function AboutDialog({ open, onClose }: AboutDialogProps) {
  const { t } = useI18n()

  if (!open) return null

  return (
    <div className="overlay">
      <div className="panel about-panel">
        <div className="panel-header">
          <h3 className="panel-title">{t('menu.help.about')}</h3>
          <button className="panel-close" onClick={onClose}>×</button>
        </div>

        <div className="panel-body about-body">
          <div className="about-logo">
            <svg width="64" height="64" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#2563eb', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#1d4ed8', stopOpacity: 1 }} />
                </linearGradient>
              </defs>
              <rect x="32" y="32" width="448" height="448" rx="64" fill="url(#bgGradient)"/>
              <g transform="translate(100, 140)">
                <rect x="0" y="0" width="120" height="160" rx="12" fill="#ffffff" fillOpacity="0.95"/>
                <rect x="16" y="56" width="88" height="6" rx="3" fill="#ef4444" fillOpacity="0.7"/>
                <rect x="16" y="128" width="88" height="6" rx="3" fill="#22c55e" fillOpacity="0.7"/>
              </g>
              <g transform="translate(292, 140)">
                <rect x="0" y="0" width="120" height="160" rx="12" fill="#ffffff" fillOpacity="0.95"/>
              </g>
            </svg>
          </div>

          <h2 className="about-title">{t('app.name')}</h2>
          <p className="about-version">{t('app.version')}: 1.0.0</p>
          <p className="about-description">{t('app.description')}</p>

          <div className="about-features">
            <h4>Features:</h4>
            <ul>
              <li>{t('menu.view.splitView')} / {t('menu.view.unifiedView')}</li>
              <li>{t('menu.view.directoryView')}</li>
              <li>{t('menu.view.mergeView')}</li>
              <li>Myers / Patience / Histogram {t('dialog.ignorePanel.algorithm')}</li>
            </ul>
          </div>

          <div className="about-copyright">
            <p>© 2026 TextDiff Team. All rights reserved.</p>
          </div>
        </div>

        <div className="panel-footer">
          <button className="btn-primary" onClick={onClose}>{t('dialog.ok')}</button>
        </div>
      </div>
    </div>
  )
}
