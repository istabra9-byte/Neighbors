/**
 * Architectural definitions & grounded palettes for all 8 distinct house archetypes
 * in Neighborhood Wars. Each archetype differs in:
 * - Exterior silhouette (symmetrical, west-L, east-L, cantilever balcony, wrap veranda,
 *   Tudor half-timbering, Mediterranean arched loggia, rooftop steel pergola)
 * - Exterior wall texture & muted realistic color palettes
 * - Floor plan & room placement (living, kitchen, dining, studio, sunroom, bedrooms, bath)
 * - Hallway alignment, stair positions & climbing directions, railing materials
 */

import type { HouseArchetypeId } from '../simulation/types';

export type ExteriorTextureKind =
  | 'brick'
  | 'siding'
  | 'plaster'
  | 'boardBatten'
  | 'cedar'
  | 'terracotta';

export type FacadeAccentKind =
  | 'colonial_cornice'
  | 'craftsman_brackets'
  | 'modern_overhang'
  | 'tudor_beams'
  | 'farmhouse_gable'
  | 'villa_arches'
  | 'nordic_gable'
  | 'industrial_steel';

export type RoomPlanVariant =
  | 'classic_west_living'
  | 'craftsman_l_wing'
  | 'modern_balcony'
  | 'flipped_east_living'
  | 'front_kitchen_farmhouse'
  | 'courtyard_villa'
  | 'nordic_east_studio'
  | 'industrial_loft_plan';

export interface HousePalette {
  exteriorColor: string;
  trimColor: string;
  accentColor: string;
  roofColor: string;
  doorColor: string;
  shutterColor: string;
  exteriorTexture: ExteriorTextureKind;
}

export interface ArchetypeSpec {
  id: HouseArchetypeId;
  planVariant: RoomPlanVariant;
  facadeAccent: FacadeAccentKind;
  hasShutters: boolean;
  railingStyle: 'wood' | 'metal' | 'glass';
  westFrontZ: number;
  eastFrontZ: number;
  hallLeftX: number;
  hallRightX: number;
  frontDoorX: number;
  s1X: number;
  s1Reverse: boolean; // true: climbs from -4.2 to +2.4; false: climbs from +3.2 to -3.4
  s2X: number;
  s2ZStart: number;
  balconySide: 'none' | 'west' | 'east';
  hasRoofPergola: boolean;
  porchStyle: 'colonial' | 'craftsman_alcove' | 'modern_patio' | 'tudor_portico' | 'farmhouse_wrap' | 'villa_loggia' | 'nordic_deck' | 'industrial_canopy';
  palettes: HousePalette[];
}

