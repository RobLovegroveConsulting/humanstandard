import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
export const cookieName='__Host-hs-location';
export function configured(secret) {return typeof secret==='string'&&secret.length>=20;}
const digest=value=>createHash('sha256').update(value).digest();
export function matches(input,secret) {return typeof input==='string'&&configured(secret)&&timingSafeEqual(digest(input),digest(secret));}
const sign=(payload,secret)=>createHmac('sha256',secret).update('human-standard-location-session:'+payload).digest('base64url');
export function token(secret,now=Date.now()) {const payload=String(now+8*3600000);return payload+'.'+sign(payload,secret);}
export function authorised(request,secret,now=Date.now()) {
 if(!configured(secret)) return false;
 const value=(request.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1);
 if(!value) return false;
 const [payload,signature,...extra]=value.split('.');
 if(extra.length||!/^\d+$/.test(payload)||!signature||Number(payload)<=now||Number(payload)>now+8*3600000) return false;
 const expected=sign(payload,secret);
 return signature.length===expected.length&&timingSafeEqual(Buffer.from(signature),Buffer.from(expected));
}
