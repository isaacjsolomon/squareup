import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
function setup(url = 'https://doweo.app/') {
  const handlers = new Map();
  const opened = [];
  const windows = [];
  const context = {
    URL, caches: {}, console,
    self: {
      location: {origin: 'https://doweo.app'},
      registration: {showNotification: async (...args) => {context.notifications.push(args);}},
      skipWaiting: async () => {},
      clients: {claim: async () => {}},
      addEventListener(name, callback) {handlers.set(name, callback);}
    },
    clients: {
      async matchAll() {return windows;},
      async openWindow(target) {opened.push(target);}
    }
  };
  context.notifications = [];
  vm.runInNewContext(source, context);
  return {handlers, opened, windows, notifications: context.notifications, context};
}

for (const input of ['https://evil.example/steal', '//evil.example/path', 'javascript:alert(1)', 'data:text/html,hi']) {
  test('unsafe push destination stays on DoWeo: ' + input, async () => {
    const app = setup();
    let work;
    app.handlers.get('push')({
      data: {json: () => ({title:'Update', url:input})},
      waitUntil(promise) {work = promise;}
    });
    await work;
    assert.equal(app.notifications[0][1].data.url, 'https://doweo.app/');
  });
}

test('push keeps safe internal destination', async () => {
  const app = setup();
  let work;
  app.handlers.get('push')({
    data: {json: () => ({url:'/index.html#notifications'})},
    waitUntil(promise) {work = promise;}
  });
  await work;
  assert.equal(app.notifications[0][1].data.url, 'https://doweo.app/index.html#notifications');
});

test('click opens one new window when no matching app screen exists', async () => {
  const app = setup();
  let work;
  app.handlers.get('notificationclick')({
    notification: {data:{url:'/index.html#notifications'}, close(){}},
    waitUntil(promise) {work = promise;}
  });
  await work;
  assert.deepEqual(app.opened, ['https://doweo.app/index.html#notifications']);
});

test('click focuses existing app window instead of opening a duplicate', async () => {
  const app = setup();
  let focused = false;
  app.windows.push({
    url:'https://doweo.app/index.html',
    async navigate(url) {this.url=url; return this;},
    async focus() {focused=true;}
  });
  let work;
  app.handlers.get('notificationclick')({
    notification: {data:{url:'/index.html#notifications'}, close(){}},
    waitUntil(promise) {work = promise;}
  });
  await work;
  assert.equal(focused,true);
  assert.equal(app.opened.length,0);
});
