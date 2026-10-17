/* Local, inert source viewer: submitted bytes reach only textContent, never a markup parser. */
'use strict';
globalThis.GalleryViewer = (() => {
  const node = (tag, text = '', cls = '') => {
    const n = document.createElement(tag); n.textContent = text; if (cls) n.className = cls; return n;
  };
  const visible = (text) => text.replace(/[\p{Cf}\p{Cc}\p{Zl}\p{Zp}]/gu, (c) => /[\n\r\t]/.test(c) ? c : `⟦U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}⟧`);
  const language = (name) => ({ js: 'js', json: 'json', html: 'html', css: 'css', md: 'md', glsl: 'glsl', vert: 'glsl', frag: 'glsl' }[name.split('.').pop().toLowerCase()] || 'text');
  // shortcut: lexical highlighting only; use a full parser if semantic navigation is needed.
  const patterns = {
    js: /\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$)|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:const|let|var|function|return|if|else|for|while|new|class|async|await|throw|try|catch|import|export|from|true|false|null|undefined)\b|\b\d+(?:\.\d+)?\b/g,
    json: /"(?:\\.|[^"\\])*"|\b(?:true|false|null)\b|-?\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b/g,
    html: /<!--[\s\S]*?(?:-->|$)|<\/?[\w:-]+|\/?>|[\w:-]+(?=\s*=)|"[^"]*"|'[^']*'/g,
    css: /\/\*[\s\S]*?(?:\*\/|$)|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|#[\da-f]{3,8}\b|--[\w-]+|[\w-]+(?=\s*:)|[.#][\w-]+|\b\d+(?:\.\d+)?(?:px|rem|em|vh|vw|s|ms|%)?/gi,
    md: /^#{1,6} .*|^\s*>.*|`[^`]*`|\*\*[^*]+\*\*|\[[^\]]*\]\([^)]*\)/g,
    glsl: /\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$)|^\s*#.*|\b(?:void|float|int|bool|vec[234]|mat[234]|uniform|varying|in|out|const|return|if|else|for|while|precision|mediump|highp|sin|cos|mix|smoothstep|texture2D|gl_FragColor)\b|\b\d+(?:\.\d+)?\b/g,
  };
  function highlight(parent, text, lang) {
    const source = visible(text), pattern = patterns[lang];
    if (!pattern) { parent.append(document.createTextNode(source)); return; }
    pattern.lastIndex = 0;
    let end = 0;
    for (const m of source.matchAll(pattern)) {
      if (m.index > end) parent.append(document.createTextNode(source.slice(end, m.index)));
      const token = m[0], cls = /^(?:\/\/|\/\*|<!--)/.test(token) ? 'comment' : /^["'`]/.test(token) ? 'string' : /^-?\d|^#[\da-f]+$/i.test(token) ? 'number' : 'keyword';
      parent.append(node('span', token, `syntax-${cls}`)); end = m.index + token.length;
    }
    if (end < source.length) parent.append(document.createTextNode(source.slice(end)));
  }
  const control = (label, fn) => {
    const b = node('button', label, 'secondary'); b.type = 'button'; b.addEventListener('click', fn); return b;
  };
  function code(target, text, name) {
    const shell = node('div', '', 'code-viewer'), tools = node('div', '', 'viewer-tools');
    const search = node('input'); search.type = 'search'; search.placeholder = 'Find in file'; search.ariaLabel = `Find in ${name}`;
    const info = node('span', '', 'muted small'); info.role = 'status';
    const pre = node('pre', '', 'source'); pre.tabIndex = 0; pre.ariaLabel = name;
    // Bound both DOM rows and a pathological single line, without omitting any source.
    const rows = [], lines = text.split(/(\r\n|\r|\n)/); let offset = 0;
    for (let i = 0; i < lines.length; i += 2) {
      const line = lines[i];
      for (let at = 0; at < line.length || at === 0; at += 2000) rows.push({ line: i / 2 + 1, continued: at > 0, text: line.slice(at, at + 2000), offset: offset + at });
      offset += line.length + (lines[i + 1]?.length || 0);
    }
    let page = 0, found = -1, query = '', wrap = false;
    const pages = Math.ceil(rows.length / 100), lang = language(name);
    const prev = control('Previous page', () => { page--; draw(); }), next = control('Next page', () => { page++; draw(); });
    function draw() {
      pre.replaceChildren();
      for (const row of rows.slice(page * 100, (page + 1) * 100)) {
        const line = node('span', '', 'source-line');
        const number = node('span', `${row.line}${row.continued ? '↳' : ''}`, 'line-number'); number.ariaHidden = 'true';
        const content = node('code');
        if (query && found >= row.offset && found < row.offset + row.text.length) {
          const at = found - row.offset;
          highlight(content, row.text.slice(0, at), lang);
          content.append(node('mark', visible(row.text.slice(at, at + query.length))));
          highlight(content, row.text.slice(at + query.length), lang);
        } else highlight(content, row.text, lang);
        line.append(number, content); pre.append(line);
      }
      prev.disabled = page === 0; next.disabled = page + 1 >= pages;
      info.textContent = `Page ${page + 1} / ${pages} · ${Math.ceil(lines.length / 2)} lines${query ? found < 0 ? ' · No match' : ` · Match at character ${found + 1}` : ''}`;
    }
    function find(advance) {
      const value = search.value; if (value !== query) found = -1;
      query = value;
      found = query ? text.toLowerCase().indexOf(query.toLowerCase(), advance ? found + 1 : 0) : -1;
      if (found < 0 && query && advance) found = text.toLowerCase().indexOf(query.toLowerCase());
      if (found >= 0) { const i = rows.findIndex((r) => r.offset + r.text.length >= found); page = Math.floor(Math.max(0, i) / 100); }
      draw();
    }
    search.addEventListener('input', () => find(false));
    search.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); find(true); } });
    const toggle = control('Wrap: off', () => { wrap = !wrap; pre.classList.toggle('wrap', wrap); toggle.textContent = `Wrap: ${wrap ? 'on' : 'off'}`; toggle.ariaPressed = String(wrap); }); toggle.ariaPressed = 'false';
    const copy = control('Copy', async () => {
      try { await navigator.clipboard.writeText(text); copy.textContent = 'Copied'; }
      catch { info.textContent = 'Copy unavailable. Select the source or download the file.'; }
    });
    tools.append(search, control('Next match', () => find(true)), toggle, copy, prev, next, info);
    shell.append(tools, node('p', 'Hidden and direction controls are shown as ⟦U+XXXX⟧. Copy preserves the original source.', 'muted small'), pre);
    target.replaceChildren(shell); draw();
  }
  function image(target, url, name) {
    const tools = node('div', '', 'viewer-tools'), stage = node('div', '', 'image-stage fit'); stage.tabIndex = 0; stage.ariaLabel = `${name}, scroll to pan when zoomed`;
    const img = node('img'); img.alt = name;
    img.addEventListener('error', () => { stage.replaceChildren(node('p', 'This browser could not display the image. Use Download to inspect it.')); });
    img.src = url;
    const fit = control('Fit', () => stage.classList.add('fit'));
    const actual = control('100%', () => stage.classList.remove('fit'));
    const pixel = control('Pixelated: off', () => { const on = stage.classList.toggle('pixelated'); pixel.textContent = `Pixelated: ${on ? 'on' : 'off'}`; pixel.ariaPressed = String(on); }); pixel.ariaPressed = 'false';
    const zoom = node('input'); zoom.type = 'range'; zoom.min = '25'; zoom.max = '800'; zoom.value = '100'; zoom.ariaLabel = 'Image zoom percent';
    zoom.addEventListener('input', () => { stage.classList.remove('fit'); img.style.width = `${img.naturalWidth * Number(zoom.value) / 100}px`; });
    actual.addEventListener('click', () => { zoom.value = '100'; img.style.width = `${img.naturalWidth}px`; });
    tools.append(fit, actual, pixel, zoom); stage.append(img); target.replaceChildren(tools, stage);
  }
  return { visible, language, highlight, code, image };
})();
