/** Optional hooks for the retired Smithfield prototype. The normal game never imports work.js.
 * Main registers the real API before exposing window.__boxer, but only under ?debug=1.
 * @type {Record<string, any>} */
export const diagnosticWork = Object.create(null);

/** @param {Record<string, any>} api */
export function registerDiagnosticWork(api){
  for(const name of ['initialize','startWork','workTick','renderWork','workReset','workKey','workHint','workTap','workStepKey','workEnd','workGo','wkSurf','wkStain','wkImpact','drawApron','drawCap','redrawLeadLeg']){
    if(typeof api[name]!=='function') throw new Error('Missing diagnostic work hook: '+name);
  }
  if(!api.state) throw new Error('Missing diagnostic work state');
  Object.assign(diagnosticWork,api);
}
