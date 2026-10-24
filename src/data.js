import { LEGACY_BAG_IDS } from './legacy-save-data.js';

export /* =====================================================================
   GEAR / SKINS — trunks, gloves and boots are pure data (3-tone ramps + a style).
   The skeleton, IK and every animation stay the same; the renderer just reads
   the equipped ramps from PAL slots and a few style switches.
   ===================================================================== */
const GEAR={
  trunks:[
    {id:'t_royal',  name:'Royal Blue',     base:['#162a7a','#2b4fd6','#6a8cff'], trim:['#8a93b0','#e2e6f0','#ffffff'], acc:['#8a93b0','#e2e6f0','#ffffff'], style:'stripe'},
    {id:'t_crimson',name:'Crimson Gold',   base:['#6e0f1e','#b3182c','#e8404f'], trim:['#8a6a1a','#d9a93a','#ffe08a'], acc:['#8a6a1a','#d9a93a','#ffe08a'], style:'stripe'},
    {id:'t_emerald',name:'Emerald',        base:['#0c4a2c','#168a4a','#3fd07a'], trim:['#8a93b0','#e2e6f0','#ffffff'], acc:['#8a93b0','#e2e6f0','#ffffff'], style:'plain'},
    {id:'t_blackgold',name:'Black & Gold', base:['#0e0c16','#23212f','#45435b'], trim:['#8a6a1a','#d9a93a','#ffe08a'], acc:['#8a6a1a','#d9a93a','#ffe08a'], style:'panel'},
    {id:'t_purple', name:'Royal Purple',   base:['#2e0f5c','#5a24a8','#9a66ff'], trim:['#8a6a1a','#d9a93a','#ffe08a'], acc:['#1e0a40','#3e1878','#6a40c0'], style:'check'},
    {id:'t_polka',  name:'Polka Pink',     base:['#7a1a4a','#d63f8a','#ff8ac4'], trim:['#8a93b0','#e2e6f0','#ffffff'], acc:['#8a93b0','#e2e6f0','#ffffff'], style:'dots'},
    {id:'t_inferno',name:'Inferno',        base:['#0e0c16','#23212f','#45435b'], trim:['#7a2a0a','#e0601a','#ffb020'], acc:['#b8300a','#ff7a1a','#ffd23f'], style:'flames'},
  ],
  gloves:[
    {id:'g_crimson',name:'Crimson',        base:['#6e0f1e','#c8182f','#ff4d5e'], cuff:['#8a93b0','#e2e6f0','#ffffff'], acc:['#6e0f1e','#c8182f','#ff4d5e'], style:'classic'},
    {id:'g_black',  name:'Midnight',       base:['#0d0d14','#26263a','#50506e'], cuff:['#8a93b0','#e2e6f0','#ffffff'], acc:['#0d0d14','#26263a','#50506e'], style:'classic'},
    {id:'g_neon',   name:'Neon',           base:['#2a6a0a','#5ad01a','#b0ff5a'], cuff:['#0d0d14','#26263a','#50506e'], acc:['#2a6a0a','#5ad01a','#b0ff5a'], style:'classic'},
    {id:'g_twotone',name:'Two-Tone',       base:['#162a7a','#2b4fd6','#6a8cff'], cuff:['#8a93b0','#e2e6f0','#ffffff'], acc:['#8a93b0','#e2e6f0','#ffffff'], style:'twotone'},
    {id:'g_vintage',name:'Vintage Laced',  base:['#4a2a14','#8a5228','#c08048'], cuff:['#9a8a60','#dccb9a','#fff2cc'], acc:['#4a2a14','#8a5228','#c08048'], style:'laced'},
    {id:'g_gold',   name:'Gold Champ',     base:['#7a5a10','#d9a93a','#ffe08a'], cuff:['#8a93b0','#e2e6f0','#ffffff'], acc:['#7a5a10','#d9a93a','#ffe08a'], style:'laced'},
  ],
  boots:[
    {id:'b_white',  name:'White Classic',  base:['#8a93b0','#e2e6f0','#ffffff'], trim:['#1a1a24','#2e2e40','#50506e'], style:'mid'},
    {id:'b_blackred',name:'Black High-Top',base:['#0d0d14','#26263a','#50506e'], trim:['#6e0f1e','#c8182f','#ff4d5e'], style:'high'},
    {id:'b_redlow', name:'Red Low',        base:['#6e0f1e','#c8182f','#ff4d5e'], trim:['#8a93b0','#e2e6f0','#ffffff'], style:'low'},
    {id:'b_bluehigh',name:'Blue High-Top', base:['#162a7a','#2b4fd6','#6a8cff'], trim:['#8a93b0','#e2e6f0','#ffffff'], style:'high'},
    {id:'b_goldstripe',name:'Gold Stripe', base:['#8a93b0','#e2e6f0','#ffffff'], trim:['#8a6a1a','#d9a93a','#ffe08a'], style:'stripe'},
  ],

};

export const GEAR_BY_ID={};

for(const sl in GEAR) for(const it of GEAR[sl]){ it.slot=sl; GEAR_BY_ID[it.id]=it; }
for(const id of LEGACY_BAG_IDS) GEAR_BY_ID[id]={id,slot:'bag'};

export /* =====================================================================
   CHARACTER LOOK — skin & hair are ramps, hairstyle / face parts are small pixel
   recipes on the same head joint, so every animation keeps working.
   ===================================================================== */
