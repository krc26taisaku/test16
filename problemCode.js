window.KenteiProblemCode=(()=>{
  const TYPE_PATTERN=/^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*$/;
  const SEED_PATTERN=/^[0-9]{1,30}$/;

  function normalizeType(type){
    return String(type||'').trim().toUpperCase();
  }

  function normalizeSeed(seed){
    return String(seed??'').trim();
  }

  function create(type,seed){
    const normalizedType=normalizeType(type);
    const normalizedSeed=normalizeSeed(seed);
    if(!TYPE_PATTERN.test(normalizedType))throw new Error('問題タイプが不正です');
    if(!SEED_PATTERN.test(normalizedSeed))throw new Error('シードは数字で入力してください');
    return `${normalizedType}-${normalizedSeed}`;
  }

  function parse(code){
    const value=String(code||'').trim().toUpperCase();
    const match=value.match(/^(.+)-([0-9]{1,30})$/);
    if(!match)return null;
    const type=match[1],seed=match[2];
    if(!TYPE_PATTERN.test(type)||!SEED_PATTERN.test(seed))return null;
    return{type,seed,code:create(type,seed)};
  }

  function isValid(code){return Boolean(parse(code))}

  function generate(type,seed=KenteiRandomEngine.createSeed()){
    return create(type,seed);
  }

  function selfTest(){
    const code=create('CAL-BEP','483921');
    const parsed=parse(code);
    return{
      valid:code==='CAL-BEP-483921'&&parsed?.type==='CAL-BEP'&&parsed?.seed==='483921',
      code,
      parsed
    };
  }

  return{create,parse,isValid,generate,normalizeType,normalizeSeed,selfTest};
})();
