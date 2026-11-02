const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const { createStore } = require('../studio/store');
const { registerStudioRoutes } = require('../studio/api');
function start(){const app=express();app.use(express.json());const store=createStore(':memory:');registerStudioRoutes(app,{store,environment:'test'});const server=http.createServer(app);return new Promise(r=>server.listen(0,'127.0.0.1',()=>r({server,port:server.address().port})))}
function req(port,method,path,body){return new Promise((resolve,reject)=>{const r=http.request({hostname:'127.0.0.1',port,method,path,headers:{'content-type':'application/json','x-nextaja-owner-id':'alice'}},res=>{let t='';res.on('data',c=>t+=c);res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(t)}))});r.on('error',reject);if(body)r.write(JSON.stringify(body));r.end()})}
test('package can be scheduled with a calendar link',async t=>{const c=await start();t.after(()=>c.server.close());const w=await req(c.port,'POST','/ms/studio/workspaces',{name:'Brand'});const p=await req(c.port,'POST',`/ms/studio/workspaces/${w.body.workspace.id}/packages`,{topic:'Kopi',payload:{caption:'Pagi'}});const s=await req(c.port,'POST',`/ms/studio/packages/${p.body.package.id}/schedule`,{scheduledAt:'2026-10-22T09:00:00+07:00',platform:'instagram'});assert.equal(s.status,201);assert.equal(s.body.item.packageId,p.body.package.id)});
