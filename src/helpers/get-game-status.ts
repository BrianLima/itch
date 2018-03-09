import { IRootState, ITask, DownloadReason } from "../types/index";

import { first } from "underscore";
import getByIds from "./get-by-ids";
import {
  getPendingForGame,
  getActiveDownload,
} from "../reactors/downloads/getters";
import isPlatformCompatible from "../util/is-platform-compatible";
import memoize from "../util/lru-memoize";
import { TaskName } from "../types/tasks";
import {
  Game,
  CaveSummary,
  DownloadKeySummary,
  Download,
  DownloadProgress,
} from "../buse/messages";
import { GameUpdate } from "../buse/messages";

/**
 * What type of access we have to the game - do we own it,
 * have we created it, have we bought it, etc.
 */
export enum Access {
  /**
   * Game cannot be bought
   */
  Free,

  /**
   * Game is pay-what-you-want
   */
  Pwyw,

  /**
   * Game has a demo that can be downloaded for free
   */
  Demo,

  /**
   * Game is in press system and so are we
   */
  Press,

  /**
   * We have a download key for the game
   */
  Key,

  /**
   * We have edit rights on the game page
   */
  Edit,

  /**
   * We have no access to the game whatsoever
   */
  None,
}

export enum OperationType {
  /** The current operation is a download */
  Download,

  /** The current operation is a task */
  Task,
}

export interface IOperation {
  type: OperationType;
  name?: TaskName;
  id?: string;
  reason?: DownloadReason;
  active: boolean;
  paused: boolean;
  progress: number;
  bps?: number;
  eta?: number;
}

export interface IGameStatus {
  downloadKey: DownloadKeySummary;
  cave: CaveSummary;
  access: Access;
  operation: IOperation;
  update: GameUpdate;
  compatible: boolean;
}

export default function getGameStatus(
  rs: IRootState,
  game: Game,
  cave?: CaveSummary
): IGameStatus {
  const { commons, profile, tasks, downloads } = rs;
  const { credentials } = profile;

  let downloadKeys = getByIds(
    commons.downloadKeys,
    commons.downloadKeyIdsByGameId[game.id]
  );

  if (!cave) {
    let caves = getByIds(commons.caves, commons.caveIdsByGameId[game.id]);
    cave = first(caves);
  }
  const downloadKey = first(downloadKeys);

  const pressUser = credentials.me.pressUser;
  const task = first(tasks.tasksByGameId[game.id]);
  const download = first(getPendingForGame(downloads, game.id));
  let isActiveDownload = false;
  let areDownloadsPaused = false;
  let downloadProgress: DownloadProgress;
  if (download) {
    const activeDownload = getActiveDownload(downloads);
    isActiveDownload = download.id === activeDownload.id;
    areDownloadsPaused = downloads.paused;
    downloadProgress = downloads.progresses[download.id];
  }

  let update: GameUpdate;
  if (cave) {
    update = rs.gameUpdates.updates[cave.id];
  }

  return realGetGameStatus(
    game,
    cave,
    downloadKey,
    pressUser,
    task,
    download,
    downloadProgress,
    update,
    isActiveDownload,
    areDownloadsPaused
  );
}

function rawGetGameStatus(
  game: Game,
  cave: CaveSummary,
  downloadKey: DownloadKeySummary,
  pressUser: boolean,
  task: ITask,
  download: Download,
  downloadProgress: DownloadProgress,
  update: GameUpdate,
  isDownloadActive,
  areDownloadsPaused
): IGameStatus {
  let access = Access.None;
  if (!(game.minPrice > 0)) {
    if (game.canBeBought) {
      access = Access.Pwyw;
    } else {
      access = Access.Free;
    }
  } else {
    // game has minimum price
    if (downloadKey) {
      // we have download keys
      access = Access.Key;
    } else {
      // we have no download keys
      if (game.inPressSystem && pressUser) {
        access = Access.Press;
      } else {
        // we have
      }
    }
  }

  let operation: IOperation = null;

  if (task) {
    operation = {
      type: OperationType.Task,
      name: task.name,
      active: true,
      paused: false,
      progress: task.progress,
      eta: task.eta,
      bps: task.bps,
    };
  } else if (download) {
    let p = downloadProgress || { progress: null, eta: null, bps: null };
    operation = {
      type: OperationType.Download,
      id: download.id,
      reason: download.reason,
      active: isDownloadActive,
      paused: areDownloadsPaused,
      progress: p.progress,
      eta: p.eta,
      bps: p.bps,
    };
  }

  const compatible = isPlatformCompatible(game);
  return {
    cave,
    downloadKey,
    access,
    operation,
    update,
    compatible,
  };
}
const realGetGameStatus = memoize(300, rawGetGameStatus);
