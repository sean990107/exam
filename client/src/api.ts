import axios from 'axios';

// 根据环境变量配置API基础URL
const baseURL = process.env.NODE_ENV === 'production'
  ? 'https://your-backend-url.up.railway.app' // 部署后替换为实际的后端URL
  : 'http://localhost:8000';

// 创建 axios 实例
const api = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 在发送请求之前做些什么
    console.log(`发送 ${config.method?.toUpperCase()} 请求到: ${config.url}`);
    return config;
  },
  (error) => {
    // 对请求错误做些什么
    console.error('请求拦截器捕获到错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    // 对响应数据做点什么
    return response;
  },
  (error) => {
    // 对响应错误做点什么
    console.error('API 错误:', error.message);
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应数据:', error.response.data);
    } else if (error.request) {
      console.error('无响应，网络问题或服务器未运行');
    }
    return Promise.reject(error);
  }
);

export default api; 