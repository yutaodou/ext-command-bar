import { FilterableOption } from "@/types";
import MiniSearch, { SearchResult } from "minisearch";

const TYPE_ORDER = {
  tab: 0,
  history: 1,
  bookmark: 2,
};

const sortByType = (a: SearchResult, b: SearchResult): number => {
  const typeOrderDiff = TYPE_ORDER[a.type as keyof typeof TYPE_ORDER] - TYPE_ORDER[b.type as keyof typeof TYPE_ORDER];
  if (typeOrderDiff !== 0) return typeOrderDiff;
  return b.score - a.score;
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
      prefix: true,
      combineWith: "AND",
      fuzzy: 0.2,
    },
  });
  const docs = filterOptions.map(convertToDoc);
  miniSearch.addAll(docs);
  const searchResults = miniSearch.search(term);

  const deduplicated = deduplicateByUrl(searchResults);
  const sorted = deduplicated.sort(sortByType).slice(0, maxResults);

  const optionsMap = new Map(filterOptions.map((opt) => [opt.id, opt]));
  return sorted.map((result) => optionsMap.get(result.id)!);
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

const debug = (result: SearchResult[]) => {
  console.log(`Result count:${result.length}`);
  result.forEach((item) => {
    console.log(`  ${item.score} ${item.type} ${item.title} ${item.url}`);
  });
};

const deduplicateByUrl = (result: SearchResult[]): SearchResult[] => {
  const seenUrl = new Set();
  const uniq: SearchResult[] = [];
  result.forEach((item) => {
    if (seenUrl.has(item.url)) {
      return;
    }
    seenUrl.add(item.url);
    uniq.push(item);
  });

  return uniq;
};
