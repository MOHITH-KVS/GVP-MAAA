from pathlib import Path
import re

root = Path('src')

patterns = [
    (re.compile(r'localStorage\.getItem\("token"\)'), 'localStorage.getItem("access_token")'),
    (re.compile(r"localStorage\.getItem\('token'\)"), "localStorage.getItem('access_token')"),
    (re.compile(r'localStorage\.setItem\("token"'), 'localStorage.setItem("access_token"'),
    (re.compile(r"localStorage\.setItem\('token'"), "localStorage.setItem('access_token'"),
    (re.compile(r'localStorage\.removeItem\("token"\)'), 'localStorage.removeItem("access_token")'),
    (re.compile(r"localStorage\.removeItem\('token'\)"), "localStorage.removeItem('access_token')"),
]

updated_files = []
for path in root.rglob('*.*'):
    if path.suffix not in {'.js', '.jsx'}:
        continue
    text = path.read_text(encoding='utf-8')
    new_text = text
    for pattern, replacement in patterns:
        new_text = pattern.sub(replacement, new_text)
    if new_text != text:
        path.write_text(new_text, encoding='utf-8')
        updated_files.append(path)

print(f'Updated {len(updated_files)} files')
for path in updated_files:
    print(path)
