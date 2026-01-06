# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此代码库中工作时提供指导。

## 项目概述

ccNexus 是一个用 Go 编写的 API 代理网关，可将 Claude API 请求转换并路由到多个 AI 提供商（OpenAI、Gemini、DeepSeek 等）。它提供节点管理、请求转换、token 计数和统计跟踪功能。

**核心技术：**
- Go 1.24+ 配合 PostgreSQL (github.com/lib/pq)
- 支持 SSE 流式传输的 HTTP 代理服务器
- 多提供商 API 格式转换（Claude ↔ OpenAI/Gemini/DeepSeek）
- PostgreSQL 存储

## 架构设计

### 入口点
- **cmd/server/main.go**: 无头 HTTP 服务器（生产部署）
  - 环境变量：`CCNEXUS_PORT`, `CCNEXUS_LOG_LEVEL`, `CCNEXUS_DB_CONNSTR`
  - 默认数据库连接：`host=localhost port=5432 user=ccnexus password=ccnexus dbname=ccnexus sslmode=disable`
  - Web UI 插件：可选，通过 `registerWebUI()` 启用（构建标签控制）

### 核心模块 (internal/)

**config/**: 配置管理
- 管理节点、终端设置、代理配置
- 环境变量覆盖：端口和日志级别可通过环境变量设置
- 使用适配器模式存储在 PostgreSQL 的 `app_config` 表中

**proxy/**: HTTP 代理服务器
- 路由：`/`（代理）、`/v1/messages/count_tokens`、`/health`、`/stats`
- 节点选择：轮询机制，错误时自动故障转移
- 通过 transformer 注册表进行请求/响应转换
- SSE 流式传输支持实时响应
- 每个节点的活动请求跟踪和取消

**transformer/**: API 格式转换层
- **Transformer 接口**：`TransformRequest(claudeReq) -> targetReq`, `TransformResponse(targetResp) -> claudeResp`
- **注册表模式**：按类型注册 transformer（claude、openai、gemini、openai2）
- **cc/**：Claude 兼容转换器（直接透传或包装）
- **cx/**：跨格式转换器（Claude ↔ OpenAI/Gemini 转换）
- **convert/**：格式转换工具（内容、工具、流式）
- **工具链支持**：双向工具调用格式转换

**storage/**: 数据持久化
- **postgresql.go**：核心 PostgreSQL 实现及 schema 管理
- **adapter.go**：配置/统计与 PostgreSQL 接口的适配器
- 数据表：`endpoints`、`daily_stats`、`app_config`
- 安全配置键：跨设备同步过滤平台特定设置（device_id、本地路径等）
- PostgreSQL 特性：
  - 使用 `$1, $2, $3` 占位符（而非 SQLite 的 `?`）
  - 使用 `SERIAL PRIMARY KEY`（而非 `AUTOINCREMENT`）
  - 使用 `TO_CHAR()` 进行日期格式化（而非 `strftime()`）
  - 连接字符串形式（而非文件路径）
  - 某些功能需要外部工具支持（如 `pg_dump` 用于备份）

**service/**: 业务逻辑层
- **endpoint.go**：节点 CRUD 操作
- **stats.go**：统计数据聚合和查询
- **archive.go**：历史数据归档管理
- **terminal.go**：终端启动器集成
- **update.go**：版本检查和自动更新

**session/**: 会话状态管理
- 跟踪对话上下文和 token 使用情况

**logger/**: 分级日志系统
- 级别：0=DEBUG, 1=INFO, 2=WARN, 3=ERROR
- 支持控制台和文件输出

**terminal/**, **tray/**, **updater/**: 支持功能
- 终端检测和启动器
- 系统托盘集成（桌面构建）
- GitHub 版本更新器

## 常用命令

### 构建
```bash
# 构建服务器二进制文件
go build -o ccnexus-server ./cmd/server

# 直接运行
go run ./cmd/server
```

### 测试
```bash
# 运行所有测试
go test ./...

# 运行特定包的测试
go test ./internal/transformer/...
go test ./internal/proxy

# 运行特定测试函数
go test ./internal/config -run TestEndpointValidation

# 详细输出
go test -v ./...
```

### 开发
```bash
# 格式化代码
go fmt ./...

# 整理依赖
go mod tidy

# 检查问题
go vet ./...
```

### 使用环境变量运行
```bash
# 自定义端口和日志级别
CCNEXUS_PORT=8080 CCNEXUS_LOG_LEVEL=0 CCNEXUS_DB_CONNSTR="host=localhost port=5432 user=myuser password=mypass dbname=ccnexus sslmode=disable" go run ./cmd/server

# 自定义数据库连接和数据目录
CCNEXUS_DB_CONNSTR="host=localhost port=5432 user=myuser password=mypass dbname=ccnexus sslmode=disable" \


set CCNEXUS_PORT=3001 && set CCNEXUS_DB_CONNSTR="host=spb-ew57zh82lhtjtzfg.supabase.opentrust.net port=5432 user=postgres password=GaoBin870610 dbname=ccnexus sslmode=disable" && go run ./cmd/server
```

## 关键设计模式

### Transformer 注册表模式
Transformer 按类型注册并动态检索：
```go
// 注册：transformer/registry.go
RegisterTransformer("openai", NewOpenAITransformer())

// 使用：proxy/request.go
transformer := GetTransformer(endpoint.Transformer)
targetReq, _ := transformer.TransformRequest(claudeReq)
```

### Storage 适配器模式
配置和统计使用适配器与 PostgreSQL 交互：
```go
adapter := storage.NewConfigStorageAdapter(pgStorage)
cfg.SaveToStorage(adapter)
```

### 跨设备同步的安全配置键
仅平台无关的设置在设备间同步（参见 `storage/postgresql.go:safeConfigKeys`）：
- ✅ 端口、主题、语言、更新设置
- ❌ 设备 ID、本地路径、终端选择、代理 URL

## API 转换流程

1. **客户端请求** → 代理接收 Claude 格式请求
2. **节点选择** → 轮询机制，检查已启用的节点
3. **转换请求** → `transformer.TransformRequest()` 转换为目标 API 格式
4. **上游调用** → 转发到配置的节点（OpenAI/Gemini 等）
5. **转换响应** → `transformer.TransformResponse()` 转换回 Claude 格式
6. **流式/返回** → SSE 流式传输或 JSON 响应给客户端
7. **统计记录** → 按节点跟踪 token、请求、错误

## Token 计数

- **tokencount/estimator.go**：估算请求验证的 token 数
- **tokencount/image.go**：基于尺寸的图片 token 计算
- 节点 `/v1/messages/count_tokens`：返回估算的输入 token 数

## 配置说明

- **节点（Endpoints）** 支持自定义 `transformer` 字段（claude/openai/gemini/openai2）和 `model` 覆盖
- **主题自动切换** 使用 `themeAuto`、`autoLightTheme`、`autoDarkTheme`
- **关闭窗口行为**：quit/minimize/ask（桌面构建）

## 重要约束

- **数据库**：PostgreSQL 数据库，使用 github.com/lib/pq 驱动
- **流式传输**：SSE 格式，正确的事件处理和缓冲
- **平台支持**：跨平台构建，带 OS 特定文件（_windows.go, _unix.go, _darwin.go）
- **错误处理**：优雅降级，节点故障转移和详细日志记录
