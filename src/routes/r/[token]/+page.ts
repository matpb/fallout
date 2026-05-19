// Recovery URL — fallout.matpb.com/r/<token>. Pulls the character from the
// cloud and writes it to local Dexie, then redirects to /character/<id>.
// Token is the credential; anyone with it gets read+write access.
export const prerender = false;
