#!/usr/bin/env bash
# 在用户的Linux服务器上手动执行。本脚本不卸载或停止已有Docker，不修改账号数据库。
set -euo pipefail
if [ "$(id -u)" -ne 0 ]; then
  printf '%s\n' '请执行：sudo bash scripts/install-study-native.sh' >&2
  exit 1
fi
study_root="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd -P)"
if [ ! -f "$study_root/study-runner.js" ] || [ ! -f "$study_root/deploy/study-runner.service" ]; then
  printf '%s\n' '项目文件不完整，请先成功git pull。' >&2
  exit 1
fi
if [ "$study_root" != '/opt/billiards-club' ]; then
  printf '%s\n' '本安装脚本针对 /opt/billiards-club；其他目录请按部署文档手动调整服务路径。' >&2
  exit 1
fi
if [ ! -x /usr/bin/node ]; then
  printf '%s\n' '找不到/usr/bin/node，请先安装Node.js 18或更高版本。' >&2
  exit 1
fi
apt-get update
apt-get install -y --no-install-recommends g++ nlohmann-json3-dev bubblewrap util-linux
if ! id judge >/dev/null 2>&1; then
  useradd --system --user-group --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin judge
fi
if [ "$(id -u judge)" -eq 0 ]; then
  printf '%s\n' 'judge不得是root用户，请检查用户配置。' >&2
  exit 1
fi
# 已经配置过的密钥文件原样保留；不在终端打印token，不加载其内容为root shell代码。
if [ ! -e /etc/billiards-study.env ]; then
  umask 077
  study_token="$(/usr/bin/node -e 'process.stdout.write(require("crypto").randomBytes(32).toString("hex"))')"
  printf 'STUDY_RUNNER_TOKEN=%s\nSTUDY_RUNNER_URL=http://127.0.0.1:3999\nSTUDY_CONCURRENCY=1\n' "$study_token" > /etc/billiards-study.env
  unset study_token
fi
if ! grep -Eq '^STUDY_RUNNER_TOKEN=.{32,}$' /etc/billiards-study.env; then
  printf '%s\n' '已有/etc/billiards-study.env未包含有效token，未覆盖；请按文档修复后重试。' >&2
  exit 1
fi
chmod 600 /etc/billiards-study.env
chown root:root /etc/billiards-study.env
install -m 0644 "$study_root/deploy/study-runner.service" /etc/systemd/system/study-runner.service
# 只给现有游戏服务增加配置文件入口，保留用户的端口、数据库路径和其他定制。
install -d -m 0755 /etc/systemd/system/billiards.service.d
printf '[Service]\nEnvironmentFile=-/etc/billiards-study.env\n' > /etc/systemd/system/billiards.service.d/90-study-native.conf
systemctl daemon-reload
systemctl enable study-runner
systemctl restart study-runner
systemctl restart billiards
systemctl --no-pager --full status study-runner billiards
/usr/bin/node "$study_root/scripts/check-study-native.cjs"
printf '%s\n' '轻量判题已安装并通过本机冒烟检查。请刷新学习页。'
printf '%s\n' '本脚本不会禁用AppArmor或用户命名空间限制，沙箱条件不足时判题拒绝执行。'
