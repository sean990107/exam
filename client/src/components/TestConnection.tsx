import React, { useState, useEffect } from 'react';
import { Button, Card, Alert, Space } from 'antd';
import api from '../api';

const TestConnection: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const testConnection = async () => {
    try {
      setStatus('loading');
      setMessage('正在测试连接...');
      
      const response = await api.get('/');
      
      setStatus('success');
      setMessage(`连接成功: ${JSON.stringify(response.data)}`);
    } catch (error: any) {
      setStatus('error');
      setMessage(`连接失败: ${error.message}`);
      console.error('连接测试错误:', error);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <Card title="后端连接测试">
      <Space direction="vertical" style={{ width: '100%' }}>
        {status === 'loading' && <Alert message={message} type="info" />}
        {status === 'success' && <Alert message={message} type="success" />}
        {status === 'error' && <Alert message={message} type="error" />}
        
        <Button 
          type="primary" 
          onClick={testConnection} 
          loading={status === 'loading'}
        >
          重新测试连接
        </Button>
      </Space>
    </Card>
  );
};

export default TestConnection; 