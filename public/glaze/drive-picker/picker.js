// Glaze's Google Drive picker page (see index.html for the contract). Google's Picker with drive.file: what the student
// picks becomes readable by Glaze's Cloud project (setAppId), nothing else in their Drive.
(() => {
  'use strict';
  const status = (text) => { document.getElementById('status').textContent = text; };
  // Only a browser extension's own redirect: Chromium's (chromiumapp.org) or Firefox's (extensions.allizom.org).
  const BACK = /^https:\/\/(?:[a-p]{32}\.chromiumapp\.org|[0-9a-f]{40}\.extensions\.allizom\.org)\/$/;

  const raw = location.hash.slice(1);
  history.replaceState(null, '', location.pathname); // the token leaves the address bar and history at once
  const p = new URLSearchParams(raw);
  const keys = [...p.keys()];
  const one = (k) => (p.getAll(k).length === 1 ? p.get(k) : '');
  const token = one('access_token'), state = one('state'), back = one('redirect_uri'), key = one('key'), appId = one('app_id');
  if (keys.length !== new Set(keys).size || !token || !/^[\w-]{16,128}$/.test(state) || !BACK.test(back) || !/^[\w-]{10,100}$/.test(key) || !/^\d{6,20}$/.test(appId)) {
    status('Open Google Drive from Glaze.');
    return;
  }
  const leave = (params) => location.replace(`${back}#${new URLSearchParams({ state, ...params })}`);

  const show = () => {
    const P = google.picker;
    const docs = new P.DocsView(P.ViewId.DOCS).setIncludeFolders(true).setSelectFolderEnabled(false);
    const lang = (navigator.language || 'en').replace('_', '-');
    new P.PickerBuilder()
      .addView(docs)
      .enableFeature(P.Feature.MULTISELECT_ENABLED)
      .setAppId(appId)
      .setOAuthToken(token)
      .setDeveloperKey(key)
      .setOrigin(location.origin)
      .setLocale(lang)
      .setCallback((data) => {
        const action = data[P.Response.ACTION];
        if (action === P.Action.CANCEL) return leave({ action: 'cancel' });
        if (action !== P.Action.PICKED) return;
        const files = (data[P.Response.DOCUMENTS] || []).slice(0, 100).map((d) => ({ id: d[P.Document.ID], name: d[P.Document.NAME], mimeType: d[P.Document.MIME_TYPE] }));
        leave(files.length ? { action: 'picked', files: JSON.stringify(files) } : { action: 'cancel' });
      })
      .build()
      .setVisible(true);
  };

  const s = document.createElement('script');
  s.src = 'https://apis.google.com/js/api.js';
  s.onload = () => gapi.load('picker', { callback: show, onerror: () => leave({ error: 'picker_load' }), timeout: 15000, ontimeout: () => leave({ error: 'picker_load' }) });
  s.onerror = () => leave({ error: 'picker_load' });
  document.head.append(s);
})();
