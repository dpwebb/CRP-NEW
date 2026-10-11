'use strict';
const net=require('node:net');
const plans=require('./plan-catalog.cjs');
const {ServiceError}=require('./errors.cjs');
// Only the local reverse proxy may supply forwarding information. Traefik
// appends its observed client address; never use a browser-provided country.
function visitorIp(req){
  let ip=req.socket?.remoteAddress||'';
  if(['127.0.0.1','::1','::ffff:127.0.0.1'].includes(ip)){
    const forwarded=req.headers?.['x-forwarded-for'];
    if(typeof forwarded==='string')ip=forwarded.split(',').at(-1).trim();
  }
  if(ip.startsWith('::ffff:'))ip=ip.slice(7);
  return net.isIP(ip)?ip:null;
}
function publicIp(ip){
  return net.isIP(ip)&&!(/^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip)||/^(::1|::|fc|fd|fe80:)/i.test(ip));
}
async function countryFromIp(ip){
  if(!ip||!publicIp(ip))return null;
  try{
    const response=await fetch('https://api.country.is/'+encodeURIComponent(ip),{signal:AbortSignal.timeout(1500),redirect:'error'});
    if(!response.ok)return null;
    const value=await response.json();
    return value.ip===ip&&/^[A-Z]{2}$/.test(value.country||'')?value.country:null;
  }catch{return null;}
}
function requestedCurrency(req,body){
  const value=body?.currency??new URL(req.url,'http://127.0.0.1').searchParams.get('currency');
  if(value===null||value===undefined)return null;
  if(!plans.isCurrency(value))throw new ServiceError('INVALID_PAYMENT_CURRENCY');
  return value;
}
function resolver(lookup=countryFromIp){
  return async(req,body)=>{
    const chosen=requestedCurrency(req,body);if(chosen)return chosen;
    let country=null;try{country=await lookup(visitorIp(req));}catch{}
    return plans.currencyForCountry(country);
  };
}
module.exports={visitorIp,publicIp,countryFromIp,requestedCurrency,resolver};
