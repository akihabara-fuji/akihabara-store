import {BASE_SCENES} from './Scenes';
import {AlurScene, CeklisScene, GrupScene, TrailerScene, PenutupScene} from './Scenes3';
import {SiangMalamScene} from './Scenes4';
import {SplitScene} from './Scenes5';
import {ChatScene, DayCounterScene, LayarScene, MingguScene, NotifScene, RankingScene, StatChartScene, VersusScene} from './Scenes2';

export const PLUS_SCENES = {
  ...BASE_SCENES,
  statchart: StatChartScene, ranking: RankingScene, versus: VersusScene,
  notif: NotifScene, chat: ChatScene, daycounter: DayCounterScene, minggu: MingguScene, layar: LayarScene, grup: GrupScene, alur: AlurScene, ceklis: CeklisScene, trailer: TrailerScene, penutup: PenutupScene, siangmalam: SiangMalamScene,
  split: SplitScene,
};
export const PLUS_TYPES = Object.keys(PLUS_SCENES) as (keyof typeof PLUS_SCENES)[];
