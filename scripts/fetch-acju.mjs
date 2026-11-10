import { readFile, mkdir, writeFile } from 'node:fs/promises';
await mkdir('.qa', { recursive: true });
const page = await fetch('https://www.acju.lk/prayer-times/', { signal: AbortSignal.timeout(30000) });
if (!page.ok) throw Error('Could not read ACJU prayer page');
const html = await page.text();
await writeFile('.qa/acju.html', html);
const urls = [...new Set([...html.matchAll(/https:\/\/www\.acju\.lk\/[^\s"<>]+\.pdf/g)].map(m => m[0]))];
if (urls.length !== 156) throw Error(`Expected 156 monthly PDFs, found ${urls.length}`);
await mkdir('.qa/acju-pdfs', { recursive: true });
await writeFile('.qa/acju-sources.json', JSON.stringify(urls, null, 2));
let next = 0;
await Promise.all(Array.from({ length: 2 }, async () => {
  while (next < urls.length) {
    const index = next++;
    const file = `.qa/acju-pdfs/${String(Math.floor(index / 12) + 1).padStart(2, '0')}-${String(index % 12 + 1).padStart(2, '0')}.pdf`;
    if (process.argv.includes('--resume')) { try { await readFile(file); continue; } catch {} }
    let failure;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const response = await fetch(urls[index], { signal: AbortSignal.timeout(30000), headers: { Connection: 'close' } });
        if (!response.ok) throw Error(`HTTP ${response.status}`);
        const data = Buffer.from(await response.arrayBuffer());
        if (!data.subarray(0, 5).equals(Buffer.from('%PDF-'))) throw Error('Not a PDF');
        await writeFile(file, data); failure = null; break;
      } catch (error) { failure = error; await new Promise(resolve => setTimeout(resolve, 750 * (attempt + 1))); }
    }
    if (failure) throw Error(`Could not download ${urls[index]}: ${failure.message}`);
    if ((index + 1) % 12 === 0) console.log(`Downloaded zone ${Math.floor(index / 12) + 1}`);
  }
}));
console.log('Downloaded all 156 official monthly timetables.');
