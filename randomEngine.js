window.KenteiRandomEngine=(()=>{
  const UINT32_MAX=4294967296;

  function normalizeSeed(seed){
    if(seed===undefined||seed===null||seed==='')return String(createSeed());
    return String(seed).trim();
  }

  function hash(text){
    const value=normalizeSeed(text);
    let h=1779033703^value.length;
    for(let i=0;i<value.length;i++){
      h=Math.imul(h^value.charCodeAt(i),3432918353);
      h=h<<13|h>>>19;
    }
    h=Math.imul(h^(h>>>16),2246822507);
    h=Math.imul(h^(h>>>13),3266489909);
    return (h^(h>>>16))>>>0;
  }

  function mulberry32(seed){
    let value=seed>>>0;
    return()=>{
      value=(value+0x6D2B79F5)>>>0;
      let t=value;
      t=Math.imul(t^(t>>>15),t|1);
      t^=t+Math.imul(t^(t>>>7),t|61);
      return((t^(t>>>14))>>>0)/UINT32_MAX;
    };
  }

  function create(seed){
    const normalized=normalizeSeed(seed);
    const random=mulberry32(hash(normalized));

    const api={
      seed:normalized,
      next(){return random()},
      int(min,max){
        const low=Math.ceil(Number(min));
        const high=Math.floor(Number(max));
        if(!Number.isFinite(low)||!Number.isFinite(high)||high<low){
          throw new RangeError('intの範囲が不正です');
        }
        return Math.floor(api.next()*(high-low+1))+low;
      },
      float(min,max,digits=2){
        const low=Number(min),high=Number(max);
        if(!Number.isFinite(low)||!Number.isFinite(high)||high<low){
          throw new RangeError('floatの範囲が不正です');
        }
        const value=low+api.next()*(high-low);
        const precision=Math.max(0,Math.min(10,Number(digits)||0));
        return Number(value.toFixed(precision));
      },
      bool(probability=.5){
        const p=Math.max(0,Math.min(1,Number(probability)));
        return api.next()<p;
      },
      pick(items){
        if(!Array.isArray(items)||!items.length)throw new RangeError('pickには空でない配列が必要です');
        return items[api.int(0,items.length-1)];
      },
      shuffle(items){
        if(!Array.isArray(items))throw new TypeError('shuffleには配列が必要です');
        const result=[...items];
        for(let i=result.length-1;i>0;i--){
          const j=api.int(0,i);
          [result[i],result[j]]=[result[j],result[i]];
        }
        return result;
      },
      sample(items,count){
        const amount=Math.max(0,Math.min(items.length,Math.floor(Number(count)||0)));
        return api.shuffle(items).slice(0,amount);
      },
      step(min,max,step=1){
        const unit=Number(step);
        if(!Number.isFinite(unit)||unit<=0)throw new RangeError('stepは0より大きい数が必要です');
        const slots=Math.floor((Number(max)-Number(min))/unit);
        return Number((Number(min)+api.int(0,slots)*unit).toFixed(10));
      },
      derive(label){
        return create(`${normalized}:${String(label)}`);
      }
    };
    return api;
  }

  function createSeed(){
    if(globalThis.crypto?.getRandomValues){
      const values=new Uint32Array(2);
      globalThis.crypto.getRandomValues(values);
      return `${values[0]}${String(values[1]).padStart(10,'0')}`;
    }
    return `${Date.now()}${Math.floor(Math.random()*1000000).toString().padStart(6,'0')}`;
  }

  function selfTest(){
    const a=create('31001');
    const b=create('31001');
    const first=[a.int(1,100),a.float(0,1,4),a.pick(['A','B','C'])];
    const second=[b.int(1,100),b.float(0,1,4),b.pick(['A','B','C'])];
    return{
      valid:JSON.stringify(first)===JSON.stringify(second),
      seed:'31001',
      sample:first
    };
  }

  return{create,createSeed,normalizeSeed,hash,selfTest};
})();
