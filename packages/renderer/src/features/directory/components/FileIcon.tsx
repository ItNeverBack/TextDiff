/**
 * FileIcon 组件
 * 根据文件类型和名称显示相应的图标
 */
import React, { memo } from 'react';
import type { DiffStatus } from '@shared/types/directory.types';
import { STATUS_COLORS } from '@shared/types/directory.types';

// ============================================
// 图标类型定义
// ============================================
export interface FileIconProps {
  type: 'file' | 'directory';
  name: string;
  status?: DiffStatus;
  isExpanded?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export interface StatusIconProps {
  status: DiffStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// ============================================
// 文件扩展名映射
// ============================================
const EXTENSION_ICONS: Record<string, string> = {
  // 代码文件
  '.ts': 'typescript',
  '.tsx': 'react',
  '.js': 'javascript',
  '.jsx': 'react',
  '.vue': 'vue',
  '.py': 'python',
  '.java': 'java',
  '.cpp': 'cpp',
  '.c': 'c',
  '.h': 'header',
  '.hpp': 'cpp',
  '.go': 'go',
  '.rs': 'rust',
  '.rb': 'ruby',
  '.php': 'php',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.scala': 'scala',
  '.r': 'r',
  '.m': 'matlab',
  '.cs': 'csharp',

  // Web 文件
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.sass': 'sass',
  '.less': 'less',
  '.json': 'json',
  '.xml': 'xml',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'toml',

  // 配置文件
  '.md': 'markdown',
  '.txt': 'text',
  '.log': 'log',
  '.ini': 'config',
  '.conf': 'config',
  '.cfg': 'config',
  '.env': 'config',

  // 文档
  '.pdf': 'pdf',
  '.doc': 'word',
  '.docx': 'word',
  '.xls': 'excel',
  '.xlsx': 'excel',
  '.ppt': 'powerpoint',
  '.pptx': 'powerpoint',

  // 图片
  '.png': 'image',
  '.jpg': 'image',
  '.jpeg': 'image',
  '.gif': 'image',
  '.svg': 'svg',
  '.ico': 'image',
  '.bmp': 'image',
  '.webp': 'image',

  // 音频视频
  '.mp3': 'audio',
  '.wav': 'audio',
  '.mp4': 'video',
  '.avi': 'video',
  '.mov': 'video',
  '.mkv': 'video',

  // 压缩文件
  '.zip': 'archive',
  '.rar': 'archive',
  '.7z': 'archive',
  '.tar': 'archive',
  '.gz': 'archive',

  // 可执行文件
  '.exe': 'executable',
  '.sh': 'script',
  '.bat': 'script',
  '.cmd': 'script',

  // 数据库
  '.sql': 'database',
  '.db': 'database',
  '.sqlite': 'database',

  // 其他
  '.gitignore': 'git',
  '.gitkeep': 'git',
  '.dockerignore': 'docker',
  'dockerfile': 'docker',
  'makefile': 'make',
  'readme': 'readme',
  'license': 'license'
};

// ============================================
// 获取文件图标类型
// ============================================
function getFileIconType(name: string): string {
  const lowerName = name.toLowerCase();

  // 检查完整文件名匹配
  if (EXTENSION_ICONS[lowerName]) {
    return EXTENSION_ICONS[lowerName];
  }

  // 检查扩展名
  const ext = lowerName.slice(lowerName.lastIndexOf('.'));
  if (EXTENSION_ICONS[ext]) {
    return EXTENSION_ICONS[ext];
  }

  return 'file';
}

// ============================================
// 图标尺寸
// ============================================
const SIZE_MAP = {
  sm: 14,
  md: 16,
  lg: 20
};

// ============================================
// FileIcon 组件
// ============================================
export const FileIcon: React.FC<FileIconProps> = memo(({
  type,
  name,
  isExpanded,
  size = 'md',
  className = ''
}) => {
  const iconSize = SIZE_MAP[size];

  if (type === 'directory') {
    return isExpanded ? (
      <OpenFolderIcon size={iconSize} className={className} />
    ) : (
      <ClosedFolderIcon size={iconSize} className={className} />
    );
  }

  const iconType = getFileIconType(name);

  switch (iconType) {
    case 'typescript':
      return <TypeScriptIcon size={iconSize} className={className} />;
    case 'javascript':
      return <JavaScriptIcon size={iconSize} className={className} />;
    case 'react':
      return <ReactIcon size={iconSize} className={className} />;
    case 'vue':
      return <VueIcon size={iconSize} className={className} />;
    case 'python':
      return <PythonIcon size={iconSize} className={className} />;
    case 'html':
      return <HtmlIcon size={iconSize} className={className} />;
    case 'css':
      return <CssIcon size={iconSize} className={className} />;
    case 'json':
      return <JsonIcon size={iconSize} className={className} />;
    case 'markdown':
      return <MarkdownIcon size={iconSize} className={className} />;
    case 'image':
      return <ImageIcon size={iconSize} className={className} />;
    case 'git':
      return <GitIcon size={iconSize} className={className} />;
    default:
      return <GenericFileIcon size={iconSize} className={className} />;
  }
});

FileIcon.displayName = 'FileIcon';

// ============================================
// StatusIcon 组件
// ============================================
export const StatusIcon: React.FC<StatusIconProps> = memo(({
  status,
  size = 'sm',
  className = ''
}) => {
  const iconSize = SIZE_MAP[size];
  const color = STATUS_COLORS[status]?.color;

  switch (status) {
    case 'equal':
      return (
        <EqualIcon
          size={iconSize}
          className={className}
          color={color}
        />
      );
    case 'modified':
      return (
        <ModifiedIcon
          size={iconSize}
          className={className}
          color={color}
        />
      );
    case 'left-only':
      return (
        <LeftOnlyIcon
          size={iconSize}
          className={className}
          color={color}
        />
      );
    case 'right-only':
      return (
        <RightOnlyIcon
          size={iconSize}
          className={className}
          color={color}
        />
      );
    case 'type-changed':
      return (
        <TypeChangedIcon
          size={iconSize}
          className={className}
          color={color}
        />
      );
    default:
      return (
        <GenericStatusIcon
          size={iconSize}
          className={className}
          color={color}
        />
      );
  }
});

StatusIcon.displayName = 'StatusIcon';

// ============================================
// 图标组件
// ============================================

interface IconProps {
  size: number;
  className?: string;
  color?: string;
}

const ClosedFolderIcon: React.FC<IconProps> = ({ size, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`text-yellow-500 ${className}`}
  >
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const OpenFolderIcon: React.FC<IconProps> = ({ size, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`text-yellow-500 ${className}`}
  >
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    <path d="M2 10l2 8h16l2-8" />
  </svg>
);

const GenericFileIcon: React.FC<IconProps> = ({ size, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`text-gray-400 ${className}`}
  >
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const TypeScriptIcon: React.FC<IconProps> = ({ size, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
  >
    <rect x="2" y="2" width="20" height="20" rx="2" fill="#3178C6" />
    <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">TS</text>
  </svg>
);

const JavaScriptIcon: React.FC<IconProps> = ({ size, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
  >
    <rect x="2" y="2" width="20" height="20" rx="2" fill="#F7DF1E" />
    <text x="12" y="16" textAnchor="middle" fill="black" fontSize="10" fontWeight="bold">JS</text>
  </svg>
);

const ReactIcon: React.FC<IconProps> = ({ size, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#61DAFB"
    strokeWidth="1.5"
    className={className}
  >
    <circle cx="12" cy="12" r="2" fill="#61DAFB" />
    <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(0 12 12)" />
    <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
    <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
  </svg>
);

const VueIcon: React.FC<IconProps> = ({ size, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
  >
    <path d="M12 2L2 19h20L12 2z" fill="#41B883" />
    <path d="M12 6L7 15h10L12 6z" fill="#35495E" />
  </svg>
);

const PythonIcon: React.FC<IconProps> = ({ size, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
  >
    <circle cx="9" cy="9" r="5" fill="#3776AB" />
    <circle cx="15" cy="15" r="5" fill="#FFD43B" />
  </svg>
);

const HtmlIcon: React.FC<IconProps> = ({ size, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
  >
    <path d="M2 4l2 16 8 2 8-2 2-16H2z" fill="#E34F26" />
    <path d="M12 20V6l-5 .5L7 18l5 2z" fill="white" />
  </svg>
);

const CssIcon: React.FC<IconProps> = ({ size, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
  >
    <path d="M2 4l2 16 8 2 8-2 2-16H2z" fill="#1572B6" />
    <path d="M12 20V6l-5 .5L7 18l5 2z" fill="white" />
  </svg>
);

const JsonIcon: React.FC<IconProps> = ({ size, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={`text-gray-500 ${className}`}
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="M8 13h.01M12 13h.01M16 13h.01" />
  </svg>
);

const MarkdownIcon: React.FC<IconProps> = ({ size, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={`text-blue-500 ${className}`}
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="M8 15l2-2 2 2M12 13v6" />
  </svg>
);

const ImageIcon: React.FC<IconProps> = ({ size, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={`text-purple-500 ${className}`}
  >
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const GitIcon: React.FC<IconProps> = ({ size, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={`text-red-500 ${className}`}
  >
    <circle cx="12" cy="18" r="3" />
    <circle cx="6" cy="6" r="3" />
    <circle cx="18" cy="6" r="3" />
    <path d="M6 9v3a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V9" />
    <path d="M12 15V9" />
  </svg>
);

// ============================================
// 状态图标
// ============================================

const EqualIcon: React.FC<IconProps> = ({ size, className, color }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color || '#22c55e'}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ModifiedIcon: React.FC<IconProps> = ({ size, className, color }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color || '#f59e0b'}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const LeftOnlyIcon: React.FC<IconProps> = ({ size, className, color }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color || '#3b82f6'}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 8 8 12 12 16" />
    <line x1="16" y1="12" x2="8" y2="12" />
  </svg>
);

const RightOnlyIcon: React.FC<IconProps> = ({ size, className, color }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color || '#ef4444'}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 16 16 12 12 8" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

const TypeChangedIcon: React.FC<IconProps> = ({ size, className, color }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color || '#8b5cf6'}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
  </svg>
);

const GenericStatusIcon: React.FC<IconProps> = ({ size, className, color }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color || '#6b7280'}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export default FileIcon;
