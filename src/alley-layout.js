// Plan of the dark East End alley: the one source of truth for footprints (collisions in alley.js, art in alley-*.js).
// No imports, so every alley module can read it at load time.

/**
 * Alley plan in ground units (1 unit ≈ 0.8 m; a person is ~17 height units, radius of the body for collisions 0.24).
 * i runs along the alley from the blind end (i=0: brick wall and iron gate) to the street mouth (i=I, cut away, the hero starts here).
 * j runs across it from the tall tenement wall (j=0) to the near side (j=J, cut away like the pub front: only low things stand there).
 * On screen: the corner i=0,j=0 is at the top; +i goes down-right, +j goes down-left.
 * Heights z are in px (≈ 1 unit of height); wall H=64 means three storeys (ground 0-24, first 26-44, second 46-62).
 * The width J is constant: tight spots come from solids entering the rectangle (bays, stairs, stacks), never from changing J.
 * The free lane at any cross-section i is never narrower than 1.2 units (tests/alley-layout.test.js checks it).
 * Boxes are [i0,j0,i1,j1] footprints; art must stay inside them. solid:false boxes are walkable (mats, grates).
 * Lamp radius is in ground units. Gutter: a shallow V channel along j=3.4 from the mouth to the drain at i=6.
 *
 * Sightlines: from the mouth (i=33,j=3.4) the eye runs down the gutter line j=3.4; the biggest masses sit on j<=2.3 (wall side)
 * or j>=4.8 (near side), so the centre of the alley stays open all the way to the gate; the arch (i 18-21.5) frames the court
 * lamp at i=13, which in turn frames the gate lamp at i~1.4. Nothing taller than 14 stands in j 2.4-4.7 except the pump (z 14, i 14.2-15).
 */
