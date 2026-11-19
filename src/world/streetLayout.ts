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
  lotSpacingX: 58, // 58m center-to-center (within 40-60m spec)
  lotCenterZ: 35.5, // lots span ±7.5 .. ±63.5
  houseLocalOffsetZ: -2.0, // house center sits at ±37.5 (~21m front yard to sidewalk, ~17m backyard)
  worldHalfWidth: 156,
  worldHalfDepth: 112,
} as const;

export interface StreetLayoutSpec {
  lots: LotConfig[];
  roadLength: number;
}

const ARCHETYPE_ORDER: HouseArchetypeId[] = [
  'brick_colonial',
  'craftsman_clapboard',
  'stucco_modern',
];

const ROOF_ACCESS_ORDER: RoofAccessMethod[] = [
  'exterior_ladder',
  'exterior_ladder',
  'exterior_ladder',
];

/**
 * Generates a balanced data-driven neighborhood of `lotCount` (clamped 4..8, even) lots.
 * Default is 6 lots (3 north, 3 south), with player on south-center (`lot_s1`)
 * and primary idle AI neighbor directly across on north-center (`lot_n1`).
 * Each house varies in archetype, garage side (left/right), and muted color palette
 * so no two houses look identical.
 */
export function generateStreetLayout(
  seed: number,
  lotCount: number = 6,
): StreetLayoutSpec {
  const rng = new SeededRNG(seed ^ 0x51a7c0de);
  const clampedTotal = Math.max(4, Math.min(8, Math.round(lotCount / 2) * 2));
  const perSide = clampedTotal / 2;
  const lots: LotConfig[] = [];

  const centerIdx = Math.floor(perSide / 2);

  for (let i = 0; i < perSide; i++) {
    const x = (i - (perSide - 1) / 2) * STREET_CONFIG.lotSpacingX;

    // North side lot (faces +Z toward street)
    const northArchetype = ARCHETYPE_ORDER[(i + 0) % ARCHETYPE_ORDER.length];
    const northAccess = ROOF_ACCESS_ORDER[(i + 0) % ROOF_ACCESS_ORDER.length];
    const northGarageSide: GarageSide = i % 2 === 0 ? 'right' : 'left';
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
    const southArchetype = ARCHETYPE_ORDER[(i + 1) % ARCHETYPE_ORDER.length];
    const southAccess = ROOF_ACCESS_ORDER[(i + 1) % ROOF_ACCESS_ORDER.length];
    const southGarageSide: GarageSide = i % 2 === 0 ? 'left' : 'right';
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

  const roadLength = perSide * STREET_CONFIG.lotSpacingX + 80;
  return { lots, roadLength };
}
