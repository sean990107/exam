import React, { useEffect, useState } from 'react';
import { Card, Form, InputNumber, Button, Radio, Switch, message, Spin, Divider, Typography } from 'antd';
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import api from '../api';

const { Title, Paragraph } = Typography;

interface ExamSettingsProps {
  userId: string;
  isAdmin: boolean;
}

const ExamSettings: React.FC<ExamSettingsProps> = ({ userId, isAdmin }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [examMode, setExamMode] = useState<string>('unlimited');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      // 获取考试设置
      const settingsResponse = await api.get('/api/exam-settings');
      const examSettingsData = settingsResponse.data;

      // 获取答题模式设置
      const examModeResponse = await api.get('/api/settings/exam-mode');
      setExamMode(examModeResponse.data.examMode);

      form.setFieldsValue({
        questionMode: examSettingsData.questionMode || 'all',
        customQuestionCount: examSettingsData.customQuestionCount || 10,
        examDuration: examSettingsData.examDuration || 30,
        passingScore: examSettingsData.passingScore || 60,
        examMode: examModeResponse.data.examMode || 'unlimited'
      });
    } catch (error) {
      console.error('获取设置失败:', error);
      message.error('获取设置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (values: any) => {
    try {
      setLoading(true);
      
      // 保存考试设置
      const examSettings = {
        questionMode: values.questionMode,
        customQuestionCount: values.customQuestionCount,
        examDuration: values.examDuration,
        passingScore: values.passingScore
      };
      
      await api.post('/api/exam-settings', examSettings);
      
      // 保存答题模式设置
      if (values.examMode !== examMode) {
        await api.post('/api/admin/settings', {
          key: 'examMode',
          value: values.examMode
        });
        setExamMode(values.examMode);
      }
      
      message.success('设置保存成功');
    } catch (error) {
      console.error('保存设置失败:', error);
      message.error('保存设置失败');
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <Card>
        <Title level={4}>权限不足</Title>
        <Paragraph>只有管理员可以访问此页面</Paragraph>
      </Card>
    );
  }

  return (
    <Spin spinning={loading}>
      <Card title="考试设置" extra={<Button icon={<ReloadOutlined />} onClick={fetchSettings}>刷新</Button>}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveSettings}
          initialValues={{
            questionMode: 'all',
            customQuestionCount: 10,
            examDuration: 30,
            passingScore: 60,
            examMode: 'unlimited'
          }}
        >
          <Title level={4}>基本设置</Title>
          
          <Form.Item
            name="questionMode"
            label="题目数量模式"
            rules={[{ required: true, message: '请选择题目数量模式' }]}
          >
            <Radio.Group>
              <Radio value="all">全部题目</Radio>
              <Radio value="custom">自定义数量</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.questionMode !== currentValues.questionMode}
          >
            {({ getFieldValue }) => (
              getFieldValue('questionMode') === 'custom' ? (
                <Form.Item
                  name="customQuestionCount"
                  label="题目数量"
                  rules={[{ required: true, message: '请输入题目数量' }]}
                >
                  <InputNumber min={1} max={100} style={{ width: '100%' }} />
                </Form.Item>
              ) : null
            )}
          </Form.Item>

          <Form.Item
            name="examDuration"
            label="考试时长(分钟)"
            rules={[{ required: true, message: '请输入考试时长' }]}
          >
            <InputNumber min={5} max={180} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="passingScore"
            label="及格分数"
            rules={[{ required: true, message: '请输入及格分数' }]}
          >
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
          
          <Divider />
          
          <Title level={4}>答题模式设置</Title>
          <Paragraph type="secondary">
            设置用户是否可以重复参加考试，或者只能参加一次
          </Paragraph>
          
          <Form.Item
            name="examMode"
            label="答题模式"
            rules={[{ required: true, message: '请选择答题模式' }]}
          >
            <Radio.Group>
              <Radio value="unlimited">
                <span>无限制模式</span>
                <Paragraph type="secondary" style={{ marginLeft: '24px' }}>
                  用户可以多次参加考试，系统将保留最新的一次答题数据
                </Paragraph>
              </Radio>
              <Radio value="restricted">
                <span>限制模式</span>
                <Paragraph type="secondary" style={{ marginLeft: '24px' }}>
                  用户只能参加一次考试，再次登录时将显示历史成绩
                </Paragraph>
              </Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={loading}
            >
              保存设置
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </Spin>
  );
};

export default ExamSettings; 