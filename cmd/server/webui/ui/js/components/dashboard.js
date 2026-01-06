// Dashboard Component
const DashboardComponent = {
    template: `
        <div class="dashboard">
            <div class="page-header">
                <h1 class="page-title">
                    <el-icon><Monitor /></el-icon>
                    仪表盘
                </h1>
            </div>

            <div class="stats-grid">
                <div class="stat-card primary">
                    <div class="stat-label">总请求数</div>
                    <div class="stat-value">{{ formatNumber(stats.TotalRequests || 0) }}</div>
                </div>
                <div class="stat-card success">
                    <div class="stat-label">成功率</div>
                    <div class="stat-value">{{ successRate }}<span class="stat-suffix">%</span></div>
                </div>
                <div class="stat-card warning">
                    <div class="stat-label">输入 Token</div>
                    <div class="stat-value">{{ formatNumber(stats.TotalInputTokens || 0) }}</div>
                </div>
                <div class="stat-card info">
                    <div class="stat-label">输出 Token</div>
                    <div class="stat-value">{{ formatNumber(stats.TotalOutputTokens || 0) }}</div>
                </div>
            </div>

            <div class="grid-2">
                <div class="content-card">
                    <div class="card-header">
                        <span class="card-title">
                            <el-icon><Link /></el-icon>
                            活跃节点
                        </span>
                    </div>
                    <div class="card-body">
                        <el-table :data="enabledEndpoints" stripe v-loading="loading">
                            <el-table-column prop="name" label="名称" />
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
                        <div v-if="enabledEndpoints.length === 0 && !loading" class="empty-state">
                            <el-icon><Link /></el-icon>
                            <div class="empty-title">暂无节点</div>
                            <div class="empty-desc">请先添加节点</div>
                        </div>
                    </div>
                </div>

                <div class="content-card">
                    <div class="card-header">
                        <span class="card-title">
                            <el-icon><DataLine /></el-icon>
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
    `,
    setup() {
        const { ref, computed, onMounted, nextTick } = Vue;
        
        const loading = ref(true);
        const stats = ref({});
        const endpoints = ref([]);
        const dailyStats = ref({});
        const chartRef = ref(null);
        let chartInstance = null;

        const enabledEndpoints = computed(() => endpoints.value.filter(ep => ep.enabled));

        const successRate = computed(() => {
            const total = stats.value.TotalRequests || 0;
            const errors = stats.value.TotalErrors || 0;
            if (total === 0) return '0.0';
            return ((total - errors) / total * 100).toFixed(1);
        });

        const formatNumber = (num) => utils.formatNumber(num);
        const getTransformerLabel = (t) => utils.getTransformerLabel(t);

        const loadData = async () => {
            loading.value = true;
            try {
                const [statsData, endpointsData, daily] = await Promise.all([
                    api.getStatsSummary(),
                    api.getEndpoints(),
                    api.getStatsDaily()
                ]);
                stats.value = statsData;
                endpoints.value = endpointsData.endpoints || [];
                dailyStats.value = daily.stats || {};
                await nextTick();
                renderChart();
            } catch (error) {
                ElementPlus.ElMessage.error('加载数据失败: ' + error.message);
            } finally {
                loading.value = false;
            }
        };

        const renderChart = () => {
            if (!chartRef.value) return;
            if (chartInstance) chartInstance.destroy();

            const epStats = dailyStats.value.endpoints || {};
            const labels = Object.keys(epStats);
            const data = labels.map(ep => epStats[ep].requests || 0);

            chartInstance = new Chart(chartRef.value, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: '请求数',
                        data,
                        backgroundColor: 'rgba(64, 158, 255, 0.8)',
                        borderColor: '#409eff',
                        borderWidth: 1,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                        x: { grid: { display: false } }
                    }
                }
            });
        };

        onMounted(() => {
            loadData();
            window.addEventListener('stats-update', (e) => {
                if (e.detail.stats) stats.value = e.detail.stats;
            });
        });

        return {
            loading, stats, enabledEndpoints, successRate, chartRef,
            formatNumber, getTransformerLabel
        };
    }
};
