import { MicrogameConstructor } from '../components/BaseMicrogame';

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

// This registry maps a microgame ID (from Firestore) to its class.
export const microgames: { [key: string]: MicrogameConstructor } = {
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