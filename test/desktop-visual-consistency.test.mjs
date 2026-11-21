import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../doweo-desktop-polish.css',import.meta.url),'utf8');
const workflow=readFileSync(new URL('../.github/workflows/deploy-doweo-pages.yml',import.meta.url),'utf8');

test('all visual overrides are inside the desktop-only breakpoint',()=>{
  const body=css.replace(/^\/\*[\s\S]*?\*\//,'').trim();
  assert.ok(body.startsWith('@media (min-width: 901px) {'),'desktop media scope required');
  assert.ok(body.endsWith('}'),'media block must close');
  let balance=0,closed=false;
  for(let i=0;i<body.length;i++){
    if(body[i]==='{')balance++;
    if(body[i]==='}'){
      balance--;
      assert.ok(balance>=0,'unmatched CSS brace');
      if(balance===0){closed=true;assert.equal(body.slice(i+1).trim(),'','all rules must remain in one media block')}
    }
  }
  assert.ok(closed&&balance===0);
});

test('polish targets only existing page elements without new navigation or layout',()=>{
  for(const selector of [
    '.dw-page-header', '.sq-workspace-tabs', '.dw-integrated-tabs',
    '.dw-integrated-picker select', '#dw-compact-add-menu', '#dw-split-modal'
  ])assert.ok(css.includes(selector), 'missing intended component '+selector);
  for(const forbidden of [
    '#settings-signout','#settings-delete-account','#sq-mobile-more-sheet',
    '.sq-balanced-logout','.sq-balanced-feedback','.sq-social-instagram',
    '#auth-modal','#delete-account-panel'
  ])assert.ok(!css.includes(forbidden),'do not change exceptional actions: '+forbidden);
  assert.ok(!css.includes('display:grid'),'do not restructure page geometry');
  assert.ok(!css.includes('position:'),'do not move controls');
});

test('Cloudflare bundles and versions the stylesheet so the polish reaches the site',()=>{
  assert.ok(workflow.includes('doweo-desktop-polish.css .pages-output/'));
  assert.ok(workflow.includes('/doweo-desktop-polish.css?v=20261120-desktop-consistency-v1'));
  assert.ok(workflow.includes('test -s .pages-output/doweo-desktop-polish.css'));
});
