// Debug APK only: exercise native watchdogs with a genuinely blocked renderer.
export function block(){while(true){/* deliberate fault injection */}}
export async function beforeParse(fault){
  if(fault==='main-hang')block();
  if(fault==='silent-wait')await new Promise(()=>{});
  if(fault==='crash-loading')await new Promise(resolve=>setTimeout(resolve,1500));
}
