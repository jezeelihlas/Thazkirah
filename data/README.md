# ACJU prayer timetable snapshot

Publisher: All Ceylon Jamiyyathul Ulama (ACJU).

Official source: https://www.acju.lk/prayer-times/

`acju-prayer-times.json` preserves the seven printed columns from the 12 monthly PDFs for each of ACJU's 13 district zones: Fajr, sunrise, Dhuhr, Shafi'i Asr, Hanafi Asr, Maghrib and Isha. Only the representation is converted from AM/PM to 24-hour notation. The API serves the five prayer columns and the chosen Asr column. No minute offsets, coordinate interpolation, alternative calculator or external fallback is applied.

The source tables have month/day labels (including 29 February) rather than a printed year. The app treats this snapshot as the published recurring monthly schedule and validates the requested Gregorian date. A date with no table must not receive an estimate. The table's base values are used; separate high-rise adjustments printed in the PDFs are not applied automatically.

Each month's original source URL and PDF SHA-256 digest are retained for traceability. The original PDFs are downloaded into the ignored `.qa/acju-pdfs/` folder during import, not bundled into the browser or required by runtime hosting. A metadata timestamp records retrieval/import. ACJU remains the publisher; this app is not affiliated with ACJU.

To refresh after publisher revisions:

```text
python -m pip install -r scripts/requirements-acju.txt
npm run refresh:prayer-times
npm test
npm run build
```

Deploy the updated JSON with the application. Date rollover automatically changes the selected daily row; fetching later publisher revisions is a separate maintenance step.
