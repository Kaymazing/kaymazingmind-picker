'use strict';

// ---- Pure helpers (no DOM, no Google): review these first. ----------------

var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(s) {
  return typeof s === 'string' && UUID.test(s);
}

/**
 * The app link for a picker result. `doc` is the picked file
 * ({id, name, mimeType, url, iconUrl}) or null for "cancelled". `kind` is
 * 'task' (default) or 'sheet' (a Google Sheets block: ?sheet=<block id>).
 * Every value is percent-encoded.
 */
function buildDeepLink(subjectId, doc, kind) {
  var q = function (k, v) { return k + '=' + encodeURIComponent(v); };
  var base = 'kaymazingmind://drive/picked?' + q(kind === 'sheet' ? 'sheet' : 'task', subjectId);
  if (!doc) return base + '&cancelled=1';
  var parts = [
    q('id', String(doc.id || '')),
    q('name', String(doc.name || '').slice(0, 500)),
    q('mime', String(doc.mimeType || '')),
    q('url', String(doc.url || '')),
  ];
  if (doc.iconUrl) parts.push(q('icon', String(doc.iconUrl)));
  return base + '&' + parts.join('&');
}

// ---- Page -----------------------------------------------------------------

var SCOPE = 'https://www.googleapis.com/auth/drive.file';
var ready = { gis: false, api: false, picker: false };
var tokenClient = null;
var params = new URLSearchParams(window.location.search);
var sheetMode = params.get('sheet') !== null && params.get('task') === null;
// The id the app opened this page for: a task, or (sheet mode) a Sheets block.
var taskId = sheetMode ? params.get('sheet') : params.get('task');

function el(id) { return document.getElementById(id); }

function say(text, isError) {
  var s = el('status');
  s.textContent = text; // textContent: never parsed as HTML
  s.className = isError ? 'error' : '';
}

function configured() {
  var c = window.PICKER_CONFIG || {};
  return !!(c.CLIENT_ID && c.API_KEY && c.APP_ID) &&
    String(c.CLIENT_ID + c.API_KEY + c.APP_ID).indexOf('YOUR_') < 0;
}

/** Called by the two Google scripts' onload. */
function pickerReady(which) {
  ready[which] = true;
  if (which === 'api') {
    // The Picker is a separate module of api.js.
    window.gapi.load('picker', function () { ready.picker = true; update(); });
  }
  update();
}

function update() {
  if (!(ready.gis && ready.picker)) return;
  var ok = isUuid(taskId) && configured();
  el('choose').disabled = !ok;
}

function leave(url) {
  say('Returning to KaymazingMind…');
  var a = document.createElement('a');
  a.href = url;
  a.textContent = 'Open KaymazingMind';
  el('status').appendChild(document.createTextNode(' '));
  el('status').appendChild(a);
  window.location.href = url;
}

function onPicker(data) {
  var A = window.google.picker.Action;
  if (data.action === A.PICKED && data.docs && data.docs[0]) {
    leave(buildDeepLink(taskId, data.docs[0], sheetMode ? 'sheet' : 'task'));
  } else if (data.action === A.CANCEL) {
    leave(buildDeepLink(taskId, null, sheetMode ? 'sheet' : 'task'));
  }
}

function openPicker(accessToken) {
  var P = window.google.picker;
  var c = window.PICKER_CONFIG;
  var all = sheetMode
    ? new P.DocsView(P.ViewId.SPREADSHEETS).setIncludeFolders(true)
    : new P.DocsView(P.ViewId.DOCS).setIncludeFolders(true);
  var office = new P.DocsView(P.ViewId.DOCS)
    .setMimeTypes(
      'application/vnd.google-apps.document,' +
      'application/vnd.google-apps.spreadsheet,' +
      'application/vnd.google-apps.presentation')
    .setLabel('Docs, Sheets, Slides'); // shown as the tab's name
  var builder = new P.PickerBuilder().addView(all);
  if (!sheetMode) builder.addView(office);
  builder
    .setAppId(c.APP_ID)
    .setDeveloperKey(c.API_KEY)
    .setOAuthToken(accessToken) // stays in this page; sent only to Google
    .setOrigin(window.location.protocol + '//' + window.location.host)
    .setCallback(onPicker)
    .build()
    .setVisible(true);
}

function choose() {
  if (!tokenClient) {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: window.PICKER_CONFIG.CLIENT_ID,
      scope: SCOPE,
      callback: function (resp) {
        if (resp && resp.access_token) {
          say('');
          openPicker(resp.access_token);
        } else {
          say('Google did not grant access. You can close this tab and try again.', true);
        }
      },
      error_callback: function () {
        say('The sign-in window was closed. Try again.', true);
      },
    });
  }
  tokenClient.requestAccessToken({ prompt: '' });
}

document.addEventListener('DOMContentLoaded', function () {
  // Without ?task this is the app's public home page (Google's consent screen
  // links here); the picker only shows when the app opened it for a task.
  if (taskId === null) return;
  if (sheetMode) {
    el('intro').textContent = 'Pick a Google Sheet to show on your KaymazingMind canvas. Only the sheet you choose is shared with the app; nothing else in your Drive is accessed.';
    el('choose').textContent = 'Choose a Google Sheet';
  }
  el('home').hidden = true;
  el('picker').hidden = false;
  if (!isUuid(taskId)) {
    say('This page must be opened from KaymazingMind.', true);
  } else if (!configured()) {
    say('This picker is not configured yet (see README.md).', true);
  }
  el('choose').addEventListener('click', choose);
});
