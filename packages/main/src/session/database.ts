import Database from 'better-sqlite3'
import * as path from 'path'
import * as fs from 'fs'

let db: Database.Database | null = null

function getDefaultDbPath(): string {
  try {
    const { app } = require('electron')
    return path.join(app.getPath('userData'), 'textdiff.db')
  } catch {
    return path.join(process.cwd(), 'textdiff.db')
  }
}

export function initDatabase(dbPath?: string): Database.Database {
  if (db) return db

  const defaultPath = getDefaultDbPath()
  const finalPath = dbPath || defaultPath

  db = new Database(finalPath)

  db.pragma('journal_mode = WAL')

  runMigrations(db)

  return db
}

function runMigrations(database: Database.Database): void {
  // 尝试多个可能的迁移文件路径
  const possiblePaths = [
    // 开发环境：相对于编译后的 JS 文件
    path.join(__dirname, 'migrations', '001_init.sql'),
    // 打包环境：相对于 app.asar 中的源码位置
    path.join(process.resourcesPath, 'app.asar', 'packages', 'main', 'src', 'session', 'migrations', '001_init.sql'),
    // 备用路径
    path.join(process.resourcesPath, 'packages', 'main', 'src', 'session', 'migrations', '001_init.sql')
  ]

  let migrationSql: string | null = null
  for (const migrationPath of possiblePaths) {
    try {
      if (fs.existsSync(migrationPath)) {
        migrationSql = fs.readFileSync(migrationPath, 'utf-8')
        break
      }
    } catch {
      // 继续尝试下一个路径
    }
  }

  if (migrationSql) {
    try {
      database.exec(migrationSql)
    } catch (error) {
      console.error('Failed to execute migration SQL:', error)
      initTablesFallback(database)
    }
  } else {
    console.warn('Migration file not found, using fallback SQL')
    initTablesFallback(database)
  }
}

// 备用方案：内联SQL（当迁移文件不存在时使用）
function initTablesFallback(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL,
      data        TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions(updated_at DESC);

    CREATE TABLE IF NOT EXISTS recent_files (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      path        TEXT NOT NULL UNIQUE,
      accessed_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_recent_files_accessed_at ON recent_files(accessed_at DESC);

    CREATE TABLE IF NOT EXISTS recent_directories (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      path        TEXT NOT NULL UNIQUE,
      accessed_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_recent_directories_accessed_at ON recent_directories(accessed_at DESC);

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)
}

export function getDatabase(): Database.Database {
  if (!db) {
    return initDatabase()
  }
  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}
