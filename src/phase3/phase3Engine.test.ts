import test from 'node:test';
import assert from 'node:assert/strict';
import { GameSimulation, SAVE_VERSION } from '../simulation/simulation';

test('Phase 3 shop BUY deducts cash, unlocks weapons, restocks ammo, and rejects insufficient funds', () => {
  const sim = new GameSimulation(202611, 8);
  const player = sim.getLocalPlayer();
  const startCash = player.money; // 250

  // Buy Paintball Marker ($110)
  sim.applyCommand({ type: 'BUY', actorId: player.id, itemId: 'weapon_paintball' });
  assert.equal(player.money, startCash - 110);
  assert.ok(sim.state.phase3.ownedWeapons.includes('paintball'));
  assert.equal(sim.state.phase3.activeWeapon, 'paintball');
  assert.ok(sim.state.phase3.ammo.paintball > 0);

  // Mission "Hardware Run" should now be completed!
  const gearMission = sim.state.phase3.missions.find((m) => m.id === 'mission_buy_gear');
  assert.equal(gearMission?.completed, true);

  // Claim reward (+$50)
  const cashBeforeClaim = player.money;
  sim.applyCommand({ type: 'CLAIM_MISSION', actorId: player.id, missionId: 'mission_buy_gear' });
  assert.equal(player.money, cashBeforeClaim + 50);
  assert.equal(gearMission?.claimed, true);

  // Reject buying Roof Cannon kit ($160) when cash is insufficient
  player.money = 20;
  sim.applyCommand({ type: 'BUY', actorId: player.id, itemId: 'kit_roof_cannon' });
  assert.equal(player.money, 20);
  assert.equal(sim.state.phase3.defenseKits.roof_cannon ?? 0, 0);
});

test('Phase 3 BUILD installs yard & roof defenses and building doghouse spawns Guard Dog Buster', () => {
  const sim = new GameSimulation(202611, 8);
  const player = sim.getLocalPlayer();
  player.money = 600;

  const dogSlot = Object.values(sim.state.yardSlots).find(
    (s) => s.houseId === player.houseId && s.kind === 'doghouse',
  );
  const trapSlot = Object.values(sim.state.yardSlots).find(
    (s) => s.houseId === player.houseId && s.kind === 'trap_front',
  );
  const roofPad = Object.values(sim.state.phase3.roofPads).find(
    (p) => p.houseId === player.houseId && p.kind === 'roof_cannon',
  );
  assert.ok(dogSlot && trapSlot && roofPad);

  sim.applyCommand({ type: 'BUILD', actorId: player.id, itemId: 'def_doghouse', slotId: dogSlot.id });
  assert.equal(dogSlot.occupiedItemId, 'def_doghouse');
  assert.ok(sim.state.phase3.defenses[dogSlot.id]?.armed);
  assert.ok(
    sim.state.phase3.animals.some((a) => a.kind === 'guard_dog' && a.houseId === player.houseId),
    'Building doghouse must spawn Buster the Guard Dog',
  );

  sim.applyCommand({ type: 'BUILD', actorId: player.id, itemId: 'def_trap_front', slotId: trapSlot.id });
  assert.equal(trapSlot.occupiedItemId, 'def_trap_front');

  sim.applyCommand({ type: 'BUILD', actorId: player.id, itemId: 'roof_cannon', slotId: roofPad.id });
  assert.equal(roofPad.occupiedItemId, 'roof_cannon');
  assert.equal(sim.state.phase3.defenses[roofPad.id]?.isRoof, true);
});

