# KaymazingMind Drive picker

A tiny static page (no build step, no framework) that lets KaymazingMind link
a Google Drive file to a task without asking for full Drive access.

The app opens `<picker site>/?task=<task id>` in the browser. The page signs
in with Google Identity Services using only the `drive.file` scope (access to
the files you pick, nothing else), shows the Google Picker, and sends the
chosen file back with a deep link:

```
kaymazingmind://drive/picked?task=<id>&id=<fileId>&name=<name>&mime=<mime>&url=<url>[&icon=<url>]
kaymazingmind://drive/picked?task=<id>&cancelled=1
```

The access token stays in the page and goes only to Google. `config.js` holds
three public values (not secrets): the OAuth client id, the API key and the
Cloud project number. The API key must be restricted by HTTP referrer to this
site's origin, so it is useless elsewhere.

## Setup (once)

1. Create a **public** GitHub repo named `kaymazingmind-picker`.
2. Put the contents of this folder (`index.html`, `picker.js`, `config.js`,
   `README.md`) at the repo root and push to `main`.
3. In the repo: Settings, Pages, deploy from branch `main`, folder `/ (root)`.
   The origin is `https://<github-user>.github.io/kaymazingmind-picker/`
   (the Google "origin" below is `https://<github-user>.github.io`).
4. In Google Cloud (the project of the existing OAuth client):
   - APIs & Services, Library: enable **Google Picker API** and **Google Drive API**.
   - Credentials, Create credentials, **API key**. Restrict it: Application
     restrictions = Websites, referrer `https://<github-user>.github.io/*`;
     API restrictions = Google Picker API. Copy the key.
   - Credentials, your **OAuth 2.0 Client ID** (Web application), Authorized
     JavaScript origins: add `https://<github-user>.github.io`.
   - OAuth consent screen, Data access (scopes): add
     `https://www.googleapis.com/auth/drive.file`.
   - Project settings (or the dashboard): note the **project number**
     (digits, not the project id). That is `APP_ID`.
5. Edit `config.js` in the repo: set `CLIENT_ID`, `API_KEY` and `APP_ID`; commit and push.
6. Build the app with
   `--dart-define=DRIVE_PICKER_URL=https://<github-user>.github.io/kaymazingmind-picker/`
   (for `tool/build_for_macbook.sh`, set it as an environment variable:
   `DRIVE_PICKER_URL=https://... tool/build_for_macbook.sh`).
   Without it the "Add from Google Drive" button is hidden.

The app accepts only `https://docs.google.com/...` and
`https://drive.google.com/...` file links from the deep link and ignores
everything else.
