<template>
    <div class="endpoints">
        <div class="page-header">
            <h1 class="page-title">
                <el-icon>
                    <Link/>
                </el-icon>
                节点管理
            </h1>
            <div style="display: flex; gap: 12px;">
                <el-button type="primary" @click="loadEndpoints">
                    <el-icon>
                        <Refresh/>
                    </el-icon>
                    刷新列表
                </el-button>
                <el-button type="primary" @click="showAddDialog">
                    <el-icon>
                        <Plus/>
                    </el-icon>
                    添加节点
                </el-button>
            </div>
        </div>

        <div class="content-card">
            <div class="card-body">
                <el-table :data="endpointsStore.endpoints" stripe v-loading="endpointsStore.loading">
                    <el-table-column prop="name" label="名称" width="160">
                        <template #default="{ row }">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <strong>{{ row.name }}</strong>
                                <el-icon v-if="getTestStatus(row.name) === true" color="#67c23a">
                                    <CircleCheck/>
                                </el-icon>
                                <el-icon v-else-if="getTestStatus(row.name) === false" color="#f56c6c">
                                    <CircleClose/>
                                </el-icon>
                            </div>
                        </template>
                    </el-table-column>
                    <el-table-column prop="apiUrl" label="API URL" width="260">
                        <template #default="{ row }">
                            <el-button link @click="copyUrl(row.apiUrl)" style="margin-left: 8px;">
                                <el-icon>
                                    <CopyDocument/>
                                </el-icon>
                            </el-button>
                            <el-tooltip :content="row.apiUrl" placement="top">
                                <code style="font-size: 12px;">{{ truncateUrl(row.apiUrl, 30) }}</code>
                            </el-tooltip>
                        </template>
                    </el-table-column>
                    <el-table-column>
                        <template #header>
                            <span>备注</span>
                        </template>
                        <template #default="{ row }">
                            <span>{{ row.remark || "-" }}</span>
                        </template>
                    </el-table-column>
                    <el-table-column prop="transformer" label="转换器" width="100">
                        <template #default="{ row }">
                            <el-tag>{{ getTransformerLabel(row.transformer) }}</el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column prop="model" label="模型" width="240">
                        <template #default="{ row }">{{ row.model || "-" }}</template>
                    </el-table-column>
                    <el-table-column prop="priority" label="优先级" width="70">
                        <template #default="{ row }">
                            <el-tag type="info">{{ row.priority || 100 }}</el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column label="账户余额" width="150">
                        <template #default="{ row }">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span v-if="endpointsStore.balanceMap[row.name]">
                                    {{ formatBalance(endpointsStore.balanceMap[row.name]) }}
                                </span>
                                <span v-else style="color: var(--el-text-color-secondary);">-</span>
                                <el-button
                                    size="small"
                                    link
                                    @click="fetchBalance(row.name)"
                                    :loading="loadingBalance === row.name"
                                    title="刷新余额">
                                    <el-icon><Refresh/></el-icon>
                                </el-button>
                            </div>
                        </template>
                    </el-table-column>
                    <el-table-column prop="enabled" label="状态" width="100">
                        <template #default="{ row }">
                            <div style="display: flex; flex-direction: column; gap: 4px;">
                                <el-tag :type="row.enabled ? 'success' : 'danger'" size="small">
                                    {{ row.enabled ? "启用" : "禁用" }}
                                </el-tag>
                                <div v-if="getBlacklistStatus(row.name)" style="display: flex; align-items: center; gap: 4px;">
                                    <el-tag type="warning" size="small">小黑屋 {{ getBlacklistRemaining(row.name) }}</el-tag>
                                    <el-button type="warning" size="small" link @click="removeFromBlacklist(row.name)" title="从小黑屋移除">
                                        <el-icon>
                                            <Close/>
                                        </el-icon>
                                    </el-button>
                                </div>
                            </div>
                        </template>
                    </el-table-column>
                    <el-table-column label="操作" width="280" fixed="right">
                        <template #default="{ row }">
                            <el-button-group size="small">
                                <el-button @click="testEndpoint(row.name)" :loading="testingEndpoint === row.name">
                                    测试
                                </el-button>
                                <el-button
                                    :type="row.enabled ? 'warning' : 'success'"
                                    @click="toggleEndpoint(row)">{{ row.enabled ? "禁用" : "启用" }}
                                </el-button>
                                <el-button @click="showEditDialog(row)">编辑</el-button>
                                <el-button @click="showUsageDialog(row.name)" type="info">使用记录</el-button>
                                <el-button type="danger" @click="deleteEndpoint(row.name)">删除</el-button>
                            </el-button-group>
                        </template>
                    </el-table-column>
                </el-table>

                <div v-if="endpointsStore.endpoints.length === 0 && !endpointsStore.loading" class="empty-state">
                    <el-icon>
                        <Link/>
                    </el-icon>
                    <div class="empty-title">暂无节点</div>
                    <div class="empty-desc">点击上方按钮添加第一个节点</div>
                </div>
            </div>
        </div>

        <!-- Add/Edit Dialog -->
        <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑节点' : '添加节点'" width="600px" destroy-on-close>
            <el-form :model="form" label-width="100px" :rules="rules" ref="formRef">
                <el-form-item label="名称" prop="name">
                    <el-input v-model="form.name" :disabled="isEdit" placeholder="节点名称"/>
                </el-form-item>
                <el-form-item label="API URL" prop="apiUrl">
                    <el-input v-model="form.apiUrl" placeholder="https://api.example.com"/>
                </el-form-item>
                <el-form-item label="API Key" prop="apiKey">
                    <el-input v-model="form.apiKey" type="password" show-password :placeholder="isEdit ? '留空保持不变' : 'sk-...'"/>
                </el-form-item>
                <el-form-item label="转换器" prop="transformer">
                    <el-select v-model="form.transformer" style="width: 100%;">
                        <el-option v-for="opt in TRANSFORMER_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value"/>
                    </el-select>
                </el-form-item>
                <el-form-item label="模型">
                    <div style="display: flex; gap: 8px; width: 100%;">
                        <el-input v-model="form.model" placeholder="gpt-4, gemini-pro 等" style="flex: 1;"/>
                        <el-button @click="fetchModels" :loading="fetchingModels">获取模型</el-button>
                    </div>
                </el-form-item>
                <el-form-item label="优先级" prop="priority">
                    <el-input-number v-model="form.priority" :min="1" :max="999" :step="1" style="width: 100%;"/>
                    <div style="font-size: 12px; color: var(--el-text-color-secondary); margin-top: 4px;"> 数字越小优先级越高,默认为 100</div>
                </el-form-item>
                <el-form-item label="备注">
                    <el-input v-model="form.remark" type="textarea" :rows="3"/>
                </el-form-item>
                <el-form-item label="启用">
                    <el-switch v-model="form.enabled"/>
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="dialogVisible = false">取消</el-button>
                <el-button type="primary" @click="saveEndpoint" :loading="saving">保存</el-button>
            </template>
        </el-dialog>

        <!-- Model Selection Dialog -->
        <el-dialog v-model="modelDialogVisible" title="选择模型" width="500px">
            <el-table :data="availableModels" @row-click="selectModel" style="cursor: pointer;" max-height="400">
                <el-table-column prop="id" label="模型名称"/>
            </el-table>
        </el-dialog>

        <!-- Test Result Dialog -->
        <el-dialog v-model="testResultVisible" title="测试结果" width="600px">
            <div v-if="testResult">
                <el-descriptions :column="1" border>
                    <el-descriptions-item label="状态">
                        <el-tag :type="testResult.success ? 'success' : 'danger'">
                            {{ testResult.success ? "成功" : "失败" }}
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
        </el-dialog>

        <!-- Usage Records Dialog -->
        <el-dialog v-model="usageDialogVisible" :title="`使用记录 - ${currentEndpointName}`" width="800px">
            <div v-loading="loadingUsage">
                <div style="margin-bottom: 16px; display: flex; gap: 12px; align-items: center;">
                    <el-date-picker
                        v-model="usageDateRange"
                        type="daterange"
                        range-separator="至"
                        start-placeholder="开始日期"
                        end-placeholder="结束日期"
                        size="small"
                        style="width: 280px;"
                    />
                    <el-button size="small" @click="fetchUsageRecords" :loading="loadingUsage">
                        <el-icon><Refresh/></el-icon>
                        刷新
                    </el-button>
                </div>

                <el-table :data="currentUsageRecords" stripe max-height="400">
                    <el-table-column prop="date" label="日期" width="120"/>
                    <el-table-column prop="requests" label="请求次数" width="100">
                        <template #default="{ row }">
                            <el-tag type="info">{{ row.requests || 0 }}</el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column prop="inputTokens" label="输入Token" width="120">
                        <template #default="{ row }">
                            {{ formatNumber(row.inputTokens || 0) }}
                        </template>
                    </el-table-column>
                    <el-table-column prop="outputTokens" label="输出Token" width="120">
                        <template #default="{ row }">
                            {{ formatNumber(row.outputTokens || 0) }}
                        </template>
                    </el-table-column>
                    <el-table-column prop="totalTokens" label="总Token" width="120">
                        <template #default="{ row }">
                            {{ formatNumber(row.totalTokens || 0) }}
                        </template>
                    </el-table-column>
                    <el-table-column prop="cost" label="费用" width="100">
                        <template #default="{ row }">
                            <span v-if="row.cost">{{ formatCurrency(row.cost) }}</span>
                            <span v-else style="color: var(--el-text-color-secondary);">-</span>
                        </template>
                    </el-table-column>
                </el-table>

                <div v-if="currentUsageRecords.length === 0 && !loadingUsage" class="empty-state" style="padding: 40px;">
                    <el-icon style="font-size: 48px; color: var(--el-text-color-secondary);">
                        <Document/>
                    </el-icon>
                    <div class="empty-title">暂无使用记录</div>
                    <div class="empty-desc">该节点在所选时间范围内没有使用记录</div>
                </div>
            </div>
        </el-dialog>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useEndpointsStore } from "@/stores/endpoints";
