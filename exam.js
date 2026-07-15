
window.KenteiExam=(()=>{
  const SESSION_KEY='kentei_word_exam_v1';
  const RESULT_KEY='kentei_word_exam_last_result';
  const $=id=>document.getElementById(id);
  const Q=()=>window.WORD_QUESTIONS||[];
  const shuffle=a=>[...a].sort(()=>Math.random()-.5);
  const esc=s=>String(s).replace(/[&<>"']/g,m=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));

  let session=null;
  let current=null;
  let choices=[];
  let locked=false;
  let timerId=null;

  function save(){
    if(session)localStorage.setItem(SESSION_KEY,JSON.stringify(session));
  }

  function load(){
    try{
      const raw=localStorage.getItem(SESSION_KEY);
      return raw?JSON.parse(raw):null;
    }catch{
      return null;
    }
  }

  function clearSession(){
    localStorage.removeItem(SESSION_KEY);
    session=null;
    stopTimer();
  }

  function saveResult(result){
    localStorage.setItem(RESULT_KEY,JSON.stringify(result));
  }

  function getLastResult(){
    try{
      const raw=localStorage.getItem(RESULT_KEY);
      return raw?JSON.parse(raw):null;
    }catch{
      return null;
    }
  }

  function labelCategory(value){
    return value==='all'?'全分野':String(value).replace('系','');
  }

  function setupPool(category){
    return category==='all'?Q():Q().filter(q=>q.category===category);
  }

  function currentCount(){
    const value=document.querySelector('input[name="examCount"]:checked')?.value||'10';
    if(value==='custom'){
      return Math.max(1,Math.min(200,Number($('customExamCount')?.value)||1));
    }
    return Number(value);
  }

  function renderSetup(){
    const saved=load();
    const card=$('wordExamResumeCard');
    if(saved?.order?.length && saved.position<saved.order.length){
      card?.classList.remove('hidden');
      if($('wordExamResumeDetail')){
        $('wordExamResumeDetail').textContent=
          `${labelCategory(saved.category)}・${saved.order.length}問・${saved.position+1}問目から`;
      }
    }else{
      card?.classList.add('hidden');
    }
    if($('wordExamSetupStatus'))$('wordExamSetupStatus').textContent='';
  }

  function makeSession({count,category,scoring}){
    const pool=setupPool(category);
    const actual=Math.min(count,pool.length);
    return {
      category,
      scoring,
      count:actual,
      order:shuffle(pool.map(q=>q.id)).slice(0,actual),
      position:0,
      answers:[],
      correct:0,
      startedAt:Date.now(),
      elapsedBeforeResume:0
    };
  }

  function startNew(){
    const count=currentCount();
    const category=document.querySelector('input[name="examCategory"]:checked')?.value||'all';
    const scoring=document.querySelector('input[name="examScoring"]:checked')?.value||'instant';
    const pool=setupPool(category);

    if(!pool.length){
      if($('wordExamSetupStatus'))$('wordExamSetupStatus').textContent='対象の問題がありません。';
      return;
    }

    session=makeSession({count,category,scoring});
    save();
    KenteiRouter.show('wordExam');
    startTimer();
    showQuestion();
  }

  function resume(){
    session=load();
    if(!session)return;
    session.startedAt=Date.now();
    save();
    KenteiRouter.show('wordExam');
    startTimer();
    showQuestion();
  }

  function discard(){
    clearSession();
    renderSetup();
    if(typeof showToast==='function')showToast('前回の試験を削除しました');
  }

  function getCurrentQuestion(){
    return Q().find(q=>q.id===session?.order?.[session.position]);
  }

  function showQuestion(){
    if(!session?.order?.length){
      KenteiRouter.show('wordExamSetup');
      return;
    }

    if(session.position>=session.order.length){
      finish();
      return;
    }

    locked=false;
    current=getCurrentQuestion();

    if(!current){
      finish();
      return;
    }

    $('wordExamCategory').textContent=labelCategory(session.category);
    $('wordExamProgress').textContent=`${session.position+1} / ${session.order.length}`;
    $('wordExamQuestion').textContent=current.meaning;
    $('wordExamAnswerResult').className='answer-result hidden';
    $('wordExamAnswerResult').innerHTML='';
    $('wordExamNextButton').classList.add('hidden');
    $('wordExamNextButton').textContent=
      session.position===session.order.length-1?'結果を見る':'次の問題へ';

    choices=window.KenteiWordChoice
      ?KenteiWordChoice.choices(current,4)
      :shuffle([current,...shuffle(Q().filter(q=>q.category===current.category&&q.id!==current.id&&q.word!==current.word)).slice(0,3)]);
    $('wordExamChoiceArea').innerHTML='';

    choices.forEach(item=>{
      const button=document.createElement('button');
      button.className='quiz-choice';
      button.textContent=item.word;
      button.addEventListener('click',()=>answer(item,button));
      $('wordExamChoiceArea').appendChild(button);
    });

    updateStats();
    save();
  }

  function answer(item,button){
    if(locked||!session||!current)return;
    locked=true;

    const ok=item.id===current.id;
    session.answers.push({
      questionId:current.id,
      selectedId:item.id,
      correct:ok
    });
    if(ok)session.correct++;

    KenteiWord.record(current,ok);
    save();
    updateStats();

    const isLast=session.answers.length>=session.order.length;

    if(session.scoring==='instant'){
      document.querySelectorAll('#wordExamChoiceArea .quiz-choice').forEach(b=>{
        b.disabled=true;
        if(b.textContent===current.word)b.classList.add('correct');
      });
      if(!ok)button.classList.add('wrong');

      const explanation=choices.map(c=>`
        <div class="explanation-item ${c.id===current.id?'correct':''} ${!ok&&c.id===item.id?'selected':''}">
          <div class="explanation-word">${esc(c.word)} ${c.id===current.id?'⭕':''}</div>
          <div class="explanation-meaning">${esc(c.meaning)}</div>
        </div>
      `).join('');

      $('wordExamAnswerResult').className='answer-result '+(ok?'ok':'ng');
      $('wordExamAnswerResult').innerHTML=`
        <div class="answer-title">${ok?'⭕ 正解！':'❌ 不正解'}</div>
        ${ok?'':`正解：<b>${esc(current.word)}</b>`}
        <div class="explanation-list">${explanation}</div>
      `;
      $('wordExamNextButton').textContent=isLast?'結果を見る':'次の問題へ';
      $('wordExamNextButton').classList.remove('hidden');
      return;
    }

    // まとめて採点は、回答直後に次へ進む。最後の回答なら結果へ。
    if(isLast){
      finish();
    }else{
      session.position++;
      save();
      showQuestion();
    }
  }

  function next(){
    if(!session)return;

    if(session.answers.length>=session.order.length){
      finish();
      return;
    }

    session.position++;
    if(session.position>=session.order.length){
      finish();
      return;
    }

    save();
    showQuestion();
  }

  function elapsedMilliseconds(){
    if(!session)return 0;
    const currentRun=session.startedAt?Date.now()-session.startedAt:0;
    return Math.max(0,(session.elapsedBeforeResume||0)+currentRun);
  }

  function formatDuration(ms){
    const totalSeconds=Math.floor(ms/1000);
    const minutes=Math.floor(totalSeconds/60);
    const seconds=totalSeconds%60;
    return `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
  }

  function startTimer(){
    stopTimer();
    updateTimer();
    timerId=window.setInterval(updateTimer,1000);
  }

  function stopTimer(){
    if(timerId){
      window.clearInterval(timerId);
      timerId=null;
    }
  }

  function updateTimer(){
    if($('wordExamElapsed')){
      $('wordExamElapsed').textContent=formatDuration(elapsedMilliseconds());
    }
  }

  function updateStats(){
    if(!session)return;
    const answered=session.answers.length;
    const remaining=Math.max(0,session.order.length-answered);
    $('wordExamAnswered').textContent=answered;
    $('wordExamRemaining').textContent=remaining;
    $('wordExamCurrentRate').textContent=
      answered?((session.correct/answered)*100).toFixed(1)+'%':'0%';
    updateTimer();
  }

  function exit(){
    if(!session){
      KenteiRouter.show('exam');
      return;
    }

    session.elapsedBeforeResume=elapsedMilliseconds();
    session.startedAt=0;
    save();
    stopTimer();
    KenteiRouter.show('wordExamSetup');

    if(typeof showToast==='function')showToast('試験を保存しました');
  }

  function finish(){
    if(!session)return;

    const totalElapsed=elapsedMilliseconds();
    const completed={
      ...session,
      position:session.order.length,
      elapsedMs:totalElapsed,
      finishedAt:Date.now(),
      settings:{
        count:session.order.length,
        category:session.category,
        scoring:session.scoring
      }
    };

    saveResult(completed);
    clearSession();
    KenteiRouter.show('wordExamResult');
    showResult(completed);
  }

  function rankFor(rate){
    if(rate>=95)return 'S';
    if(rate>=90)return 'A';
    if(rate>=80)return 'B';
    if(rate>=70)return 'C';
    if(rate>=60)return 'D';
    return 'E';
  }

  function showResult(result){
    if(!result)return;

    const total=result.order?.length||0;
    const correct=Number(result.correct)||0;
    const wrong=Math.max(0,total-correct);
    const rate=total?(correct/total)*100:0;
    const score=Math.round(rate);
    const rank=rankFor(rate);

    $('wordExamScore').textContent=`${score}点`;
    $('wordExamRank').textContent=`ランク ${rank}`;
    $('wordExamSummary').textContent=`${total}問中 ${correct}問正解`;
    $('wordExamResultTime').textContent=`経過時間 ${formatDuration(result.elapsedMs||0)}`;
    $('wordExamCorrectCount').textContent=correct;
    $('wordExamWrongCount').textContent=wrong;
    $('wordExamRate').textContent=rate.toFixed(1)+'%';

    const wrongAnswers=(result.answers||[]).filter(a=>!a.correct);
    const list=$('wordExamWrongList');

    if(!wrongAnswers.length){
      list.innerHTML='<div class="empty-card">全問正解です！</div>';
      $('reviewWordExamButton').classList.add('hidden');
    }else{
      $('reviewWordExamButton').classList.remove('hidden');
      list.innerHTML=wrongAnswers.map(a=>{
        const q=Q().find(x=>x.id===a.questionId);
        const selected=Q().find(x=>x.id===a.selectedId);
        return q?`
          <div class="exam-wrong-item">
            <strong>${esc(q.word)}</strong>
            <span>${esc(q.meaning)}</span>
            <small>選んだ答え：${selected?esc(selected.word):'不明'}</small>
          </div>
        `:'';
      }).join('');
    }
  }

  function reviewWrong(){
    const result=getLastResult();
    if(!result)return;
    const ids=(result.answers||[]).filter(a=>!a.correct).map(a=>a.questionId);
    if(!ids.length)return;
    KenteiQuiz.start('all',{order:ids,position:0});
  }

  function retrySame(){
    const result=getLastResult();
    const settings=result?.settings;
    if(!settings)return;

    session=makeSession({
      count:settings.count,
      category:settings.category,
      scoring:settings.scoring
    });
    save();
    KenteiRouter.show('wordExam');
    startTimer();
    showQuestion();
  }

  function backToExamPage(){
    stopTimer();
    KenteiRouter.show('exam');
  }

  function init(){
    $('openWordExamButton')?.addEventListener('click',()=>KenteiRouter.show('wordExamSetup'));
    $('startWordExamButton')?.addEventListener('click',startNew);
    $('resumeWordExamButton')?.addEventListener('click',resume);
    $('discardWordExamButton')?.addEventListener('click',discard);
    $('wordExamNextButton')?.addEventListener('click',next);
    $('wordExamExitButton')?.addEventListener('click',exit);
    $('reviewWordExamButton')?.addEventListener('click',reviewWrong);
    $('retryWordExamButton')?.addEventListener('click',retrySame);
    $('backToExamPageButton')?.addEventListener('click',backToExamPage);

    document.querySelectorAll('input[name="examCount"]').forEach(input=>{
      input.addEventListener('change',()=>{
        const customSelected=
          document.querySelector('input[name="examCount"]:checked')?.value==='custom';
        $('customExamCount')?.classList.toggle('hidden',!customSelected);
      });
    });

    document.addEventListener('kentei:route',event=>{
      if(event.detail==='wordExamSetup')renderSetup();
      if(event.detail==='wordExamResult')showResult(getLastResult());
      if(event.detail!=='wordExam')stopTimer();
    });
  }

  return{
    init,
    startNew,
    resume,
    discard,
    retrySame,
    showResult
  };
})();
