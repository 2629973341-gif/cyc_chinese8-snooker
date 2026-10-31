# 算法学习模块：使用与 Linux 部署

入口：大厅右上角「算法学习」，或直接访问 `/study.html`。沿用原游戏账号和 80 端口，不需要为学习页新增公网端口。

## 功能与边界

- 力扣 Hot 100、面试经典 150 官方题单元数据，去重 183 题；两套题单按各自原有分类排列，共享单题完成状态，分别计算进度。
- 183 道题均有原创简要说明、输入协议、示例、C++17 参考解答；其中10题另有第二份完整C++解法。提供力扣原题和题解入口（其中包括官方解答）。**不是官方题干/题解的镜像，不声称所有本地思路均逐篇核验过官方题解。**
- 统一使用 C++17：力扣模式仅提交本题 `class Solution` 或设计类，平台提供标准头文件和节点结构，补齐输入、调用与输出；ACM有模板模式提供完整程序骨架；ACM无模板模式从空白开始，自行编写main。三种模式均从标准输入读取每行JSON参数数组并输出每行JSON结果，力扣模式由平台完成这部分工作。镜像已内置 `nlohmann/json.hpp`。
- 例如两数之和：输入 `[[4,8,2,11],10]`，输出 `[1,2]`。多行输入用于多组自测；提交时服务器分测试输入调用程序。
- 运行只展示输出，不检查自测答案，也不记完成；提交通过全部本地测试才记为已通过。重复通过不会重复增加完成题数，之后失败也不会清除历史通过。
- 账号进度、分模式C++草稿、最近500次提交及源码保存在原 `DB_FILE` 的用户 `study` 字段；不同模式独立保存草稿，共享已通过状态，同时记录各模式通过情况。旧版C++草稿保留在ACM有模板入口，旧JavaScript/Python历史仍可查看，不会被强制转换或删除。备份原 `data/db.json` 即可同时备份学习进度，**不要用示例数据库覆盖实际数据库**。
- 本地共 1007 组测试，含固定种子补充数据、多解判定和浮点容差。**这不是力扣官方判题系统**：有限测试不能证明算法对所有输入都正确，序列化不能验证原地修改、内部指针身份或随机分布。题目页明确说明该限制。
- 判题源文件和隐藏测试不在静态文件白名单内；不能由浏览器直接下载。显示题解是学习功能，并不用于防作弊竞赛。

## 工作台操作

采用VS Code风格灰黑/蓝色配色，可切换浅色主题；字体、主题、面板尺寸等界面偏好保存在浏览器，**代码和进度仍按服务端账号隔离**。

- 拖动目录右侧与题目右侧分隔线调整宽度；拖动测试面板顶部分隔线调整高度。
- 题目标签栏右侧「⛶」放大阅读；编辑器右上角「⛶」进入专注编程，再点恢复。
- 左侧活动栏收起目录、切题目/解答/提交、收起测试面板。手机竖屏使用「目录 / 题目与解答 / C++编辑器」切换单面板。
- 「A− / A+」调整代码字号；Tab插入4空格，Enter自动缩进，Ctrl/⌘+S保存，Ctrl/⌘+Enter自测，Ctrl/⌘+Shift+Enter提交。
- 编辑器模式选择「力扣 / ACM有模板 / ACM无模板」，切换会先保存当前草稿；解答面板可单独切换力扣函数版与ACM完整版，不会覆盖编辑器。

## 架构和安全要求

浏览器 → 原 Node 游戏服务（登录、进度、校验答案） → loopback 专用判题 worker → rootless Docker 临时容器。

游戏服务**不执行用户代码、不连接 Docker socket、不使用 Node vm 作为提交沙箱**。未配置 worker 时页面和题解仍可使用，运行/提交明确不可用，不会假装提交成功。

每个用例在一个新容器中执行：无网络、只读根文件系统、非 root、去掉 capabilities、禁止提权、内存/CPU/PID/文件大小限制、stdout+stderr 共 64KB 上限。仅挂载本任务源码；C++ 编译器只在编译阶段写本任务 artifact 目录。账号数据库、判题 token、Docker socket、预期答案不挂载到容器。worker 在宿主侧读取输出并决定执行状态，用户代码不能通过打印伪造判题元数据。

