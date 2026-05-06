import { FarmWorld } from "./FarmWorld";

export const Worlds = {
  FARM: FarmWorld
};

export type WorldKey = keyof typeof Worlds;