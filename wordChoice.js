window.KenteiWordChoice=(()=>{
  const Q=()=>window.WORD_QUESTIONS||[];

  const TOPIC_GROUPS=[
    ['経営','企業','会社','事業','経営戦略','競争','市場','マーケティング','顧客','販売','ブランド'],
    ['会計','財務','利益','売上','費用','資産','負債','決算','株主','投資','キャッシュフロー','損益'],
    ['組織','人材','社員','労働','教育','研修','リーダー','マネジメント','職務','能力'],
    ['法','法律','権利','義務','契約','著作権','個人情報','規則','制度','標準'],
    ['データ','分析','統計','グラフ','相関','予測','標本','母集団','検定','可視化'],
    ['プロジェクト','工程','進捗','納期','工数','品質','リスク','スケジュール','見積り'],
    ['システム開発','開発','設計','テスト','要件','プログラム','ソフトウェア','保守','レビュー'],
    ['セキュリティ','攻撃','暗号','認証','ウイルス','不正','脅威','ぜい弱性','アクセス制御'],
    ['ネットワーク','通信','インターネット','IP','DNS','ルータ','LAN','プロトコル','回線'],
    ['データベース','DB','SQL','表','レコード','トランザクション','正規化','主キー'],
    ['ハードウェア','CPU','メモリ','記憶装置','ディスク','クロック','プロセッサ','入出力'],
    ['AI','人工知能','機械学習','深層学習','ニューラル','生成AI','モデル','学習データ'],
    ['クラウド','IoT','DX','デジタル','仮想化','ビッグデータ','サービス','プラットフォーム'],
    ['品質管理','改善','原因','工程','管理図','パレート','特性要因','PDCA'],
    ['可用性','信頼性','障害','復旧','バックアップ','稼働率','冗長','BCP','災害']
  ];

  function normalize(value){
    return String(value||'')
      .toLowerCase()
      .normalize('NFKC')
      .replace(/\s+/g,'')
      .replace(/[。、，．・：:；;（）()「」『』【】［］\[\]<>＜＞!！?？\-_/\\]/g,'');
  }

  function ngrams(value,size=2){
    const text=normalize(value);
    const result=new Set();
    if(text.length<size){
      if(text)result.add(text);
      return result;
    }
    for(let i=0;i<=text.length-size;i++)result.add(text.slice(i,i+size));
    return result;
  }

  function jaccard(a,b){
    if(!a.size||!b.size)return 0;
    let common=0;
    a.forEach(x=>{if(b.has(x))common++});
    return common/(a.size+b.size-common);
  }

  function asciiTokens(value){
    return new Set(
      String(value||'')
        .toUpperCase()
        .match(/[A-Z][A-Z0-9.&+\-]{1,}/g)||[]
    );
  }

  function commonCount(a,b){
    let count=0;
    a.forEach(x=>{if(b.has(x))count++});
    return count;
  }

  function groupMatches(question){
    const text=normalize(`${question.word} ${question.meaning}`);
    const matches=[];
    TOPIC_GROUPS.forEach((words,index)=>{
      if(words.some(word=>text.includes(normalize(word))))matches.push(index);
    });
    return new Set(matches);
  }

  function score(base,candidate){
    if(!base||!candidate||base.id===candidate.id||base.word===candidate.word)return -Infinity;

    let value=0;
    if(base.category===candidate.category)value+=18;

    value+=jaccard(ngrams(base.meaning,2),ngrams(candidate.meaning,2))*42;
    value+=jaccard(ngrams(base.meaning,3),ngrams(candidate.meaning,3))*24;
    value+=jaccard(ngrams(base.word,2),ngrams(candidate.word,2))*16;

    const groupsA=groupMatches(base);
    const groupsB=groupMatches(candidate);
    value+=commonCount(groupsA,groupsB)*15;

    const asciiA=asciiTokens(`${base.word} ${base.meaning}`);
    const asciiB=asciiTokens(`${candidate.word} ${candidate.meaning}`);
    value+=commonCount(asciiA,asciiB)*10;

    const baseWord=normalize(base.word);
    const candidateWord=normalize(candidate.word);
    if(baseWord.length>=3&&candidateWord.length>=3){
      if(baseWord.slice(-2)===candidateWord.slice(-2))value+=5;
      if(baseWord.slice(0,2)===candidateWord.slice(0,2))value+=5;
    }

    return value;
  }

  function ranked(base){
    return Q()
      .filter(q=>q.id!==base.id&&q.word!==base.word)
      .map(q=>({q,score:score(base,q),tie:Math.random()}))
      .sort((a,b)=>b.score-a.score||a.tie-b.tie);
  }

  function distractors(base,count=3){
    const all=ranked(base);
    const selected=[];
    const add=item=>{
      if(item&&!selected.some(x=>x.word===item.q.word))selected.push(item.q);
    };

    // 上位候補の中から毎回少しランダムに選ぶ
    const strong=all.slice(0,Math.min(12,all.length));
    while(strong.length&&selected.length<count){
      const weights=strong.map((_,i)=>Math.max(1,strong.length-i));
      const total=weights.reduce((a,b)=>a+b,0);
      let target=Math.random()*total;
      let index=0;
      for(;index<weights.length;index++){
        target-=weights[index];
        if(target<=0)break;
      }
      const [picked]=strong.splice(Math.min(index,strong.length-1),1);
      add(picked);
    }

    // 足りない場合は同じ分野、それでも不足なら全問題から補う
    all.filter(x=>x.q.category===base.category).forEach(add);
    all.forEach(add);

    return selected.slice(0,count);
  }

  function shuffle(items){
    const result=[...items];
    for(let i=result.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [result[i],result[j]]=[result[j],result[i]];
    }
    return result;
  }

  function choices(base,count=4){
    return shuffle([base,...distractors(base,Math.max(0,count-1))]);
  }

  function diagnostics(){
    const sample=Q()[0];
    if(!sample)return{valid:false,message:'単語データがありません'};
    const result=choices(sample,4);
    return{
      valid:result.length===4&&new Set(result.map(x=>x.word)).size===4,
      sample:sample.word,
      choices:result.map(x=>x.word)
    };
  }

  return{choices,distractors,score,diagnostics};
})();
