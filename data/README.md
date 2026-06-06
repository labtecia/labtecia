# LABTEC-IA Site Data

Edit `site.json` to add or update teams, members, events, links, PDFs, videos, and media.

If you open the website directly from disk with `index.html`, browsers cannot fetch JSON files. After changing `site.json`, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\data\update-local-data.ps1
```

That refreshes `site-data.js`, the file-open fallback. If you view the site through a local server, the site reads `site.json` directly.
