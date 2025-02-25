<script lang="ts" setup>
import { nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { sendMessage, onMessage } from "webext-bridge/popup";
import { SwitchOption } from "~/types";
import "~/assets/tailwind.css";

const searchQuery = ref("");
const focusedIndex = ref(-1);
const searchInput = ref<HTMLInputElement | null>(null);
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

// Update search handler to maintain current results until new ones arrive
const handleSearch = async (term: string) => {
  const currentRequestId = ++searchRequestCounter.value;
  if (!term.trim()) {
    tabs.value = previousTabs.value;
    focusedIndex.value = previousTabs.value.length > 0 ? 0 : -1;
    return;
  }

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
  <div class="bg-white rounded-xl" style="width: 600px; min-height: 400px;">
    <!-- Search Bar -->
    <div class="flex items-center border-b border-gray-100" style="padding: 8px 12px">
      <div class="text-gray-400">
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
        class="w-full text-gray-600 placeholder-gray-400 focus:outline-none bg-white"
        style="padding: 8px 12px; font-size: 16px"
        autocomplete="off"
        spellcheck="false"
        @focus="focusedIndex = -1"
        @compositionstart="isComposing = true"
        @compositionend="isComposing = false"
        @keydown="handleKeyDown"
      />
      <button class="text-gray-400 hover:text-gray-600">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          style="width: 20px; height: 20px"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
            clip-rule="evenodd"
          />
        </svg>
      </button>
    </div>
    
    <!-- Tab List -->
    <div style="max-height: 400px" class="overflow-y-auto">
      <div
        v-for="(tab, index) in tabs"
        :key="index"
        :class="[
          'flex items-center cursor-pointer transition-colors duration-150 rounded-lg',
          focusedIndex === index ? 'bg-indigo-100' : 'hover:bg-gray-50',
        ]"
        style="padding: 8px 12px; margin: 4px 8px"
        tabindex="0"
        @focus="focusItem(index)"
        @click="selectTab(index)"
      >
        <!-- Left side - Icon (now vertically centered) -->
        <div class="flex-shrink-0 flex items-center justify-center mr-3" style="height: 40px; width: 40px">
          <div 
            v-if="tab.type === 'command'" 
            class="text-2xl flex items-center justify-center"
            style="width: 32px; height: 32px"
          >
            {{ tab.icon }}
          </div>
          <img 
            v-else-if="tab.favIconUrl" 
            :src="tab.favIconUrl" 
            style="width: 32px; height: 32px; object-fit: contain" 
            alt="" 
            class="rounded"
          />
          <div 
            v-else 
            class="text-2xl flex items-center justify-center"
            style="width: 32px; height: 32px"
          >
            📄
          </div>
        </div>
        
        <!-- Right side - Text content (now properly left-aligned) -->
        <div class="flex-1 min-w-0 flex flex-col justify-center">
          <!-- Title -->
          <div class="text-gray-800 truncate font-medium text-left">
            {{ tab.type === "command" ? tab.name : tab.title || "Untitled Tab" }}
          </div>
          
          <!-- URL/Subtitle -->
          <div class="text-gray-500 truncate text-xs text-left">
            {{ tab.type === 'command' ? tab.actionText : tab.url || tab.actionText || "" }}
          </div>
        </div>
        
        <!-- Action button (vertically centered) -->
        <div class="flex-shrink-0 self-center ml-2 flex items-center">
          <div class="text-gray-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              style="width: 16px; height: 16px"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
        </div>
      </div>
      
      <!-- Empty state -->
      <div v-if="tabs.length === 0" class="flex items-center justify-center p-4 text-gray-500" style="height: 100px">
        No results found
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
</style>
