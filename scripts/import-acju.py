"""Extract the exact rows of ACJU's published monthly PDF tables.

Requires pypdf. Run `node scripts/fetch-acju.mjs` first.
The source tables are labelled by month/day, not by a calendar year.
"""
import calendar
import datetime
import hashlib
import json
from pathlib import Path
import re
from pypdf import PdfReader

root = Path(__file__).resolve().parent.parent
cache = root / '.qa' / 'acju-pdfs'
sources = json.loads((root / '.qa' / 'acju-sources.json').read_text(encoding='utf-8'))
if len(sources) != 156:
    raise ValueError('Expected 13 zones with 12 source PDFs each.')
time_pattern = r'(\d{1,2}):(\d{2})\s*(AM|PM)'
row_pattern = re.compile(r'(?m)^\s*(?P<date>(?:\d{1,2}-[A-Za-z]{3}|[A-Za-z]{3}-\d{1,2}))\s+(?P<times>(?:' + time_pattern + r'\s*){7})')
zones = {}
total = 0
for index, source in enumerate(sources):
    zone, month = f'{index // 12 + 1:02}', index % 12 + 1
    file = cache / f'{zone}-{month:02}.pdf'
    text = '\n'.join(page.extract_text() for page in PdfReader(file).pages)
    if not re.search(r'Zone:\s*0?' + str(int(zone)) + r'\b', text):
        raise ValueError(f'Zone label mismatch in {file.name}')
    if not all(column in text for column in ['ASR-SHAFIE', 'ASR-HANAFI', 'FAJR', 'LUHR', 'MAGRIB', 'ISHA']):
        raise ValueError(f'Unexpected table columns in {file.name}')
    days = {}
    for match in row_pattern.finditer(text):
        first, second = match.group('date').split('-')
        day, abbreviation = (first, second) if first.isdigit() else (second, first)
        printed_times = match.group('times')
        if abbreviation.lower() != calendar.month_abbr[month].lower():
            raise ValueError(f'Month label mismatch in {file.name}')
        values = []
        for hour, minute, period in re.findall(time_pattern, printed_times):
            h, m = int(hour), int(minute)
            if not (1 <= h <= 12 and 0 <= m <= 59):
                raise ValueError(f'Invalid time in {file.name}')
            values.append(f'{h % 12 + (12 if period == "PM" else 0):02}:{m:02}')
        if len(values) != 7 or values != sorted(values):
            raise ValueError(f'Invalid prayer sequence in {file.name}, day {day}')
        key = f'{int(day):02}'
        if key in days:
            raise ValueError(f'Duplicate row in {file.name}: {day}')
        days[key] = values
    expected = calendar.monthrange(2024, month)[1]
    if len(days) != expected or set(days) != {f'{day:02}' for day in range(1, expected + 1)}:
        raise ValueError(f'Missing or unparsed days in {file.name}: {len(days)} of {expected}')
    zones.setdefault(zone, {})[f'{month:02}'] = {'source': source, 'sha256': hashlib.sha256(file.read_bytes()).hexdigest(), 'days': days}
    total += len(days)
    if month == 12:
        print(f'Validated all 12 months for zone {zone}.', flush=True)

data = {'publisher': 'All Ceylon Jamiyyathul Ulama (ACJU)', 'source': 'https://www.acju.lk/prayer-times/', 'retrievedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'scheduleType': 'published-recurring-month-day', 'columns': ['Fajr', 'Sunrise', 'Dhuhr', 'AsrShafii', 'AsrHanafi', 'Maghrib', 'Isha'], 'zones': zones}
destination = root / 'data' / 'acju-prayer-times.json'
destination.parent.mkdir(exist_ok=True)
destination.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
print(f'Imported {total} exact daily rows from {len(sources)} ACJU PDFs into {destination.name}.')
