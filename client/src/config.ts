// API基础URL配置
export const API_BASE_URL = 'http://localhost:49152';

// 其他全局配置
export const CONFIG = {
  // 题目相关配置
  QUESTIONS: {
    MIN_COUNT: 1,
    MAX_COUNT: 100
  },
  // 考试相关配置
  EXAM: {
    TIME_LIMIT: 60 * 60 * 1000, // 默认考试时间限制（毫秒）
    PASS_SCORE: 60 // 及格分数
  }
}; 