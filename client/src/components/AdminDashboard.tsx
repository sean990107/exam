import React, { useState, useEffect } from 'react';
import { Card, Table, Button, message, Tabs, Modal, Form, Input, Select, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../api';
import axios from 'axios';

const { TabPane } = Tabs;
const { Option } = Select;

interface User {
  id: number;
  name: string;
  department: string;
  role: 'admin' | 'user';
}

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
  type: 'single' | 'multiple';
}

interface AdminDashboardProps {
  user: User;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [form] = Form.useForm();
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [examSettings, setExamSettings] = useState({
    questionMode: 'all',
    customQuestionCount: 10,
    examDuration: 30,
    passingScore: 60
  });
  const [settingsForm] = Form.useForm();

  useEffect(() => {
    fetchQuestions();
    fetchExamSettings();

    // 定时刷新题库状态
    const timer = setInterval(() => {
      fetchQuestions();
    }, 5000);
    
    return () => clearInterval(timer);
  }, []);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      console.log('开始获取题库数据...');
      const response = await axios.get('http://localhost:8000/api/questions');
      console.log('获取题库响应:', response.data);
      
      let questionsData = [];
      let questionsCount = 0;
      
      // 处理新的API响应格式
      if (response.data && response.data.success) {
        questionsData = response.data.questions || [];
        questionsCount = response.data.total || questionsData.length;
        console.log(`新API格式: 收到${questionsCount}道题目`);
      } else if (Array.isArray(response.data)) {
        // 兼容旧格式
        questionsData = response.data;
        questionsCount = response.data.length;
        console.log(`旧API格式: 收到${questionsCount}道题目`);
      } else {
        console.warn('获取题库失败: 无法解析API响应', response.data);
      }
      
