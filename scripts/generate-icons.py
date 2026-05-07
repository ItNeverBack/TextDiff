"""
TextDiff 图标生成脚本
从 SVG 生成 512x512 PNG 和多尺寸 ICO 文件
"""
from PIL import Image, ImageDraw, ImageFont
import io
import subprocess
import sys
import os

def create_icon_from_scratch():
    """从代码创建 512x512 图标（无需外部依赖）"""
    # 创建 512x512 图像
    img = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # 背景 - 蓝色渐变效果（使用纯色）
    bg_color = (37, 99, 235)  # #2563eb
    draw.rounded_rectangle([32, 32, 480, 480], radius=64, fill=bg_color)
    
    # 左侧文件图标
    left_x, left_y = 100, 140
    # 文件背景
    draw.rounded_rectangle([left_x, left_y, left_x + 120, left_y + 160], 
                           radius=12, fill=(255, 255, 255, 242))
    # 文件顶部灰色区域
    draw.rounded_rectangle([left_x, left_y, left_x + 120, left_y + 40], 
                           radius=12, fill=(229, 231, 235))
    draw.rectangle([left_x, left_y + 28, left_x + 120, left_y + 40], fill=(229, 231, 235))
    # 折叠角
    draw.polygon([(left_x + 84, left_y), (left_x + 120, left_y), 
                  (left_x + 120, left_y + 36)], fill=(209, 213, 219))
    # 文档行 - 红色表示删除
    draw.rounded_rectangle([left_x + 16, left_y + 56, left_x + 104, left_y + 62], 
                           radius=3, fill=(239, 68, 68, 179))
    draw.rounded_rectangle([left_x + 16, left_y + 72, left_x + 88, left_y + 78], 
                           radius=3, fill=(156, 163, 175))
    draw.rounded_rectangle([left_x + 16, left_y + 88, left_x + 96, left_y + 94], 
                           radius=3, fill=(156, 163, 175))
    draw.rounded_rectangle([left_x + 16, left_y + 104, left_x + 72, left_y + 110], 
                           radius=3, fill=(156, 163, 175))
    draw.rounded_rectangle([left_x + 16, left_y + 128, left_x + 104, left_y + 134], 
                           radius=3, fill=(34, 197, 94, 179))  # 绿色
    
    # 右侧文件图标
    right_x, right_y = 292, 140
    draw.rounded_rectangle([right_x, right_y, right_x + 120, right_y + 160], 
                           radius=12, fill=(255, 255, 255, 242))
    draw.rounded_rectangle([right_x, right_y, right_x + 120, right_y + 40], 
                           radius=12, fill=(229, 231, 235))
    draw.rectangle([right_x, right_y + 28, right_x + 120, right_y + 40], fill=(229, 231, 235))
    draw.polygon([(right_x + 84, right_y), (right_x + 120, right_y), 
                  (right_x + 120, right_y + 36)], fill=(209, 213, 219))
    # 文档行 - 全部是灰色（右侧文件）
    for i, y in enumerate([56, 72, 88, 104, 128]):
        width = [88, 72, 80, 56, 88][i]
        draw.rounded_rectangle([right_x + 16, right_y + y, right_x + 16 + width, right_y + y + 6], 
                               radius=3, fill=(156, 163, 175))
    
    # 差异指示器 - 箭头
    center_y = 220
    # 左箭头（红色）
    draw.polygon([(220, center_y), (236, center_y - 8), (236, center_y - 4), 
                  (252, center_y - 4), (252, center_y + 4), (236, center_y + 4), 
                  (236, center_y + 8)], fill=(239, 68, 68))
    # 右箭头（绿色）
    draw.polygon([(292, center_y), (276, center_y - 8), (276, center_y - 4), 
                  (260, center_y - 4), (260, center_y + 4), (276, center_y + 4), 
                  (276, center_y + 8)], fill=(34, 197, 94))
    
    # 添加文字
    try:
        # 尝试使用系统字体
        font_large = ImageFont.truetype("segoeui.ttf", 28)
        font_small = ImageFont.truetype("segoeui.ttf", 14)
    except:
        try:
            font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 28)
            font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
        except:
            font_large = ImageFont.load_default()
            font_small = font_large
    
    # TextDiff 文字
    text = "TextDiff"
    bbox = draw.textbbox((0, 0), text, font=font_large)
    text_width = bbox[2] - bbox[0]
    draw.text(((512 - text_width) // 2, 365), text, fill=(255, 255, 255), font=font_large)
    
    subtitle = "Text Compare Tool"
    bbox2 = draw.textbbox((0, 0), subtitle, font=font_small)
    text_width2 = bbox2[2] - bbox2[0]
    draw.text(((512 - text_width2) // 2, 400), subtitle, fill=(255, 255, 255, 180), font=font_small)
    
    return img

def create_ico_file(img_512):
    """从 512x512 图像创建多尺寸 ICO 文件"""
    # ICO 需要的尺寸
    sizes = [16, 24, 32, 48, 64, 128, 256]
    
    # 创建所有尺寸的图像
    ico_images = []
    for size in sizes:
        resized = img_512.resize((size, size), Image.Resampling.LANCZOS)
        ico_images.append(resized)
    
    return ico_images

def main():
    build_dir = r"C:\Users\m1552\Desktop\code\diffText\build"
    
    print("Generating TextDiff icons...")
    
    # 创建 512x512 PNG
    img_512 = create_icon_from_scratch()
    png_path = os.path.join(build_dir, "icon.png")
    img_512.save(png_path, "PNG")
    print(f"✓ Created {png_path} (512x512)")
    
    # 创建多尺寸 ICO
    ico_images = create_ico_file(img_512)
    ico_path = os.path.join(build_dir, "icon.ico")
    ico_images[0].save(ico_path, format='ICO', sizes=[(s, s) for s in [16, 24, 32, 48, 64, 128, 256]], 
                       append_images=ico_images[1:])
    print(f"✓ Created {ico_path} (16, 24, 32, 48, 64, 128, 256)")
    
    # 创建 macOS 图标 (icns) - 可选
    icns_path = os.path.join(build_dir, "icon.icns")
    # ICNS 需要特殊处理，这里仅保存 512 版本
    img_512.save(icns_path.replace('.icns', '_512.png'), "PNG")
    
    print("\nIcon generation complete!")
    print("Files generated:")
    print(f"  - {png_path}")
    print(f"  - {ico_path}")
    print(f"  - {os.path.join(build_dir, 'icon.svg')} (existing)")

if __name__ == "__main__":
    main()
