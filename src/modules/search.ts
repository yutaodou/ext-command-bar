import { FilterableOption } from "@/types";
import MiniSearch from "minisearch";

const TYPE_ORDER = {
  tab: 0,
  history: 1,
  bookmark: 2,
};

export const search = (term: string, filterOptions: FilterableOption[], maxResults: number = 10) => {
  if (!term) {
    return filterOptions.slice(0, maxResults);
  }

  const miniSearch = new MiniSearch({
    fields: ["id", "title", "url", "search", "hash"],
    storeFields: ["id", "title", "url", "type"],
    searchOptions: {
      boost: {
        title: 4,
        url: 3,
        search: 2,
        hash: 1,
      },
      fuzzy: 1,
    },
  });
  const docs = filterOptions.map(convertToDoc);
  miniSearch.addAll(docs);

  const searchResults = miniSearch.search(term);

  // Create a map of original options for quick lookup
  const optionsMap = new Map(filterOptions.map((opt) => [opt.id, opt]));

  return searchResults
    .sort((a, b) => {
      // First sort by type order
      const typeOrderDiff =
        TYPE_ORDER[a.type as keyof typeof TYPE_ORDER] - TYPE_ORDER[b.type as keyof typeof TYPE_ORDER];
      if (typeOrderDiff !== 0) return typeOrderDiff;
      // Then sort by score
      return b.score - a.score;
    })
    .slice(0, maxResults)
    .map((result) => optionsMap.get(result.id)!);
};

const convertToDoc = (option: FilterableOption) => {
  const optionUrl = new URL(option.url);
  return {
    id: option.id,
    title: option.title,
    type: option.type,
    url: `${optionUrl.origin}${optionUrl.pathname}`,
    search: optionUrl.search,
    hash: optionUrl.hash,
  };
};
