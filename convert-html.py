import os
import re

input_file = r"C:\Users\user\.gemini\antigravity-ide\brain\2607282d-252c-4c45-aa45-af4666a29339\.system_generated\steps\172\content.md"
output_file = r"c:\Users\user\CHURCHOFGOD\ChurchofGodV1\app\src\screens\admin\stitchCelebrationsHtml.ts"

with open(input_file, "r", encoding="utf-8") as f:
    content = f.read()

# Split off the markdown frontmatter (find first "---" and take everything after it)
parts = content.split("---\n\n", 1)
if len(parts) > 1:
    html_content = parts[1]
else:
    html_content = content

# Escape backticks and dollar signs for TS string literal
escaped = html_content.replace("`", "\\`").replace("$", "\\$")
ts_content = f"export const htmlContent = `\n{escaped}\n`;"

with open(output_file, "w", encoding="utf-8") as f:
    f.write(ts_content)

print("HTML converted to TS successfully.")