import { useAppStore } from "@/stores/app.js";
import { getTransformerLabel, TRANSFORMER_OPTIONS } from "@/utils/constants";
import * as endpointsApi from "@/api/endpoints";

const endpointsStore = useEndpointsStore();
const appStore = useAppStore();

// State
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
const loadingBalance = ref(null);
const usageDialogVisible = ref(false);
const currentEndpointName = ref("");
const currentUsageRecords = ref([]);
const loadingUsage = ref(false);
const usageDateRange = ref([]);

const form = ref({
    name: "",
    apiUrl: "",
    apiKey: "",
    transformer: "openai",
    model: "",
    remark: "",
    enabled: true,
    priority: 100
});

const rules = {
    name: [{required: true, message: "请输入名称", trigger: "blur"}],
    apiUrl: [{required: true, message: "请输入API URL", trigger: "blur"}],
    transformer: [{required: true, message: "请选择转换器", trigger: "change"}]
};

let blacklistInterval = null;

// Methods
function truncateUrl(url, len = 40) {
    return url.length > len ? url.substring(0, len) + "..." : url;
}

async function loadEndpoints() {
    try {
        await endpointsStore.fetchEndpoints();
        loadTestStatus();
    } catch (error) {
        ElMessage.error("加载失败: " + error.message);
    }
}

