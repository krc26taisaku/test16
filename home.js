
window.KenteiHome=(()=>{
  const $=id=>document.getElementById(id);
  const Q=()=>window.WORD_QUESTIONS||[];
  let recommendedIds=[];

  function localDateKey(date=new Date()){
    const y=date.getFullYear();
    const m=String(date.getMonth()+1).padStart(2,'0');
    const d=String(date.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }

  function pct(c,t){return t?((c/t)*100).toFixed(1)+'%':'0%'}

  function seededValue(text){
    let value=2166136261;
    for(let i=0;i<text.length;i++){
      value^=text.charCodeAt(i);
      value=Math.imul(value,16777619);
    }
    return value>>>0;
  }

  function chooseRecommended(){
    const state=KenteiWord.getState();
    const today=localDateKey();
    const todayWrong=(state.daily[today]?.wrongIds||[]);
    const picked=[];
    const add=id=>{if(id&&!picked.includes(id)&&Q().some(q=>q.id===id))picked.push(id)};

    todayWrong.forEach(add);
    (state.wrongIds||[]).forEach(add);

    Q()
      .filter(q=>state.perQuestion[q.id]?.total)
      .sort((a,b)=>{
        const sa=state.perQuestion[a.id],sb=state.perQuestion[b.id];
        const ra=sa.correct/sa.total,rb=sb.correct/sb.total;
        return ra-rb || (sb.wrong||0)-(sa.wrong||0) || (sa.lastAnsweredAt||0)-(sb.lastAnsweredAt||0);
      })
      .forEach(q=>add(q.id));

    const unanswered=Q()
      .filter(q=>!state.perQuestion[q.id]?.total)
      .sort((a,b)=>seededValue(today+a.id)-seededValue(today+b.id));
    unanswered.forEach(q=>add(q.id));

    Q()
      .slice()
      .sort((a,b)=>seededValue(today+'all'+a.id)-seededValue(today+'all'+b.id))
      .forEach(q=>add(q.id));

    return picked.slice(0,5);
  }

  function calculateStreak(){
    const daily=KenteiWord.getState().daily||{};
    let cursor=new Date();
    cursor.setHours(0,0,0,0);

    if(!(daily[localDateKey(cursor)]?.total>0)){
      cursor.setDate(cursor.getDate()-1);
    }

    let streak=0;
    while(daily[localDateKey(cursor)]?.total>0){
      streak++;
      cursor.setDate(cursor.getDate()-1);
    }
    return streak;
  }

  function renderExam(){
    const card=$('homeExamCountdown');
    if(!card)return;
    const stored=localStorage.getItem('kentei_v2_exam_date')||'';
    if(!stored){card.classList.add('hidden');return}

    const today=new Date();today.setHours(0,0,0,0);
    const exam=new Date(stored+'T00:00:00');
    const days=Math.ceil((exam-today)/86400000);
    card.classList.remove('hidden');
    $('homeExamDays').textContent=days>=0?`あと${days}日`:'試験日は終了';
    $('homeExamDate').textContent=stored;
  }

  function render(){
    if(!$('homeTodayTotal'))return;
    const state=KenteiWord.getState();
    if(!state)return;

    const today=localDateKey();
    const data=state.daily[today]||{total:0,correct:0,wrongIds:[]};
    const goal=Math.max(1,Number(state.settings?.dailyGoal)||50);
    const progress=Math.min(100,(data.total/goal)*100);

    $('homeTodayTotal').textContent=data.total;
    document.querySelector('.home-unit').textContent=` / ${goal}問`;
    $('homeProgressBar').style.width=progress+'%';
    $('homeTodayRate').textContent=`正答率 ${pct(data.correct,data.total)}`;
    $('homeStreak').textContent=calculateStreak();
    $('homeTodayWrong').textContent=(data.wrongIds||[]).length;
    $('homeFavoriteCount').textContent=(state.favorites||[]).length;

    recommendedIds=chooseRecommended();
    $('recommendedWordDetail').textContent=recommendedIds.length
      ?`${recommendedIds.length}問・約${Math.max(1,Math.ceil(recommendedIds.length*.4))}分`
      :'おすすめ問題を準備中';

    renderExam();
    if(window.KenteiSettings)KenteiSettings.applyHome();
  }

  function startRecommended(){
    if(!recommendedIds.length)recommendedIds=chooseRecommended();
    if(!recommendedIds.length){alert('おすすめできる問題がありません');return}
    KenteiQuiz.start('all',{order:recommendedIds,position:0});
  }

  function startTodayWrong(){
    const state=KenteiWord.getState();
    const ids=state.daily[localDateKey()]?.wrongIds||[];
    if(!ids.length){alert('今日間違えた問題はありません');return}
    KenteiQuiz.start('all',{order:ids,position:0});
  }

  function init(){
    $('recommendedWordButton')?.addEventListener('click',startRecommended);
    $('recommendedCalculationButton')?.addEventListener('click',()=>KenteiRouter.show('calculation'));
    $('todayWrongButton')?.addEventListener('click',startTodayWrong);
    $('homeFavoriteButton')?.addEventListener('click',()=>KenteiQuiz.start('favorite'));
    document.addEventListener('kentei:route',event=>{if(event.detail==='home')render()});
    render();
  }

  return{init,render,chooseRecommended};
})();
