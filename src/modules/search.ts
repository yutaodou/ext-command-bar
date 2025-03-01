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

const generateNGrams = (str: string, minGram = 2, maxGram = 3): string[] => {
  if (str.length < minGram) return [];

  const ngrams: string[] = [];
  for (let n = minGram; n <= maxGram && n <= str.length; n++) {
    for (let i = 0; i <= str.length - n; i++) {
      ngrams.push(str.slice(i, i + n));
    }
  }
  return ngrams;
};
// Process each token and generate additional n-grams

const processTerm = (term: string, fieldName?: string): string | string[] => {
  if (!term) {
    return [];
  }
  return [term, ...generateNGrams(term, 3, 10)];
};

export const tokenize = (text: string, fieldName?: string): string[] => {
  if (!text || typeof text !== "string") {
    return [];
  }

  const normalizedText = text.toLowerCase();

  return (
    normalizedText
      .split(/[\s\-_.,!?;:'"()\[\]{}\/\\]+/)
      // Split between ASCII and non-ASCII character sequences
      .flatMap((token) => token.split(/(?=[^\x00-\x7F]+)|(?<=[^\x00-\x7F]+)(?=[a-z0-9])/i))
      // Remove empty tokens
      .filter((token) => token.length > 0)
      .filter((token) => !/^\d+$/.test(token))
  );
};

export const search = (term: string, filterOptions: FilterableOption[], maxResults: number = 10) => {
  if (!term) {
    return filterOptions.slice(0, maxResults);
  }

  // Deduplicate options by URL, keeping the highest priority item
  const dedupedOptions = deduplicateFilterOptions(filterOptions);

  const miniSearch = new MiniSearch({
    fields: ["id", "title", "url", "search", "hash"],
    storeFields: ["id", "title", "url", "type"],
    tokenize,
    processTerm,
    searchOptions: {
      boost: {
        title: 4,
        url: 3,
        search: 2,
        hash: 1,
      },
      combineWith: "AND",
      fuzzy: 0.1,
    },
  });
  const docs = dedupedOptions.map(convertToDoc);
  miniSearch.addAll(docs);

  const searchResults = miniSearch.search(term);

  // Create a map of original options for quick lookup
  const optionsMap = new Map(dedupedOptions.map((opt) => [opt.id, opt]));

  const deduplicated = deduplicate(searchResults, keyExtractor);
  const sorted = deduplicated.sort(sortByType).slice(0, maxResults);

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
  console.log(`Result count:${result.length} for term: ${result[0]?.queryTerms}`);
  result.forEach((item) => {
    console.log(`  ${item.score} ${item.type} ${JSON.stringify(item)}`);
  });
};

const keyExtractor = (item: SearchResult) => {
  const host = new URL(item.url).host;
  return `${host}-${item.title}`;
};

const deduplicate = (result: SearchResult[], extractor: (item: SearchResult) => string): SearchResult[] => {
  const seen = new Set();
  const uniq: SearchResult[] = [];
  result.forEach((item) => {
    const key = extractor(item);
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    uniq.push(item);
  });

  return uniq;
};

const deduplicateFilterOptions = (filterOptions: FilterableOption[]): FilterableOption[] => {
  const uniqueOptions = new Map<string, FilterableOption>();
  filterOptions.forEach((option) => {
    const url = new URL(option.url);
    const baseUrl = `${url.origin}${url.pathname}`;
    const existingOption = uniqueOptions.get(baseUrl);

    if (
      !existingOption ||
      TYPE_ORDER[option.type as keyof typeof TYPE_ORDER] < TYPE_ORDER[existingOption.type as keyof typeof TYPE_ORDER]
    ) {
      uniqueOptions.set(baseUrl, option);
    }
  });

  return Array.from(uniqueOptions.values());
};
