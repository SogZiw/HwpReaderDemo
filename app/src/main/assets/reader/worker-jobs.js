/* Bounded, disposable workers. A completed/cancelled job can never settle twice. */
(function(global){
  'use strict';
  const failure=(code,message)=>Object.assign(new Error(message),{code});
  function createRunner(){
    const active=new Set();
    function run(url,job,timeoutMs=45000){
      return new Promise((resolve,reject)=>{
        let worker,timer,settled=false;
        function finish(error,result){
          if(settled)return;
          settled=true;clearTimeout(timer);active.delete(cancel);
          if(worker){worker.onmessage=worker.onerror=worker.onmessageerror=null;worker.terminate();}
          error?reject(error):resolve(result);
        }
        function cancel(){finish(failure('CANCELLED','文档处理已取消。'));}
        active.add(cancel);
        try{
          worker=new Worker(url);
          timer=setTimeout(()=>finish(failure('WORKER_TIMEOUT','解密或格式转换超时，已停止。请重试或选择其他文件。')),timeoutMs);
          worker.onmessage=e=>{
            const data=e.data;
            if(!data||typeof data.ok!=='boolean'){finish(failure('WORKER_ERROR','文档处理模块返回了无效数据。'));return;}
            data.ok?finish(null,data.result):finish(failure(data.code||'WORKER_ERROR',data.message||'文档处理失败。'));
          };
          worker.onerror=e=>{e.preventDefault();finish(failure('WORKER_ERROR','文档处理模块无法运行，请重试。'));};
          worker.onmessageerror=()=>finish(failure('WORKER_ERROR','无法读取文档处理结果，请重试。'));
          worker.postMessage(job);
        }catch(_){finish(failure('WORKER_ERROR','无法启动文档处理模块，请重试。'));}
        finally{if(job&&Object.prototype.hasOwnProperty.call(job,'password'))job.password='';}
      });
    }
    function cancelAll(){for(const cancel of [...active])cancel();}
    return {run,cancelAll};
  }
  global.WorkerJobs={createRunner};
})(globalThis);
