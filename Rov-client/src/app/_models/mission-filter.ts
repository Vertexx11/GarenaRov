export type MissionStatus = 'Open' | 'InProgress' | 'Completed' | 'Failed';

export interface MissionFilter {
  name?: string;
  status?: MissionStatus;
}