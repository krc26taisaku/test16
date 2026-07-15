
window.KenteiComprehensiveExam=(()=>{
  const SESSION_KEY='kentei_comprehensive_exam_v1';
  const RESULT_KEY='kentei_comprehensive_exam_last_result';
  const $=id=>document.getElementById(id);
  const W=()=>window.WORD_QUESTIONS||[];
  const C=()=>window.CALCULATION_QUESTIONS||[];
  const shuffle=a=>[...a].sort(()=>Math.random()-.5);
  const esc=s=>String(s).replace(/[&<>"']/g,m=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));

  let session=null,current=null,locked=false,timerId=null;

  const save=()=>session&&localStorage.setItem(SESSION_KEY,JSON.stringify(session));
  function load(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{return null}}
  function clearSession(){localStorage.removeItem(SESSION_KEY);session=null;stopTimer()}
  const saveResult=r=>localStorage.setItem(RESULT_KEY,JSON.stringify(r));
  function lastResult(){try{return JSON.parse(localStorage.getItem(RESULT_KEY)||'null')}catch{return null}}

  function countValue(){
    const v=document.querySelector('input[name="comprehensiveCount"]:checked')?.value||'10';
    if(v==='custom')return Math.max(1,Math.min(200,Number($('customComprehensiveCount').value)||1));
    return Number(v);
  }

  function wordPool(category){
    return category==='all'?W():W().filter(q=>q.category===category);
  }

  function calcPool(category){
    return category==='all'?C():C().filter(q=>q.category===category);
  }

  function buildItems({count,ratio,category}){
    const [wp,cp]=ratio.split(':').map(Number);
    let wordCount=Math.round(count*(wp/100));
    let calcCount=count-wordCount;
    const words=shuffle(wordPool(category));
    const calcs=shuffle(calcPool(category));

    wordCount=Math.min(wordCount,words.length);
    calcCount=Math.min(calcCount,calcs.length);

    let shortage=count-wordCount-calcCount;
    if(shortage>0){
      const addWords=Math.min(shortage,words.length-wordCount);
      wordCount+=addWords; shortage-=addWords;
    }
    if(shortage>0){
      const addCalcs=Math.min(shortage,calcs.length-calcCount);
      calcCount+=addCalcs;
    }

    return shuffle([
      ...words.slice(0,wordCount).map(q=>({type:'word',id:q.id})),
      ...calcs.slice(0,calcCount).map(q=>({type:'calc',id:q.id}))
    ]);
  }

  function makeSession(settings,items=None){
    const built=items||buildItems(settings);
    return{
      settings:{...settings,count:built.length},
      items:built,
      position:0,answers:[],correct:0,memos:{},
      startedAt:Date.now(),elapsedBeforeResume:0
    };
  }

  function renderSetup(){
    const s=load(),card=$('comprehensiveExamResumeCard');
    if(s?.items?.length&&s.position<s.items.length){
      card.classList.remove('hidden');
      $('comprehensiveExamResumeDetail').textContent=
        `${s.items.length}問・${s.settings.ratio}・${s.position+1}問目から`;
    }else card.classList.add('hidden');
    $('comprehensiveExamSetupStatus').textContent='';
  }

  function startNew(){
    const settings={
      count:countValue(),
      ratio:document.querySelector('input[name="comprehensiveRatio"]:checked')?.value||'50:50',
      category:document.querySelector('input[name="comprehensiveCategory"]:checked')?.value||'all',
      scoring:document.querySelector('input[name="comprehensiveScoring"]:checked')?.value||'instant'
    };
    const items=buildItems(settings);
    if(!items.length){
      $('comprehensiveExamSetupStatus').textContent='対象の問題がありません。';
      return;
    }
    session=makeSession(settings,items);save();
    KenteiRouter.show('comprehensiveExam');startTimer();showQuestion();
  }

  function resume(){
    session=load();if(!session)return;
    session.startedAt=Date.now();save();
    KenteiRouter.show('comprehensiveExam');startTimer();showQuestion();
  }

  function discard(){
    clearSession();renderSetup();
    if(typeof showToast==='function')showToast('前回の総合試験を削除しました');
  }

  function itemQuestion(item){
    return item.type==='word'
      ?W().find(q=>q.id===item.id)
      :C().find(q=>q.id===item.id);
  }

  function saveMemo(){
    if(session&&current?.type==='calc'){
      session.memos[current.id]=$('comprehensiveExamMemo').value;save();
    }
  }

  function showQuestion(){
    if(!session?.items?.length||session.position>=session.items.length){finish();return}
    locked=false;
    const item=session.items[session.position];
    const q=itemQuestion(item);
    if(!q){finish();return}
    current={...item,q};

    $('comprehensiveExamType').textContent=item.type==='word'?'📖 単語':'🧮 計算';
    $('comprehensiveExamProgress').textContent=`${session.position+1} / ${session.items.length}`;
    $('comprehensiveExamQuestionId').textContent=item.type==='word'?q.id:q.id;
    const seedInfo=$('comprehensiveExamQuestionSeed');
    if(item.type==='calc'&&q.seed){
      seedInfo.textContent=`Seed: ${q.seed}`;
      seedInfo.classList.remove('hidden');
    }else{
      seedInfo.textContent='';
      seedInfo.classList.add('hidden');
    }
    $('comprehensiveExamQuestion').textContent=item.type==='word'?q.meaning:q.question;
    $('comprehensiveExamAnswerResult').className='answer-result hidden';
    $('comprehensiveExamAnswerResult').innerHTML='';
    $('comprehensiveExamNextButton').classList.add('hidden');
    $('comprehensiveExamNextButton').textContent=
      session.position===session.items.length-1?'結果を見る':'次の問題へ';

    const memoArea=$('comprehensiveCalcMemoArea');
    memoArea.classList.toggle('hidden',item.type!=='calc');
    if(item.type==='calc')$('comprehensiveExamMemo').value=session.memos?.[q.id]||'';

    let choices;
    if(item.type==='word'){
      const wordChoices=window.KenteiWordChoice
        ?KenteiWordChoice.choices(q,4)
        :shuffle([q,...shuffle(W().filter(x=>x.category===q.category&&x.id!==q.id&&x.word!==q.word)).slice(0,3)]);
      choices=wordChoices.map(x=>({label:x.word,id:x.id}));
    }else{
      choices=shuffle(q.choices).map(x=>({label:x.label}));
    }

    $('comprehensiveExamChoiceArea').innerHTML='';
    choices.forEach(choice=>{
      const b=document.createElement('button');
      b.className='quiz-choice';b.textContent=choice.label;
      b.addEventListener('click',()=>answer(choice,b));
      $('comprehensiveExamChoiceArea').appendChild(b);
    });
    updateStats();save();
  }

  function answer(choice,button){
    if(locked||!current)return;
    locked=true;saveMemo();
    const q=current.q;
    const correctLabel=current.type==='word'?q.word:q.answerLabel;
    const ok=choice.label===correctLabel;

    session.answers.push({
      type:current.type,id:current.id,
      selectedLabel:choice.label,correct:ok
    });
    if(ok)session.correct++;
    if(current.type==='word')KenteiWord.record(q,ok);
    session.position=session.answers.length-1;
    save();updateStats();

    const last=session.answers.length>=session.items.length;
    if(session.settings.scoring==='instant'){
      document.querySelectorAll('#comprehensiveExamChoiceArea .quiz-choice').forEach(b=>{
        b.disabled=true;if(b.textContent===correctLabel)b.classList.add('correct');
      });
      if(!ok)button.classList.add('wrong');

      let details='';
      if(current.type==='word'){
        details=`<div class="calc-explanation-block">
          <div class="calc-explanation-label">正しい意味</div>
          <p>${esc(q.meaning)}</p>
        </div>`;
      }else{
        details=`<div class="calc-explanation-block">
          <div class="calc-explanation-label">公式</div>
          <div class="calc-formula">${esc(q.formula)}</div>
          <div class="calc-explanation-label">途中式</div>
          <ol class="calc-steps">${q.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol>
          <div class="calc-explanation-label">解説</div><p>${esc(q.explanation)}</p>
        </div>`;
      }

      $('comprehensiveExamAnswerResult').className='answer-result '+(ok?'ok':'ng');
      $('comprehensiveExamAnswerResult').innerHTML=
        `<div class="answer-title">${ok?'⭕ 正解！':'❌ 不正解'}</div>
         ${ok?'':`正解：<b>${esc(correctLabel)}</b>`}${details}`;
      $('comprehensiveExamNextButton').textContent=last?'結果を見る':'次の問題へ';
      $('comprehensiveExamNextButton').classList.remove('hidden');
    }else{
      if(last)finish();
      else{session.position++;save();showQuestion()}
    }
  }

  function next(){
    if(!session)return;saveMemo();
    if(session.answers.length>=session.items.length){finish();return}
    session.position++;
    if(session.position>=session.items.length){finish();return}
    save();showQuestion();
  }

  function elapsed(){
    if(!session)return 0;
    return (session.elapsedBeforeResume||0)+(session.startedAt?Date.now()-session.startedAt:0);
  }
  function fmt(ms){
    const s=Math.floor(ms/1000),m=Math.floor(s/60);
    return `${String(m).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  }
  function startTimer(){stopTimer();updateTimer();timerId=setInterval(updateTimer,1000)}
  function stopTimer(){if(timerId){clearInterval(timerId);timerId=null}}
  function updateTimer(){if($('comprehensiveExamElapsed'))$('comprehensiveExamElapsed').textContent=fmt(elapsed())}
  function updateStats(){
    const a=session.answers.length;
    $('comprehensiveExamAnswered').textContent=a;
    $('comprehensiveExamRemaining').textContent=Math.max(0,session.items.length-a);
    $('comprehensiveExamCurrentRate').textContent=a?((session.correct/a)*100).toFixed(1)+'%':'0%';
    updateTimer();
  }

  function exit(){
    if(!session){KenteiRouter.show('exam');return}
    saveMemo();session.elapsedBeforeResume=elapsed();session.startedAt=0;save();stopTimer();
    KenteiRouter.show('comprehensiveExamSetup');
    if(typeof showToast==='function')showToast('総合試験を保存しました');
  }

  function finish(){
    if(!session)return;saveMemo();
    const result={...session,position:session.items.length,elapsedMs:elapsed(),finishedAt:Date.now()};
    saveResult(result);clearSession();
    KenteiRouter.show('comprehensiveExamResult');showResult(result);
  }

  function rank(rate){
    if(rate>=95)return'S';if(rate>=90)return'A';if(rate>=80)return'B';
    if(rate>=70)return'C';if(rate>=60)return'D';return'E';
  }
  function rate(c,t){return t?(c/t)*100:0}

  function showResult(r){
    if(!r)return;
    const total=r.items.length,correct=r.correct||0,overall=rate(correct,total);
    const wa=r.answers.filter(a=>a.type==='word'),ca=r.answers.filter(a=>a.type==='calc');
    const wc=wa.filter(a=>a.correct).length,cc=ca.filter(a=>a.correct).length;

    $('comprehensiveExamScore').textContent=`${Math.round(overall)}点`;
    $('comprehensiveExamRank').textContent=`ランク ${rank(overall)}`;
    $('comprehensiveExamSummary').textContent=`${total}問中 ${correct}問正解`;
    $('comprehensiveExamResultTime').textContent=`経過時間 ${fmt(r.elapsedMs||0)}`;
    $('comprehensiveExamCorrectCount').textContent=correct;
    $('comprehensiveExamWrongCount').textContent=total-correct;
    $('comprehensiveExamRate').textContent=overall.toFixed(1)+'%';
    $('comprehensiveWordRate').textContent=wa.length?rate(wc,wa.length).toFixed(1)+'%':'—';
    $('comprehensiveCalcRate').textContent=ca.length?rate(cc,ca.length).toFixed(1)+'%':'—';

    const wrong=r.answers.filter(a=>!a.correct),list=$('comprehensiveExamWrongList');
    if(!wrong.length){
      list.innerHTML='<div class="empty-card">全問正解です！</div>';
      $('reviewComprehensiveExamButton').classList.add('hidden');
    }else{
      $('reviewComprehensiveExamButton').classList.remove('hidden');
      list.innerHTML=wrong.map(a=>{
        const q=a.type==='word'?W().find(x=>x.id===a.id):C().find(x=>x.id===a.id);
        if(!q)return'';
        const correctLabel=a.type==='word'?q.word:q.answerLabel;
        const text=a.type==='word'?q.meaning:q.question;
        return `<div class="exam-wrong-item">
          <strong>${a.type==='word'?'📖':'🧮'} ${esc(q.id)}</strong>
          <span>${esc(text)}</span>
          <small>選んだ答え：${esc(a.selectedLabel)} / 正解：${esc(correctLabel)}</small>
        </div>`;
      }).join('');
    }
  }

  function retry(){
    const r=lastResult();if(!r)return;
    session=makeSession(r.settings);save();
    KenteiRouter.show('comprehensiveExam');startTimer();showQuestion();
  }

  function review(){
    const r=lastResult();if(!r)return;
    const items=r.answers.filter(a=>!a.correct).map(a=>({type:a.type,id:a.id}));
    if(!items.length)return;
    session=makeSession({...r.settings,count:items.length,scoring:'instant'},items);
    save();KenteiRouter.show('comprehensiveExam');startTimer();showQuestion();
  }

  function init(){
    $('openComprehensiveExamButton')?.addEventListener('click',()=>KenteiRouter.show('comprehensiveExamSetup'));
    $('startComprehensiveExamButton')?.addEventListener('click',startNew);
    $('resumeComprehensiveExamButton')?.addEventListener('click',resume);
    $('discardComprehensiveExamButton')?.addEventListener('click',discard);
    $('comprehensiveExamNextButton')?.addEventListener('click',next);
    $('comprehensiveExamExitButton')?.addEventListener('click',exit);
    $('retryComprehensiveExamButton')?.addEventListener('click',retry);
    $('reviewComprehensiveExamButton')?.addEventListener('click',review);
    $('backToExamFromComprehensiveButton')?.addEventListener('click',()=>KenteiRouter.show('exam'));
    $('comprehensiveExamMemo')?.addEventListener('input',saveMemo);

    document.querySelectorAll('input[name="comprehensiveCount"]').forEach(i=>i.addEventListener('change',()=>{
      const custom=document.querySelector('input[name="comprehensiveCount"]:checked')?.value==='custom';
      $('customComprehensiveCount').classList.toggle('hidden',!custom);
    }));

    document.addEventListener('kentei:route',e=>{
      if(e.detail==='comprehensiveExamSetup')renderSetup();
      if(e.detail==='comprehensiveExamResult')showResult(lastResult());
      if(e.detail!=='comprehensiveExam')stopTimer();
    });
  }

  return{init,startNew,resume,retry,review};
})();
