export type TabOption = {
  id: string;
  type: "tab";
  tabId?: number;
  favIconUrl?: string;
  title?: string;
  url?: string;
  actionText: string;
};

export type HistoryOption = {
  type: "history";
  id: string;
  title: string;
  url: string;
  favIconUrl?: string;
  actionText: string;
};

export type CommandOption = {
  type: "command";
  name: string;
  icon: string;
  action: "search";
  searchTerm?: string;
  actionText: string;
};

export type BookmarkOption = {
  type: "bookmark";
  id: string;
  title: string;
  url: string;
  favIconUrl?: string;
  actionText: string;
};

export type SwitchOption = TabOption | HistoryOption | CommandOption | BookmarkOption;

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
