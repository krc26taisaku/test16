
window.KenteiWordList=(()=>{
  let filter='all',sort='kana';
  const Q=()=>window.WORD_QUESTIONS||[];
  const $=id=>document.getElementById(id);

  function render(){
    const container=$('wordListContainer');
    if(!container)return;
    const query=($('wordSearchInput')?.value||'').trim().toLowerCase();
    const state=KenteiWord.getState();

    let items=Q().filter(q=>{
      if(filter!=='all'&&q.category!==filter)return false;
      if(query&&!q.word.toLowerCase().includes(query)&&!q.meaning.toLowerCase().includes(query))return false;
      if(sort==='favorite'&&!state.favorites.includes(q.id))return false;
      return true;
    });

    if(sort==='alpha'){
      items.sort((a,b)=>a.word.localeCompare(b.word,'en',{sensitivity:'base'}));
    }else{
      items.sort((a,b)=>a.word.localeCompare(b.word,'ja',{sensitivity:'base'}));
    }

    $('wordListSummary').textContent=`${items.length}語を表示中`;
    container.innerHTML='';

    if(!items.length){
      container.innerHTML='<div class="word-list-card empty-card">一致する単語がありません。</div>';
      return;
    }

    items.forEach(q=>{
      const card=document.createElement('article');
      card.className='word-list-card';

      const row=document.createElement('div');
      row.className='word-list-button';

      const main=document.createElement('button');
      main.className='word-list-button';
      main.style.gridColumn='1 / 3';
      main.innerHTML=`<span><span class="word-list-name">${escapeHtml(q.word)}</span><br><span class="word-list-category">${escapeHtml(q.category)}</span></span><span>›</span>`;
      main.addEventListener('click',()=>card.classList.toggle('open'));

      const fav=document.createElement('button');
      fav.className='word-list-favorite';
      fav.textContent=state.favorites.includes(q.id)?'★':'☆';
      fav.addEventListener('click',()=>{
        const active=KenteiWord.toggleFavorite(q.id);
        fav.textContent=active?'★':'☆';
        if(sort==='favorite')render();
      });

      const meaning=document.createElement('div');
      meaning.className='word-list-meaning';
      meaning.textContent=q.meaning;

      row.appendChild(main);
      row.appendChild(fav);
      card.appendChild(row);
      card.appendChild(meaning);
      container.appendChild(card);
    });
  }

  function setFilter(value){
    filter=value;
    document.querySelectorAll('[data-word-filter]').forEach(b=>b.classList.toggle('active',b.dataset.wordFilter===value));
    render();
  }

  function setSort(value){
    sort=value;
    document.querySelectorAll('[data-word-sort]').forEach(b=>b.classList.toggle('active',b.dataset.wordSort===value));
    render();
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function init(){
    $('wordSearchInput')?.addEventListener('input',render);
    document.querySelectorAll('[data-word-filter]').forEach(b=>b.addEventListener('click',()=>setFilter(b.dataset.wordFilter)));
    document.querySelectorAll('[data-word-sort]').forEach(b=>b.addEventListener('click',()=>setSort(b.dataset.wordSort)));
    document.addEventListener('kentei:route',e=>{if(e.detail==='wordList')render()});
  }

  return{init,render};
})();
