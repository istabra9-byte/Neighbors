/**
 * Data-driven street layout generator for Neighborhood Wars.
 * Supports 4 to 8 lots purely by changing configuration data (default: 6 lots, 3 per side).
 * 1 unit = 1 meter.
 * Lots are 36m x 46m with generous front/back yards and 50m center-to-center spacing (40-60m spec).
 */

import { SeededRNG } from '../simulation/rng';
import type { GarageSide, HouseArchetypeId, LotConfig, RoofAccessMethod } from '../simulation/types';

export const STREET_CONFIG = {
  roadWidth: 10, // z = -5 .. +5
  sidewalkWidth: 2.5, // z = ±5 .. ±7.5
  sidewalkHeight: 0.14,
  lotWidth: 46, // 46m along X to comfortably house 24x18m homes + 8m garages
  lotDepth: 56, // 56m along Z with deep front & back yards
  lotSpacingX: 56, // 56m center-to-center (within 40-60m spec)
  lotCenterZ: 35.5, // lots span ±7.5 .. ±63.5
  houseLocalOffsetZ: -2.0, // house center sits at ±37.5 (~21m front yard to sidewalk, ~17m backyard)
  worldHalfWidth: 214,
  worldHalfDepth: 112,
} as const;

export interface StreetLayoutSpec {
  lots: LotConfig[];
  roadLength: number;
}

const NORTH_ARCHETYPES: HouseArchetypeId[] = [
  'tudor_manor',
  'mediterranean_villa',
  'craftsman_clapboard', // Gary's house (centerIdx = 2 when 8 lots)
  'nordic_gable',
];

const SOUTH_ARCHETYPES: HouseArchetypeId[] = [
  'industrial_loft',
  'farmhouse_wrap',
  'brick_colonial', // Player's house (centerIdx = 2 when 8 lots)
  'stucco_modern',
];

const ROOF_ACCESS_ORDER: RoofAccessMethod[] = [
  'exterior_ladder',
  'exterior_ladder',
  'exterior_ladder',
  'exterior_ladder',
];

/**
 * Generates a balanced data-driven neighborhood of `lotCount` (clamped 4..8, even) lots.
 * Default is 8 lots (4 north, 4 south) showcasing 8 genuinely distinct house architectures.
 * Player (`slot_player`) and neighbor Gary (`slot_neighbor_1`) always sit directly opposite
 * each other at `x = 0` so underground shelter portals remain perfectly aligned.
 */
export function generateStreetLayout(
  seed: number,
  lotCount: number = 8,
): StreetLayoutSpec {
  const rng = new SeededRNG(seed ^ 0x51a7c0de);
  const clampedTotal = Math.max(4, Math.min(8, Math.round(lotCount / 2) * 2));
  const perSide = clampedTotal / 2;
  const lots: LotConfig[] = [];

  const centerIdx = Math.floor(perSide / 2);

  for (let i = 0; i < perSide; i++) {
    // Keep player & neighbor centerIdx pinned at x = 0 across 4, 6, and 8 lots!
    const x = (i - centerIdx) * STREET_CONFIG.lotSpacingX;

    // Ensure player & Gary retain classic contrasting archetypes across 4/6/8 lot configs
    const archIdx = perSide === 4 ? i : (i - centerIdx + 2 + 4) % 4;
    const northArchetype = NORTH_ARCHETYPES[archIdx % NORTH_ARCHETYPES.length];
    const southArchetype = SOUTH_ARCHETYPES[archIdx % SOUTH_ARCHETYPES.length];

    // North side lot (faces +Z toward street)
    const northAccess = ROOF_ACCESS_ORDER[i % ROOF_ACCESS_ORDER.length];
    // Keep Gary's garage on 'left' (canonical -X -> world -11.2) matching player's garageSide='right' (rotated PI -> world -11.2)
    const northGarageSide: GarageSide = i === centerIdx ? 'left' : i % 2 === 0 ? 'right' : 'left';
    lots.push({
      id: `lot_n${i}`,
      side: 'north',
      position: { x, y: 0, z: -STREET_CONFIG.lotCenterZ },
      rotationY: 0,
      houseType: northArchetype,
      roofAccess: northAccess,
      garageSide: northGarageSide,
      paletteVariant: (i + rng.int(0, 2)) % 3,
      ownerSlotId: i === centerIdx ? 'slot_neighbor_1' : null,
    });

    // South side lot (faces -Z toward street)
    const southAccess = ROOF_ACCESS_ORDER[i % ROOF_ACCESS_ORDER.length];
    const southGarageSide: GarageSide = i === centerIdx ? 'right' : i % 2 === 0 ? 'left' : 'right';
    lots.push({
      id: `lot_s${i}`,
      side: 'south',
      position: { x, y: 0, z: STREET_CONFIG.lotCenterZ },
      rotationY: Math.PI,
      houseType: southArchetype,
      roofAccess: southAccess,
      garageSide: southGarageSide,
      paletteVariant: (i + 1 + rng.int(0, 2)) % 3,
      ownerSlotId: i === centerIdx ? 'slot_player' : null,
    });
  }

  const roadLength = Math.max(300, perSide * STREET_CONFIG.lotSpacingX + 120);
  return { lots, roadLength };
}
