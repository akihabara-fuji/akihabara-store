# Cetak print/*.html -> pdf/*.pdf (lokal saja, Playwright + Chrome). PDF TIDAK masuk dist/.
import glob, os
from playwright.sync_api import sync_playwright
os.makedirs('pdf', exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    for f in sorted(glob.glob('print/*.html')):
        pg = b.new_page()
        pg.goto('file://' + os.path.abspath(f))
        out = 'pdf/' + os.path.basename(f)[:-5] + '.pdf'
        pg.pdf(path=out, format='A4', margin={'top':'16mm','bottom':'16mm','left':'14mm','right':'14mm'}, print_background=True)
        print('PDF', out)
    b.close()
