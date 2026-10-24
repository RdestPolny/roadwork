import test from 'node:test';
import assert from 'node:assert/strict';
import {xpNeed, xpTotal, levelFromTotal, migrateLegacyStat, passiveFraction, treePassives, fighterStats, opponentLevels, opponentStars, milestoneText, LEVEL_MAX} from '../src/stats.js';

test('30-level curve grows every level and sums to the planned total', () => {
  assert.equal(xpNeed(1),50);
  assert.equal(xpNeed(29),2630);
  for(let l=2;l<LEVEL_MAX;l++) assert.ok(xpNeed(l)>xpNeed(l-1));
  assert.equal(xpTotal(LEVEL_MAX),30790);
  assert.deepEqual(levelFromTotal(xpTotal(12)+7),{lvl:12,xp:7});
  assert.deepEqual(levelFromTotal(1e9),{lvl:30,xp:0});
});

test('legacy levels keep their cumulative XP', () => {
  assert.deepEqual(migrateLegacyStat(1,0),{lvl:1,xp:0});
  const old=50+132+233;   // legacy levels 1-3 plus nothing
  assert.deepEqual(migrateLegacyStat(4,0),levelFromTotal(old));
  assert.equal(migrateLegacyStat(10,0).lvl,levelFromTotal(4618).lvl);
});

test('passives grow smoothly with milestone steps and match the old maximum at 30', () => {
  assert.equal(passiveFraction(1),0);
  assert.equal(passiveFraction(30),1);
  for(let l=2;l<=LEVEL_MAX;l++){
    const step=passiveFraction(l)-passiveFraction(l-1);
    assert.ok(step>0);
    if(l%5===0) assert.ok(step>0.06,'milestone '+l+' is a visible jump');
    else assert.ok(step<0.03);
  }
  assert.ok(Math.abs(treePassives('str',30).pow-1.49)<1e-9);
  assert.ok(Math.abs(treePassives('spd',30).punch-1.22)<1e-9);
  assert.equal(Math.round(treePassives('end',30).staCap),126);
  assert.equal(treePassives('end',30).hpMax,120);
  assert.ok(Math.abs(treePassives('end',30).stunTaken-0.85)<1e-9);
  assert.equal(milestoneText('str',7),'');
  assert.match(milestoneText('end',10),/zdrowie 1\d\d/);
});

test('fighters and opponents use the same formulas', () => {
  const F=fighterStats({str:1,spd:1,end:1});
  assert.deepEqual([F.pow,F.spd,F.spdFoot,F.spdBack,F.staCap,F.hpBonus,F.stunTaken],[0.95,0.95,0.95,0.95,90,0,1]);
  assert.deepEqual(opponentLevels(15,'press'),{str:19,spd:11,end:15});
  assert.deepEqual(opponentLevels(2,'out'),{str:1,spd:6,end:2});
  assert.deepEqual([opponentStars(6),opponentStars(15),opponentStars(25),opponentStars(30)],[1,2,3,4]);
});
