import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// 用户接口
interface User {
  id: string;
  name: string;
  password?: string;  // 添加可选的密码字段
  department: string;
  isAdmin: boolean;
  createdAt: number;
}

// 本地数据文件路径
const usersFilePath = path.join(__dirname, '..', 'data', 'users.json');

// 初始化用户文件（如果不存在）
if (!fs.existsSync(usersFilePath)) {
  // 创建默认管理员用户
  const defaultAdmin: User = {
    id: 'admin',
    name: 'xyfgs',
    password: '123456',  // 添加管理员密码
    department: '管理部门',
    isAdmin: true,
    createdAt: Date.now()
  };
  
  fs.writeFileSync(usersFilePath, JSON.stringify([defaultAdmin], null, 2), 'utf8');
}

// 获取所有用户
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
    // 返回用户信息时删除密码字段
    const safeUsers = users.map((user: User) => {
      const { password, ...safeUser } = user;
      return safeUser;
    });
    res.json(safeUsers);
  } catch (error) {
    next(error);
  }
});

// 用户登录/注册
router.post('/login', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, department, password } = req.body;
    
    if (!name || !department) {
      return res.status(400).json({ message: '姓名和部门不能为空' });
    }
    
    // 读取现有用户
    let users: User[] = [];
    try {
      users = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
    } catch (error) {
      users = [];
    }
    
    // 检查是否是管理员登录
    if (name === 'xyfgs') {
      const adminUser = users.find(u => u.name === 'xyfgs' && u.isAdmin);
      if (!adminUser || adminUser.password !== password) {
        return res.status(401).json({ message: '管理员密码错误' });
      }
      const { password: _, ...safeAdminUser } = adminUser;
      return res.json({
        message: '管理员登录成功',
        user: safeAdminUser
      });
    }
    
    // 普通用户登录逻辑
    let user = users.find(u => u.name === name && u.department === department);
    
    // 如果用户不存在，创建新用户
    if (!user) {
      user = {
        id: `user_${Date.now()}`,
        name,
        department,
        isAdmin: false,
        createdAt: Date.now()
      };
      
      users.push(user);
      fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2), 'utf8');
    }
    
    // 返回用户信息时删除密码字段
    const { password: _, ...safeUser } = user;
    res.json({
      message: '登录成功',
      user: safeUser
    });
  } catch (error) {
    next(error);
  }
});

// 获取考试设置
router.get('/settings', (req: Request, res: Response, next: NextFunction) => {
  try {
    const settingsPath = path.join(__dirname, '..', 'data', 'settings.json');
    
    // 如果设置文件不存在，创建默认设置
    if (!fs.existsSync(settingsPath)) {
      const defaultSettings = {
        questionCount: 0, // 0表示全部题目
        lastUpdated: Date.now()
      };
      
      fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2), 'utf8');
      return res.json(defaultSettings);
    }
    
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    res.json(settings);
  } catch (error) {
    next(error);
  }
});

// 更新考试设置（仅管理员）
router.post('/settings', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, questionCount } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: '用户ID不能为空' });
    }
    
    // 验证用户是否为管理员
    const users = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
    const user = users.find((u: User) => u.id === userId);
    
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: '只有管理员可以更新设置' });
    }
    
    const settingsPath = path.join(__dirname, '..', 'data', 'settings.json');
    
    const settings = {
      questionCount: questionCount || 0,
      lastUpdated: Date.now()
    };
    
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    
    res.json({
      message: '设置更新成功',
      settings
    });
  } catch (error) {
    next(error);
  }
});

export default router; 