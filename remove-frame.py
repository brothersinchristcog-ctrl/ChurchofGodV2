import os

file_path = r"c:\Users\user\CHURCHOFGOD\ChurchofGodV1\app\src\screens\admin\stitchCelebrationsHtml.ts"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace body styles
content = content.replace(
    "padding:32px 12px;",
    "padding:0;"
).replace(
    "align-items:center;\n  justify-content:center;",
    ""
)

# Modify .phone to remove frame aesthetics
content = content.replace(
    "width:390px;\n  height:844px;\n  max-height:92vh;",
    "width:100%;\n  height:100vh;\n  max-height:100vh;"
).replace(
    "border-radius:46px;",
    "border-radius:0;"
).replace(
    "box-shadow:0 30px 70px rgba(20,25,55,0.35), 0 0 0 10px #10142c, 0 0 0 12px rgba(190,154,58,0.35);",
    "box-shadow:none;"
)

# Hide notch and status bar and rosette
content = content.replace('<div class="notch"></div>', '')
content = content.replace('<div class="statusbar">', '<div class="statusbar" style="display:none;">')
content = content.replace('<svg class="rosette-bg"', '<svg class="rosette-bg" style="display:none;"')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Frame removed.")
