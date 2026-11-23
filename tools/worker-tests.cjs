/* Lifecycle tests for the worker boundary; phone tests additionally run real loops. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function harness({constructError=false,postError=false}={}){
  const workers=[],timers=new Map();let sequence=0;
  class Worker{
    constructor(url){if(constructError)throw Error('constructor');this.url=url;this.terminated=0;workers.push(this);}
    postMessage(job){this.job=structuredClone(job);if(postError)throw Error('post');}
    terminate(){this.terminated++;}
  }
  const context=vm.createContext({Worker,setTimeout:(callback,ms)=>{const id=++sequence;timers.set(id,{callback,ms});return id;},clearTimeout:id=>timers.delete(id)});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../app/src/main/assets/reader/worker-jobs.js'),'utf8'),context);
  return {runner:context.WorkerJobs.createRunner(),workers,timers,expire(){for(const timer of [...timers.values()])timer.callback();}};
}
(async()=>{
  let checks=0;
  {
    const h=harness(),job={password:'test-only',kind:'hwp5'},p=h.runner.run('worker',job,1234),w=h.workers[0];
    assert.equal(job.password,'');assert.equal(w.job.password,'test-only');assert.equal([...h.timers.values()][0].ms,1234);
    w.onmessage({data:{ok:true,result:7}});assert.equal(await p,7);assert.equal(w.terminated,1);assert.equal(h.timers.size,0);h.runner.cancelAll();assert.equal(w.terminated,1);checks++;
  }
  {
    const h=harness(),p=h.runner.run('worker',{},10),w=h.workers[0],late=w.onmessage;
    const rejected=assert.rejects(p,{code:'WORKER_TIMEOUT'});h.expire();await rejected;
    late({data:{ok:true,result:'late'}});assert.equal(w.terminated,1);assert.equal(h.timers.size,0);checks++;
  }
  {
    const h=harness(),a=h.runner.run('worker',{}),b=h.runner.run('worker',{});
    const rejected=Promise.all([assert.rejects(a,{code:'CANCELLED'}),assert.rejects(b,{code:'CANCELLED'})]);
    h.runner.cancelAll();h.runner.cancelAll();await rejected;assert.ok(h.workers.every(w=>w.terminated===1));assert.equal(h.timers.size,0);checks++;
    const next=h.runner.run('worker',{});h.workers[2].onmessage({data:{ok:true,result:1}});assert.equal(await next,1);checks++;
  }
  for(const type of ['onerror','onmessageerror','invalid','wrong-password']){
    const h=harness(),p=h.runner.run('worker',{}),w=h.workers[0];
    const rejected=assert.rejects(p,{code:type==='wrong-password'?'WRONG_PASSWORD':'WORKER_ERROR'});
    if(type==='invalid')w.onmessage({data:null});
    else if(type==='wrong-password')w.onmessage({data:{ok:false,code:'WRONG_PASSWORD',message:'retry'}});
    else w[type]({preventDefault(){}});
    await rejected;assert.equal(w.terminated,1);assert.equal(h.timers.size,0);checks++;
  }
  for(const option of ['constructError','postError']){
    const h=harness({[option]:true});await assert.rejects(h.runner.run('worker',{}),{code:'WORKER_ERROR'});
    assert.equal(h.timers.size,0);if(h.workers.length)assert.equal(h.workers[0].terminated,1);checks++;
  }
  console.log(JSON.stringify({ok:true,checks}));
})().catch(e=>{console.error(e);process.exitCode=1;});
