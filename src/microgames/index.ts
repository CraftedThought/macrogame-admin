// src/microgames/index.ts

import React from 'react';

// Use React.lazy for dynamic imports. This allows for code-splitting.
const AvoidGame = React.lazy(() => import('./games/avoid'));
const BuildGame = React.lazy(() => import('./games/build'));
const CatchGame = React.lazy(() => import('./games/catch'));
const ClawGame = React.lazy(() => import('./games/claw'));
const CleanGame = React.lazy(() => import('./games/clean'));
const CollectGame = React.lazy(() => import('./games/collect'));
const ConsumeGame = React.lazy(() => import('./games/consume'));
const DropGame = React.lazy(() => import('./games/drop'));
const EscapeGame = React.lazy(() => import('./games/escape'));
const FrameGame = React.lazy(() => import('./games/frame'));
const GrabGame = React.lazy(() => import('./games/grab'));
const GrowGame = React.lazy(() => import('./games/grow'));
const LikeGame = React.lazy(() => import('./games/like'));
const LineUpGame = React.lazy(() => import('./games/lineup'));
const MatchGame = React.lazy(() => import('./games/match'));
const MatchUpGame = React.lazy(() => import('./games/matchup'));
const OrganizeGame = React.lazy(() => import('./games/organize'));
const PackageGame = React.lazy(() => import('./games/package'));
const PopGame = React.lazy(() => import('./games/pop'));
const SpotGame = React.lazy(() => import('./games/spot'));
const TradeGame = React.lazy(() => import('./games/trade'));
const VoteGame = React.lazy(() => import('./games/vote'));

// New Chance-Based Games
const CupAndBallGame = React.lazy(() => import('./games/cupandball'));
const PickAGiftGame = React.lazy(() => import('./games/pickagift'));
const RollDiceGame = React.lazy(() => import('./games/rolldice'));
const ScratchCardGame = React.lazy(() => import('./games/scratchcard'));
const SpinWheelGame = React.lazy(() => import('./games/spinwheel'));

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
  cupandball: CupAndBallGame,
  pickagift: PickAGiftGame,
  rolldice: RollDiceGame,
  scratchcard: ScratchCardGame,
  spinthewheel: SpinWheelGame,
};