export const HOUSE_ARCHETYPES: Record<HouseArchetypeId, ArchetypeSpec> = {
  brick_colonial: {
    id: 'brick_colonial',
    planVariant: 'classic_west_living',
    facadeAccent: 'colonial_cornice',
    hasShutters: true,
    railingStyle: 'wood',
    westFrontZ: 9.0,
    eastFrontZ: 9.0,
    hallLeftX: -2.8,
    hallRightX: 2.8,
    frontDoorX: -0.6,
    s1X: 1.85,
    s1Reverse: false,
    s2X: 4.6,
    s2ZStart: -4.4,
    balconySide: 'none',
    hasRoofPergola: false,
    porchStyle: 'colonial',
    palettes: [
      {
        exteriorColor: '#8d5342',
        trimColor: '#dfd8cb',
        accentColor: '#56504b',
        roofColor: '#4c4946',
        doorColor: '#3b4f45',
        shutterColor: '#37423e',
        exteriorTexture: 'brick',
      },
      {
        exteriorColor: '#7d4d40',
        trimColor: '#dad2c6',
        accentColor: '#4f4a46',
        roofColor: '#474542',
        doorColor: '#5a3b33',
        shutterColor: '#3f3d3b',
        exteriorTexture: 'brick',
      },
      {
        exteriorColor: '#96614d',
        trimColor: '#e0d9cd',
        accentColor: '#5b554e',
        roofColor: '#4f4c48',
        doorColor: '#31424d',
        shutterColor: '#313d44',
        exteriorTexture: 'brick',
      },
    ],
  },

  craftsman_clapboard: {
    id: 'craftsman_clapboard',
    planVariant: 'craftsman_l_wing',
    facadeAccent: 'craftsman_brackets',
    hasShutters: true,
    railingStyle: 'wood',
    westFrontZ: 10.8,
    eastFrontZ: 7.4,
    hallLeftX: -2.6,
    hallRightX: 3.0,
    frontDoorX: 1.2,
    s1X: -1.65,
    s1Reverse: true,
    s2X: 4.8,
    s2ZStart: -5.2,
    balconySide: 'none',
    hasRoofPergola: false,
    porchStyle: 'craftsman_alcove',
    palettes: [
      {
        exteriorColor: '#6f7c72',
        trimColor: '#e1dacd',
        accentColor: '#614f40',
        roofColor: '#4a4b49',
        doorColor: '#704a34',
        shutterColor: '#4c564e',
        exteriorTexture: 'siding',
      },
      {
        exteriorColor: '#7e7666',
        trimColor: '#e2dcd0',
        accentColor: '#584a3d',
        roofColor: '#494744',
        doorColor: '#4a564c',
        shutterColor: '#504a40',
        exteriorTexture: 'siding',
      },
      {
        exteriorColor: '#63717b',
        trimColor: '#e0dad0',
        accentColor: '#544a42',
        roofColor: '#46494c',
        doorColor: '#6d4b37',
        shutterColor: '#424d54',
        exteriorTexture: 'siding',
      },
    ],
  },

  stucco_modern: {
    id: 'stucco_modern',
    planVariant: 'modern_balcony',
    facadeAccent: 'modern_overhang',
    hasShutters: false,
    railingStyle: 'glass',
    westFrontZ: 9.0,
    eastFrontZ: 9.0,
    hallLeftX: -0.4,
    hallRightX: 5.2,
    frontDoorX: 3.2,
    s1X: 0.55,
    s1Reverse: false,
    s2X: 8.6,
    s2ZStart: -4.4,
    balconySide: 'west',
    hasRoofPergola: false,
    porchStyle: 'modern_patio',
    palettes: [
      {
        exteriorColor: '#c9c1b3',
        trimColor: '#4e5257',
        accentColor: '#76614d',
        roofColor: '#505255',
        doorColor: '#684c38',
        shutterColor: '#4a4e52',
        exteriorTexture: 'plaster',
      },
      {
        exteriorColor: '#bab4a8',
        trimColor: '#484c52',
        accentColor: '#6a5b4d',
        roofColor: '#4c4e52',
        doorColor: '#3f5156',
        shutterColor: '#474b50',
        exteriorTexture: 'plaster',
      },
      {
        exteriorColor: '#d1c7b8',
        trimColor: '#504b47',
        accentColor: '#7d6854',
        roofColor: '#524e4b',
        doorColor: '#6e4936',
        shutterColor: '#4e4944',
        exteriorTexture: 'plaster',
      },
    ],
  },

  tudor_manor: {
    id: 'tudor_manor',
    planVariant: 'flipped_east_living',
    facadeAccent: 'tudor_beams',
    hasShutters: false,
    railingStyle: 'wood',
    westFrontZ: 9.0,
    eastFrontZ: 9.0,
    hallLeftX: -3.2,
    hallRightX: 2.4,
    frontDoorX: -1.2,
    s1X: 1.45,
    s1Reverse: true,
    s2X: 4.5,
    s2ZStart: -4.6,
    balconySide: 'none',
    hasRoofPergola: false,
    porchStyle: 'tudor_portico',
    palettes: [
      {
        exteriorColor: '#d2c9b8',
        trimColor: '#49382b',
        accentColor: '#6a655e',
        roofColor: '#43413f',
        doorColor: '#593625',
        shutterColor: '#423328',
        exteriorTexture: 'plaster',
      },
      {
        exteriorColor: '#c7beac',
        trimColor: '#413227',
        accentColor: '#625e57',
        roofColor: '#403f3d',
        doorColor: '#4a3022',
        shutterColor: '#3c2f24',
        exteriorTexture: 'plaster',
      },
      {
        exteriorColor: '#d7cfc0',
        trimColor: '#503d2e',
        accentColor: '#6d675f',
        roofColor: '#474442',
        doorColor: '#3a463b',
        shutterColor: '#46372a',
        exteriorTexture: 'plaster',
      },
    ],
  },

  farmhouse_wrap: {
    id: 'farmhouse_wrap',
    planVariant: 'front_kitchen_farmhouse',
    facadeAccent: 'farmhouse_gable',
    hasShutters: true,
    railingStyle: 'wood',
    westFrontZ: 9.0,
    eastFrontZ: 9.0,
    hallLeftX: -2.4,
    hallRightX: 3.2,
    frontDoorX: 0.4,
    s1X: 2.25,
    s1Reverse: false,
    s2X: 4.9,
    s2ZStart: -4.4,
    balconySide: 'none',
    hasRoofPergola: false,
    porchStyle: 'farmhouse_wrap',
    palettes: [
      {
        exteriorColor: '#dbd7ce',
        trimColor: '#484b4e',
        accentColor: '#7a5c41',
        roofColor: '#404448',
        doorColor: '#4b5e50',
        shutterColor: '#45494d',
        exteriorTexture: 'boardBatten',
      },
      {
        exteriorColor: '#cfd3cb',
        trimColor: '#45494c',
        accentColor: '#72563d',
        roofColor: '#3e4246',
        doorColor: '#6a4633',
        shutterColor: '#42474b',
        exteriorTexture: 'boardBatten',
      },
      {
        exteriorColor: '#dfd9ce',
        trimColor: '#4e4842',
        accentColor: '#816246',
        roofColor: '#444240',
        doorColor: '#3d4c57',
        shutterColor: '#494540',
        exteriorTexture: 'boardBatten',
      },
    ],
  },

  mediterranean_villa: {
    id: 'mediterranean_villa',
    planVariant: 'courtyard_villa',
    facadeAccent: 'villa_arches',
    hasShutters: true,
    railingStyle: 'metal',
    westFrontZ: 9.0,
    eastFrontZ: 9.0,
    hallLeftX: -2.8,
    hallRightX: 2.8,
    frontDoorX: -0.4,
    s1X: -1.85,
    s1Reverse: false,
    s2X: 4.6,
    s2ZStart: -4.6,
    balconySide: 'east',
    hasRoofPergola: false,
    porchStyle: 'villa_loggia',
    palettes: [
      {
        exteriorColor: '#c7a480',
        trimColor: '#e4d9c8',
        accentColor: '#9b583d',
        roofColor: '#8f523a',
        doorColor: '#5c3c29',
        shutterColor: '#4f6057',
        exteriorTexture: 'terracotta',
      },
      {
        exteriorColor: '#cca987',
        trimColor: '#e6dccb',
        accentColor: '#945238',
        roofColor: '#864c36',
        doorColor: '#4f3828',
        shutterColor: '#47575f',
        exteriorTexture: 'terracotta',
      },
      {
        exteriorColor: '#be9b79',
        trimColor: '#dfd4c2',
        accentColor: '#a35d42',
        roofColor: '#94553d',
        doorColor: '#63412d',
        shutterColor: '#58624d',
        exteriorTexture: 'terracotta',
      },
    ],
  },

  nordic_gable: {
    id: 'nordic_gable',
    planVariant: 'nordic_east_studio',
    facadeAccent: 'nordic_gable',
    hasShutters: false,
    railingStyle: 'glass',
    westFrontZ: 7.8,
    eastFrontZ: 10.4,
    hallLeftX: -3.0,
    hallRightX: 2.6,
    frontDoorX: -1.0,
    s1X: 1.65,
    s1Reverse: false,
    s2X: 4.6,
    s2ZStart: -4.8,
    balconySide: 'none',
    hasRoofPergola: false,
    porchStyle: 'nordic_deck',
    palettes: [
      {
        exteriorColor: '#9c7856',
        trimColor: '#44484d',
        accentColor: '#545a60',
        roofColor: '#3f4348',
        doorColor: '#3f454b',
        shutterColor: '#44484d',
        exteriorTexture: 'cedar',
      },
      {
        exteriorColor: '#8c6e50',
        trimColor: '#484b50',
        accentColor: '#585e64',
        roofColor: '#3d4146',
        doorColor: '#4b5a52',
        shutterColor: '#484b50',
        exteriorTexture: 'cedar',
      },
      {
        exteriorColor: '#a88460',
        trimColor: '#42464b',
        accentColor: '#52575d',
        roofColor: '#3e4247',
        doorColor: '#5c4130',
        shutterColor: '#42464b',
        exteriorTexture: 'cedar',
      },
    ],
  },

  industrial_loft: {
    id: 'industrial_loft',
    planVariant: 'industrial_loft_plan',
    facadeAccent: 'industrial_steel',
    hasShutters: false,
    railingStyle: 'metal',
    westFrontZ: 9.0,
    eastFrontZ: 9.0,
    hallLeftX: -0.6,
    hallRightX: 5.0,
    frontDoorX: 3.0,
    s1X: 0.35,
    s1Reverse: true,
    s2X: 8.6,
    s2ZStart: -4.4,
    balconySide: 'west',
    hasRoofPergola: true,
    porchStyle: 'industrial_canopy',
    palettes: [
      {
        exteriorColor: '#6f4b42',
        trimColor: '#474c52',
        accentColor: '#5a5f66',
        roofColor: '#42464b',
        doorColor: '#3a4046',
        shutterColor: '#454a50',
        exteriorTexture: 'brick',
      },
      {
        exteriorColor: '#65504a',
        trimColor: '#4b5056',
        accentColor: '#60656c',
        roofColor: '#44484d',
        doorColor: '#5c4232',
        shutterColor: '#484d53',
        exteriorTexture: 'brick',
      },
      {
        exteriorColor: '#7a5244',
        trimColor: '#454a50',
        accentColor: '#585d64',
        roofColor: '#404449',
        doorColor: '#3b484c',
        shutterColor: '#454a50',
        exteriorTexture: 'brick',
      },
    ],
  },
};
