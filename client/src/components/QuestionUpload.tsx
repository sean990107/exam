import React, { useState, useEffect } from 'react';
import { Upload, Button, Card, message, Typography, Alert, Table, Modal, Radio, Space, Input, Form, Popconfirm } from 'antd';
import { EyeOutlined, UploadOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import type { UploadProps, UploadFile } from 'antd';
import api from '../api';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  type?: 'single' | 'multiple';
}

interface QuestionUploadProps {
  userId: string;
}

const QuestionUpload: React.FC<QuestionUploadProps> = ({ userId }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{success: boolean; message: string; count?: number} | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [uploadMode, setUploadMode] = useState<'append' | 'overwrite'>('append');
  const [messageApi, contextHolder] = message.useMessage();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [clearModalVisible, setClearModalVisible] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [clearLoading, setClearLoading] = useState(false);
  const [hasHeader, setHasHeader] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [form] = Form.useForm();
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchQuestions();
  }, []);

  useEffect(() => {
    if (currentQuestion && editModalVisible) {
      form.setFieldsValue({
        question: currentQuestion.question,
        optionA: currentQuestion.options[0] || '',
        optionB: currentQuestion.options[1] || '',
        optionC: currentQuestion.options[2] || '',
        optionD: currentQuestion.options[3] || '',
        correctAnswer: currentQuestion.correctAnswer
      });
    }
  }, [currentQuestion, editModalVisible, form]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/questions');
      console.log('获取题库数据:', response.data);
      
      // 适配新的API响应格式
      if (response.data && response.data.success) {
        const questionsData = response.data.questions || [];
        setQuestions(questionsData);
        console.log(`成功获取 ${questionsData.length} 道题目`);
      } else if (Array.isArray(response.data)) {
        // 兼容旧格式
        setQuestions(response.data);
        console.log(`成功获取 ${response.data.length} 道题目（旧格式）`);
      } else {
        console.warn('获取题库失败，API返回格式不正确:', response.data);
        setQuestions([]);
      }
    } catch (error) {
      messageApi.error('获取题目失败');
      console.error('获取题库出错:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (options: any) => {
    const { file, onSuccess, onError, onProgress } = options;
    
    // 检查文件类型
    const isExcel = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');
    if (!isExcel) {
      messageApi.error('只支持Excel文件格式(.xlsx或.xls)');
      onError(new Error('只支持Excel文件格式(.xlsx或.xls)'));
      return;
    }
    
    // 检查文件大小
    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      messageApi.error('文件大小不能超过10MB');
      onError(new Error('文件大小不能超过10MB'));
      return;
    }
    
    setUploading(true);
    
    // 创建FormData对象
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', uploadMode);
    formData.append('hasHeader', hasHeader.toString());
    
    try {
      // 发送请求
      const response = await api.post('/api/questions/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          onProgress({ percent });
        }
      });
      
      // 处理成功响应
      if (response.data && response.data.success) {
        // 如果有count和total字段，使用它们，否则使用message字段
        const displayMessage = response.data.count !== undefined 
          ? `成功导入 ${response.data.count} 道题目，题库共有 ${response.data.total} 道题目`
          : response.data.message;
          
        setUploadResult({
          success: true,
          message: displayMessage,
          count: response.data.count
        });
        messageApi.success('上传成功');
        fetchQuestions();
        onSuccess(response.data);
      } else {
        const errorMsg = response.data ? response.data.message : '上传失败';
        setUploadResult({
          success: false,
          message: errorMsg
        });
        messageApi.error(errorMsg);
        onError(new Error(errorMsg));
      }
    } catch (error: any) {
      console.error('上传错误:', error);
      
      // 先获取当前题目数量
      const beforeCount = questions.length;
      
      // 刷新题目列表
      try {
        await fetchQuestions();
        
        // 检查题目数量是否增加
        if (questions.length > beforeCount) {
          // 题目数量增加，说明实际上导入成功了
          const importedCount = questions.length - beforeCount;
          const successMessage = `成功导入 ${importedCount} 道题目，题库共有 ${questions.length} 道题目`;
          
          setUploadResult({
            success: true,
            message: successMessage + '（系统报错但实际成功导入）',
            count: importedCount
          });
          
          messageApi.success('实际已成功导入题目');
          onSuccess({ success: true });
          return;
        }
      } catch (e) {
        // 忽略获取题目列表的错误
      }
      
      // 如果没有检测到题目增加，则显示错误
      const errorMsg = error.response?.data?.message || '上传失败，请检查文件格式或网络连接';
      setUploadResult({
        success: false,
        message: errorMsg
      });
      messageApi.error(errorMsg);
      onError(new Error(errorMsg));
    } finally {
      setUploading(false);
      setFileList([]);
      
      // 无论如何都刷新题目列表
      setTimeout(() => {
        fetchQuestions();
      }, 500);
    }
  };

  const handleClearQuestions = async () => {
    if (!adminPassword) {
      messageApi.error('请输入管理员密码');
      return;
    }
    
    setClearLoading(true);
    try {
      const response = await api.post('/api/questions/clear', { 
        password: adminPassword 
      });
      
      if (response.data && response.data.success) {
        messageApi.success('题库已清空');
        setClearModalVisible(false);
        setAdminPassword('');
        fetchQuestions();
      } else {
        messageApi.error(response.data?.message || '操作失败');
      }
    } catch (error: any) {
      messageApi.error(error.response?.data?.message || '清空题库失败，请检查密码是否正确');
    } finally {
      setClearLoading(false);
    }
  };

  const handleEditQuestion = (record: Question) => {
    setCurrentQuestion(record);
    setEditModalVisible(true);
  };

  const handleDeleteQuestion = async (id: string) => {
    try {
      setDeleteLoading(id);
      const response = await api.delete(`/api/questions/${id}`);
      
      if (response.data && response.data.success) {
        messageApi.success('删除题目成功');
        fetchQuestions();
      } else {
        messageApi.error(response.data?.message || '删除失败');
      }
    } catch (error) {
      messageApi.error('删除题目失败');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleSaveQuestion = async () => {
    try {
      const values = await form.validateFields();
      
      if (!currentQuestion) return;
      
      const options = [
        values.optionA,
        values.optionB,
        values.optionC,
        values.optionD
      ].filter(Boolean);
      
      // 判断是单选还是多选
      const type = values.correctAnswer.length > 1 ? 'multiple' : 'single';
      
      const updatedQuestion = {
        id: currentQuestion.id,
        question: values.question,
        options,
        correctAnswer: values.correctAnswer,
        type
      };
      
      const response = await api.put(`/api/questions/${currentQuestion.id}`, updatedQuestion);
      
      if (response.data && response.data.success) {
        messageApi.success('题目更新成功');
        setEditModalVisible(false);
        fetchQuestions();
      } else {
        messageApi.error(response.data?.message || '更新失败');
      }
    } catch (error) {
      messageApi.error('保存题目失败');
    }
  };

  const columns = [
    {
      title: '题目',
      dataIndex: 'question',
      key: 'question',
      ellipsis: true,
      width: '35%',
    },
    {
      title: '选项A',
      dataIndex: ['options', 0],
      key: 'optionA',
      ellipsis: true,
      width: '15%',
    },
    {
      title: '选项B',
      dataIndex: ['options', 1],
      key: 'optionB',
      ellipsis: true,
      width: '15%',
    },
    {
      title: '答案',
      dataIndex: 'correctAnswer',
      key: 'answer',
      width: '10%',
    },
    {
      title: '操作',
      key: 'action',
      width: '15%',
      render: (_: any, record: Question) => (
        <Space size="small">
          <Button 
            type="link" 
            icon={<EditOutlined />} 
            size="small" 
            onClick={() => handleEditQuestion(record)}
            style={{ color: '#1890ff', padding: '0 8px' }}
          />
          <Popconfirm
            title="确认删除"
            description="确定要删除这道题目吗？"
            onConfirm={() => handleDeleteQuestion(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button 
              type="link" 
              danger 
              icon={<DeleteOutlined />} 
              size="small"
              loading={deleteLoading === record.id}
              style={{ padding: '0 8px' }}
            />
          </Popconfirm>
        </Space>
      ),
    }
  ];

  return (
    <Card title="题库管理" style={{ marginBottom: 20 }}>
      {contextHolder}
      <Title level={4}>上传题库</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        请上传Excel文件，格式要求：第一列为题干，第二到五列为选项A-D，第六列为正确答案(如"A"或"BCD")
      </Text>
      
      {uploadResult && (
        <Alert
          message={uploadResult.success ? "上传成功" : "上传失败"}
          description={uploadResult.message}
          type={uploadResult.success ? "success" : "error"}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Radio.Group value={uploadMode} onChange={e => setUploadMode(e.target.value)}>
          <Radio.Button value="append">追加题目</Radio.Button>
          <Radio.Button value="overwrite">覆盖题库</Radio.Button>
        </Radio.Group>
        
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <input 
            type="checkbox" 
            checked={hasHeader} 
            onChange={e => setHasHeader(e.target.checked)} 
            id="has-header" 
            style={{ marginRight: 8 }}
          />
          <label htmlFor="has-header">Excel文件包含表头行</label>
        </div>
        
        <Upload
          customRequest={options => {
            const formData = new FormData();
            formData.append('file', options.file);
            formData.append('mode', uploadMode);
            formData.append('hasHeader', hasHeader.toString());
            
            handleUpload({
              ...options,
              data: formData
            });
          }}
          fileList={fileList}
          onChange={({ fileList }) => setFileList(fileList)}
          accept=".xlsx,.xls"
          maxCount={1}
          disabled={uploading}
          showUploadList={{ showRemoveIcon: !uploading }}
        >
          <Button 
            type="primary" 
            icon={<UploadOutlined />} 
            loading={uploading}
            disabled={uploading}
          >
            {uploading ? '正在上传...' : '上传Excel题库'}
          </Button>
        </Upload>
      </Space>

      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>当前题库</Title>
        <Space>
          <Button 
            type="primary" 
            icon={<EyeOutlined />} 
            onClick={() => setPreviewVisible(true)}
            disabled={questions.length === 0}
          >
            题库预览
          </Button>
          <Button 
            danger
            type="primary" 
            icon={<DeleteOutlined />} 
            onClick={() => setClearModalVisible(true)}
          >
            清空题库
          </Button>
        </Space>
      </div>
      <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
        题库中共有 {questions.length} 道题目
      </Text>

      <Modal
        title="题库预览"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        width={1000}
      >
        <Table
          dataSource={questions}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          loading={loading}
          scroll={{ x: 800 }}
        />
      </Modal>
      
      <Modal
        title="清空题库确认"
        open={clearModalVisible}
        onCancel={() => {
          setClearModalVisible(false);
          setAdminPassword('');
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setClearModalVisible(false);
            setAdminPassword('');
          }}>
            取消
          </Button>,
          <Button 
            key="clear" 
            type="primary" 
            danger 
            loading={clearLoading}
            onClick={handleClearQuestions}
          >
            确认清空
          </Button>
        ]}
      >
        <p>此操作将删除题库中的所有题目，无法恢复！</p>
        <p>请输入管理员密码进行确认：</p>
        <Input.Password 
          placeholder="请输入管理员密码" 
          value={adminPassword} 
          onChange={e => setAdminPassword(e.target.value)}
          style={{ marginTop: 8 }}
        />
      </Modal>

      <Modal
        title="编辑题目"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          form.resetFields();
        }}
        onOk={handleSaveQuestion}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="question"
            label="题目"
            rules={[{ required: true, message: '请输入题目' }]}
          >
            <TextArea rows={3} placeholder="请输入题目内容" />
          </Form.Item>
          
          <Form.Item
            name="optionA"
            label="选项A"
            rules={[{ required: true, message: '请输入选项A' }]}
          >
            <Input placeholder="请输入选项A" />
          </Form.Item>
          
          <Form.Item
            name="optionB"
            label="选项B"
            rules={[{ required: true, message: '请输入选项B' }]}
          >
            <Input placeholder="请输入选项B" />
          </Form.Item>
          
          <Form.Item
            name="optionC"
            label="选项C"
          >
            <Input placeholder="请输入选项C（可选）" />
          </Form.Item>
          
          <Form.Item
            name="optionD"
            label="选项D"
          >
            <Input placeholder="请输入选项D（可选）" />
          </Form.Item>
          
          <Form.Item
            name="correctAnswer"
            label="正确答案"
            rules={[{ required: true, message: '请输入正确答案' }]}
            extra="单选题填写单个选项（如A），多选题填写多个选项（如ABC）"
          >
            <Input placeholder="请输入正确答案，如A或BCD" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default QuestionUpload; 