      if (questionsCount > 0) {
        // 格式化题目数据，确保每个题目都有id属性
        const formattedQuestions = questionsData.map((q: any) => {
          console.log('处理题目:', q);
          return {
            ...q,
            id: q.id || q._id  // 确保使用正确的ID
          };
        });
        
        console.log('格式化后的题库数据样本:', formattedQuestions.slice(0, 2));
        
        // 明确设置状态
        setQuestions(formattedQuestions);
        setTotalQuestions(questionsCount);
        console.log('已更新题库总数状态:', questionsCount);
        
        // 更新表单中的题目数上限
        if (settingsForm && questionsCount > 0) {
          const currentValues = settingsForm.getFieldsValue();
          settingsForm.setFieldsValue({
            ...currentValues,
            customQuestionCount: Math.min(currentValues.customQuestionCount || 10, questionsCount)
          });
          console.log('已更新设置表单中的题目数量上限');
        }
      } else {
        console.warn('题库中没有题目，请上传题目');
        setQuestions([]);
        setTotalQuestions(0);
      }
    } catch (error) {
      console.error('获取题目失败:', error);
      message.error('获取题目失败');
      setQuestions([]);
      setTotalQuestions(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchExamSettings = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/exam-settings');
      console.log('获取考试设置:', response.data);
      if (response.data) {
        // 确保所有数值都是数字类型
        const formattedSettings = {
          ...response.data,
          customQuestionCount: parseInt(response.data.customQuestionCount) || 10,
          examDuration: parseInt(response.data.examDuration) || 60,
          passingScore: parseInt(response.data.passingScore) || 60
        };
        console.log('格式化后的考试设置:', formattedSettings);
        setExamSettings(formattedSettings);
        settingsForm.setFieldsValue(formattedSettings);
      }
    } catch (error) {
      console.error('获取考试设置失败:', error);
    }
  };

  const saveExamSettings = async (values: any) => {
    try {
      setLoading(true);
      console.log('保存考试设置:', values);
      
      // 确保所有值都是数字
      const validatedValues = {
        ...values,
        customQuestionCount: parseInt(values.customQuestionCount),
        examDuration: parseInt(values.examDuration),
        passingScore: parseInt(values.passingScore)
      };
      
      console.log('验证后的考试设置:', validatedValues);
      
      const response = await axios.post('http://localhost:8000/api/exam-settings', validatedValues);
      if (response.data.success) {
        message.success('保存考试设置成功');
        setExamSettings(validatedValues);
        console.log('考试设置保存成功:', response.data);
        // 刷新设置
        fetchExamSettings();
      } else {
        message.error('保存考试设置失败');
      }
    } catch (error) {
      console.error('保存考试设置错误:', error);
      message.error('保存考试设置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = () => {
    setEditingQuestion(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    form.setFieldsValue(question);
    setModalVisible(true);
  };

  const handleDeleteQuestion = async (id: number) => {
    try {
      await api.delete(`/api/admin/questions/${id}`);
      message.success('删除成功');
      fetchQuestions();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingQuestion) {
        await api.put(`/api/admin/questions/${editingQuestion.id}`, values);
        message.success('更新成功');
      } else {
        await api.post('/api/admin/questions', values);
        message.success('添加成功');
      }
      setModalVisible(false);
      fetchQuestions();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const columns = [
    {
      title: '题目',
      dataIndex: 'question',
      key: 'question',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => type === 'single' ? '单选题' : '多选题',
    },
    {
      title: '选项',
      dataIndex: 'options',
      key: 'options',
      render: (options: string[]) => options.join(', '),
    },
    {
      title: '正确答案',
      dataIndex: 'correctAnswer',
      key: 'correctAnswer',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Question) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditQuestion(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteQuestion(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Tabs defaultActiveKey="1">
        <TabPane tab="题库管理" key="1">
          <Card
            style={{
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              borderRadius: '8px'
            }}
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
                  题库管理
                  <span style={{ 
                    marginLeft: '10px', 
                    padding: '4px 12px', 
                    background: '#1890ff', 
                    color: 'white', 
                    borderRadius: '12px',
                    fontSize: '14px'
                  }}>
                    {totalQuestions} 题
                  </span>
                </span>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAddQuestion}
                  style={{ borderRadius: '4px' }}
                >
                  添加题目
                </Button>
              </div>
            }
          >
            <Table
              columns={columns}
              dataSource={questions}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
              style={{ marginTop: '16px' }}
            />
          </Card>
        </TabPane>
        <TabPane tab="考试设置" key="2">
          <Card 
            title="考试设置" 
            style={{
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              borderRadius: '8px'
            }}
          >
            <Form
              form={settingsForm}
              layout="vertical"
              onFinish={saveExamSettings}
              initialValues={examSettings}
              style={{ maxWidth: '600px', margin: '0 auto' }}
            >
              <Form.Item
                name="questionMode"
                label="出题模式"
                rules={[{ required: true }]}
              >
                <Select>
                  <Select.Option value="all">全部题目</Select.Option>
                  <Select.Option value="random">随机抽取</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="customQuestionCount"
                label="题目数量"
                rules={[{ required: true }]}
                dependencies={['questionMode']}
              >
                <Input type="number" min={1} max={totalQuestions} addonAfter="题" />
              </Form.Item>

              <Form.Item
                name="examDuration"
                label="考试时间（分钟）"
                rules={[{ required: true }]}
              >
                <Input type="number" min={1} addonAfter="分钟" />
              </Form.Item>

              <Form.Item
                name="passingScore"
                label="及格分数"
                rules={[{ required: true }]}
              >
                <Input type="number" min={0} max={100} addonAfter="分" />
              </Form.Item>

              <Form.Item>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={loading}
                  style={{ 
                    width: '100%', 
                    marginTop: '16px',
                    height: '40px',
                    borderRadius: '4px'
                  }}
                >
                  保存设置
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>
      </Tabs>

      <Modal
        title={editingQuestion ? '编辑题目' : '添加题目'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="question"
            label="题目"
            rules={[{ required: true, message: '请输入题目' }]}
          >
            <Input.TextArea rows={4} />
          </Form.Item>

          <Form.Item
            name="type"
            label="类型"
            rules={[{ required: true, message: '请选择题目类型' }]}
          >
            <Select>
              <Option value="single">单选题</Option>
              <Option value="multiple">多选题</Option>
            </Select>
          </Form.Item>

          <Form.List
            name="options"
          >
            {(fields, { add, remove }) => (
              <>
                {fields.map((field, index) => (
                  <Form.Item
                    label={index === 0 ? '选项' : ''}
                    required={false}
                    key={field.key}
                  >
                    <Form.Item
                      {...field}
                      validateTrigger={['onChange', 'onBlur']}
                      rules={[
                        {
                          required: true,
                          whitespace: true,
                          message: '请输入选项内容或删除此选项',
                        },
                      ]}
                      noStyle
                    >
                      <Input
                        placeholder={`选项 ${String.fromCharCode(65 + index)}`}
                        style={{ width: '90%' }}
                      />
                    </Form.Item>
                    {fields.length > 2 && (
                      <Button
                        type="link"
                        onClick={() => remove(field.name)}
                        style={{ marginLeft: 8 }}
                      >
                        删除
                      </Button>
                    )}
                  </Form.Item>
                ))}
                <Form.Item>
                  <Button
                    type="dashed"
                    onClick={() => add()}
                    icon={<PlusOutlined />}
                    disabled={fields.length >= 6}
                  >
                    添加选项
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <Form.Item
            name="correctAnswer"
            label="正确答案"
            rules={[{ required: true, message: '请输入正确答案' }]}
          >
            <Input placeholder="单选题输入单个字母，多选题输入多个字母（如：ABC）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminDashboard; 