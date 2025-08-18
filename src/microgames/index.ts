/// src/microgames/index.ts

import AvoidGame from './avoid';
import BuildGame from './build';
import CatchGame from './catch';
import ClawGame from './claw';
import CleanGame from './clean';
import CollectGame from './collect';
import ConsumeGame from './consume';
import DropGame from './drop';
import EscapeGame from './escape';
import FrameGame from './frame';
import GrabGame from './grab';
import GrowGame from './grow';
import LikeGame from './like';
import LineUpGame from './lineup';
import MatchGame from './match';
import MatchUpGame from './matchup';
import OrganizeGame from './organize';
import PackageGame from './package';
import PopGame from './pop';
import SpotGame from './spot';
import TradeGame from './trade';
import VoteGame from './vote';

export const microgames: { [key: string]: React.FC<any> } = {
  avoid: AvoidGame,
  build: BuildGame,
  catch: CatchGame,
  claw: ClawGame,
  clean: CleanGame,
  collect: CollectGame,
  consume: ConsumeGame,
  drop: DropGame,
  escape: EscapeGame,
  frame: FrameGame,
  grab: GrabGame,
  grow: GrowGame,
  like: LikeGame,
  lineup: LineUpGame,
  match: MatchGame,
  matchup: MatchUpGame,
  organize: OrganizeGame,
  package: PackageGame,
  pop: PopGame,
  spot: SpotGame,
  trade: TradeGame,
  vote: VoteGame,
};