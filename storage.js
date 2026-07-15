
window.KenteiStorage=(()=>{
  const KEY='kentei_word_state_v2';
  function base(){return{
    total:0,correct:0,wrongIds:[],favorites:[],byCategory:{},perQuestion:{},notes:{},lastSession:null,daily:{},
    settings:{
      dailyGoal:50,
      homeVisibility:{
        recommended:true,
        progress:true,
        examCountdown:true,
        streak:true,
        todayWrong:true,
        favorites:true,
        modes:true
      },
      menuVisibility:{
        home:true,
        wordList:true,
        history:true,
        ranking:true,
        examDate:true,
        settings:true
      },
      homeOrder:["examCountdown","progress","streak","recommended","todayWrong","favorites","modes"],
      menuOrder:["home","wordList","history","ranking","examDate","settings"]
    }
  }}
  function normalize(raw){const s=Object.assign(base(),raw||{});s.wrongIds=Array.isArray(s.wrongIds)?s.wrongIds:[];s.favorites=Array.isArray(s.favorites)?s.favorites:[];s.byCategory=s.byCategory||{};s.perQuestion=s.perQuestion||{};s.notes=s.notes||{};s.daily=s.daily||{};
    const defaults=base().settings;
    s.settings=Object.assign({},defaults,s.settings||{});
    s.settings.homeVisibility=Object.assign({},defaults.homeVisibility,(s.settings&&s.settings.homeVisibility)||{});
    s.settings.menuVisibility=Object.assign({},defaults.menuVisibility,(s.settings&&s.settings.menuVisibility)||{});
    s.settings.menuVisibility.settings=true;
    const validHome=defaults.homeOrder;
    const validMenu=defaults.menuOrder;
    const homeOrder=Array.isArray(s.settings.homeOrder)?s.settings.homeOrder:[];
    const menuOrder=Array.isArray(s.settings.menuOrder)?s.settings.menuOrder:[];
    s.settings.homeOrder=[...homeOrder.filter(x=>validHome.includes(x)),...validHome.filter(x=>!homeOrder.includes(x))];
    s.settings.menuOrder=[...menuOrder.filter(x=>validMenu.includes(x)&&x!=="settings"),...validMenu.filter(x=>x!=="settings"&&!menuOrder.includes(x)),"settings"];
    Object.keys(s.daily).forEach(day=>{
      const d=s.daily[day]||{};
      d.total=Number(d.total)||0;
      d.correct=Number(d.correct)||0;
      d.wrongIds=Array.isArray(d.wrongIds)?d.wrongIds:[];
      s.daily[day]=d;
    });
    return s}
  function load(){
    try{
      const own=localStorage.getItem(KEY);if(own)return normalize(JSON.parse(own));
      const legacyKeys=['state','quiz_state','kentei_state_v1','kentei_state_v2'];
      for(const key of legacyKeys){const value=localStorage.getItem(key);if(value){const legacy=JSON.parse(value);return normalize(legacy)}}
      return base();
    }catch{return base()}
  }
  function save(state){localStorage.setItem(KEY,JSON.stringify(normalize(state)))}
  return{load,save,base};
})();
