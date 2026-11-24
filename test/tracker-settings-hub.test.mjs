import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../doweo-tracker-settings-hub.css',import.meta.url),'utf8');
const workflow=readFileSync(new URL('../.github/workflows/deploy-doweo-pages.yml',import.meta.url),'utf8');

test('tracker settings is one continuous page, with Appearance and Management together',()=>{
  assert.ok(html.includes("settingsView.className='tracker-settings-view dw-tracker-settings-hub'"));
  assert.ok(html.includes("settingsView.append(settingsTop,settingsQuickLinks,appearanceGroup,managementGroup)"));
  assert.ok(html.includes("managementGroup.append(managementHeading,managementActions)"));
  assert.ok(html.includes("settingsSectionLink('Appearance',appearanceGroup"));
  assert.ok(html.includes("settingsSectionLink('Management',managementGroup"));
  const nav=html.slice(html.indexOf('function settingsSectionLink('),html.indexOf("settingsSectionLink('Appearance'"));
  assert.ok(nav.includes('menuPanel.scrollTo('),'Section controls should scroll, not switch tabs');
  assert.doesNotMatch(nav,/\.hidden\s*=|\.replaceChildren\(/,'Section shortcuts must never hide either group');
  for(const label of ['Change banner','Change tracker backdrop','Rename tracker','Archive tracker','Manage permissions','Expense approval'])
    assert.ok(html.includes("settingsAction(")&&html.includes("'"+label+"'"),label+' action missing');
  assert.ok(html.includes("if(t.role==='owner'||(d&&d.role==='owner')) settingsAction('✎','Rename tracker'"),'Rename authorization preserved');
  assert.ok(html.includes("if(t.role==='owner'||(d&&d.role==='owner')) settingsAction('✓','Expense approval'"),'Approval authorization preserved');
});

test('approved image-style Appearance and four-card Management layout is included',()=>{
  assert.ok(html.includes("className='dw-ts-appearance-preview '"));
  assert.ok(html.includes("'dw-ts-banner-preview':'dw-ts-backdrop-preview'"));
  assert.ok(html.includes("managementActions.className='dw-ts-management-actions'"));
  assert.ok(css.includes('grid-template-columns:repeat(4,minmax(0,1fr))'));
  assert.ok(css.includes('grid-template-columns:repeat(2,minmax(0,1fr))'));
  assert.ok(css.includes('.dw-ts-banner-preview'));
  assert.ok(css.includes('.dw-ts-backdrop-preview'));
  assert.ok(css.includes('.dw-ts-management-action'));
  assert.ok(css.includes('.dw-ts-appearance-action'));
  assert.ok(css.includes('.dw-ts-section-link-active'));
  assert.ok(css.includes('color:#0A1B2E'));
  assert.ok(css.includes('#60F1AD'));
  assert.ok(html.includes("var width=showingSettings?Math.min(880,Math.max(0,available-24))"),'Wide centered settings overlay must not collapse to the old 360px popover');
  assert.ok(html.includes("Math.min(960,vh-24)"),'Large modal must scroll on shorter devices');
});

test('scrim closes cleanly, existing actions remain reachable, and mobile navigation unchanged',()=>{
  assert.ok(html.includes("settingsScrim.className='dw-ts-scrim'"));
  assert.ok(html.includes('if(!showingSettings)settingsScrim.remove();'));
  assert.ok(html.includes('settingsScrim.remove();\n          settingsView.hidden=true'));
  assert.ok(html.includes("settingsAction('▧','Change banner',async function(){await sqBannerEdit("));
  assert.ok(html.includes("document.getElementById('btn-backdrop').click();"));
  assert.ok(html.includes("await sqManagePermissions(t);"));
  assert.ok(html.includes("await api(endpoint,'PATCH',{requireExpenseApproval:toggle.checked});"));
  assert.doesNotMatch(css,/\.sq-mobile-nav\s*\{|\.mobile-bottom-nav\s*\{/);
});

test('production workflow publishes the new component stylesheet and its reference',()=>{
  assert.ok(html.includes('/doweo-tracker-settings-hub.css?v=20261124-reference-hub-v1'));
  assert.match(workflow,/cp index\.html styles\.css [^\n]*doweo-tracker-settings-hub\.css \.pages-output\//);
  assert.ok(workflow.includes('test -s .pages-output/doweo-tracker-settings-hub.css'));
  assert.ok(workflow.includes("grep -Fq '/doweo-tracker-settings-hub.css?v=' .pages-output/index.html"));
});

test('main inline JavaScript module still parses after tracker settings changes',()=>{
  const module=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(module,'Main app module missing');
  const result=spawnSync(process.execPath,['--input-type=module','--check'],{input:module,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr||'Inline JS module failed syntax check');
});
