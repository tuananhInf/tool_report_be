export interface MevMessage {
  from: string;
  module: string;
  content: {
    type: string;
    level: string;
    data: string;
  };
}
