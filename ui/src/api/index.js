import axios from "axios";
import {ElMessage} from "element-plus";

// Create axios instance
const request = axios.create({
    baseURL: "/api",
    timeout: 30000,
    headers: {
        "Content-Type": "application/json"
    }
});

// Request interceptor
request.interceptors.request.use(
    (config) => {
        return config;
    },
    (error) => {
        console.error("Request error:", error);
        return Promise.reject(error);
    }
);

// Response interceptor
request.interceptors.response.use(
    (response) => {
        const {data} = response;
        return data.data !== undefined ? data.data : data;
    },
    (error) => {
        console.error("Response error:", error);

        let message = "请求失败";

        if (error.response) {
            const {data, status} = error.response;

            if (data && data.error) {
                message = data.error;
            } else if (status === 404) {
                message = "请求的资源不存在";
            } else if (status === 500) {
                message = "服务器内部错误";
            } else if (status === 403) {
                message = "没有权限访问";
            }
        } else if (error.request) {
            message = "网络连接失败";
        }

        ElMessage.error(message);
        return Promise.reject(error);
    }
);

export default request;