默认最多 2 个同时判题任务、同账号同时只能 1 个、每分钟最多 12 次；低配服务器建议 `STUDY_CONCURRENCY=1`。每测试 CPU 3 秒、墙钟约 5.5 秒（包含容器启动），C++ 编译最多 20 秒，一次任务总时间受限。显示耗时是墙钟时间，包含容器开销，不是算法性能排行榜。

Docker 容器不是虚拟机，不能承诺完全防御内核漏洞。仅用于受信任账号的小型自建学习服务；如果开放给陌生人，应把 worker 放到**独立服务器/虚拟机**，采用专门的沙箱运行时并做资源与安全审计。不要把容器设置为 privileged，不要加入 host PID/network，不要把 `/` 或 Docker socket 挂进容器。不要把 `www-data` 加入 Docker 组。

参考：[Docker 资源限制](https://docs.docker.com/engine/containers/resource_constraints/)、[Rootless 模式](https://docs.docker.com/engine/security/rootless/)。worker 要求 rootless + cgroup v2 且能限制内存、交换、CPU、PID，否则 fail closed。

## 首次部署（Ubuntu/Debian，沿用 /opt/billiards-club）

### 1. 先更新源代码

本地提交并推送这些新文件以及 server.js、lobby.html、deploy/billiards.service；再在服务器使用已有的 Git 身份拉取：

```bash
cd /opt/billiards-club
sudo -u www-data git pull --ff-only
```

如果仓库并非由 www-data 的 SSH 身份管理，请沿用原先能成功拉取的账号；不要为了更新而删除数据库或重克隆覆盖目录。

### 2. 准备 rootless Docker

需要较新 Docker Engine、Node ≥18，以及 cgroup v2 的 systemd Linux。按照 [Docker 官方 Ubuntu 安装文档](https://docs.docker.com/engine/install/ubuntu/) 安装 Engine，然后安装 rootless 所需依赖（Docker 官方软件源中提供 extras）：

```bash
sudo apt-get update
sudo apt-get install -y uidmap dbus-user-session docker-ce-rootless-extras
if ! id judge >/dev/null 2>&1; then
  sudo useradd --create-home --shell /bin/bash judge
fi
sudo loginctl enable-linger judge
judge_uid=$(id -u judge)
sudo systemctl start "user@${judge_uid}.service"
sudo -iu judge env XDG_RUNTIME_DIR="/run/user/${judge_uid}" \
  DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${judge_uid}/bus" \
  dockerd-rootless-setuptool.sh install
```

若提示系统 Docker 同时存在，不要擅自停掉其他应用使用的 Docker。可按官方 rootless 文档使用 `install --force` 允许并存；之后**一定指定 judge 的 rootless socket**，不能误连系统 `/var/run/docker.sock`。

安装要求 judge 在 `/etc/subuid` 和 `/etc/subgid` 有至少 65536 个从属 ID（useradd 通常自动分配）。如果失败，先按官方文档修复环境，不要绕过 worker 的 rootless 检查。

### 3. 在 judge 的 rootless Docker 中构建镜像

```bash
judge_uid=$(id -u judge)
sudo -u judge env XDG_RUNTIME_DIR="/run/user/${judge_uid}" \
  DOCKER_HOST="unix:///run/user/${judge_uid}/docker.sock" \
  docker build -t blackgold-study:1 /opt/billiards-club/deploy/study

sudo -u judge env DOCKER_HOST="unix:///run/user/${judge_uid}/docker.sock" \
  docker info
```

检查输出有 `rootless`、`Cgroup Version: 2`，且没有 memory/cpu/pids 不支持的警告。rootless cgroup 控制受内核与 systemd 委派配置影响，详见官方文档；资源限制不可用时不要对公网启用代码执行。

### 4. 配置两个服务共同使用的 token

以下命令会**新建或覆盖该模块的配置**；首次安装执行一次。以后更新不要重新生成 token，否则需同时重启两个服务。

```bash
judge_uid=$(id -u judge)
study_token=$(openssl rand -hex 32)
printf 'STUDY_RUNNER_TOKEN=%s\nSTUDY_RUNNER_URL=http://127.0.0.1:3999\nDOCKER_HOST=unix:///run/user/%s/docker.sock\nXDG_RUNTIME_DIR=/run/user/%s\nSTUDY_CONCURRENCY=1\n' \
  "$study_token" "$judge_uid" "$judge_uid" | sudo tee /etc/billiards-study.env >/dev/null
unset study_token
sudo chmod 600 /etc/billiards-study.env
```

EnvironmentFile 由 systemd 读取，文件应只允许 root 读取；请勿提交到 Git、截图 token 或把 token 放进前端代码。

### 5. 安装并启动服务

```bash
sudo cp /opt/billiards-club/deploy/study-runner.service /etc/systemd/system/study-runner.service
sudo cp /opt/billiards-club/deploy/billiards.service /etc/systemd/system/billiards.service
sudo systemctl daemon-reload
sudo systemctl enable --now study-runner
sudo systemctl restart billiards
sudo systemctl status study-runner billiards --no-pager
```

如果原 billiards.service 有自定义数据库路径、端口或其他配置，请合并 `EnvironmentFile=-/etc/billiards-study.env` 这一行，不要直接覆盖自定义配置。**原端口仍是 80。**

worker 固定只绑定 `127.0.0.1:3999`，无需也不应在安全组或防火墙开放3999。若本机3999已有服务，可在 env 文件加入 `STUDY_RUNNER_PORT=新端口`，并同时改 `STUDY_RUNNER_URL`，然后重启两个服务。

### 6. 必做冒烟验证

1. 登录学习页面，右上角应显示「隔离判题已就绪」。不就绪时查看：`sudo journalctl -u study-runner -n 80 --no-pager`，以及 rootless Docker 的日志。
2. 两数之和，选择力扣模式，将C++参考函数复制进编辑器，填示例并运行，得到 `[1,2]`；提交应AC。选择ACM模式，再复制「ACM完整程序」验证。
3. 力扣模式把twoSum实现改为始终返回空数组，提交应WA，不能新增通过题目。
4. ACM模式使用 `int main(){for(;;){}}` 自测，应TLE；持续大量输出应OLE，页面和原游戏服务不应卡住。
5. ACM有模板的默认程序输出null可确认编译成功（运行显示null，提交应WA）；ACM无模板应为空白，粘贴完整C++程序后可自测。
6. 另一账号登录，相同题目应仍未通过，不能看到第一账号的草稿或历史源码。

本地开发环境若没有 Docker，单元和接口测试会模拟 worker 协议，不执行不可信代码。它们不代替以上 Linux 容器验证。

## 后续 Git 更新

```bash
cd /opt/billiards-club
sudo -u www-data git pull --ff-only
sudo systemctl restart study-runner billiards
```

只有 `deploy/study/Dockerfile` 变化时才需要用 judge 的 rootless Docker 重新 build 镜像。仅修改题库或页面不需要重建镜像。关闭SSH后两个systemd服务都会继续运行。

本次C++/界面更新没有修改Dockerfile：已有判题镜像可继续使用；必须同时更新 `study/` 下新增的3个C++适配文件，并重启billiards和study-runner。原先尚未配置worker的服务器仍需先完成首次部署，换界面不会自动启用判题。

## 本地检查与题单更新

```bash
node --test tests/study.test.cjs tests/study-api.test.cjs tests/study-cpp.test.cjs
node scripts/test-study-cpp.cjs
node scripts/sync-study-catalog.mjs
```

同步脚本只下载官方公开题单元数据，有数量/去重检查；不抓取题干或付费解答。官方题单变动后，新题必须补上 `study/problems.js` 和 `study/reference.js`，否则启动校验会提示缺题，不会静默给出虚假题目。

`test-study-cpp.cjs`只编译并运行仓库内的可信C++参考代码，不用于执行用户提交。它会下载nlohmann官方v3.11.3单头文件到被Git忽略的 `.study-cpp-test/`，并使用Windows Visual Studio C++或Linux g++验证183题主解（1007组用例）及10份第二解法（合计1079组）。Node接口测试使用可信worker替身，生产Docker执行仍需完成Linux冒烟测试。
