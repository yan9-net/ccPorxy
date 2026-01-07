// Endpoints Component
const EndpointsComponent = {
    template: `
        <div class="endpoints">
            <div class="page-header">
                <h1 class="page-title">
                    <el-icon><Link /></el-icon>
                    节点管理
                </h1>
                <el-button type="primary" @click="showAddDialog">
                    <el-icon><Plus /></el-icon>
                    添加节点
                </el-button>
            </div>

            <div class="content-card">
                <div class="card-body">
                    <el-table :data="endpoints" stripe v-loading="loading">
                        <el-table-column prop="name" label="名称" min-width="150">
                            <template #default="{ row }">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <strong>{{ row.name }}</strong>
                                    <el-tag v-if="row.name === currentEndpoint" type="primary" size="small">当前</el-tag>
                                    <el-icon v-if="getTestStatus(row.name) === true" color="#67c23a"><CircleCheck /></el-icon>
                                    <el-icon v-else-if="getTestStatus(row.name) === false" color="#f56c6c"><CircleClose /></el-icon>
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column prop="apiUrl" label="API URL" min-width="200">
                            <template #default="{ row }">
                                <el-tooltip :content="row.apiUrl" placement="top">
                                    <code style="font-size: 12px;">{{ truncateUrl(row.apiUrl) }}</code>
                                </el-tooltip>
                                <el-button link @click="copyUrl(row.apiUrl)" style="margin-left: 8px;">
                                    <el-icon><CopyDocument /></el-icon>
                                </el-button>
                            </template>
                        </el-table-column>
                        <el-table-column prop="transformer" label="转换器" width="150">
                            <template #default="{ row }">
                                <el-tag>{{ getTransformerLabel(row.transformer) }}</el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column prop="model" label="模型" width="150">
                            <template #default="{ row }">{{ row.model || '-' }}</template>
                        </el-table-column>
                        <el-table-column prop="enabled" label="状态" width="100">
                            <template #default="{ row }">
                                <el-tag :type="row.enabled ? 'success' : 'danger'">{{ row.enabled ? '启用' : '禁用' }}</el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column label="操作" width="360" fixed="right">
                            <template #default="{ row }">
                                <el-button-group size="small">
                                    <el-button :disabled="!(row.enabled && row.name !== currentEndpoint)" @click="switchEndpoint(row.name)">切换</el-button>
                                    <el-button @click="testEndpoint(row.name)" :loading="testingEndpoint === row.name">测试</el-button>
                                    <el-button :type="row.enabled ? 'warning' : 'success'" @click="toggleEndpoint(row)">{{ row.enabled ? '禁用' : '启用' }}</el-button>
                                    <el-button @click="showEditDialog(row)">编辑</el-button>
                                    <el-button type="danger" @click="deleteEndpoint(row.name)">删除</el-button>
                                </el-button-group>
                            </template>
                        </el-table-column>
                    </el-table>

                    <div v-if="endpoints.length === 0 && !loading" class="empty-state">
                        <el-icon><Link /></el-icon>
                        <div class="empty-title">暂无节点</div>
                        <div class="empty-desc">点击上方按钮添加第一个节点</div>
                    </div>
                </div>
            </div>

            <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑节点' : '添加节点'" width="600px" destroy-on-close>
                <el-form :model="form" label-width="100px" :rules="rules" ref="formRef">
                    <el-form-item label="名称" prop="name">
                        <el-input v-model="form.name" :disabled="isEdit" placeholder="节点名称" />
                    </el-form-item>
                    <el-form-item label="API URL" prop="apiUrl">
                        <el-input v-model="form.apiUrl" placeholder="https://api.example.com" />
                    </el-form-item>
                    <el-form-item label="API Key" prop="apiKey">
                        <el-input v-model="form.apiKey" type="password" show-password :placeholder="isEdit ? '留空保持不变' : 'sk-...'" />
                    </el-form-item>
                    <el-form-item label="转换器" prop="transformer">
                        <el-select v-model="form.transformer" style="width: 100%;">
                            <el-option v-for="opt in transformerOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
                        </el-select>
                    </el-form-item>
                    <el-form-item label="模型">
                        <div style="display: flex; gap: 8px; width: 100%;">
                            <el-input v-model="form.model" placeholder="gpt-4, gemini-pro 等" style="flex: 1;" />
                            <el-button @click="fetchModels" :loading="fetchingModels">获取模型</el-button>
                        </div>
                    </el-form-item>
                    <el-form-item label="备注">
                        <el-input v-model="form.remark" type="textarea" :rows="3" />
                    </el-form-item>
                    <el-form-item label="启用">
                        <el-switch v-model="form.enabled" />
                    </el-form-item>
                </el-form>
                <template #footer>
                    <el-button @click="dialogVisible = false">取消</el-button>
                    <el-button type="primary" @click="saveEndpoint" :loading="saving">保存</el-button>
                </template>
            </el-dialog>

            <el-dialog v-model="modelDialogVisible" title="选择模型" width="500px">
                <el-table :data="availableModels" @row-click="selectModel" style="cursor: pointer;" max-height="400">
                    <el-table-column prop="id" label="模型名称" />
                </el-table>
            </el-dialog>

            <el-dialog v-model="testResultVisible" title="测试结果" width="600px">
                <div v-if="testResult">
                    <el-descriptions :column="1" border>
                        <el-descriptions-item label="状态">
                            <el-tag :type="testResult.success ? 'success' : 'danger'">{{ testResult.success ? '成功' : '失败' }}</el-tag>
                        </el-descriptions-item>
                        <el-descriptions-item v-if="testResult.latency" label="延迟">{{ testResult.latency }}ms</el-descriptions-item>
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
            </el-dialog>
        </div>
    `,
    setup() {
        const { ref, onMounted } = Vue;

        const loading = ref(true);
        const endpoints = ref([]);
        const currentEndpoint = ref(null);
        const dialogVisible = ref(false);
        const isEdit = ref(false);
        const saving = ref(false);
        const formRef = ref(null);
        const testingEndpoint = ref(null);
        const testResultVisible = ref(false);
        const testResult = ref(null);
        const modelDialogVisible = ref(false);
        const availableModels = ref([]);
        const fetchingModels = ref(false);
        const testStatusMap = ref({});

        const form = ref({
            name: '', apiUrl: '', apiKey: '', transformer: 'openai',
            model: '', remark: '', enabled: true
        });

        const rules = {
            name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
            apiUrl: [{ required: true, message: '请输入API URL', trigger: 'blur' }],
            transformer: [{ required: true, message: '请选择转换器', trigger: 'change' }]
        };

        const transformerOptions = utils.getTransformerOptions();
        const getTransformerLabel = (t) => utils.getTransformerLabel(t);
        const truncateUrl = (url) => url.length > 40 ? url.substring(0, 40) + '...' : url;

        const loadEndpoints = async () => {
            loading.value = true;
            try {
                const [data, current] = await Promise.all([
                    api.getEndpoints(),
                    api.getCurrentEndpoint().catch(() => ({ name: null }))
                ]);
                endpoints.value = data.endpoints || [];
                currentEndpoint.value = current.name;
                loadTestStatus();
            } catch (error) {
                ElementPlus.ElMessage.error('加载失败: ' + error.message);
            } finally {
                loading.value = false;
            }
        };

        const loadTestStatus = () => {
            try {
                testStatusMap.value = JSON.parse(localStorage.getItem('ccNexus_endpointTestStatus') || '{}');
            } catch { testStatusMap.value = {}; }
        };

        const saveTestStatus = (name, success) => {
            testStatusMap.value[name] = success;
            localStorage.setItem('ccNexus_endpointTestStatus', JSON.stringify(testStatusMap.value));
        };

        const getTestStatus = (name) => testStatusMap.value[name];

        const showAddDialog = () => {
            isEdit.value = false;
            form.value = { name: '', apiUrl: '', apiKey: '', transformer: 'openai', model: '', remark: '', enabled: true };
            dialogVisible.value = true;
        };

        const showEditDialog = (row) => {
            isEdit.value = true;
            form.value = { ...row };
            dialogVisible.value = true;
        };

        const saveEndpoint = async () => {
            if (!formRef.value) return;
            try {
                await formRef.value.validate();
            } catch { return; }
            saving.value = true;
            try {
                const data = { ...form.value };
                if (isEdit.value && data.apiKey === '****') delete data.apiKey;
                if (isEdit.value) {
                    await api.updateEndpoint(data.name, data);
                } else {
                    await api.createEndpoint(data);
                }
                ElementPlus.ElMessage.success(isEdit.value ? '更新成功' : '创建成功');
                dialogVisible.value = false;
                await loadEndpoints();
            } catch (error) {
                ElementPlus.ElMessage.error('保存失败: ' + error.message);
            } finally {
                saving.value = false;
            }
        };

        const deleteEndpoint = async (name) => {
            try {
                await ElementPlus.ElMessageBox.confirm('确定要删除节点 "' + name + '" 吗？', '确认删除', { type: 'warning' });
                await api.deleteEndpoint(name);
                ElementPlus.ElMessage.success('删除成功');
                await loadEndpoints();
            } catch (error) {
                if (error !== 'cancel') ElementPlus.ElMessage.error('删除失败: ' + error.message);
            }
        };

        const toggleEndpoint = async (row) => {
            try {
                await api.toggleEndpoint(row.name, !row.enabled);
                ElementPlus.ElMessage.success(row.enabled ? '已禁用' : '已启用');
                await loadEndpoints();
            } catch (error) {
                ElementPlus.ElMessage.error('操作失败: ' + error.message);
            }
        };

        const switchEndpoint = async (name) => {
            try {
                await api.switchEndpoint(name);
                ElementPlus.ElMessage.success('已切换到: ' + name);
                await loadEndpoints();
            } catch (error) {
                ElementPlus.ElMessage.error('切换失败: ' + error.message);
            }
        };

        const testEndpoint = async (name) => {
            testingEndpoint.value = name;
            try {
                const result = await api.testEndpoint(name);
                testResult.value = result;
                saveTestStatus(name, result.success);
                testResultVisible.value = true;
                await loadEndpoints();
            } catch (error) {
                testResult.value = { success: false, error: error.message };
                saveTestStatus(name, false);
                testResultVisible.value = true;
            } finally {
                testingEndpoint.value = null;
            }
        };

        const fetchModels = async () => {
            if (!form.value.apiUrl || !form.value.apiKey || form.value.apiKey === '****') {
                ElementPlus.ElMessage.warning('请先填写 API URL 和 API Key');
                return;
            }
            fetchingModels.value = true;
            try {
                const result = await api.fetchModels(form.value.apiUrl, form.value.apiKey, form.value.transformer);
                if (result.models && result.models.length > 0) {
                    availableModels.value = result.models.map(m => ({ id: m }));
                    modelDialogVisible.value = true;
                } else {
                    ElementPlus.ElMessage.info('未找到模型');
                }
            } catch (error) {
                ElementPlus.ElMessage.error('获取模型失败: ' + error.message);
            } finally {
                fetchingModels.value = false;
            }
        };

        const selectModel = (row) => {
            form.value.model = row.id;
            modelDialogVisible.value = false;
            ElementPlus.ElMessage.success('已选择: ' + row.id);
        };

        const copyUrl = (url) => {
            navigator.clipboard.writeText(url).then(() => ElementPlus.ElMessage.success('已复制'));
        };

        onMounted(() => loadEndpoints());

        return {
            loading, endpoints, currentEndpoint, dialogVisible, isEdit, saving, formRef,
            form, rules, transformerOptions, testingEndpoint, testResultVisible, testResult,
            modelDialogVisible, availableModels, fetchingModels,
            getTransformerLabel, getTestStatus, truncateUrl, showAddDialog, showEditDialog, saveEndpoint,
            deleteEndpoint, toggleEndpoint, switchEndpoint, testEndpoint, fetchModels, selectModel, copyUrl
        };
    }
};
