// Testing Component
const TestingComponent = {
    template: `
        <div class="testing">
            <div class="page-header">
                <h1 class="page-title">
                    <el-icon><Cpu /></el-icon>
                    测试工具
                </h1>
            </div>

            <div class="content-card">
                <div class="card-body">
                    <el-form label-width="100px">
                        <el-form-item label="选择节点">
                            <el-select v-model="selectedEndpoint" placeholder="请选择节点" style="width: 300px;" v-loading="loadingEndpoints">
                                <el-option v-for="ep in enabledEndpoints" :key="ep.name" :label="ep.name" :value="ep.name" />
                            </el-select>
                        </el-form-item>
                        <el-form-item>
                            <el-button type="primary" @click="runTest" :loading="testing" :disabled="!selectedEndpoint">
                                <el-icon><VideoPlay /></el-icon>
                                运行测试
                            </el-button>
                        </el-form-item>
                    </el-form>

                    <div v-if="testResult" :class="['test-result', testResult.success ? 'success' : 'error']">
                        <el-descriptions :column="1" border>
                            <el-descriptions-item label="状态">
                                <el-tag :type="testResult.success ? 'success' : 'danger'">
                                    {{ testResult.success ? '成功' : '失败' }}
                                </el-tag>
                            </el-descriptions-item>
                            <el-descriptions-item v-if="testResult.latency" label="延迟">
                                {{ testResult.latency }}ms
                            </el-descriptions-item>
                        </el-descriptions>
                        <div v-if="testResult.response" style="margin-top: 16px;">
                            <div style="margin-bottom: 8px; font-weight: 500;">响应内容:</div>
                            <div class="test-response">{{ testResult.response }}</div>
                        </div>
                        <div v-if="testResult.error" style="margin-top: 16px;">
                            <div style="margin-bottom: 8px; font-weight: 500; color: var(--el-color-danger);">错误信息:</div>
                            <div class="test-response">{{ testResult.error }}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    setup() {
        const { ref, computed, onMounted } = Vue;

        const loadingEndpoints = ref(true);
        const endpoints = ref([]);
        const selectedEndpoint = ref('');
        const testing = ref(false);
        const testResult = ref(null);

        const enabledEndpoints = computed(() => endpoints.value.filter(ep => ep.enabled));

        const loadEndpoints = async () => {
            loadingEndpoints.value = true;
            try {
                const data = await api.getEndpoints();
                endpoints.value = data.endpoints || [];
            } catch (error) {
                ElementPlus.ElMessage.error('加载节点失败: ' + error.message);
            } finally {
                loadingEndpoints.value = false;
            }
        };

        const runTest = async () => {
            if (!selectedEndpoint.value) {
                ElementPlus.ElMessage.warning('请先选择节点');
                return;
            }
            testing.value = true;
            testResult.value = null;
            try {
                const result = await api.testEndpoint(selectedEndpoint.value);
                testResult.value = result;
                if (result.success) {
                    ElementPlus.ElMessage.success('测试成功');
                } else {
                    ElementPlus.ElMessage.error('测试失败');
                }
            } catch (error) {
                testResult.value = { success: false, error: error.message };
                ElementPlus.ElMessage.error('测试失败: ' + error.message);
            } finally {
                testing.value = false;
            }
        };

        onMounted(() => loadEndpoints());

        return { loadingEndpoints, endpoints, selectedEndpoint, enabledEndpoints, testing, testResult, runTest };
    }
};
