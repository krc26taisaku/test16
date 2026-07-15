
window.KenteiWord=(()=>{
  const Q=()=>window.WORD_QUESTIONS||[];
  let state;
  function init(){state=KenteiStorage.load();refreshHome()}
  function getState(){return state}
  function save(){KenteiStorage.save(state)}
  function pct(c,t){return t?((c/t)*100).toFixed(1)+'%':'0%'}
  function refreshHome(){
    const allRate=document.getElementById('allRate');if(!allRate)return;
    allRate.textContent=pct(state.correct,state.total);
    const map=[['ストラテジ系','strategyRate'],['マネジメント系','managementRate'],['テクノロジ系','technologyRate']];
    map.forEach(([cat,id])=>{const s=state.byCategory[cat]||{total:0,correct:0};document.getElementById(id).textContent=pct(s.correct,s.total)});
    document.getElementById('wrongCount').textContent=state.wrongIds.length+'問';
    document.getElementById('favoriteCount').textContent=state.favorites.length+'問';
    const card=document.getElementById('resumeCard');
    if(state.lastSession&&state.lastSession.order&&state.lastSession.position<state.lastSession.order.length){
      card.classList.remove('hidden');document.getElementById('resumeTitle').textContent='▶ 続きから勉強';
      document.getElementById('resumeDetail').textContent=`${state.lastSession.label}・${state.lastSession.position+1} / ${state.lastSession.order.length}問目から`;
    }else card.classList.add('hidden');
    if(window.KenteiHome)window.KenteiHome.render();
  }
  function pool(mode){if(mode==='all')return Q();if(mode==='wrong')return Q().filter(q=>state.wrongIds.includes(q.id));if(mode==='favorite')return Q().filter(q=>state.favorites.includes(q.id));return Q().filter(q=>q.category===mode)}
  function localDateKey(date=new Date()){const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');return `${y}-${m}-${d}`}
  function record(question,ok){state.total++;const c=question.category;state.byCategory[c]=state.byCategory[c]||{total:0,correct:0};state.byCategory[c].total++;const pq=state.perQuestion[question.id]||{total:0,correct:0,wrong:0};pq.total++;pq.lastAnsweredAt=Date.now();
    if(ok){state.correct++;state.byCategory[c].correct++;pq.correct++;state.wrongIds=state.wrongIds.filter(id=>id!==question.id)}else{pq.wrong=(pq.wrong||0)+1;if(!state.wrongIds.includes(question.id))state.wrongIds.push(question.id)}state.perQuestion[question.id]=pq;
    const day=localDateKey();state.daily[day]=state.daily[day]||{total:0,correct:0,wrongIds:[]};state.daily[day].wrongIds=Array.isArray(state.daily[day].wrongIds)?state.daily[day].wrongIds:[];state.daily[day].total++;if(ok)state.daily[day].correct++;else if(!state.daily[day].wrongIds.includes(question.id))state.daily[day].wrongIds.push(question.id);
    save();refreshHome();
  }
  function toggleFavorite(id){state.favorites=state.favorites.includes(id)?state.favorites.filter(x=>x!==id):[...state.favorites,id];save();refreshHome();return state.favorites.includes(id)}
  function getNote(id){return state.notes[id]||''}function saveNote(id,text){state.notes[id]=text;save()}
  function setLastSession(session){state.lastSession=session;save();refreshHome()}function clearLastSession(){state.lastSession=null;save();refreshHome()}
  function resetHistory(){
    const keepFavorites=[...(state.favorites||[])];
    const keepNotes={...(state.notes||{})};
    state=KenteiStorage.base();
    state.favorites=keepFavorites;
    state.notes=keepNotes;
    save();
    refreshHome();
    return state;
  }
  return{init,getState,save,refreshHome,pool,record,toggleFavorite,getNote,saveNote,setLastSession,clearLastSession,resetHistory,pct};
})();
