<template>
  <el-config-provider :locale="zhCn">
    <div class="app-container" :class="{ 'dark': appStore.isDark }">
      <Sidebar />
      <main class="main-content">
        <router-view />
      </main>
    </div>
  </el-config-provider>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { useAppStore } from '@/stores/app'
import Sidebar from '@/components/layout/Sidebar.vue'

const appStore = useAppStore()

// Initialize theme and SSE
onMounted(() => {
  appStore.initTheme()
  appStore.initSSE()
})

// Cleanup SSE connection
onUnmounted(() => {
  appStore.closeSSE()
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.app-container {
  display: flex;
  height: 100vh;
  background: var(--el-bg-color-page);
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}
</style>