const LOOK={
  skin:[
    {id:'s1',name:'Jasna',       ramp:['#b87a5e','#e8b08a','#ffd8b8']},
    {id:'s2',name:'Oliwkowa',    ramp:['#8a5a3a','#c68a5e','#eab48a']},
    {id:'s3',name:'Śniada',      ramp:['#7a3f2b','#b86b45','#e59c6b']},
    {id:'s4',name:'Brązowa',     ramp:['#5a2c1c','#8a4f32','#b87650']},
    {id:'s5',name:'Ciemna',      ramp:['#3a1c14','#5e3322','#8a5238']},
    {id:'s6',name:'B. ciemna',   ramp:['#24120c','#3e2218','#643a28']},
    {id:'hero',name:'Bohater',    ramp:['#a06a54','#d8a086','#f2c9ae']},
  ],
  hair:[
    {id:'h1',name:'Czarne',      ramp:['#110b0b','#1e1414','#3b2b2b']},
    {id:'h2',name:'Ciemny brąz', ramp:['#2a160c','#4a2a16','#704424']},
    {id:'h3',name:'Kasztan',     ramp:['#4a1e0c','#7a3818','#a85a2c']},
    {id:'h4',name:'Blond',       ramp:['#8a6a2a','#d0a850','#f4d890']},
    {id:'h5',name:'Rude',        ramp:['#6a2008','#b8481a','#e8783a']},
    {id:'h6',name:'Siwe',        ramp:['#6a6e7a','#a8acb8','#e0e4ec']},
    {id:'h7',name:'Platyna',     ramp:['#a8a490','#e0dcc4','#fffcec']},
    {id:'h8',name:'Niebieskie',  ramp:['#12245a','#2a4fb0','#5a8aff']},
    {id:'hero',name:'Popielaty brąz', ramp:['#3a2c20','#665038','#957a5a']},
  ],
  style:[{id:'short',name:'Krótkie'},{id:'buzz',name:'Na zero'},{id:'bald',name:'Łysy'},{id:'afro',name:'Afro'},{id:'hightop',name:'High-top'},{id:'mohawk',name:'Irokez'},{id:'ponytail',name:'Kucyk'},{id:'cornrows',name:'Warkoczyki'},{id:'fringe',name:'Grzywka'}],
  eyes:[{id:'normal',name:'Zwykłe'},{id:'narrow',name:'Zmrużone'},{id:'wide',name:'Szerokie'}],
  brows:[{id:'normal',name:'Zwykłe'},{id:'thick',name:'Grube'},{id:'angry',name:'Groźne'}],
  nose:[{id:'straight',name:'Prosty'},{id:'broken',name:'Złamany'},{id:'small',name:'Mały'}],
  facial:[{id:'none',name:'Brak'},{id:'stubble',name:'Zarost'},{id:'mustache',name:'Wąsy'},{id:'goatee',name:'Kozia bródka'},{id:'beard',name:'Broda'}],
  extra:[{id:'none',name:'Brak'},{id:'scar',name:'Blizna'},{id:'tape',name:'Plaster na nosie'},{id:'cut',name:'Rozcięcie na nosie'}],
};

/** The one hero of the game: his head is fixed (no look editor). Straight ash-brown hair with a fringe to the brows,
 * stubble, a fresh cut across the bridge of the nose, tired eyes. */
export const HERO_LOOK={skin:'hero',hair:'hero',style:'fringe',eyes:'narrow',brows:'normal',nose:'straight',facial:'stubble',extra:'cut'};
export const LOOK_DEFAULT={skin:'s3',hair:'h1',style:'short',eyes:'normal',brows:'normal',nose:'straight',facial:'none',extra:'none'};

export const MOVE_PL=['JAB','CROSS','HOOK','UPPERCUT','UNIK'];

export /* =====================================================================
   SIM LAYER — a day clock + four needs (0-100), stored in save.sim.
   Time only moves when something happens: training (20 game minutes per real minute,
   scaled by intensity), travel (30 min), meals, rest and sleep. Idle walking = frozen clock.
     e energia (sleep, rest)   f najedzenie (meals)   r regeneracja (rest, sleep)   h higiena (shower)
   Effects (moderate): low energy / food / recovery cut training XP (up to -40 %) and the starting
   stamina in sparring (up to -35 %); rested + fed + clean = "W formie" +10 % XP.
   ===================================================================== */
const SIM_DEF={day:1,min:8*60,faza:0,akcje:0,zm:0,glod:0,h:80};

export /* ---------- STATS: Siła / Szybkość / Wytrzymałość (levels 1-30, earned in training; see stats.js) ----------
   Siła  -> punch power (card-fight damage and stun)
   Szybkość -> animation speed of every move (punches, recovery, footwork)
   Wytrzymałość -> stamina capacity, regeneration, wear of the ceiling, recovery between rounds
   XP: pompki, podciąganie, cień, praca w rzeźni i bójki kartami */
const STAT_MAX=30, STAT_KEYS=['str','spd','end'], STAT_PL={str:'Siła',spd:'Szybkość',end:'Wytrzymałość'};

export const STAT_DESC={str:'moc ciosów, ogłuszenie i nacisk na gardę',spd:'tempo ciosów, praca nóg i powrót do gardy',end:'kondycja, zdrowie, szczęka i energia na treningu'};

