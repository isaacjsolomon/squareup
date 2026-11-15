import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('Google OAuth login remains wired to the Supabase provider',()=>{
 assert.match(html,/signInWithOAuth\(\{provider:"google"/);
 assert.match(html,/id="dw-google-signin"/);
});
test('New Google accounts get onboarding, but only after an existing profile check',()=>{
 assert.match(html,/authProvider:u\.app_metadata\?\.provider/);
 const onboarding=html.slice(html.indexOf('async function maybeShowOnboarding(user)'),html.indexOf("$('onboard-photo-button')"));
 assert.match(onboarding,/newGoogleAccount = user\.authProvider === 'google' && recentCreation/);
 assert.match(onboarding,/if \(!matchingEmail && !\(emailLink && recentCreation\) && !newGoogleAccount\) return/);
 const profileCheck=onboarding.indexOf("await api('profile')");
 const showOnboard=onboarding.indexOf("$('onboarding-page').hidden = false");
 assert.ok(profileCheck>0 && showOnboard>profileCheck);
 assert.match(onboarding,/existingProfile && existingProfile\.username/);
});
