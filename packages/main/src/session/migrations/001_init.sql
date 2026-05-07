-- TextDiff 数据库初始化脚本
-- 版本: 001
-- 创建日期: 2026-04-24

-- 会话表: 存储对比会话
CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  data        TEXT NOT NULL
);

-- 会话更新时间索引
CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions(updated_at DESC);

-- 最近文件表: 存储最近访问的文件
CREATE TABLE IF NOT EXISTS recent_files (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  path        TEXT NOT NULL UNIQUE,
  accessed_at INTEGER NOT NULL
);

-- 最近文件访问时间索引
CREATE INDEX IF NOT EXISTS idx_recent_files_accessed_at ON recent_files(accessed_at DESC);

-- 最近目录表: 存储最近访问的目录
CREATE TABLE IF NOT EXISTS recent_directories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  path        TEXT NOT NULL UNIQUE,
  accessed_at INTEGER NOT NULL
);

-- 最近目录访问时间索引
CREATE INDEX IF NOT EXISTS idx_recent_directories_accessed_at ON recent_directories(accessed_at DESC);

-- 设置表: 存储应用设置
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
