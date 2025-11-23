import base64
import io
from PIL import Image
from Memory.system_config import VIEWPORT

class ScreenshotTool:
    # =================================
    #  🎉 截图工具 (Eye/screenshot_tool.py)
    #
    #  🎨 代码用途：
    #     负责视觉处理，包括截图、压缩和图像分析。
    # =================================
    def __init__(self, page):
        self.page = page

    async def capture(self, quality_mode='high'):
        if not self.page:
            return ""

        try:
            # 1. 获取原始截图 (JPEG)
            screenshot_bytes = await self.page.screenshot(type='jpeg', quality=70)
            
            if quality_mode == 'high':
                return base64.b64encode(screenshot_bytes).decode()

            # 2. PIL 后处理 (缩放 & 压缩)
            with io.BytesIO(screenshot_bytes) as input_io:
                img = Image.open(input_io)
                
                if quality_mode == 'low':
                    target_width = int(VIEWPORT['width'] / 6)
                    target_height = int(VIEWPORT['height'] / 6)
                    img = img.resize((target_width, target_height), Image.Resampling.NEAREST)
                    save_quality = 10
                elif quality_mode == 'medium':
                    target_width = int(VIEWPORT['width'] / 2)
                    target_height = int(VIEWPORT['height'] / 2)
                    img = img.resize((target_width, target_height), Image.Resampling.BILINEAR)
                    save_quality = 40
                else:
                    save_quality = 70

                with io.BytesIO() as output_io:
                    img.save(output_io, format='JPEG', quality=save_quality)
                    return base64.b64encode(output_io.getvalue()).decode()

        except Exception as e:
            print(f"👁️ Vision Error: {e}")
            return ""
