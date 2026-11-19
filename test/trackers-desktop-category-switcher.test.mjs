import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const js=readFileSync(new URL('../doweo-trips-activity.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('switcher builds on existing desktop Trackers page and parses',()=>{assert.doesNotThrow(()=>new Script(js));assert.match(html,/data-dw-section="trackers"[^>]*>All Trackers/);assert.match(js,/data-gallery-category/);assert.match(js,/removeAttribute\('data-dw-section'\)/);});
test('workspace categories are account-scoped and do not modify tracker data',()=>{assert.match(js,/finance\/workspace-links\?type=trip/);assert.match(js,/finance\/workspace-links\?type=household/);assert.match(js,/finance\/workspace\?type=trip/);assert.match(js,/sq_tracker_template_/);assert.match(js,/gallery\.querySelectorAll\(':scope > \.tracker-tile'\)/);});
test('desktop-only selection preserves mobile tracker cards',()=>{assert.match(js,/min-width:901px/);assert.match(js,/max-width:900px/);assert.match(js,/card\.hidden=false;card\.style\.removeProperty\('display'\)/);});
