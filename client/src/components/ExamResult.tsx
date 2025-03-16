import React from 'react';
import { Card, Typography, Button, Space, Progress, Row, Col, Statistic } from 'antd';
import { TrophyOutlined, RedoOutlined, HomeOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface ExamResultProps {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  onRetry?: () => void;
  onHome?: () => void;
}

const ExamResult: React.FC<ExamResultProps> = ({
  score,
  totalQuestions,
  correctAnswers,
  onRetry,
  onHome
}) => {
  const passScore = 60; // 及格分数
  const isPassed = score >= passScore;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      <Card 
        style={{ 
          borderRadius: '12px', 
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div 
          style={{ 
            textAlign: 'center', 
            padding: '24px 0',
            background: isPassed ? 'linear-gradient(135deg, #52c41a 0%, #1890ff 100%)' : 'linear-gradient(135deg, #ff4d4f 0%, #ff7a45 100%)',
            margin: '-24px -24px 24px',
            color: 'white'
          }}
        >
          <TrophyOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
          <Title level={2} style={{ color: 'white', margin: 0 }}>考试结果</Title>
          <Text style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '16px' }}>
            {isPassed ? '恭喜您通过了考试！' : '很遗憾，您未通过考试。'}
          </Text>
        </div>

        <Row gutter={[24, 24]} justify="center">
          <Col xs={24} md={8}>
            <Card bordered={false} style={{ textAlign: 'center' }}>
              <Statistic
                title="得分"
                value={score}
                suffix="分"
                valueStyle={{ 
                  color: isPassed ? '#52c41a' : '#ff4d4f',
                  fontSize: '36px',
                  fontWeight: 'bold'
                }}
                prefix={<TrophyOutlined />}
              />
            </Card>
          </Col>
          
          <Col xs={24} md={8}>
            <Card bordered={false} style={{ textAlign: 'center' }}>
              <Statistic
                title="正确题数"
                value={correctAnswers}
                suffix={`/ ${totalQuestions}`}
                valueStyle={{ color: '#1890ff', fontSize: '36px', fontWeight: 'bold' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          
          <Col xs={24} md={8}>
            <Card bordered={false} style={{ textAlign: 'center' }}>
              <Statistic
                title="正确率"
                value={totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0}
                suffix="%"
                valueStyle={{ 
                  color: totalQuestions > 0 && (correctAnswers / totalQuestions) >= 0.6 ? '#52c41a' : '#ff4d4f',
                  fontSize: '36px',
                  fontWeight: 'bold'
                }}
              />
            </Card>
          </Col>
        </Row>

        <div style={{ margin: '32px 0 16px', textAlign: 'center' }}>
          <Progress 
            type="circle" 
            percent={score} 
            format={() => `${score}分`}
            strokeColor={isPassed ? '#52c41a' : '#ff4d4f'}
            width={120}
          />
        </div>

        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <Space size="large">
            <Button 
              type="primary" 
              icon={<RedoOutlined />} 
              onClick={onRetry}
              size="large"
              style={{ borderRadius: '6px' }}
            >
              重新考试
            </Button>
            <Button 
              icon={<HomeOutlined />} 
              onClick={onHome}
              size="large"
              style={{ borderRadius: '6px' }}
            >
              返回首页
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default ExamResult; 