package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/carbe/ccNexus/internal/logger"
	"github.com/carbe/ccNexus/internal/storage"
)

// testEndpoint tests an endpoint's connectivity
func (h *Handler) testEndpoint(w http.ResponseWriter, r *http.Request, name string) {
	if r.Method != http.MethodPost && r.Method != http.MethodGet {
		WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	// Get endpoint
	endpoints, err := h.storage.GetEndpoints()
	if err != nil {
		logger.Error("Failed to get endpoints: %v", err)
		WriteError(w, http.StatusInternalServerError, "Failed to get endpoints")
		return
	}

	var endpoint *storage.Endpoint
	for i := range endpoints {
		if endpoints[i].Name == name {
			endpoint = &endpoints[i]
			break
		}
	}

	if endpoint == nil {
		WriteError(w, http.StatusNotFound, "Endpoint not found")
		return
	}

	// Test the endpoint
	start := time.Now()
	response, err := h.sendTestRequest(endpoint)
	latency := time.Since(start).Milliseconds()

	if err != nil {
		WriteJSON(w, http.StatusOK, map[string]interface{}{
			"success": false,
			"latency": latency,
			"error":   err.Error(),
		})
		return
	}

	WriteJSON(w, http.StatusOK, map[string]interface{}{
		"success":  true,
		"latency":  latency,
		"response": response,
	})
}

// sendTestRequest sends a test request to an endpoint
func (h *Handler) sendTestRequest(endpoint *storage.Endpoint) (string, error) {
	// 调用 service 层的 TestEndpointName 方法
	resultJSON := h.service.TestEndpointName(endpoint.Name)

	// 解析 JSON 结果
	var result map[string]interface{}
	if err := json.Unmarshal([]byte(resultJSON), &result); err != nil {
		return "", fmt.Errorf("failed to parse service result: %v", err)
	}

	// 检查是否成功
	if success, ok := result["success"].(bool); ok && !success {
		message := "Test failed"
		if msg, ok := result["message"].(string); ok {
			message = msg
		}
		return "", fmt.Errorf("%s", message)
	}

	// 返回响应消息
	if message, ok := result["message"].(string); ok {
		return message, nil
	}

	return "Test successful", nil
}

// handleFetchModels fetches available models from a provider
func (h *Handler) handleFetchModels(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var req struct {
		APIUrl      string `json:"apiUrl"`
		APIKey      string `json:"apiKey"`
		Transformer string `json:"transformer"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// 调用 service 层的 FetchModels 方法
	resultJSON := h.service.FetchModels(req.APIUrl, req.APIKey, req.Transformer)

	// 解析 JSON 结果
	var result map[string]interface{}
	if err := json.Unmarshal([]byte(resultJSON), &result); err != nil {
		logger.Error("Failed to parse service result: %v", err)
		WriteError(w, http.StatusInternalServerError, "Failed to parse result")
		return
	}

	// 检查是否成功
	if success, ok := result["success"].(bool); ok && !success {
		message := "Failed to fetch models"
		if msg, ok := result["message"].(string); ok {
			message = msg
		}
		WriteError(w, http.StatusInternalServerError, message)
		return
	}

	// 返回模型列表
	WriteSuccess(w, map[string]interface{}{
		"models": result["models"],
	})
}
