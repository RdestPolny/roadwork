/** Validation catalog for v1–v6 saves. These items are no longer gameplay locations or purchases. */
export const LEGACY_GYM_TYPES = {
  bag:{w:1,h:1,block:'circle'}, speedbag:{w:1,h:1,wall:true},
  ropemat:{w:2,h:2,flat:true,variants:[{},{},{}]},
  pushmat:{w:3,h:2,flat:true,rot:true,variants:[{},{},{}]},
  locker:{w:1,h:1,block:true,rot:true},
  ring:{w:5,h:5,block:true,max:1,variants:[{},{},{},{},{},{}]},
  bucket:{w:1,h:1,block:true,rot:true}, gbench:{w:2,h:1,block:true,rot:true},
  glamp:{w:1,h:1,block:true}, gplant:{w:1,h:1,block:true}
};
/** Retain old decor ownership while reading and writing an existing save. */
export const LEGACY_DECOR_BY_ID = {
  f_check:{kind:'floor'}, f_wood:{kind:'floor'}, w_blue:{kind:'wall'}, w_brick:{kind:'wall'}
};

export const LEGACY_BAG_IDS = ['k_cheap','k_vintage','k_pro','k_white','k_gold'];