export const ALLEY={
  I:34, J:6.8, H:64,
  hero:{i:33,j:3.4,fi:-1,fj:0},
  exit:{j0:1.2,j1:6.8},                                   // street mouth in the cut-away end i=I
  deadEnd:{j0:1.4,j1:5.4,gate:{box:[0,1.4,.5,5.4],z:36,closed:true,kind:'iron-gate',bars:9,arch:true}}, // barred gate into a back yard, wall i=0 is brick around it
  boxes:[
    // mouth (i 29.6-34)
    {id:'bin-mouth',box:[32,6,32.8,6.8],kind:'bin',z:6,solid:true},
    {id:'crates-mouth',box:[30,5.8,31.4,6.8],kind:'crate',z:8,solid:true,note:'two crates, one on the other'},
    {id:'pilaster-mouth',box:[31.2,0,32.6,.8],kind:'bay',z:24,solid:true,note:'shopfront pilaster'},
    // doors (i 22-30)
    {id:'steps-14',box:[28.6,0,30,.8],kind:'steps',z:4,solid:true,note:'two worn steps to door no. 14'},
    {id:'mat-14',box:[28.9,.8,29.8,1.4],kind:'mat',z:1,solid:false},
    {id:'barrels-a',box:[26.4,5.9,27.3,6.8],kind:'barrel',z:11,solid:true},
    {id:'barrels-b',box:[27.3,6,28.1,6.8],kind:'barrel',z:11,solid:true},
    {id:'grate-street',box:[26,2,26.8,2.6],kind:'grate',z:0,solid:false,note:'cellar light grate in the cobbles'},
    {id:'cart',box:[23.4,0,25.6,1.5],kind:'cart',z:9,solid:true,note:'handcart tipped against the wall, shafts down'},
    {id:'bin-doors',box:[22.2,6.1,23,6.8],kind:'bin',z:6,solid:true},
    // narrowing under the bridge (i 17.5-22)
    {id:'bay-bridge',box:[17.6,0,22,2.3],kind:'bay',z:44,solid:true,note:'projecting oriel / bridge pier on the wall side'},
    {id:'stack-bridge',box:[18.2,4.8,20.4,6.8],kind:'stack',z:14,solid:true,note:'stack of crates and a coil of rope'},
    {id:'barrel-bridge',box:[20.7,5.9,21.6,6.8],kind:'barrel',z:11,solid:true},
    // court (i 8-16.5)
    {id:'pump',box:[14.2,3,15,3.8],kind:'pump',z:14,solid:true,note:'cast-iron street pump with trough'},
    {id:'cellar-stairs',box:[9.4,0,12.4,1.7],kind:'cellar',z:0,solid:true,note:'stairs down to a cellar, an open pit'},
    {id:'cellar-rail',box:[9.2,1.7,12.6,1.9],kind:'rail',z:8,solid:true,note:'iron railing along the cellar stairs'},
    {id:'barrels-court',box:[15.4,6,16.4,6.8],kind:'barrel',z:11,solid:true},
    {id:'crates-court',box:[8.2,6,9.6,6.8],kind:'crate',z:10,solid:true},
    {id:'grate-side',box:[6.6,0,8,.6],kind:'grate',z:22,solid:true,note:'iron grille over the narrow side passage (locked)'},
    // blind end (i 0-8)
    {id:'bin-end',box:[4.2,0,5,.9],kind:'bin',z:6,solid:true},
    {id:'stack-end',box:[4.6,5.4,6,6.8],kind:'crate',z:12,solid:true},
    {id:'heap',box:[1.6,0,3,1.2],kind:'heap',z:6,solid:true,note:'heap of rubbish and broken boards'},
    {id:'gate',box:[0,1.4,.5,5.4],kind:'gate',z:36,solid:true,note:'closed iron gate'},
    {id:'barrel-end',box:[2.8,6,3.7,6.8],kind:'barrel',z:11,solid:true},
    // --- additions from the concept (solid:false = drawn only, walkable) ---
    {id:'bollard-mouth',box:[33.6,6.3,34,6.7],kind:'bollard',z:7,solid:true,note:'iron bollard marking the street edge'},
    {id:'kerb-a',box:[28.1,6.5,29.4,6.8],kind:'kerb',z:3,solid:true,note:'low granite kerb on the near side'},
    {id:'kerb-b',box:[31.4,6.5,32,6.8],kind:'kerb',z:3,solid:true},
    {id:'fence-low',box:[21.65,6.5,22.15,6.8],kind:'fence',z:6,solid:true,note:'low broken picket fence on the near side'},
    {id:'tea-chest',box:[30.1,.9,31,1.7],kind:'crate',z:4,solid:true,note:'empty tea chest with the lid up, stamped TEA / LIVERPOOL / No. 9'},
    {id:'rain-barrel',box:[26.8,0,27.6,.8],kind:'barrel',z:10,solid:true,note:'rain barrel under the downpipe'},
    {id:'sacks',box:[28.4,5.2,29.6,6.1],kind:'sacks',z:6,solid:true,note:'slumped coal sacks'},
    {id:'grate-steam',box:[27.4,3.1,28.2,3.7],kind:'grate',z:0,solid:false,note:'drain grate that breathes steam'},
    {id:'washing-line',box:[22.2,.2,22.8,6.6],kind:'washing',z:24,solid:false,note:'grey washing on a sagging line across the alley, hangs at z 24, walkable under'},
    {id:'bench',box:[23.6,6,25,6.8],kind:'bench',z:5,solid:true,note:'bench with one broken leg'},
    {id:'coop',box:[25.1,6,26.1,6.8],kind:'crate',z:4,solid:true,note:'empty poultry coop, door ajar'},
    {id:'brazier-court',box:[12.6,5.9,13.5,6.8],kind:'brazier',z:9,solid:true,note:'iron coke basket on a tripod, glowing (fire-court)'},
    {id:'brazier-end',box:[3.75,5.9,4.55,6.8],kind:'brazier',z:9,solid:true,note:'iron coke basket on a tripod, glowing (fire-end)'},
    {id:'bracket-sign',box:[30.1,.05,31.1,.9],kind:'bracket',z:27,solid:false,note:'rusty smith bracket with an empty swinging board FORGE (animated)'},
    {id:'balls-pawn',box:[19.3,2.3,20.9,2.9],kind:'balls',z:41,solid:false,note:'three gilt balls on a bracket on the bay face, z 31-41'},
    {id:'trough',box:[15,3.1,16.2,3.7],kind:'trough',z:4,solid:true,note:'water trough beside the pump'},
    {id:'torn-grating',box:[13.5,.6,14.1,1.2],kind:'grate',z:0,solid:false,note:'torn-out grating of a cellar light'},
    {id:'ladder',box:[15.65,0,16,.8],kind:'ladder',z:18,solid:true,note:'ladder leaning on the wall'},
    {id:'bucket',box:[13.5,4.6,14,5.1],kind:'bucket',z:3,solid:true,note:'bucket and rags'},
    {id:'soil-pipe',box:[16.95,0,17.35,.35],kind:'pipe',z:34,solid:false,note:'sooty soil pipe on the wall'},
    {id:'downpipe',box:[12.7,0,13,.3],kind:'pipe',z:40,solid:false,note:'leaking downpipe; drips into the big puddle (see drips)'},
    {id:'bracket-broken',box:[11.5,0,11.9,.5],kind:'bracket',z:20,solid:false,note:'smashed gas bracket without a flame'},
    {id:'cart-broken',box:[9.2,4,10.6,4.9],kind:'cart',z:7,solid:true,note:'handcart missing a wheel, tilted'},
    {id:'barrel-over',box:[6.3,4.3,7.3,5.3],kind:'barrel',z:6,solid:true,note:'overturned barrel with a spill'},
    {id:'ash-heap',box:[5.1,0,6.5,1.2],kind:'heap',z:5,solid:true,note:'ash heap with bones and rags; a plume of steam from the chimney above'},
    {id:'skylight',box:[7.8,3.9,8.8,4.6],kind:'skylight',z:1,solid:false,note:'dirty cellar skylight lit faintly from below'},
  ],
  lamps:[
    {id:'lamp-mouth',kind:'bracket',i:31.9,j:.85,z:26,lit:true,color:'#ffb347',radius:8,flicker:.3,side:'wall',face:'pilaster-mouth',mode:'steady',note:'the only gas bracket at the mouth, on the pilaster; street light spilling in'},
    {id:'lamp-lodging',kind:'bracket',i:12.7,j:.3,z:26,lit:true,color:'#d98a2e',radius:7,flicker:.8,side:'wall',mode:'gutter',note:'L2: gas bracket over the lodging door, sputters, goes out for ~0.4 s every 40-70 s'},
    {id:'lamp-stable',kind:'lantern',i:3.1,j:.3,z:18,lit:true,color:'#d8a85a',radius:3,flicker:.7,side:'wall',mode:'gutter',note:'tallow-candle stable lantern on a hook beside the boarded stable doors (door-end); weak, swaying'},
    {id:'lamp-broken',kind:'bracket',i:11.7,j:.3,z:20,lit:false,color:'#c8a060',radius:0,flicker:0,side:'wall',mode:'dead',note:'the one dead bracket kept as a trace: smashed globe, soot above'},
  ],
  fires:[
    {id:'fire-court',i:13.05,j:6.35,z:7,color:'#e0762a',halo:'#a23c18',radius:7,flicker:.7,mode:'fire',note:'coke brazier in the court (where the street lamp used to be)'},
    {id:'fire-end',i:4.15,j:6.35,z:7,color:'#e0762a',halo:'#a23c18',radius:6,flicker:.6,mode:'fire',note:'coke brazier of a night watchman / rag-and-bone man near the gate'},
  ],
  doors:[
    {id:'door-pawn',i0:17.95,i1:18.95,z:14,kind:'shuttered',face:'bay-bridge',note:'iron-shuttered pawnbroker door with a padlock'},
    {id:'door-lodging',i0:12.25,i1:13.15,z:24,kind:'lodging'},
    {id:'door-14',i0:28.8,i1:29.9,z:24,kind:'numbered',number:'14'},
    {id:'door-boarded-a',i0:26.6,i1:27.8,z:24,boarded:true,kind:'plain'},
    {id:'door-cart',i0:23.2,i1:25.8,z:26,kind:'double-gate'},
    {id:'door-cellar',i0:9.6,i1:12.2,z:0,kind:'cellar'},        // sits at the foot of cellar-stairs, below street level
    {id:'door-boarded-b',i0:14.6,i1:15.6,z:24,boarded:true,kind:'plain'},
    {id:'door-back',i0:16,i1:16.9,z:22,kind:'narrow'},
    {id:'door-end',i0:3.4,i1:4.4,z:24,boarded:true,kind:'plain'},
  ],
  windows:[
    {id:'w0-pawn',i0:19.3,i1:21.3,z0:6,z1:20,floor:0,state:'lit',face:'bay-bridge',note:'pawnbroker shop window behind a curtain'},
    {id:'w0-a',i0:31.4,i1:32.3,z0:9,z1:21,floor:0,state:'dark'},
    {id:'w0-b',i0:21.7,i1:22.3,z0:9,z1:20,floor:0,state:'broken'},
    {id:'w0-c',i0:13.2,i1:14.1,z0:9,z1:21,floor:0,state:'boarded'},
    {id:'w0-d',i0:6,i1:6.5,z0:10,z1:20,floor:0,state:'dark'},
    {id:'w0-e',i0:1.6,i1:2.6,z0:9,z1:20,floor:0,state:'dark'},
    {id:'w1-a',i0:32,i1:33,z0:29,z1:42,floor:1,state:'dark'},
    {id:'w1-b',i0:29.2,i1:30,z0:29,z1:42,floor:1,state:'candle',schedule:{period:60,on:0.55,phase:0.1},flicker:0.5},
    {id:'w1-c',i0:27.3,i1:28.3,z0:29,z1:42,floor:1,state:'broken'},
    {id:'w1-d',i0:24.4,i1:25.4,z0:29,z1:42,floor:1,state:'candle',schedule:{period:95,on:0.4,phase:0.5},flicker:0.6},
    {id:'w1-e',i0:22.6,i1:23.3,z0:30,z1:42,floor:1,state:'boarded'},
    {id:'w1-f',i0:15,i1:16,z0:29,z1:42,floor:1,state:'dark'},
    {id:'w1-g',i0:12,i1:12.9,z0:29,z1:42,floor:1,state:'lit'},
    {id:'w1-h',i0:9.6,i1:10.6,z0:29,z1:42,floor:1,state:'candle',schedule:{period:140,on:0.5,phase:0.65},flicker:0.3},
    {id:'w1-i',i0:7,i1:7.7,z0:30,z1:42,floor:1,state:'broken'},
    {id:'w1-j',i0:4.4,i1:5.4,z0:29,z1:42,floor:1,state:'dark'},
    {id:'w1-k',i0:2,i1:3,z0:29,z1:42,floor:1,state:'boarded'},
    {id:'w2-a',i0:31.2,i1:32,z0:49,z1:61,floor:2,state:'dark'},
    {id:'w2-b',i0:28.5,i1:29.5,z0:49,z1:61,floor:2,state:'dark'},
    {id:'w2-c',i0:25.8,i1:26.6,z0:49,z1:61,floor:2,state:'candle',schedule:{period:120,on:0.35,phase:0.8},flicker:0.4},
    {id:'w2-d',i0:23,i1:24,z0:49,z1:61,floor:2,state:'broken'},
    {id:'w2-e',i0:14,i1:15,z0:49,z1:61,floor:2,state:'candle',schedule:{period:47,on:0.6,phase:0.3},flicker:0.7},
    {id:'w2-f',i0:11.2,i1:12,z0:49,z1:61,floor:2,state:'boarded'},
    {id:'w2-g',i0:8.2,i1:9.2,z0:49,z1:61,floor:2,state:'dark'},
    {id:'w2-h',i0:5.5,i1:6.3,z0:49,z1:61,floor:2,state:'candle',schedule:{period:82,on:0.45,phase:0.9},flicker:0.5},
    {id:'w2-i',i0:2.4,i1:3.4,z0:49,z1:61,floor:2,state:'dark'},
  ],
  glows:[
    // candle windows: glow on while ((t/period)+phase) mod 1 < on (t in seconds), deterministic
    {id:'glow-w1-b',i:29.60,j:.9,z:35,color:'#d89a4a',radius:2.5,window:'w1-b',flicker:0.5,schedule:{period:60,on:0.55,phase:0.1}},
    {id:'glow-w1-d',i:24.90,j:.9,z:35,color:'#d89a4a',radius:3,window:'w1-d',flicker:0.6,schedule:{period:95,on:0.4,phase:0.5}},
    {id:'glow-w2-c',i:26.20,j:.9,z:55,color:'#d89a4a',radius:2,window:'w2-c',flicker:0.4,schedule:{period:120,on:0.35,phase:0.8}},
    {id:'glow-w2-e',i:14.50,j:.9,z:55,color:'#d89a4a',radius:3.5,window:'w2-e',flicker:0.7,schedule:{period:47,on:0.6,phase:0.3}},
    {id:'glow-w1-h',i:10.10,j:.9,z:35,color:'#d89a4a',radius:2.5,window:'w1-h',flicker:0.3,schedule:{period:140,on:0.5,phase:0.65}},
    {id:'glow-w2-h',i:5.90,j:.9,z:55,color:'#d89a4a',radius:2,window:'w2-h',flicker:0.5,schedule:{period:82,on:0.45,phase:0.9}},
    {id:'glow-pawn',i:20.3,j:3.4,z:12,color:'#c8964a',radius:6,window:'w0-pawn',note:'warm slanted patch on the cobbles, 5x3 units, glass bars'},
    {id:'glow-lodging',i:12.5,j:.9,z:35,color:'#a88a58',radius:4,window:'w1-g',flicker:.1,note:'candle in the lodging window; weak patch on the opposite side'},
  ],
  signs:[
    {id:'sign-pawn',i0:18.9,i1:21.5,z:22.5,h:6.5,text:'PAWNBROKER',sub:'Money Lent',side:'bay-bridge',color:'#c8964a',note:'gold on a black board; balls above (balls-pawn)'},
    {id:'sign-beds',i0:11.6,i1:13.8,z:24.5,h:4.3,text:'BEDS 4d',side:'wall',color:'#a8a28f',note:'painted board above the lodging door'},
    {id:'sign-nocredit',i0:12.35,i1:13.05,z:10,h:4,text:'NO CREDIT',side:'door:door-lodging',color:'#a8a28f',note:'chalk on the door'},
    {id:'sign-cleanbeds',i0:12.05,i1:12.85,z:34,h:3,text:'CLEAN BEDS',side:'window:w1-g',color:'#a88a58',note:'card in the window'},
    {id:'sign-anchor',i0:25.9,i1:29.2,z:24.6,h:4,text:'ANCHOR&ALE',side:'wall',color:'#6a665a',note:'faded, struck through by a board'},
    {id:'sign-closed',i0:26.9,i1:27.5,z:12,h:3,text:'CLOSED',side:'door:door-boarded-a',color:'#a8a28f',note:'small card'},
    {id:'sign-tolet',i0:3.5,i1:4.3,z:13,h:3,text:'TO LET',side:'door:door-end',color:'#a8a28f',note:'paper tied to the boards of the old stable doors'},
    {id:'sign-reward',i0:31.25,i1:32.55,z:8,h:12,text:'REWARD\n\u00a310\nINFORMATION',side:'pilaster-mouth',color:'#a8a28f',note:'torn in half, the rest is unreadable bars'},
    {id:'sign-forge',i0:30,i1:31.2,z:17,h:6,text:'FORGE',side:'wall',color:'#6a665a',note:'hanging board, letters nearly worn off (bracket-sign)'},
    {id:'sign-harker',i0:5.5,i1:6.7,z:14,h:9,text:'W. HARKER\nJOINER',side:'end-wall',color:'#74442a',note:'rusty tin plate by the gate; i0/i1 are a j-range here'},
    {id:'sign-parish',i0:14.3,i1:14.9,z:4,h:3,text:'PARISH',side:'box:pump',color:'#4a4c52',note:'cast into the pump body'},
    {id:'sign-tea',i0:8.3,i1:9.5,z:5,h:3,text:'TEA\nLIVERPOOL\nNo. 9',side:'box:crates-court',color:'#a8a28f',note:'stencil on the crates'},
    {id:'chalk-x',i0:5.1,i1:5.7,z:9,h:5,text:'\u2715',side:'wall',color:'#a8a28f',note:'inspector mark'},
    {id:'chalk-k',i0:2.7,i1:3.3,z:8,h:5,text:'K',side:'wall',color:'#6a665a',note:'bailiff mark in a cross'},
    {id:'chalk-b14',i0:3.55,i1:4.25,z:7,h:4,text:'B 14',side:'door:door-end',color:'#a8a28f',note:'number on the boards'},
  ],
  ambient:[{i:0,k:.26},{i:3,k:.28},{i:6,k:.2},{i:11,k:.22},{i:12.5,k:.3},{i:15,k:.3},{i:17,k:.22},{i:22,k:.22},{i:23,k:.3},{i:28,k:.4},{i:30.5,k:.58},{i:34,k:.72}], // exposure gradient, linear between points (0 = blind end, 34 = mouth)
  ruts:[{id:'ruts-a',i0:4.2,i1:16.5,j0:2.6,j1:2.95},{id:'ruts-b',i0:4.2,i1:16.5,j0:3.9,j1:4.25}], // cart ruts that end at the boarded stable doors
  drips:[{id:'drip-downpipe',i:12.85,j:.5,z:40,puddle:{i:12.9,j:2.2},period:[2.2,3]}],
  stories:[
    'Gas burns only at the mouth and over the lodging door; the narrow part under the bridge is dark but for candles.',
    'The court is warmed by a coke brazier; another stands by the gate for whoever watches the yard at night.',
    'Brewer\'s Court: a blind alley two streets from the quay; the Anchor & Ale closed in 1866.',
    'The pawnbroker is the only window that stays lit; the lodging house sells a bed for 4d.',
    'The cholera of 1866 left chalk crosses and numbers on the doors.',
    'The ruts of a cart end at the boarded stable doors; the lock on the gate is bright and new.',
  ],
  arches:[{i0:18,i1:21.5,z:30}],                           // enclosed bridge between tenements; free height below z=30 (>=26)
  puddles:[
    {i:31,j:3.9,rx:1.1,ry:.5},{i:27.5,j:2.9,rx:.8,ry:.4},{i:24,j:4,rx:1.3,ry:.6},{i:19.5,j:3.3,rx:.9,ry:.45},
    {i:15.5,j:2,rx:.7,ry:.35},{i:12.9,j:2.2,rx:1.1,ry:.55,big:true},{i:11,j:4,rx:1.5,ry:.7},{i:7.5,j:3.2,rx:1,ry:.5},{i:2.8,j:3.5,rx:1.2,ry:.55},
  ],
  drains:[
    {i:6,j:3.4,kind:'grate'},{i:26.4,j:2.3,kind:'cellar-light'},{i:17,j:3.4,kind:'gully'},{i:30,j:3.4,kind:'gully'},
  ],
  cobbles:[
    {i0:30,i1:34,kind:'wet'},{i0:22,i1:30,kind:'dry'},{i0:16.5,i1:22,kind:'wet'},
    {i0:8,i1:16.5,kind:'dry'},{i0:3,i1:8,kind:'broken'},{i0:0,i1:3,kind:'wet'},
  ],
  zones:[
    {id:'mouth',light:'gas bracket + street light',i0:29.6,i1:34,name:'Wylot na ulicę'},
    {id:'doors',light:'dim, candle windows',i0:22,i1:29.6,name:'Odcinek z drzwiami'},
    {id:'bridge',light:'dark: candles and the pawnbroker window only',i0:17.5,i1:22,name:'Przewężenie z mostkiem'},
    {id:'court',light:'brazier + lodging gas bracket',i0:8,i1:17.5,name:'Podwórko z pompą'},
    {id:'end',light:'brazier, stable lantern, darkness',i0:0,i1:8,name:'Ślepy zaułek'},
  ],
  ratHoles:[
    {id:'rh-mouth-wall',i:32.9,j:.15,kind:'wall-crack'},{id:'rh-boarded-door',i:27.7,j:.12,kind:'door-gap'},
    {id:'rh-steam-drain',i:27.8,j:3.4,kind:'drain'},{id:'rh-barrels-b',i:28.25,j:6.3,kind:'behind-crates'},
    {id:'rh-cart',i:24.5,j:1.6,kind:'under-cart'},{id:'rh-bin-doors',i:22.6,j:6,kind:'behind-bin'},
    {id:'rh-stack-bridge',i:19.3,j:4.7,kind:'behind-crates'},{id:'rh-cellar',i:11,j:2,kind:'cellar-edge'},
    {id:'rh-trough',i:15.6,j:3,kind:'trough'},{id:'rh-torn-grating',i:13.8,j:.9,kind:'wall-crack'},
    {id:'rh-cart-broken',i:9.9,j:3.9,kind:'under-cart'},{id:'rh-ash-heap',i:5.8,j:1.3,kind:'rubbish'},
    {id:'rh-heap',i:2.3,j:1.3,kind:'rubbish'},{id:'rh-gate',i:.6,j:4.5,kind:'under-gate'},
  ],
  ratLanes:[
    {id:'lane-gutter',pts:[[33.5,3.4],[17,3.4],[16.6,2.7],[13.7,2.7],[13.3,3.4],[6,3.4]]},
    {id:'lane-wall',pts:[[33.8,2],[23.2,2],[22.6,2.7],[16.9,2.7],[16.4,2.2],[8,2.2],[8,2],[1,2],[1,.7],[.3,.7]]},
    {id:'lane-near-end',pts:[[1,6.3],[2.4,6.3],[2.4,5.5],[4.1,5.5],[4.1,4.9],[6,4.9],[6,3.9],[8.2,3.9],[8.2,3.2]]},
    {id:'lane-street-side',pts:[[33.8,5.2],[31.6,5.2],[31.6,4.6],[26,4.6],[26,4.4],[17,4.4],[17,5.6],[14.5,5.6],[11,5.6],[11,4.4]]},
  ],
  npcSpots:[],
};
