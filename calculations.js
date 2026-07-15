
(()=>{
  const round=(value,digits=2)=>{
    const p=10**digits;
    return Math.round((Number(value)+Number.EPSILON)*p)/p;
  };

  const percent=value=>round(value*100,1);
  const money=value=>Math.round(value);
  const integer=value=>Math.round(value);

  function uniqueChoices(correct,wrongValues,formatter){
    const result=[];
    const add=value=>{
      const label=formatter(value);
      if(!result.some(item=>item.label===label))result.push({value,label});
    };
    add(correct);
    wrongValues.forEach(add);

    let offset=1;
    while(result.length<4){
      add(Number(correct)+offset);
      offset++;
    }
    return result.slice(0,4);
  }

  function makeQuestion(config){
    const correct=config.solve(config.values);
    const wrong=config.mistakes(config.values,correct);
    const choices=uniqueChoices(correct,wrong,config.formatAnswer);

    const correctLabel=config.formatAnswer(correct);
    const correctCount=choices.filter(x=>x.label===correctLabel).length;
    if(correctCount!==1)throw new Error(`${config.id}: 正解が選択肢内で一意ではありません`);
    if(choices.length!==4)throw new Error(`${config.id}: 選択肢が4つありません`);

    const steps=config.steps(config.values,correct);
    if(!steps.length)throw new Error(`${config.id}: 途中式がありません`);

    return {
      id:config.id,
      category:config.category,
      topic:config.topic,
      question:config.question(config.values),
      values:config.values,
      answer:correct,
      answerLabel:correctLabel,
      choices,
      formula:config.formula,
      steps,
      explanation:config.explanation(config.values,correct),
      unit:config.unit||''
    };
  }

  function makeTextQuestion(config){
    const answerLabel=String(config.answerLabel);
    const labels=[answerLabel,...config.wrongLabels.map(String)];
    const unique=[...new Set(labels)];
    if(unique.length!==4)throw new Error(`${config.id}: SQL選択肢が重複しています`);
    return{
      id:config.id,seed:config.seed||'',templateType:config.templateType||'',
      category:config.category,topic:config.topic,question:config.question,
      answer:answerLabel,answerLabel,
      choices:unique.map(label=>({value:label,label})),
      formula:config.formula,steps:config.steps,
      explanation:config.explanation,unit:''
    };
  }

  const q=[];

  // 損益分岐点：Ver3.1-2 シード付きランダム生成
  function registerBepTemplates(){
    if(!KenteiTemplateEngine.has('CAL-BEP-SALES')){
      KenteiTemplateEngine.register({
        type:'CAL-BEP-SALES',
        category:'ストラテジ系',
        topic:'損益分岐点',
        generate({rng}){
          const rates=[0.2,0.25,0.3,0.35,0.4,0.45,0.5,0.55,0.6];
          const variableRate=rng.pick(rates);
          const marginRate=1-variableRate;
          const target=rng.step(2000000,12000000,500000);
          const fixed=money(target*marginRate);
          const correct=money(fixed/marginRate);
          const wrong=[
            money(fixed/variableRate),
            money(fixed*marginRate),
            money(fixed/(1+variableRate))
          ];
          const format=v=>`${money(v).toLocaleString()}円`;

          return{
            values:{fixed,variableRate},
            question:`固定費が${fixed.toLocaleString()}円、変動費率が${variableRate*100}%のとき、損益分岐点売上高はいくらか。`,
            answer:correct,
            answerLabel:format(correct),
            choices:uniqueChoices(correct,wrong,format),
            formula:'損益分岐点売上高 ＝ 固定費 ÷（1－変動費率）',
            steps:[
              `限界利益率 ＝ 1－${variableRate} ＝ ${round(marginRate,2)}`,
              `${fixed.toLocaleString()} ÷ ${round(marginRate,2)} ＝ ${correct.toLocaleString()}円`
            ],
            explanation:`売上高のうち固定費の回収に使える割合は${marginRate*100}%です。固定費を限界利益率で割ります。`
          };
        }
      });
    }

    if(!KenteiTemplateEngine.has('CAL-BEP-PROFIT')){
      KenteiTemplateEngine.register({
        type:'CAL-BEP-PROFIT',
        category:'ストラテジ系',
        topic:'損益分岐点',
        generate({rng}){
          const sales=rng.step(5000000,20000000,500000);
          const variableRate=rng.pick([0.25,0.3,0.35,0.4,0.45,0.5,0.55]);
          const variable=money(sales*variableRate);
          const maxFixed=Math.max(1000000,sales-variable-500000);
          const fixed=rng.step(1000000,maxFixed,500000);
          const correct=money(sales-variable-fixed);
          const wrong=[
            money(sales-variable+fixed),
            money(sales-fixed),
            money(sales-variable)
          ];
          const format=v=>`${money(v).toLocaleString()}円`;

          return{
            values:{sales,variable,fixed},
            question:`売上高${sales.toLocaleString()}円、変動費${variable.toLocaleString()}円、固定費${fixed.toLocaleString()}円のとき、利益はいくらか。`,
            answer:correct,
            answerLabel:format(correct),
            choices:uniqueChoices(correct,wrong,format),
            formula:'利益 ＝ 売上高－変動費－固定費',
            steps:[
              `${sales.toLocaleString()}－${variable.toLocaleString()}－${fixed.toLocaleString()}`,
              `＝ ${correct.toLocaleString()}円`
            ],
            explanation:'売上高から、売上に応じて変わる変動費と、一定額かかる固定費の両方を引きます。'
          };
        }
      });
    }

    if(!KenteiTemplateEngine.has('CAL-BEP-UNITS')){
      KenteiTemplateEngine.register({
        type:'CAL-BEP-UNITS',
        category:'ストラテジ系',
        topic:'損益分岐点',
        generate({rng}){
          const contribution=rng.step(500,5000,500);
          const quantity=rng.step(200,2000,100);
          const variablePer=rng.step(500,6000,500);
          const price=variablePer+contribution;
          const fixed=contribution*quantity;
          const correct=quantity;
          const wrong=[
            integer(fixed/price),
            integer(fixed/variablePer),
            integer(fixed/(price+variablePer))
          ];
          const format=v=>`${integer(v).toLocaleString()}個`;

          return{
            values:{price,variablePer,fixed},
            question:`商品1個の販売価格が${price.toLocaleString()}円、1個当たり変動費が${variablePer.toLocaleString()}円、固定費が${fixed.toLocaleString()}円である。損益分岐点販売数量は何個か。`,
            answer:correct,
            answerLabel:format(correct),
            choices:uniqueChoices(correct,wrong,format),
            formula:'損益分岐点数量 ＝ 固定費 ÷（販売単価－1個当たり変動費）',
            steps:[
              `1個当たり限界利益 ＝ ${price.toLocaleString()}－${variablePer.toLocaleString()} ＝ ${contribution.toLocaleString()}円`,
              `${fixed.toLocaleString()} ÷ ${contribution.toLocaleString()} ＝ ${correct.toLocaleString()}個`
            ],
            explanation:'商品1個を売るごとに固定費の回収へ回せる限界利益を求め、その金額で固定費を割ります。'
          };
        }
      });
    }
  }

  function generateBepQuestions(){
    registerBepTemplates();
    const types=['CAL-BEP-SALES','CAL-BEP-PROFIT','CAL-BEP-UNITS'];
    const generated=[];

    for(let set=0;set<4;set++){
      types.forEach(type=>{
        let problem=null;

        for(let attempt=0;attempt<20;attempt++){
          try{
            problem=KenteiTemplateEngine.generate(
              type,
              KenteiRandomEngine.createSeed()
            );
            break;
          }catch(error){
            if(attempt===19)throw error;
          }
        }

        generated.push(problem);
      });
    }

    return generated;
  }

  q.push(...generateBepQuestions());

  // 工数：Ver3.1-3 シード付きランダム生成
  function registerWorkTemplates(){
    if(!KenteiTemplateEngine.has('CAL-WORK-REMAIN')){
      KenteiTemplateEngine.register({
        type:'CAL-WORK-REMAIN',category:'マネジメント系',topic:'工数',
        generate({rng}){
          const people=rng.int(5,18),days=rng.int(10,30);
          const doneDays=rng.int(2,Math.max(2,days-5)),donePeople=people,newDays=rng.int(3,12);
          const remaining=people*days-donePeople*doneDays;
          const correct=Math.ceil(remaining/newDays);
          const wrong=[Math.ceil(people*days/newDays),Math.ceil(remaining/(newDays+doneDays)),remaining];
          const format=v=>`${integer(v)}人`;
          return{
            values:{people,days,donePeople,doneDays,newDays},
            question:`${people}人で${days}日かかる作業を開始し、${donePeople}人で${doneDays}日作業した。残りを${newDays}日で終えるには、以後最低何人必要か。`,
            answer:correct,answerLabel:format(correct),choices:uniqueChoices(correct,wrong,format),
            formula:'総工数＝人数×日数、必要人数＝残工数÷残日数（端数は切り上げ）',
            steps:[`総工数＝${people}×${days}＝${people*days}人日`,`完了工数＝${donePeople}×${doneDays}＝${donePeople*doneDays}人日`,`残工数＝${remaining}人日`,`${remaining}÷${newDays}＝${round(remaining/newDays,2)} → 最低${correct}人`],
            explanation:'全体を人日に直し、完了した工数を引いて残日数で割ります。人数に端数が出た場合は切り上げます。'
          };
        }
      });
    }
    if(!KenteiTemplateEngine.has('CAL-WORK-PRODUCTIVITY')){
      KenteiTemplateEngine.register({
        type:'CAL-WORK-PRODUCTIVITY',category:'マネジメント系',topic:'工数',
        generate({rng}){
          const multiplier=rng.pick([1.2,1.25,1.5,1.6,2]),answerDays=rng.int(5,20);
          const days=answerDays*multiplier,people=rng.int(5,20),correct=round(days/multiplier,1);
          const wrong=[round(days*multiplier,1),round(days/(multiplier-1),1),round(days-multiplier,1)];
          const format=v=>`${round(v,1)}日`;
          return{
            values:{people,days,multiplier},
            question:`${people}人で${days}日かかる作業がある。1人当たりの生産性が従来の${multiplier}倍になった場合、同じ人数では何日かかるか。`,
            answer:correct,answerLabel:format(correct),choices:uniqueChoices(correct,wrong,format),
            formula:'新しい所要日数＝従来の日数÷生産性の倍率',
            steps:[`${days}÷${multiplier}＝${correct}日`],
            explanation:'生産性が高くなるほど必要な日数は短くなるので、倍率を掛けずに割ります。'
          };
        }
      });
    }
    if(!KenteiTemplateEngine.has('CAL-WORK-HOURS')){
      KenteiTemplateEngine.register({
        type:'CAL-WORK-HOURS',category:'マネジメント系',topic:'工数',
        generate({rng}){
          const months=rng.int(2,12),people=rng.int(2,15),hoursPerMonth=rng.pick([140,150,160,168,180]);
          const correct=months*people*hoursPerMonth;
          const wrong=[months*hoursPerMonth,people*hoursPerMonth,months*people+hoursPerMonth];
          const format=v=>`${integer(v).toLocaleString()}時間`;
          return{
            values:{months,people,hoursPerMonth},
            question:`${people}人が${months}か月、1人当たり月${hoursPerMonth}時間作業する。総工数は何時間か。`,
            answer:correct,answerLabel:format(correct),choices:uniqueChoices(correct,wrong,format),
            formula:'総工数＝月数×人数×1人当たり月間作業時間',
            steps:[`${months}×${people}×${hoursPerMonth}＝${correct.toLocaleString()}時間`],
            explanation:'月数、人数、1人当たりの月間作業時間をすべて掛けます。'
          };
        }
      });
    }
  }
  function generateWorkQuestions(){
    registerWorkTemplates();
    const types=['CAL-WORK-REMAIN','CAL-WORK-PRODUCTIVITY','CAL-WORK-HOURS'],generated=[];
    for(let set=0;set<4;set++)types.forEach(type=>generated.push(KenteiTemplateEngine.generate(type,KenteiRandomEngine.createSeed())));
    return generated;
  }
  q.push(...generateWorkQuestions());

  // 確率・場合の数
  q.push(makeQuestion({
    id:'CAL-PROB-001',category:'ストラテジ系',topic:'確率',
    values:{total:10,hit:3},
    question:v=>`${v.total}本のくじに当たりが${v.hit}本ある。1本引くとき、当たる確率は何%か。`,
    solve:v=>percent(v.hit/v.total),
    mistakes:(v,c)=>[
      percent((v.total-v.hit)/v.total),
      round(v.hit/v.total,1),
      percent(v.hit/(v.total-v.hit))
    ],
    formatAnswer:v=>`${round(v,1)}%`,
    formula:'確率 ＝ 条件に合う数 ÷ 全体の数',
    steps:(v,c)=>[
      `${v.hit}÷${v.total} ＝ ${round(v.hit/v.total,2)}`,
      `${round(v.hit/v.total,2)}×100 ＝ ${c}%`
    ],
    explanation:(v,c)=>'小数で求めた確率を百分率にするため、最後に100を掛けます。'
  }));

  q.push(makeQuestion({
    id:'CAL-PROB-002',category:'ストラテジ系',topic:'確率',
    values:{total:8,hit:2},
    question:v=>`${v.total}本のくじに当たりが${v.hit}本ある。引いたくじを戻さずに2本続けて引くとき、2本とも当たる確率は何%か。`,
    solve:v=>percent((v.hit/v.total)*((v.hit-1)/(v.total-1))),
    mistakes:(v,c)=>[
      percent((v.hit/v.total)*(v.hit/v.total)),
      percent(v.hit/v.total),
      percent(((v.total-v.hit)/v.total)*((v.total-v.hit-1)/(v.total-1)))
    ],
    formatAnswer:v=>`${round(v,1)}%`,
    formula:'連続して起こる確率 ＝ 1回目の確率×2回目の確率',
    steps:(v,c)=>[
      `1回目 ＝ ${v.hit}/${v.total}`,
      `2回目 ＝ ${v.hit-1}/${v.total-1}`,
      `${v.hit}/${v.total}×${v.hit-1}/${v.total-1}×100 ＝ ${c}%`
    ],
    explanation:(v,c)=>'戻さないので、1回引いた後は当たり本数も全体本数も1本ずつ減ります。'
  }));

  q.push(makeQuestion({
    id:'CAL-COMB-001',category:'ストラテジ系',topic:'場合の数',
    values:{n:7,r:3},
    question:v=>`${v.n}人の中から順序を考えずに${v.r}人を選ぶ方法は何通りか。`,
    solve:v=>{
      let num=1,den=1;
      for(let i=0;i<v.r;i++){num*=v.n-i;den*=i+1}
      return integer(num/den);
    },
    mistakes:(v,c)=>[
      integer(v.n*(v.n-1)*(v.n-2)),
      integer(v.n**v.r),
      integer(v.n*v.r)
    ],
    formatAnswer:v=>`${integer(v)}通り`,
    formula:'組合せ nCr ＝ n! ÷｛r!（n－r）!｝',
    steps:(v,c)=>[
      `${v.n}C${v.r} ＝ ${v.n}×${v.n-1}×${v.n-2} ÷（${v.r}×${v.r-1}×1）`,
      `＝ ${c}通り`
    ],
    explanation:(v,c)=>'選ぶ順番を区別しないため、順列の数を選んだ人数の並べ方で割ります。'
  }));

  // 稼働率：Ver3.1-4 シード付きランダム生成
  function registerAvailabilityTemplates(){
    if(!KenteiTemplateEngine.has('CAL-AVAIL-MTBF')){
      KenteiTemplateEngine.register({
        type:'CAL-AVAIL-MTBF',category:'テクノロジ系',topic:'稼働率',
        generate({rng}){
          const total=rng.step(100,1000,50);
          const mttr=rng.step(5,100,5);
          const mtbf=total-mttr;
          const correct=percent(mtbf/(mtbf+mttr));
          const wrong=[percent(mttr/(mtbf+mttr)),percent(mtbf/mttr),round(mtbf/(mtbf+mttr),1)];
          const format=v=>`${round(v,1)}%`;
          return{
            values:{mtbf,mttr},
            question:`MTBFが${mtbf}時間、MTTRが${mttr}時間のシステムの稼働率は何%か。`,
            answer:correct,answerLabel:format(correct),choices:uniqueChoices(correct,wrong,format),
            formula:'稼働率＝MTBF÷（MTBF＋MTTR）',
            steps:[`${mtbf}÷（${mtbf}＋${mttr}）`,`＝${mtbf}÷${mtbf+mttr}＝${round(mtbf/(mtbf+mttr),3)}`,`＝${correct}%`],
            explanation:'正常に動く平均時間を、正常時間と修理時間を合わせた全時間で割ります。'
          };
        }
      });
    }
    if(!KenteiTemplateEngine.has('CAL-AVAIL-SERIES')){
      KenteiTemplateEngine.register({
        type:'CAL-AVAIL-SERIES',category:'テクノロジ系',topic:'稼働率',
        generate({rng}){
          const a=rng.pick([0.8,0.85,0.9,0.92,0.95,0.98]),b=rng.pick([0.8,0.85,0.9,0.92,0.95,0.98]);
          const correct=percent(a*b);
          const wrong=[percent(a+b-a*b),percent((a+b)/2),percent(Math.min(1,a+b))];
          const format=v=>`${round(v,1)}%`;
          return{
            values:{a,b},
            question:`稼働率${a*100}%の装置Aと、稼働率${b*100}%の装置Bを直列に接続した。全体の稼働率は何%か。`,
            answer:correct,answerLabel:format(correct),choices:uniqueChoices(correct,wrong,format),
            formula:'直列システムの稼働率＝各装置の稼働率の積',
            steps:[`${a}×${b}＝${round(a*b,4)}`,`${round(a*b,4)}×100＝${correct}%`],
            explanation:'直列では両方が同時に動作する必要があるため、稼働率を掛け合わせます。'
          };
        }
      });
    }
    if(!KenteiTemplateEngine.has('CAL-AVAIL-PARALLEL')){
      KenteiTemplateEngine.register({
        type:'CAL-AVAIL-PARALLEL',category:'テクノロジ系',topic:'稼働率',
        generate({rng}){
          const a=rng.pick([0.8,0.85,0.9,0.92,0.95,0.98]),b=rng.pick([0.8,0.85,0.9,0.92,0.95,0.98]);
          const correct=percent(1-(1-a)*(1-b));
          const wrong=[percent(a*b),percent((a+b)/2),percent((1-a)*(1-b))];
          const format=v=>`${round(v,1)}%`;
          return{
            values:{a,b},
            question:`稼働率${a*100}%の装置Aと、稼働率${b*100}%の装置Bを並列に接続し、どちらか一方が動けばよい。全体の稼働率は何%か。`,
            answer:correct,answerLabel:format(correct),choices:uniqueChoices(correct,wrong,format),
            formula:'並列システムの稼働率＝1－（両方が停止する確率）',
            steps:[`A停止＝1－${a}＝${round(1-a,2)}`,`B停止＝1－${b}＝${round(1-b,2)}`,`1－（${round(1-a,2)}×${round(1-b,2)}）＝${round(correct/100,4)}`,`＝${correct}%`],
            explanation:'並列では両方が同時に停止したときだけ全体が止まるため、その確率を1から引きます。'
          };
        }
      });
    }
  }
  function generateAvailabilityQuestions(){
    registerAvailabilityTemplates();
    const types=['CAL-AVAIL-MTBF','CAL-AVAIL-SERIES','CAL-AVAIL-PARALLEL'],generated=[];
    for(let set=0;set<4;set++)types.forEach(type=>generated.push(KenteiTemplateEngine.generate(type,KenteiRandomEngine.createSeed())));
    return generated;
  }
  q.push(...generateAvailabilityQuestions());

  // 投資回収・ROI：Ver3.1-3 シード付きランダム生成
  function registerInvestmentTemplates(){
    if(!KenteiTemplateEngine.has('CAL-INVEST-PAYBACK')){
      KenteiTemplateEngine.register({
        type:'CAL-INVEST-PAYBACK',category:'ストラテジ系',topic:'投資回収',
        generate({rng}){
          const years=rng.pick([2,2.5,3,4,5,6,8]),annual=rng.step(1000000,6000000,500000);
          const investment=money(annual*years),correct=years;
          const wrong=[round(annual/investment,1),round(investment-annual,1),round(investment/(annual*12),1)];
          const format=v=>`${round(v,1)}年`;
          return{
            values:{investment,annual},
            question:`${investment.toLocaleString()}円を投資し、毎年${annual.toLocaleString()}円の効果が得られる。単純回収期間は何年か。`,
            answer:correct,answerLabel:format(correct),choices:uniqueChoices(correct,wrong,format),
            formula:'回収期間＝投資額÷年間効果額',
            steps:[`${investment.toLocaleString()}÷${annual.toLocaleString()}＝${correct}年`],
            explanation:'年間効果額が何年分あれば投資額に届くかを求めます。'
          };
        }
      });
    }
    if(!KenteiTemplateEngine.has('CAL-INVEST-ROI')){
      KenteiTemplateEngine.register({
        type:'CAL-INVEST-ROI',category:'ストラテジ系',topic:'投資回収',
        generate({rng}){
          const roi=rng.pick([0.1,0.15,0.2,0.25,0.3,0.4,0.5]),investment=rng.step(5000000,30000000,1000000);
          const profit=money(investment*roi),correct=percent(profit/investment);
          const wrong=[percent(investment/profit),round(profit/investment,1),percent((profit-investment)/investment)];
          const format=v=>`${round(v,1)}%`;
          return{
            values:{profit,investment},
            question:`投資額${investment.toLocaleString()}円に対して利益が${profit.toLocaleString()}円だった。ROIは何%か。`,
            answer:correct,answerLabel:format(correct),choices:uniqueChoices(correct,wrong,format),
            formula:'ROI＝利益÷投資額×100',
            steps:[`${profit.toLocaleString()}÷${investment.toLocaleString()}＝${round(profit/investment,2)}`,`${round(profit/investment,2)}×100＝${correct}%`],
            explanation:'投資額に対して利益がどの程度の割合になったかを求めます。'
          };
        }
      });
    }
  }
  function generateInvestmentQuestions(){
    registerInvestmentTemplates();
    const types=['CAL-INVEST-PAYBACK','CAL-INVEST-ROI'],generated=[];
    for(let set=0;set<4;set++)types.forEach(type=>generated.push(KenteiTemplateEngine.generate(type,KenteiRandomEngine.createSeed())));
    return generated;
  }
  q.push(...generateInvestmentQuestions());

  // SQL基本：SELECT・WHERE・ORDER BY
  function sqlCode(value){return String(value).replace(/\s+/g,' ').trim()}
  function generateSqlQuestions(){
    const tables=[
      {table:'社員',columns:['社員番号','氏名','年齢','部署'],valueColumn:'年齢'},
      {table:'商品',columns:['商品番号','商品名','価格','在庫数'],valueColumn:'価格'},
      {table:'注文',columns:['注文番号','顧客名','金額','注文日'],valueColumn:'金額'},
      {table:'書籍',columns:['書籍番号','書籍名','価格','著者'],valueColumn:'価格'}
    ];
    const questions=[];
    for(let set=0;set<4;set++){
      const seed=KenteiRandomEngine.createSeed(),rng=KenteiRandomEngine.create(`SQL:${seed}:${set}`);
      const data=rng.pick(tables),selected=rng.sample(data.columns,2);

      const selectAnswer=sqlCode(`SELECT ${selected.join(', ')} FROM ${data.table};`);
      questions.push(makeTextQuestion({
        id:`SQL-SELECT-${seed}`,seed,templateType:'SQL-SELECT',category:'テクノロジ系',topic:'SQL',
        question:`${data.table}テーブルから「${selected.join('」と「')}」だけを取得するSQL文はどれか。`,
        answerLabel:selectAnswer,
        wrongLabels:[sqlCode(`SELECT * FROM ${data.table};`),sqlCode(`FROM ${data.table} SELECT ${selected.join(', ')};`),sqlCode(`SELECT ${selected.join(' AND ')} FROM ${data.table};`)],
        formula:'SELECT 列名 FROM テーブル名;',
        steps:[`取得する列：${selected.join(', ')}`,`対象テーブル：${data.table}`,selectAnswer],
        explanation:'必要な列名をSELECTの後ろへカンマ区切りで書き、FROMの後ろにテーブル名を書きます。'
      }));

      const threshold=rng.step(1000,100000,1000);
      const whereAnswer=sqlCode(`SELECT * FROM ${data.table} WHERE ${data.valueColumn} >= ${threshold};`);
      questions.push(makeTextQuestion({
        id:`SQL-WHERE-${seed}`,seed,templateType:'SQL-WHERE',category:'テクノロジ系',topic:'SQL',
        question:`${data.table}テーブルから、${data.valueColumn}が${threshold.toLocaleString()}以上の行をすべて取得するSQL文はどれか。`,
        answerLabel:whereAnswer,
        wrongLabels:[sqlCode(`SELECT * FROM ${data.table} WHERE ${data.valueColumn} <= ${threshold};`),sqlCode(`SELECT * FROM ${data.table} HAVING ${data.valueColumn} >= ${threshold};`),sqlCode(`SELECT * WHERE ${data.valueColumn} >= ${threshold} FROM ${data.table};`)],
        formula:'SELECT * FROM テーブル名 WHERE 条件;',
        steps:[`条件：${data.valueColumn} >= ${threshold}`,whereAnswer],
        explanation:'行を条件で絞り込むときはWHERE句を使います。以上は >= で表します。'
      }));

      const direction=rng.bool()?'DESC':'ASC',directionText=direction==='DESC'?'大きい順':'小さい順';
      const orderAnswer=sqlCode(`SELECT * FROM ${data.table} ORDER BY ${data.valueColumn} ${direction};`);
      questions.push(makeTextQuestion({
        id:`SQL-ORDER-${seed}`,seed,templateType:'SQL-ORDER',category:'テクノロジ系',topic:'SQL',
        question:`${data.table}テーブルの全行を、${data.valueColumn}の${directionText}に並べて取得するSQL文はどれか。`,
        answerLabel:orderAnswer,
        wrongLabels:[sqlCode(`SELECT * FROM ${data.table} GROUP BY ${data.valueColumn} ${direction};`),sqlCode(`SELECT * FROM ${data.table} ORDER ${data.valueColumn} ${direction};`),sqlCode(`SELECT * FROM ${data.table} ORDER BY ${data.valueColumn} ${direction==='DESC'?'ASC':'DESC'};`)],
        formula:'SELECT * FROM テーブル名 ORDER BY 列名 ASCまたはDESC;',
        steps:[`並べ替える列：${data.valueColumn}`,`順序：${directionText}（${direction}）`,orderAnswer],
        explanation:'並べ替えにはORDER BYを使います。ASCは昇順、DESCは降順です。'
      }));
    }
    return questions;
  }
  q.push(...generateSqlQuestions());

  // CPU・通信・容量：Ver3.1-4 シード付きランダム生成
  function registerTechnologyTemplates(){
    if(!KenteiTemplateEngine.has('CAL-CPU-CPI')){
      KenteiTemplateEngine.register({
        type:'CAL-CPU-CPI',category:'テクノロジ系',topic:'CPU',
        generate({rng}){
          const cpi=rng.pick([1,2,2.5,4,5,8]);
          const instructions=rng.pick([2,3,4,5,6,8,10]);
          const clockGHz=round(instructions*cpi/10,2);
          const correct=round((clockGHz*10)/cpi,2);
          const wrong=[round(clockGHz*10*cpi,2),round(clockGHz/cpi,2),round(cpi/(clockGHz*10),2)];
          const format=v=>`${round(v,2)}億命令`;
          return{
            values:{clockGHz,cpi},
            question:`クロック周波数が${clockGHz}GHz、平均CPIが${cpi}のCPUは、1秒間に平均何億命令を実行できるか。`,
            answer:correct,answerLabel:format(correct),choices:uniqueChoices(correct,wrong,format),
            formula:'1秒当たり命令数＝クロック周波数÷平均CPI',
            steps:[`${clockGHz}GHz＝${clockGHz*10}億クロック/秒`,`${clockGHz*10}÷${cpi}＝${correct}億命令/秒`],
            explanation:'1秒当たりのクロック数を、1命令に必要な平均クロック数で割ります。'
          };
        }
      });
    }
    if(!KenteiTemplateEngine.has('CAL-NET-TIME')){
      KenteiTemplateEngine.register({
        type:'CAL-NET-TIME',category:'テクノロジ系',topic:'通信',
        generate({rng}){
          const mb=rng.step(20,500,20),mbps=rng.pick([10,20,40,50,80,100,200]);
          const efficiency=rng.pick([0.5,0.6,0.7,0.75,0.8,0.9]);
          const correct=round((mb*8)/(mbps*efficiency),1);
          const wrong=[round(mb/(mbps*efficiency),1),round((mb*8)/mbps,1),round((mb*8)*mbps*efficiency,1)];
          const format=v=>`${round(v,1)}秒`;
          return{
            values:{mb,mbps,efficiency},
            question:`${mb}MBのファイルを、伝送速度${mbps}Mbps、伝送効率${efficiency*100}%の回線で送る。伝送時間は何秒か。1MB＝8Mbitとする。`,
            answer:correct,answerLabel:format(correct),choices:uniqueChoices(correct,wrong,format),
            formula:'伝送時間＝データ量（bit）÷実効伝送速度',
            steps:[`データ量＝${mb}×8＝${mb*8}Mbit`,`実効速度＝${mbps}×${efficiency}＝${round(mbps*efficiency,2)}Mbps`,`${mb*8}÷${round(mbps*efficiency,2)}＝${correct}秒`],
            explanation:'Byteをbitへ変換し、伝送効率を反映した実効速度で割ります。'
          };
        }
      });
    }
    if(!KenteiTemplateEngine.has('CAL-STORAGE-IMAGE')){
      KenteiTemplateEngine.register({
        type:'CAL-STORAGE-IMAGE',category:'テクノロジ系',topic:'容量',
        generate({rng}){
          const width=rng.pick([640,800,1024,1280,1920]),height=rng.pick([480,600,768,720,1080]);
          const bits=rng.pick([8,16,24,32]),frames=rng.pick([24,30,60]),seconds=rng.pick([5,10,15,30]);
          const correct=round(width*height*bits*frames*seconds/8000000,1);
          const wrong=[round(width*height*bits*seconds/8000000,1),round(width*height*frames*seconds/8000000,1),round(width*height*bits*frames*seconds/1000000,1)];
          const format=v=>`${round(v,1)}MB`;
          return{
            values:{width,height,bits,frames,seconds},
            question:`解像度${width}×${height}、1画素${bits}ビット、毎秒${frames}フレームの非圧縮動画を${seconds}秒記録する。データ量は約何MBか。1MB＝8,000,000ビットとする。`,
            answer:correct,answerLabel:format(correct),choices:uniqueChoices(correct,wrong,format),
            formula:'データ量＝横×縦×色深度×フレーム数×時間÷8,000,000',
            steps:[`${width}×${height}×${bits}×${frames}×${seconds}`,`＝${(width*height*bits*frames*seconds).toLocaleString()}ビット`,`÷8,000,000＝${correct}MB`],
            explanation:'1画面のビット数にフレーム数と秒数を掛け、最後にMBへ換算します。'
          };
        }
      });
    }
  }
  function generateTechnologyQuestions(){
    registerTechnologyTemplates();
    const types=['CAL-CPU-CPI','CAL-NET-TIME','CAL-STORAGE-IMAGE'],generated=[];
    for(let set=0;set<4;set++)types.forEach(type=>generated.push(KenteiTemplateEngine.generate(type,KenteiRandomEngine.createSeed())));
    return generated;
  }
  q.push(...generateTechnologyQuestions());

  // SQL応用：JOIN・GROUP BY・HAVING・集計・INSERT・UPDATE・DELETE
  function generateAdvancedSqlQuestions(){
    const questions=[];
    for(let set=0;set<3;set++){
      const seed=KenteiRandomEngine.createSeed();
      const rng=KenteiRandomEngine.create(`SQL-ADV:${seed}:${set}`);

      const joinAnswer='SELECT 社員.氏名, 部署.部署名 FROM 社員 INNER JOIN 部署 ON 社員.部署ID = 部署.部署ID;';
      questions.push(makeTextQuestion({
        id:`SQL-JOIN-${seed}`,seed,templateType:'SQL-JOIN',category:'テクノロジ系',topic:'SQL',
        question:'社員テーブルと部署テーブルを部署IDで内部結合し、社員の氏名と部署名を取得するSQL文はどれか。',
        answerLabel:joinAnswer,
        wrongLabels:[
          'SELECT 社員.氏名, 部署.部署名 FROM 社員 GROUP BY 部署 ON 社員.部署ID = 部署.部署ID;',
          'SELECT 社員.氏名, 部署.部署名 FROM 社員 INNER JOIN 部署 WHERE 社員.部署ID = 部署.部署ID;',
          'SELECT 社員.氏名, 部署.部署名 FROM 社員 INNER JOIN 部署 ON 社員.社員ID = 部署.部署ID;'
        ],
        formula:'SELECT 列 FROM 表1 INNER JOIN 表2 ON 結合条件;',
        steps:['結合する表：社員、部署','結合条件：社員.部署ID = 部署.部署ID',joinAnswer],
        explanation:'INNER JOINの後に結合先テーブルを書き、ONの後に対応する列同士の条件を書きます。'
      }));

      const groupAnswer='SELECT 部署, COUNT(*) FROM 社員 GROUP BY 部署;';
      questions.push(makeTextQuestion({
        id:`SQL-GROUP-${seed}`,seed,templateType:'SQL-GROUP',category:'テクノロジ系',topic:'SQL',
        question:'社員テーブルを部署ごとにまとめ、各部署の人数を取得するSQL文はどれか。',
        answerLabel:groupAnswer,
        wrongLabels:[
          'SELECT 部署, COUNT(*) FROM 社員 ORDER BY 部署;',
          'SELECT 部署, COUNT(*) FROM 社員 WHERE 部署;',
          'SELECT COUNT(部署) FROM 社員 HAVING 部署;'
        ],
        formula:'SELECT グループ列, 集計関数 FROM テーブル GROUP BY グループ列;',
        steps:['グループ列：部署','集計：COUNT(*)',groupAnswer],
        explanation:'部署ごとにまとめるにはGROUP BYを使い、各グループの件数はCOUNT(*)で求めます。'
      }));

      const limit=rng.int(2,8);
      const havingAnswer=`SELECT 部署, COUNT(*) FROM 社員 GROUP BY 部署 HAVING COUNT(*) >= ${limit};`;
      questions.push(makeTextQuestion({
        id:`SQL-HAVING-${seed}`,seed,templateType:'SQL-HAVING',category:'テクノロジ系',topic:'SQL',
        question:`社員テーブルを部署ごとに集計し、人数が${limit}人以上の部署だけを取得するSQL文はどれか。`,
        answerLabel:havingAnswer,
        wrongLabels:[
          `SELECT 部署, COUNT(*) FROM 社員 WHERE COUNT(*) >= ${limit} GROUP BY 部署;`,
          `SELECT 部署, COUNT(*) FROM 社員 GROUP BY 部署 WHERE COUNT(*) >= ${limit};`,
          `SELECT 部署, COUNT(*) FROM 社員 HAVING COUNT(*) >= ${limit};`
        ],
        formula:'GROUP BYで集計した結果の条件指定にはHAVINGを使う',
        steps:['部署ごとにGROUP BY','人数をCOUNT(*)で集計',`HAVING COUNT(*) >= ${limit}`,havingAnswer],
        explanation:'集計前の行条件はWHERE、GROUP BY後の集計結果に対する条件はHAVINGを使います。'
      }));

      const aggregate=rng.pick([
        {name:'平均',func:'AVG',column:'価格'},
        {name:'合計',func:'SUM',column:'金額'},
        {name:'最大値',func:'MAX',column:'価格'},
        {name:'最小値',func:'MIN',column:'価格'}
      ]);
      const table=aggregate.column==='金額'?'注文':'商品';
      const aggregateAnswer=`SELECT ${aggregate.func}(${aggregate.column}) FROM ${table};`;
      questions.push(makeTextQuestion({
        id:`SQL-AGG-${seed}`,seed,templateType:'SQL-AGG',category:'テクノロジ系',topic:'SQL',
        question:`${table}テーブルの${aggregate.column}の${aggregate.name}を求めるSQL文はどれか。`,
        answerLabel:aggregateAnswer,
        wrongLabels:[
          `SELECT COUNT(${aggregate.column}) FROM ${table};`,
          `SELECT ${aggregate.column}(${aggregate.func}) FROM ${table};`,
          `SELECT ${aggregate.func}(*) FROM ${table};`
        ],
        formula:'SELECT 集計関数(列名) FROM テーブル名;',
        steps:[`集計関数：${aggregate.func}`,`対象列：${aggregate.column}`,aggregateAnswer],
        explanation:'求めたい集計内容に対応する関数を列名へ適用します。'
      }));

      const insertAnswer="INSERT INTO 商品 (商品番号, 商品名, 価格) VALUES (101, 'マウス', 3000);";
      questions.push(makeTextQuestion({
        id:`SQL-INSERT-${seed}`,seed,templateType:'SQL-INSERT',category:'テクノロジ系',topic:'SQL',
        question:'商品テーブルに、商品番号101、商品名「マウス」、価格3000の行を追加するSQL文はどれか。',
        answerLabel:insertAnswer,
        wrongLabels:[
          "UPDATE 商品 (商品番号, 商品名, 価格) VALUES (101, 'マウス', 3000);",
          "INSERT 商品 INTO (商品番号, 商品名, 価格) VALUES (101, 'マウス', 3000);",
          "INSERT INTO 商品 SET (101, 'マウス', 3000);"
        ],
        formula:'INSERT INTO テーブル名 (列名...) VALUES (値...);',
        steps:['追加先：商品','列と値の順序を対応させる',insertAnswer],
        explanation:'行の追加にはINSERT INTOを使い、列名とVALUES内の値を同じ順序で対応させます。'
      }));

      const updateAnswer="UPDATE 商品 SET 価格 = 3500 WHERE 商品番号 = 101;";
      questions.push(makeTextQuestion({
        id:`SQL-UPDATE-${seed}`,seed,templateType:'SQL-UPDATE',category:'テクノロジ系',topic:'SQL',
        question:'商品テーブルで、商品番号101の価格を3500へ変更するSQL文はどれか。',
        answerLabel:updateAnswer,
        wrongLabels:[
          "UPDATE 商品 WHERE 商品番号 = 101 SET 価格 = 3500;",
          "INSERT INTO 商品 SET 価格 = 3500 WHERE 商品番号 = 101;",
          "UPDATE 商品 SET 商品番号 = 101 WHERE 価格 = 3500;"
        ],
        formula:'UPDATE テーブル名 SET 列名 = 値 WHERE 条件;',
        steps:['更新先：商品','変更内容：価格 = 3500','対象：商品番号 = 101',updateAnswer],
        explanation:'UPDATEの後に表、SETで変更内容、WHEREで変更対象の行を指定します。'
      }));

      const deleteAnswer='DELETE FROM 商品 WHERE 商品番号 = 101;';
      questions.push(makeTextQuestion({
        id:`SQL-DELETE-${seed}`,seed,templateType:'SQL-DELETE',category:'テクノロジ系',topic:'SQL',
        question:'商品テーブルから、商品番号101の行だけを削除するSQL文はどれか。',
        answerLabel:deleteAnswer,
        wrongLabels:[
          'DELETE 商品 FROM WHERE 商品番号 = 101;',
          'DROP FROM 商品 WHERE 商品番号 = 101;',
          'DELETE FROM 商品 SET 商品番号 = 101;'
        ],
        formula:'DELETE FROM テーブル名 WHERE 条件;',
        steps:['削除先：商品','対象：商品番号 = 101',deleteAnswer],
        explanation:'特定の行を削除するときはDELETE FROMとWHEREを使います。WHEREを省くと全行が対象になります。'
      }));
    }
    return questions;
  }
  q.push(...generateAdvancedSqlQuestions());

  window.CALCULATION_QUESTIONS=q;
  window.CALCULATION_VALIDATION={
    total:q.length,
    valid:q.every(item=>
      item.choices.length===4 &&
      item.choices.filter(c=>c.label===item.answerLabel).length===1 &&
      item.steps.length>0
    )
  };

  if(!window.CALCULATION_VALIDATION.valid){
    throw new Error('計算問題データの検証に失敗しました');
  }
})();
