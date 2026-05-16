export type WidgetType = 
  | 'digital-clock'
  | 'analog-clock'
  | 'looping-video'
  | 'music-player'
  | 'session-timer'
  | 'visualizer'
  | 'pomodoro'
  | 'focus-tracker'
  | 'ambient-stream';

export interface WidgetInstance {
  id: string;           
  type: WidgetType;
  theta: number;            
  phi: number;
  width: number;
  height: number;
  visible: boolean;
  config: Record<string, any>; 
}
