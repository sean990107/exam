# 卡片式考试系统

一个支持电脑和手机端的响应式考试系统，可以通过Excel导入题库，支持单选和多选题型。

## 功能特点

- 响应式设计，同时支持PC和移动端
- 题库Excel导入功能
- 卡片式界面设计
- 管理员可设置题目数量（全部或自定义）
- 实时考试结果分析
- 多部门支持
- 本地数据存储，可迁移至MongoDB

## 技术栈

### 前端
- React.js
- TypeScript
- Ant Design
- Axios

### 后端
- Node.js
- Express.js
- TypeScript
- Multer (文件上传)
- XLSX (Excel处理)

## 项目结构

```
exam-system/
├── client/                # 前端代码
│   ├── public/            # 静态资源
│   └── src/
│       ├── components/    # React组件
│       │   ├── Login.tsx        # 登录组件
│       │   ├── QuestionUpload.tsx  # 题库上传组件
│       │   ├── ExamSettings.tsx # 考试设置组件
│       │   ├── Exam.tsx         # 考试组件
│       │   └── ExamResults.tsx  # 考试结果分析组件
│       ├── App.tsx        # 主应用组件
│       └── index.tsx      # 入口文件
│
└── server/                # 后端代码
    ├── src/
    │   ├── routes/        # API路由
    │   │   ├── questions.ts  # 题目相关API
    │   │   ├── exams.ts      # 考试相关API
    │   │   └── users.ts      # 用户相关API
    │   ├── data/          # 数据存储目录
    │   └── index.ts       # 服务器入口文件
    └── uploads/           # 上传文件临时目录
```

## 使用方法

### 安装依赖

```bash
# 安装前端依赖
cd client
npm install

# 安装后端依赖
cd ../server
npm install
```

### 启动开发服务器

```bash
# 启动前端开发服务器
cd client
npm start

# 启动后端开发服务器
cd ../server
npm run dev
```

### 生产环境构建

```bash
# 构建前端
cd client
npm run build

# 构建后端
cd ../server
npm run build
```

## 管理员账号

系统默认创建一个管理员账号：
- 用户名: 管理员
- 部门: 管理部门

## 导入题库格式

Excel文件格式要求：
- 第一列: 题干
- 第二至五列: 选项A-D
- 第六列: 正确答案，单选题填写单个字母如"A"，多选题填写多个字母如"BCD"

## 后续开发计划

- 接入MongoDB数据库
- 添加更多题型支持（判断题、填空题等）
- 用户权限管理增强
- 题库分类管理 