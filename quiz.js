
window.KenteiQuiz=(()=>{
  let order=[],pos=0,mode='all',label='全分野',current=null,currentChoices=[],answered=false,session={total:0,correct:0};
  const $=id=>document.getElementById(id);const shuffle=a=>[...a].sort(()=>Math.random()-.5);const esc=s=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function start(nextMode,options={}){mode=nextMode;label=nextMode==='all'?'全分野':nextMode==='wrong'?'間違えた問題':nextMode==='favorite'?'お気に入り問題':nextMode;const pool=KenteiWord.pool(nextMode);if(!pool.length){alert('対象の問題がありません');return}
    order=options.order||shuffle(pool.map(q=>q.id));pos=options.position||0;session={total:0,correct:0};KenteiRouter.show('quiz');show();persist();
  }
  function resume(){const s=KenteiWord.getState().lastSession;if(!s)return;start(s.mode,{order:s.order,position:s.position})}
  function restartLast(){const s=KenteiWord.getState().lastSession;if(!s)return;start(s.mode)}
  function persist(){KenteiWord.setLastSession({mode,label,order,position:pos})}
  function show(){answered=false;current=(window.WORD_QUESTIONS||[]).find(q=>q.id===order[pos]);if(!current){finish();return}
    $('quizCategory').textContent=current.category;$('quizProgress').textContent=`${pos+1} / ${order.length}`;$('quizQuestion').textContent=current.meaning;const pq=KenteiWord.getState().perQuestion[current.id]||{total:0,correct:0,wrong:0};$('questionStats').textContent=`この問題の正答率：${KenteiWord.pct(pq.correct,pq.total)}・間違い ${pq.wrong||0}回`;
    $('answerResult').className='answer-result hidden';$('answerResult').innerHTML='';$('nextQuestionButton').classList.add('hidden');$('favoriteButton').textContent=KenteiWord.getState().favorites.includes(current.id)?'★':'☆';$('notePanel').classList.add('hidden');$('noteInput').value=KenteiWord.getNote(current.id);$('noteStatus').textContent='';
    currentChoices=window.KenteiWordChoice
      ?KenteiWordChoice.choices(current,4)
      :shuffle([current,...shuffle((window.WORD_QUESTIONS||[]).filter(q=>q.category===current.category&&q.id!==current.id&&q.word!==current.word)).slice(0,3)]);$('choiceArea').innerHTML='';currentChoices.forEach(item=>{const b=document.createElement('button');b.className='quiz-choice';b.textContent=item.word;b.onclick=()=>answer(item,b);$('choiceArea').appendChild(b)});updateSession();persist();
  }
  function answer(item,button){if(answered)return;answered=true;const ok=item.id===current.id;session.total++;if(ok)session.correct++;KenteiWord.record(current,ok);document.querySelectorAll('.quiz-choice').forEach(b=>{b.disabled=true;if(b.textContent===current.word)b.classList.add('correct')});if(!ok)button.classList.add('wrong');
    const list=currentChoices.map(c=>`<div class="explanation-item ${c.id===current.id?'correct':''} ${!ok&&c.id===item.id?'selected':''}"><div class="explanation-word">${esc(c.word)} ${c.id===current.id?'⭕':''}</div><div class="explanation-meaning">${esc(c.meaning)}</div></div>`).join('');
    $('answerResult').className='answer-result '+(ok?'ok':'ng');$('answerResult').innerHTML=`<div class="answer-title">${ok?'⭕ 正解！':'❌ 不正解'}</div>${ok?'':`正解：<b>${esc(current.word)}</b>`}<div class="explanation-list">${list}</div>`;$('nextQuestionButton').classList.remove('hidden');updateSession();
  }
  function next(){pos++;if(pos>=order.length){finish();return}show()}
  function finish(){KenteiWord.clearLastSession();$('choiceArea').innerHTML='';$('quizQuestion').textContent='このモードの問題をすべて解き終わりました！';$('questionStats').textContent='';$('answerResult').className='answer-result ok';$('answerResult').innerHTML=`正解 ${session.correct} / ${session.total}<br>正答率 ${KenteiWord.pct(session.correct,session.total)}`;$('nextQuestionButton').textContent='単語ホームへ戻る';$('nextQuestionButton').classList.remove('hidden');$('nextQuestionButton').onclick=()=>{resetNext();KenteiRouter.show('word')};
  }
  function resetNext(){$('nextQuestionButton').textContent='次の問題へ';$('nextQuestionButton').onclick=next}
  function updateSession(){$('sessionAnswered').textContent=session.total;$('sessionCorrect').textContent=session.correct;$('sessionRate').textContent=KenteiWord.pct(session.correct,session.total)}
  function init(){resetNext();$('quizBackButton').onclick=()=>KenteiRouter.show('word');$('favoriteButton').onclick=()=>{if(current)$('favoriteButton').textContent=KenteiWord.toggleFavorite(current.id)?'★':'☆'};$('noteToggleButton').onclick=()=>$('notePanel').classList.toggle('hidden');$('saveNoteButton').onclick=()=>{if(!current)return;KenteiWord.saveNote(current.id,$('noteInput').value.trim());$('noteStatus').textContent='保存しました'};}
  return{init,start,resume,restartLast};
})();
