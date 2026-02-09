<template>
    <div class="dashboard">
        <div class="page-header">
            <h1 class="page-title">
                <el-icon>
                    <Monitor/>
                </el-icon>
                仪表盘
            </h1>
        </div>

        <div class="stats-grid">
            <div class="stat-card primary">
                <div class="stat-label">总请求数</div>
                <div class="stat-value">{{ formatNumber(statsStore.summary.TotalRequests || 0) }}</div>
            </div>
            <div class="stat-card success">
                <div class="stat-label">成功率</div>
                <div class="stat-value">{{ successRate }}<span class="stat-suffix">%</span></div>
            </div>
            <div class="stat-card warning">
                <div class="stat-label">输入 Token</div>
                <div class="stat-value">{{ formatNumber(statsStore.summary.TotalInputTokens || 0) }}</div>
            </div>
            <div class="stat-card info">
                <div class="stat-label">输出 Token</div>
                <div class="stat-value">{{ formatNumber(statsStore.summary.TotalOutputTokens || 0) }}</div>
            </div>
        </div>

        <div class="grid-2">
            <div class="content-card">
                <div class="card-header">
          <span class="card-title">
            <el-icon><Link/></el-icon>
            活跃节点
          </span>
                </div>
                <div class="card-body">
                    <el-table :data="enabledEndpoints" stripe v-loading="endpointsStore.loading">
                        <el-table-column prop="name" label="名称"/>
                        <el-table-column prop="transformer" label="类型">
                            <template #default="{ row }">
                                <el-tag size="small">{{ getTransformerLabel(row.transformer) }}</el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column label="状态" width="100">
                            <template #default>
                                <div class="endpoint-status">
                                    <span class="status-dot online"></span>
                                    <span>在线</span>
                                </div>
                            </template>
                        </el-table-column>
                    </el-table>
                    <div v-if="enabledEndpoints.length === 0 && !endpointsStore.loading" class="empty-state">
                        <el-icon>
                            <Link/>
                        </el-icon>
                        <div class="empty-title">暂无节点</div>
                        <div class="empty-desc">请先添加节点</div>
                    </div>
                </div>
            </div>

            <div class="content-card">
                <div class="card-header">
          <span class="card-title">
            <el-icon><DataLine/></el-icon>
            请求统计
          </span>
                </div>
                <div class="card-body">
                    <div class="chart-container">
                        <canvas ref="chartRef"></canvas>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import {ref, computed, onMounted, onUnmounted, nextTick} from "vue";
import {ElMessage} from "element-plus";
import {Chart, registerables} from "chart.js";
import {useEndpointsStore} from "@/stores/endpoints";
import {useStatsStore} from "@/stores/stats";
import {formatNumber} from "@/utils/format";
import {getTransformerLabel} from "@/utils/constants";

Chart.register(...registerables);

const endpointsStore = useEndpointsStore();
const statsStore = useStatsStore();

const chartRef = ref(null);
let chartInstance = null;

// Computed
const enabledEndpoints = computed(() =>
    endpointsStore.endpoints.filter(ep => ep.enabled)
);

const successRate = computed(() => {
    const total = statsStore.summary.TotalRequests || 0;
    const errors = statsStore.summary.TotalErrors || 0;
    if (total === 0) return "0.0";
    return ((total - errors) / total * 100).toFixed(1);
});

// Methods
async function loadData() {
    try {
        await Promise.all([
            statsStore.fetchSummary(),
            endpointsStore.fetchEndpoints(),
            statsStore.fetchDaily()
        ]);
        await nextTick();
        renderChart();
    } catch (error) {
        ElMessage.error("加载数据失败: " + error.message);
    }
}

function renderChart() {
    if (!chartRef.value) {
        return setTimeout(renderChart,150);
    }
    if (chartInstance) chartInstance.destroy();

    const epStats = statsStore.daily.endpoints || {};
    const labels = Object.keys(epStats);
    const data = labels.map(ep => epStats[ep].requests || 0);

    chartInstance = new Chart(chartRef.value, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "请求数",
                data,
                backgroundColor: "rgba(64, 158, 255, 0.8)",
                borderColor: "#409eff",
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {legend: {display: false}},
            scales: {
                y: {beginAtZero: true, grid: {color: "rgba(0,0,0,0.05)"}},
                x: {grid: {display: false}}
            }
        }
    });
}

function handleStatsUpdate(event) {
    if (event.detail.stats) {
        statsStore.summary.value = event.detail.stats;
    }
    if (event.detail.daily){
        statsStore.daily.value = event.detail.daily;
    }
    renderChart();
}

// Lifecycle
onMounted(() => {
    loadData();
    window.addEventListener("stats-update", handleStatsUpdate);
});

onUnmounted(() => {
    if (chartInstance) chartInstance.destroy();
    window.removeEventListener("stats-update", handleStatsUpdate);
});
</script>
