import React from 'react';
import { Modal } from 'antd';
import styled from 'styled-components';

const StyledModal = styled(Modal)`
  .ant-modal-content {
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  }
  
  .ant-modal-header {
    border-radius: 12px 12px 0 0;
    padding: 20px 24px;
    border-bottom: 1px solid #f0f0f0;
  }
  
  .ant-modal-body {
    padding: 24px;
    font-size: 16px;
    text-align: center;
  }
  
  .ant-modal-footer {
    padding: 16px 24px;
    border-top: 1px solid #f0f0f0;
  }
  
  .ant-btn {
    height: 40px;
    padding: 0 24px;
    font-size: 16px;
    border-radius: 6px;
  }
  
  .ant-btn-primary {
    background: #1890ff;
    border-color: #1890ff;
    
    &:hover {
      background: #40a9ff;
      border-color: #40a9ff;
    }
  }
`;

interface CustomModalProps {
  visible: boolean;
  title: string;
  content: string;
  onOk: () => void;
  onCancel: () => void;
  okText?: string;
  cancelText?: string;
}

const CustomModal: React.FC<CustomModalProps> = ({
  visible,
  title,
  content,
  onOk,
  onCancel,
  okText = '确定',
  cancelText = '取消'
}) => {
  return (
    <StyledModal
      title={title}
      open={visible}
      onOk={onOk}
      onCancel={onCancel}
      okText={okText}
      cancelText={cancelText}
      centered
      maskClosable={false}
      width={360}
    >
      {content}
    </StyledModal>
  );
};

export default CustomModal; 