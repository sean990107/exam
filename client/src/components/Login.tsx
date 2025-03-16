import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Select, Card, message } from 'antd';
import { UserOutlined, TeamOutlined, CrownOutlined, LockOutlined } from '@ant-design/icons';
import api from '../api';

const { Option } = Select;

interface LoginProps {
  onLoginSuccess: (userData: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 576);

  const departments = [
    '综合管理部',
    '项目拓展部',
    '运营管理部'
  ];

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 576);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const onFinish = async (values: any) => {
    try {
      setLoading(true);
      // 如果是管理员模式，使用固定的管理员账号和输入的密码
      const loginData = isAdminMode ? {
        name: 'xyfgs',
        department: '管理部门',
        password: values.password
      } : {
        name: values.name,
        department: values.department
      };

      const response = await api.post('/api/login', loginData);

      if (response.data && response.data.user) {
        message.success('登录成功');
        // 确保传递isAdmin字段
        const userData = {
          ...response.data.user,
          isAdmin: response.data.isAdmin // 从响应中获取isAdmin
        };
        console.log('用户数据:', userData); // 添加日志，查看传递的用户数据
        onLoginSuccess(userData);
      } else {
        message.error('登录失败，请重试');
      }
    } catch (error: any) {
      console.error('登录错误:', error);
      message.error(error.response?.data?.message || '登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}>
      <Card 
        style={{ 
          width: isMobile ? '90%' : '400px',
          maxWidth: isMobile ? '350px' : 'none',
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
          borderRadius: '8px',
          overflow: 'hidden'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', margin: '0 0 8px 0' }}>
            {isAdminMode ? "管理员登录" : (
              <>
                <div>陕西农业发展集团</div>
                <div>咸阳分公司考试系统</div>
              </>
            )}
          </h2>
          <Button
            type="link"
            size="small"
            onClick={() => setIsAdminMode(!isAdminMode)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              fontSize: '12px',
              padding: '0 4px'
            }}
          >
            <CrownOutlined style={{ marginRight: '4px' }} />
            {isAdminMode ? '普通登录' : '管理员入口'}
          </Button>
        </div>
        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          layout="vertical"
          style={{ maxWidth: '400px', width: '100%' }}
        >
          {!isAdminMode ? (
            <>
              <Form.Item
                name="name"
                rules={[{ required: true, message: '请输入您的姓名!' }]}
              >
                <Input 
                  prefix={<UserOutlined />} 
                  placeholder="姓名" 
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="department"
                rules={[{ required: true, message: '请选择您的部门!' }]}
              >
                <Select
                  placeholder="选择部门"
                  size="large"
                  prefix={<TeamOutlined />}
                >
                  {departments.map(dept => (
                    <Option key={dept} value={dept}>{dept}</Option>
                  ))}
                </Select>
              </Form.Item>
            </>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <CrownOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
                <p>请输入管理员密码</p>
              </div>
              <Form.Item
                name="password"
                rules={[{ required: true, message: '请输入管理员密码!' }]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="管理员密码"
                  size="large"
                />
              </Form.Item>
            </>
          )}

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              size="large" 
              block
              loading={loading}
            >
              {isAdminMode ? '管理员登录' : '登录'}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login; 