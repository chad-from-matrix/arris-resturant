# Brand assets

Drop the **supplied** ARRIS logo file in here as:

    public/brand/arris-logo.png

Use the artwork exactly as provided — do not recreate, redraw, trace or
regenerate it, and do not substitute an icon. The file is white-on-dark; the app
re-tints that same file to brand brown for light surfaces with a CSS filter
(`.logo-on-light` in `src/app/globals.css`).

Until the file is present the header falls back to a plain Cinzel `ARRIS`
wordmark so the layout does not collapse, and the browser logs one 404 for the
missing file. Both disappear as soon as the artwork is added.

You can also upload the logo through **Admin → Settings**, which stores it in
Firebase Storage and takes precedence over this file.