test('Phase 3 FIRE launches projectiles, hits rival Gary, and updates feud mission & NextBlock feed', () => {
  const sim = new GameSimulation(202611, 8);
  const player = sim.getLocalPlayer();
  const gary = sim.state.actors['actor_neighbor_1'];
  assert.ok(gary);

  // Position player facing Gary across short distance
  player.position = { x: gary.position.x, y: gary.position.y, z: gary.position.z + 4.5 };
  player.yaw = 0; // faces -Z toward Gary
  player.pitch = 0;

  const ammoBefore = sim.state.phase3.ammo.slingshot;
  sim.applyCommand({
    type: 'FIRE',
    actorId: player.id,
    weaponId: 'slingshot',
    target: { x: gary.position.x, y: gary.position.y + 1.2, z: gary.position.z },
  });
  assert.equal(sim.state.phase3.ammo.slingshot, ammoBefore - 1);
  assert.equal(sim.state.phase3.projectiles.length, 1);

  for (let i = 0; i < 40; i++) {
    sim.step(1 / 60);
  }
  assert.ok(sim.state.phase3.totalGaryHits >= 1, 'Projectile must hit Gary');
  const prankMission = sim.state.phase3.missions.find((m) => m.id === 'mission_prank_gary');
  assert.equal(prankMission?.completed, true);
});

test('Phase 3 nighttime raid spawns robbers and CALL_911 dispatches police to arrest them', () => {
  const sim = new GameSimulation(202611, 8);
  const player = sim.getLocalPlayer();
  const startMoney = player.money;

  // Trigger a night raid
  sim.applyCommand({ type: 'TRIGGER_RAID', actorId: player.id });
  assert.ok(sim.state.phase3.robbers.length >= 1, 'Raid should spawn robbers');

  // Call 911
  sim.applyCommand({ type: 'CALL_911', actorId: player.id });
  assert.equal(sim.state.phase3.police.status, 'en_route');
  assert.equal(sim.state.phase3.police.wasFalseAlarm, false);

  // Place first robber near curb so officer quickly intercepts on scene
  const robber = sim.state.phase3.robbers[0];
  robber.position = { x: sim.state.phase3.police.targetX, y: 0.14, z: 6.0 };
  robber.targetPoint = { ...robber.position };

  // Step ~8 simulated seconds for cruiser arrival + officer arrest
  for (let i = 0; i < 480; i++) {
    sim.step(1 / 60);
  }

  assert.ok(
    sim.state.phase3.totalRobbersFoiled >= 1,
    'Police officer on scene must arrest active robber',
  );
  assert.ok(player.money > startMoney, 'Bounty must be awarded on police arrest');
});

test('Phase 3 POST_PHOTO posts to socialFeed and Save/Load v4 round-trips Phase 3 state', () => {
  const sim = new GameSimulation(202611, 8);
  const player = sim.getLocalPlayer();
  player.money = 500;

  sim.applyCommand({ type: 'BUY', actorId: player.id, itemId: 'weapon_paintball' });
  const dogSlot = Object.values(sim.state.yardSlots).find(
    (s) => s.houseId === player.houseId && s.kind === 'doghouse',
  )!;
  sim.applyCommand({ type: 'BUILD', actorId: player.id, itemId: 'def_doghouse', slotId: dogSlot.id });
  const postsBefore = sim.state.socialFeed.length;
  sim.applyCommand({ type: 'POST_PHOTO', actorId: player.id, captionKey: 'auto' });
  assert.equal(sim.state.socialFeed.length, postsBefore + 1);

  const saved = sim.serialize();
  assert.equal(saved.version, SAVE_VERSION);
  assert.ok(saved.phase3);

  const restored = GameSimulation.deserialize(saved);
  assert.equal(restored.state.phase3.activeWeapon, 'paintball');
  assert.ok(restored.state.phase3.ownedWeapons.includes('paintball'));
  assert.equal(restored.state.yardSlots[dogSlot.id].occupiedItemId, 'def_doghouse');
  assert.ok(
    restored.state.phase3.animals.some((a) => a.kind === 'guard_dog'),
    'Guard dog must re-hydrate from saved doghouse defense',
  );
  assert.equal(restored.state.socialFeed.length, sim.state.socialFeed.length);
});