function loadTestStatus() {
    try {
        testStatusMap.value = JSON.parse(localStorage.getItem("ccNexus_endpointTestStatus") || "{}");
    } catch {
        testStatusMap.value = {};
    }
}

function saveTestStatus(name, success) {
    testStatusMap.value[name] = success;
    localStorage.setItem("ccNexus_endpointTestStatus", JSON.stringify(testStatusMap.value));
}

function getTestStatus(name) {
    return testStatusMap.value[name];
}

function getBlacklistStatus(name) {
    const status = appStore.blacklist[name];
    return status && status.blacklisted;
}

function getBlacklistRemaining(name) {
    const status = appStore.blacklist[name];
    if (!status || !status.blacklisted || !status.remaining) {
        return "";
    }
    return status.remaining.replace("m0s", "分").replace("s", "秒").replace("m", "分");
}

function showAddDialog() {
    isEdit.value = false;
    form.value = {
        name: "",
        apiUrl: "",
        apiKey: "",
        transformer: "openai",
        model: "",
        remark: "",
        enabled: true,
        priority: 100
    };
    dialogVisible.value = true;
}

function showEditDialog(row) {
    isEdit.value = true;
    form.value = {...row};
    dialogVisible.value = true;
}

async function saveEndpoint() {
    if (!formRef.value) return;

    try {
        await formRef.value.validate();
    } catch {
        return;
    }

    saving.value = true;
    try {
        const data = {...form.value};
        if (isEdit.value && data.apiKey === "****") delete data.apiKey;

        if (isEdit.value) {
            await endpointsStore.updateEndpoint(data.name, data);
            ElMessage.success("更新成功");
        } else {
            await endpointsStore.createEndpoint(data);
            ElMessage.success("创建成功");
        }

        dialogVisible.value = false;
    } catch (error) {
        ElMessage.error("保存失败: " + error.message);
    } finally {
        saving.value = false;
    }
}

