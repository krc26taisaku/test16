
window.KenteiHistory=(()=>{
  const $=id=>document.getElementById(id);

  function render(){
    const state=KenteiWord.getState();
    if(!state)return;

    const today=localDateKey(new Date());
    const todayData=state.daily[today]||{total:0,correct:0};
    const answered=Object.values(state.perQuestion||{}).filter(x=>x&&x.total>0).length;

    $('todayHistoryCard').innerHTML=`
      <div class="section-label">今日の学習</div>
      <h2>${todayData.total}問</h2>
      <p class="muted-text">正解 ${todayData.correct}問・正答率 ${KenteiWord.pct(todayData.correct,todayData.total)}</p>
    `;

    $('historySummaryGrid').innerHTML=[
      ['総解答数',state.total],
      ['総正解数',state.correct],
      ['全体正答率',KenteiWord.pct(state.correct,state.total)],
      ['回答済み問題',answered+'問'],
      ['間違い問題',state.wrongIds.length+'問'],
      ['お気に入り',state.favorites.length+'問']
    ].map(([label,value])=>`<div class="history-stat"><b>${value}</b><span>${label}</span></div>`).join('');

    const days=Object.entries(state.daily||{}).sort((a,b)=>b[0].localeCompare(a[0]));
    $('dailyHistoryList').innerHTML=days.length?days.map(([date,d])=>`
      <button class="daily-history-item history-day-button" data-history-date="${date}">
        <div class="daily-history-top"><span>${formatDate(date)}</span><span>${d.total}問</span></div>
        <div class="daily-history-meta">正解 ${d.correct}問・正答率 ${KenteiWord.pct(d.correct,d.total)}</div>
      </button>
    `).join(''):'<div class="empty-card">まだ学習履歴がありません。</div>';

    document.querySelectorAll('[data-history-date]').forEach(button=>{
      button.addEventListener('click',()=>{
        $('historyDateInput').value=button.dataset.historyDate;
        renderSelectedDate(button.dataset.historyDate);
      });
    });

    const selected=$('historyDateInput').value||today;
    $('historyDateInput').value=selected;
    renderSelectedDate(selected);
  }

  function renderSelectedDate(date){
    const state=KenteiWord.getState();
    const data=(state.daily||{})[date];
    const box=$('selectedDateHistory');

    if(!date){
      box.className='selected-date-history empty';
      box.textContent='日付を選択してください。';
      return;
    }

    if(!data){
      box.className='selected-date-history empty';
      box.innerHTML=`<b>${formatDate(date)}</b><br>この日の学習記録はありません。`;
      return;
    }

    box.className='selected-date-history';
    box.innerHTML=`
      <div class="selected-date-title"><span>${formatDate(date)}</span><span>${data.total}問</span></div>
      <div class="selected-date-meta">正解 ${data.correct}問<br>不正解 ${data.total-data.correct}問<br>正答率 ${KenteiWord.pct(data.correct,data.total)}</div>
    `;
  }

  function formatDate(date){
    const d=new Date(date+'T00:00:00');
    return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
  }

  function localDateKey(date){
    const y=date.getFullYear();
    const m=String(date.getMonth()+1).padStart(2,'0');
    const d=String(date.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }

  function resetHistory(){
    const ok=confirm('学習履歴をリセットしますか？\\n正答率、間違えた問題、日別履歴、続きからの位置が削除されます。\\nお気に入りとメモは残ります。');
    if(!ok)return;
    KenteiWord.resetHistory();
    render();
    if(typeof showToast==='function')showToast('学習履歴をリセットしました');
  }

  function init(){
    $('historyDateInput')?.addEventListener('change',event=>renderSelectedDate(event.target.value));
    $('resetHistoryButton')?.addEventListener('click',resetHistory);
    document.addEventListener('kentei:route',event=>{
      if(event.detail==='history')render();
    });
  }

  return{init,render,renderSelectedDate};
})();
