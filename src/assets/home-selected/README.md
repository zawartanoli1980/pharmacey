# Selected Home page photography

The user requested these exact images:

| Asset basename | Source | Placement |
| --- | --- | --- |
| `background` | https://pin.it/6mKRanGBn | Home background |
| `photo-one` | https://pin.it/7uHbJG7G6 | First floating image: connected care |
| `photo-two` | https://pin.it/5jsHYVtK2 | Second floating image: digital pharmacy |
| `photo-three` | https://pin.it/6BJsHFZqF | Third floating image: medicine science |

Download the original image bytes, inspect them against the supplied pictures,
and retain their original `.jpg`, `.jpeg`, `.png` or `.webp` extension. Preserve
any watermarks, including the Adobe Stock watermark visible on the first floating
image. Do not save a Pinterest HTML page as an image or recreate the images. Record
the resolved Pin URL, image URL and checksum here after downloading.

**Pending:** the cloud proxy returned HTTP 403 for `pin.it` on 7 November 2026.
The environment draft now requests `pin.it`, `pinterest.com`, `*.pinterest.com`
and `i.pinimg.com`; that saved draft has not yet been applied to the runtime.
No selected image files have been downloaded or verified yet.

`src/data/homeSelectedPhotography.ts` activates the new background, three floating
Home hero cards, and their gallery entries only when all four assets exist.
Until then the existing Home page is preserved. The photography is decorative
website imagery; it does not verify product identity, stock or medicine prices.
