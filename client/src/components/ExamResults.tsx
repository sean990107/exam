import React, { useState, useEffect } from 'react';
import { Card, Table, Typography, Tag, Button, Statistic, Row, Col, Spin, Empty, Modal, List, message, Space, Select } from 'antd';
import { BarChartOutlined, UserOutlined, FileTextOutlined, CheckCircleOutlined, EyeOutlined, TeamOutlined, TrophyOutlined, CalculatorOutlined, DownloadOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../api';
import type { Key } from 'react';
import type { ColumnsType } from 'antd/es/table';
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;

interface ExamResult {
  id: string;
  _id?: string;
  userId: string;
  userName: string;
  department: string;
  questions: {
    id: string;
    question: string;
    options: string[];
    answer: string;
    userAnswer: string;
    isCorrect: boolean;
  }[];
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timestamp: number;
}

interface ExamResultsProps {
  isAdmin: boolean;
}

const ExamResults: React.FC<ExamResultsProps> = ({ isAdmin }) => {
  const [loading, setLoading] = useState(false);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<ExamResult | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletingExamId, setDeletingExamId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [stats, setStats] = useState({
    totalExams: 0,
    averageScore: 0,
    highestScore: 0,
    lowestScore: 0,
    departmentStats: {} as {[key: string]: {count: number, avgScore: number}}
  });
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  const departments = [
    { text: '全部', value: 'all' },
    { text: '管理部门', value: '管理部门' },
    { text: '综合管理部', value: '综合管理部' },
    { text: '项目拓展部', value: '项目拓展部' },
    { text: '运营管理部', value: '运营管理部' }
  ];

  const departmentOptions = [
    { label: '全部', value: 'all' },
    { label: '管理部门', value: '管理部门' },
    { label: '综合管理部', value: '综合管理部' },
    { label: '项目拓展部', value: '项目拓展部' },
    { label: '运营管理部', value: '运营管理部' }
  ];

  useEffect(() => {
    if (isAdmin) {
      fetchExamResults();
    }
  }, [isAdmin]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const fetchExamResults = async () => {
    if (!isAdmin) return;
    
    try {
      setLoading(true);
      const response = await api.get('/api/exams');
      
      if (response.data && Array.isArray(response.data)) {
        const formattedResults = response.data.map((result: any) => ({
          ...result,
          _id: result._id || result.id
        }));
        
        setExamResults(formattedResults);
        calculateStats(formattedResults);
      }
    } catch (error) {
      console.error('获取考试结果失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (results: ExamResult[]) => {
    if (results.length === 0) {
      setStats({
        totalExams: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        departmentStats: {}
      });
      return;
    }

    const scores = results.map(r => r.score);
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);
    const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    
    // 按部门统计
    const deptStats: {[key: string]: {count: number, totalScore: number}} = {};
    
    results.forEach(result => {
      if (!deptStats[result.department]) {
        deptStats[result.department] = { count: 0, totalScore: 0 };
      }
      
      deptStats[result.department].count += 1;
      deptStats[result.department].totalScore += result.score;
    });
    
    // 计算各部门平均分
    const departmentStats: {[key: string]: {count: number, avgScore: number}} = {};
    
    Object.keys(deptStats).forEach(dept => {
      departmentStats[dept] = {
        count: deptStats[dept].count,
        avgScore: Math.round(deptStats[dept].totalScore / deptStats[dept].count)
      };
    });
    
    setStats({
      totalExams: results.length,
      averageScore,
      highestScore,
      lowestScore,
      departmentStats
    });
  };

  const handleDeleteExam = async () => {
    if (!deletingExamId) {
      console.log('没有要删除的ID');
      return;
    }
    
    console.log('准备删除考试记录，ID:', deletingExamId);
    
    try {
      setDeleteLoading(true);
      console.log('发送删除请求到:', `/api/exams/${deletingExamId}`);
      const response = await api.delete(`/api/exams/${deletingExamId}`);
      
      console.log('删除请求响应:', response);
      
      if (response.data && response.data.success) {
        message.success('考试记录删除成功');
        setDeleteModalVisible(false);
        // 重新加载考试结果
        fetchExamResults();
      } else {
        console.error('删除失败，服务器响应:', response.data);
        message.error(`删除失败: ${response.data?.message || '未知错误'}`);
      }
    } catch (error: any) {
      console.error('删除考试记录失败，详细错误:', error);
      if (error.response) {
        console.error('服务器响应状态码:', error.response.status);
        console.error('服务器响应数据:', error.response.data);
        message.error(`删除失败: ${error.response.data?.message || error.message || '服务器错误'}`);
      } else if (error.request) {
        console.error('没有收到响应:', error.request);
        message.error('删除失败: 服务器没有响应');
      } else {
        console.error('请求设置错误:', error.message);
        message.error(`删除失败: ${error.message}`);
      }
    } finally {
      setDeleteLoading(false);
      console.log('删除操作完成');
    }
  };

  const showDeleteConfirm = (id: string) => {
    console.log('准备删除考试记录，ID:', id);
    if (!id) {
      message.error('无效的记录ID');
      return;
    }
    setDeletingExamId(id);
    setDeleteModalVisible(true);
  };

  const exportToExcel = () => {
    try {
      const exportData = examResults.map(result => ({
        '姓名': result.userName,
        '部门': result.department,
        '分数': result.score,
        '正确题数': `${result.correctAnswers}/${result.totalQuestions}`,
        '考试时间': new Date(result.timestamp).toLocaleString(),
      }));
      
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "考试结果");
      
      // 设置列宽
      const colWidths = [
        { wch: 15 }, // 姓名
        { wch: 15 }, // 部门
        { wch: 10 }, // 分数
        { wch: 15 }, // 正确题数
        { wch: 25 }, // 考试时间
      ];
      
      worksheet['!cols'] = colWidths;
      
      XLSX.writeFile(workbook, "考试结果.xlsx");
      message.success('导出成功');
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败');
    }
  };

  const columns: ColumnsType<ExamResult> = [
    {
      title: '姓名',
      dataIndex: 'userName',
      key: 'userName',
      width: 150,
      align: 'center',
      sorter: (a, b) => a.userName.localeCompare(b.userName)
    },
    {
      title: '部门',
      dataIndex: 'department',
      key: 'department',
      width: 150,
      align: 'center',
      filters: departments,
      onFilter: (value: Key | boolean, record: ExamResult) => 
        record.department === (typeof value === 'string' ? value : String(value))
    },
    {
      title: '分数',
      dataIndex: 'score',
      key: 'score',
      width: 120,
      align: 'center',
      render: (score: number) => (
        <span style={{ color: score >= 60 ? '#52c41a' : '#f5222d', fontWeight: 'bold' }}>
          {score}
        </span>
      ),
    },
    {
      title: '考试时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 200,
      align: 'center',
      render: (timestamp: number) => new Date(timestamp).toLocaleString(),
    },
    {
      title: '答题详情',
      key: 'details',
      width: 400,
      align: 'center',
      render: (record: ExamResult) => (
        <div>
          <Tag color={record.score >= 60 ? "success" : "error"} style={{ fontSize: '14px' }}>
            {record.correctAnswers}/{record.totalQuestions}
          </Tag>
        </div>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      align: 'center',
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button 
            type="link" 
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedResult(record);
              setDetailModalVisible(true);
            }}
          />
          <Button 
            type="link" 
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              const recordId = record._id || record.id;
              console.log('删除按钮点击，记录:', record, '使用ID:', recordId);
              showDeleteConfirm(recordId);
            }}
          />
        </Space>
      ),
    }
  ];

  if (!isAdmin) {
    return (
      <Card title="考试结果分析">
        <Empty description="只有管理员可以查看考试结果分析" />
      </Card>
    );
  }

  if (loading) {
    return (
      <Card title="考试结果分析">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
          <p>正在加载考试结果...</p>
        </div>
      </Card>
    );
  }

  return (
    <div style={{ 
      maxWidth: '1400px', 
      margin: '10px auto', 
      padding: '10px',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <Card 
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChartOutlined style={{ fontSize: isMobile ? '18px' : '24px', color: '#1890ff' }} />
            <span>考试结果分析</span>
          </span>
        } 
        className="dashboard-card exam-results-component"
        style={{ 
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          borderRadius: '12px'
        }}
        extra={
          examResults.length > 0 ? (
            <Button 
              type="primary" 
              icon={<DownloadOutlined />} 
              onClick={exportToExcel}
            >
              导出Excel
            </Button>
          ) : null
        }
      >
        <Space style={{ marginBottom: 16 }}>
          <Select
            style={{ width: 180 }}
            placeholder="选择部门筛选"
            onChange={setSelectedDepartment}
            value={selectedDepartment}
            allowClear
            dropdownMatchSelectWidth={false}
            listHeight={200}
            options={departmentOptions.map(opt => ({
              label: opt.label,
              value: opt.value,
            }))}
          />
        </Space>

        {examResults.length > 0 ? (
          <>
            <div style={{ marginBottom: 24 }}>
              <Row gutter={[16, 16]}>
                <Col xs={12} sm={12} md={6}>
                  <Card 
                    className="stat-card" 
                    style={{ 
                      boxShadow: '0 2px 8px rgba(0,0,0,0.09)',
                      borderRadius: '8px',
                      transition: 'all 0.3s ease',
                      border: '1px solid #f0f0f0',
                    }}
                  >
                    <Statistic 
                      title={
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                          <UserOutlined style={{ color: '#1890ff' }} />
                          参与考试人数
                        </span>
                      }
                      value={stats.totalExams} 
                      valueStyle={{ color: '#1890ff', fontWeight: 'bold', textAlign: 'center' }}
                      suffix="人"
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={12} md={6}>
                  <Card 
                    className="stat-card" 
                    style={{ 
                      boxShadow: '0 2px 8px rgba(0,0,0,0.09)',
                      borderRadius: '8px',
                      transition: 'all 0.3s ease',
                      border: '1px solid #f0f0f0'
                    }}
                  >
                    <Statistic 
                      title={
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                          <CalculatorOutlined style={{ color: '#52c41a' }} />
                          平均分数
                        </span>
                      }
                      value={stats.averageScore} 
                      valueStyle={{ color: stats.averageScore >= 60 ? '#52c41a' : '#f5222d', fontWeight: 'bold', textAlign: 'center' }}
                      suffix="分"
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={12} md={6}>
                  <Card 
                    className="stat-card" 
                    style={{ 
                      boxShadow: '0 2px 8px rgba(0,0,0,0.09)',
                      borderRadius: '8px',
                      transition: 'all 0.3s ease',
                      border: '1px solid #f0f0f0'
                    }}
                  >
                    <Statistic 
                      title={
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                          <TrophyOutlined style={{ color: '#faad14' }} />
                          最高分
                        </span>
                      }
                      value={stats.highestScore} 
                      valueStyle={{ color: '#faad14', fontWeight: 'bold', textAlign: 'center' }}
                      suffix="分"
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={12} md={6}>
                  <Card 
                    className="stat-card" 
                    style={{ 
                      boxShadow: '0 2px 8px rgba(0,0,0,0.09)',
                      borderRadius: '8px',
                      transition: 'all 0.3s ease',
                      border: '1px solid #f0f0f0'
                    }}
                  >
                    <Statistic 
                      title={
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                          <FileTextOutlined style={{ color: '#ff4d4f' }} />
                          最低分
                        </span>
                      }
                      value={stats.lowestScore} 
                      valueStyle={{ color: stats.lowestScore >= 60 ? '#52c41a' : '#ff4d4f', fontWeight: 'bold', textAlign: 'center' }}
                      suffix="分"
                    />
                  </Card>
                </Col>
              </Row>
            </div>

            <div style={{ marginBottom: 24 }}>
              <Card 
                title={
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TeamOutlined style={{ color: '#1890ff' }} />
                    <span>各部门考试数据</span>
                  </span>
                } 
                size="small"
                style={{ 
                  boxShadow: '0 2px 8px rgba(0,0,0,0.09)',
                  borderRadius: '8px'
                }}
              >
                <Row gutter={[16, 16]}>
                  {Object.keys(stats.departmentStats).map(dept => (
                    <Col xs={12} sm={12} md={8} key={dept}>
                      <Card 
                        size="small" 
                        title={
                          <span style={{ display: 'flex', alignItems: 'center' }}>
                            <TeamOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                            {dept}
                          </span>
                        }
                        style={{ 
                          borderRadius: '8px',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                          transition: 'all 0.3s ease',
                          border: '1px solid #f0f0f0'
                        }}
                        hoverable
                      >
                        <Row gutter={[8, 8]} align="middle">
                          <Col span={12}>参与人数:</Col>
                          <Col span={12} style={{ textAlign: 'right', fontWeight: 'bold' }}>
                            {stats.departmentStats[dept].count}人
                          </Col>
                          <Col span={12}>平均分数:</Col>
                          <Col span={12} style={{ 
                            textAlign: 'right', 
                            fontWeight: 'bold',
                            color: stats.departmentStats[dept].avgScore >= 60 ? '#52c41a' : '#f5222d'
                          }}>
                            {stats.departmentStats[dept].avgScore}分
                          </Col>
                        </Row>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Card>
            </div>

            <Table 
              columns={columns} 
              dataSource={
                selectedDepartment === 'all' 
                  ? examResults 
                  : examResults.filter(r => r.department === selectedDepartment)
              }
              rowKey="id"
              pagination={{ 
                pageSize: 10,
                showTotal: (total) => `共 ${total} 条记录`,
                showSizeChanger: true,
                showQuickJumper: true,
              }}
              scroll={{ x: 1000 }}
              size={isMobile ? "small" : "middle"}
              style={{ 
                background: 'white',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.09)'
              }}
            />
          </>
        ) : (
          <Empty description="暂无考试结果" />
        )}
        
        <Modal
          title="确认删除"
          open={deleteModalVisible}
          onOk={handleDeleteExam}
          onCancel={() => setDeleteModalVisible(false)}
          confirmLoading={deleteLoading}
        >
          <p>确定要删除这条考试记录吗？此操作不可撤销。</p>
        </Modal>

        <Modal
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <EyeOutlined style={{ color: '#1890ff' }} />
              <span>考试详情</span>
            </span>
          }
          open={detailModalVisible}
          onCancel={() => setDetailModalVisible(false)}
          footer={null}
          width={isMobile ? '95%' : 700}
          style={{ top: 20 }}
        >
          {selectedResult && (
            <>
              <div style={{ marginBottom: isMobile ? 16 : 24 }}>
                <Row gutter={isMobile ? 8 : 16}>
                  <Col span={isMobile ? 8 : 8}>
                    <Statistic
                      title={
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: isMobile ? '12px' : '14px' }}>
                          <TrophyOutlined style={{ color: '#faad14' }} />
                          得分
                        </span>
                      }
                      value={selectedResult.score}
                      suffix="分"
                      valueStyle={{ 
                        color: selectedResult.score >= 60 ? '#52c41a' : '#ff4d4f',
                        fontSize: isMobile ? '16px' : '20px',
                        fontWeight: 'bold'
                      }}
                    />
                  </Col>
                  <Col span={isMobile ? 8 : 8}>
                    <Statistic 
                      title={
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: isMobile ? '12px' : '14px' }}>
                          <CheckCircleOutlined style={{ color: '#52c41a' }} />
                          正确率
                        </span>
                      }
                      value={Math.round((selectedResult.correctAnswers / selectedResult.totalQuestions) * 100)} 
                      suffix="%" 
                      valueStyle={{ 
                        color: (selectedResult.correctAnswers / selectedResult.totalQuestions) >= 0.6 ? '#52c41a' : '#ff4d4f',
                        fontSize: isMobile ? '16px' : '20px',
                        fontWeight: 'bold'
                      }}
                    />
                  </Col>
                  <Col span={isMobile ? 8 : 8}>
                    <Statistic 
                      title={
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: isMobile ? '12px' : '14px' }}>
                          <CalculatorOutlined style={{ color: '#1890ff' }} />
                          答题时间
                        </span>
                      }
                      value={new Date(selectedResult.timestamp).toLocaleString()} 
                      valueStyle={{ fontSize: isMobile ? '12px' : '14px' }}
                    />
                  </Col>
                </Row>
              </div>
              
              <Card
                title={
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FileTextOutlined style={{ color: '#1890ff' }} />
                    答题详情
                  </span>
                }
                size="small"
                style={{ marginBottom: 16 }}
              >
                <List
                  dataSource={selectedResult.questions}
                  renderItem={(item, index) => (
                    <List.Item>
                      <div style={{ width: '100%' }}>
                        <div style={{ marginBottom: 8 }}>
                          <Tag color={item.isCorrect ? 'success' : 'error'} style={{ marginRight: 8 }}>
                            {item.isCorrect ? '正确' : '错误'}
                          </Tag>
                          <span style={{ fontWeight: 'bold' }}>
                            {index + 1}. {item.question}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ marginBottom: '4px' }}>
                            <Tag color="blue">题目选项</Tag>
                            <div style={{ marginTop: '4px' }}>
                              {item.options.map((option, optIndex) => (
                                <div 
                                  key={optIndex} 
                                  style={{ 
                                    margin: '4px 0',
                                    padding: '4px 8px',
                                    background: 
                                      String.fromCharCode(65 + optIndex) === item.answer ? '#f6ffed' :
                                      String.fromCharCode(65 + optIndex) === item.userAnswer ? '#fff2e8' : 
                                      'transparent',
                                    border: 
                                      String.fromCharCode(65 + optIndex) === item.answer ? '1px solid #b7eb8f' :
                                      String.fromCharCode(65 + optIndex) === item.userAnswer ? '1px solid #ffbb96' : 
                                      'none',
                                    borderRadius: '4px'
                                  }}
                                >
                                  <span style={{ fontWeight: 'bold', marginRight: '8px' }}>
                                    {String.fromCharCode(65 + optIndex)}
                                  </span>
                                  {option}
                                  {String.fromCharCode(65 + optIndex) === item.answer && (
                                    <Tag color="success" style={{ marginLeft: '8px', float: 'right' }}>
                                      正确答案
                                    </Tag>
                                  )}
                                  {String.fromCharCode(65 + optIndex) === item.userAnswer && (
                                    <Tag color={item.isCorrect ? 'success' : 'error'} style={{ marginLeft: '8px', float: 'right' }}>
                                      所选答案
                                    </Tag>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
              </Card>
            </>
          )}
        </Modal>
      </Card>
    </div>
  );
};

export default ExamResults; 