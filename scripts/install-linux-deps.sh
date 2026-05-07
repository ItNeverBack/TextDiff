#!/bin/bash
#
# TextDiff Linux 运行时依赖检查和安装脚本
# 用法: ./install-deps.sh [check|install]
#

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 依赖库列表
REQUIRED_LIBS=(
    "libnss3.so"
    "libnspr4.so"
    "libasound.so.2"
    "libgtk-3.so.0"
    "libnotify.so.4"
    "libXss.so.1"
    "libXtst.so.6"
    "libatspi.so.0"
    "libuuid.so.1"
)

# 检测发行版
detect_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        echo "$ID"
    elif [ -f /etc/redhat-release ]; then
        echo "rhel"
    elif [ -f /etc/debian_version ]; then
        echo "debian"
    else
        echo "unknown"
    fi
}

# 检查依赖
check_deps() {
    echo "检查 TextDiff 运行时依赖..."
    echo ""

    local missing_libs=()
    local found_count=0

    for lib in "${REQUIRED_LIBS[@]}"; do
        if ldconfig -p 2>/dev/null | grep -q "$lib" || \
           ldconfig -p 2>/dev/null | grep -q "$(echo $lib | sed 's/\.so\.[0-9]*/.so/')"; then
            echo -e "${GREEN}✓${NC} $lib"
            ((found_count++))
        else
            echo -e "${RED}✗${NC} $lib"
            missing_libs+=("$lib")
        fi
    done

    echo ""

    if [ ${#missing_libs[@]} -eq 0 ]; then
        echo -e "${GREEN}✓ 所有依赖已安装，可以运行 TextDiff${NC}"
        return 0
    else
        echo -e "${YELLOW}✗ 缺少 ${#missing_libs[@]} 个依赖库${NC}"
        return 1
    fi
}

# 安装依赖
install_deps() {
    local distro=$(detect_distro)

    echo "检测到发行版: $distro"
    echo ""

    case "$distro" in
        ubuntu|debian|linuxmint|pop)
            echo "正在安装依赖 (Ubuntu/Debian)..."
            sudo apt-get update
            sudo apt-get install -y \
                libnss3 \
                libnspr4 \
                libasound2 \
                libgtk-3-0 \
                libnotify4 \
                libxss1 \
                libxtst6 \
                xdg-utils \
                libatspi2.0-0 \
                libuuid1 \
                libsecret-1-0
            ;;

        fedora|rhel|centos|rocky|almalinux)
            if command -v dnf &> /dev/null; then
                echo "正在安装依赖 (Fedora/RHEL 8+)..."
                sudo dnf install -y \
                    nss \
                    nspr \
                    alsa-lib \
                    gtk3 \
                    libnotify \
                    libXScrnSaver \
                    libXtst \
                    xdg-utils \
                    at-spi2-core \
                    libuuid \
                    libsecret
            else
                echo "正在安装依赖 (CentOS 7)..."
                sudo yum install -y \
                    nss \
                    nspr \
                    alsa-lib \
                    gtk3 \
                    libnotify \
                    libXScrnSaver \
                    libXtst \
                    xdg-utils \
                    at-spi2-core \
                    libuuid \
                    libsecret
            fi
            ;;

        arch|manjaro|endeavouros)
            echo "正在安装依赖 (Arch Linux)..."
            sudo pacman -S --needed \
                nss \
                nspr \
                alsa-lib \
                gtk3 \
                libnotify \
                libxss \
                libxtst \
                xdg-utils \
                at-spi2-core \
                util-linux-libs \
                libsecret
            ;;

        opensuse|suse)
            echo "正在安装依赖 (openSUSE)..."
            sudo zypper install -y \
                mozilla-nss \
                mozilla-nspr \
                alsa-lib \
                gtk3 \
                libnotify \
                libXss1 \
                libXtst6 \
                xdg-utils \
                at-spi2-core \
                libuuid1 \
                libsecret
            ;;

        *)
            echo -e "${RED}不支持的发行版: $distro${NC}"
            echo "请手动安装以下软件包:"
            echo "  - nss / libnss3"
            echo "  - nspr / libnspr4"
            echo "  - alsa-lib / libasound2"
            echo "  - gtk3"
            exit 1
            ;;
    esac

    echo ""
    echo -e "${GREEN}✓ 依赖安装完成${NC}"
}

# 显示帮助
show_help() {
    echo "TextDiff Linux 依赖管理脚本"
    echo ""
    echo "用法: $0 [命令]"
    echo ""
    echo "命令:"
    echo "  check   检查依赖是否安装 (默认)"
    echo "  install 安装缺失的依赖"
    echo "  help    显示此帮助"
    echo ""
    echo "示例:"
    echo "  $0 check     # 检查依赖"
    echo "  $0 install   # 安装依赖"
}

# 主函数
main() {
    local command="${1:-check}"

    case "$command" in
        check)
            check_deps
            ;;
        install)
            if check_deps; then
                echo "所有依赖已安装，无需操作"
                exit 0
            fi
            echo ""
            read -p "是否安装缺失的依赖? (y/N) " -n 1 -r
            echo ""
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                install_deps
                echo ""
                echo "重新检查依赖..."
                check_deps
            else
                echo "取消安装"
            fi
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            echo "未知命令: $command"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
