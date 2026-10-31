# 算法学习：轻量版部署（不使用 Docker）

入口：大厅右上角「算法学习」，或 `/study.html`。沿用现有账号和80端口，数据库不迁移、不清空。

## 现在需要什么

- 原有 Node.js 游戏服务，Node ≥18。
- 本机 `g++`、`nlohmann-json3-dev`、`bubblewrap`、`util-linux`，Ubuntu 24.04 官方软件源提供。
- 一个非root的独立 `judge` 用户，以及一个小型Node判题worker。
- Linux cgroup v2 和 systemd。**不需要 Docker、镜像、rootless Docker、额外npm包或数据库服务。**

使用Bubblewrap临时挂载只读系统目录，编译器无需复制进镜像；每次只编译一份代码，完成后清理源码和产物。默认串行判题，不排长队，繁忙时请稍后重试。

## 首次安装 / 从旧Docker方案切换

先在本地提交并推送本次改动，特别是 `study/native-runner.js`、`study-runner.js`、`deploy/study-runner.service`、两个安装/检查脚本。然后在Linux服务器执行：

```bash
cd /opt/billiards-club
sudo -u www-data git -c http.version=HTTP/1.1 pull --ff-only origin main
```

**确认Git拉取成功后**执行：

```bash
sudo bash scripts/install-study-native.sh
```

这个脚本会：

1. 从当前系统软件源安装上述四个系统软件包，不添加Docker软件源。
2. 没有judge用户时创建专用的无登录用户，不使用root运行判题。
3. 首次生成 `/etc/billiards-study.env` 中的共享密钥；已有文件原样保留，不打印密钥。
4. 安装带内存、CPU、任务限制的新worker服务；为billiards增加读取配置文件的drop-in，保留原端口、数据库路径和其他定制。
5. 启动worker并重启billiards，运行真实Linux冒烟检查。**冒烟失败时安装命令报错，不能视为判题已就绪。**

不会删除、覆盖 `data/db.json`，不会停止或卸载你已有的Docker、容器或其他应用。旧Docker构建文件已从项目移除，可由Git历史恢复。如果之前添加的Docker软件源导致 `apt-get update` 报错，请保留输出排查，不要直接删除其他服务或关闭TLS验证。

安装完刷新浏览器（Ctrl+F5），应显示「轻量C++判题就绪」。首次安装所需软件包会占用磁盘，主要是C++编译器；没有额外镜像层或常驻Docker守护进程。

## 资源与隔离边界

浏览器 → 原游戏服务（鉴权、进度、答案校验） → 本机loopback worker → Bubblewrap沙箱内的g++或编译产物。

- 游戏进程绝不执行用户代码，不使用Node vm代替安全沙箱。
- 编译和运行**都**使用隔离器，避免通过C++ `#include` 读取服务器文件。
- 强制新的用户、PID、IPC、UTS、网络与cgroup命名空间，禁用进一步创建用户命名空间，清除能力和环境变量；没有网络连接到宿主服务的通道。
- 仅绑定只读的系统编译依赖，隐藏 `/usr/local`；没有站点目录、账号数据库、密钥、用户家目录或Docker socket挂载。
- 编译阶段只写本任务的artifact目录，运行时源码/产物均只读；临时目录为32MB tmpfs。
- worker整体：最多512MB内存、0交换、64个任务，CPU最多75%单核，并降低调度优先级。**这是上限，不会预占512MB内存或持续消耗75%CPU。**
- 子进程软/硬限制相同：运行地址空间256MB、CPU3秒、32进程、64文件描述符、文件32MB、禁用core dump。编译CPU15秒/墙钟20秒；运行墙钟4秒，整个提交约40秒上限。
- stdout+stderr合计最多64KB。超时/输出超限时终止本次进程组，PID命名空间负责隔离其后代。服务停止时systemd清理整个worker控制组。
- worker只绑定127.0.0.1，默认3999，token不进入浏览器；不需要在安全组开放3999。

worker会检查自身cgroup限制、依赖和实际沙箱启动能力。条件不足则关闭运行/提交，不会退回宿主裸跑。题目、解答、草稿和历史仍可使用。

