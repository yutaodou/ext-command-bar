export type FilterableOption = {
  id: string;
  title: string;
  url: string;
  type: string;
};

export type TabOption = FilterableOption & {
  id: string;
  type: "tab";
  tabId?: number;
  favIconUrl?: string;
  actionText: string;
};

export type HistoryOption = FilterableOption & {
  id: string;
  type: "history";
  favIconUrl?: string;
  actionText: string;
};

export type BookmarkOption = FilterableOption & {
  type: "bookmark";
  id: string;
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
