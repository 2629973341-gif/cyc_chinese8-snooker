# 黑金游戏服务器

原生 HTML5/Node.js 游戏服务器，统一提供账号、好友、在线状态、邀请和房间系统。目前支持中式八球、斯诺克、中国象棋、象棋盲棋、五子棋、围棋和泉州麻将。

泉州麻将入口为 `/mahjong.html?room=房间ID`，在大厅创建房间时选择「泉州麻将」。在线桌支持2—4位真人，房主可连续邀请三位好友，未坐满的位置由电脑补齐；人机/练习桌为一位真人与三位电脑。服务端独立运行规则与电脑，按座位隐藏手牌，并提供吃、碰、明暗杠、补杠/抢杠、补花、金牌、游金/双游/三游和逐局计分。16张手牌、五组面子加一对；具体倍率与地方约定见游戏内规则面板。在线牌局胡牌真人记胜，其余真人记负，电脑胡牌时所有真人记负，流局记和；提前退出者在本局结算时记负。暂不包含跟打风牌和抢金。

首局由服务端为四家各掷两枚骰子，总点数最高者坐庄，并列最高者重掷；动画期间锁定出牌。庄家拿17张并先出牌。庄家胡牌或流局时连庄，闲家胡牌由胡牌者接庄；庄底采用本版明确约定的进阶制 `2 + 连庄次数`，换庄清零，庄家下庄时的赔付同样按本局庄底。已结束牌局的新一局承接庄次，未决胜负经全员确认重开时保留庄次且不增加连庄。庄家和底分随房间保存，刷新不会重新摇骰。地方玩法存在差别，首庄比点及线性连庄计分以本版规则面板为准，相关变体参考[泉州玩法说明](https://www.xinyueyouxi.com/game/219-22)和[选庄规则整理](https://m.tdqp8.com/Home/Info/10652.html)。

四人房的开局后模式锁定，未决胜负重开需其他所有真人同意，任意一人取消即继续原局。玩家退出后由电脑接管该座，房主退出则自动移交房主，最后一位真人退出后销毁房间。每位实际参赛账号各自记录战绩，断线重连仍只能读取自己的座位。

泉州规则参考：[厦门与泉州麻将规则整理](https://kzpn200.blogspot.com/2015/10/blog-post_14.html)。运行验证：`node --test tests/*.test.cjs`。更新部署时需一并提交 `mahjong-engine.js`、`mahjong.html`、`server.js` 与 `lobby.html`；按原有流程拉取代码后执行 `sudo systemctl restart billiards`，无需新增依赖或修改端口。

麻将牌桌使用 Canvas 绘制正俯视矩形蓝色台面、四向牌列、区分明显的万筒条牌面及可开关辅助牌号及六张一排的中央弃牌区。春夏秋冬、梅兰竹菊各有独立牌面，各家已补花牌逐张公开摆放；新增花牌会从玩家处飞入花牌列并播放补花音效。底部手牌按万筒条字自动理牌，新摸牌理入牌序并标注「摸」；点一次拿起，再点一次、向上拖出或按空格出牌，也可点击画面右下的「出牌」。其他三家牌面已放大，吃碰杠胡在可响应时显示书法字选项。拿牌采用阻尼弹簧，摸牌滑入、出牌抛落并轻弹，音效可在顶部开关。本次定庄与连庄更新需同时上传 `server.js`、`mahjong-engine.js`、`mahjong.html` 和 `game-audio.js`，云端需重启服务。浏览器回归使用本机 Chrome/Edge，设置 `MAHJONG_BROWSER_TEST=1` 后运行 `node --test tests/mahjong-ui.test.cjs`；未开启时默认跳过浏览器测试。

中国象棋、五子棋和围棋均由服务端权威校验回合与走法。五子棋为 15 路自由连珠；围棋为 19 路中国规则基础版，支持提子、自杀禁手、全局同形禁入、停一手与白贴 6.5 目结算。

象棋盲棋采用全场揭棋规则：将帅明置，其余红黑共 30 枚棋子保留原始阵营进入同一个随机池，再分配到全场暗位；暗子由棋背一方暂时控制，并按棋背所在原始棋位的走法行动，落子后恢复真实棋种和红黑阵营。暗子可吃任意阵营棋子，任何已翻明棋子也可吃尚未翻开的暗子；只有双方均已翻明时才按正常敌我关系限制。被吃棋子的真实身份会显示在吃子方的吃子盘中。

所有模式均按账号分别记录胜、负、和棋与胜率，并在大厅排行榜中分类展示。已经分出胜负时，“开始新一局”会先确保旧局只计入一次战绩，再直接重置下一局；尚未分出胜负时，“重新开始”会向对手发送确认/取消请求，只有对手确认才会放弃当前局且不记录胜负。

## 启动

项目没有第三方依赖，只需要 Node.js 18 或更高版本：

```bash
node server.js
```

默认监听 80 端口，然后访问 <http://localhost>。也可以使用 `npm start`；Windows PowerShell 若禁止执行 `npm.ps1`，可使用 `npm.cmd start`。可通过环境变量覆盖端口，例如 `PORT=3001 node server.js`。

账号、好友与房间数据保存在 `data/db.json`。密码使用 Node.js `scrypt` 加盐散列，不保存明文密码。

## 服务器背景音乐

把拥有使用权限的 `.mp3`、`.ogg`、`.wav`、`.m4a`、`.aac` 或 `.flac` 文件放入项目的 `music/` 目录并重启服务。大厅及所有游戏页面右下角会出现统一播放器，可播放/暂停、切歌和调节音量；当前曲目、音量和播放进度会在页面切换时保留。

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
