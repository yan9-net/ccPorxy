// Stats Component
const StatsComponent = {
    template: `
        <div class="stats">
            <div class="page-header">
                <h1 class="page-title">
                    <el-icon><DataLine /></el-icon>
                    统计数据
                </h1>
            </div>

            <el-radio-group v-model="period" @change="loadStats" style="margin-bottom: 24px;">
                <el-radio-button label="daily">今日</el-radio-button>
                <el-radio-button label="weekly">本周</el-radio-button>
                <el-radio-button label="monthly">本月</el-radio-button>
            </el-radio-group>

            <div class="stats-grid">
                <div class="stat-card primary">
                    <div class="stat-label">总请求数</div>
                    <div class="stat-value">{{ formatNumber(statsData.totalRequests || 0) }}</div>
                </div>
                <div class="stat-card success">
                    <div class="stat-label">成功请求</div>
                    <div class="stat-value">{{ formatNumber(statsData.totalSuccess || 0) }}</div>
                </div>
                <div class="stat-card warning">
                    <div class="stat-label">错误数</div>
                    <div class="stat-value">{{ formatNumber(statsData.totalErrors || 0) }}</div>
                </div>
                <div class="stat-card info">
                    <div class="stat-label">总 Token</div>
                    <div class="stat-value">{{ formatNumber((statsData.totalInputTokens || 0) + (statsData.totalOutputTokens || 0)) }}</div>
                </div>
            </div>

            <div class="content-card" style="margin-top: 24px;">
                <div class="card-header">
                    <span class="card-title">
                        <el-icon><PieChart /></el-icon>
                        节点详情
                    </span>
                </div>
                <div class="card-body">
                    <el-table :data="endpointList" stripe v-loading="loading">
                        <el-table-column prop="name" label="节点名称" />
                        <el-table-column prop="requests" label="请求数">
                            <template #default="{ row }">{{ formatNumber(row.requests) }}</template>
                        </el-table-column>
                        <el-table-column prop="errors" label="错误数">
                            <template #default="{ row }">{{ formatNumber(row.errors) }}</template>
                        </el-table-column>
                        <el-table-column prop="inputTokens" label="输入 Token">
                            <template #default="{ row }">{{ formatNumber(row.inputTokens) }}</template>
                        </el-table-column>
                        <el-table-column prop="outputTokens" label="输出 Token">
                            <template #default="{ row }">{{ formatNumber(row.outputTokens) }}</template>
                        </el-table-column>
                    </el-table>
                    <div v-if="endpointList.length === 0 && !loading" class="empty-state">
                        <el-icon><DataLine /></el-icon>
                        <div class="empty-title">暂无数据</div>
                        <div class="empty-desc">该时间段内没有统计数据</div>
                    </div>
                </div>
            </div>
        </div>
    `,
    setup() {
        const { ref, computed, onMounted } = Vue;

        const loading = ref(true);
        const period = ref('daily');
        const statsData = ref({});

        const endpointList = computed(() => {
            const eps = statsData.value.endpoints || {};
            return Object.keys(eps).map(name => ({
                name,
                requests: eps[name].requests || 0,
                errors: eps[name].errors || 0,
                inputTokens: eps[name].inputTokens || 0,
                outputTokens: eps[name].outputTokens || 0
            }));
        });

        const formatNumber = (num) => utils.formatNumber(num);

        const loadStats = async () => {
            loading.value = true;
            try {
                let data;
                switch (period.value) {
                    case 'daily': data = await api.getStatsDaily(); break;
                    case 'weekly': data = await api.getStatsWeekly(); break;
                    case 'monthly': data = await api.getStatsMonthly(); break;
                }
                statsData.value = data.stats || {};
            } catch (error) {
                ElementPlus.ElMessage.error('加载统计失败: ' + error.message);
            } finally {
                loading.value = false;
            }
        };

        onMounted(() => loadStats());

        return { loading, period, statsData, endpointList, formatNumber, loadStats };
    }
};
