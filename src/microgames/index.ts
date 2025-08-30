// src/microgames/index.ts

import React from 'react';

// Use React.lazy for dynamic imports. This allows for code-splitting.
const AvoidGame = React.lazy(() => import('./avoid'));
const BuildGame = React.lazy(() => import('./build'));
const CatchGame = React.lazy(() => import('./catch'));
const ClawGame = React.lazy(() => import('./claw'));
const CleanGame = React.lazy(() => import('./clean'));
const CollectGame = React.lazy(() => import('./collect'));
const ConsumeGame = React.lazy(() => import('./consume'));
const DropGame = React.lazy(() => import('./drop'));
const EscapeGame = React.lazy(() => import('./escape'));
const FrameGame = React.lazy(() => import('./frame'));
const GrabGame = React.lazy(() => import('./grab'));
const GrowGame = React.lazy(() => import('./grow'));
const LikeGame = React.lazy(() => import('./like'));
const LineUpGame = React.lazy(() => import('./lineup'));
const MatchGame = React.lazy(() => import('./match'));
const MatchUpGame = React.lazy(() => import('./matchup'));
const OrganizeGame = React.lazy(() => import('./organize'));
const PackageGame = React.lazy(() => import('./package'));
const PopGame = React.lazy(() => import('./pop'));
const SpotGame = React.lazy(() => import('./spot'));
const TradeGame = React.lazy(() => import('./trade'));
const VoteGame = React.lazy(() => import('./vote'));

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