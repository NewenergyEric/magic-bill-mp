import re
import os

path = r"c:\Users\Eric_\magic-bill-mp\src\pages\ledger\index.scss"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# match .bill-detail-mask, .bill-detail-card, and anything that starts with it
# We also have .bill-detail-card .something { }
new_content = re.sub(r'\.bill-detail-(mask|card)[^\{]*\{[^}]*\}', '', content, flags=re.DOTALL)
new_content = re.sub(r'\n\s*\n\s*\n', '\n\n', new_content)

import_str = '@import "../../styles/components/result-card.scss";'
if import_str not in new_content:
    lines = new_content.split("\n")
    lines.insert(1, import_str)
    new_content = "\n".join(lines)

with open(path, "w", encoding="utf-8") as f:
    f.write(new_content)
