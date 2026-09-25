# 黑金游戏服务器

原生 HTML5/Node.js 1v1 游戏服务器，统一提供账号、好友、在线状态、邀请和房间系统。目前支持中式八球、斯诺克、中国象棋、五子棋和围棋。

中国象棋、五子棋和围棋均由服务端权威校验回合与走法。五子棋为 15 路自由连珠；围棋为 19 路中国规则基础版，支持提子、自杀禁手、全局同形禁入、停一手与白贴 6.5 目结算。

## 启动

项目没有第三方依赖，只需要 Node.js 18 或更高版本：

```bash
node server.js
```

默认监听 80 端口，然后访问 <http://localhost>。也可以使用 `npm start`；Windows PowerShell 若禁止执行 `npm.ps1`，可使用 `npm.cmd start`。可通过环境变量覆盖端口，例如 `PORT=3001 node server.js`。

账号、好友与房间数据保存在 `data/db.json`。密码使用 Node.js `scrypt` 加盐散列，不保存明文密码。

## 联机测试

使用两个不同浏览器，或普通窗口与隐私窗口，分别注册两个账号。添加好友后由一方创建房间、选择模式并邀请另一方。房主开始游戏后，房间模式会被后端锁定。

账号状态使用位标记：

- `1`：在线
- `2`：房间中
- `4`：游戏中

状态可以组合，例如在线且游戏中为 `5`。游戏中或已在房间的账号不能接受新的房间邀请，也不能创建另一个房间。

## Linux 云服务器直接部署到 80 端口

先确认服务器已安装 Node.js 18 或更高版本，并检查 Node 的实际路径：

```bash
node -v
which node
```

在本地项目目录执行以下命令上传完整项目（将示例 IP 和用户名替换成你的服务器信息）：

```bash
scp -r . root@你的服务器公网IP:/opt/billiards-club
```

然后登录服务器并使用仓库中的 `deploy/billiards.service` 启动服务：

```bash
sudo chown -R www-data:www-data /opt/billiards-club
sudo cp /opt/billiards-club/deploy/billiards.service /etc/systemd/system/billiards.service
sudo systemctl daemon-reload
sudo systemctl enable --now billiards
sudo systemctl status billiards
```

服务文件通过 `CAP_NET_BIND_SERVICE` 允许 `www-data` 用户绑定 80 端口，无需使用 root 运行 Node。如果 `which node` 的结果不是 `/usr/bin/node`，请相应修改服务文件中的 `ExecStart`。

若服务器启用了 UFW，还需要执行：

```bash
sudo ufw allow 80/tcp
```

同时需要在云厂商控制台的安全组/防火墙中放行入站 TCP 80。部署完成后访问 `http://服务器公网IP/`。查看实时日志：

```bash
sudo journalctl -u billiards -f
```

如果 80 端口已被 Nginx 或 Apache 占用，不能让两个程序同时监听该端口。此时应将本服务改为其他空闲端口，再由 Nginx 反向代理。运行数据位于 `/opt/billiards-club/data/db.json`，升级前请备份该文件，并确保 `www-data` 对 `data` 目录有写权限。

## 使用 Git 上传与部署

`data/db.json` 包含账号、好友及对局数据，已经被 `.gitignore` 排除。仓库只提交不含用户数据的 `data/db.example.json`，后端首次运行时会自动创建正式数据库。

### 1. 本地创建仓库并推送

先在 GitHub、Gitee 或 GitLab 创建一个空仓库，不要勾选自动生成 README。然后在本项目目录执行：

```bash
git init
git add .
git commit -m "Initial billiards club"
git branch -M main
git remote add origin 你的Git仓库地址
git push -u origin main
```

提交前可用下面的命令确认数据库没有进入暂存区：

```bash
git status
git check-ignore -v data/db.json
```

### 2. Linux 首次拉取并启动

```bash
sudo mkdir -p /opt/billiards-club
sudo chown "$USER":www-data /opt/billiards-club
git clone 你的Git仓库地址 /opt/billiards-club
sudo chown -R www-data:www-data /opt/billiards-club
sudo cp /opt/billiards-club/deploy/billiards.service /etc/systemd/system/billiards.service
sudo systemctl daemon-reload
sudo systemctl enable --now billiards
sudo systemctl status billiards
```

私有仓库建议在服务器生成只用于部署的 SSH 密钥，并把公钥添加为仓库的 Deploy Key；不要把个人密码或访问令牌写进项目文件。

### 3. 后续发布更新

本地修改完成后：

```bash
git add .
git commit -m "描述本次修改"
git push origin main
```

服务器更新：

```bash
sudo -u www-data git -C /opt/billiards-club pull --ff-only origin main
node --check /opt/billiards-club/server.js
sudo systemctl restart billiards
sudo systemctl status billiards
```

`git pull` 不会覆盖已被忽略的 `data/db.json`。更新前仍建议备份数据库：

```bash
sudo cp /opt/billiards-club/data/db.json /opt/billiards-club/data/db.json.backup
```
