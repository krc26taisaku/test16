window.KenteiTemplateEngine=(()=>{
  const templates=new Map();

  function register(template){
    if(!template||typeof template!=='object')throw new TypeError('テンプレートが必要です');
    const type=KenteiProblemCode.normalizeType(template.type);
    if(!type)throw new Error('テンプレートtypeが必要です');
    if(typeof template.generate!=='function')throw new Error(`${type}: generate関数が必要です`);
    templates.set(type,{...template,type});
    return type;
  }

  function unregister(type){return templates.delete(KenteiProblemCode.normalizeType(type))}
  function has(type){return templates.has(KenteiProblemCode.normalizeType(type))}
  function list(){return[...templates.values()].map(t=>({type:t.type,topic:t.topic||'',category:t.category||''}))}

  function validate(problem){
    const errors=[];
    if(!problem||typeof problem!=='object')errors.push('問題データがありません');
    if(!problem?.id)errors.push('問題コードがありません');
    if(!KenteiProblemCode.isValid(problem?.id))errors.push('問題コードの形式が不正です');
    if(!problem?.seed)errors.push('シードがありません');
    if(!problem?.question)errors.push('問題文がありません');
    if(!problem?.answerLabel)errors.push('正解表示がありません');
    if(!Array.isArray(problem?.choices)||problem.choices.length!==4)errors.push('選択肢は4つ必要です');
    const labels=Array.isArray(problem?.choices)?problem.choices.map(x=>String(x.label)):[];
    if(new Set(labels).size!==labels.length)errors.push('選択肢が重複しています');
    if(labels.filter(x=>x===String(problem?.answerLabel)).length!==1)errors.push('正解は選択肢内に1つだけ必要です');
    if(!Array.isArray(problem?.steps)||!problem.steps.length)errors.push('途中式がありません');
    if(!problem?.formula)errors.push('公式がありません');
    if(!problem?.explanation)errors.push('解説がありません');
    return{valid:errors.length===0,errors};
  }

  function generate(type,seed=KenteiRandomEngine.createSeed(),options={}){
    const normalizedType=KenteiProblemCode.normalizeType(type);
    const template=templates.get(normalizedType);
    if(!template)throw new Error(`${normalizedType}: テンプレートが登録されていません`);
    const normalizedSeed=KenteiRandomEngine.normalizeSeed(seed);
    const rng=KenteiRandomEngine.create(`${normalizedType}:${normalizedSeed}`);
    const generated=template.generate({rng,seed:normalizedSeed,options,template});
    const problem={
      ...generated,
      templateType:normalizedType,
      seed:normalizedSeed,
      id:KenteiProblemCode.create(normalizedType,normalizedSeed),
      category:generated.category||template.category||'',
      topic:generated.topic||template.topic||''
    };
    const result=validate(problem);
    if(!result.valid)throw new Error(`${problem.id}: ${result.errors.join(' / ')}`);
    return problem;
  }

  function fromCode(code,options={}){
    const parsed=KenteiProblemCode.parse(code);
    if(!parsed)throw new Error('問題コードが不正です');
    return generate(parsed.type,parsed.seed,options);
  }

  function diagnostics(){
    const random=KenteiRandomEngine.selfTest();
    const code=KenteiProblemCode.selfTest();
    return{
      valid:random.valid&&code.valid,
      random,
      code,
      templateCount:templates.size
    };
  }

  return{register,unregister,has,list,generate,fromCode,validate,diagnostics};
})();
