<template>
  <div class="testing">
    <div class="page-header">
      <h1 class="page-title">
        <el-icon><Cpu /></el-icon>
        测试工具
      </h1>
    </div>

    <div class="content-card">
      <div class="card-body">
        <el-form :model="form" label-width="120px">
          <el-form-item label="测试消息">
            <el-input v-model="form.message" type="textarea" :rows="4" placeholder="输入测试消息..."/>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="sendTest" :loading="testing">
              <el-icon><Promotion /></el-icon>
              发送测试
            </el-button>
          </el-form-item>
        </el-form>

        <div v-if="result" class="test-result" :class="result.success ? 'success' : 'error'">
          <h3>{{ result.success ? '✓ 测试成功' : '✗ 测试失败' }}</h3>
          <div v-if="result.response" class="test-response">
            <pre>{{ JSON.stringify(result.response, null, 2) }}</pre>
          </div>
          <div v-if="result.error" class="test-error">
            {{ result.error }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

const form = ref({
  message: 'Hello, this is a test message!'
})

const testing = ref(false)
const result = ref(null)

async function sendTest() {
  testing.value = true
  result.value = null

  try {
    // TODO: 实现实际的测试API调用
    await new Promise(resolve => setTimeout(resolve, 1000))

    result.value = {
      success: true,
      response: {
        message: 'Test successful',
        timestamp: new Date().toISOString()
      }
    }

    ElMessage.success('测试成功')
  } catch (error) {
    result.value = {
      success: false,
      error: error.message
    }
    ElMessage.error('测试失败: ' + error.message)
  } finally {
    testing.value = false
  }
}
</script>
