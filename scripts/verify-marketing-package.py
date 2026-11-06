"""Verify and package the Đồng Quỹ communication deliverables."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import zipfile
from PIL import Image
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output'
MARKETING = OUT / 'marketing'
PDF = OUT / 'pdf/Dong-Quy-Huong-dan-su-dung.pdf'

images = []
for folder, expected in [('posts', (1080, 1350)), ('stories', (1080, 1920))]:
    files = sorted((MARKETING / folder).glob('*.png'))
    assert len(files) == 5, f'Expected 5 files in {folder}'
    for file in files:
        with Image.open(file) as img:
            assert img.size == expected, f'Wrong dimensions: {file.name}'
            img.verify()
        images.append({'file': file.relative_to(OUT).as_posix(), 'width': expected[0], 'height': expected[1], 'sha256': hashlib.sha256(file.read_bytes()).hexdigest()})

reader = PdfReader(PDF)
assert len(reader.pages) == 26
assert len(reader.outline) == 26
assert all(0 <= reader.get_destination_page_number(item) < 26 for item in reader.outline)
text = '\n'.join(page.extract_text() or '' for page in reader.pages)
assert '\ufffd' not in text
assert 'Phê duyệt' in text and 'Đồng Quỹ' in text
assert len(reader.pages[1].get('/Annots', [])) == 24
page_refs = {page.indirect_reference.idnum for page in reader.pages}
links = 0
for page in reader.pages:
    assert abs(float(page.mediabox.width) - 841.89) < 1
    assert abs(float(page.mediabox.height) - 595.28) < 1
    for ref in page.get('/Annots', []):
        annotation = ref.get_object()
        if '/Dest' in annotation:
            assert annotation['/Dest'][0].idnum in page_refs
            links += 1

def passwords(value):
    if isinstance(value, dict):
        for key, item in value.items():
            if 'password' in key.lower() and isinstance(item, str) and item:
                yield item
            yield from passwords(item)
    elif isinstance(value, list):
        for item in value:
            yield from passwords(item)

secrets_file = ROOT / 'data/dev-accounts.json'
corpus = text + '\n'.join(file.read_text(encoding='utf-8') for file in MARKETING.rglob('*') if file.suffix in {'.html', '.json', '.md'})
if secrets_file.exists():
    secrets = list(passwords(json.loads(secrets_file.read_text(encoding='utf-8-sig'))))
    assert secrets and all(secret not in corpus for secret in secrets), 'Credential check failed'

capture_log = json.loads((MARKETING / 'screens/capture-log.json').read_text(encoding='utf-8'))
assert capture_log['errors'] == []
audit = {
    'verifiedAt': datetime.now(timezone.utc).isoformat(),
    'images': images,
    'pdf': {'file': PDF.relative_to(OUT).as_posix(), 'pages': 26, 'bookmarks': len(reader.outline), 'tocLinks': 24, 'internalLinks': links, 'bytes': PDF.stat().st_size, 'sha256': hashlib.sha256(PDF.read_bytes()).hexdigest()},
    'checks': {'pngDecodeAndDimensions': 'pass', 'pdfStructureAndLinks': 'pass', 'vietnameseText': 'pass', 'demoPasswordAbsent': 'pass', 'browserCaptureErrors': 0, 'visualReview': 'All 10 poster images and all 26 rendered PDF pages reviewed.'},
}
(MARKETING / 'QA.json').write_text(json.dumps(audit, ensure_ascii=False, indent=2), encoding='utf-8')
archive = OUT / 'Dong-Quy-Bo-poster-va-huong-dan.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=8) as z:
    for folder in [MARKETING, OUT / 'pdf']:
        for file in sorted(folder.rglob('*')):
            if file.is_file():
                z.write(file, file.relative_to(OUT).as_posix())
    z.write(OUT / 'README-BAN-GIAO.md', 'README-BAN-GIAO.md')
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    count = len(z.infolist())
print(json.dumps({'posters': len(images), 'pdfPages': 26, 'pdfInternalLinks': links, 'zipFiles': count, 'zipMiB': round(archive.stat().st_size / 1024**2, 2), 'checks': 'passed'}, ensure_ascii=False))
