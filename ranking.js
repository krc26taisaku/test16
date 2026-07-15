
window.KenteiRanking=(()=>{
  let sort='rate',filter='all';
  const Q=()=>window.WORD_QUESTIONS||[];
  const $=id=>document.getElementById(id);

  function render(){
    const state=KenteiWord.getState();
    let items=Q().map(q=>({q,s:state.perQuestion[q.id]})).filter(x=>x.s&&x.s.total>0);
    if(filter!=='all')items=items.filter(x=>x.q.category===filter);

    items.sort((a,b)=>{
      if(sort==='wrong')return (b.s.wrong||0)-(a.s.wrong||0)||b.s.total-a.s.total;
      return (a.s.correct/a.s.total)-(b.s.correct/b.s.total)||b.s.total-a.s.total;
    });

    const list=$('rankingList');
    if(!items.length){
      list.innerHTML='<div class="ranking-card empty-card">まだ回答履歴がありません。</div>';
      return;
    }

    list.innerHTML='';
    items.slice(0,100).forEach((item,index)=>{
      const card=document.createElement('article');
      card.className='ranking-card';
      card.innerHTML=`
        <div class="ranking-top">
          <span class="ranking-name">${index+1}. ${escapeHtml(item.q.word)}</span>
          <span class="ranking-rate">${KenteiWord.pct(item.s.correct,item.s.total)}</span>
        </div>
        <div class="ranking-meta">${escapeHtml(item.q.category)}・${item.s.correct}正解 / ${item.s.total}回答・間違い ${item.s.wrong||0}回</div>
        <div class="ranking-meaning">${escapeHtml(item.q.meaning)}</div>
        <div class="ranking-actions">
          <button class="primary-button">この問題を解く</button>
          <button class="secondary-button no-margin">${state.favorites.includes(item.q.id)?'★ お気に入り':'☆ お気に入り'}</button>
        </div>
      `;
      const buttons=card.querySelectorAll('button');
      buttons[0].addEventListener('click',()=>KenteiQuiz.start('all',{order:[item.q.id],position:0}));
      buttons[1].addEventListener('click',()=>{
        const active=KenteiWord.toggleFavorite(item.q.id);
        buttons[1].textContent=active?'★ お気に入り':'☆ お気に入り';
      });
      list.appendChild(card);
    });
  }

  function setSort(value){
    sort=value;
    document.querySelectorAll('[data-ranking-sort]').forEach(b=>b.classList.toggle('active',b.dataset.rankingSort===value));
    render();
  }

  function setFilter(value){
    filter=value;
    document.querySelectorAll('[data-ranking-filter]').forEach(b=>b.classList.toggle('active',b.dataset.rankingFilter===value));
    render();
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function init(){
    document.querySelectorAll('[data-ranking-sort]').forEach(b=>b.addEventListener('click',()=>setSort(b.dataset.rankingSort)));
    document.querySelectorAll('[data-ranking-filter]').forEach(b=>b.addEventListener('click',()=>setFilter(b.dataset.rankingFilter)));
    document.addEventListener('kentei:route',e=>{if(e.detail==='ranking')render()});
  }

  return{init,render};
})();
