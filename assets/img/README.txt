FSAC registration site — optimized logo assets

These logos have been resized for web display and converted to WebP.
Transparency is preserved for transparent source images.

Replace the existing logo assets in your GitHub repository with these files,
then update the image src paths in index.html to use the .webp filenames:

- emgbr.logo.png  -> emgbr.logo.webp
- fsac.logo.jpg   -> fsac.logo.webp
- icoa.logo.png   -> icoa.logo.webp
- sbcq.logo.png   -> sbcq.logo.webp
- ssb.logo.png    -> ssb.logo.webp

Note: the uploaded source for the fourth logo was named sbq.logo.png, while
the Network screenshot showed sbcq.logo.png. The optimized file uses sbcq.logo.webp
to match the filename shown in the live site Network panel.

After publishing, hard-refresh the page with Ctrl+Shift+R and check DevTools
Network > Img. Keep your original files as a backup until the new page is verified.
