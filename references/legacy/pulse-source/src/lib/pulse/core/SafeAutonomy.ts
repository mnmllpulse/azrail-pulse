export enum AutonomyLevel {
  HUMAN_ONLY = 0,
  ASSISTANT = 1,
  COPILOT = 2,
  AGENT = 3,
  AUTONOMOUS = 4,
  SELF_OPTIMIZING = 5,
  EVOLUTIONARY = 6
}

export class SafeAutonomy {
  checkAction(action: string, level: AutonomyLevel): boolean {
    // Логика проверки допустимости действия в зависимости от уровня
    return level < AutonomyLevel.AUTONOMOUS;
  }
}
