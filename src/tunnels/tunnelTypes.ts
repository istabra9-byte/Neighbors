/**
 * Serializable tunnel grid schema and Phase 2 equipment types.
 * Included in GameState serialization so saves preserve the full dug network.
 */

export type SoilLayerType = 'topsoil' | 'rock' | 'clay' | 'water';

export type TunnelToolId = 'shovel' | 'timber' | 'lantern' | 'vent' | 'pump';

export interface TunnelSegment {
  id: string;
  ownerId: string;
  gx: number;
  gy: number;
  gz: number;
  soil: SoilLayerType;
  supported: boolean;
  ventilated: boolean;
  lit: boolean;
  flooded: boolean;
  /** True when groundwater was actively pumped/shored so water does not immediately re-flood this cell */
  drained?: boolean;
  /** True for gy === 1 upward surface breakout shafts into a yard */
  isSurfaceExit?: boolean;
}

export interface PartialDigState {
  hits: number;
  maxHits: number;
  soil: SoilLayerType;
}

export interface TunnelNetworkState {
  segments: TunnelSegment[];
  /** Accumulated partial shovel hits per un-excavated cell key (`gx,gy,gz`) */
  digProgress?: Record<string, PartialDigState>;
}

export function createEmptyTunnelNetwork(): TunnelNetworkState {
  return {
    segments: [],
    digProgress: {},
  };
}
