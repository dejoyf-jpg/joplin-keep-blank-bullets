import { chromium } from 'playwright-core';
import fs from 'fs';
const exe = fs.readdirSync(process.env.HOME+'/.cache/ms-playwright').filter(d=>d.startsWith('chromium_headless_shell'))[0];
const browser = await chromium.launch({ executablePath: `${process.env.HOME}/.cache/ms-playwright/${exe}/chrome-headless-shell-linux64/chrome-headless-shell` }).catch(async()=>chromium.launch({channel:'chrome'}));
const page = await browser.newPage();
await page.setContent('<html><body></body></html>');
await page.addScriptTag({ path: 'conv.bundle.js' });
// Port of Joplin's mobile save path (postprocessEditorOutput + wrapHtmlForMarkdownConversion).
await page.evaluate(() => {
	const trimEmptyParagraphs = (c) => { const isE = e => e.tagName==='P' && e.textContent===''; let e; while ((e=c.children[0]) && isE(e)) e.remove(); while ((e=c.children[c.children.length-1]) && isE(e)) e.remove(); };
	const hasNonEl = p => [...p.childNodes].some(c => c.nodeType===3 && c.textContent.trim());
	const single = p => !hasNonEl(p) && p.firstElementChild?.tagName==='P' && [...p.children].filter(e=>e.tagName==='P').length===1;
	window.save = (html) => {
		const tmp = document.createElement('div'); tmp.innerHTML = html;
		const dom = document.implementation.createHTMLDocument();
		let node = dom.importNode(tmp, true);
		for (const item of node.querySelectorAll('li')) { trimEmptyParagraphs(item); if (single(item)) item.firstElementChild.replaceWith(...item.firstElementChild.childNodes); }
		for (const item of node.querySelectorAll('li')) { const input=item.firstElementChild; if (input?.tagName!=='INPUT') continue; const content=input.nextElementSibling; if(!content||content.tagName!=='DIV') continue; trimEmptyParagraphs(content); const nl=content.querySelectorAll(':scope > ul, :scope > ol'); for (let i=nl.length-1;i>=0;i--) content.after(nl[i]); if (single(content)) { const span=document.createElement('span'); span.replaceChildren(...content.firstElementChild.childNodes); content.replaceWith(span);} }
		const wrapper = node.ownerDocument.createElement('div');
		wrapper.appendChild(node.cloneNode(true));
		return window.convertHtmlToMarkdown(wrapper);
	};
	window.load = (html) => { const d = new DOMParser().parseFromString(html, 'text/html'); const cb = d.querySelector('li.md-checkbox'); if (cb) cb.cloneNode(true); return d.body.innerHTML; };
});
const N = ' ';
const saveCases = [
 ['blank last', '<ul><li><p>one</p></li><li><p></p></li></ul>', '- one\n- &nbsp;'],
 ['blank middle', '<ul><li><p>one</p></li><li><p></p></li><li><p>three</p></li></ul>', '- one\n- &nbsp;\n- three'],
 ['numbered', '<ol><li><p>one</p></li><li><p></p></li></ol>', '1.  one\n2.  &nbsp;'],
 ['nested blank', '<ul><li><p>one</p><ul><li><p></p></li></ul></li><li><p>two</p></li></ul>', '- one\n    - &nbsp;\n- two'],
 ['checkbox blank', '<ul><li class="md-checkbox"><input type="checkbox"><div><p>one</p></div></li><li class="md-checkbox"><input type="checkbox"><div><p></p></div></li></ul>', '- [ ] one\n- [ ] &nbsp;'],
 ['item still holding nbsp (drawn before the script)', `<ul><li><p>one</p></li><li><p>${N}</p></li></ul>`, '- one\n- &nbsp;'],
 ['typed beside the nbsp', `<ul><li><p>${N}three</p></li></ul>`, '- three'],
 ['image-only item untouched', '<ul><li><img src=":/abc" alt="x"></li></ul>', null],
 ['parent with only a sub-list untouched', '<ul><li><ul><li><p>a</p></li></ul></li></ul>', null],
 ['full list untouched', '<ul><li><p>one</p></li><li><p>two</p></li></ul>', '- one\n- two'],
 ['paragraphs untouched', '<p>hello</p><p></p><p>world</p>', null],
];
const run = async (label) => { const out = []; for (const [name, html] of saveCases) out.push(await page.evaluate(h => window.save(h), html)); return out; };
const before = await run('stock');
await page.evaluate(() => { window.ReactNativeWebView = {}; });
await page.addScriptTag({ path: process.env.SRC });
const after = await run('patched');
let fail = 0;
saveCases.forEach(([name, , want], i) => { const w = want === null ? before[i] : want; const ok = after[i] === w; if (!ok) fail++; console.log(`${ok?'PASS':'FAIL'} save: ${name}\n     stock ${JSON.stringify(before[i])}\n     now   ${JSON.stringify(after[i])}`); });
const loadCases = [
 ['held bullet emptied', `<ul><li>one</li><li>${N}</li></ul>`, '<ul><li>one</li><li></li></ul>'],
 ['held checkbox emptied, not refilled by the checkbox clone', `<ul><li class="md-checkbox"><div class="checkbox-wrapper"><input type="checkbox"><label>${N}</label></div></li></ul>`, '<ul><li class="md-checkbox"><div class="checkbox-wrapper"><input type="checkbox"><label></label></div></li></ul>'],
 ['real text untouched', `<ul><li>a${N}b</li></ul><p>${N}</p>`, `<ul><li>a&nbsp;b</li></ul><p>&nbsp;</p>`],
];
for (const [name, html, want] of loadCases) { const got = await page.evaluate(h => window.load(h), html); const ok = got === want; if (!ok) fail++; console.log(`${ok?'PASS':'FAIL'} load: ${name}${ok?'':'\n     got '+JSON.stringify(got)}`); }
console.log('failures', fail);
await browser.close(); process.exit(fail ? 1 : 0);
