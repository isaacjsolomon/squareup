import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';

const trips=readFileSync(new URL('../doweo-trips-activity.js',import.meta.url),'utf8');
const navCss=readFileSync(new URL('../doweo-trackers-tabs.css',import.meta.url),'utf8');
const menu=readFileSync(new URL('../doweo-home-add-menu.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../doweo-home-add-menu.css',import.meta.url),'utf8');

test('retired Trip/Household directory switcher cannot remount old Finance Hub',()=>{
 assert.doesNotThrow(()=>new Script(trips));
 assert.doesNotThrow(()=>new Script(menu));
 assert.doesNotMatch(trips,/dw-trackers-workspace-host|dataset\.inlineWorkspaces|host\.append\(hub\)/);
 assert.match(navCss,/#trackers-page\s*>\s*nav\.dw-section-tabs\[aria-label="Tracker sections"\]\s*\{\s*display:\s*none\s*!important/);
 assert.match(menu,/retiredNavSelector/);
 assert.match(menu,/removeRetiredNav/);
});

test('the Overview dropdown retains original expense, receipt, and split flows',()=>{
 assert.match(menu,/old\.cloneNode\(true\)/);
 for(const id of ['quick-expense','quick-receipt','quick-split'])assert.match(menu,new RegExp(id));
 assert.match(menu,/dwOpenExpenseTool/);
 assert.match(menu,/aria-expanded/);
 assert.match(menu,/Escape/);
 assert.match(css,/@media\(min-width:901px\)/);
 assert.match(css,/@media\(max-width:900px\)/);
});
