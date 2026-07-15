
window.KenteiSettings=(()=>{
  const $=id=>document.getElementById(id);

  const HOME_LABELS={
    recommended:'今日のおすすめ',
    progress:'今日の進捗',
    examCountdown:'試験まであと○日',
    streak:'連続学習',
    todayWrong:'今日間違えた問題',
    favorites:'お気に入り',
    modes:'モード選択'
  };

  const MENU_LABELS={
    home:'モード選択',
    wordList:'単語一覧',
    history:'学習履歴',
    ranking:'苦手ランキング',
    examDate:'試験日の設定',
    settings:'設定'
  };

  function getState(){
    return window.KenteiWord ? KenteiWord.getState() : null;
  }

  function visibility(){
    const state=getState();
    return {
      home:state?.settings?.homeVisibility||{},
      menu:state?.settings?.menuVisibility||{}
    };
  }

  function setVisible(element,visible){
    if(!element)return;
    element.classList.toggle('setting-hidden',!visible);
    element.setAttribute('aria-hidden',visible?'false':'true');
  }

  function refreshHomeGrids(){
    ['homeStatsGrid','homeQuickGrid'].forEach(id=>{
      const grid=$(id);
      if(!grid)return;
      const hasVisible=[...grid.children].some(child=>!child.classList.contains('setting-hidden'));
      grid.classList.toggle('setting-hidden',!hasVisible);
    });
  }

  function applyHomeOrder(){
    const state=getState();
    const order=state?.settings?.homeOrder||[];
    const homePage=$('page-home');
    if(!homePage)return;
    const modeSection=homePage.querySelector('[data-home-item="modes"]');
    if(!modeSection)return;

    order.forEach(key=>{
      const element=homePage.querySelector(`[data-home-item="${key}"]`);
      if(element)homePage.appendChild(element);
    });
  }

  function applyMenuOrder(){
    const state=getState();
    const nav=document.querySelector('.drawer-nav');
    if(!nav)return;
    const order=(state?.settings?.menuOrder||[]).filter(key=>key!=='settings');
    order.forEach(key=>{
      const element=nav.querySelector(`[data-menu-item="${key}"]`);
      if(element)nav.appendChild(element);
    });
    const settingsItem=nav.querySelector('[data-menu-item="settings"]');
    if(settingsItem)nav.appendChild(settingsItem);
  }

  function applyHome(){
    const {home}=visibility();
    applyHomeOrder();
    document.querySelectorAll('[data-home-item]').forEach(element=>{
      const key=element.dataset.homeItem;
      setVisible(element,home[key]!==false);
    });
    refreshHomeGrids();
  }

  function applyMenu(){
    const {menu}=visibility();
    applyMenuOrder();
    document.querySelectorAll('[data-menu-item]').forEach(element=>{
      const key=element.dataset.menuItem;
      const fixed=element.dataset.menuFixed==='true'||key==='settings';
      setVisible(element,fixed?true:menu[key]!==false);
    });
  }

  function apply(){
    applyHome();
    applyMenu();
  }

  function makeOrderItem(key,label,fixed=false){
    const item=document.createElement('div');
    item.className='order-item';
    item.draggable=!fixed;
    item.dataset.orderKey=key;
    if(fixed)item.classList.add('fixed-order-item');

    item.innerHTML=`
      <span class="drag-handle">${fixed?'🔒':'≡'}</span>
      <span class="order-label">${label}</span>
      <span class="order-actions">
        ${fixed?'':`<button type="button" class="order-move" data-move="up" aria-label="上へ">↑</button>
        <button type="button" class="order-move" data-move="down" aria-label="下へ">↓</button>`}
      </span>
    `;

    if(!fixed){
      item.addEventListener('dragstart',()=>item.classList.add('dragging'));
      item.addEventListener('dragend',()=>item.classList.remove('dragging'));
      item.querySelectorAll('[data-move]').forEach(button=>{
        button.addEventListener('click',()=>moveItem(item,button.dataset.move));
      });
    }
    return item;
  }

  function addDragSupport(list){
    list.addEventListener('dragover',event=>{
      event.preventDefault();
      const dragging=list.querySelector('.dragging');
      if(!dragging)return;
      const after=[...list.querySelectorAll('.order-item:not(.dragging):not(.fixed-order-item)')]
        .find(item=>event.clientY<=item.getBoundingClientRect().top+item.offsetHeight/2);
      const fixed=list.querySelector('.fixed-order-item');
      if(after)list.insertBefore(dragging,after);
      else if(fixed)list.insertBefore(dragging,fixed);
      else list.appendChild(dragging);
    });
  }

  function moveItem(item,direction){
    const list=item.parentElement;
    if(direction==='up'){
      const previous=item.previousElementSibling;
      if(previous&&!previous.classList.contains('fixed-order-item'))list.insertBefore(item,previous);
    }else{
      const next=item.nextElementSibling;
      if(next&&!next.classList.contains('fixed-order-item'))list.insertBefore(next,item);
    }
  }

  function renderOrderLists(){
    const state=getState();
    if(!state)return;

    const homeList=$('homeOrderList');
    const menuList=$('menuOrderList');

    if(homeList){
      homeList.innerHTML='';
      (state.settings.homeOrder||Object.keys(HOME_LABELS)).forEach(key=>{
        if(HOME_LABELS[key])homeList.appendChild(makeOrderItem(key,HOME_LABELS[key]));
      });
      addDragSupport(homeList);
    }

    if(menuList){
      menuList.innerHTML='';
      (state.settings.menuOrder||Object.keys(MENU_LABELS))
        .filter(key=>key!=='settings')
        .forEach(key=>{
          if(MENU_LABELS[key])menuList.appendChild(makeOrderItem(key,MENU_LABELS[key]));
        });
      menuList.appendChild(makeOrderItem('settings','設定',true));
      addDragSupport(menuList);
    }
  }

  function render(){
    const state=getState();
    if(!state)return;

    const home=state.settings?.homeVisibility||{};
    document.querySelectorAll('[data-home-setting]').forEach(input=>{
      input.checked=home[input.dataset.homeSetting]!==false;
    });

    const menu=state.settings?.menuVisibility||{};
    document.querySelectorAll('[data-menu-setting]').forEach(input=>{
      input.checked=menu[input.dataset.menuSetting]!==false;
    });

    renderOrderLists();

    const status=$('displaySettingsStatus');
    if(status)status.textContent='';
  }

  function collect(){
    const homeVisibility={};
    document.querySelectorAll('[data-home-setting]').forEach(input=>{
      homeVisibility[input.dataset.homeSetting]=input.checked;
    });

    const menuVisibility={settings:true};
    document.querySelectorAll('[data-menu-setting]').forEach(input=>{
      menuVisibility[input.dataset.menuSetting]=input.checked;
    });

    const homeOrder=[...document.querySelectorAll('#homeOrderList [data-order-key]')].map(x=>x.dataset.orderKey);
    const menuOrder=[...document.querySelectorAll('#menuOrderList [data-order-key]')].map(x=>x.dataset.orderKey);
    if(!menuOrder.includes('settings'))menuOrder.push('settings');

    return{homeVisibility,menuVisibility,homeOrder,menuOrder};
  }

  function save(){
    const state=getState();
    if(!state)return;
    const values=collect();

    state.settings=state.settings||{};
    state.settings.homeVisibility=values.homeVisibility;
    state.settings.menuVisibility={...values.menuVisibility,settings:true};
    state.settings.homeOrder=values.homeOrder;
    state.settings.menuOrder=[...values.menuOrder.filter(x=>x!=='settings'),'settings'];
    KenteiWord.save();
    apply();

    const status=$('displaySettingsStatus');
    if(status)status.textContent='表示と並び順を保存して反映しました。';
    if(typeof showToast==='function')showToast('設定を反映しました');
  }

  function reset(){
    const ok=confirm('ホームとメニューの表示・並び順を初期状態に戻しますか？');
    if(!ok)return;

    const state=getState();
    state.settings=state.settings||{};
    state.settings.homeVisibility={
      recommended:true,progress:true,examCountdown:true,streak:true,
      todayWrong:true,favorites:true,modes:true
    };
    state.settings.menuVisibility={
      home:true,wordList:true,history:true,ranking:true,examDate:true,settings:true
    };
    state.settings.homeOrder=['examCountdown','progress','streak','recommended','todayWrong','favorites','modes'];
    state.settings.menuOrder=['home','wordList','history','ranking','examDate','settings'];

    KenteiWord.save();
    render();
    apply();

    const status=$('displaySettingsStatus');
    if(status)status.textContent='初期設定に戻して反映しました。';
    if(typeof showToast==='function')showToast('初期設定に戻しました');
  }

  function init(){
    $('saveDisplaySettingsButton')?.addEventListener('click',save);
    $('resetDisplaySettingsButton')?.addEventListener('click',reset);

    document.addEventListener('kentei:route',event=>{
      if(event.detail==='settings')render();
      if(event.detail==='home')applyHome();
    });

    apply();
  }

  return{init,render,save,reset,apply,applyHome,applyMenu};
})();
