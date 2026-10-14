'use strict';
const net=require('node:net');
const {ServiceError}=require('./errors.cjs');
function policy(options={}) {
  const buckets=new Map(),now=options.now || Date.now;
  return function check(req) {
    if(['GET','HEAD','OPTIONS'].includes(req.method))return;
    const headers=req.headers || {},env=process.env;
    const expected=env.CRP_DEPLOYMENT_ENV==='production'?'https://creditregulatorpro.com':env.CRP_DEPLOYMENT_ENV==='staging'?'https://staging.creditregulatorpro.com':'http://'+headers.host;
    let origin=headers.origin;
    try {if(!origin && headers.referer)origin=new URL(headers.referer).origin;}catch{throw new ServiceError('NOT_AUTHORIZED');}
    if(origin && origin!==expected || headers.cookie && !origin)throw new ServiceError('NOT_AUTHORIZED');
    if((Number(headers['content-length'])>0 || headers['transfer-encoding']) && !/^application\/json(?:\s*;|$)/i.test(headers['content-type'] || ''))throw new ServiceError('INVALID_REQUEST','JSON_CONTENT_TYPE_REQUIRED');
    if(!['/api/accounts','/api/sessions','/api/account/recover','/api/account/password-reset/request','/api/account/password-reset/complete'].includes(new URL(req.url,'http://localhost').pathname))return;
    const peer=String(req.socket?.remoteAddress || 'unknown').replace(/^::ffff:/,'');
    // Unauthenticated forwarding headers are never an abuse-limit identity.
    const proxy=peer==='127.0.0.1'||peer==='::1';
    const ip=proxy && env.CRP_TRUSTED_PROXY_TOKEN && headers['x-crp-proxy-token']===env.CRP_TRUSTED_PROXY_TOKEN && net.isIP(headers['x-crp-client-ip'])?headers['x-crp-client-ip']:peer;
    const signup=req.url.split('?')[0]==='/api/accounts',limit=options.limit || (signup?(ip===peer&&proxy?200:20):(ip===peer&&proxy?1000:100));
    const key=(signup?'signup:':'login:')+ip,time=now(),window=15*60000;
    for(const [key,row] of buckets)if(time-row.start>=window)buckets.delete(key);
    if(buckets.size>=10000 && !buckets.has(key))throw new ServiceError('TOO_MANY_FAILED_SIGN_INS');
    const row=buckets.get(key)||{start:time,count:0};row.count++;buckets.set(key,row);
    if(row.count>limit)throw new ServiceError('TOO_MANY_FAILED_SIGN_INS');
  };
}
module.exports={policy};
