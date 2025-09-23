// export enum SkillRank {
//   N = 1, // Newbie
//   S = 2, // Starter
//   BG = 3, // Beginner (หน้าบ้าน)
//   P = 4, // Practicer
// }

export enum PlayerState {
  Idle = 'Idle',         // never enqueued yet
  Waiting = 'Waiting',   // in queue
  Playing = 'Playing'    // currently in a game
}

export enum RuntimeState {
  Idle = 'Idle',      
  Waiting = 'Waiting',
  Playing = 'Playing'
}
