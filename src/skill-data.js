/** @typedef {'str'|'spd'|'end'} SkillKey */

/* Cechy (PERKI.md): at levels 5, 10 and 15 of an attribute the player picks one of two traits. They are always on and
   cost no points; the attribute's points go to its punches (CIOSY.md §3). What each trait does in a brawl is its
   PERK_CARDS entry in card-data.js; ids of the older perks are kept for saves and rivals. */

/** Attribute levels that open a trait slot. */
export const TRAIT_LEVELS = [5,10,15];

/** The two traits of each slot of each attribute: [A, B]. @type {Record<SkillKey,[string,string][]>} */
export const TRAITS = {
  str:[['bone-on-bone','cutter'],['forearm','knockout'],['shoulder','headsman']],
  spd:[['lucky-slip','counterpuncher'],['ghost','momentum'],['overreach','the-zone']],
  end:[['bull-neck','economist'],['spiked-guard','shell'],['last-stand','grinder']],
};

/** Display names of the traits. @type {Record<string,string>} */
export const TRAIT_NAMES = {
  'bone-on-bone':'Kość w kość', cutter:'Rozcinacz', forearm:'Stłuczone przedramię', knockout:'Nokauter', shoulder:'Wybity bark', headsman:'Kat',
  'lucky-slip':'Szczęśliwy unik', counterpuncher:'Kontrbokser', ghost:'Duch', momentum:'Rozpęd', overreach:'Przelot', 'the-zone':'Strefa',
  'bull-neck':'Byczy kark', economist:'Ekonomista', 'spiked-guard':'Kolczasta garda', shell:'Skorupa', 'last-stand':'Ostatni bastion', grinder:'Tempo młyna',
};

/** The character of the two ways in each attribute (PERKI.md §3). @type {Record<SkillKey,[string,string]>} */
export const TRAIT_WAYS = {
  str:['łamie rywala na raty','kończy szybko'],
  spd:['uniki i kontry','własne tempo i czytanie'],
  end:['wytrzymuje i oddaje','wygrywa kondycją'],
};