**这不是虚拟机，也不保证抵御Linux内核漏洞。**用于自己和可信好友的轻量学习服务；开放陌生人注册时，应把判题worker放到独立主机/虚拟机，保持内核和Bubblewrap更新，并进行额外安全审计。

原理依据：[Bubblewrap手册](https://manpages.ubuntu.com/manpages/noble/man1/bwrap.1.html)、[prlimit手册](https://manpages.ubuntu.com/manpages/noble/man1/prlimit.1.html)、[systemd资源限制](https://www.freedesktop.org/software/systemd/man/latest/systemd.resource-control.html)。

## Ubuntu 24.04 用户命名空间 / AppArmor 问题

Ubuntu 24.04默认限制部分非特权用户命名空间。沙箱如果返回 `Operation not permitted` / `Permission denied`，服务会拒绝判题。

不要执行全局关闭AppArmor、把bwrap设成setuid、将worker改成root或启用无沙箱执行等命令。先更新系统官方bubblewrap/AppArmor相关软件包并保留以下输出，由管理员核查针对 `/usr/bin/bwrap` 的安全策略：

```bash
sudo journalctl -u study-runner -n 80 --no-pager
sudo journalctl -k -n 100 --no-pager
```

参考：[Ubuntu 24.04发布说明](https://documentation.ubuntu.com/release-notes/24.04/)、[AppArmor说明](https://ubuntu.com/server/docs/how-to/security/apparmor/)。不要把密钥文件内容贴到聊天或提交到Git。

## 真实Linux验证

安装脚本已经自动调用；需要再次检查时执行：

```bash
cd /opt/billiards-club
sudo node scripts/check-study-native.cjs
```

检查使用固定可信程序，验证：

- 不能访问账号数据库和密钥，不能修改提交源码与运行产物。
- 没有继承worker token，网络和PID命名空间与宿主不同，进程资源限制生效。
- CE、RE、TLE、OLE均能正确返回并终止任务。

这不会创建账号、提交到账号战绩或更改完成进度。然后在网页复制一份C++参考解答，分别用力扣模式与ACM模式提交，确认AC。换另一账号确认草稿/完成状态互不可见。

## 后续更新

只修改页面/题库/逻辑且service不变：

```bash
cd /opt/billiards-club
sudo -u www-data git pull --ff-only origin main && sudo systemctl restart study-runner billiards
```

如果部署配置或系统依赖改变，拉取成功后重新执行安装脚本，已有token保留。不再需要构建镜像。systemd服务在关闭SSH后继续运行。

如果3999被占用，使用 `sudoedit /etc/billiards-study.env`，同时修改 `STUDY_RUNNER_PORT` 和 `STUDY_RUNNER_URL`，保持loopback地址，然后重启两个服务。旧配置中的DOCKER_HOST等变量被忽略，不会连接Docker。

## 学习功能保持不变

- Hot100与面试经典150，去重183题；本地1007组主解测试，10份第二解法合计1079次参考执行验证。
- 全部练习、参考代码均为C++17；力扣函数/设计类模式、ACM有模板、ACM空白三种入口。
- 每行JSON参数数组、每行JSON答案；ACM由自己写main解析，力扣模式由平台补齐。
- 每个账号、每种模式独立草稿；共享单题已通过状态，记录各模式尝试与通过。运行不增加进度，提交全部本地测试通过才算AC。
- 原有账号、草稿、历史与进度保存在原DB_FILE的user.study字段，备份原数据库即可，不需要导入或迁移。
- 本站原创说明和C++解法，附力扣题解入口，不冒充官方原文；有限本地测试不等于力扣官方判题，也不保证验证内部指针身份、原地操作或随机分布。
- VS Code风格界面、可拖动分栏、专注阅读/编程、字号调节、语法高亮、手机竖屏保持。

## 本地开发检查

```bash
node --test tests/study.test.cjs tests/study-api.test.cjs tests/study-cpp.test.cjs tests/study-native.test.cjs
```

Windows不能启动原生沙箱。以上单元/接口测试使用可检查的可信替身和固定可信子进程，**不能替代Linux实际隔离验证**。`node scripts/test-study-cpp.cjs`可使用本机C++工具链编译并运行仓库内的可信参考解答，不用于运行用户提交。
