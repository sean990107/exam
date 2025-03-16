import axios from 'axios';

// 根据当前环境获取后端地址
const getBaseUrl = () => {
  // 使用localhost而不是hostname，因为我们在本地开发
  const baseUrl = 'http://localhost:49152';
  console.log('API Base URL:', baseUrl);
  return baseUrl;
};

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 10000, // 增加超时时间到10秒
  headers: {
    'Content-Type': 'application/json'
  },
  // 禁用withCredentials，因为它与origin: '*'不兼容
  withCredentials: false
});

// 添加请求拦截器
api.interceptors.request.use(
  config => {
    console.log('Request:', {
      url: config.url,
      method: config.method,
      data: config.data
    });
    return config;
  },
  error => {
    console.error('Request Error:', error);
    return Promise.reject(error);
  }
);

// 添加响应拦截器
api.interceptors.response.use(
  response => {
    console.log('Response:', response.data);
    return response;
  },
  error => {
    if (error.response) {
      // 服务器返回错误状态码
      console.error('Response Error:', {
        status: error.response.status,
        data: error.response.data
      });
    } else if (error.request) {
      // 请求发出但没有收到响应
      console.error('No Response:', error.request);
    } else {
      // 请求配置出错
      console.error('Request Config Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default api; 