import { ProtocolWithReturn } from "webext-bridge";

declare module "webext-bridge" {
  export interface ProtocolMap {
    toggleCommandBar: ToggleCommandBarMessage;
    selectOption: SelectOptionMessage;
    searchOptions: ProtocolWithReturn<SearchOptionsData, SearchOptionsResponse>;
  }
}
