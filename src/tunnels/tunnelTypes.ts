/**
 * Serializable tunnel grid schema reserved for Phase 2 (Digging).
 * Included in GameState serialization now so saves stay forward-compatible.
 */

export type SoilLayerType = 'topsoil' | 'rock' | 'clay' | 'water';

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
}

export interface TunnelNetworkState {
  segments: TunnelSegment[];
}

export function createEmptyTunnelNetwork(): TunnelNetworkState {
  return { segments: [] };
}
