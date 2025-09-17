# 七巧板项目 Docker 部署指南

## 📋 项目概述

七巧板（qi-qiao-ban）是一个基于 Svelte + Vite 构建的前端应用，具备 PWA 功能，非常适合 Docker 容器化部署。

## 🐳 Docker 化可行性

### ✅ 项目特点
- **前端 SPA 应用**：基于 Svelte + Vite 构建的单页应用
- **静态资源输出**：`npm run build` 生成静态文件到 `dist` 目录
- **PWA 支持**：已配置 PWA，适合生产环境部署
- **相对路径配置**：`base: './'` 配置适合子目录部署

### 📦 推荐部署方案

**多阶段构建 Dockerfile**：

```dockerfile
# 构建阶段
FROM node:18-alpine AS builder
WORKDIR /app

# 复制依赖文件
COPY package*.json ./
RUN npm ci --only=production

# 复制源码并构建
COPY . .
RUN npm run build

# 生产阶段
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 🔧 配置文件

### 1. Nginx 配置 (nginx.conf)

```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    
    sendfile        on;
    keepalive_timeout  65;
    
    server {
        listen       80;
        server_name  localhost;
        
        location / {
            root   /usr/share/nginx/html;
            index  index.html index.htm;
            try_files $uri $uri/ /index.html;
        }
        
        # 静态资源缓存
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

### 2. Docker Ignore (.dockerignore)

```
node_modules
dist
.git
.gitignore
README.md
study
*.md
.env*
```

### 3. Docker Compose (docker-compose.yml)

```yaml
version: '3.8'

services:
  qi-qiao-ban:
    build: .
    ports:
      - "80:80"
    restart: unless-stopped
    
  # 开发环境
  qi-qiao-ban-dev:
    build:
      context: .
      target: builder
    ports:
      - "5173:5173"
    volumes:
      - .:/app
      - /app/node_modules
    command: npm run dev
    profiles:
      - dev
```

## 🚀 部署流程

### 本地构建和运行

```bash
# 1. 构建镜像
docker build -t qi-qiao-ban .

# 2. 运行容器
docker run -p 80:80 qi-qiao-ban

# 3. 使用 docker-compose
docker-compose up -d

# 4. 开发环境
docker-compose --profile dev up
```

### 生产环境部署

```bash
# 1. 构建生产镜像
docker build -t qi-qiao-ban:latest .

# 2. 推送到镜像仓库
docker tag qi-qiao-ban:latest registry.example.com/qi-qiao-ban:latest
docker push registry.example.com/qi-qiao-ban:latest

# 3. 在生产服务器部署
docker pull registry.example.com/qi-qiao-ban:latest
docker run -d -p 80:80 --name qi-qiao-ban registry.example.com/qi-qiao-ban:latest
```

## 🎯 Docker 化优势

### 🚀 部署和运维优势

1. **环境一致性**
   - 开发环境 = 生产环境
   - 版本锁定，避免环境差异
   - 依赖隔离

2. **简化部署流程**
   - 一键部署：`docker run -p 80:80 qi-qiao-ban`
   - 标准化部署流程
   - 快速回滚能力

### 📦 资源和性能优势

3. **资源优化**
   - 轻量级镜像：~20MB（Alpine + 静态文件）
   - 内存占用小：相比虚拟机节省 90% 资源
   - 启动速度快：< 1秒启动时间

4. **水平扩展**
   - 轻松扩展多个实例
   - 负载均衡支持
   - 自动故障转移

### 🔧 开发和维护优势

5. **开发体验提升**
   - 本地环境隔离
   - 团队协作便利
   - 多版本并行测试

6. **CI/CD 集成**
   - GitHub Actions 支持
   - 自动化构建和部署
   - 版本管理

### 🛡️ 安全和稳定性

7. **安全隔离**
   - 进程隔离
   - 网络隔离
   - 文件系统隔离

8. **故障恢复**
   - 自动重启
   - 健康检查
   - 日志集中管理

### 🌐 云原生优势

9. **云平台支持**
   - AWS ECS/EKS
   - 阿里云 ACK
   - Kubernetes 支持

10. **成本优化**
    - 高资源利用率
    - 按需扩缩容
    - 开发测试成本低

## 📊 监控和运维

### 日志管理

```bash
# 查看实时日志
docker logs -f qi-qiao-ban

# 查看资源使用情况
docker stats qi-qiao-ban

# 进入容器调试
docker exec -it qi-qiao-ban sh
```

### 健康检查

```dockerfile
# 在 Dockerfile 中添加健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1
```

## 🔄 最佳实践

1. **镜像优化**
   - 使用多阶段构建
   - 选择轻量级基础镜像
   - 合理使用 .dockerignore

2. **安全考虑**
   - 非 root 用户运行
   - 定期更新基础镜像
   - 扫描安全漏洞

3. **性能优化**
   - 启用 Nginx 压缩
   - 配置静态资源缓存
   - 使用 CDN 加速

## 📝 总结

Docker 化为七巧板项目带来了：
- **一次构建，到处运行**的便利性
- **标准化的部署流程**
- **高效的资源利用**
- **强大的扩展能力**

通过 Docker 容器化，项目可以实现快速部署、弹性扩展和高可用性，是现代 Web 应用的最佳实践。