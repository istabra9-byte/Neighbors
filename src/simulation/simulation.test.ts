/**
 * Deterministic unit tests for Neighborhood Wars Phase 1 Revision pure simulation layer.
 * Run with: npx --yes tsx --test src/simulation/simulation.test.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { SeededRNG } from './rng';
import { generateStreetLayout } from '../world/streetLayout';
import { HOUSE_CONSTANTS } from '../world/houses';
import { PHYSICS } from './physics';
import { GameSimulation, formatGameClock } from './simulation';

test('seeded RNG produces deterministic sequences and restores state cleanly', () => {
  const a = new SeededRNG(424242);
  const b = new SeededRNG(424242);
  for (let i = 0; i < 20; i++) {
    assert.equal(a.next(), b.next());
  }
  const saved = a.getState();
  const nextVal = a.next();
  const c = new SeededRNG(1);
  c.setState(saved);
  assert.equal(c.next(), nextVal);
});

test('character capsule is 1.65m tall with 0.35m radius and houses meet architectural scale', () => {
  assert.equal(PHYSICS.CAPSULE_HEIGHT, 1.65);
  assert.equal(PHYSICS.CAPSULE_RADIUS, 0.35);
  assert.ok(HOUSE_CONSTANTS.CEILING_H >= 3.4, 'ceiling height must be >= 3.4m');
  assert.ok(HOUSE_CONSTANTS.DOOR_H >= 2.3, 'door height must be >= 2.3m');
  assert.ok(HOUSE_CONSTANTS.DOOR_W >= 1.1, 'door width must be >= 1.1m');
  assert.ok(HOUSE_CONSTANTS.STAIR_W >= 1.2, 'stair width must be >= 1.2m');
});

test('street layout supports 4, 6, and 8 lots with 40-60m spacing and left/right garage variation', () => {
  const l4 = generateStreetLayout(100, 4);
  const l6 = generateStreetLayout(100, 6);
  const l8 = generateStreetLayout(100, 8);
  assert.equal(l4.lots.length, 4);
  assert.equal(l6.lots.length, 6);
  assert.equal(l8.lots.length, 8);

  const northLots = l6.lots.filter((l) => l.side === 'north');
  const southLots = l6.lots.filter((l) => l.side === 'south');
  assert.equal(northLots.length, 3);
  assert.equal(southLots.length, 3);

  const spacing = Math.abs(northLots[1].position.x - northLots[0].position.x);
  assert.ok(spacing >= 40 && spacing <= 60, `Expected 40-60m spacing, got ${spacing}`);

  const garageSides = new Set(l6.lots.map((l) => l.garageSide));
  assert.equal(garageSides.size, 2, 'must include both left and right attached garages');
});

test('all 8 distinct house archetypes have full scale, varied plans, rich furniture, railings, ladders, and pass walkability check', () => {
  const sim = new GameSimulation(202611, 8);
  assert.equal(sim.houses.length, 8);
  const types = new Set(sim.houses.map((h) => h.lot.houseType));
  assert.equal(types.size, 8, 'default 8-lot neighborhood must spawn all 8 distinct house architectures');
  assert.ok(types.has('brick_colonial'));
  assert.ok(types.has('craftsman_clapboard'));
  assert.ok(types.has('stucco_modern'));
  assert.ok(types.has('tudor_manor'));
  assert.ok(types.has('farmhouse_wrap'));
  assert.ok(types.has('mediterranean_villa'));
  assert.ok(types.has('nordic_gable'));
  assert.ok(types.has('industrial_loft'));

  // All 8 archetypes must use distinct room plan variants
  const planVariants = new Set(sim.houses.map((h) => h.archetype.planVariant));
  assert.equal(planVariants.size, 8, 'each of the 8 archetypes must have its own room plan variant');

  for (const h of sim.houses) {
    assert.ok(h.width >= 23.5 && h.depth >= 17.5, 'main footprint must be ~24x18m');
    assert.ok(h.garageWidth >= 7.5 && h.garageDepth >= 9.0, 'attached two-car garage must be >= 8x9.6m');
    assert.ok(h.doors.length >= 8, 'house must have front, back, garage, roof, and interior doors');
    assert.ok(h.windows.length >= 16, 'house must have exterior windows');
    assert.ok(h.furniture.length >= 34, `house ${h.houseId} should be richly furnished, got ${h.furniture.length}`);
    assert.equal(h.yardSlots.length, 6);
    assert.ok(h.stairs.length >= 2);
    assert.ok(h.stairRamps.length >= 2);
    assert.ok(h.railings.length >= 4, 'house must have real stair and guardrail railings');
    assert.equal(h.ladders.length, 2, 'house must have exterior roof ladder and shelter hatch ladder');
    assert.ok(h.anchors.some((a) => a.kind === 'roofAccess'));
    assert.ok(h.anchors.some((a) => a.kind === 'shelterEntry'));
    assert.ok(h.anchors.some((a) => a.kind === 'tunnelEntry'));
    assert.ok(h.anchors.some((a) => a.kind === 'roofVent'));
  }

  // Startup walkability check must pass with zero blocked nodes, unreachable rooms, or headroom violations
  assert.equal(
    sim.walkabilityReport.passed,
    true,
    `Walkability issues found: ${sim.walkabilityReport.issues.join('; ')}`,
  );

  // Street props (cars, trees, fences, hydrants, poles, benches, bins, mailboxes, sheds, patios) must be indexed
  assert.ok(sim.streetProps.yardProps.length >= 24, 'backyards must include patios, grills, sheds, planters');
  assert.ok(sim.streetProps.flowerBeds.length === 8, 'every lot should have a front flower bed');
  assert.ok(sim.streetProps.colliders.length > 150, 'street props must register colliders');
  assert.ok(sim.spatialGrid.count > 700, 'spatial hash grid must index all house + prop colliders');
});

test('casement windows animate openProgress smoothly 0 -> 1 -> 0 and shelter hatch toggles independently without climbing', () => {
  const sim = new GameSimulation(202611, 8);
  const player = sim.getLocalPlayer();
  const house = sim.houseById[player.houseId];

  // Test full-opening casement window animation
  const winId = house.windows[0].id;
  assert.equal(sim.state.windows[winId].openProgress, 0);
  sim.applyCommand({ type: 'INTERACT_WINDOW', actorId: player.id, windowId: winId });
  for (let i = 0; i < 45; i++) sim.step(1 / 60);
  assert.equal(sim.state.windows[winId].isOpen, true);
  assert.ok(sim.state.windows[winId].openProgress > 0.95, 'window openProgress should smoothly reach ~1.0');

  sim.applyCommand({ type: 'INTERACT_WINDOW', actorId: player.id, windowId: winId });
  for (let i = 0; i < 45; i++) sim.step(1 / 60);
  assert.equal(sim.state.windows[winId].isOpen, false);
  assert.ok(sim.state.windows[winId].openProgress < 0.05, 'window openProgress should smoothly return to ~0.0');

  // Test shelter hatch toggle [R] opens & closes WITHOUT mounting the ladder
  const shelterEntry = house.anchors.find((a) => a.kind === 'shelterEntry')!;
  player.position = { ...shelterEntry.position };
  const promptClosed = sim.findInteractionTarget(player);
  assert.equal(promptClosed?.kind, 'shelter_enter');
  assert.equal(promptClosed?.secondaryHintKey, 'interact.openHatchHint');

  sim.applyCommand({ type: 'TOGGLE_SHELTER_HATCH', actorId: player.id, houseId: house.houseId });
  for (let i = 0; i < 40; i++) sim.step(1 / 60);
  assert.equal(player.climbState, null, 'toggling hatch must NOT force player onto ladder');
  assert.equal(sim.state.shelterHatches[house.houseId].isOpen, true);
  assert.ok(sim.state.shelterHatches[house.houseId].openProgress > 0.95);

  const promptOpen = sim.findInteractionTarget(player);
  assert.equal(promptOpen?.kind, 'shelter_enter');
  assert.equal(promptOpen?.secondaryHintKey, 'interact.closeHatchHint');

  // Toggle closed again
  sim.applyCommand({ type: 'TOGGLE_SHELTER_HATCH', actorId: player.id, houseId: house.houseId });
  for (let i = 0; i < 40; i++) sim.step(1 / 60);
  assert.equal(player.climbState, null, 'closing hatch must NOT force player onto ladder');
  assert.equal(sim.state.shelterHatches[house.houseId].isOpen, false);
  assert.ok(sim.state.shelterHatches[house.houseId].openProgress < 0.05);
});

test('real ladder and shelter hatch climb sequence works smoothly with zero teleporting', () => {
  const sim = new GameSimulation(202611, 8);
  const player = sim.getLocalPlayer();
  const house = sim.houseById[player.houseId];

  // Mount exterior roof ladder from bottom
  const roofAccess = house.anchors.find((a) => a.kind === 'roofAccess')!;
  player.position = { ...roofAccess.position };
  sim.applyCommand({ type: 'USE_ROOF_ACCESS', actorId: player.id, houseId: house.houseId, direction: 'up' });
  assert.ok(player.climbState !== null, 'should enter climb state instead of instant teleport');
  assert.ok(player.position.y < 1.0, 'must NOT instantly teleport to roof');

  // Climb upward smoothly over ~4.5 seconds holding forward (W)
  for (let i = 0; i < 280; i++) {
    sim.applyCommand({
      type: 'MOVE_INPUT',
      actorId: player.id,
      input: { forward: 1, right: 0, yaw: player.yaw, pitch: 0, sprint: false, jumpPressed: false, jumpHeld: false },
    });
    sim.step(1 / 60);
  }
  assert.equal(player.climbState, null, 'should finish dismounting onto roof deck');
  assert.equal(player.currentFloor, 2);
  assert.ok(player.position.y >= HOUSE_CONSTANTS.ROOF_Y - 0.1);

  // Open shelter hatch and climb smoothly down into underground shelter
  const shelterEntry = house.anchors.find((a) => a.kind === 'shelterEntry')!;
  player.position = { ...shelterEntry.position };
  sim.applyCommand({ type: 'USE_SHELTER_ACCESS', actorId: player.id, houseId: house.houseId, direction: 'enter' });
  const hatchClimb = sim.getLocalPlayer().climbState;
  assert.ok(hatchClimb?.phase === 'opening_hatch', 'hatch must animate open before climbing');
  assert.equal(sim.state.shelterHatches[house.houseId].isOpen, true);

  for (let i = 0; i < 200; i++) {
    sim.applyCommand({
      type: 'MOVE_INPUT',
      actorId: player.id,
      input: { forward: -1, right: 0, yaw: player.yaw, pitch: 0, sprint: false, jumpPressed: false, jumpHeld: false },
    });
    sim.step(1 / 60);
  }
  assert.equal(player.climbState, null, 'should finish dismounting into shelter');
  assert.equal(player.inShelter, true);
  assert.equal(player.currentFloor, -1);
  assert.ok(player.position.y <= HOUSE_CONSTANTS.SHELTER_Y + 0.2);
});

test('idle AI neighbor runs through command queue and save/load round-trips cleanly', () => {
  const sim = new GameSimulation(777, 8);
  const gary = sim.state.actors['actor_neighbor_1'];
  assert.ok(gary);
  assert.equal(gary.controller, 'ai');

  for (let i = 0; i < 480; i++) {
    sim.step(1 / 60);
  }
  assert.ok(gary.walkDistance > 0.2, 'idle neighbor should stroll between yard waypoints');

  const player = sim.getLocalPlayer();
  const house = sim.houseById[player.houseId];
  sim.applyCommand({ type: 'ADVANCE_TIME', hours: 4.5 });
  sim.applyCommand({ type: 'INTERACT_DOOR', actorId: player.id, doorId: house.doors[0].id });
  sim.applyCommand({ type: 'TOGGLE_BARRICADE_WINDOW', actorId: player.id, windowId: house.windows[0].id });
  sim.step(0.05);

  const restored = GameSimulation.deserialize(JSON.parse(JSON.stringify(sim.serialize())));
  assert.equal(restored.state.seed, 777);
  assert.equal(restored.state.doors[house.doors[0].id].isOpen, true);
  assert.equal(restored.state.windows[house.windows[0].id].isBarricaded, true);
  assert.equal(formatGameClock(9.25), '09:15');
});
