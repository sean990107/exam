import React, { useState, useEffect } from 'react';
import { Form, Button, Card, Radio, Checkbox, message, Result, Spin, Typography, Progress, Divider, Row, Col, Statistic, Empty } from 'antd';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const { Title, Text, Paragraph } = Typography;

interface ExamProps {
  user: {
    name: string;
    department: string;
    isAdmin: boolean;
  };
}

const Exam: React.FC<ExamProps> = ({ user }) => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [examSettings, setExamSettings] = useState<any>(null);
  const [hasCompletedExam, setHasCompletedExam] = useState(false);
  const [previousExamData, setPreviousExamData] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [isMobile, setIsMobile] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [examDuration, setExamDuration] = useState<number>(0);
  const [examResult, setExamResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);
  const [examMode, setExamMode] = useState<string>('unlimited');

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 初始化数据
  useEffect(() => {
    const initExam = async () => {
      try {
        setLoading(true);
        
        // 获取考试模式设置
        try {
          const modeResponse = await api.get('/api/settings/exam-mode');
          if (modeResponse.data && modeResponse.data.examMode) {
            setExamMode(modeResponse.data.examMode);
            console.log('考试模式:', modeResponse.data.examMode);
          }
        } catch (error) {
          console.error('获取考试模式失败，默认使用无限制模式:', error);
          setExamMode('unlimited');
        }
        
        // 获取考试设置
        const settingsResponse = await api.get('/api/exam-settings');
        if (settingsResponse.data) {
          setExamSettings(settingsResponse.data);
          
          // 设置考试时间
          if (settingsResponse.data.examDuration) {
            const durationInSeconds = settingsResponse.data.examDuration * 60;
            setExamDuration(durationInSeconds);
            setRemainingTime(durationInSeconds);
          }
          
          // 检查用户是否已参加过考试
          await checkUserExamHistory();
          
          // 获取题目
          await fetchQuestions(settingsResponse.data);
        }
      } catch (error) {
        console.error('初始化考试失败:', error);
        message.error('初始化考试失败，请刷新页面重试');
      } finally {
        setLoading(false);
      }
    };
    
    initExam();
  }, []);

  // 检查用户是否已参加过考试
  const checkUserExamHistory = async () => {
    try {
      const response = await api.get(`/api/exams/check/${encodeURIComponent(user.name)}/${encodeURIComponent(user.department)}`);
      console.log('考试历史记录:', response.data);
      
      if (response.data.success) {
        setHasCompletedExam(response.data.hasCompletedExam);
        if (response.data.hasCompletedExam) {
          setPreviousExamData(response.data.examData);
          setExamResult(response.data.examData);
          
          // 如果是限制模式，并且用户已完成考试，则显示结果
          if (examMode === 'restricted' && response.data.hasCompletedExam) {
            setShowResult(true);
          }
        }
      }
    } catch (error) {
      console.error('检查考试记录失败:', error);
      message.error('检查考试记录失败');
    }
  };

  // 获取题目
  const fetchQuestions = async (settings: any) => {
    try {
      console.log('开始获取题目，设置:', settings);
      let response;
      
      if (settings.questionMode === 'custom' || settings.questionMode === 'random') {
        // 随机抽取指定数量的题目
        const count = parseInt(settings.customQuestionCount) || 10;
        console.log(`随机获取${count}道题目`);
        response = await api.get(`/api/questions/random/${count}`);
        console.log('随机题目响应:', response.data);
        
        if (response.data.success && Array.isArray(response.data.questions)) {
          console.log(`成功获取到${response.data.questions.length}道题目`);
          const formattedQuestions = response.data.questions.map((q: any) => ({
            ...q,
            id: q._id || q.id // 确保ID正确映射
          }));
          setQuestions(formattedQuestions);
        } else {
          console.warn('获取随机题目失败，响应数据格式不正确:', response.data);
          message.error('获取题目失败，请刷新重试');
        }
      } else {
        // 默认获取全部题目
        console.log('获取全部题目');
        response = await api.get('/api/questions');
        console.log('全部题目响应:', response.data);
        
        // 处理新的API响应格式
        if (response.data && response.data.success && Array.isArray(response.data.questions)) {
          console.log(`成功获取到${response.data.questions.length}道题目（新格式）`);
          const formattedQuestions = response.data.questions.map((q: any) => ({
            ...q,
            id: q._id || q.id // 确保ID正确映射
          }));
          setQuestions(formattedQuestions);
        } else if (Array.isArray(response.data)) {
          // 兼容旧格式
          console.log(`成功获取到${response.data.length}道题目（旧格式）`);
          const formattedQuestions = response.data.map((q: any) => ({
            ...q,
            id: q._id || q.id // 确保ID正确映射
          }));
          setQuestions(formattedQuestions);
        } else {
          console.warn('获取题目失败，响应数据格式不正确:', response.data);
          message.error('获取题目失败，数据格式不正确');
        }
      }
    } catch (error) {
      console.error('获取题目失败:', error);
      message.error('获取题目失败，请刷新重试');
    }
  };
  
  // 计时器
  useEffect(() => {
    console.log('计时器useEffect触发，状态:', {
      remainingTime,
      loading,
      hasCompletedExam
    });
    
    let timer: NodeJS.Timeout | null = null;
    
    // 只有在有剩余时间、不在加载状态且未完成考试时才启动计时器
    if (remainingTime > 0 && !loading && !hasCompletedExam) {
      console.log('创建新计时器，剩余时间:', remainingTime);
      
      timer = setInterval(() => {
        setRemainingTime(prevTime => {
          console.log('定时器执行，当前剩余时间:', prevTime);
          
          if (prevTime <= 1) {
            console.log('时间到，自动提交答案');
            clearInterval(timer as NodeJS.Timeout);
            handleSubmit();
            return 0;
          }
          
          return prevTime - 1;
        });
      }, 1000);
      
      console.log('计时器已设置，ID:', timer);
    }

    // 清理函数
    return () => {
      if (timer) {
        console.log('清除计时器，ID:', timer);
        clearInterval(timer);
        timer = null;
      }
    };
  }, [loading, hasCompletedExam]); // 移除remainingTime作为依赖项

  // 格式化时间为 分:秒
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (questionId: string, value: string | string[]) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleNext = async () => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!answers[currentQuestion.id]) {
      message.error('请先回答当前题目');
      return;
    }

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    // 检查是否所有题目都已回答
    const unansweredQuestions = questions.filter(q => !answers[q.id]);
    if (unansweredQuestions.length > 0) {
      message.error('请回答所有题目后再提交');
      return;
    }

    setSubmitting(true);
    try {
      // 获取每道题的完整数据，包括答案
      const fullQuestions = await api.get('/api/questions');
      console.log('获取到的完整题库数据:', fullQuestions.data);
      
      // 构建带答案的题目数组
      const questionsWithAnswers = questions.map(q => {
        // 查找完整题目信息 - 注意MongoDB的_id和前端的id匹配问题
        let correctAnswer = '';
        let fullQuestionsData = [];
        
        if (fullQuestions.data && fullQuestions.data.success && Array.isArray(fullQuestions.data.questions)) {
          fullQuestionsData = fullQuestions.data.questions;
        } else if (Array.isArray(fullQuestions.data)) {
          fullQuestionsData = fullQuestions.data;
        }
        
        if (fullQuestionsData.length > 0) {
          // 尝试直接通过ID匹配
          const exactMatch = fullQuestionsData.find((fq: any) => fq._id === q.id || fq.id === q.id);
          if (exactMatch) {
            correctAnswer = exactMatch.correctAnswer;
            console.log(`题目 ${q.id} 匹配成功，正确答案: ${correctAnswer}`);
          } else {
            // 如果ID不匹配，尝试通过题目内容匹配
            const contentMatch = fullQuestionsData.find((fq: any) => 
              fq.question === q.question || 
              fq.question.includes(q.question) || 
              q.question.includes(fq.question)
            );
            if (contentMatch) {
              correctAnswer = contentMatch.correctAnswer;
              console.log(`题目 ${q.id} 通过内容匹配成功，正确答案: ${correctAnswer}`);
            } else {
              console.warn(`无法为题目 ${q.id} 找到匹配的答案，题目内容: ${q.question}`);
            }
          }
        }
        
        return {
          id: q.id,
          question: q.question,
          type: q.type,
          options: q.options,
          answer: correctAnswer,
          userAnswer: typeof answers[q.id] === 'string' 
            ? answers[q.id] 
            : (answers[q.id] as string[]).join('')
        };
      });

      console.log('准备提交的答案数据:', questionsWithAnswers);
      const response = await api.post('/api/exams/submit', {
        userName: user.name,
        department: user.department,
        questions: questionsWithAnswers,
        usedTime: 0,
        passingScore: examSettings?.passingScore || 60
      });

      if (response.data.success) {
        message.success('提交成功！');
        setExamResult(response.data);
        setShowResult(true);
        setHasCompletedExam(true);
      } else {
        message.error(response.data.message || '提交失败');
      }
    } catch (error: any) {
      console.error('提交答案失败:', error);
      message.error(error.response?.data?.message || '提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 如果是限制模式且用户已完成考试，则直接显示结果
  useEffect(() => {
    if (examMode === 'restricted' && hasCompletedExam && previousExamData) {
      setExamResult(previousExamData);
      setShowResult(true);
    }
  }, [examMode, hasCompletedExam, previousExamData]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  // 如果是限制模式且用户已参加过考试，显示历史成绩
  if ((examMode === 'restricted' && hasCompletedExam) || showResult) {
    if (!examResult) {
      return (
        <div style={{ 
          maxWidth: '1400px', 
          margin: '10px auto', 
          padding: '10px',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)'
        }}>
          <Card 
            bordered={false} 
            style={{ 
              background: 'transparent',
              borderRadius: '8px',
            }}
          >
            <Empty
              description={
                <span>暂无考试记录，可能数据尚未加载完成</span>
              }
            />
            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <Button type="primary" onClick={() => navigate('/')}>
                返回首页
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return (
      <div style={{ 
        maxWidth: '1400px', 
        margin: '10px auto', 
        padding: '10px',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)'
      }}>
        <Card 
          bordered={false} 
          style={{ 
            background: 'transparent',
            borderRadius: '12px',
          }}
        >
          <Result
            status={examResult.isPassed ? "success" : "warning"}
            title={
              <Title level={2} style={{ color: examResult.isPassed ? '#52c41a' : '#faad14' }}>
                考试{examResult.isPassed ? '通过' : '未通过'}
              </Title>
            }
            subTitle={
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: '72px', 
                  fontWeight: 'bold', 
                  color: examResult.isPassed ? '#52c41a' : '#faad14',
                  margin: '20px 0'
                }}>
                  {examResult.score}分
                </div>
                <Divider style={{ margin: '24px 0' }} />
                <Row gutter={24} style={{ textAlign: 'center', marginBottom: '30px' }}>
                  <Col span={8}>
                    <Statistic 
                      title="总题数" 
                      value={examResult.totalQuestions} 
                      suffix="题"
                      valueStyle={{ fontSize: '28px', fontWeight: 'bold' }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic 
                      title="答对题数" 
                      value={examResult.correctAnswers} 
                      suffix="题"
                      valueStyle={{ fontSize: '28px', fontWeight: 'bold', color: '#52c41a' }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic 
                      title="通过分数线" 
                      value={examResult.passingScore || 60} 
                      suffix="分"
                      valueStyle={{ fontSize: '28px', fontWeight: 'bold' }}
                    />
                  </Col>
                </Row>
                <Text style={{ fontSize: '18px', color: examResult.isPassed ? '#52c41a' : '#faad14', fontWeight: 'bold' }}>
                  {examResult.isPassed ? "恭喜，您已通过考试！" : "未达到及格标准，请继续努力！"}
                </Text>
                {examMode === 'restricted' && hasCompletedExam && (
                  <div style={{ marginTop: '16px' }}>
                    <Text type="secondary" style={{ fontSize: '16px' }}>
                      您已参加过考试，根据设置，每位用户只能参加一次考试。
                    </Text>
                  </div>
                )}
              </div>
            }
            extra={[
              <Button 
                type="primary" 
                size="large" 
                key="home" 
                onClick={() => navigate('/')} 
                style={{ 
                  minWidth: '150px', 
                  height: '45px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                返回首页
              </Button>
            ]}
          />
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;
    
  return (
    <div style={{ 
      maxWidth: '1600px',
      margin: '10px auto', 
      padding: isMobile ? '5px' : '10px', 
      background: 'linear-gradient(to right, #f8f9fa, #e9ecef)',
      borderRadius: isMobile ? '8px' : '12px',
      minHeight: 'calc(100vh - 200px)',
      boxShadow: '0 6px 16px rgba(0, 0, 0, 0.08)',
      width: isMobile ? '98%' : 'auto'
    }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          <Card 
            style={{ 
              marginBottom: isMobile ? '12px' : '24px', 
              borderRadius: isMobile ? '8px' : '12px',
              boxShadow: '0 6px 16px rgba(0, 0, 0, 0.05)',
              border: 'none'
            }}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: isMobile ? '10px' : '20px'
            }}>
              <div>
                <Title level={isMobile ? 4 : 3} style={{ margin: 0, color: '#1a1a2e', fontWeight: 600, fontSize: isMobile ? '20px' : '26px' }}>
                  安全知识测试
                </Title>
                <Text style={{ color: '#555', fontSize: isMobile ? '14px' : '16px', marginTop: '6px', display: 'block' }}>
                  总共 {questions.length} 题，已答 {answeredCount} 题
                </Text>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Progress
                  type="circle"
                  percent={Math.round((currentQuestionIndex + 1) / questions.length * 100)}
                  width={isMobile ? 70 : 90}
                  strokeWidth={8}
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#1890ff',
                  }}
                  format={() => (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: 'bold', color: '#1890ff' }}>
                        {currentQuestionIndex + 1}
                      </div>
                      <div style={{ fontSize: isMobile ? '12px' : '13px', color: '#666', marginTop: '-2px' }}>
                        / {questions.length}
                      </div>
                    </div>
                  )}
                />
              </div>
            </div>
          </Card>

          <Card 
            style={{ 
              borderRadius: isMobile ? '8px' : '12px',
              boxShadow: '0 6px 16px rgba(0, 0, 0, 0.05)',
              border: 'none'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {questions.map((_, index) => (
                  <div 
                    key={index}
                    onClick={() => setCurrentQuestionIndex(index)}
                    style={{
                      width: isMobile ? '32px' : '36px',
                      height: isMobile ? '32px' : '36px',
                      borderRadius: '50%',
                      display: 'flex', 
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      backgroundColor: currentQuestionIndex === index ? '#1890ff' : 
                                      answers[questions[index]?.id] ? '#52c41a' : '#f0f0f0',
                      color: (currentQuestionIndex === index || answers[questions[index]?.id]) ? '#fff' : '#666',
                      fontWeight: currentQuestionIndex === index ? 'bold' : 'normal',
                      fontSize: isMobile ? '12px' : '14px',
                      boxShadow: currentQuestionIndex === index ? '0 0 10px rgba(24, 144, 255, 0.5)' : 'none',
                      transition: 'all 0.3s',
                      border: currentQuestionIndex === index ? '2px solid #e6f7ff' : '1px solid transparent'
                    }}
                  >
                    {index + 1}
                  </div>
                ))}
              </div>
            </div>

            {questions.length > 0 && (
              <div>
                <div style={{ 
                  background: 'linear-gradient(145deg, #ffffff, #f8fafc)',
                  padding: isMobile ? '20px 15px' : '30px',
                  borderRadius: isMobile ? '12px' : '14px',
                  marginBottom: isMobile ? '16px' : '24px',
                  boxShadow: '0 3px 15px rgba(0, 0, 0, 0.06)',
                  border: '1px solid #edf2f7',
                }}>
                  <Title level={4} style={{ 
                    marginBottom: isMobile ? '16px' : '24px', 
                    color: '#1e293b',
                    fontSize: isMobile ? '18px' : '20px',
                    lineHeight: '1.5',
                    fontWeight: 600
                  }}>
                    <span style={{ 
                      display: 'inline-block', 
                      backgroundColor: '#1890ff', 
                      color: 'white', 
                      borderRadius: '50%',
                      width: isMobile ? '28px' : '32px', 
                      height: isMobile ? '28px' : '32px',
                      textAlign: 'center',
                      lineHeight: isMobile ? '28px' : '32px',
                      marginRight: '12px',
                      fontSize: isMobile ? '14px' : '16px',
                      boxShadow: '0 2px 5px rgba(24, 144, 255, 0.3)'
                    }}>
                      {currentQuestionIndex + 1}
                    </span>
                    {questions[currentQuestionIndex]?.question}
                    <Text style={{ 
                      fontSize: isMobile ? '12px' : '14px', 
                      marginLeft: isMobile ? '8px' : '12px', 
                      color: '#94a3b8',
                      backgroundColor: '#f1f5f9',
                      padding: isMobile ? '2px 6px' : '4px 10px',
                      borderRadius: '6px',
                      fontWeight: 'normal'
                    }}>
                      {questions[currentQuestionIndex]?.type === 'single' ? '单选题' : '多选题'}
                    </Text>
                  </Title>

                  <Form layout="vertical" style={{ width: '100%' }}>
                    {questions[currentQuestionIndex]?.type === 'single' ? (
                      <Radio.Group
                        onChange={e => handleAnswerChange(questions[currentQuestionIndex].id, e.target.value)}
                        value={answers[questions[currentQuestionIndex].id] as string}
                        style={{ width: '100%', display: 'block' }}
                      >
                        {questions[currentQuestionIndex]?.options.map((option: any, index: number) => (
                          <Radio
                            key={index}
                            value={String.fromCharCode(65 + index)}
                            style={{
                              display: 'flex', 
                              alignItems: 'center',
                              marginBottom: isMobile ? '15px' : '20px',
                              padding: isMobile ? '20px 15px' : '30px 30px',
                              borderRadius: '10px',
                              border: answers[questions[currentQuestionIndex].id] === String.fromCharCode(65 + index)
                                ? '3px solid #1890ff'
                                : '2px solid #e2e8f0',
                              transition: 'all 0.3s',
                              backgroundColor: answers[questions[currentQuestionIndex].id] === String.fromCharCode(65 + index) 
                                ? 'rgba(24, 144, 255, 0.05)' 
                                : '#fff',
                              boxShadow: answers[questions[currentQuestionIndex].id] === String.fromCharCode(65 + index)
                                ? '0 0 8px rgba(24, 144, 255, 0.15)'
                                : '0 1px 3px rgba(0, 0, 0, 0.02)',
                              transform: answers[questions[currentQuestionIndex].id] === String.fromCharCode(65 + index)
                                ? 'translateY(-2px)'
                                : 'none',
                              width: '100%',
                              lineHeight: '32px'
                            }}
                          >
                            <span style={{ 
                              fontWeight: 'bold',
                              color: '#1890ff',
                              width: '36px',
                              display: 'inline-block',
                              fontSize: isMobile ? '14px' : '16px',
                              height: '32px',
                              lineHeight: '32px',
                              verticalAlign: 'middle'
                            }}>
                              {String.fromCharCode(65 + index)}.
                            </span> 
                            <span style={{ 
                              fontSize: isMobile ? '14px' : '16px', 
                              color: '#475569', 
                              height: '32px', 
                              lineHeight: '32px', 
                              verticalAlign: 'middle'
                            }}>
                              {option}
                            </span>
                          </Radio>
                        ))}
                      </Radio.Group>
                    ) : (
                      <Checkbox.Group
                        onChange={values => handleAnswerChange(questions[currentQuestionIndex].id, values)}
                        value={answers[questions[currentQuestionIndex].id] as string[]}
                        style={{ width: '100%', display: 'block' }}
                      >
                        {questions[currentQuestionIndex]?.options.map((option: any, index: number) => (
                          <Checkbox
                            key={index}
                            value={String.fromCharCode(65 + index)}
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center',
                              marginBottom: isMobile ? '15px' : '20px',
                              padding: isMobile ? '20px 15px' : '30px 30px',
                              borderRadius: '10px',
                              border: (answers[questions[currentQuestionIndex].id] as string[] || []).includes(String.fromCharCode(65 + index))
                                ? '3px solid #52c41a'
                                : '2px solid #e2e8f0',
                              width: '100%',
                              transition: 'all 0.3s',
                              backgroundColor: (answers[questions[currentQuestionIndex].id] as string[] || []).includes(String.fromCharCode(65 + index))
                                ? 'rgba(82, 196, 26, 0.05)'
                                : '#fff',
                              boxShadow: (answers[questions[currentQuestionIndex].id] as string[] || []).includes(String.fromCharCode(65 + index))
                                ? '0 0 8px rgba(82, 196, 26, 0.15)'
                                : '0 1px 3px rgba(0, 0, 0, 0.02)',
                              transform: (answers[questions[currentQuestionIndex].id] as string[] || []).includes(String.fromCharCode(65 + index))
                                ? 'translateY(-2px)'
                                : 'none',
                              lineHeight: '32px'
                            }}
                          >
                            <span style={{
                              fontWeight: 'bold',
                              color: '#52c41a',
                              width: '36px',
                              display: 'inline-block',
                              fontSize: isMobile ? '14px' : '16px',
                              height: '32px',
                              lineHeight: '32px',
                              verticalAlign: 'middle'
                            }}>
                              {String.fromCharCode(65 + index)}.
                            </span>
                            <span style={{ 
                              fontSize: isMobile ? '14px' : '16px', 
                              color: '#475569', 
                              height: '32px', 
                              lineHeight: '32px', 
                              verticalAlign: 'middle'
                            }}>
                              {option}
                            </span>
                          </Checkbox>
                        ))}
                      </Checkbox.Group>
                    )}
                  </Form>
                </div>

                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  marginTop: isMobile ? '20px' : '30px',
                  gap: isMobile ? '10px' : '20px'
                }}>
                  <Button 
                    onClick={handlePrev}
                    disabled={currentQuestionIndex === 0}
                    style={{
                      width: isMobile ? '100px' : '130px',
                      height: isMobile ? '40px' : '45px',
                      borderRadius: '10px',
                      fontSize: isMobile ? '14px' : '16px',
                      fontWeight: '500',
                      borderWidth: '1px',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)'
                    }}
                  >
                    上一题
                  </Button>
                  <div>
                    {currentQuestionIndex === questions.length - 1 ? (
                      <Button 
                        type="primary"
                        onClick={handleSubmit}
                        loading={submitting}
                        style={{ 
                          width: isMobile ? '100px' : '130px',
                          height: isMobile ? '40px' : '45px',
                          borderRadius: '10px',
                          fontSize: isMobile ? '14px' : '16px',
                          fontWeight: '500',
                          background: 'linear-gradient(to right, #1890ff, #096dd9)',
                          border: 'none',
                          boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)'
                        }}
                      >
                        提交
                      </Button>
                    ) : (
                      <Button 
                        type="primary"
                        onClick={handleNext}
                        style={{ 
                          width: isMobile ? '100px' : '130px',
                          height: isMobile ? '40px' : '45px',
                          borderRadius: '10px',
                          fontSize: isMobile ? '14px' : '16px',
                          fontWeight: '500',
                          background: 'linear-gradient(to right, #1890ff, #096dd9)',
                          border: 'none',
                          boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)'
                        }}
                      >
                        下一题
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default Exam; 