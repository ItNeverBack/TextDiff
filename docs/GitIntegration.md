# TextDiff Git 集成指南

本文档介绍如何将 TextDiff 配置为 Git 的差异工具 (difftool) 和合并工具 (mergetool)。

## 快速配置

运行以下命令将 TextDiff 配置为 Git 的默认工具：

```bash
# 配置为 difftool
git config --global diff.tool textdiff
git config --global difftool.textdiff.cmd 'textdiff "$LOCAL" "$REMOTE"'

# 配置为 mergetool
git config --global merge.tool textdiff
git config --global mergetool.textdiff.cmd 'textdiff merge "$BASE" "$LOCAL" "$REMOTE" -o "$MERGED"'
git config --global mergetool.textdiff.trustExitCode false
```

## 详细配置说明

### 1. 配置为 Diff Tool

#### 1.1 全局配置

```bash
# 设置 TextDiff 为默认 diff 工具
git config --global diff.tool textdiff

# 配置 TextDiff 命令
git config --global difftool.textdiff.cmd 'textdiff "$LOCAL" "$REMOTE"'

# 允许使用 TextDiff 查看工作区与暂存区的差异
git config --global difftool.prompt false
```

#### 1.2 针对特定仓库配置

在仓库目录下运行（不使用 `--global`）：

```bash
git config diff.tool textdiff
git config difftool.textdiff.cmd 'textdiff "$LOCAL" "$REMOTE"'
```

#### 1.3 使用方式

```bash
# 查看工作区与暂存区的差异
git difftool

# 查看暂存区与最新提交的差异
git difftool --staged
git difftool --cached

# 查看两次提交之间的差异
git difftool HEAD~1 HEAD

# 查看特定文件的差异
git difftool -- path/to/file.txt
```

### 2. 配置为 Merge Tool

#### 2.1 全局配置

```bash
# 设置 TextDiff 为默认 merge 工具
git config --global merge.tool textdiff

# 配置 TextDiff 命令
git config --global mergetool.textdiff.cmd 'textdiff merge "$BASE" "$LOCAL" "$REMOTE" -o "$MERGED"'

# 不检查退出码（TextDiff 总是成功退出）
git config --global mergetool.textdiff.trustExitCode false

# 禁用提示
git config --global mergetool.prompt false

# 保留备份文件
git config --global mergetool.keepBackup true
```

#### 2.2 环境变量说明

- `$BASE` - 合并的共同祖先版本
- `$LOCAL` - 当前分支（HEAD）的版本
- `$REMOTE` - 要合并的分支的版本
- `$MERGED` - 合并结果输出文件

#### 2.3 使用方式

```bash
# 执行合并（当有冲突时）
git mergetool

# 合并特定文件
git mergetool -- path/to/conflicted/file.txt

# 跳过备份文件创建
git mergetool --no-backup
```

### 3. 自动合并模式

如果需要自动合并（无冲突时自动解决，有冲突时标记但不弹出编辑器）：

```bash
git config --global mergetool.textdiff.cmd 'textdiff merge "$BASE" "$LOCAL" "$REMOTE" -o "$MERGED" --auto'
```

注意：使用 `--auto` 时，如果遇到冲突会导致合并失败，需要手动解决。

### 4. 查看 .gitconfig

配置完成后，你的 `~/.gitconfig` 文件应该包含类似以下内容：

```ini
[diff]
    tool = textdiff
[difftool "textdiff"]
    cmd = textdiff "$LOCAL" "$REMOTE"
    prompt = false
[merge]
    tool = textdiff
[mergetool "textdiff"]
    cmd = textdiff merge "$BASE" "$LOCAL" "$REMOTE" -o "$MERGED"
    trustExitCode = false
    prompt = false
```

### 5. 直接在命令行查看差异

除了 GUI 模式，TextDiff 还支持直接在终端输出差异：

```bash
# 统一 diff 格式输出到终端
textdiff diff file1.txt file2.txt

# 并排显示差异
textdiff diff file1.txt file2.txt -o side-by-side

# 忽略空白符差异
textdiff diff file1.txt file2.txt --ignore-whitespace all

# 忽略大小写
textdiff diff file1.txt file2.txt --ignore-case
```

### 6. 与 git diff 配合使用

```bash
# 使用 textdiff 查看工作区与指定提交的差异
git difftool HEAD~5 -- path/to/file

# 使用 textdiff 查看两个分支的差异
git difftool branch1..branch2

# 使用 textdiff 查看暂存区的所有修改
git difftool --staged
```

### 7. 故障排除

#### 7.1 TextDiff 命令未找到

确保 `textdiff` 可执行文件在系统 PATH 中：

```bash
# 检查 textdiff 是否在 PATH 中
which textdiff

# 如果不在，使用完整路径配置
git config --global difftool.textdiff.cmd '/usr/local/bin/textdiff "$LOCAL" "$REMOTE"'
```

#### 7.2 文件名中包含空格

Git 会自动处理文件名中的空格，TextDiff 也支持带空格的文件名。

#### 7.3 二进制文件

TextDiff 主要用于文本文件对比。对于二进制文件，Git 会自动跳过。

### 8. 高级配置

#### 8.1 针对不同文件类型使用不同工具

```bash
# 使用 TextDiff 对比文本文件
git config --global diff.text.tool textdiff
echo "*.txt diff=text" >> .gitattributes

# 使用其他工具对比特定类型文件
git config --global diff.image.command 'imgdiff'
echo "*.png diff=image" >> .gitattributes
```

#### 8.2 配置别名

在 `~/.gitconfig` 中添加别名：

```ini
[alias]
    td = difftool
    tm = mergetool
    tds = difftool --staged
```

然后可以使用简化命令：

```bash
git td    # 等同于 git difftool
git tm    # 等同于 git mergetool
git tds   # 等同于 git difftool --staged
```

---

## 参考

- [Git 文档 - git-difftool](https://git-scm.com/docs/git-difftool)
- [Git 文档 - git-mergetool](https://git-scm.com/docs/git-mergetool)
- [TextDiff 用户手册](./UserManual.md)
