# Content

Typed content for the website until the admin panel exists (docs/mvp.md, Prio 1). Each file has the same shape as its later database table, so in Prio 5 only the loader changes.

- Every text field exists per language: `title_nl`, `title_en`, `title_de`. Only Dutch is filled for now; English and German stay `null` until Prio 4.
- Facts that only Bert can give are written as `[…]` (for example `[TIJDEN]`) or as `null`. The site shows them as a marked placeholder, so they are easy to spot and find with a search for `[`.
- UI strings (buttons, labels, page copy) live in `messages/nl.json`, not here.