async function deleteEndpoint(name) {
    try {
        await ElMessageBox.confirm(`确定要删除节点 "${name}" 吗？`, "确认删除", {type: "warning"});
        await endpointsStore.deleteEndpoint(name);
        ElMessage.success("删除成功");
    } catch (error) {
        if (error !== "cancel") {
            ElMessage.error("删除失败: " + error.message);
        }
    }
}

async function toggleEndpoint(row) {
    try {
        await endpointsStore.toggleEndpoint(row.name, !row.enabled);
        ElMessage.success(row.enabled ? "已禁用" : "已启用");
    } catch (error) {
        ElMessage.error("操作失败: " + error.message);
    }
}

async function switchEndpoint(name) {
    try {
        await endpointsStore.switchEndpoint(name);
        ElMessage.success("已切换到: " + name);
    } catch (error) {
        ElMessage.error("切换失败: " + error.message);
    }
}

async function testEndpoint(name) {
    testingEndpoint.value = name;
    try {
        const result = await endpointsStore.testEndpoint(name);
        testResult.value = result;
        saveTestStatus(name, result.success);
        testResultVisible.value = true;
    } catch (error) {
        testResult.value = {success: false, error: error.message};
        saveTestStatus(name, false);
        testResultVisible.value = true;
    } finally {
        testingEndpoint.value = null;
    }
}

async function fetchModels() {
    if (!form.value.apiUrl || !form.value.apiKey || form.value.apiKey === "****") {
        ElMessage.warning("请先填写 API URL 和 API Key");
        return;
    }

    fetchingModels.value = true;
    try {
        const result = await endpointsApi.fetchModels(
            form.value.apiUrl,
            form.value.apiKey,
            form.value.transformer
        );
        if (result.models && result.models.length > 0) {
            availableModels.value = result.models.map(m => ({id: m}));
            modelDialogVisible.value = true;
        } else {
            ElMessage.info("未找到模型");
        }
    } catch (error) {
        ElMessage.error("获取模型失败: " + error.message);
    } finally {
        fetchingModels.value = false;
    }
}

function selectModel(row) {
    form.value.model = row.id;
    modelDialogVisible.value = false;
    ElMessage.success("已选择: " + row.id);
}

function copyUrl(url) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => ElMessage.success("已复制"));
    } else {
        const textArea = document.createElement("textarea");
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        ElMessage.success("已复制");
    }
}

async function removeFromBlacklist(name) {
    try {
        await endpointsStore.removeFromBlacklist(name);
        ElMessage.success("已从小黑屋移除: " + name);
    } catch (error) {
        ElMessage.error("移除失败: " + error.message);
    }
}

async function fetchBalance(name) {
    loadingBalance.value = name;
    try {
        await endpointsStore.fetchBalance(name);
        ElMessage.success("余额已更新");
    } catch (error) {
        ElMessage.error("获取余额失败: " + error.message);
    } finally {
        loadingBalance.value = null;
    }
}

function formatBalance(balance) {
    if (!balance) return "-";
    if (balance.amount !== undefined) {
        return `$${balance.amount.toFixed(2)}`;
    }
    if (balance.credits !== undefined) {
        return `${balance.credits} 积分`;
    }
    return JSON.stringify(balance);
}

function formatNumber(num) {
    return num.toLocaleString();
}

function formatCurrency(amount) {
    return `$${amount.toFixed(2)}`;
}

function showUsageDialog(name) {
    currentEndpointName.value = name;
    usageDialogVisible.value = true;
    // 默认查询最近30天
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    usageDateRange.value = [startDate, endDate];
    fetchUsageRecords();
}

async function fetchUsageRecords() {
    if (!currentEndpointName.value) return;

    loadingUsage.value = true;
    try {
        const params = {};
        if (usageDateRange.value && usageDateRange.value.length === 2) {
            params.startDate = usageDateRange.value[0].toISOString().split('T')[0];
            params.endDate = usageDateRange.value[1].toISOString().split('T')[0];
        }

        const data = await endpointsStore.fetchUsage(currentEndpointName.value, params);
        currentUsageRecords.value = data.records || [];
    } catch (error) {
        ElMessage.error("获取使用记录失败: " + error.message);
        currentUsageRecords.value = [];
    } finally {
        loadingUsage.value = false;
    }
}

// Lifecycle
onMounted(() => {
    loadEndpoints();
});

onUnmounted(() => {
    if (blacklistInterval) {
        clearInterval(blacklistInterval);
    }
});
</script>
