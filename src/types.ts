export type TabOption = {
  id: string;
  type: "tab";
  tabId?: number;
  favIconUrl?: string;
  title?: string;
  url?: string;
};

export type HistoryOption = {
  type: "history";
  id: string;
  title: string;
  url: string;
  favIconUrl?: string;
};

export type CommandOption = {
  type: "command";
  name: string;
  icon: string;
};

export type SwitchOption = TabOption | HistoryOption | CommandOption;

export type ToggleCommandBarMessage = {
  options: SwitchOption[];
};

export type SelectOptionMessage = {
  option: SwitchOption;
};

export interface SearchOptionsData {
  term: string;
}

export interface SearchOptionsResponse {
  options: SwitchOption[];
}
