import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const ui=readFileSync(new URL('../doweo-localize-ui.js',import.meta.url),'utf8');

test('localizer includes built-in translations as reliable fallbacks',()=>{
  assert.match(ui,/seedStaticTranslations\(\)/);
  assert.match(ui,/DoWeoTranslations\?\.languages/);
  assert.match(ui,/cache\[source\]=localized\[index\]/);
});
test('inactive interface text and dynamic text changes are translated',()=>{
  assert.match(ui,/characterData:true/);
  assert.match(ui,/return true;/);
  assert.match(ui,/approved\.has\(text\)/);
});
test('failed requests retry with a cap and bounded request cadence',()=>{
  assert.match(ui,/MAX_ATTEMPTS=4/);
  assert.match(ui,/SEND_INTERVAL=3100/);
  assert.match(ui,/requested\.delete\(key\)/);
  assert.match(ui,/retryTimer=setTimeout/);
});
