import { chromium } from 'playwright-core';
import fs from 'fs';
const API='http://127.0.0.1:41185', TOKEN='scratchtesttoken0001';
const api=async(m,p,b)=>{const r=await fetch(`${API}${p}${p.includes('?')?'&':'?'}token=${TOKEN}`,{method:m,body:b?JSON.stringify(b):undefined});if(!r.ok)throw new Error(await r.text());return r.json();};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const keep=fs.readFileSync('keep.js','utf8');
const FILL=process.env.FILL||'<p>&nbsp;</p>';
const browser=await chromium.connectOverCDP('http://127.0.0.1:9337');
const page=browser.contexts()[0].pages().find(p=>p.url().includes('/index.html'));
await page.bringToFront();
const folder=await api('POST','/folders',{title:'MX '+Date.now()});
await sleep(1000);
await page.getByText(folder.title,{exact:true}).first().click();
const cases={
 middle:'<ul><li>one</li><li></li><li>three</li></ul>',
 last:'<ul><li>one</li><li></li></ul><p>after</p>',
 nested:'<ul><li>one<ul><li></li></ul></li><li>two</li></ul>',
 nestedSib:'<ul><li>one<ul><li>a</li><li></li></ul></li></ul>',
 check:'<ul class="joplin-checklist"><li>one</li><li></li></ul>',
 numbered:'<ol><li>one</li><li></li><li>three</li></ol>',
 multi:'<ul><li></li><li></li></ul>',
 only:'<ul><li></li></ul>',
 quote:'<blockquote><ul><li>one</li><li></li></ul></blockquote>',
 afterText:'<p>intro</p><ul><li></li></ul><p>outro</p>',
 mixedNest:'<ol><li>one<ul><li></li><li>b</li></ul></li><li></li></ol>',
 many:'<ul>'+'<li></li>'.repeat(200)+'</ul>',
};
const open=async(title)=>{await page.getByText(title,{exact:true}).first().click();await page.waitForFunction(()=>{const ed=window.tinymce&&window.tinymce.activeEditor;return ed&&ed.getBody().textContent.includes('MARK');},null,{timeout:15000});await sleep(1000);await page.waitForFunction(()=>window.tinymce.activeEditor.__keepBlankBullets===true,null,{timeout:10000});};
const poke=async()=>{await page.evaluate(()=>{const ed=window.tinymce.activeEditor;ed.focus();const p=ed.getBody().querySelector('p');ed.selection.select(p,true);ed.selection.collapse(false);});await page.keyboard.type('z');await sleep(2500);};
const dom=()=>page.evaluate(()=>window.tinymce.activeEditor.getBody().innerHTML.replace(/\s+/g,' ').replace(/^.*?<\/p>/,'').replace(/ data-mce-bogus="1"/g,''));
const decoy=await api('POST','/notes',{title:'decoy',body:'MARK decoy',parent_id:folder.id});
let fail=0;
for(const [name,html] of Object.entries(cases)){
  const title='mx '+name;
  const n=await api('POST','/notes',{title,body:'MARK',parent_id:folder.id});
  await sleep(1200); await open(title);
  await page.evaluate((h)=>{const ed=window.tinymce.activeEditor;ed.setContent('<p>MARK</p>'+h);},html);
  const want=await dom();
  await poke();
  const md1=(await api('GET',`/notes/${n.id}?fields=body`)).body;
  await open('decoy'); await open(title);            // real reload from saved Markdown
  await page.evaluate(()=>{const ed=window.tinymce.activeEditor;ed.setContent(ed.getContent());}); // exercise BeforeSetContent again
  const got=await dom();
  await poke();
  const md2=(await api('GET',`/notes/${n.id}?fields=body`)).body;
  const norm=s=>s.replace(/<br>/g,'').replace(/ class="[^"]*"| data-[a-z-]+="[^"]*"| id="[^"]*"/g,'');
  const okDom=norm(want)===norm(got), okMd=md1.replace('MARKz','MARK')===md2.replace('MARKzz','MARK');
  if(!okDom||!okMd)fail++;
  console.log(`${okDom&&okMd?'PASS':'FAIL'} ${name}\n   md1 ${JSON.stringify(md1)}\n   md2 ${JSON.stringify(md2)}\n   want ${norm(want)}\n   got  ${norm(got)}`);
}
console.log('failures',fail);
await browser.close().catch(()=>{});process.exit(0);
