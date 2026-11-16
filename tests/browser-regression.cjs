/** Serial execution is intentional: software WebGL processes must not compete. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=process.env.JP_TEST_URL||'http://localhost:8000';
const output=process.env.JP_TEST_OUTPUT||path.join(process.env.LOCALAPPDATA,'Temp','opencode','jp-four-rooms');
const cases=[
  ['monitor','no-preference'],['server','no-preference'],['server','reduce'],
  ['contact','no-preference'],['ascii','no-preference'],['chair','no-preference'],
  ['monitor-logo','no-preference'],['animation','no-preference'],
  ['lighting','no-preference'],['interaction-flash','reduce'],
  ['cables','no-preference'],
];
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.JP_BROWSER||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const results=[];
  try{
    for(const [name,reducedMotion] of cases){
      const context=await browser.newContext({viewport:{width:1100,height:850},reducedMotion});
      await context.route('https://api.web3forms.com/**',route=>route.abort());
      const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
      try{
        await page.goto(`${base}/tests/${name}.html`);
        await page.waitForFunction(()=>window.testResults!==undefined,null,{timeout:90000});
        const result=await page.evaluate(()=>window.testResults);
        console.log(name,reducedMotion,`passed=${result.passed} failed=${result.failed}`);
        results.push({name,reducedMotion,...result,errors});
        if(name==='cables'&&result.failed===0){
          fs.mkdirSync(output,{recursive:true});
          const scene=page.frames().find(f=>f!==page.mainFrame());
          await scene.evaluate(()=>window.setCableTestTime(1.8));
          await page.locator('iframe').screenshot({path:path.join(output,'cable-colors.png')});
          await scene.evaluate(()=>window.setCableTestTime(window.cableShowcaseTimes.reply));
          await page.locator('iframe').screenshot({path:path.join(output,'cable-return.png')});
          await scene.evaluate(()=>window.setCableTestTime(window.cableShowcaseTimes.room));
          await page.locator('iframe').screenshot({path:path.join(output,'cable-room-receipt.png')});
          await scene.evaluate(()=>window.setCableTestTime(window.cableShowcaseTimes.server));
          await page.locator('iframe').screenshot({path:path.join(output,'cable-server-receipt.png')});
        }
      }catch(error){results.push({name,reducedMotion,failed:1,error:String(error),errors})}
      finally{await context.close()}
    }
    assert.ok(results.every(r=>r.failed===0&&r.errors.length===0),JSON.stringify(results.filter(r=>r.failed||r.errors.length)));
    console.log(`Browser regression PASS: ${results.length} scenarios, ${results.reduce((s,r)=>s+r.passed,0)} assertions, zero real provider calls`);
  }catch(error){console.error(error);process.exitCode=1}
  finally{
    fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'regressions.json'),JSON.stringify(results,null,2));
    await browser.close();
  }
})();
