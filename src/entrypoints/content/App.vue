<script lang="ts" setup>
import { nextTick, onMounted, ref, watch } from "vue";
import { onMessage, sendMessage } from "webext-bridge/content-script";
import "~/assets/tailwind.css";
import { SwitchOption } from "~/types";

const searchQuery = ref("");
const focusedIndex = ref(-1);
const searchInput = ref<HTMLInputElement | null>(null);
const tabs = ref<SwitchOption[]>([]);
const isComposing = ref(false);

const toggleCommandBarDisplay = (options?: SwitchOption[]) => {
  const commandBar = document.querySelector("ext-command-bar") as HTMLElement;
  if (!commandBar) return;
  commandBar.shadowRoot?.querySelector("#command-bar-container")?.classList.toggle("hidden");
  searchQuery.value = "";
  searchInput.value?.focus();
  if (options) {
    tabs.value = options;
    focusedIndex.value = options.length > 0 ? 0 : -1;
  }
};
onMessage("toggleCommandBar", (message) => {
  toggleCommandBarDisplay(message.data?.options as SwitchOption[]);
});

const selectTab = (index: number) => {
  const tab = tabs.value[index];
  console.log("selectTab", tab);
  sendMessage("selectOption", { option: tab });
  toggleCommandBarDisplay();
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (isComposing.value) return;

  switch (event.key) {
    case "Escape":
      event.preventDefault();
      toggleCommandBarDisplay();
      break;
    case "ArrowDown":
      event.preventDefault();
      if (focusedIndex.value === tabs.value.length - 1) {
        focusedIndex.value = 0;
      } else {
        focusedIndex.value++;
      }
      break;
    case "ArrowUp":
      event.preventDefault();
      if (focusedIndex.value === 0) {
        focusedIndex.value = tabs.value.length - 1;
        // Use nextTick to ensure reliable focus
        nextTick(() => {
          searchInput.value?.focus();
        });
      } else if (focusedIndex.value > 0) {
        focusedIndex.value--;
      }
      break;
    case "Enter":
      event.preventDefault();
      if (focusedIndex.value >= 0) {
        selectTab(focusedIndex.value);
      }
      break;
  }
};

const focusItem = (index: number) => {
  focusedIndex.value = index;
};

// Add debounce utility function
const debounce = (fn: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

// Add search handler
const handleSearch = async (term: string) => {
  const response = await sendMessage("searchOptions", { term }, "background");
  if (response) {
    tabs.value = response.options;
    // Reset focus to first item if we have results, otherwise clear focus
    focusedIndex.value = response.options.length > 0 ? 0 : -1;
  }
};

// Create debounced search
const debouncedSearch = debounce(handleSearch, 100);

// Watch for changes in searchQuery
watch(searchQuery, (newValue) => {
  debouncedSearch(newValue);
});

onMounted(() => {
  // Focus search input when component mounts
  searchInput.value?.focus();
});
</script>

<template>
  <div id="command-bar-container" class="fixed inset-0 flex items-center justify-center hidden">
    <div class="absolute inset-0 bg-black/50 pointer-events-auto"></div>
    <div
      class="w-[600px] bg-white rounded-xl shadow-lg overflow-hidden pointer-events-auto relative"
      @keydown="handleKeyDown"
    >
      <!-- Search Bar -->
      <div class="flex items-center px-4 py-3 border-b border-gray-100">
        <div class="text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fill-rule="evenodd"
              d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
        <input
          id="search-input"
          ref="searchInput"
          type="text"
          v-model="searchQuery"
          placeholder="Search or Enter URL..."
          class="w-full px-3 py-2 text-gray-600 placeholder-gray-400 focus:outline-none"
          autocomplete="off"
          spellcheck="false"
          @focus="focusedIndex = -1"
          @compositionstart="isComposing = true"
          @compositionend="isComposing = false"
        />
        <button class="text-gray-400 hover:text-gray-600">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fill-rule="evenodd"
              d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
      </div>

      <!-- Tab List -->
      <div class="max-h-[400px] overflow-y-auto">
        <div
          v-for="(tab, index) in tabs"
          :key="index"
          :class="[
            'flex items-center justify-between px-4 py-3 cursor-pointer',
            focusedIndex === index ? 'bg-indigo-100' : 'hover:bg-gray-50',
          ]"
          tabindex="0"
          @focus="focusItem(index)"
          @click="selectTab(index)"
        >
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <span class="text-xl w-5 h-5 flex-shrink-0 flex items-center justify-center">
              <template v-if="tab.type === 'command'">
                {{ tab.icon }}
              </template>
              <img v-else-if="tab.favIconUrl" :src="tab.favIconUrl" class="w-4 h-4" alt="" />
              <span v-else>📄</span>
            </span>
            <span class="text-gray-700 truncate">
              {{ tab.type === "command" ? tab.name : tab.type === "history" ? tab.title : tab.title || "Untitled Tab" }}
            </span>
          </div>
          <button class="flex items-center gap-3 pl-4 text-gray-400 hover:text-gray-600 flex-shrink-0">
            <span>{{ 
              tab.type === 'history' ? 'Open Page' : 
              tab.type === 'bookmark' ? 'Open Bookmark' :
              'Switch to Tab' 
            }}</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fill-rule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
