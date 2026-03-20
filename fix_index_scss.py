import re
import os

path = r"c:\Users\Eric_\magic-bill-mp\src\pages\index\index.scss"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# remove .result-mask
content = re.sub(r'\.result-mask[^{]*\{[^{}]*\}', '', content, flags=re.DOTALL)
# cleanup empty lines
content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

path_res = r"c:\Users\Eric_\magic-bill-mp\src\styles\components\result-card.scss"
with open(path_res, "r", encoding="utf-8") as f:
    content_res = f.read()

if '.result-mask' not in content_res:
    mask_css = """
.result-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 400; /* Increased z-index to show over ledger detail modal */
  padding: 40rpx;
  box-sizing: border-box;
}
"""
    with open(path_res, "a", encoding="utf-8") as f:
        f.write(mask_css)
