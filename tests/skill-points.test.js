import test from 'node:test';
import assert from 'node:assert/strict';
import {TRAITS, TRAIT_LEVELS, TRAIT_NAMES} from '../src/skill-data.js';
import {pointsEarned, traitSlots, traitId, sanitizeTraits, traitBlock, fightTraits} from '../src/perk-rules.js';
import {PERK_CARDS, MOVES, PUNCH_TREES, NODE_PRICE, startMoves, movesSpent, nodeBlock, buyNode} from '../src/card-data.js';

const allTrials={10:true,20:true}, noTrials={10:false,20:false};

test('Cechy: two traits at levels 5, 10 and 15 of each attribute, every one with a name and a fight meaning', () => {
  assert.deepEqual(TRAIT_LEVELS,[5,10,15]);
  const ids=Object.values(TRAITS).flat(2);
  assert.equal(ids.length,18); assert.equal(new Set(ids).size,18);
  for(const id of ids){ assert.ok(TRAIT_NAMES[id],'name '+id); assert.equal(PERK_CARDS[id]?.kind,'reguła','fight meaning '+id); }
  assert.deepEqual([1,4,5,9,10,15,30].map(traitSlots),[0,0,1,1,2,3,3]);
  assert.equal(traitId('spd',0,'a'),'lucky-slip'); assert.equal(traitId('end',2,'b'),'grinder'); assert.equal(traitId('str',1,''),'');
});

test('trait picks: only opened slots, A or B; a slot can change, never to the same trait', () => {
  assert.deepEqual(sanitizeTraits(['a','b','a'],12),['a','b','']);
  assert.deepEqual(sanitizeTraits(['x',null,'b','a'],30),['','','b']);
  assert.deepEqual(sanitizeTraits('ab',30),['','','']);
  const picks=/** @type {any} */ (['a','','']);
  assert.equal(traitBlock(1,'a',picks,9),'level');
  assert.equal(traitBlock(1,'a',picks,10),'');
  assert.equal(traitBlock(0,'a',picks,10),'same');
  assert.equal(traitBlock(0,'b',picks,10),'','a change is allowed (the price is Profesor\'s)');
  assert.equal(traitBlock(3,'a',picks,30),'unknown');
  assert.deepEqual(fightTraits('end',['b','a','']),['economist','spiked-guard']);
});

test('points: levels, trials and lessons; they pay for the moves and punch trees of their attribute', () => {
  assert.equal(pointsEarned(15,{10:true,20:false}),15);
  assert.equal(pointsEarned(1,noTrials),0);
  assert.equal(pointsEarned(30,allTrials,3),34);
  assert.deepEqual(Object.keys(PUNCH_TREES).map(id=>MOVES[id].tree),['spd','spd','spd','str','str','str','end','end'],'jab, body jab, hook · cross, uppercut, body uppercut · body cross, liver hook');
  for(const T of Object.values(PUNCH_TREES)){ assert.equal(T.length,5); for(const pair of T) assert.ok(pair.length===2&&pair.every(n=>n.name&&n.text)); }
  assert.equal(NODE_PRICE.reduce((a,b)=>a+b,0),7);
  const moves=startMoves();
  assert.equal(movesSpent(moves,'spd'),0,'the start costs nothing');
  moves.splot={picks:''}; moves.nerki={picks:'',gift:true};
  assert.equal(movesSpent(moves,'end'),1,'a learnt body cross costs Wytrzymałość; a gift does not');
});

test('punch nodes: bought in order with the attribute\'s points, and only once they work in a brawl', () => {
  const moves=startMoves(), ready=new Set(['jab:1a','jab:1b','jab:2b','jab:3a','jab:4a','jab:5b']);
  const live=startMoves();
  for(const p of /** @type {const} */ (['a','b','a','b','a'])) assert.equal(buyNode(live,'jab',p,9),'','all five levels work in a brawl');
  assert.equal(nodeBlock(live,'jab','a',9),'max');
  assert.equal(nodeBlock(moves,'upper','a',5,ready),'not-known');
  assert.equal(nodeBlock(moves,'raz-dwa','a',5,ready),'unknown','combinations have no tree');
  assert.equal(nodeBlock(moves,'jab','a',0,ready),'points');
  assert.equal(buyNode(moves,'jab','b',1,ready),''); assert.equal(moves.jab.picks,'b');
  assert.equal(buyNode(moves,'jab','a',1,ready),'soon','level II A is not ready');
  for(const p of /** @type {const} */ (['b','a','a','b'])) assert.equal(buyNode(moves,'jab',p,9,ready),'');
  assert.equal(moves.jab.picks,'bbaab');
  assert.equal(movesSpent(moves,'spd'),7);
  assert.equal(nodeBlock(moves,'jab','a',9,ready),'max');
});
