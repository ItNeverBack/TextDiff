/* ═══════════════════════════════════════════════════════════════
   TextDiff — Mock Data
   ═══════════════════════════════════════════════════════════════ */

const MOCK_FILES = {
  left: {
    path: '/home/user/project/config.yml',
    content: `# Application Configuration
# Version: 2.1.0

server:
  host: localhost
  port: 3000
  workers: 4
  
database:
  type: postgres
  host: db.example.com
  port: 5432
  name: myapp_production
  pool_size: 20
  timeout: 30

cache:
  enabled: true
  driver: redis
  host: redis.example.com
  port: 6379
  ttl: 3600

logging:
  level: info
  format: json
  output: /var/log/myapp/app.log
  rotate: daily

features:
  dark_mode: false
  notifications: true
  analytics: false
  
security:
  cors_origins:
    - https://example.com
    - https://app.example.com
  rate_limit: 100
  jwt_expiry: 3600

# End of configuration`,
    encoding: 'UTF-8',
    lineEnding: 'lf',
    language: 'yaml'
  },
  right: {
    path: '/home/user/project/config.yml.bak',
    content: `# Application Configuration
# Version: 2.2.0

server:
  host: 0.0.0.0
  port: 8080
  workers: 8
  ssl:
    enabled: true
    cert: /etc/ssl/cert.pem
    key: /etc/ssl/key.pem
  
database:
  type: postgres
  host: db.cluster.example.com
  port: 5432
  name: myapp_production
  username: app_user
  pool_size: 50
  timeout: 60
  ssl_mode: require

cache:
  enabled: true
  driver: redis
  host: redis.cluster.example.com
  port: 6379
  ttl: 7200
  cluster_mode: true

logging:
  level: debug
  format: json
  output: /var/log/myapp/app.log
  rotate: hourly
  max_size: 100M

features:
  dark_mode: true
  notifications: true
  analytics: true
  beta_features: enabled
  
security:
  cors_origins:
    - https://example.com
    - https://app.example.com
    - https://admin.example.com
  rate_limit: 200
  jwt_expiry: 7200
  two_factor: required

# Performance tuning
performance:
  cache_static: true
  gzip_enabled: true
  cdn_url: https://cdn.example.com

# End of configuration`,
    encoding: 'UTF-8',
    lineEnding: 'lf',
    language: 'yaml'
  }
};

const DIRECTORY_DATA = [
  {
    name: 'src',
    type: 'directory',
    status: 'modified',
    children: [
      {
        name: 'components',
        type: 'directory',
        status: 'equal',
        children: [
          { name: 'Button.tsx', type: 'file', status: 'equal' },
          { name: 'Input.tsx', type: 'file', status: 'equal' },
          { name: 'Modal.tsx', type: 'file', status: 'modified' }
        ]
      },
      {
        name: 'hooks',
        type: 'directory',
        status: 'right-only',
        children: [
          { name: 'useAuth.ts', type: 'file', status: 'right-only' },
          { name: 'useApi.ts', type: 'file', status: 'right-only' }
        ]
      },
      {
        name: 'utils',
        type: 'directory',
        status: 'modified',
        children: [
          { name: 'helpers.ts', type: 'file', status: 'modified' },
          { name: 'constants.ts', type: 'file', status: 'equal' },
          { name: 'validators.ts', type: 'file', status: 'left-only' }
        ]
      },
      { name: 'App.tsx', type: 'file', status: 'modified' },
      { name: 'index.tsx', type: 'file', status: 'equal' }
    ]
  },
  {
    name: 'public',
    type: 'directory',
    status: 'equal',
    children: [
      { name: 'index.html', type: 'file', status: 'equal' },
      { name: 'favicon.ico', type: 'file', status: 'equal' }
    ]
  },
  {
    name: 'tests',
    type: 'directory',
    status: 'right-only',
    children: [
      { name: 'App.test.tsx', type: 'file', status: 'right-only' },
      { name: 'utils.test.ts', type: 'file', status: 'right-only' }
    ]
  },
  { name: 'package.json', type: 'file', status: 'modified' },
  { name: 'tsconfig.json', type: 'file', status: 'equal' },
  { name: '.gitignore', type: 'file', status: 'left-only' },
  { name: 'README.md', type: 'file', status: 'modified' }
];

const RECENT_SESSIONS = [
  { name: 'config.yml vs config.yml.bak', time: '2分钟前', id: 's1' },
  { name: 'main.ts vs main.ts', time: '1小时前', id: 's2' },
  { name: 'package.json vs package.json.old', time: '昨天', id: 's3' },
  { name: 'App.tsx (v1 vs v2)', time: '3天前', id: 's4' }
];
