
window.KenteiCalculation=(()=>{
  const STATE_KEY='kentei_calc_state_v1';
  const $=id=>document.getElementById(id);
  const Q=()=>window.CALCULATION_QUESTIONS||[];
  const shuffle=a=>[...a].sort(()=>Math.random()-.5);
  const esc=s=>String(s).replace(/[&<>"']/g,m=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));

  let state=null;
  let order=[];
  let pos=0;
  let mode='all';
  let current=null;
  let answered=false;
  let session={total:0,correct:0};

  function base(){
    return{
      total:0,correct:0,wrongIds:[],favorites:[],
      perQuestion:{},notes:{},lastSession:null
    };
  }

  function load(){
    try{
      state=Object.assign(base(),JSON.parse(localStorage.getItem(STATE_KEY)||'{}'));
      state.wrongIds=Array.isArray(state.wrongIds)?state.wrongIds:[];
      state.favorites=Array.isArray(state.favorites)?state.favorites:[];
      state.perQuestion=state.perQuestion||{};
      state.notes=state.notes||{};
    }catch{
      state=base();
    }
  }

  function save(){
    localStorage.setItem(STATE_KEY,JSON.stringify(state));
  }

  function pct(c,t){
    return t?((c/t)*100).toFixed(1)+'%':'0%';
  }

  function pool(nextMode){
    if(nextMode==='all')return Q();
    if(nextMode==='wrong')return Q().filter(q=>state.wrongIds.includes(q.id));
    if(nextMode==='favorite')return Q().filter(q=>state.favorites.includes(q.id));
    return Q().filter(q=>q.topic===nextMode);
  }

  function renderHome(){
    if(!$('calcAllRate'))return;
    $('calcAllRate').textContent=pct(state.correct,state.total);
    $('calcWrongCount').textContent=`${state.wrongIds.length}問`;
    $('calcFavoriteCount').textContent=`${state.favorites.length}問`;

    document.querySelectorAll('[data-calc-topic]').forEach(button=>{
      const topic=button.dataset.calcTopic;
      const ids=Q().filter(q=>q.topic===topic).map(q=>q.id);
      const stats=ids.reduce((acc,id)=>{
        const s=state.perQuestion[id];
        if(s){acc.total+=s.total||0;acc.correct+=s.correct||0}
        return acc;
      },{total:0,correct:0});
      const rate=button.querySelector('strong');
      if(rate)rate.textContent=pct(stats.correct,stats.total);
    });

    const card=$('calcResumeCard');
    if(state.lastSession?.order?.length&&state.lastSession.position<state.lastSession.order.length){
      card.classList.remove('hidden');
      $('calcResumeDetail').textContent=
        `${state.lastSession.label}・${state.lastSession.position+1}/${state.lastSession.order.length}問目から`;
    }else{
      card.classList.add('hidden');
    }

    const validation=window.CALCULATION_VALIDATION;
    if($('calcValidationText')){
      $('calcValidationText').textContent=
        validation?.valid?`${validation.total}問すべて整合性確認済み`:'問題データを確認してください';
    }
  }

  function labelFor(nextMode){
    if(nextMode==='all')return'全計算問題';
    if(nextMode==='wrong')return'間違えた計算問題';
    if(nextMode==='favorite')return'お気に入り計算問題';
    return nextMode;
  }

  function start(nextMode,options={}){
    const p=pool(nextMode);
    if(!p.length){
      alert('対象の計算問題がありません');
      return;
    }
    mode=nextMode;
    order=options.order||shuffle(p.map(q=>q.id));
    pos=options.position||0;
    session={total:0,correct:0};
    KenteiRouter.show('calcQuiz');
    show();
    persist();
  }

  function resume(){
    const s=state.lastSession;
    if(!s)return;
    start(s.mode,{order:s.order,position:s.position});
  }

  function persist(){
    state.lastSession={
      mode,
      label:labelFor(mode),
      order,
      position:pos
    };
    save();
    renderHome();
  }

  function show(){
    answered=false;
    current=Q().find(q=>q.id===order[pos]);
    if(!current){
      finish();
      return;
    }

    $('calcQuizTopic').textContent=current.topic;
    $('calcQuizProgress').textContent=`${pos+1} / ${order.length}`;
    $('calcQuestionId').textContent=current.id;
    const seedInfo=$('calcQuestionSeed');
    if(current.seed){
      seedInfo.textContent=`Seed: ${current.seed}`;
      seedInfo.classList.remove('hidden');
    }else{
      seedInfo.textContent='';
      seedInfo.classList.add('hidden');
    }
    $('calcQuestion').textContent=current.question;
    $('calcMemo').value=state.notes[current.id]||'';
    $('calcMemoStatus').textContent='';
    $('calcAnswerResult').className='answer-result hidden';
    $('calcAnswerResult').innerHTML='';
    $('calcNextButton').classList.add('hidden');
    $('calcFavoriteButton').textContent=state.favorites.includes(current.id)?'★':'☆';

    const choices=shuffle(current.choices);
    $('calcChoiceArea').innerHTML='';
    choices.forEach(choice=>{
      const button=document.createElement('button');
      button.className='quiz-choice';
      button.textContent=choice.label;
      button.addEventListener('click',()=>answer(choice,button));
      $('calcChoiceArea').appendChild(button);
    });

    updateSession();
    persist();
  }

  function record(ok){
    state.total++;
    if(ok)state.correct++;

    const pq=state.perQuestion[current.id]||{total:0,correct:0,wrong:0};
    pq.total++;
    if(ok){
      pq.correct++;
      state.wrongIds=state.wrongIds.filter(id=>id!==current.id);
    }else{
      pq.wrong++;
      if(!state.wrongIds.includes(current.id))state.wrongIds.push(current.id);
    }
    state.perQuestion[current.id]=pq;
    save();
  }

  function answer(choice,button){
    if(answered)return;
    answered=true;

    const ok=choice.label===current.answerLabel;
    session.total++;
    if(ok)session.correct++;
    record(ok);

    document.querySelectorAll('#calcChoiceArea .quiz-choice').forEach(b=>{
      b.disabled=true;
      if(b.textContent===current.answerLabel)b.classList.add('correct');
    });
    if(!ok)button.classList.add('wrong');

    const steps=current.steps.map(step=>`<li>${esc(step)}</li>`).join('');
    $('calcAnswerResult').className='answer-result '+(ok?'ok':'ng');
    $('calcAnswerResult').innerHTML=`
      <div class="answer-title">${ok?'⭕ 正解！':'❌ 不正解'}</div>
      ${ok?'':`正解：<b>${esc(current.answerLabel)}</b>`}
      <div class="calc-explanation-block">
        <div class="calc-explanation-label">使用する公式</div>
        <div class="calc-formula">${esc(current.formula)}</div>
        <div class="calc-explanation-label">途中式</div>
        <ol class="calc-steps">${steps}</ol>
        <div class="calc-explanation-label">解説</div>
        <p>${esc(current.explanation)}</p>
      </div>
    `;

    $('calcNextButton').textContent=
      pos===order.length-1?'計算ホームへ戻る':'次の問題へ';
    $('calcNextButton').classList.remove('hidden');
    updateSession();
    renderHome();
  }

  function next(){
    pos++;
    if(pos>=order.length){
      finish();
      return;
    }
    show();
  }

  function finish(){
    state.lastSession=null;
    save();
    $('calcChoiceArea').innerHTML='';
    $('calcQuestionId').textContent='';
    $('calcQuestion').textContent='この計算モードの問題をすべて解き終わりました！';
    $('calcAnswerResult').className='answer-result ok';
    $('calcAnswerResult').innerHTML=
      `正解 ${session.correct}/${session.total}<br>正答率 ${pct(session.correct,session.total)}`;
    $('calcNextButton').textContent='計算ホームへ戻る';
    $('calcNextButton').classList.remove('hidden');
    $('calcNextButton').onclick=()=>{
      resetNext();
      KenteiRouter.show('calculation');
    };
  }

  function resetNext(){
    $('calcNextButton').onclick=next;
  }

  function saveMemo(){
    if(!current)return;
    state.notes[current.id]=$('calcMemo').value;
    save();
    $('calcMemoStatus').textContent='途中式メモを保存しました';
  }

  function toggleFavorite(){
    if(!current)return;
    if(state.favorites.includes(current.id)){
      state.favorites=state.favorites.filter(id=>id!==current.id);
    }else{
      state.favorites.push(current.id);
    }
    save();
    $('calcFavoriteButton').textContent=state.favorites.includes(current.id)?'★':'☆';
    renderHome();
  }

  function updateSession(){
    $('calcSessionAnswered').textContent=session.total;
    $('calcSessionCorrect').textContent=session.correct;
    $('calcSessionRate').textContent=pct(session.correct,session.total);
  }

  function init(){
    load();
    resetNext();

    $('calcStartAllButton')?.addEventListener('click',()=>start('all'));
    document.querySelectorAll('[data-calc-topic]').forEach(button=>{
      button.addEventListener('click',()=>start(button.dataset.calcTopic));
    });
    $('calcStartWrongButton')?.addEventListener('click',()=>start('wrong'));
    $('calcStartFavoriteButton')?.addEventListener('click',()=>start('favorite'));
    $('calcResumeButton')?.addEventListener('click',resume);
    $('calcRestartButton')?.addEventListener('click',()=>{
      if(state.lastSession&&confirm('前回の計算モードを最初から始めますか？')){
        start(state.lastSession.mode);
      }
    });
    $('calcQuizBackButton')?.addEventListener('click',()=>KenteiRouter.show('calculation'));
    $('calcSaveMemoButton')?.addEventListener('click',saveMemo);
    $('calcFavoriteButton')?.addEventListener('click',toggleFavorite);

    document.addEventListener('kentei:route',event=>{
      if(event.detail==='calculation')renderHome();
    });

    renderHome();
  }

  return{init,start,resume,renderHome};
})();
