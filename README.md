# The Plastic Recycling Challenge: Density Simulation

A browser-based simulation for a 6th-grade density lab. Students start with five mixed plastics (PP, LDPE, HDPE, PET and PVC) and pour groups of them into liquids of different densities. Each time, they see which plastics float and which sink, then collect each group into its own tray. The goal is to end with every plastic in its own tray.

It goes with the paper worksheet `density-lab.pdf`. Students write their own procedure on the worksheet as they test. When every plastic is sorted, the simulation shows a **final check** summary of where each plastic ended up.

## How students use it
1. Pick a tray. At the start there is only the mixed pile.
2. Pick a liquid from the shelf.
3. Press **Pour in** and watch which pieces rise to the surface and which sink to the bottom.
4. Press **Collect into trays**. The floaters and the sinkers each go into a new tray.
5. Repeat until every tray holds one kind of plastic.

**Undo last step** takes back the most recent test. **Start over** resets everything.

## Languages
Students can use the 🌐 menu in the top-right corner to switch the whole site between **English**, **Español** and **中文** (Simplified Chinese). The site remembers the choice on that device. The plastic codes (PP, LDPE, HDPE, PET, PVC), the liquid letters and the numbers stay the same in every language, so students can still match them to the English worksheet.

All translated text is in `i18n.js`. To fix a word, edit it there. To add a language, copy the `en` block, give it a new key (such as `vi`), translate the values and add an `<option>` for it in `index.html`.

## Running it
The site is plain HTML, CSS and JavaScript. It has no build step and no outside dependencies, so it works on school networks that filter websites.

- **Locally:** open `index.html` in a browser.
- **GitHub Pages:** in the repo on GitHub, go to **Settings → Pages**, set **Source** to *Deploy from a branch*, then choose branch `main` and folder `/ (root)`. GitHub then publishes the site at `https://<username>.github.io/<repo-name>/`.

## Changing the plastics or liquids
All of the numbers are in `data.js`, so you can change densities, colors or the number of pieces there. The names that appear on screen come from `i18n.js`. The float/sink rule is: a plastic **floats** if its density is less than the liquid's density, and **sinks** otherwise.

## Files
- `index.html`: page layout
- `styles.css`: styling, including the phone and tablet layouts
- `data.js`: the plastics and liquids tables from the worksheet
- `i18n.js`: English, Spanish and Chinese text
- `app.js`: simulation logic and drawing
- `density-lab.pdf`: the student worksheet
