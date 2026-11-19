/**
 * Deterministic unit tests for Neighborhood Wars Phase 2 Underground Tunnel Engine & Simulation.
 * Run with: npx --yes tsx --test src/tunnels/tunnelEngine.test.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { GameSimulation } from '../simulation/simulation';
import { HOUSE_CONSTANTS } from '../world/houses';
import {
  buildSegmentMap,
  buildShelterPortals,
  canBreakSurfaceAtCell,
  computeVentilationNetwork,
  drainFloodedPocket,
  evaluateTunnelStability,
  floodWaterFromCell,
  gridToWorldCenter,
  sampleSoilLayer,
  SOIL_STATS,
  TOOL_COSTS,
  TUNNEL_CONSTANTS,
  tunnelCellKey,
} from './tunnelEngine';
import type { TunnelSegment } from './tunnelTypes';

test('sampleSoilLayer is deterministic, keeps starter corridor safe, and varies by depth', () => {
  for (let gz = -1; gz <= 1; gz++) {
    assert.equal(sampleSoilLayer(202611, 0, 0, gz), 'topsoil');
  }
  assert.equal(sampleSoilLayer(202611, 0, 0, -2), 'clay');
  assert.equal(sampleSoilLayer(202611, 5, 1, -10), 'topsoil');

  // Determinism check across repeated queries
  for (let gx = -10; gx <= 10; gx++) {
    for (let gz = -25; gz <= -3; gz++) {
      assert.equal(
        sampleSoilLayer(999, gx, 0, gz),
        sampleSoilLayer(999, gx, 0, gz),
      );
      assert.equal(
        sampleSoilLayer(999, gx, -1, gz),
        sampleSoilLayer(999, gx, -1, gz),
      );
    }
  }

  // Deep stratum should yield rock, clay, and water pockets
  const deepSoils = new Set<string>();
  for (let gx = -12; gx <= 12; gx++) {
    for (let gz = -24; gz <= -3; gz++) {
      deepSoils.add(sampleSoilLayer(202611, gx, -1, gz));
    }
  }
  assert.ok(deepSoils.has('rock'), 'deep stratum must contain rock');
  assert.ok(deepSoils.has('clay'), 'deep stratum must contain clay');
  assert.ok(deepSoils.has('water'), 'deep stratum must contain water pockets');
});

test('shelter portals align player shelter at (0,0,0) and neighbor Gary shelter at (0,0,-28)', () => {
  const sim = new GameSimulation(202611, 6);
  const portals = buildShelterPortals(sim.houses);
  assert.equal(portals.length, sim.houses.length, 'every house must have a shelter tunnel portal');

  const playerHouse = sim.houseById[sim.getLocalPlayer().houseId];
  const garyHouse = sim.houseById[sim.state.actors['actor_neighbor_1'].houseId];
  const playerPortal = portals.find((p) => p.houseId === playerHouse.houseId);
  const garyPortal = portals.find((p) => p.houseId === garyHouse.houseId);

  assert.ok(playerPortal, 'player shelter portal must exist');
  assert.ok(garyPortal, 'neighbor Gary shelter portal must exist');
  assert.equal(playerPortal.entryGx, 0);
  assert.equal(playerPortal.entryGz, 0);
  assert.equal(garyPortal.entryGx, 0);
  assert.equal(garyPortal.entryGz, -28);
});

test('multi-hit digging through shelter bulkhead excavates cell, pays salvage, and updates colliders', () => {
  const sim = new GameSimulation(202611, 6);
  const player = sim.getLocalPlayer();
  const portal = sim.shelterPortals.find((p) => p.houseId === player.houseId)!;
  const startMoney = player.money;

  // Before opening bulkhead, digging (0,0,0) must be blocked
  sim.applyCommand({ type: 'DIG', actorId: player.id, gx: 0, gy: 0, gz: 0 });
  assert.equal(sim.state.tunnels.segments.length, 0, 'cannot dig before opening shelter bulkhead');

  // Open shelter bulkhead
  sim.applyCommand({ type: 'INTERACT_DOOR', actorId: player.id, doorId: portal.doorId });
  assert.equal(sim.state.doors[portal.doorId].isOpen, true);

  // Cell (0,0,0) is topsoil (2 hits)
  const hitsRequired = SOIL_STATS.topsoil.hits;
  assert.equal(hitsRequired, 2);

  // Hit 1: partial dig progress only
  sim.applyCommand({ type: 'DIG', actorId: player.id, gx: 0, gy: 0, gz: 0 });
  assert.equal(sim.state.tunnels.segments.length, 0);
  assert.equal(sim.state.tunnels.digProgress?.['0,0,0']?.hits, 1);

  // Hit 2: breakthrough!
  sim.applyCommand({ type: 'DIG', actorId: player.id, gx: 0, gy: 0, gz: 0 });
  assert.equal(sim.state.tunnels.segments.length, 1);
  assert.equal(sim.state.tunnels.digProgress?.['0,0,0'], undefined);
  assert.equal(player.money, startMoney + SOIL_STATS.topsoil.salvageCash);

  // Verify dynamic colliders replaced un-dug plug with excavated floor/ceiling/walls
  const center = gridToWorldCenter(0, 0, 0);
  const nearby = sim.spatialGrid.queryXZ(
    center.x - 2,
    center.x + 2,
    center.z - 2,
    center.z + 2,
  );
  assert.ok(
    !nearby.some((c) => c.id === `tunnel_plug_${player.houseId}`),
    'un-dug soil plug must be removed after excavation',
  );
  assert.ok(
    nearby.some((c) => c.id === 'tunnel_c_0_0_0_floor'),
    'excavated cell must register floor slab collider',
  );
  assert.ok(
    !nearby.some((c) => c.id === 'tunnel_c_0_0_0_wPZ'),
    'portal-facing +Z wall must stay open into player shelter',
  );

  // Physically walk player North from inside shelter through open bulkhead into excavated cell (0,0,0)
  player.position = { x: -11.2, y: HOUSE_CONSTANTS.SHELTER_Y, z: 36.4 };
  player.yaw = 0;
  player.inShelter = true;
  for (let i = 0; i < 110; i++) {
    sim.applyCommand({
      type: 'MOVE_INPUT',
      actorId: player.id,
      input: { forward: 1, right: 0, yaw: 0, pitch: 0, sprint: false, jumpPressed: false, jumpHeld: false },
    });
    sim.step(1 / 60);
  }
  assert.equal(player.inTunnel, true, 'player must walk smoothly through open bulkhead into dug tunnel');
  assert.equal(player.inShelter, false);
  assert.ok(player.position.z < 34.4, `expected player inside (0,0,0), got z=${player.position.z}`);

  // Placing a work lantern must immediately bump tunnelVersion so renderer updates
  const revBefore = sim.tunnelVersion;
  sim.applyCommand({ type: 'SELECT_TOOL', actorId: player.id, tool: 'lantern' });
  sim.applyCommand({ type: 'USE_ACTIVE_TOOL', actorId: player.id });
  assert.equal(sim.tunnelSegmentMap.get('0,0,0')?.lit, true);
  assert.ok(sim.tunnelVersion > revBefore, 'lantern placement must bump tunnelVersion');
});

test('structural stability warns past 2 hops, timber bracing resets span, and 4+ unsupported hops triggers cave-in safely', () => {
  const sim = new GameSimulation(202611, 6);
  const player = sim.getLocalPlayer();
  const portal = sim.shelterPortals.find((p) => p.houseId === player.houseId)!;
  sim.applyCommand({ type: 'INTERACT_DOOR', actorId: player.id, doorId: portal.doorId });

  // Dig 5 consecutive cells straight north: gz = 0, -1, -2, -3, -4
  for (let gz = 0; gz >= -4; gz--) {
    const soil = sampleSoilLayer(sim.state.seed, 0, 0, gz);
    const hits = SOIL_STATS[soil].hits;
    for (let h = 0; h < hits; h++) {
      player.stamina = 100;
      sim.applyCommand({ type: 'DIG', actorId: player.id, gx: 0, gy: 0, gz });
    }
  }
  assert.equal(sim.state.tunnels.segments.length, 5);

  // Check stability evaluation before bracing: gz=-3 is hop 3 (unstable), gz=-4 is hop 4 (collapse candidate)
  const stab = evaluateTunnelStability(sim.state.tunnels.segments, sim.shelterPortals);
  assert.equal(stab.unsupportedHopsByKey.get('0,0,0'), 0);
  assert.equal(stab.unsupportedHopsByKey.get('0,0,-3'), 3);
  assert.equal(stab.unsupportedHopsByKey.get('0,0,-4'), 4);
  assert.ok(stab.unstableKeys.has('0,0,-3'));
  assert.equal(stab.collapseCandidateKey, '0,0,-4');

  // Stand inside gz=-4 without bracing and advance 3 seconds -> cave-in collapses gz=-4 and shifts player safely
  const c4 = gridToWorldCenter(0, 0, -4);
  player.position = { ...c4 };
  player.inTunnel = true;
  player.inShelter = false;
  const hpBefore = player.health;

  for (let i = 0; i < 180; i++) {
    sim.step(1 / 60);
  }
  assert.ok(player.health < hpBefore, 'cave-in must deal damage');
  assert.equal(sim.tunnelSegmentMap.has('0,0,-4'), false, 'unstable tip cell must collapse');
  // Player must be relocated to an existing safe cell, never trapped in solid rock
  assert.ok(
    Math.hypot(player.position.x - c4.x, player.position.z - c4.z) > 1.0,
    'player must be shifted out of collapsed cell',
  );

  // Now brace gz=-2 with timber via SELECT_TOOL + USE_ACTIVE_TOOL
  const c2 = gridToWorldCenter(0, 0, -2);
  player.position = { ...c2 };
  player.yaw = 0;
  const cashBefore = player.money;
  sim.applyCommand({ type: 'SELECT_TOOL', actorId: player.id, tool: 'timber' });
  sim.applyCommand({ type: 'USE_ACTIVE_TOOL', actorId: player.id });
  assert.equal(player.money, cashBefore - TOOL_COSTS.timber);
  assert.equal(sim.tunnelSegmentMap.get('0,0,-2')?.supported, true);
  assert.equal(sim.tunnelStability.unstableKeys.size, 0, 'bracing gz=-2 must stabilize gz=-3');
});

test('ventilation network drains O2 past 4 hops and installing a vent restores fresh air', () => {
  const sim = new GameSimulation(202611, 6);
  const player = sim.getLocalPlayer();
  const portal = sim.shelterPortals.find((p) => p.houseId === player.houseId)!;
  sim.applyCommand({ type: 'INTERACT_DOOR', actorId: player.id, doorId: portal.doorId });

  // Dig 6 braced cells gz = 0..-5
  for (let gz = 0; gz >= -5; gz--) {
    const soil = sampleSoilLayer(sim.state.seed, 0, 0, gz);
    for (let h = 0; h < SOIL_STATS[soil].hits; h++) {
      player.stamina = 100;
      sim.applyCommand({ type: 'DIG', actorId: player.id, gx: 0, gy: 0, gz });
    }
    const seg = sim.tunnelSegmentMap.get(tunnelCellKey(0, 0, gz));
    if (seg) seg.supported = true;
  }
  sim.rebuildTunnelWorldState();

  const airBefore = computeVentilationNetwork(sim.state.tunnels.segments, sim.shelterPortals);
  assert.ok(airBefore.freshAirKeys.has('0,0,-4'), '4 hops from portal still has natural draft');
  assert.equal(airBefore.freshAirKeys.has('0,0,-5'), false, '5th hop beyond portal lacks air');

  // Stand in gz=-5 -> O2 drains
  player.position = { ...gridToWorldCenter(0, 0, -5) };
  player.oxygen = 100;
  for (let i = 0; i < 60; i++) {
    sim.step(1 / 60);
  }
  assert.ok(player.oxygen < 95, `expected O2 drain in unventilated deep cell, got ${player.oxygen}`);

  // Install vent duct in gz=-4 -> fresh air extends +2 hops to cover gz=-5
  player.position = { ...gridToWorldCenter(0, 0, -4) };
  sim.applyCommand({ type: 'SELECT_TOOL', actorId: player.id, tool: 'vent' });
  sim.applyCommand({ type: 'USE_ACTIVE_TOOL', actorId: player.id });
  assert.equal(sim.tunnelSegmentMap.get('0,0,-4')?.ventilated, true);
  assert.ok(sim.tunnelAir.freshAirKeys.has('0,0,-5'), 'vent duct at gz=-4 must supply air to gz=-5');

  // Stand in gz=-5 again -> O2 recovers
  player.position = { ...gridToWorldCenter(0, 0, -5) };
  const o2AfterVent = player.oxygen;
  for (let i = 0; i < 60; i++) {
    sim.step(1 / 60);
  }
  assert.ok(player.oxygen > o2AfterVent, 'O2 should recover once ventilation duct reaches cell');
});

test('groundwater pocket floods adjacent cells and sump pump drains connected pocket', () => {
  const segA: TunnelSegment = {
    id: 'a',
    ownerId: 'slot_player',
    gx: 0,
    gy: 0,
    gz: -2,
    soil: 'clay',
    supported: true,
    ventilated: true,
    lit: false,
    flooded: false,
  };
  const segB: TunnelSegment = {
    id: 'b',
    ownerId: 'slot_player',
    gx: 0,
    gy: 0,
    gz: -3,
    soil: 'water',
    supported: true,
    ventilated: true,
    lit: false,
    flooded: false,
  };
  const segC: TunnelSegment = {
    id: 'c',
    ownerId: 'slot_player',
    gx: 1,
    gy: 0,
    gz: -3,
    soil: 'topsoil',
    supported: true,
    ventilated: true,
    lit: false,
    flooded: false,
  };
  const map = buildSegmentMap([segA, segB, segC]);

  const flooded = floodWaterFromCell(segB, map);
  assert.equal(flooded, 3, 'water cell should flood itself and orthogonal neighbors');
  assert.equal(segA.flooded, true);
  assert.equal(segB.flooded, true);
  assert.equal(segC.flooded, true);

  const drained = drainFloodedPocket(segA, map);
  assert.equal(drained, 3, 'sump pump should drain entire connected flooded pocket');
  assert.equal(segA.flooded, false);
  assert.equal(segB.flooded, false);
  assert.equal(segC.flooded, false);
  assert.equal(segB.drained, true);
});

test('surface breakout rejects road and house footprints, accepts open lawn, and creates climbable shaft ladder', () => {
  const sim = new GameSimulation(202611, 6);
  const player = sim.getLocalPlayer();
  const portal = sim.shelterPortals.find((p) => p.houseId === player.houseId)!;
  sim.applyCommand({ type: 'INTERACT_DOOR', actorId: player.id, doorId: portal.doorId });

  // Road centerline is around gz = -14 (z ≈ 0) -> must be rejected
  assert.equal(
    canBreakSurfaceAtCell(0, -14, sim.houses, sim.colliders),
    false,
    'cannot break surface through paved Maple Crescent road',
  );

  // Find a valid open yard cell south of the road (near player's front lawn)
  let openGz: number | null = null;
  for (let gz = -4; gz >= -10; gz--) {
    if (canBreakSurfaceAtCell(0, gz, sim.houses, sim.colliders)) {
      openGz = gz;
      break;
    }
  }
  assert.ok(openGz !== null, 'must find an open front-yard lawn cell suitable for surface breakout');

  // Excavate straight to openGz, then dig upward (gy = 1)
  for (let gz = 0; gz >= openGz; gz--) {
    const soil = sampleSoilLayer(sim.state.seed, 0, 0, gz);
    for (let h = 0; h < SOIL_STATS[soil].hits; h++) {
      player.stamina = 100;
      sim.applyCommand({ type: 'DIG', actorId: player.id, gx: 0, gy: 0, gz });
    }
  }

  for (let h = 0; h < SOIL_STATS.topsoil.hits; h++) {
    player.stamina = 100;
    sim.applyCommand({ type: 'DIG', actorId: player.id, gx: 0, gy: 1, gz: openGz });
  }

  const surfSeg = sim.tunnelSegmentMap.get(tunnelCellKey(0, 1, openGz));
  assert.ok(surfSeg && surfSeg.isSurfaceExit, 'surface exit shaft segment must be created');
  const shaftLadder = sim.laddersById[`tunnel_ladder_surf_0_${openGz}`];
  assert.ok(shaftLadder, 'surface breakout must register climbable tunnel_shaft ladder');
  assert.equal(shaftLadder.bottomY, HOUSE_CONSTANTS.SHELTER_Y);
  assert.equal(shaftLadder.topY, 0.0);
});

test('save/load v3 round-trips tunnel segments, partial dig progress, O2, and active tool', () => {
  const sim = new GameSimulation(202611, 6);
  const player = sim.getLocalPlayer();
  const portal = sim.shelterPortals.find((p) => p.houseId === player.houseId)!;
  sim.applyCommand({ type: 'INTERACT_DOOR', actorId: player.id, doorId: portal.doorId });

  // Dig (0,0,0) fully and (0,0,-1) partially (1 hit of 2)
  sim.applyCommand({ type: 'DIG', actorId: player.id, gx: 0, gy: 0, gz: 0 });
  sim.applyCommand({ type: 'DIG', actorId: player.id, gx: 0, gy: 0, gz: 0 });
  sim.applyCommand({ type: 'DIG', actorId: player.id, gx: 0, gy: 0, gz: -1 });

  // Place lantern on (0,0,0) and set oxygen/tool
  player.position = { ...gridToWorldCenter(0, 0, 0) };
  player.inTunnel = true;
  player.inShelter = false;
  player.oxygen = 64;
  sim.applyCommand({ type: 'SELECT_TOOL', actorId: player.id, tool: 'lantern' });
  sim.applyCommand({ type: 'USE_ACTIVE_TOOL', actorId: player.id });
  sim.applyCommand({ type: 'SELECT_TOOL', actorId: player.id, tool: 'pump' });

  const json = JSON.parse(JSON.stringify(sim.serialize()));
  assert.ok(json.version >= 3);
  const restored = GameSimulation.deserialize(json);
  const rPlayer = restored.getLocalPlayer();

  assert.equal(restored.state.tunnels.segments.length, 1);
  assert.equal(restored.tunnelSegmentMap.get('0,0,0')?.lit, true);
  assert.equal(restored.state.tunnels.digProgress?.['0,0,-1']?.hits, 1);
  assert.equal(rPlayer.oxygen, 64);
  assert.equal(rPlayer.activeTool, 'pump');
  assert.equal(rPlayer.inTunnel, true);
  assert.equal(TUNNEL_CONSTANTS.CELL_W, 2.4);
});
