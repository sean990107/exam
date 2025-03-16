import React, { useState, useEffect } from 'react';
import { Layout, Menu, Typography, Divider, ConfigProvider, theme, Row, Col, Button, Drawer, message, App as AntdApp } from 'antd';
import { UserOutlined, FileOutlined, SettingOutlined, BarChartOutlined, MenuOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import zhCN from 'antd/lib/locale/zh_CN';
import { BrowserRouter } from 'react-router-dom';

// 导入组件
import Login from './components/Login';
import QuestionUpload from './components/QuestionUpload';
import ExamSettings from './components/ExamSettings';
import Exam from './components/Exam';
import ExamResults from './components/ExamResults';
import AdminDashboard from './components/AdminDashboard';

import './App.css';

const { Header, Content, Sider } = Layout;
const { Title } = Typography;

interface User {
  id: number;
  name: string;
  department: string;
  isAdmin: boolean;
}

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeMenu, setActiveMenu] = useState<string>('exam');
  const [isMobile, setIsMobile] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  // 检测是否为移动设备
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 从本地存储获取用户信息
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        console.log('从本地存储获取用户数据:', userData);
      } catch (error) {
        console.error('解析用户数据出错:', error);
        localStorage.removeItem('user');
      }
    }
  }, []);

  const handleLoginSuccess = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    setActiveMenu(userData.isAdmin ? 'questions' : 'exam');
  };

  const renderContent = () => {
    if (!user) {
      return <Login onLoginSuccess={handleLoginSuccess} />;
    }

    switch (activeMenu) {
      case 'questions':
        return <QuestionUpload userId={String(user.id)} />;
      case 'settings':
        return <ExamSettings userId={String(user.id)} isAdmin={user.isAdmin} />;
      case 'results':
        console.log('渲染考试结果组件，isAdmin:', user.isAdmin);
        return <ExamResults isAdmin={user.isAdmin} />;
      case 'exam':
      default:
        return <Exam user={{
          name: user.name,
          department: user.department,
          isAdmin: user.isAdmin
        }} />;
    }
  };

  const handleMenuClick = (key: string) => {
    console.log('Menu clicked:', key);
    setActiveMenu(key);
    if (isMobile) {
      setDrawerVisible(false);
    }
  };

  const menuItems: MenuProps['items'] = [
    ...(user?.isAdmin ? [
      {
        key: 'questions',
        icon: <FileOutlined />,
        label: '题库管理'
      },
      {
        key: 'settings',
        icon: <SettingOutlined />,
        label: '考试设置'
      },
      {
        key: 'results',
        icon: <BarChartOutlined />,
        label: '考试结果分析'
      },
      {
        type: 'divider' as const
      }
    ] : []),
    {
      key: 'exam',
      icon: <FileOutlined />,
      label: '开始考试'
    }
  ];

  const renderMenu = () => (
    <Menu
      mode={isMobile ? "vertical" : "inline"}
      selectedKeys={[activeMenu]}
      style={{ height: '100%', borderRight: 0 }}
      onClick={({ key }) => handleMenuClick(key)}
      items={menuItems}
    />
  );

  // 如果用户未登录，直接显示登录界面
  if (!user) {
    return (
      <BrowserRouter>
        <ConfigProvider locale={zhCN} theme={{ 
          algorithm: theme.defaultAlgorithm,
          token: {
            colorBgBase: '#ffffff',
            colorTextBase: '#000000',
          }
        }}>
          <AntdApp>
            {contextHolder}
            <div className="app">
              {renderContent()}
            </div>
          </AntdApp>
        </ConfigProvider>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <ConfigProvider
        locale={zhCN}
        theme={{
          algorithm: theme.defaultAlgorithm,
          token: {
            colorPrimary: '#1890ff',
          },
        }}
      >
        <AntdApp>
          {contextHolder}
          <Layout className="app-layout">
            <Header style={{ background: '#fff', padding: '0 20px', borderBottom: '1px solid #f0f0f0' }}>
              <Row justify="space-between" align="middle">
                <Col>
                  {isMobile && (
                    <Button
                      type="text"
                      icon={<MenuOutlined />}
                      onClick={() => setDrawerVisible(true)}
                      style={{ marginRight: '10px' }}
                    />
                  )}
                  <Title level={isMobile ? 4 : 3} style={{ margin: '0', display: 'inline-block' }}>
                    陕西农业发展集团咸阳分公司考试系统
                  </Title>
                </Col>
                <div className="user-info" style={{ fontSize: isMobile ? '12px' : '14px' }}>
                  <UserOutlined style={{ marginRight: 8 }} />
                  {user.name} - {user.department} {user.isAdmin && '(管理员)'}
                </div>
              </Row>
            </Header>
            <Layout>
              {!isMobile && (
                <Sider width={200} className="app-sider">
                  {renderMenu()}
                </Sider>
              )}
              {isMobile && (
                <Drawer
                  title="菜单"
                  placement="left"
                  onClose={() => setDrawerVisible(false)}
                  open={drawerVisible}
                  bodyStyle={{ padding: 0 }}
                >
                  {renderMenu()}
                </Drawer>
              )}
              <Layout style={{ padding: isMobile ? '8px' : '24px' }}>
                <Content
                  className="app-content"
                  style={{
                    padding: isMobile ? 8 : 24,
                    margin: 0,
                    minHeight: 280,
                    background: '#fff',
                    borderRadius: '4px',
                  }}
                >
                  {renderContent()}
                </Content>
              </Layout>
            </Layout>
          </Layout>
        </AntdApp>
      </ConfigProvider>
    </BrowserRouter>
  );
};

export default App;
