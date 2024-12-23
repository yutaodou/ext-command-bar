export type TabOption = {
  type: "tab";
  favIconUrl?: string;
  title?: string;
  url?: string;
};

export type HistoryOption = {
  type: "history";
  favIconUrl: string;
  title: string;
  url: string;
};

export type CommandOption = {
  type: "command";
  name: string;
  icon: string;
};

export type SwitchOption = TabOption | HistoryOption | CommandOption;

export type ToggleCommandBarMessage = {
  options: TabOption[];
};
