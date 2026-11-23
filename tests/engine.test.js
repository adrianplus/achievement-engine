const assert = require('node:assert/strict');
const { AchievementEngine } = require('../core/achievement-engine.js');
class MemoryStorage { constructor(){this.data={};} getItem(k){return this.data[k]??null;} setItem(k,v){this.data[k]=v;} removeItem(k){delete this.data[k];} }
const config={gameId:'test-game',worldId:'test-world',totalMilestones:2,milestones:[
 {eventId:'one',eventType:'level_completed',rewards:[{rewardId:'fox',rewardType:'object'}]},
 {eventId:'two',eventType:'level_completed',rewards:[{rewardId:'fairy',rewardType:'object'},{rewardId:'sky',rewardType:'environment'}]}
]};
const storage=new MemoryStorage();
const engine=new AchievementEngine({config,storage});
let r=engine.record({gameId:'test-game',eventId:'one',eventType:'level_completed'});
assert.equal(r.accepted,true); assert.deepEqual(r.unlocked.map(x=>x.rewardId),['fox']);
r=engine.record({gameId:'test-game',eventId:'one',eventType:'level_completed'});
assert.equal(r.duplicate,true); assert.equal(engine.getProgress().completed,1);
r=engine.record({gameId:'test-game',eventId:'two',eventType:'level_completed'});
assert.equal(r.unlocked.length,2); assert.equal(engine.getProgress().percent,100);
const restored=new AchievementEngine({config,storage}); assert.equal(restored.isUnlocked('sky'),true);
const backup=restored.exportProgress(); const otherStorage=new MemoryStorage(); const imported=new AchievementEngine({config,storage:otherStorage}); imported.importProgress(backup); assert.equal(imported.getProgress().completed,2);
const isolated=new AchievementEngine({config:{...config,gameId:'other-game'},storage}); assert.equal(isolated.getProgress().completed,0);
assert.throws(()=>engine.record({gameId:'wrong',eventId:'one',eventType:'level_completed'}));
console.log('PASS: event, duplicate prevention, multi-reward, persistence, import/export, game isolation');
