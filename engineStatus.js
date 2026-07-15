window.KenteiEngineStatus=(()=>{
  const $=id=>document.getElementById(id);

  function render(){
    const box=$('seedEngineStatus');
    if(!box)return;
    const result=KenteiTemplateEngine.diagnostics();
    const seed=KenteiRandomEngine.createSeed();
    const sampleCode=KenteiProblemCode.create('CAL-DEMO',seed);
    box.className=`engine-status ${result.valid?'ok':'ng'}`;
    box.innerHTML=`
      <strong>${result.valid?'✅ シードエンジン正常':'❌ エンジンエラー'}</strong>
      <span>主要な計算分野をランダム生成し、SQLの基本・集計・更新処理にも対応しています。</span>
      <code>${sampleCode}</code>
    `;
  }

  function init(){
    $('regenerateSeedSampleButton')?.addEventListener('click',render);
    document.addEventListener('kentei:route',event=>{
      if(event.detail==='calculation')render();
    });
    render();
  }

  return{init,render};
})();
