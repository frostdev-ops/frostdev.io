// The not-found page: the bar, and words that fit what was asked for (a pack, or a creator's page).
import './account.ts';
import { say } from './api.ts';

if (/^\/kiln\/crucible\/u\//.test(location.pathname)) {
  document.title = 'Creator not found · Crucible';
  say(document.getElementById('c-missing-h'), 'This creator is not on Crucible');
  say(document.getElementById('c-missing-text'), "We couldn't find this creator. The link may be wrong, or they deleted their packs.");
}
