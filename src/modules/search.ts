import { FilterableOption } from "@/types";
import MiniSearch, { SearchResult } from "minisearch";
import { toPinyin, containsChinese } from "./pinyinUtils";

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

  if (fieldName === "title" && containsChinese(normalizedText)) {
    const pinyinText = toPinyin(normalizedText).toLowerCase();
    const originalTokens = tokenizeText(normalizedText);
    const pinyinTokens = tokenizeText(pinyinText);

    return [...new Set([...originalTokens, ...pinyinTokens])];
  }

  return tokenizeText(normalizedText);
};

/**
 * Tokenizes a normalized text string into an array of words and terms.
 * 
 * @param normalizedText - The text to tokenize, already normalized
 * @returns An array of tokens extracted from the text
 * 
 * The tokenization process works as follows:
 * 1. Splits the text on common separators (spaces, punctuation, brackets, etc.)
 * 2. Further splits tokens at boundaries between non-ASCII characters and alphanumeric characters
 *    to properly handle mixed scripts (e.g., Latin and CJK characters)
 * 3. Filters out empty tokens
 */
const tokenizeText = (normalizedText: string): string[] => {
  return normalizedText
    .split(/[\s\-_.,!?;:'"()\[\]{}\/\\]+/)
    .flatMap((token) => token.split(/(?=[^\x00-\x7F]+)|(?<=[^\x00-\x7F]+)(?=[a-z0-9])/i))
    .filter((token) => token.length > 0);
};

export const search = (term: string, filterOptions: FilterableOption[], maxResults: number = 10) => {
  if (!term) {
    return filterOptions.slice(0, maxResults);
  }

  const dedupedOptions = deduplicateFilterOptions(filterOptions);

  const docsWithPinyin = dedupedOptions.map((option) => {
    return convertToDoc(option);
  });

  const miniSearch = new MiniSearch({
    fields: ["id", "title", "url", "search", "hash"],
    storeFields: ["id", "title", "url", "search", "hash", "type"],
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

  miniSearch.addAll(docsWithPinyin);

  // If the search term contains Chinese, also search its pinyin version
  let searchResults: SearchResult[] = [];
  if (containsChinese(term)) {
    const pinyinTerm = toPinyin(term).toLowerCase();
    searchResults = miniSearch.search(pinyinTerm);
  }

  // Merge with results from original search term
  const originalResults = miniSearch.search(term);
  searchResults = mergeResults([...searchResults, ...originalResults]);

  // Create a map of original options for quick lookup
  const optionsMap = new Map(dedupedOptions.map((opt) => [opt.id, opt]));

  const deduplicated = deduplicate(searchResults, keyExtractor);
  const sorted = deduplicated.sort(sortByType).slice(0, maxResults);

  return sorted.map((result) => optionsMap.get(result.id)!);
};

// Merge search results, prioritizing higher scores
const mergeResults = (results: SearchResult[]): SearchResult[] => {
  const merged = new Map<string, SearchResult>();

  results.forEach((result) => {
    const existing = merged.get(result.id);
    if (!existing || result.score > existing.score) {
      merged.set(result.id, result);
    }
  });

  return Array.from(merged.values());
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
