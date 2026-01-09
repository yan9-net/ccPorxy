<template>
  <div class="stats">
    <div class="page-header">
      <h1 class="page-title">
        <el-icon><DataLine /></el-icon>
        统计数据
      </h1>
      <el-button type="primary" @click="loadStats">
        <el-icon><Refresh /></el-icon>
        刷新数据
      </el-button>
    </div>

    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <el-tab-pane label="每日统计" name="daily">
        <div class="content-card">
          <div class="card-body">
            <div v-loading="statsStore.loading">
              <div v-if="hasDaily" class="stats-content">
                <p>总请求: {{ statsStore.daily.total || 0 }}</p>
                <p>成功: {{ statsStore.daily.success || 0 }}</p>
                <p>失败: {{ statsStore.daily.errors || 0 }}</p>
              </div>
              <div v-else class="empty-state">
                <el-icon><DataLine /></el-icon>
                <div class="empty-title">暂无数据</div>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="每周统计" name="weekly">
        <div class="content-card">
          <div class="card-body">
            <div v-loading="statsStore.loading">
              <div v-if="hasWeekly" class="stats-list">
                <div v-for="(item, index) in statsStore.weekly" :key="index" class="stats-item">
                  <span>{{ item.date }}</span>
                  <span>请求: {{ item.requests || 0 }}</span>
                </div>
              </div>
              <div v-else class="empty-state">
                <el-icon><DataLine /></el-icon>
                <div class="empty-title">暂无数据</div>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="每月统计" name="monthly">
        <div class="content-card">
          <div class="card-body">
            <div v-loading="statsStore.loading">
              <div v-if="hasMonthly" class="stats-list">
                <div v-for="(item, index) in statsStore.monthly" :key="index" class="stats-item">
                  <span>{{ item.date }}</span>
                  <span>请求: {{ item.requests || 0 }}</span>
                </div>
              </div>
              <div v-else class="empty-state">
                <el-icon><DataLine /></el-icon>
                <div class="empty-title">暂无数据</div>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useStatsStore } from '@/stores/stats'

const statsStore = useStatsStore()
const activeTab = ref('daily')

const hasDaily = computed(() => Object.keys(statsStore.daily).length > 0)
const hasWeekly = computed(() => statsStore.weekly.length > 0)
const hasMonthly = computed(() => statsStore.monthly.length > 0)

async function loadStats() {
  try {
    switch (activeTab.value) {
      case 'daily':
        await statsStore.fetchDaily()
        break
      case 'weekly':
        await statsStore.fetchWeekly()
        break
      case 'monthly':
        await statsStore.fetchMonthly()
        break
    }
  } catch (error) {
    ElMessage.error('加载统计数据失败: ' + error.message)
  }
}

function handleTabChange() {
  loadStats()
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.stats-content {
  padding: 20px;
}

.stats-content p {
  margin: 10px 0;
  font-size: 16px;
}

.stats-list {
  padding: 20px;
}

.stats-item {
  display: flex;
  justify-content: space-between;
  padding: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.stats-item:last-child {
  border-bottom: none;
}
</style>
