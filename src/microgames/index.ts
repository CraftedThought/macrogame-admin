import React from 'react';
import { MicrogameProps } from '../types';

// Import all the new React components
import AvoidGame from './avoid';
import CatchGame from './catch';
import ClawGame from './claw';
import CleanGame from './clean';
import CollectGame from './collect';
import ConsumeGame from './consume';
import EscapeGame from './escape';
import GrowGame from './grow';
import PackageGame from './package';
import TrimGame from './trim';

// The complete registry maps a microgame ID to its React Component.
// The IDs match the ones used in your `seedDatabase.ts` file.
export const microgames: { [key: string]: React.FC<MicrogameProps> } = {
  'avoid': AvoidGame,
  'catch': CatchGame,
  'claw': ClawGame,
  'clean': CleanGame,
  'collect': CollectGame,
  'consume': ConsumeGame,
  'escape': EscapeGame,
  'grow': GrowGame,
  'package': PackageGame,
  'trim': TrimGame,
};