# DocCollect

Document collection for CAs and tax practitioners: send requests on WhatsApp, receive documents, review them, and keep approved files in a Document Master.

This is the **front end with sample data**. Everything you see (clients, requests, chats, files) is made up and lives in memory, so a reload starts fresh. There is no backend yet.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check and build into dist/
```

Press **/** to search, and click or press any key to skip the opening animation. To switch the animation off while testing, run `localStorage.setItem('skip-splash','1')` in the browser console.

## Rename the product

The name and the link domain are in `.env`. Change them there and the whole app follows.

## Publish on GitHub Pages

Pushing to `main` builds and publishes the site (see `.github/workflows/deploy.yml`). In the repository, **Settings > Pages > Source** must be **GitHub Actions**. The site opens at `https://<user>.github.io/<repo-name>/`.

## What is not built yet

Login through the KDK suite, the database and file storage, the real WhatsApp connection, Meta-approved message templates, KDK client sync, and the AI that tells documents from personal photos.
