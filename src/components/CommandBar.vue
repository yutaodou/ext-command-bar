<script lang="ts" setup>
import { nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { sendMessage, onMessage } from "webext-bridge/popup";
import { SwitchOption } from "~/types";
import capitalize from  "lodash/capitalize";
import "~/assets/tailwind.css";

const searchQuery = ref("");
const focusedIndex = ref(-1);
const searchInput = ref<HTMLInputElement | null>(null);
const listContainerRef = ref<HTMLDivElement | null>(null); // Added ref for the list container
const tabs = ref<SwitchOption[]>([]);
const isComposing = ref(false);
const searchRequestCounter = ref(0);
const previousTabs = ref<SwitchOption[]>([]);

// Create a port connection to track popup state
const port = ref<any>(null);

// Initial load of switch options
const loadInitialOptions = async () => {
  const response: any = await sendMessage("getInitialOptions", {}, "background");
  if (response && Array.isArray(response.options)) {
    tabs.value = response.options;
    previousTabs.value = response.options;
    focusedIndex.value = response.options.length > 0 ? 0 : -1;
  }
};

const selectTab = async (index: number) => {
  const tab = tabs.value[index];
  await sendMessage("selectOption", { option: tab }, "background");
  window.close(); // Close popup after selection
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (isComposing.value) return;
  switch (event.key) {
    case "Escape":
      event.preventDefault();
      window.close(); // Close popup
      break;
    case "ArrowDown":
      event.preventDefault();
      if (tabs.value.length > 0) {
        if (focusedIndex.value === tabs.value.length - 1) {
          focusedIndex.value = 0;
        } else {
          focusedIndex.value++;
        }
        nextTick(scrollToFocusedItem);
      }
      break;
    case "ArrowUp":
      event.preventDefault();
      if (tabs.value.length > 0) {
        if (focusedIndex.value === 0) {
          focusedIndex.value = tabs.value.length - 1;
        } else if (focusedIndex.value > 0) {
          focusedIndex.value--;
        } else { // focusedIndex.value is -1 (search input focused)
          focusedIndex.value = tabs.value.length - 1; // focus last item
        }
        // Use nextTick to ensure reliable focus and scrolling
        nextTick(() => {
          // If moving from search input to last item, ensure search input doesn't steal focus back immediately
          if (focusedIndex.value < 0 && searchInput.value) {
            searchInput.value.focus();
          }
          scrollToFocusedItem();
        });
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

// Update search handler to maintain current results until new ones arrive
const handleSearch = async (term: string) => {
  const currentRequestId = ++searchRequestCounter.value;
  // if (!term.trim()) {
  //   tabs.value = previousTabs.value;
  //   focusedIndex.value = previousTabs.value.length > 0 ? 0 : -1;
  //   return;
  // }

  const response: any = await sendMessage("searchOptions", { term: term.trim() }, "background");
  if (currentRequestId === searchRequestCounter.value && response && Array.isArray(response.options)) {
    await nextTick(() => {
      tabs.value = response.options;
      focusedIndex.value = response.options.length > 0 ? 0 : -1;
      // Cache results
      if (response.options.length > 0) {
        previousTabs.value = response.options;
      }
    });
  }
};

// Optimize debounce delay
const debouncedSearch = debounce(handleSearch, 150);

// Watch for changes in searchQuery
watch(searchQuery, (newValue) => {
  debouncedSearch(newValue);
});

watch(focusedIndex, () => {
  nextTick(scrollToFocusedItem);
});

const scrollToFocusedItem = () => {
  if (!listContainerRef.value || focusedIndex.value < 0) return;

  const container = listContainerRef.value;
  const focusedItemElement = container.children[focusedIndex.value] as HTMLElement;

  if (focusedItemElement) {
    focusedItemElement.scrollIntoView({ block: 'nearest' });
  }
};

// Add method to clear search input
const clearSearch = () => {
  searchQuery.value = "";
  searchInput.value?.focus();
};

onMounted(() => {
  // Focus search input and load initial options when component mounts
  searchInput.value?.focus();
  loadInitialOptions();

  // Connect to background script to track popup state
  try {
    // @ts-ignore - browser is available in extension context
    port.value = chrome.runtime.connect({ name: "popup-connection" });
  } catch (error) {
    console.error("Failed to connect port:", error);
  }

  // Listen for closePopup message from background
  onMessage("closePopup", () => {
    window.close();
  });
});

onUnmounted(() => {
  // Disconnect port when component is unmounted
  if (port.value) {
    try {
      port.value.disconnect();
    } catch (error) {
      console.error("Failed to disconnect port:", error);
    }
  }
});
</script>

<template>
  <div class="bg-white dark:bg-[#292a2d] rounded-xl dark:shadow-md" style="width: 600px; min-height: 400px;">
    <div class="flex items-center" style="padding: 8px 12px">
      <div class="text-gray-500 dark:text-[#9aa0a6]">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          style="width: 20px; height: 20px"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
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
        class="w-full text-gray-800 dark:text-[#e8eaed] placeholder-gray-500 dark:placeholder-[#9aa0a6] focus:outline-none bg-white dark:bg-[#292a2d]"
        style="padding: 8px 12px; font-size: 16px"
        autocomplete="off"
        spellcheck="false"
        @focus="focusedIndex = -1"
        @compositionstart="isComposing = true"
        @compositionend="isComposing = false"
        @keydown="handleKeyDown"
      />
      <!-- Clear icon -->
      <button 
        v-if="searchQuery"
        class="text-gray-500 dark:text-[#9aa0a6] hover:text-gray-700 dark:hover:text-[#e8eaed]"
        @click="clearSearch"
        aria-label="Clear search"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          style="width: 20px; height: 20px"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clip-rule="evenodd"
          />
        </svg>
      </button>
    </div>
    
    <!-- Tab List -->
    <div ref="listContainerRef" style="max-height: 400px" class="overflow-y-auto pt-2">
      <div
        v-for="(tab, index) in tabs"
        :key="index"
        :class="[
          'flex items-center cursor-pointer transition-colors duration-150 rounded-lg border',
          focusedIndex === index 
            ? 'bg-indigo-50 border-indigo-200 dark:bg-[#3c4043] dark:border-[#4c5055]' 
            : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300 dark:border-[#35363a] dark:hover:bg-[#35363a] dark:hover:border-[#45464a]',
        ]"
        style="padding: 8px 12px; margin: 4px 8px"
        tabindex="0"
        @focus="focusItem(index)"
        @click="selectTab(index)"
      >
        <!-- Left side - Icon -->
        <div class="flex-shrink-0 flex items-center justify-center mr-3" style="height: 40px; width: 40px">
          <div 
            v-if="tab.type === 'command'" 
            class="text-2xl flex items-center justify-center"
            style="width: 32px; height: 32px"
          >
            {{ tab.icon }}
          </div>
          <!-- Update the image to use faviconData instead of favIconUrl -->
          <img 
            v-else-if="tab.faviconData" 
            :src="tab.faviconData"
            style="width: 32px; height: 32px; object-fit: contain" 
            alt=""
            class="rounded"
            loading="lazy"
            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
          />
          <div 
            v-else
            class="text-2xl flex items-center justify-center bg-gray-100 dark:bg-[#3b3c3f] rounded-md"
            style="width: 32px; height: 32px; display: none;"
          >
            <span v-if="tab.type === 'tab'">📄</span>
            <span v-else-if="tab.type === 'history'">🕒</span>
            <span v-else-if="tab.type === 'bookmark'">🔖</span>
            <span v-else>📄</span>
          </div>
        </div>
        
        <!-- Right side - Text content -->
        <div class="flex-1 min-w-0 flex flex-col justify-center">
          <!-- Title -->
          <div class="text-gray-900 dark:text-[#e8eaed] truncate font-medium text-left">
            {{ tab.type === "command" ? tab.name : tab.title || "Untitled Tab" }}
          </div>
          
          <!-- URL/Subtitle -->
          <div class="text-gray-600 dark:text-[#9aa0a6] truncate text-xs text-left">
            {{ tab.type === 'command' ? tab.actionText : tab.url || tab.actionText || "" }}
          </div>
        </div>
        
        <!-- Type badge (with light grey color) -->
        <div class="flex-shrink-0 self-center ml-2">
          <span class="text-xs px-2 py-1 rounded-md font-medium bg-gray-100 border border-gray-200 dark:bg-[#3b3c3f] dark:border-[#4c5055] text-gray-700 dark:text-[#8ab4f8]">
            {{ capitalize(tab.type) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Use pixel units for all text elements */
input,
button,
span,
div {
  font-size: 16px !important;
  line-height: 1.5;
}

/* Make icon text slightly larger */
.icon-container {
  font-size: 20px !important;
}

.transition-colors {
  transition-property: background-color, border-color, color, fill, stroke;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

/* Base typography */
input,
button {
  font-size: 15px;
  line-height: 1.5;
}

/* Override font sizes for specific elements */
.text-xs {
  font-size: 13px !important;
}

.text-2xl {
  font-size: 24px !important;
}

.rounded-xl {
  border-radius: 0.75rem;
}

.rounded-lg {
  border-radius: 0.5rem;
}

.rounded-md {
  border-radius: 0.375rem;
}

.rounded {
  border-radius: 0.25rem;
}

.font-medium {
  font-weight: 500;
}

.text-left {
  text-align: left;
}

/* Ensure consistent icon container size */
.icon-container {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Type badge styles */
.rounded-full {
  border-radius: 9999px;
}

.px-2 {
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

.py-0.5 {
  padding-top: 0.125rem;
  padding-bottom: 0.125rem;
}

.gap-2 {
  gap: 0.5rem;
}

/* Ensure font size for labels */
.text-xs {
  font-size: 0.75rem !important;
  line-height: 1rem !important;
}

/* Header styling */
.text-lg {
  font-size: 1.125rem !important;
  line-height: 1.75rem !important;
}

.font-bold {
  font-weight: 700;
}

.py-3 {
  padding-top: 0.75rem;
  padding-bottom: 0.75rem;
}

/* Reset button styles */
button.border-none {
  border: none;
  padding: 0;
  background: transparent;
}

.p-1 {
  padding: 0.25rem;
}

.px-4 {
  padding-left: 1rem;
  padding-right: 1rem;
}

/* Ensure the close button doesn't use the global button styles */
button.flex {
  border-radius: 9999px;
  transition: background-color 0.15s;
}

/* Smooth transition when switching between light and dark mode */
.bg-white,
.dark\:bg-\[#292a2d\],
.text-gray-800,
.text-gray-900,
.dark\:text-\[#e8eaed\],
.text-gray-600,
.dark\:text-\[#e8eaed\],
.bg-indigo-100,
.bg-indigo-50,
.dark\:bg-\[#3c4043\],
.bg-gray-50,
.dark\:hover\:bg-\[#35363a\],
.bg-gray-100,
.dark\:bg-\[#3b3c3f\],
.border-gray-100,
.border-gray-200,
.dark\:border-\[#35363a\],
.dark\:border-\[#3b3c3f\],
.dark\:border-\[#4c5055\],
.border-indigo-200,
.dark\:border-\[#45464a\] {
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
}

/* Edge browser dark mode placeholder styling */
.dark .placeholder-\[#9aa0a6\]::placeholder {
  color: #9aa0a6;
  opacity: 1;
}

/* Add subtle shadow to the popup only in dark mode */
.dark .shadow-md {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}
</style>
