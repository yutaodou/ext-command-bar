<script lang="ts" setup>
import "~/assets/tailwind.css";
import { ref, onMounted, nextTick } from "vue";

const searchQuery = ref("");
const focusedIndex = ref(-1);
const searchInput = ref<HTMLInputElement | null>(null);

const tabs = [
  { icon: "📧", name: "Outlook", highlighted: true },
  { icon: "🎨", name: "Untitled Easel" },
  { icon: "𝕏", name: "Twitter" },
  { icon: "📝", name: "Microsoft To Do" },
  { icon: "💬", name: "Contact the Team" },
];

const selectTab = (index: number) => {
  // TODO: Implement actual tab switching logic
  console.log(`Switching to tab: ${tabs[index].name}`);
};

const handleKeyDown = (event: KeyboardEvent) => {
  switch (event.key) {
    case "ArrowDown":
      event.preventDefault();
      if (focusedIndex.value === tabs.length - 1) {
        focusedIndex.value = 0;
      } else {
        focusedIndex.value++;
      }
      break;
    case "ArrowUp":
      event.preventDefault();
      if (focusedIndex.value === 0) {
        focusedIndex.value = -1;
        // Use nextTick to ensure reliable focus
        nextTick(() => {
          searchInput.value?.focus();
        });
      } else if (focusedIndex.value > 0) {
        focusedIndex.value--;
      }
      break;
    case "Enter":
    case " ": // Space key
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

onMounted(() => {
  // Focus search input when component mounts
  searchInput.value?.focus();
});
</script>

<template>
  <div class="fixed inset-0 flex items-center justify-center">
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
          ref="searchInput"
          type="text"
          v-model="searchQuery"
          placeholder="Search or Enter URL..."
          class="w-full px-3 py-2 text-gray-600 placeholder-gray-400 focus:outline-none"
          @focus="focusedIndex = -1"
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
          :key="tab.name"
          :class="[
            'flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer',
            tab.highlighted ? 'bg-indigo-100' : '',
            focusedIndex === index ? 'bg-blue-100 outline-none ring-2 ring-blue-400' : '',
          ]"
          tabindex="0"
          @focus="focusItem(index)"
          @click="selectTab(index)"
        >
          <div class="flex items-center gap-3">
            <span class="text-xl">{{ tab.icon }}</span>
            <span class="text-gray-700">{{ tab.name }}</span>
          </div>
          <button class="flex items-center gap-2 text-gray-400 hover:text-gray-600">
            <span>Switch to Tab</span>
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
