import { useState, useRef, useEffect } from 'react'
import { useMobile } from '../hooks/useMobile'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CmdEntry { cmd: string; desc: string; example: string; flags?: { flag: string; desc: string }[] }
interface IpcEntry  { name: string; icon: string; desc: string; pros: string; cons: string; code: string }
interface StructField { name: string; type: string; desc: string }

// ─── Linux Commands ───────────────────────────────────────────────────────────

const CMD_GROUPS: { label: string; icon: string; color: string; cmds: CmdEntry[] }[] = [
  {
    label: 'Process', icon: '⚙️', color: '#4d8fff',
    cmds: [
      { cmd: 'ps',          desc: 'List running processes (snapshot)',           example: 'ps aux | grep nginx',
        flags: [{ flag: 'a', desc: '显示所有用户的进程（包括其他终端）' }, { flag: 'u', desc: '以用户友好格式输出（USER/CPU/MEM等列）' }, { flag: 'x', desc: '显示无控制终端的进程（守护进程）' }, { flag: 'f', desc: '完整格式，显示父子关系树（--forest）' }, { flag: 'e', desc: '显示全部进程（等同于-A）' }, { flag: 'o', desc: '自定义输出列，如 -o pid,comm,cpu' }] },
      { cmd: 'top / htop',  desc: 'Live process monitor with CPU/mem stats',    example: 'htop -u root',
        flags: [{ flag: '-u user', desc: '只显示指定用户的进程' }, { flag: '-p pid', desc: '监视特定PID' }, { flag: '-d N', desc: '刷新间隔N秒（默认3s）' }, { flag: '-n N', desc: '刷新N次后退出' }, { flag: 'k (交互)', desc: '在top内按k，然后输入PID来kill进程' }, { flag: 'M (交互)', desc: '按内存使用量排序' }] },
      { cmd: 'kill',        desc: 'Send signal to process by PID',              example: 'kill -9 1234',
        flags: [{ flag: '-9 / -KILL', desc: 'SIGKILL：强制立即终止，进程无法忽略' }, { flag: '-15 / -TERM', desc: 'SIGTERM：优雅终止（默认信号）' }, { flag: '-1 / -HUP', desc: 'SIGHUP：重新加载配置（nginx/sshd常用）' }, { flag: '-l', desc: '列出所有信号名称和编号' }, { flag: '-s SIG', desc: '指定信号名，如 kill -s SIGINT 1234' }] },
      { cmd: 'strace',      desc: 'Trace system calls made by a process',       example: 'strace -p 1234',
        flags: [{ flag: '-p pid', desc: '附加到已运行进程（不重启）' }, { flag: '-e trace=read,write', desc: '只跟踪指定syscall' }, { flag: '-o file', desc: '输出到文件而非stderr' }, { flag: '-f', desc: '跟随fork创建的子进程' }, { flag: '-c', desc: '统计每个syscall的调用次数和耗时' }, { flag: '-T', desc: '显示每个syscall的耗时' }] },
      { cmd: 'lsof',        desc: 'List open files held by processes',          example: 'lsof -p 1234',
        flags: [{ flag: '-p pid', desc: '列出指定进程打开的文件' }, { flag: '-i :port', desc: '查看占用指定端口的进程' }, { flag: '-u user', desc: '列出指定用户打开的文件' }, { flag: '-n', desc: '不做DNS解析（速度更快）' }, { flag: '+D dir', desc: '列出目录下被打开的文件' }, { flag: '-t', desc: '只输出PID（方便管道）' }] },
      { cmd: 'pgrep/pkill', desc: 'Find / kill processes by name pattern',      example: 'pkill -9 zombie',
        flags: [{ flag: '-x', desc: '精确匹配进程名（不是子字符串）' }, { flag: '-u user', desc: '只匹配指定用户的进程' }, { flag: '-l', desc: '输出PID和进程名（pgrep专用）' }, { flag: '-f', desc: '匹配完整命令行（而非只进程名）' }, { flag: '-n', desc: '只匹配最新启动的进程' }] },
      { cmd: 'nice/renice', desc: 'Set / change process scheduling priority',   example: 'nice -n 10 ./heavy',
        flags: [{ flag: '-n N', desc: 'nice值 -20(最高优先级) 到 19(最低)，默认0' }, { flag: 'renice -n N -p pid', desc: '修改已运行进程的nice值' }, { flag: 'renice -n N -u user', desc: '修改用户所有进程的nice值' }] },
      { cmd: 'nohup &',     desc: 'Run process immune to hangup, in background', example: 'nohup ./server > out.log 2>&1 &',
        flags: [{ flag: '&', desc: '放到后台运行，Shell继续响应' }, { flag: 'nohup', desc: '忽略SIGHUP信号，终端关闭后进程继续' }, { flag: 'disown', desc: '将已后台运行的进程从Shell作业列表移除' }, { flag: 'jobs', desc: '列出当前Shell的后台作业' }, { flag: 'fg %N', desc: '把编号为N的后台作业移到前台' }] },
    ],
  },
  {
    label: 'File System', icon: '📁', color: '#ffa657',
    cmds: [
      { cmd: 'ls',          desc: 'List directory contents',                      example: 'ls -lah /proc/1/',
        flags: [{ flag: '-l', desc: '长格式：权限/链接数/用户/组/大小/时间/名' }, { flag: '-a', desc: '显示所有文件，包括以.开头的隐藏文件' }, { flag: '-h', desc: 'human-readable：文件大小显示为K/M/G' }, { flag: '-t', desc: '按修改时间排序（最新在前）' }, { flag: '-r', desc: '反向排序' }, { flag: '-S', desc: '按文件大小排序（最大在前）' }, { flag: '-R', desc: '递归列出子目录' }, { flag: '-i', desc: '显示inode号' }, { flag: '-1', desc: '每行只显示一个文件名' }] },
      { cmd: 'find',        desc: 'Search files by name, type, size, time',      example: 'find / -name "*.conf" -type f',
        flags: [{ flag: '-name "*.log"', desc: '按文件名匹配（支持通配符）' }, { flag: '-type f/d/l', desc: '文件类型：f=普通文件 d=目录 l=符号链接' }, { flag: '-size +100M', desc: '大于100MB的文件（+大于 -小于）' }, { flag: '-mtime -7', desc: '7天内修改过的文件' }, { flag: '-exec cmd {} \\;', desc: '对每个找到的文件执行命令' }, { flag: '-maxdepth N', desc: '限制搜索深度为N层' }, { flag: '-perm 644', desc: '按权限查找' }] },
      { cmd: 'grep',        desc: 'Search text patterns in files',               example: 'grep -rn "TODO" src/',
        flags: [{ flag: '-r', desc: '递归搜索目录下所有文件' }, { flag: '-n', desc: '显示匹配行号' }, { flag: '-i', desc: '忽略大小写' }, { flag: '-v', desc: '反向匹配（不包含该模式的行）' }, { flag: '-l', desc: '只输出匹配的文件名' }, { flag: '-c', desc: '只输出每个文件的匹配行数' }, { flag: '-E', desc: '使用扩展正则表达式（ERE）' }, { flag: '-A N', desc: '显示匹配行后N行上下文' }, { flag: '--color', desc: '高亮显示匹配部分' }] },
      { cmd: 'chmod',       desc: 'Change file permissions',                     example: 'chmod 755 script.sh',
        flags: [{ flag: '755', desc: 'rwxr-xr-x：所有者rwx，组和其他r-x' }, { flag: '644', desc: 'rw-r--r--：所有者rw，其他只读' }, { flag: '600', desc: 'rw-------：私钥文件权限' }, { flag: '-R', desc: '递归修改目录下所有文件' }, { flag: '+x', desc: '给所有人添加执行权限' }, { flag: 'u+s', desc: 'SUID位：以文件所有者身份运行' }] },
      { cmd: 'find+xargs',  desc: 'Find files then batch-process them',          example: 'find . -name "*.log" | xargs rm -f',
        flags: [{ flag: 'xargs -I {}', desc: '用{}替换文件名，如 xargs -I {} mv {} /bak' }, { flag: 'xargs -P N', desc: 'N个进程并行执行' }, { flag: 'xargs -0', desc: '处理含空格的文件名（配合find -print0）' }] },
      { cmd: 'df',          desc: 'Show disk space usage by filesystem',         example: 'df -h',
        flags: [{ flag: '-h', desc: '以人类可读格式显示（K/M/G）' }, { flag: '-T', desc: '同时显示文件系统类型（ext4/xfs/tmpfs）' }, { flag: '-i', desc: '显示inode使用情况而非磁盘空间' }] },
      { cmd: 'du',          desc: 'Estimate file/directory disk usage',          example: 'du -sh /var/log/*',
        flags: [{ flag: '-s', desc: '只显示总计，不列出子目录' }, { flag: '-h', desc: '人类可读格式' }, { flag: '-a', desc: '列出所有文件（不只是目录）' }, { flag: '--max-depth=N', desc: '只统计到第N层目录' }, { flag: '-c', desc: '最后一行显示总计' }] },
      { cmd: 'dd',          desc: 'Low-level block copy / convert',              example: 'dd if=/dev/zero of=disk.img bs=1M count=100',
        flags: [{ flag: 'if=FILE', desc: '输入文件（Input File），/dev/sda、/dev/zero、/dev/urandom' }, { flag: 'of=FILE', desc: '输出文件（Output File）' }, { flag: 'bs=SIZE', desc: '块大小，如1M=1048576字节' }, { flag: 'count=N', desc: '复制N个块' }, { flag: 'status=progress', desc: '显示实时进度' }, { flag: 'conv=sync', desc: '不足块大小时用0填充' }] },
    ],
  },
  {
    label: 'Network', icon: '🌐', color: '#3fb950',
    cmds: [
      { cmd: 'ip',          desc: 'Modern network config tool (replaces ifconfig)', example: 'ip addr show eth0',
        flags: [{ flag: 'addr show', desc: '显示所有网络接口和IP地址' }, { flag: 'route show', desc: '显示路由表' }, { flag: 'link set eth0 up/down', desc: '启用/禁用网卡' }, { flag: 'addr add 1.2.3.4/24 dev eth0', desc: '临时添加IP地址' }, { flag: 'neigh show', desc: '显示ARP缓存（等同于arp -n）' }] },
      { cmd: 'ss',          desc: 'Socket statistics (replaces netstat)',         example: 'ss -tlnp',
        flags: [{ flag: '-t', desc: 'TCP sockets' }, { flag: '-u', desc: 'UDP sockets' }, { flag: '-l', desc: '只显示监听（LISTEN）状态的socket' }, { flag: '-n', desc: '不解析域名和服务名，直接显示数字' }, { flag: '-p', desc: '显示占用socket的进程和PID' }, { flag: '-a', desc: '显示所有socket（包括非监听的）' }, { flag: '-s', desc: '显示统计汇总' }] },
      { cmd: 'curl',        desc: 'Transfer data to/from URLs',                  example: 'curl -X POST -H "Content-Type: application/json" -d \'{"key":"val"}\' http://api/',
        flags: [{ flag: '-X METHOD', desc: '指定HTTP方法：GET/POST/PUT/DELETE' }, { flag: '-H "Header: val"', desc: '添加请求头' }, { flag: '-d "data"', desc: '发送请求体（POST body）' }, { flag: '-o file', desc: '保存响应到文件' }, { flag: '-I', desc: '只显示响应头（HEAD请求）' }, { flag: '-L', desc: '跟随重定向' }, { flag: '-s', desc: '静默模式（不显示进度）' }, { flag: '-v', desc: '详细模式（显示请求和响应头）' }, { flag: '-k', desc: '忽略SSL证书验证' }] },
      { cmd: 'tcpdump',     desc: 'Capture and analyse network packets',         example: 'tcpdump -i eth0 -w cap.pcap tcp port 80',
        flags: [{ flag: '-i eth0', desc: '指定网络接口（any=全部接口）' }, { flag: '-n', desc: '不解析域名（更快）' }, { flag: '-w file.pcap', desc: '保存到文件（可用Wireshark分析）' }, { flag: '-r file.pcap', desc: '读取已保存的pcap文件' }, { flag: 'port 80', desc: '只抓取端口80的包' }, { flag: 'host 1.2.3.4', desc: '只抓取和指定主机的通信' }, { flag: '-X', desc: '以十六进制+ASCII显示包内容' }, { flag: '-c N', desc: '只抓N个包后退出' }] },
      { cmd: 'iptables',    desc: 'Kernel packet filtering rules',               example: 'iptables -A INPUT -p tcp --dport 22 -j ACCEPT',
        flags: [{ flag: '-L -n -v', desc: '列出所有规则（-n不解析DNS，-v显示包计数）' }, { flag: '-A CHAIN', desc: '追加规则到链（INPUT/OUTPUT/FORWARD）' }, { flag: '-I CHAIN N', desc: '插入规则到第N条位置' }, { flag: '-D CHAIN N', desc: '删除第N条规则' }, { flag: '-p tcp/udp', desc: '匹配协议' }, { flag: '--dport N', desc: '匹配目标端口' }, { flag: '-j ACCEPT/DROP/REJECT', desc: '动作：接受/丢弃/拒绝' }, { flag: '-s IP/CIDR', desc: '匹配源IP' }] },
      { cmd: 'ssh',         desc: 'Secure shell remote login',                   example: 'ssh -i ~/.ssh/key -p 2222 user@host',
        flags: [{ flag: '-i key', desc: '指定私钥文件（不用密码）' }, { flag: '-p port', desc: '指定SSH端口（默认22）' }, { flag: '-L 8080:host:80', desc: '本地端口转发（隧道）' }, { flag: '-R 8080:host:80', desc: '远程端口转发' }, { flag: '-D 1080', desc: 'SOCKS5代理' }, { flag: '-N', desc: '只建立隧道，不执行命令' }, { flag: '-v', desc: '详细输出，调试连接问题' }] },
    ],
  },
  {
    label: 'Memory', icon: '🧠', color: '#a371f7',
    cmds: [
      { cmd: 'free',        desc: 'Show RAM and swap usage',                     example: 'free -h',
        flags: [{ flag: '-h', desc: '人类可读格式（K/M/G）' }, { flag: '-s N', desc: '每N秒刷新一次' }, { flag: '-m', desc: '以MB为单位显示' }, { flag: '-t', desc: '显示Total行（物理内存+swap总计）' }] },
      { cmd: 'vmstat',      desc: 'Virtual memory, I/O, CPU statistics',        example: 'vmstat 1 5',
        flags: [{ flag: 'N', desc: '刷新间隔（秒）' }, { flag: 'M', desc: '刷新M次后退出' }, { flag: '-m', desc: '显示slab分配器统计' }, { flag: '-d', desc: '显示磁盘统计' }, { flag: '-s', desc: '显示内存事件汇总表' }] },
      { cmd: 'pmap',        desc: 'Report process memory map',                  example: 'pmap -x 1234',
        flags: [{ flag: '-x', desc: '扩展模式：显示RSS、脏页、映射详情' }, { flag: '-d', desc: '设备格式：显示设备号和偏移' }, { flag: '-q', desc: '静默模式：不显示页眉页脚' }] },
      { cmd: 'valgrind',    desc: 'Memory error detector & profiler',           example: 'valgrind --leak-check=full --show-leak-kinds=all ./prog',
        flags: [{ flag: '--leak-check=full', desc: '详细报告每个内存泄漏' }, { flag: '--track-origins=yes', desc: '追踪未初始化内存的来源' }, { flag: '--error-exitcode=1', desc: '有错误时返回非0退出码（用于CI）' }, { flag: '--tool=massif', desc: '堆分析器（生成内存增长图）' }, { flag: '--tool=callgrind', desc: 'CPU性能分析（配合kcachegrind查看）' }] },
    ],
  },
  {
    label: 'Kernel/System', icon: '🔧', color: '#e3b341',
    cmds: [
      { cmd: 'uname',       desc: 'Print system and kernel information',        example: 'uname -a',
        flags: [{ flag: '-a', desc: '输出全部信息：内核名/hostname/版本/arch等' }, { flag: '-r', desc: '只输出内核版本号（如 6.1.0-27）' }, { flag: '-m', desc: '硬件架构（x86_64 / aarch64）' }, { flag: '-n', desc: '网络主机名' }, { flag: '-s', desc: '内核名称（Linux）' }] },
      { cmd: 'sysctl',      desc: 'Read/write kernel parameters at runtime',   example: 'sysctl vm.swappiness=10',
        flags: [{ flag: '-a', desc: '显示所有内核参数' }, { flag: '-w key=val', desc: '写入参数值（临时，重启失效）' }, { flag: '-p file', desc: '从文件加载参数（默认/etc/sysctl.conf）' }, { flag: 'net.ipv4.ip_forward', desc: '=1开启IP转发（路由/NAT必需）' }, { flag: 'vm.swappiness', desc: '0=尽量不用swap，100=积极使用swap' }] },
      { cmd: 'dmesg',       desc: 'Kernel ring buffer messages',               example: 'dmesg -T | grep error',
        flags: [{ flag: '-T', desc: '显示人类可读时间戳（而非秒数）' }, { flag: '-f kern', desc: '过滤：只显示内核消息' }, { flag: '-l err,warn', desc: '只显示error和warning级别' }, { flag: '-w', desc: '持续监视（类似 tail -f）' }, { flag: '--clear', desc: '清空ring buffer（需root）' }] },
      { cmd: 'perf',        desc: 'Linux performance analysis tool',           example: 'perf stat ./prog',
        flags: [{ flag: 'stat', desc: '统计CPU性能计数器（指令数/缓存miss/分支预测）' }, { flag: 'record', desc: '采样记录，生成 perf.data' }, { flag: 'report', desc: '分析perf.data，显示热点函数' }, { flag: 'top', desc: '实时显示CPU热点（类似top）' }, { flag: '-e event', desc: '指定事件：cache-misses, page-faults, syscalls:*' }, { flag: '-g', desc: '记录调用栈（flamegraph用）' }] },
      { cmd: 'journalctl',  desc: 'Query systemd journal logs',                example: 'journalctl -u nginx -f',
        flags: [{ flag: '-u service', desc: '查看指定服务的日志' }, { flag: '-f', desc: '实时跟随（类似tail -f）' }, { flag: '-n N', desc: '显示最后N行' }, { flag: '--since "1h ago"', desc: '显示最近1小时的日志' }, { flag: '-p err', desc: '只显示error级别以上' }, { flag: '-b', desc: '只显示本次启动的日志' }] },
    ],
  },
  {
    label: 'Users/Perms', icon: '🔐', color: '#ff6b6b',
    cmds: [
      { cmd: 'id',          desc: 'Print user and group identity',              example: 'id username',
        flags: [{ flag: '(无参数)', desc: '显示当前用户的uid/gid/groups' }, { flag: 'username', desc: '显示指定用户的身份信息' }, { flag: '-u', desc: '只输出UID数字' }, { flag: '-g', desc: '只输出primary GID' }, { flag: '-G', desc: '输出所有组的GID' }, { flag: '-n', desc: '输出名称而非数字（配合-u/-g/-G使用）' }] },
      { cmd: 'sudo',        desc: 'Execute command as superuser',              example: 'sudo -u www-data nginx -t',
        flags: [{ flag: '-u user', desc: '以指定用户身份运行（不限于root）' }, { flag: '-l', desc: '列出当前用户的sudo权限' }, { flag: '-i', desc: '以root身份登录交互式shell' }, { flag: '-s', desc: '以root身份启动shell（不切换目录）' }, { flag: '-E', desc: '保留当前用户的环境变量' }, { flag: '-k', desc: '清除sudo缓存的密码时间戳' }] },
      { cmd: 'chmod',       desc: 'Change file mode bits',                     example: 'chmod u+x,g-w file',
        flags: [{ flag: 'u/g/o/a', desc: 'u=所有者 g=组 o=其他 a=全部' }, { flag: '+/-/=', desc: '+添加 -删除 =精确设置' }, { flag: 'r/w/x', desc: 'r=读(4) w=写(2) x=执行(1)' }, { flag: 's (SUID/SGID)', desc: 'u+s=SUID(以文件主运行) g+s=SGID' }, { flag: 't (sticky)', desc: '目录粘滞位：只有文件主可删除（/tmp）' }, { flag: '-R', desc: '递归修改目录下所有文件' }] },
      { cmd: 'chown',       desc: 'Change file owner and group',               example: 'chown -R www-data:www-data /var/www',
        flags: [{ flag: 'user:group', desc: '同时修改所有者和组' }, { flag: '-R', desc: '递归修改目录下所有文件' }, { flag: ':group', desc: '只修改组，不改所有者' }, { flag: '--reference=file', desc: '参考另一文件的所有者' }] },
      { cmd: 'useradd',     desc: 'Create a new user account',                 example: 'useradd -m -s /bin/bash -G sudo alice',
        flags: [{ flag: '-m', desc: '创建home目录（/home/username）' }, { flag: '-s /bin/bash', desc: '指定登录shell' }, { flag: '-G groups', desc: '附加到指定组（逗号分隔多个）' }, { flag: '-u UID', desc: '指定UID' }, { flag: '-d /home/dir', desc: '指定home目录路径' }, { flag: 'passwd username', desc: '为用户设置密码' }] },
      { cmd: 'su',          desc: 'Switch user (substitute user)',              example: 'su - alice',
        flags: [{ flag: '- / -l', desc: '完整登录shell（加载目标用户环境）' }, { flag: '-c "cmd"', desc: '以目标用户身份执行一条命令' }, { flag: '-s /bin/sh', desc: '指定shell（默认用/etc/passwd中的）' }] },
    ],
  },
  {
    label: 'Disk & I/O', icon: '💾', color: '#56d364',
    cmds: [
      { cmd: 'lsblk',       desc: 'List block devices (disks, partitions)',     example: 'lsblk -f',
        flags: [{ flag: '-f', desc: '显示文件系统类型、UUID、挂载点' }, { flag: '-d', desc: '只显示磁盘，不显示分区' }, { flag: '-o NAME,SIZE,TYPE,MOUNTPOINT', desc: '自定义输出列' }, { flag: '-J', desc: 'JSON格式输出（方便脚本处理）' }] },
      { cmd: 'fdisk',       desc: 'Partition table manipulator for MBR disks', example: 'fdisk -l /dev/sda',
        flags: [{ flag: '-l', desc: '列出所有磁盘的分区表（不修改）' }, { flag: '/dev/sda', desc: '进入交互模式编辑分区表' }, { flag: 'p (交互)', desc: '打印分区表' }, { flag: 'n (交互)', desc: '新建分区' }, { flag: 'w (交互)', desc: '写入分区表并退出（生效）' }] },
      { cmd: 'iostat',      desc: 'CPU and I/O statistics for devices',        example: 'iostat -x 1 5',
        flags: [{ flag: '-x', desc: '扩展统计：await/svctm/util%（磁盘繁忙程度）' }, { flag: '-d', desc: '只显示磁盘统计（不含CPU）' }, { flag: 'N', desc: '刷新间隔（秒）' }, { flag: 'M', desc: '刷新M次后退出' }, { flag: 'util%', desc: 'I/O利用率，接近100%说明磁盘是瓶颈' }] },
      { cmd: 'hdparm',      desc: 'Get/set SATA/IDE disk parameters & test speed', example: 'hdparm -tT /dev/sda',
        flags: [{ flag: '-tT', desc: '测速：-T=缓存读（内存速度）-t=磁盘读速度' }, { flag: '-I', desc: '显示硬盘详细信息（型号/序列号/支持特性）' }, { flag: '-S N', desc: '设置休眠时间（N×5秒=休眠，0=禁用）' }] },
      { cmd: 'mount',       desc: 'Mount a filesystem',                        example: 'mount -t ext4 /dev/sdb1 /mnt/data',
        flags: [{ flag: '-t type', desc: '文件系统类型：ext4/xfs/ntfs/vfat/tmpfs' }, { flag: '-o ro', desc: '以只读方式挂载' }, { flag: '-o remount,rw', desc: '重新挂载为读写（不需要先umount）' }, { flag: '-o noatime', desc: '不更新访问时间（提升SSD寿命）' }, { flag: '--bind src dst', desc: '将目录绑定挂载到另一位置' }] },
      { cmd: 'rsync',       desc: 'Fast incremental file/directory sync',      example: 'rsync -avz --delete src/ user@host:/dst/',
        flags: [{ flag: '-a', desc: '归档模式：递归+保留权限/时间/符号链接' }, { flag: '-v', desc: '详细输出（显示传输的文件）' }, { flag: '-z', desc: '传输时压缩（带宽受限时用）' }, { flag: '--delete', desc: '删除目标中源没有的文件（镜像同步）' }, { flag: '--exclude="*.log"', desc: '排除匹配的文件' }, { flag: '-n / --dry-run', desc: '模拟运行，不实际传输（先预览）' }, { flag: '--progress', desc: '显示每个文件的进度' }] },
    ],
  },
]

// ─── IPC Methods ──────────────────────────────────────────────────────────────

const IPC_LIST: IpcEntry[] = [
  {
    name: 'Pipe (|)', icon: '🪣',
    desc: 'Unidirectional byte stream connecting stdout of one process to stdin of another. Created by pipe(2) syscall; exists only while processes are alive.',
    pros: 'Zero setup, shell-native, low overhead', cons: 'Unidirectional, anonymous, related processes only (by default)',
    code: `/* pipe(2) — parent writes, child reads */
#include <unistd.h>
#include <stdio.h>

int main() {
    int fd[2];
    pipe(fd);            /* fd[0]=read  fd[1]=write */

    if (fork() == 0) {   /* child */
        close(fd[1]);
        char buf[64];
        read(fd[0], buf, sizeof(buf));
        printf("child got: %s\\n", buf);
    } else {             /* parent */
        close(fd[0]);
        write(fd[1], "hello", 6);
    }
}`,
  },
  {
    name: 'Named Pipe (FIFO)', icon: '🔄',
    desc: 'Pipe with a filesystem name. Allows unrelated processes to communicate. Created with mkfifo(3). Persists in the file system.',
    pros: 'Unrelated processes, visible in fs, POSIX', cons: 'Still unidirectional, blocking without O_NONBLOCK',
    code: `/* Producer */
int fd = open("/tmp/myfifo", O_WRONLY);
write(fd, "ping", 5);
close(fd);

/* Consumer (separate process) */
mkfifo("/tmp/myfifo", 0666);        /* create once */
int fd = open("/tmp/myfifo", O_RDONLY);
char buf[64];
read(fd, buf, sizeof(buf));
printf("got: %s\\n", buf);
close(fd);`,
  },
  {
    name: 'Signal', icon: '🚨',
    desc: 'Asynchronous notification sent to a process. ~30 standard signals (SIGKILL, SIGTERM, SIGSEGV …). Handler runs in the receiving process context.',
    pros: 'Instant async notification, built into every UNIX process', cons: 'Carries almost no data, race conditions with signal handlers',
    code: `#include <signal.h>
#include <stdio.h>
#include <unistd.h>

void handler(int sig) {
    printf("caught signal %d\\n", sig);
}

int main() {
    signal(SIGUSR1, handler);
    kill(getpid(), SIGUSR1); /* send to self */
    pause();                 /* wait for signal */
    return 0;
}`,
  },
  {
    name: 'Shared Memory', icon: '🤝',
    desc: 'Multiple processes map the same physical memory pages. Fastest IPC — no kernel copy. Needs explicit synchronization (mutex/semaphore).',
    pros: 'Fastest possible (zero copy), arbitrary data structures', cons: 'Needs external sync, hard to debug, POSIX (shm_open) or SysV API',
    code: `/* Writer */
int fd = shm_open("/myshm", O_CREAT|O_RDWR, 0666);
ftruncate(fd, 4096);
void* ptr = mmap(NULL, 4096,
    PROT_READ|PROT_WRITE, MAP_SHARED, fd, 0);
sprintf((char*)ptr, "shared data");

/* Reader (separate process) */
int fd = shm_open("/myshm", O_RDONLY, 0);
void* ptr = mmap(NULL, 4096,
    PROT_READ, MAP_SHARED, fd, 0);
printf("%s\\n", (char*)ptr);
shm_unlink("/myshm");`,
  },
  {
    name: 'Message Queue', icon: '📨',
    desc: 'Kernel-managed queue of typed messages. Processes can send/receive with priority. POSIX mq_open/mq_send or SysV msgget/msgsnd.',
    pros: 'Structured messages, priority ordering, decoupled sender/receiver', cons: 'Kernel limits on queue size, slower than shared memory',
    code: `/* Sender */
mqd_t mq = mq_open("/myqueue",
    O_WRONLY | O_CREAT, 0666, NULL);
mq_send(mq, "hello", 6, 0 /* priority */);
mq_close(mq);

/* Receiver */
struct mq_attr attr = { .mq_maxmsg=10, .mq_msgsize=256 };
mqd_t mq = mq_open("/myqueue",
    O_RDONLY | O_CREAT, 0666, &attr);
char buf[256];
mq_receive(mq, buf, sizeof(buf), NULL);
printf("got: %s\\n", buf);
mq_close(mq);
mq_unlink("/myqueue");`,
  },
  {
    name: 'Socket', icon: '🔌',
    desc: 'Universal IPC and network communication. Unix domain sockets for local IPC (fast, file-like path). TCP/UDP sockets for network communication.',
    pros: 'Works across machines, bidirectional, stream or datagram', cons: 'More setup, syscall overhead for local IPC vs shared memory',
    code: `/* Server (Unix domain socket) */
int srv = socket(AF_UNIX, SOCK_STREAM, 0);
struct sockaddr_un addr = { .sun_family = AF_UNIX };
strcpy(addr.sun_path, "/tmp/sock");
bind(srv, (struct sockaddr*)&addr, sizeof(addr));
listen(srv, 5);
int conn = accept(srv, NULL, NULL);
write(conn, "hi", 3);

/* Client */
int s = socket(AF_UNIX, SOCK_STREAM, 0);
connect(s, (struct sockaddr*)&addr, sizeof(addr));
char buf[16];
read(s, buf, sizeof(buf));
printf("%s\\n", buf);`,
  },
  {
    name: 'Semaphore', icon: '🚦',
    desc: 'Counter for synchronizing concurrent access to shared resources. sem_wait() decrements (blocks if 0); sem_post() increments. Used with shared memory.',
    pros: 'Lightweight sync primitive, POSIX standard', cons: 'Not a data channel — synchronization only, starvation risk',
    code: `#include <semaphore.h>
#include <pthread.h>

sem_t sem;
int counter = 0;

void* worker(void* _) {
    sem_wait(&sem);    /* P (acquire) */
    counter++;         /* critical section */
    sem_post(&sem);    /* V (release) */
    return NULL;
}

int main() {
    sem_init(&sem, 0, 1); /* binary semaphore */
    pthread_t t1, t2;
    pthread_create(&t1, NULL, worker, NULL);
    pthread_create(&t2, NULL, worker, NULL);
    pthread_join(t1, NULL);
    pthread_join(t2, NULL);
    sem_destroy(&sem);
    return 0; /* counter == 2 */
}`,
  },
]

// ─── task_struct fields ───────────────────────────────────────────────────────

const TASK_GROUPS: { label: string; color: string; fields: StructField[] }[] = [
  {
    label: 'Identity', color: '#58a6ff',
    fields: [
      { name: 'pid',            type: 'pid_t',                 desc: 'Process ID — unique per-process number' },
      { name: 'tgid',           type: 'pid_t',                 desc: 'Thread group ID — same as main thread PID for threads' },
      { name: 'comm',           type: 'char[16]',              desc: 'Short executable name (visible in ps, top)' },
      { name: 'parent',         type: 'struct task_struct *',  desc: 'Pointer to parent process (forms the process tree)' },
      { name: 'children',       type: 'struct list_head',      desc: 'Doubly-linked list of child processes' },
      { name: 'sibling',        type: 'struct list_head',      desc: 'Entry in parent\'s children list' },
      { name: 'tasks',          type: 'struct list_head',      desc: 'Entry in global process list (all task_structs form a circle)' },
    ],
  },
  {
    label: 'State & Scheduling', color: '#3fb950',
    fields: [
      { name: 'state',          type: 'volatile long',          desc: 'TASK_RUNNING | TASK_INTERRUPTIBLE | TASK_UNINTERRUPTIBLE | __TASK_STOPPED …' },
      { name: 'prio',           type: 'int',                   desc: 'Dynamic priority (can be boosted by kernel)' },
      { name: 'static_prio',    type: 'int',                   desc: 'Nice-value based static priority (100–139 for normal tasks)' },
      { name: 'rt_priority',    type: 'unsigned int',          desc: 'Real-time priority (1–99); 0 for normal tasks' },
      { name: 'sched_class',    type: 'const struct sched_class *', desc: 'Pointer to scheduling policy class (CFS / RT / Deadline …)' },
      { name: 'se',             type: 'struct sched_entity',   desc: 'CFS scheduler entity — embeds vruntime (virtual runtime)' },
      { name: 'policy',         type: 'unsigned int',          desc: 'SCHED_NORMAL | SCHED_FIFO | SCHED_RR | SCHED_DEADLINE' },
      { name: 'cpus_ptr',       type: 'cpumask_t *',           desc: 'CPU affinity mask — which CPUs this task may run on' },
    ],
  },
  {
    label: 'Memory', color: '#d2a8ff',
    fields: [
      { name: 'mm',             type: 'struct mm_struct *',    desc: 'Virtual memory space descriptor (NULL for kernel threads)' },
      { name: 'active_mm',      type: 'struct mm_struct *',    desc: 'Active mm — borrowed from last user-space process by kernel threads' },
      { name: 'stack',          type: 'void *',                desc: 'Pointer to the kernel stack (8 KB or 16 KB per task)' },
      { name: 'thread_info',    type: 'struct thread_info',    desc: 'Arch-specific thread info (lives at bottom of kernel stack)' },
    ],
  },
  {
    label: 'Files & I/O', color: '#ffa657',
    fields: [
      { name: 'fs',             type: 'struct fs_struct *',    desc: 'Root dir, current working dir, umask' },
      { name: 'files',          type: 'struct files_struct *', desc: 'Open file descriptor table (fd → struct file *)' },
    ],
  },
  {
    label: 'Signals', color: '#f85149',
    fields: [
      { name: 'signal',         type: 'struct signal_struct *', desc: 'Shared signal state for the whole thread group' },
      { name: 'sighand',        type: 'struct sighand_struct *',desc: 'Signal handlers (sa_handler, sa_flags per signal)' },
      { name: 'pending',        type: 'struct sigpending',      desc: 'Per-thread pending signal queue' },
      { name: 'blocked',        type: 'sigset_t',               desc: 'Blocked (masked) signals bitmask' },
    ],
  },
  {
    label: 'Security & Credentials', color: '#e3b341',
    fields: [
      { name: 'cred',           type: 'const struct cred *',   desc: 'Effective UID/GID, capabilities — determines what process may do' },
      { name: 'real_cred',      type: 'const struct cred *',   desc: 'Real credentials (before setuid/setgid)' },
    ],
  },
  {
    label: 'Time & Stats', color: '#79c0ff',
    fields: [
      { name: 'utime',          type: 'u64',                   desc: 'CPU time spent in user mode (nanoseconds)' },
      { name: 'stime',          type: 'u64',                   desc: 'CPU time spent in kernel mode (nanoseconds)' },
      { name: 'start_time',     type: 'u64',                   desc: 'Monotonic clock time when the process started' },
      { name: 'nvcsw / nivcsw', type: 'unsigned long',         desc: 'Voluntary / involuntary context switch counts' },
    ],
  },
]

const MM_FIELDS: StructField[] = [
  { name: 'mmap',       type: 'struct vm_area_struct *', desc: 'Head of the sorted VMA list (code, data, heap, stack, mmap regions)' },
  { name: 'mm_rb',      type: 'struct rb_root',          desc: 'Red-black tree of VMAs — O(log n) lookup by address' },
  { name: 'pgd',        type: 'pgd_t *',                 desc: 'Page Global Directory — root of the 4-level page table' },
  { name: 'start_code', type: 'unsigned long',           desc: 'Start address of text (code) segment' },
  { name: 'end_code',   type: 'unsigned long',           desc: 'End address of text segment' },
  { name: 'start_data', type: 'unsigned long',           desc: 'Start of initialized data segment (.data section)' },
  { name: 'start_brk',  type: 'unsigned long',           desc: 'Start of heap; end_brk grows upward with brk()/sbrk()' },
  { name: 'start_stack',type: 'unsigned long',           desc: 'Start of main thread stack (grows downward)' },
  { name: 'arg_start',  type: 'unsigned long',           desc: 'Start of command-line arguments (argv)' },
  { name: 'env_start',  type: 'unsigned long',           desc: 'Start of environment variables' },
  { name: 'total_vm',   type: 'unsigned long',           desc: 'Total virtual memory mapped (pages)' },
  { name: 'rss',        type: 'atomic_long_t',           desc: 'Resident Set Size — pages actually in physical RAM' },
]

// ─── Visual: IPC Flow Diagram ─────────────────────────────────────────────────

type IpcFlowDef = { mid: string; color: string; bidir: boolean; detail: string }
const IPC_FLOWS: Record<string, IpcFlowDef> = {
  'Pipe (|)':          { mid: 'kernel\nbuffer', color: '#4d8fff', bidir: false, detail: 'fd[1] write → fd[0] read' },
  'Named Pipe (FIFO)': { mid: '/tmp/myfifo\n(filesystem)', color: '#3fb950', bidir: false, detail: 'open → write / read → close' },
  'Signal':            { mid: 'SIGUSR1\n(async notify)', color: '#f85149', bidir: false, detail: 'kill(pid, sig) → handler()' },
  'Shared Memory':     { mid: 'shared\nmemory page', color: '#a371f7', bidir: true,  detail: 'mmap → read/write → munmap' },
  'Message Queue':     { mid: 'kernel\nmsg queue', color: '#ffa657', bidir: false, detail: 'mq_send → mq_receive' },
  'Socket':            { mid: 'TCP / Unix\nstream', color: '#39d353', bidir: true,  detail: 'connect ↔ accept → read/write' },
  'Semaphore':         { mid: 'sem counter\n(sync only)', color: '#e3b341', bidir: true,  detail: 'sem_wait (P) / sem_post (V)' },
}

function IpcFlowDiagram({ name }: { name: string }) {
  const def = IPC_FLOWS[name]
  if (!def) return null
  const { mid, color, bidir, detail } = def
  const W = 420, H = 110
  const pW = 90, pH = 44, midW = 110, midH = 44
  const pAy = H/2, midX = (W - midW)/2, midY = H/2
  const p1X = 30, p2X = W - pW - 30

  const midLines = mid.split('\n')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, display: 'block' }}>
      <defs>
        <marker id={`iaf-${name}`} markerWidth={8} markerHeight={8} refX={7} refY={3.5} orient="auto">
          <path d="M0,0 L0,7 L8,3.5z" fill={color} />
        </marker>
        <marker id={`iar-${name}`} markerWidth={8} markerHeight={8} refX={1} refY={3.5} orient="auto">
          <path d="M8,0 L8,7 L0,3.5z" fill={color} />
        </marker>
      </defs>

      {/* Process A */}
      <rect x={p1X} y={pAy-pH/2} width={pW} height={pH} rx={8}
        fill="rgba(77,143,255,0.14)" stroke="#4d8fff" strokeWidth={1.8} />
      <text x={p1X+pW/2} y={pAy-6} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--text-primary)">Process A</text>
      <text x={p1X+pW/2} y={pAy+10} textAnchor="middle" fontSize={9} fill="var(--text-muted)">sender</text>

      {/* Mechanism box */}
      <rect x={midX} y={midY-midH/2} width={midW} height={midH} rx={8}
        fill={`${color}22`} stroke={color} strokeWidth={1.8} strokeDasharray="5 3" />
      {midLines.map((l,i) => (
        <text key={i} x={midX+midW/2} y={midY - (midLines.length-1)*7 + i*14}
          textAnchor="middle" fontSize={10} fontWeight={700} fill={color}>{l}</text>
      ))}

      {/* Process B */}
      <rect x={p2X} y={pAy-pH/2} width={pW} height={pH} rx={8}
        fill="rgba(63,185,80,0.14)" stroke="#3fb950" strokeWidth={1.8} />
      <text x={p2X+pW/2} y={pAy-6} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--text-primary)">Process B</text>
      <text x={p2X+pW/2} y={pAy+10} textAnchor="middle" fontSize={9} fill="var(--text-muted)">receiver</text>

      {/* Forward arrow A → mechanism */}
      <line x1={p1X+pW} y1={pAy} x2={midX-2} y2={pAy}
        stroke={color} strokeWidth={1.8} markerEnd={`url(#iaf-${name})`} />
      {/* mechanism → B */}
      <line x1={midX+midW} y1={pAy} x2={p2X-2} y2={pAy}
        stroke={color} strokeWidth={1.8} markerEnd={`url(#iaf-${name})`} />
      {/* Reverse arrows for bidirectional */}
      {bidir && (
        <>
          <line x1={midX-2} y1={pAy+10} x2={p1X+pW} y2={pAy+10}
            stroke={color} strokeWidth={1.2} strokeDasharray="4 3" markerEnd={`url(#iar-${name})`} />
          <line x1={p2X-2} y1={pAy+10} x2={midX+midW} y2={pAy+10}
            stroke={color} strokeWidth={1.2} strokeDasharray="4 3" markerEnd={`url(#iar-${name})`} />
        </>
      )}

      {/* Detail label */}
      <text x={W/2} y={H-6} textAnchor="middle" fontSize={9} fill="var(--text-muted)" fontStyle="italic">{detail}</text>
    </svg>
  )
}

// ─── Visual: Process Tree SVG ─────────────────────────────────────────────────

function ProcessTreeDiagram() {
  type PNode = { label: string; sub?: string; x: number; y: number; color: string }
  const nodes: PNode[] = [
    { label: 'idle',    sub: 'pid=0',   x: 220, y: 28,  color: '#a371f7' },
    { label: 'systemd', sub: 'pid=1',   x: 220, y: 88,  color: '#58a6ff' },
    { label: 'sshd',    sub: 'pid=xxx', x: 90,  y: 150, color: '#3fb950' },
    { label: 'cron',    sub: 'pid=yyy', x: 220, y: 150, color: '#3fb950' },
    { label: 'nginx',   sub: 'pid=zzz', x: 350, y: 150, color: '#3fb950' },
    { label: 'bash',    sub: 'pid=aaa', x: 90,  y: 210, color: '#ffa657' },
    { label: 'your-app',sub: 'pid=bbb', x: 90,  y: 268, color: '#e3b341' },
    { label: 'thread-1',sub: 'tid=bbc', x: 30,  y: 326, color: '#79c0ff' },
    { label: 'thread-2',sub: 'tid=bbd', x: 150, y: 326, color: '#79c0ff' },
  ]
  const edges: [number,number][] = [[0,1],[1,2],[1,3],[1,4],[2,5],[5,6],[6,7],[6,8]]
  const W = 440, H = 360, bW = 90, bH = 36, R = 6

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, display: 'block' }}>
      <defs>
        <marker id="pt-arr" markerWidth={8} markerHeight={8} refX={7} refY={3.5} orient="auto">
          <path d="M0,0 L0,7 L8,3.5z" fill="rgba(88,166,255,0.6)" />
        </marker>
      </defs>
      {edges.map(([a,b],i) => (
        <line key={i}
          x1={nodes[a].x} y1={nodes[a].y + bH/2}
          x2={nodes[b].x} y2={nodes[b].y - bH/2}
          stroke="rgba(88,166,255,0.35)" strokeWidth={1.5} markerEnd="url(#pt-arr)" />
      ))}
      {nodes.map((n,i) => (
        <g key={i}>
          <rect x={n.x - bW/2} y={n.y - bH/2} width={bW} height={bH} rx={R}
            fill={`${n.color}20`} stroke={n.color} strokeWidth={i===0?2.5:1.8} />
          <text x={n.x} y={n.y-4} textAnchor="middle" fontSize={11} fontWeight={700} fill={n.color}>{n.label}</text>
          <text x={n.x} y={n.y+11} textAnchor="middle" fontSize={9} fill="var(--text-muted)" fontFamily="monospace">{n.sub}</text>
        </g>
      ))}
      {/* thread annotation */}
      <text x={90} y={350} textAnchor="middle" fontSize={9} fill="#79c0ff" fontStyle="italic">
        threads share mm_struct (same address space)
      </text>
    </svg>
  )
}

// ─── Visual: Virtual Address Space ────────────────────────────────────────────

function VmaLayoutDiagram() {
  const segs = [
    { label: 'kernel space',   sub: '(inaccessible)',      color: '#a371f7', h: 36, addr: '0xFFFF…' },
    { label: 'stack',          sub: '↓ grows down',        color: '#f85149', h: 30, addr: '0x7FFF…' },
    { label: 'mmap / libs',    sub: 'shared objs, anon',   color: '#ffa657', h: 30, addr: '' },
    { label: 'heap',           sub: '↑ grows up (brk)',    color: '#3fb950', h: 30, addr: '' },
    { label: 'BSS',            sub: 'uninit globals = 0',  color: '#58a6ff', h: 24, addr: '' },
    { label: 'data (.data)',   sub: 'init globals & statics', color: '#79c0ff', h: 24, addr: '' },
    { label: 'text (.text)',   sub: 'executable code (RX)', color: '#e3b341', h: 24, addr: '0x0040…' },
    { label: 'null / reserved',sub: '(unmapped)',           color: '#444',    h: 20, addr: '0x0000' },
  ]
  const W = 360, padL = 60, barW = 180
  let y = 16
  const rows: { y: number; seg: typeof segs[0] }[] = []
  for (const s of segs) { rows.push({ y, seg: s }); y += s.h + 4 }
  const H = y + 8

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, display: 'block' }}>
      {rows.map(({ y: ry, seg }, i) => (
        <g key={i}>
          {/* address */}
          {seg.addr && (
            <text x={padL-6} y={ry+seg.h/2+4} textAnchor="end" fontSize={8}
              fill="var(--text-muted)" fontFamily="monospace">{seg.addr}</text>
          )}
          {/* bar */}
          <rect x={padL} y={ry} width={barW} height={seg.h} rx={3}
            fill={`${seg.color}28`} stroke={seg.color} strokeWidth={1.5} />
          {/* label */}
          <text x={padL+8} y={ry+seg.h/2+4} fontSize={10} fontWeight={700} fill={seg.color}>{seg.label}</text>
          {/* sublabel */}
          <text x={padL+barW+8} y={ry+seg.h/2+4} fontSize={9} fill="var(--text-muted)" fontStyle="italic">{seg.sub}</text>
        </g>
      ))}
      <text x={padL+barW/2} y={H-2} textAnchor="middle" fontSize={9} fill="var(--text-muted)">
        virtual address space (x86-64, 48-bit)
      </text>
    </svg>
  )
}

// ─── Subsection components ─────────────────────────────────────────────────────

function CommandsTab() {
  const [activeGroup, setActiveGroup] = useState(0)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const group = CMD_GROUPS[activeGroup]
  const filtered = search
    ? CMD_GROUPS.flatMap(g => g.cmds).filter(c => c.cmd.toLowerCase().includes(search.toLowerCase()) || c.desc.toLowerCase().includes(search.toLowerCase()))
    : group.cmds
  const color = search ? '#4d8fff' : group.color

  return (
    <div style={{ display: 'flex', gap: 0, height: '100%' }}>
      {/* Group sidebar */}
      <div style={{ width: 148, flexShrink: 0, borderRight: '1px solid var(--border)', background: 'var(--bg-secondary)', padding: '8px 0', overflowY: 'auto' }}>
        {CMD_GROUPS.map((g, i) => (
          <button key={g.label} onClick={() => { setActiveGroup(i); setSearch(''); setExpanded(null) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: '10px 14px', border: 'none',
              borderLeft: i === activeGroup && !search ? `3px solid ${g.color}` : '3px solid transparent',
              background: i === activeGroup && !search ? 'var(--bg-elevated)' : 'transparent',
              color: i === activeGroup && !search ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer', fontSize: 12, fontWeight: i === activeGroup && !search ? 600 : 400,
            }}>
            <span style={{ fontSize: 15 }}>{g.icon}</span>
            <span>{g.label}</span>
          </button>
        ))}
      </div>
      {/* Commands */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {!search && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
            padding: '8px 14px', borderRadius: 8,
            background: `${group.color}18`, border: `1px solid ${group.color}50`,
          }}>
            <span style={{ fontSize: 20 }}>{group.icon}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: group.color }}>{group.label}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>{group.cmds.length} commands · 点击展开查看选项说明</span>
          </div>
        )}
        <input
          placeholder="搜索命令… (Search commands)"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '8px 12px', marginBottom: 12,
            background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
            borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {filtered.map(c => {
            const isOpen = expanded === c.cmd
            return (
              <div key={c.cmd} style={{
                background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                borderRadius: 10, overflow: 'hidden',
                borderLeft: `3px solid ${color}`,
              }}>
                <div
                  onClick={() => setExpanded(isOpen ? null : c.cmd)}
                  style={{ padding: '11px 14px', cursor: c.flags?.length ? 'pointer' : 'default' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                    <code style={{
                      background: 'var(--bg-elevated)', borderRadius: 5, padding: '2px 8px',
                      fontSize: 13, color, fontWeight: 700, whiteSpace: 'nowrap',
                    }}>{c.cmd}</code>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 13, flex: 1 }}>{c.desc}</span>
                    {c.flags?.length && (
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
                        {isOpen ? '▲' : '▼'} {c.flags.length} flags
                      </span>
                    )}
                  </div>
                  <div style={{
                    marginTop: 6, fontFamily: 'monospace', fontSize: 12,
                    color: 'var(--accent-green)', background: 'var(--bg-tertiary)',
                    borderRadius: 5, padding: '4px 10px',
                  }}>$ {c.example}</div>
                </div>
                {isOpen && c.flags && (
                  <div style={{ borderTop: `1px solid ${color}30`, background: `${color}08` }}>
                    <div style={{ padding: '5px 14px', fontSize: 10, fontWeight: 700, color, letterSpacing: 0.8 }}>
                      常用选项 (FLAGS / OPTIONS)
                    </div>
                    {c.flags.map(f => (
                      <div key={f.flag} style={{
                        display: 'flex', gap: 12, padding: '5px 14px',
                        borderTop: '1px solid var(--border)', alignItems: 'baseline',
                      }}>
                        <code style={{ color, fontSize: 12, fontWeight: 700, minWidth: 120, flexShrink: 0, fontFamily: 'monospace' }}>
                          {f.flag.startsWith('-') || f.flag.includes(' ') || f.flag.includes('(') ? f.flag : `-${f.flag}`}
                        </code>
                        <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{f.desc}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function IpcTab() {
  const [sel, setSel] = useState(0)
  const ipc = IPC_LIST[sel]
  return (
    <div style={{ display: 'flex', gap: 0, height: '100%' }}>
      {/* Sidebar */}
      <div style={{ width: 168, flexShrink: 0, borderRight: '1px solid var(--border)', background: 'var(--bg-secondary)', padding: '8px 0', overflowY: 'auto' }}>
        {IPC_LIST.map((item, i) => {
          const flowColor = IPC_FLOWS[item.name]?.color ?? '#4d8fff'
          return (
            <button key={item.name} onClick={() => setSel(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '9px 14px', border: 'none',
                borderLeft: i === sel ? `3px solid ${flowColor}` : '3px solid transparent',
                background: i === sel ? 'var(--bg-elevated)' : 'transparent',
                color: i === sel ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer', fontSize: 12, fontWeight: i === sel ? 600 : 400,
              }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span><span>{item.name}</span>
            </button>
          )
        })}
      </div>
      {/* Detail */}
      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        <h3 style={{ fontSize: 18, margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 26 }}>{ipc.icon}</span>{ipc.name}
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 14, lineHeight: 1.6 }}>{ipc.desc}</p>

        {/* Flow diagram */}
        <div style={{
          background: 'var(--bg-secondary)', border: `1px solid ${IPC_FLOWS[ipc.name]?.color ?? '#4d8fff'}40`,
          borderRadius: 10, padding: '12px 16px', marginBottom: 14,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>COMMUNICATION FLOW</div>
          <IpcFlowDiagram name={ipc.name} />
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, background: 'rgba(63,185,80,0.10)', border: '1px solid rgba(63,185,80,0.3)', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-green)', marginBottom: 4 }}>✓ PROS</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{ipc.pros}</div>
          </div>
          <div style={{ flex: 1, background: 'rgba(248,81,73,0.10)', border: '1px solid rgba(248,81,73,0.3)', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-red)', marginBottom: 4 }}>✗ CONS</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{ipc.cons}</div>
          </div>
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6, background: 'var(--bg-tertiary)', borderRadius: 8, padding: 16, overflowX: 'auto' }}>
          <pre style={{ margin: 0, color: 'var(--text-primary)' }}>{ipc.code}</pre>
        </div>
      </div>
    </div>
  )
}

function FieldRow({ f, color }: { f: StructField; color: string }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '190px 220px 1fr',
      gap: 12, padding: '8px 12px',
      borderBottom: '1px solid var(--border)',
      alignItems: 'start',
    }}>
      <code style={{ color, fontSize: 12, fontWeight: 700 }}>{f.name}</code>
      <code style={{ color: 'var(--accent-orange)', fontSize: 11 }}>{f.type}</code>
      <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{f.desc}</span>
    </div>
  )
}

function ProcessTab() {
  const [openGroup, setOpenGroup] = useState<string | null>('Identity')

  return (
    <div style={{ overflow: 'auto', padding: 20 }}>
      {/* Intro */}
      <div style={{ marginBottom: 20, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>task_struct — the kernel's "process identity card"</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
          Every process and thread in Linux is represented by a <code style={{ color: 'var(--accent-blue)' }}>task_struct</code>.
          It's ~16 KB of interconnected fields. All tasks are linked through the <code style={{ color: 'var(--accent-green)' }}>tasks</code> doubly-linked
          list. Parent/child relationships form a <strong>process tree</strong> (what <code>pstree</code> shows).
          The idle process (<code>pid=0</code>) is the root; <code>init/systemd</code> (<code>pid=1</code>) is its first child.
        </p>
      </div>

      {/* Process tree — SVG visual */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10 }}>PROCESS TREE (kernel view)</div>
        <div style={{
          background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12,
          padding: 16, display: 'flex', justifyContent: 'center', overflowX: 'auto',
        }}>
          <ProcessTreeDiagram />
        </div>
      </div>

      {/* Struct groups */}
      {TASK_GROUPS.map(g => (
        <div key={g.label} style={{ marginBottom: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <button
            onClick={() => setOpenGroup(openGroup === g.label ? null : g.label)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', border: 'none', background: 'transparent',
              cursor: 'pointer', color: 'var(--text-primary)', textAlign: 'left',
            }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: g.color, flexShrink: 0 }} />
            <span style={{ fontWeight: 700, fontSize: 13 }}>{g.label}</span>
            <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 12 }}>{openGroup === g.label ? '▲' : '▼'} {g.fields.length} fields</span>
          </button>
          {openGroup === g.label && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '190px 220px 1fr', gap: 12, padding: '6px 12px', background: 'var(--bg-tertiary)', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', borderTop: '1px solid var(--border)' }}>
                <span>FIELD</span><span>TYPE</span><span>DESCRIPTION</span>
              </div>
              {g.fields.map(f => <FieldRow key={f.name} f={f} color={g.color} />)}
            </div>
          )}
        </div>
      ))}

      {/* mm_struct */}
      <div style={{ marginTop: 20, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
          <h4 style={{ margin: 0, fontSize: 14 }}>mm_struct — per-process virtual memory space</h4>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: 12 }}>
            Linked from <code style={{ color: 'var(--accent-blue)' }}>task_struct.mm</code>.
            Describes the entire virtual address space. VMAs are stored in both a linked list (traversal) and a red-black tree (fast lookup by address).
          </p>
        </div>

        {/* Virtual address space visual */}
        <div style={{ padding: '14px 20px', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'center' }}>
          <VmaLayoutDiagram />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '180px 220px 1fr', gap: 12, padding: '6px 12px', background: 'var(--bg-tertiary)', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
          <span>FIELD</span><span>TYPE</span><span>DESCRIPTION</span>
        </div>
        {MM_FIELDS.map(f => <FieldRow key={f.name} f={f} color="#d2a8ff" />)}
      </div>

      {/* Comparison table */}
      <div style={{ marginTop: 20, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13 }}>
          Kernel process tree vs DOM tree — analogy
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', fontSize: 11 }}>
              {['Dimension','DOM (browser)','Kernel (Linux)','Similarity'].map(h => (
                <th key={h} style={{ padding: '8px 14px', textAlign: 'left', borderBottom: '1px solid var(--border)', fontWeight: 700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ['Core unit','Node / Element','task_struct + mm_struct','🟢 High'],
              ['Hierarchy','Tree (parent/child)','Process tree + global list + red-black trees','🟡 Similar'],
              ['Dynamics','JS add/remove nodes','fork() / exit(), constantly changing','🟢 More dynamic'],
              ['Relationships','attributes, events','Pointers to files, signal, cred…','🟢 Richer'],
              ['Scale','Thousands of nodes','10 000 – 100 000 task_structs','🔵 Much larger'],
              ['Lookup speed','Browser optimised','Red-black tree, radix tree, hash tables','🔵 Kernel-grade'],
            ].map(row => (
              <tr key={row[0]} style={{ borderBottom: '1px solid var(--border)' }}>
                {row.map((cell, i) => (
                  <td key={i} style={{ padding: '8px 14px', color: i === 0 ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: i === 0 ? 600 : 400 }}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Signals Tab ─────────────────────────────────────────────────────────────

const SIGNALS = [
  { num: 1,  name: 'SIGHUP',    action: 'Term', catchable: true,  desc: '终端挂断或控制进程终止。daemon进程收到后通常重新加载配置（nginx/sshd）' },
  { num: 2,  name: 'SIGINT',    action: 'Term', catchable: true,  desc: 'Ctrl+C 产生。中断进程，可被捕获（优雅退出）' },
  { num: 3,  name: 'SIGQUIT',   action: 'Core', catchable: true,  desc: 'Ctrl+\\ 产生。终止并生成 core dump（调试用）' },
  { num: 4,  name: 'SIGILL',    action: 'Core', catchable: true,  desc: '非法CPU指令（程序bug，如栈溢出破坏返回地址）' },
  { num: 5,  name: 'SIGTRAP',   action: 'Core', catchable: true,  desc: '断点或跟踪陷阱（调试器ptrace使用）' },
  { num: 6,  name: 'SIGABRT',   action: 'Core', catchable: true,  desc: 'abort()函数触发，或assert()失败' },
  { num: 7,  name: 'SIGBUS',    action: 'Core', catchable: true,  desc: '总线错误（内存对齐错误、mmap文件被截断）' },
  { num: 8,  name: 'SIGFPE',    action: 'Core', catchable: true,  desc: '浮点异常（除以零、整数溢出）' },
  { num: 9,  name: 'SIGKILL',   action: 'Term', catchable: false, desc: '强制终止，不可忽略也不可捕获。内核直接kill进程' },
  { num: 10, name: 'SIGUSR1',   action: 'Term', catchable: true,  desc: '用户自定义信号1。应用自定义处理（如nginx: reload）' },
  { num: 11, name: 'SIGSEGV',   action: 'Core', catchable: true,  desc: '段错误：访问无效内存地址（空指针解引用、越界）' },
  { num: 12, name: 'SIGUSR2',   action: 'Term', catchable: true,  desc: '用户自定义信号2' },
  { num: 13, name: 'SIGPIPE',   action: 'Term', catchable: true,  desc: '写入没有读端的管道。默认终止，通常需设为SIG_IGN' },
  { num: 14, name: 'SIGALRM',   action: 'Term', catchable: true,  desc: 'alarm()定时器超时（用于超时控制）' },
  { num: 15, name: 'SIGTERM',   action: 'Term', catchable: true,  desc: 'kill命令默认发送。优雅终止请求，进程可清理后退出' },
  { num: 17, name: 'SIGCHLD',   action: 'Ign',  catchable: true,  desc: '子进程状态变化（退出/停止）。父进程用于wait()，防止僵尸进程' },
  { num: 18, name: 'SIGCONT',   action: 'Cont', catchable: true,  desc: '继续执行被暂停的进程（fg命令内部发送）' },
  { num: 19, name: 'SIGSTOP',   action: 'Stop', catchable: false, desc: '暂停进程，不可忽略也不可捕获' },
  { num: 20, name: 'SIGTSTP',   action: 'Stop', catchable: true,  desc: 'Ctrl+Z 产生。可被捕获（与SIGSTOP区别）' },
  { num: 23, name: 'SIGURG',    action: 'Ign',  catchable: true,  desc: 'TCP带外数据（OOB）到达' },
  { num: 24, name: 'SIGXCPU',   action: 'Core', catchable: true,  desc: 'CPU时间限制超出（ulimit -t）' },
  { num: 25, name: 'SIGXFSZ',   action: 'Core', catchable: true,  desc: '文件大小限制超出（ulimit -f）' },
  { num: 28, name: 'SIGWINCH',  action: 'Ign',  catchable: true,  desc: '终端窗口大小改变（终端程序用于重绘）' },
  { num: 29, name: 'SIGIO',     action: 'Term', catchable: true,  desc: '异步I/O可用（fcntl O_ASYNC）' },
  { num: 31, name: 'SIGSYS',    action: 'Core', catchable: true,  desc: '无效系统调用（seccomp过滤器拦截）' },
]

function SignalsTab() {
  const [sel, setSel] = useState<typeof SIGNALS[0] | null>(null)
  const actionColor = (a: string) => a==='Term'?'#f85149':a==='Core'?'#ffa657':a==='Stop'?'#e3b341':a==='Cont'?'#3fb950':'#8b949e'

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Signal list */}
      <div style={{ width: 240, flexShrink: 0, borderRight: '1px solid var(--border)', background: 'var(--bg-secondary)', overflowY: 'auto' }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
          LINUX SIGNALS (kill -l)
        </div>
        {SIGNALS.map(s => (
          <button key={s.num} onClick={() => setSel(s)} style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            padding: '8px 14px', border: 'none',
            borderLeft: sel?.num===s.num ? `3px solid ${actionColor(s.action)}` : '3px solid transparent',
            background: sel?.num===s.num ? 'var(--bg-elevated)' : 'transparent',
            cursor: 'pointer', textAlign: 'left',
          }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily:'monospace', minWidth:22 }}>{s.num}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: sel?.num===s.num ? actionColor(s.action) : 'var(--text-primary)', minWidth:80 }}>{s.name}</span>
            <span style={{ fontSize: 10, padding:'1px 5px', borderRadius:3, background:`${actionColor(s.action)}22`, color:actionColor(s.action) }}>{s.action}</span>
            {!s.catchable && <span style={{ fontSize: 9, color:'#f85149', marginLeft:'auto' }}>🔒</span>}
          </button>
        ))}
      </div>
      {/* Detail */}
      <div style={{ flex:1, overflow:'auto', padding:20 }}>
        {sel ? (
          <>
            <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16,
              padding:'12px 16px', borderRadius:10, background:`${actionColor(sel.action)}14`, border:`1px solid ${actionColor(sel.action)}50` }}>
              <div style={{ fontSize:28, fontWeight:800, fontFamily:'monospace', color:actionColor(sel.action) }}>{sel.num}</div>
              <div>
                <div style={{ fontSize:18, fontWeight:800, color:actionColor(sel.action) }}>{sel.name}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
                  默认动作: <strong>{sel.action}</strong> ·
                  {sel.catchable ? ' ✓ 可捕获/忽略' : ' 🔒 不可捕获（内核强制执行）'}
                </div>
              </div>
            </div>
            <div style={{ fontSize:14, color:'var(--text-secondary)', lineHeight:1.7, marginBottom:20 }}>{sel.desc}</div>

            {/* Code example */}
            <div style={{ background:'var(--bg-secondary)', border:`1px solid ${actionColor(sel.action)}40`, borderRadius:10, overflow:'hidden' }}>
              <div style={{ padding:'7px 14px', borderBottom:`1px solid ${actionColor(sel.action)}30`,
                fontSize:11, fontWeight:700, color:actionColor(sel.action), background:`${actionColor(sel.action)}10` }}>
                💻 代码示例
              </div>
              <pre style={{ margin:0, padding:'14px 16px', fontSize:12, lineHeight:1.65, fontFamily:'monospace',
                color:'var(--text-primary)', background:'var(--bg-tertiary)', overflowX:'auto' }}>
{sel.num===2||sel.num===15 ? `/* 捕获 ${sel.name}，优雅退出 */
#include <signal.h>
#include <stdio.h>
#include <unistd.h>

volatile sig_atomic_t stop = 0;

void handler(int sig) {
    printf("\\ncaught ${sel.name} (%d), cleaning up...\\n", sig);
    stop = 1;
}

int main(void) {
    struct sigaction sa = { .sa_handler = handler };
    sigemptyset(&sa.sa_mask);
    sigaction(${sel.num}, &sa, NULL);  /* 注册 ${sel.name} */

    printf("PID %d running... (kill -${sel.num} %d to stop)\\n",
           getpid(), getpid());
    while (!stop) {
        sleep(1);
    }
    printf("cleanup done, bye.\\n");
    return 0;
}` : sel.num===11 ? `/* SIGSEGV — 段错误调试 */
#include <signal.h>
#include <stdio.h>
#include <execinfo.h>  /* backtrace */

void segv_handler(int sig, siginfo_t *info, void *ctx) {
    void *frames[32];
    int n = backtrace(frames, 32);
    printf("SIGSEGV at %p\\n", info->si_addr);
    backtrace_symbols_fd(frames, n, 2);  /* 打印调用栈到stderr */
    /* 重新raise让系统产生core dump */
    signal(SIGSEGV, SIG_DFL);
    raise(SIGSEGV);
}

int main(void) {
    struct sigaction sa = { .sa_sigaction = segv_handler,
                            .sa_flags = SA_SIGINFO };
    sigaction(SIGSEGV, &sa, NULL);
    /* 触发段错误 */
    int *p = NULL; *p = 42;  /* NULL指针解引用 */
    return 0;
}` : sel.num===17 ? `/* SIGCHLD — 防止僵尸进程 */
#include <signal.h>
#include <sys/wait.h>
#include <unistd.h>
#include <stdio.h>

void reap(int sig) {
    int status;
    pid_t pid;
    /* 循环等待所有已结束子进程 */
    while ((pid = waitpid(-1, &status, WNOHANG)) > 0) {
        printf("child %d exited with %d\\n", pid,
               WEXITSTATUS(status));
    }
}

int main(void) {
    signal(SIGCHLD, reap);  /* 自动回收僵尸 */
    for (int i = 0; i < 5; i++) {
        if (fork() == 0) { _exit(i); }  /* 子进程 */
    }
    sleep(2);  /* 等子进程退出，reap()自动调用 */
    return 0;
}` : `/* ${sel.name} 发送示例 */
#include <signal.h>
#include <unistd.h>
#include <stdio.h>

int main(void) {
    pid_t pid = getpid();

    /* 方式1: kill() 发送信号 */
    kill(pid, ${sel.num});      /* 发给自己 */
    // kill(1234, ${sel.num});  /* 发给指定进程 */
    // kill(0, ${sel.num});     /* 发给同进程组所有进程 */
    // kill(-1, ${sel.num});    /* 发给所有有权限的进程（慎用！）*/

    /* 方式2: raise() 发给当前线程 */
    raise(${sel.num});

    /* 方式3: 忽略信号 */
    signal(${sel.num}, SIG_IGN);  /* 忽略（如果可忽略）*/

    /* 方式4: 恢复默认行为 */
    signal(${sel.num}, SIG_DFL);

    /* Shell: kill -${sel.num} <pid>  或  kill -${sel.name} <pid> */
    printf("sent ${sel.name}\\n");
    return 0;
}`}
              </pre>
            </div>
          </>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:12, color:'var(--text-muted)' }}>
            <div style={{ fontSize:48 }}>📡</div>
            <div style={{ fontSize:14, fontWeight:700 }}>Linux 信号表</div>
            <div style={{ fontSize:12 }}>从左侧选择信号查看详情和代码示例</div>
            <div style={{ marginTop:16, display:'flex', gap:16, flexWrap:'wrap', justifyContent:'center' }}>
              {[['Term','终止进程','#f85149'],['Core','终止+core dump','#ffa657'],['Stop','暂停进程','#e3b341'],['Cont','继续进程','#3fb950'],['Ign','忽略(默认)','#8b949e']].map(([a,d,c])=>(
                <div key={a} style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:11, padding:'2px 8px', borderRadius:4, background:`${c}22`, color:c }}>{a}</span>
                  <span style={{ fontSize:11 }}>{d}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Syscalls Tab ─────────────────────────────────────────────────────────────

const SYSCALLS = [
  { num:0,  name:'read',        sig:'ssize_t read(int fd, void *buf, size_t count)',                    desc:'从文件描述符读取最多count字节到buf。返回实际读取字节数，0表示EOF，-1表示错误' },
  { num:1,  name:'write',       sig:'ssize_t write(int fd, const void *buf, size_t count)',             desc:'向文件描述符写入count字节。返回实际写入字节数（可能小于count，需循环写）' },
  { num:2,  name:'open',        sig:'int open(const char *path, int flags, mode_t mode)',               desc:'打开文件，返回fd。flags: O_RDONLY/O_WRONLY/O_RDWR/O_CREAT/O_TRUNC/O_APPEND/O_NONBLOCK' },
  { num:3,  name:'close',       sig:'int close(int fd)',                                                desc:'关闭文件描述符，释放内核资源。每个open()必须对应close()，否则fd泄漏' },
  { num:4,  name:'stat',        sig:'int stat(const char *path, struct stat *statbuf)',                 desc:'获取文件元数据：大小/权限/时间戳/inode号/硬链接数等。lstat()不跟随符号链接' },
  { num:8,  name:'lseek',       sig:'off_t lseek(int fd, off_t offset, int whence)',                   desc:'移动文件偏移量。whence: SEEK_SET=绝对位置 SEEK_CUR=当前位置 SEEK_END=文件末尾' },
  { num:9,  name:'mmap',        sig:'void *mmap(void *addr, size_t len, int prot, int flags, int fd, off_t off)', desc:'将文件或匿名内存映射到进程地址空间。MAP_SHARED=共享，MAP_PRIVATE=写时复制，MAP_ANON=匿名映射' },
  { num:10, name:'mprotect',    sig:'int mprotect(void *addr, size_t len, int prot)',                  desc:'修改内存区域保护属性。prot: PROT_READ|PROT_WRITE|PROT_EXEC|PROT_NONE' },
  { num:11, name:'munmap',      sig:'int munmap(void *addr, size_t len)',                              desc:'释放mmap映射的内存区域。与mmap成对使用' },
  { num:12, name:'brk',         sig:'int brk(void *addr) / void *sbrk(intptr_t increment)',            desc:'扩展/收缩堆（数据段末尾）。malloc()底层使用。直接用mmap效率更高（glibc大块内存用mmap）' },
  { num:14, name:'sigprocmask', sig:'int sigprocmask(int how, const sigset_t *set, sigset_t *old)',    desc:'阻塞/解除阻塞信号集。how: SIG_BLOCK/SIG_UNBLOCK/SIG_SETMASK。临界区保护' },
  { num:16, name:'ioctl',       sig:'int ioctl(int fd, unsigned long request, ...)',                   desc:'设备控制接口。用于操作终端、网卡、磁盘等设备的特定功能（串口配置/socket选项等）' },
  { num:22, name:'pipe',        sig:'int pipe(int pipefd[2])',                                         desc:'创建管道。pipefd[0]=读端 pipefd[1]=写端。单向字节流，仅限有亲缘关系的进程' },
  { num:32, name:'dup',         sig:'int dup(int oldfd) / int dup2(int oldfd, int newfd)',             desc:'复制文件描述符。dup2()指定新fd号码（Shell重定向底层：dup2(file,1)把stdout重定向到文件）' },
  { num:39, name:'getpid',      sig:'pid_t getpid(void) / pid_t getppid(void)',                       desc:'返回当前进程PID / 父进程PID。gettid()返回线程ID（Linux特有）' },
  { num:41, name:'socket',      sig:'int socket(int domain, int type, int protocol)',                  desc:'创建socket。domain: AF_INET/AF_INET6/AF_UNIX。type: SOCK_STREAM/SOCK_DGRAM/SOCK_RAW' },
  { num:42, name:'connect',     sig:'int connect(int sockfd, const struct sockaddr *addr, socklen_t len)', desc:'TCP主动连接（三次握手）。UDP connect()只设置默认目标地址（不发数据）' },
  { num:43, name:'accept',      sig:'int accept(int sockfd, struct sockaddr *addr, socklen_t *len)',   desc:'从监听socket接受一个完成三次握手的连接，返回新fd。accept4()可设O_NONBLOCK/O_CLOEXEC' },
  { num:44, name:'sendto',      sig:'ssize_t sendto(int sockfd, const void *buf, size_t len, int flags, const struct sockaddr *dest, socklen_t destlen)', desc:'发送数据（UDP用）。TCP用send()或write()即可' },
  { num:49, name:'bind',        sig:'int bind(int sockfd, const struct sockaddr *addr, socklen_t len)', desc:'将socket绑定到地址/端口。服务器必须bind后才能listen/accept' },
  { num:50, name:'listen',      sig:'int listen(int sockfd, int backlog)',                             desc:'将socket设为监听状态。backlog=已完成但未accept的连接队列长度（内核两级队列）' },
  { num:56, name:'clone',       sig:'int clone(int (*fn)(void *), void *stack, int flags, void *arg, ...)', desc:'创建线程/进程的底层syscall。pthread_create()底层调用clone(CLONE_VM|CLONE_FS|...)' },
  { num:57, name:'fork',        sig:'pid_t fork(void)',                                               desc:'创建子进程（写时复制mm_struct）。子进程返回0，父进程返回子PID。exec族函数常在fork后调用' },
  { num:59, name:'execve',      sig:'int execve(const char *path, char *const argv[], char *const envp[])', desc:'用新程序替换当前进程映像。保留fd/PID，重建地址空间和stack。exec后原代码不再运行' },
  { num:60, name:'exit',        sig:'void exit_group(int status) / void _exit(int status)',           desc:'终止进程。exit()刷缓冲区再终止，_exit()直接syscall。父进程通过wait()获取status' },
  { num:61, name:'wait4',       sig:'pid_t wait4(pid_t pid, int *status, int options, struct rusage *ru)', desc:'等待子进程状态变化。waitpid()/-1等任意子进程。WNOHANG=非阻塞。回收僵尸进程' },
  { num:62, name:'kill',        sig:'int kill(pid_t pid, int sig)',                                   desc:'向进程/进程组发送信号。pid=0发给同组，pid=-1发给所有可发进程（除init）' },
  { num:72, name:'fcntl',       sig:'int fcntl(int fd, int cmd, ...)',                                desc:'文件控制：F_DUPFD复制fd，F_GETFL/F_SETFL获取/设置fd标志（如O_NONBLOCK），F_GETLK/F_SETLK文件锁' },
  { num:157,name:'prctl',       sig:'int prctl(int option, unsigned long arg2, ...)',                 desc:'进程控制：PR_SET_NAME设进程名，PR_SET_DUMPABLE控制core dump，PR_CAP_AMBIENT管理capability' },
  { num:202,name:'futex',       sig:'int futex(int *uaddr, int op, int val, ...)',                    desc:'用户态快速互斥锁（Fast Userspace muTEX）。pthread_mutex_lock底层实现。无竞争时纯用户态，有竞争才syscall' },
  { num:228,name:'clock_gettime',sig:'int clock_gettime(clockid_t clk_id, struct timespec *tp)',     desc:'高精度时间。CLOCK_REALTIME=墙钟，CLOCK_MONOTONIC=单调时钟（不受NTP调整），CLOCK_PROCESS_CPUTIME_ID=CPU时间' },
]

function SyscallsTab() {
  const [sel, setSel] = useState<typeof SYSCALLS[0] | null>(null)
  const [search, setSearch] = useState('')
  const filtered = search ? SYSCALLS.filter(s => s.name.includes(search) || s.desc.includes(search) || String(s.num).includes(search)) : SYSCALLS

  return (
    <div style={{ display:'flex', height:'100%', overflow:'hidden' }}>
      {/* List */}
      <div style={{ width:200, flexShrink:0, borderRight:'1px solid var(--border)', background:'var(--bg-secondary)', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'8px 10px', borderBottom:'1px solid var(--border)' }}>
          <input placeholder="搜索syscall…" value={search} onChange={e=>setSearch(e.target.value)}
            style={{ width:'100%', padding:'6px 10px', background:'var(--bg-tertiary)', border:'1px solid var(--border)',
              borderRadius:6, color:'var(--text-primary)', fontSize:12, outline:'none', boxSizing:'border-box' }}/>
        </div>
        <div style={{ overflowY:'auto', flex:1 }}>
          {filtered.map(s => (
            <button key={s.num} onClick={()=>setSel(s)} style={{
              display:'flex', alignItems:'center', gap:8, width:'100%',
              padding:'7px 12px', border:'none',
              borderLeft: sel?.num===s.num ? '3px solid #4d8fff' : '3px solid transparent',
              background: sel?.num===s.num ? 'var(--bg-elevated)' : 'transparent',
              cursor:'pointer', textAlign:'left',
            }}>
              <span style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'monospace', minWidth:28 }}>{s.num}</span>
              <span style={{ fontSize:12, fontWeight:700, color: sel?.num===s.num ? '#4d8fff' : 'var(--text-primary)' }}>{s.name}</span>
            </button>
          ))}
        </div>
      </div>
      {/* Detail */}
      <div style={{ flex:1, overflow:'auto', padding:20 }}>
        {sel ? (
          <>
            <div style={{ marginBottom:14, padding:'12px 16px', borderRadius:10,
              background:'#4d8fff14', border:'1px solid #4d8fff50' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                <span style={{ fontSize:12, color:'var(--text-muted)', fontFamily:'monospace' }}>#{sel.num}</span>
                <span style={{ fontSize:18, fontWeight:800, color:'#4d8fff' }}>{sel.name}()</span>
              </div>
              <code style={{ display:'block', fontSize:12, color:'#79c0ff', fontFamily:'monospace',
                background:'var(--bg-tertiary)', padding:'8px 12px', borderRadius:6, overflowX:'auto', whiteSpace:'pre' }}>
                {sel.sig}
              </code>
            </div>
            <div style={{ fontSize:14, color:'var(--text-secondary)', lineHeight:1.75, marginBottom:20 }}>{sel.desc}</div>
            <div style={{ background:'var(--bg-secondary)', border:'1px solid #4d8fff40', borderRadius:10, overflow:'hidden' }}>
              <div style={{ padding:'7px 14px', borderBottom:'1px solid #4d8fff30',
                fontSize:11, fontWeight:700, color:'#4d8fff', background:'#4d8fff10' }}>
                💻 使用示例
              </div>
              <pre style={{ margin:0, padding:'14px 16px', fontSize:12, lineHeight:1.65, fontFamily:'monospace',
                color:'var(--text-primary)', background:'var(--bg-tertiary)', overflowX:'auto', maxHeight:400 }}>
{sel.num===9?`/* mmap 三种常见用法 */
#include <sys/mman.h>
#include <fcntl.h>

/* 1. 匿名共享内存（进程间共享）*/
void *shm = mmap(NULL, 4096,
    PROT_READ|PROT_WRITE,
    MAP_SHARED|MAP_ANONYMOUS, -1, 0);
*(int*)shm = 42;  /* 父子进程共享这块内存 */

/* 2. 文件映射（读文件最快方式）*/
int fd = open("data.bin", O_RDONLY);
struct stat st; fstat(fd, &st);
void *data = mmap(NULL, st.st_size, PROT_READ,
    MAP_PRIVATE, fd, 0);
/* 直接指针访问文件内容，无需read()缓冲区 */

/* 3. 可执行内存（JIT编译器用）*/
void *code = mmap(NULL, 4096,
    PROT_READ|PROT_WRITE|PROT_EXEC,
    MAP_PRIVATE|MAP_ANONYMOUS, -1, 0);
/* 写入机器码后直接调用 */
munmap(shm, 4096);` :
sel.num===57?`/* fork() — 创建子进程 */
#include <unistd.h>
#include <stdio.h>
#include <sys/wait.h>

int main(void) {
    pid_t pid = fork();

    if (pid < 0) {
        perror("fork failed");
    } else if (pid == 0) {
        /* 子进程：pid==0 */
        printf("child PID=%d, parent=%d\\n",
               getpid(), getppid());
        /* 常见模式：fork后exec */
        execlp("ls", "ls", "-la", NULL);
        _exit(1);  /* exec失败才到这里 */
    } else {
        /* 父进程：pid=子进程PID */
        printf("parent forked child %d\\n", pid);
        int status;
        waitpid(pid, &status, 0);  /* 等待并回收 */
        printf("child exited: %d\\n",
               WEXITSTATUS(status));
    }
    return 0;
}` :
sel.num===202?`/* futex — 用户态互斥锁底层原理 */
#include <linux/futex.h>
#include <sys/syscall.h>
#include <stdatomic.h>
#include <unistd.h>

typedef atomic_int futex_t;

/* 加锁：尝试CAS，失败则陷入内核等待 */
void futex_lock(futex_t *f) {
    int zero = 0;
    while (!atomic_compare_exchange_strong(f, &zero, 1)) {
        /* 竞争：告诉内核等待，直到futex值!=1 */
        syscall(SYS_futex, f, FUTEX_WAIT, 1, NULL, NULL, 0);
        zero = 0;
    }
}

/* 解锁：原子置0，唤醒等待者 */
void futex_unlock(futex_t *f) {
    atomic_store(f, 0);
    /* 唤醒1个等待的线程 */
    syscall(SYS_futex, f, FUTEX_WAKE, 1, NULL, NULL, 0);
}

/* 实际使用：pthread_mutex_lock底层就是这个 */
futex_t lock = ATOMIC_VAR_INIT(0);
futex_lock(&lock);
/* 临界区 */
futex_unlock(&lock);` :
`/* ${sel.name}() 示例 */
#include <unistd.h>
#include <fcntl.h>
#include <stdio.h>
#include <string.h>

int main(void) {
${sel.num===2?`    /* open — 打开/创建文件 */
    int fd = open("test.txt",
                  O_WRONLY | O_CREAT | O_TRUNC,
                  0644);
    if (fd < 0) { perror("open"); return 1; }

    /* write — 写入数据 */
    const char *msg = "Hello Linux syscall!\\n";
    ssize_t n = write(fd, msg, strlen(msg));
    printf("wrote %zd bytes\\n", n);
    close(fd);

    /* read — 读回 */
    fd = open("test.txt", O_RDONLY);
    char buf[128] = {};
    n = read(fd, buf, sizeof(buf)-1);
    printf("read: %s", buf);
    close(fd);`:
sel.num===41?`    /* socket — 创建TCP客户端连接 */
    int fd = socket(AF_INET, SOCK_STREAM, 0);

    struct sockaddr_in srv = {
        .sin_family = AF_INET,
        .sin_port   = htons(80),
    };
    inet_pton(AF_INET, "93.184.216.34", &srv.sin_addr);

    if (connect(fd, (struct sockaddr*)&srv, sizeof(srv)) == 0) {
        printf("connected!\\n");
        /* write/read to send HTTP request */
    }
    close(fd);`:
sel.num===16?`    /* ioctl — 获取终端窗口大小 */
    #include <sys/ioctl.h>
    struct winsize ws;
    ioctl(STDOUT_FILENO, TIOCGWINSZ, &ws);
    printf("terminal: %dx%d\\n", ws.ws_col, ws.ws_row);

    /* ioctl — 设置非阻塞 */
    int flags = fcntl(STDIN_FILENO, F_GETFL);
    fcntl(STDIN_FILENO, F_SETFL, flags | O_NONBLOCK);`:
`    /* ${sel.name}() */
    printf("see man ${sel.num <= 9 ? '2' : '2'} ${sel.name}\\n");`}
    return 0;
}`}
              </pre>
            </div>
          </>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:12, color:'var(--text-muted)' }}>
            <div style={{ fontSize:48 }}>⚙️</div>
            <div style={{ fontSize:14, fontWeight:700 }}>Linux 系统调用表</div>
            <div style={{ fontSize:12 }}>x86-64 系统调用号 (arch/x86/entry/syscalls/syscall_64.tbl)</div>
            <div style={{ fontSize:11, marginTop:8 }}>选择左侧 syscall 查看签名和代码示例</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Kernel Boot Tab ─────────────────────────────────────────────────────────

const BOOT_STAGES = [
  {
    id: 'arch',    phase: 1,  func: 'setup_arch()',
    icon: '🏗',   color: '#4d8fff',
    title: '硬件架构初始化',
    desc: '探测 CPU 型号/特性，解析设备树(DTB)，建立早期内存映射(page table)，初始化 ACPI/APIC',
    objects: ['CPU info (cpuinfo_x86)', 'Early page table', 'Device Tree (FDT)', 'NUMA topology'],
    structs: [
      { name: 'cpuinfo_x86', desc: 'per-CPU 结构，存 vendor/family/model/flags' },
      { name: 'pgd_t',       desc: '页全局目录，内核地址空间映射根' },
      { name: 'device_node', desc: '设备树节点，描述硬件拓扑' },
    ],
    code: `/* setup_arch() — arch/x86/kernel/setup.c */
early_cpu_init();           // 读 CPUID，填 cpuinfo_x86
parse_early_param();        // 解析 cmdline 参数
setup_memory_map();         // 解析 e820 内存图
init_mem_mapping();         // 建立 kernel 直接映射 page table
initmem_init();             // 初始化 NUMA 节点
acpi_boot_init();           // ACPI 表解析（MADT/SRAT）`,
    x: 60,  y: 40,  w: 160, h: 70,
  },
  {
    id: 'mm',      phase: 2,  func: 'mm_core_init()',
    icon: '🧱',   color: '#3fb950',
    title: '内存子系统',
    desc: '建立 struct page 数组，初始化 Buddy 分配器，创建 slab/slub 缓存，建立 vmalloc 区域',
    objects: ['struct page[]', 'Buddy allocator', 'SLAB/SLUB caches', 'vmalloc area'],
    structs: [
      { name: 'struct page',   desc: '每个物理页框一个，含引用计数/flags/mapping' },
      { name: 'zone_t',        desc: 'ZONE_DMA/ZONE_NORMAL/ZONE_HIGHMEM 三区' },
      { name: 'kmem_cache_t',  desc: 'slab 对象缓存，按大小分类管理小内存' },
      { name: 'mm_struct',     desc: '进程地址空间描述符，含 VMA 链表' },
    ],
    code: `/* mm/mm_init.c */
page_address_init();        // 建立高端内存 page→va 映射表
sparse_init();              // Sparse memory model 初始化
zone_sizes_init();          // 按zone划分内存
free_area_init();           // 初始化 Buddy 空闲链表(order 0-10)
mem_init();                 // 释放 __init 内存到 Buddy
kmem_cache_init();          // 创建基础 slab 缓存
vmalloc_init();             // 初始化 vmalloc/vmap 区域`,
    x: 250, y: 40,  w: 160, h: 70,
  },
  {
    id: 'sched',   phase: 3,  func: 'sched_init()',
    icon: '⚖️',   color: '#a371f7',
    title: '进程/调度子系统',
    desc: '初始化每 CPU 运行队列，创建 idle 进程(PID 0)，注册 CFS/RT/DL 调度类',
    objects: ['runqueue (per-CPU)', 'task_struct (idle)', 'CFS/RT/DL 调度类', 'init_task'],
    structs: [
      { name: 'struct rq',        desc: '每CPU运行队列，含 cfs_rq/rt_rq/dl_rq' },
      { name: 'task_struct',      desc: '进程描述符，init_task 是第一个(PID=0)' },
      { name: 'sched_entity',     desc: 'CFS 调度实体，维护 vruntime' },
      { name: 'cfs_rq',          desc: 'CFS 就绪队列，红黑树按 vruntime 排序' },
    ],
    code: `/* kernel/sched/core.c */
for_each_possible_cpu(i) {
    struct rq *rq = cpu_rq(i);
    init_cfs_rq(&rq->cfs);     // CFS 完全公平队列
    init_rt_rq(&rq->rt);       // RT 实时队列
}
// PID=0 的 idle 进程已经在编译时静态初始化:
// struct task_struct init_task = INIT_TASK(init_task);
set_load_weight(&init_task);
init_idle(init_task, smp_processor_id());`,
    x: 440, y: 40,  w: 160, h: 70,
  },
  {
    id: 'irq',     phase: 4,  func: 'irq_init() + init_IRQ()',
    icon: '⚡',   color: '#ff7b72',
    title: '中断子系统',
    desc: '分配 irq_desc 数组，初始化 IDT，注册 PIC/APIC 中断控制器，注册 softirq',
    objects: ['irq_desc[NR_IRQS]', 'IDT (256 entries)', 'irq_domain', 'softirq_vec[]'],
    structs: [
      { name: 'irq_desc',    desc: '中断描述符，含 irq_action 链表/affinity/handler' },
      { name: 'irq_domain',  desc: '中断域，硬件IRQ号→Linux IRQ号映射' },
      { name: 'irqaction',   desc: '中断处理函数链表节点，含 handler/flags/name' },
    ],
    code: `/* kernel/irq/irqdesc.c + arch/x86/kernel/irqinit.c */
irq_desc = alloc_percpu(struct irq_desc);  // NR_IRQS 个描述符
early_irq_init();          // 预分配 irq_desc，设置 default_chip
init_IRQ();                // 初始化 IDT，设置 PIC/APIC
softirq_init();            // 注册 TASKLET_SOFTIRQ/NET_TX/NET_RX
// 中断向量布局:
// 0-31:   CPU 异常(#PF, #GP, #NM...)
// 32-47:  ISA IRQ(传统PIC)
// 48-255: MSI/MSI-X/IPI/LOCAL_TIMER`,
    x: 60,  y: 150, w: 160, h: 70,
  },
  {
    id: 'time',    phase: 5,  func: 'time_init()',
    icon: '⏱',   color: '#e3b341',
    title: '时间/定时器',
    desc: '初始化 clocksource，注册 TSC/HPET，启动 tick 周期中断，初始化 timer wheel',
    objects: ['jiffies', 'clocksource (TSC/HPET)', 'hrtimer', 'timer_wheel'],
    structs: [
      { name: 'jiffies',        desc: '系统节拍计数器，每 HZ 次/秒递增' },
      { name: 'clocksource',    desc: '时钟源抽象，TSC精度最高(nanosecond)' },
      { name: 'hrtimer',        desc: '高精度定时器，ktime_t 精度，不依赖jiffies' },
      { name: 'timer_list',     desc: '低精度定时器，timer wheel 5层链表实现' },
    ],
    code: `/* arch/x86/kernel/time.c */
tsc_init();                // 校准 CPU TSC 频率
hpet_enable();             // 尝试启用 HPET
time_init();               // 选择最优 clocksource
clocksource_register_khz(&clocksource_tsc, tsc_khz);
// 触发第一个 tick:
setup_default_timer_irq(); // IRQ0 → timer_interrupt()
// jiffies 每次 tick 递增:
// do_timer(1) → jiffies += 1`,
    x: 250, y: 150, w: 160, h: 70,
  },
  {
    id: 'vfs',     phase: 6,  func: 'vfs_caches_init()',
    icon: '📁',   color: '#ffa657',
    title: '文件系统 / VFS',
    desc: '创建 dcache/inode/file 对象 slab 缓存，注册 rootfs，挂载 sysfs/proc/devtmpfs',
    objects: ['dentry_cache', 'inode_cache', 'file_cache', 'rootfs (tmpfs)'],
    structs: [
      { name: 'dentry',       desc: '目录项缓存，记录文件名→inode 映射，LRU淘汰' },
      { name: 'inode',        desc: '索引节点，文件元数据（权限/大小/块位置）' },
      { name: 'struct file',  desc: '打开文件实例，含 file_operations/pos/flags' },
      { name: 'super_block',  desc: '文件系统超级块，描述整个FS实例' },
    ],
    code: `/* fs/dcache.c + fs/inode.c */
dcache_init();          // 创建 dentry_cache slab
inode_init();           // 创建 inode_cache slab
files_init();           // 创建 filp_cache slab
mnt_init();             // 初始化 VFS 挂载树，注册 rootfs
init_rootfs();          // 注册 tmpfs 作为初始根文件系统
init_mount_tree();      // 挂载 rootfs 到 /
// 后续: kernel_init 挂载真正的根文件系统
// pivot_root() 或 mount(root_device)`,
    x: 440, y: 150, w: 160, h: 70,
  },
  {
    id: 'dev',     phase: 7,  func: 'devices_init()',
    icon: '🔌',   color: '#58a6ff',
    title: '设备模型 / sysfs',
    desc: '初始化 kobject/kset 框架，挂载 sysfs，创建 /sys 目录树，注册总线/设备/驱动',
    objects: ['kobject', 'kset', 'sysfs tree (/sys)', 'bus_type[]'],
    structs: [
      { name: 'kobject',    desc: '内核对象基类，含引用计数/kset/sysfs entry' },
      { name: 'kset',       desc: 'kobject 集合，对应 /sys 中一个目录' },
      { name: 'device',     desc: '设备基类，embed kobject，含 bus/driver/parent' },
      { name: 'bus_type',   desc: '总线抽象，match/probe/remove 驱动绑定逻辑' },
    ],
    code: `/* drivers/base/init.c */
kobject_init(&devices_kobj, ...);
devices_init();         // 创建 /sys/devices
buses_init();           // 创建 /sys/bus
classes_init();         // 创建 /sys/class
firmware_init();        // 创建 /sys/firmware
// 驱动注册流程:
// driver_register() → bus->match() → bus->probe()
// → probe() 初始化硬件 → devm_request_irq()`,
    x: 60,  y: 260, w: 160, h: 70,
  },
  {
    id: 'rcu',     phase: 8,  func: 'rcu_init() + cgroup_init()',
    icon: '🔐',   color: '#d2a8ff',
    title: 'RCU / cgroup / security',
    desc: 'RCU 无锁读机制，cgroup v2 层级树，LSM 安全钩子（SELinux/AppArmor）',
    objects: ['rcu_state', 'cgroup_root', 'lsm_hook_heads', 'selinux_state'],
    structs: [
      { name: 'rcu_state',    desc: 'RCU 全局状态，管理 grace period 和 callback' },
      { name: 'cgroup',       desc: 'cgroup 节点，管理进程组资源配额' },
      { name: 'security_hook_list', desc: 'LSM 钩子链表，SELinux/AppArmor 注册安全回调' },
    ],
    code: `rcu_init();             // 启动 RCU kthreads (rcu_sched/rcu_bh)
cgroup_init_early();    // 初始化根 cgroup，注册 subsys
cgroup_init();          // 挂载 cgroupfs，创建 /sys/fs/cgroup
security_init();        // 初始化 LSM 框架
// SELinux 策略加载:
// selinux_init() → 注册 security_hook_list
// 用户态 load_policy 后内核开始强制执行`,
    x: 250, y: 260, w: 160, h: 70,
  },
  {
    id: 'init',    phase: 9,  func: 'rest_init()',
    icon: '🚀',   color: '#56d364',
    title: '第一个用户进程',
    desc: 'rest_init() 创建 kernel_init 线程(PID=1)和 kthreadd(PID=2)，CPU0 成为 idle 进程',
    objects: ['PID 1 (init/systemd)', 'PID 2 (kthreadd)', 'CPU0 idle loop', 'user namespace root'],
    structs: [
      { name: 'task_struct (PID=1)', desc: 'kernel_init → exec /sbin/init 或 systemd' },
      { name: 'task_struct (PID=2)', desc: 'kthreadd：所有内核线程的父进程' },
      { name: 'user_namespace',       desc: '用户命名空间根，UID/GID 映射起点' },
    ],
    code: `/* init/main.c */
void rest_init(void) {
    // 创建 PID=1 内核线程
    pid = kernel_thread(kernel_init, NULL, CLONE_FS);
    // 创建 PID=2 kthreadd
    pid = kernel_thread(kthreadd, NULL, CLONE_FS|CLONE_FILES);
    // CPU0 变成 idle
    cpu_startup_entry(CPUHP_ONLINE);  // → cpu_idle_loop()
}
// kernel_init 最终执行:
// try_to_run_init_process("/sbin/init")
// → execve("/usr/lib/systemd/systemd")`,
    x: 440, y: 260, w: 160, h: 70,
  },
]

function KernelBootTab() {
  const [selStage, setSelStage] = useState<typeof BOOT_STAGES[0] | null>(null)
  const [playIdx, setPlayIdx] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!playing) { if (timerRef.current) clearInterval(timerRef.current); return }
    timerRef.current = setInterval(() => {
      setPlayIdx(i => {
        if (i >= BOOT_STAGES.length - 1) { setPlaying(false); return i }
        const next = i + 1
        setSelStage(BOOT_STAGES[next])
        return next
      })
    }, 900)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [playing])

  const visiblePhase = playIdx >= 0 ? BOOT_STAGES[playIdx].phase : BOOT_STAGES.length

  return (
    <div style={{ display:'flex', height:'100%', overflow:'hidden' }}>
      {/* Left: stage list */}
      <div style={{ width:200, flexShrink:0, borderRight:'1px solid var(--border)', background:'var(--bg-secondary)', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'10px 12px', borderBottom:'1px solid var(--border)' }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-primary)', marginBottom:6 }}>start_kernel() 阶段</div>
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={() => { setPlayIdx(-1); setPlaying(false); setSelStage(null) }}
              style={{ flex:1, padding:'4px 0', borderRadius:5, border:'1px solid var(--border)', background:'transparent', color:'var(--text-muted)', cursor:'pointer', fontSize:11 }}>重置</button>
            <button onClick={() => { setPlayIdx(-1); setPlaying(true) }}
              style={{ flex:1, padding:'4px 0', borderRadius:5, border:'none', background: playing ? '#ff6b6b' : '#3fb950', color:'#fff', cursor:'pointer', fontSize:11, fontWeight:700 }}>
              {playing ? '⏸' : '▶ 播放'}
            </button>
          </div>
        </div>
        <div style={{ overflowY:'auto', flex:1 }}>
          {BOOT_STAGES.map((s, i) => {
            const active = selStage?.id === s.id
            const visible = s.phase <= visiblePhase
            return (
              <button key={s.id} onClick={() => { setSelStage(s); setPlayIdx(i); setPlaying(false) }} style={{
                display:'flex', alignItems:'center', gap:8, width:'100%',
                padding:'8px 10px', border:'none',
                borderLeft: active ? `3px solid ${s.color}` : '3px solid transparent',
                background: active ? `${s.color}15` : 'transparent',
                color: visible ? (active ? s.color : 'var(--text-primary)') : 'var(--text-muted)',
                cursor:'pointer', textAlign:'left', opacity: visible ? 1 : 0.35,
              }}>
                <span style={{ fontSize:14 }}>{s.icon}</span>
                <div>
                  <div style={{ fontSize:11, fontWeight:700 }}>{s.phase}. {s.title}</div>
                  <div style={{ fontSize:9, color:'var(--text-muted)', fontFamily:'monospace' }}>{s.func.split('(')[0]}()</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right: scene + detail */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {/* Scene SVG — Unreal-style "place actors in scene" */}
        <div style={{ flexShrink:0, background:'var(--bg-primary)', borderBottom:'1px solid var(--border)', padding:'12px 16px', position:'relative' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:6 }}>
            🌐 Kernel Scene — start_kernel() 初始化的子系统（点击节点查看详情）
          </div>
          <svg viewBox="0 0 660 360" style={{ width:'100%', maxHeight:360 }}>
            {/* Grid lines */}
            {[0,1,2,3,4,5,6].map(i => (
              <line key={`v${i}`} x1={i*110} y1={0} x2={i*110} y2={360} stroke="var(--border)" strokeWidth={0.5} opacity={0.4}/>
            ))}
            {[0,1,2,3].map(i => (
              <line key={`h${i}`} x1={0} y1={i*120} x2={660} y2={i*120} stroke="var(--border)" strokeWidth={0.5} opacity={0.4}/>
            ))}

            {/* Connecting arrows between phases */}
            {BOOT_STAGES.slice(0,-1).map((s,i) => {
              const next = BOOT_STAGES[i+1]
              const x1 = s.x + s.w, y1 = s.y + s.h/2
              const x2 = next.x, y2 = next.y + next.h/2
              const visible = s.phase <= visiblePhase && next.phase <= visiblePhase
              if (!visible) return null
              // Simple L-shaped arrow
              const mx = (x1+x2)/2
              return (
                <g key={`arr${i}`} opacity={0.5}>
                  <polyline points={`${x1},${y1} ${mx},${y1} ${mx},${y2} ${x2},${y2}`}
                    fill="none" stroke={s.color} strokeWidth={1.5} strokeDasharray="4 2"/>
                  <polygon points={`${x2},${y2} ${x2-6},${y2-4} ${x2-6},${y2+4}`} fill={s.color}/>
                </g>
              )
            })}

            {/* Subsystem boxes */}
            {BOOT_STAGES.map(s => {
              const visible = s.phase <= visiblePhase
              const active = selStage?.id === s.id
              if (!visible) {
                // Show ghost placeholder
                return (
                  <rect key={s.id} x={s.x} y={s.y} width={s.w} height={s.h}
                    rx={8} fill="var(--bg-secondary)" stroke="var(--border)" strokeWidth={1}
                    strokeDasharray="4 3" opacity={0.25}/>
                )
              }
              return (
                <g key={s.id} onClick={() => setSelStage(s)} style={{ cursor:'pointer' }}>
                  <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={8}
                    fill={active ? `${s.color}30` : `${s.color}15`}
                    stroke={s.color} strokeWidth={active ? 2.5 : 1.5}/>
                  {/* Icon */}
                  <text x={s.x+14} y={s.y+26} fontSize={18} textAnchor="middle">{s.icon}</text>
                  {/* Title */}
                  <text x={s.x+28} y={s.y+20} fontSize={10} fontWeight={700} fill={s.color}>{s.title}</text>
                  {/* func */}
                  <text x={s.x+28} y={s.y+32} fontSize={8.5} fill="var(--text-muted)" fontFamily="monospace">{s.func}</text>
                  {/* Objects */}
                  {s.objects.slice(0,2).map((o,i) => (
                    <text key={i} x={s.x+10} y={s.y+46+i*13} fontSize={8} fill="var(--text-secondary)">• {o}</text>
                  ))}
                  {/* Phase number badge */}
                  <circle cx={s.x+s.w-12} cy={s.y+12} r={9} fill={s.color}/>
                  <text x={s.x+s.w-12} y={s.y+16} fontSize={9} fontWeight={700} fill="#fff" textAnchor="middle">{s.phase}</text>
                </g>
              )
            })}

            {/* Labels for columns */}
            {['早期硬件','内核核心','用户空间'].map((l,i) => (
              <text key={l} x={60+i*190} y={350} fontSize={10} fill="var(--text-muted)" textAnchor="middle"
                fontWeight={700} opacity={0.6}>{l}</text>
            ))}
          </svg>
        </div>

        {/* Detail panel */}
        <div style={{ flex:1, overflow:'auto', padding:16 }}>
          {selStage ? (
            <div>
              {/* Header */}
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14,
                padding:'10px 16px', borderRadius:10,
                background:`${selStage.color}14`, border:`1px solid ${selStage.color}50` }}>
                <span style={{ fontSize:28 }}>{selStage.icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:16, fontWeight:800, color:selStage.color }}>
                    Phase {selStage.phase} — {selStage.title}
                  </div>
                  <code style={{ fontSize:11, color:'var(--text-muted)' }}>{selStage.func}</code>
                </div>
              </div>
              <div style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.7, marginBottom:14 }}>{selStage.desc}</div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
                {/* Key data structures */}
                <div style={{ background:'var(--bg-secondary)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
                  <div style={{ padding:'6px 12px', borderBottom:'1px solid var(--border)', fontSize:11, fontWeight:700, color:'var(--text-muted)' }}>
                    关键数据结构
                  </div>
                  {selStage.structs.map(s => (
                    <div key={s.name} style={{ padding:'7px 12px', borderBottom:'1px solid var(--border)' }}>
                      <div style={{ fontSize:11, fontWeight:700, color:selStage.color, fontFamily:'monospace' }}>{s.name}</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{s.desc}</div>
                    </div>
                  ))}
                </div>
                {/* Created objects */}
                <div style={{ background:'var(--bg-secondary)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
                  <div style={{ padding:'6px 12px', borderBottom:'1px solid var(--border)', fontSize:11, fontWeight:700, color:'var(--text-muted)' }}>
                    初始化后放入 Kernel Scene 的对象
                  </div>
                  {selStage.objects.map(o => (
                    <div key={o} style={{ padding:'6px 12px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:14, color:selStage.color }}>●</span>
                      <span style={{ fontSize:11, color:'var(--text-primary)', fontFamily:'monospace' }}>{o}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Code */}
              <div style={{ background:'var(--bg-secondary)', border:`1px solid ${selStage.color}40`, borderRadius:10, overflow:'hidden' }}>
                <div style={{ padding:'6px 14px', borderBottom:`1px solid ${selStage.color}30`,
                  fontSize:11, fontWeight:700, color:selStage.color, background:`${selStage.color}10` }}>
                  💻 源码调用链 (简化)
                </div>
                <pre style={{ margin:0, padding:'12px 16px', fontSize:11, lineHeight:1.65, fontFamily:'monospace',
                  color:'var(--text-primary)', background:'var(--bg-tertiary)', overflowX:'auto' }}>
                  {selStage.code}
                </pre>
              </div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:12, color:'var(--text-muted)' }}>
              <div style={{ fontSize:40 }}>🚀</div>
              <div style={{ fontSize:14, fontWeight:700 }}>start_kernel() 全景图</div>
              <div style={{ fontSize:12, textAlign:'center', maxWidth:400, lineHeight:1.7 }}>
                点击「▶ 播放」观看内核初始化动画<br/>
                或直接点击场景中的子系统节点查看详情<br/>
                每个节点代表一个被"放入 Kernel Scene"的子系统
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── VFS Tab ──────────────────────────────────────────────────────────────────

function VfsTab() {
  const [sel, setSel] = useState<'overview'|'dentry'|'inode'|'file'|'super'>('overview')

  const VFS_LAYERS = [
    { id: 'vfs',    label: 'VFS 虚拟文件系统层', color:'#4d8fff', desc:'统一接口，屏蔽底层 FS 差异' },
    { id: 'cache',  label: 'Page Cache / dcache', color:'#3fb950', desc:'dentry/inode/page 缓存，避免重复IO' },
    { id: 'fs',     label: '具体文件系统',        color:'#ffa657', desc:'ext4 / xfs / tmpfs / procfs...' },
    { id: 'block',  label: 'Block Layer / IO调度', color:'#a371f7', desc:'bio / request_queue / elevator' },
    { id: 'driver', label: '块设备驱动',           color:'#e3b341', desc:'SCSI / NVMe / virtio-blk' },
  ]

  const VFS_STRUCTS = {
    overview: {
      title: 'VFS 层次结构', color: '#4d8fff',
      desc: 'VFS 是 Linux 内核统一文件系统接口层。open()/read()/write() 等系统调用通过 VFS 路由到具体文件系统实现。核心对象：super_block → inode → dentry → file',
      code: `/* open("foo.txt", O_RDONLY) 调用链 */
sys_open()                 // 系统调用入口
  → do_sys_open()
    → do_filp_open()
      → path_openat()
        → lookup_open()    // dentry 查找/创建
          → d_lookup()     // dcache 查询
          → vfs_create()   // 缓存缺失则调 FS
        → vfs_open()       // 创建 struct file
          → inode->i_fop->open()  // 调具体 FS

/* read() 调用链 */
sys_read() → vfs_read() → file->f_op->read()
  → ext4_file_read_iter()
    → generic_file_read_iter()
      → page_cache_sync_readahead()  // 预读
      → copy_page_to_iter()          // 拷贝到用户空间`,
    },
    dentry: {
      title: 'dentry — 目录项缓存', color: '#56d364',
      desc: 'dentry 把文件名映射到 inode，由 dcache 全局哈希表缓存。正缓存(positive)=文件存在；负缓存(negative)=文件不存在但路径有效，避免重复失败查找。',
      code: `struct dentry {
    atomic_t         d_count;      /* 引用计数 */
    unsigned int     d_flags;      /* DCACHE_VALID / DCACHE_NEGATIVE */
    seqcount_spinlock_t d_seq;     /* 乐观锁保护 d_parent/d_name */
    struct hlist_bl_node d_hash;   /* dcache 全局哈希桶 */
    struct dentry   *d_parent;     /* 父目录 dentry */
    struct qstr      d_name;       /* { .hash, .len, .name } */
    struct inode    *d_inode;      /* 关联的 inode（负缓存时为 NULL）*/
    const struct dentry_operations *d_op;  /* 可选钩子 */
    struct super_block *d_sb;      /* 所属文件系统 */
    struct list_head d_child;      /* 同级 dentry 链表 */
    struct list_head d_subdirs;    /* 子目录列表 */
};

/* dcache 查询 */
struct dentry *d_lookup(const struct dentry *parent,
                        const struct qstr *name) {
    // 1. 计算 hash = full_name_hash(parent, name->name, name->len)
    // 2. 在 dentry_hashtable[hash] 桶中线性查找
    // 3. 命中返回 dget(dentry)；未命中返回 NULL
}`,
    },
    inode: {
      title: 'inode — 索引节点', color: '#ffa657',
      desc: 'inode 存储文件元数据（权限、大小、时间戳、块位置），不含文件名。同一文件可有多个 dentry（硬链接），但只有一个 inode。',
      code: `struct inode {
    umode_t          i_mode;       /* 文件类型 + 权限 (rwxrwxrwx) */
    kuid_t           i_uid;        /* 所有者 UID */
    kgid_t           i_gid;        /* 所有者 GID */
    loff_t           i_size;       /* 文件大小（字节）*/
    struct timespec64 i_atime, i_mtime, i_ctime;
    unsigned long    i_ino;        /* inode 号（ls -i 看到的）*/
    nlink_t          i_nlink;      /* 硬链接数（rm 到0才删）*/
    atomic_t         i_count;      /* 引用计数 */
    struct address_space *i_mapping; /* page cache */
    const struct inode_operations *i_op;  /* create/lookup/mkdir... */
    const struct file_operations  *i_fop; /* open/read/write/mmap */
    struct super_block *i_sb;
    /* ext4 specific: ext4_inode_info embed inode */
};

/* inode 分配：每个 FS 实现自己的 alloc_inode */
/* ext4: ext4_alloc_inode() → kmem_cache_alloc(ext4_inode_cachep) */`,
    },
    file: {
      title: 'struct file — 打开文件实例', color: '#a371f7',
      desc: '每次 open() 创建一个 struct file，代表"一次打开"。同一文件可有多个 struct file（不同进程/同进程多次open）。fd table (files_struct) 把 fd 映射到 struct file。',
      code: `struct file {
    struct path      f_path;       /* { dentry + vfsmount } */
    struct inode    *f_inode;      /* 等于 f_path.dentry->d_inode */
    const struct file_operations *f_op;  /* 操作函数表 */
    spinlock_t       f_lock;
    atomic_long_t    f_count;      /* 引用计数 (dup/fork 增加) */
    unsigned int     f_flags;      /* O_RDONLY/O_WRONLY/O_NONBLOCK */
    fmode_t          f_mode;       /* FMODE_READ / FMODE_WRITE */
    loff_t           f_pos;        /* 当前读写位置（每个fd独立）*/
    void            *private_data; /* FS 私有数据 */
};

/* fd → struct file */
struct files_struct {
    struct fdtable __rcu *fdt;    /* fd 数组（可动态扩展）*/
    // fdt->fd[n] = struct file* (第n个fd指向的file)
};
// current->files->fdt->fd[3] → struct file for fd=3`,
    },
    super: {
      title: 'super_block — 文件系统超级块', color: '#e3b341',
      desc: 'super_block 代表一个挂载的文件系统实例。mount() 系统调用创建 super_block，umount() 销毁。',
      code: `struct super_block {
    dev_t            s_dev;        /* 设备号 (8:1 = sda1) */
    unsigned long    s_blocksize;  /* 块大小（通常 4096） */
    loff_t           s_maxbytes;   /* 最大文件大小 */
    struct file_system_type *s_type; /* ext4/xfs/tmpfs... */
    const struct super_operations *s_op; /* 操作函数表 */
    struct dentry   *s_root;       /* 根目录 dentry */
    struct list_head s_inodes;     /* 该 FS 所有 inode 链表 */
    struct list_head s_mounts;     /* 挂载点列表 */
    void            *s_fs_info;    /* FS 私有数据(ext4_sb_info) */
};

/* mount 流程 */
sys_mount() → do_mount() → do_new_mount()
  → vfs_get_tree()               // 调 FS 的 fill_super()
    → ext4_fill_super()          // 读磁盘超级块，创建 s_root dentry
  → do_add_mount()               // 加入 mount 树`,
    },
  }

  const cur = VFS_STRUCTS[sel]

  return (
    <div style={{ display:'flex', height:'100%', overflow:'hidden' }}>
      {/* VFS layer diagram - left sidebar */}
      <div style={{ width:180, flexShrink:0, borderRight:'1px solid var(--border)', background:'var(--bg-secondary)', padding:'12px 8px', display:'flex', flexDirection:'column', gap:2 }}>
        <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:8 }}>VFS 层次</div>
        {VFS_LAYERS.map(l => (
          <div key={l.id} style={{ padding:'8px 10px', borderRadius:7, border:`1px solid ${l.color}50`, background:`${l.color}10` }}>
            <div style={{ fontSize:11, fontWeight:700, color:l.color }}>{l.label}</div>
            <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>{l.desc}</div>
          </div>
        ))}
        <div style={{ marginTop:16, fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:8 }}>核心结构体</div>
        {(['overview','dentry','inode','file','super'] as const).map(id => (
          <button key={id} onClick={() => setSel(id)} style={{
            padding:'7px 10px', borderRadius:6, border:'none', textAlign:'left', cursor:'pointer',
            background: sel===id ? 'var(--bg-elevated)' : 'transparent',
            color: sel===id ? VFS_STRUCTS[id].color : 'var(--text-secondary)',
            fontSize:12, fontWeight: sel===id ? 700 : 400,
            borderLeft: `3px solid ${sel===id ? VFS_STRUCTS[id].color : 'transparent'}`,
          }}>{id==='overview' ? '🗺 总览' : id==='super' ? 'super_block' : `struct ${id}`}</button>
        ))}
      </div>

      {/* Detail */}
      <div style={{ flex:1, overflow:'auto', padding:20 }}>
        <div style={{ padding:'10px 16px', borderRadius:10, marginBottom:14, background:`${cur.color}14`, border:`1px solid ${cur.color}50` }}>
          <div style={{ fontSize:16, fontWeight:800, color:cur.color }}>{cur.title}</div>
          <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:4, lineHeight:1.7 }}>{cur.desc}</div>
        </div>
        <div style={{ background:'var(--bg-secondary)', border:`1px solid ${cur.color}40`, borderRadius:10, overflow:'hidden' }}>
          <div style={{ padding:'7px 14px', borderBottom:`1px solid ${cur.color}30`, fontSize:11, fontWeight:700, color:cur.color, background:`${cur.color}10` }}>
            💻 内核源码（简化）
          </div>
          <pre style={{ margin:0, padding:'14px 16px', fontSize:11, lineHeight:1.65, fontFamily:'monospace', color:'var(--text-primary)', background:'var(--bg-tertiary)', overflowX:'auto' }}>
            {cur.code}
          </pre>
        </div>
      </div>
    </div>
  )
}

// ─── eBPF Tab ─────────────────────────────────────────────────────────────────

function EbpfTab() {
  const [sel, setSel] = useState(0)

  const TOPICS = [
    {
      title: 'eBPF 架构总览', icon: '🔭', color: '#4d8fff',
      desc: 'eBPF (extended Berkeley Packet Filter) 允许在内核中运行受限 C 程序，无需修改内核源码或加载内核模块。程序通过 verifier 安全检查后 JIT 编译为原生机器码。',
      code: `/* eBPF 程序生命周期 */

// 1. 编写 eBPF C 程序
// 2. clang -O2 -target bpf → .o (ELF with eBPF bytecode)
// 3. libbpf / bpftool 加载:
//    bpf_prog_load() → sys_bpf(BPF_PROG_LOAD, ...)
// 4. 内核 verifier 检查:
//    - 无无限循环（DAG + 边界分析）
//    - 无越界访问（pointer tracking）
//    - 无危险指针 dereference
// 5. JIT 编译 eBPF bytecode → x86-64 machine code
// 6. 附加到 hook 点:
//    bpf_prog_attach() → 挂到 cgroup/sk/tc/xdp
// 7. 事件触发 → eBPF 程序运行
// 8. 通过 BPF Maps 与用户态交换数据

/* 关键系统调用 */
int bpf(int cmd, union bpf_attr *attr, unsigned int size);
// BPF_PROG_LOAD    — 加载程序
// BPF_MAP_CREATE   — 创建 Map
// BPF_MAP_UPDATE_ELEM / BPF_MAP_LOOKUP_ELEM
// BPF_PROG_ATTACH  — 挂载程序`,
    },
    {
      title: 'kprobe / tracepoint 追踪', icon: '🔍', color: '#a371f7',
      desc: 'kprobe 可以在任意内核函数入口/返回时触发 eBPF 程序，用于动态追踪内核行为。tracepoint 是内核预埋的静态探针点，性能更好。',
      code: `/* kprobe 追踪 sys_execve — 记录所有进程启动 */
#include <linux/bpf.h>
#include <bpf/bpf_helpers.h>
#include <bpf/bpf_tracing.h>

struct {
    __uint(type,        BPF_MAP_TYPE_PERF_EVENT_ARRAY);
    __uint(max_entries, 1024);
} events SEC(".maps");

struct event_t {
    __u32 pid;
    char  comm[16];
    char  filename[64];
};

/* 挂载到 sys_execve 入口 */
SEC("kprobe/sys_execve")
int trace_execve(struct pt_regs *ctx) {
    struct event_t e = {};
    e.pid = bpf_get_current_pid_tgid() >> 32;
    bpf_get_current_comm(&e.comm, sizeof(e.comm));
    /* 从用户空间读取 filename 参数 */
    const char *fname = (const char *)PT_REGS_PARM1(ctx);
    bpf_probe_read_user_str(e.filename, sizeof(e.filename), fname);
    /* 发送到用户态 perf ring buffer */
    bpf_perf_event_output(ctx, &events, BPF_F_CURRENT_CPU,
                          &e, sizeof(e));
    return 0;
}
char _license[] SEC("license") = "GPL";

/* 用户态读取: perf_buffer__poll() 或 ring_buffer__poll() */
/* 工具链: bpftrace -e 'kprobe:sys_execve { printf("%s\\n", comm); }' */`,
    },
    {
      title: 'XDP 网络加速', icon: '🌐', color: '#3fb950',
      desc: 'XDP (eXpress Data Path) 在网卡驱动层处理数据包，比 iptables 快 10x。可在包到达内核网络栈之前进行过滤/修改/重定向，实现高性能防火墙/负载均衡。',
      code: `/* XDP 丢弃特定 IP 的所有包（简易防火墙）*/
#include <linux/bpf.h>
#include <linux/if_ether.h>
#include <linux/ip.h>
#include <bpf/bpf_helpers.h>
#include <arpa/inet.h>

/* Blocked IP 集合 */
struct {
    __uint(type,        BPF_MAP_TYPE_HASH);
    __uint(max_entries, 1024);
    __type(key,   __u32);   /* IPv4 地址 */
    __type(value, __u8);    /* 任意值 */
} blocked_ips SEC(".maps");

SEC("xdp")
int xdp_firewall(struct xdp_md *ctx) {
    void *data     = (void *)(long)ctx->data;
    void *data_end = (void *)(long)ctx->data_end;

    /* 解析以太网头 */
    struct ethhdr *eth = data;
    if ((void*)(eth+1) > data_end) return XDP_PASS;
    if (eth->h_proto != htons(ETH_P_IP)) return XDP_PASS;

    /* 解析 IP 头 */
    struct iphdr *ip = (void*)(eth+1);
    if ((void*)(ip+1) > data_end) return XDP_PASS;

    /* 查 blocked_ips map */
    __u32 src = ip->saddr;
    if (bpf_map_lookup_elem(&blocked_ips, &src))
        return XDP_DROP;   /* 直接在驱动层丢弃，不进内核网络栈 */

    return XDP_PASS;       /* 正常处理 */
}
char _license[] SEC("license") = "GPL";

/* 加载: ip link set dev eth0 xdp obj xdp_fw.o sec xdp
   添加规则: bpftool map update pinned /sys/fs/bpf/blocked_ips
             key 01 02 03 04 value 01 */`,
    },
    {
      title: 'BPF Maps — 数据交换', icon: '🗺', color: '#ffa657',
      desc: 'BPF Maps 是内核态 eBPF 程序与用户态之间共享数据的通道，也是 eBPF 程序之间共享状态的方式。支持多种数据结构。',
      code: `/* BPF Map 类型一览 */

// BPF_MAP_TYPE_HASH          — 通用 hash map (O(1))
// BPF_MAP_TYPE_ARRAY         — 数组，key=index，适合 per-CPU 计数
// BPF_MAP_TYPE_PERF_EVENT_ARRAY — 向用户态发送事件（streaming）
// BPF_MAP_TYPE_RINGBUF       — 新一代 ring buffer（推荐，比PERF快）
// BPF_MAP_TYPE_LPM_TRIE      — 最长前缀匹配，IP路由表
// BPF_MAP_TYPE_STACK_TRACE   — 内核/用户态调用栈
// BPF_MAP_TYPE_PROG_ARRAY    — 尾调用跳转表（eBPF链）

/* per-CPU 计数器（无锁，每CPU独立累加）*/
struct {
    __uint(type,        BPF_MAP_TYPE_PERCPU_ARRAY);
    __uint(max_entries, 1);
    __type(key,   __u32);
    __type(value, __u64);
} pkt_count SEC(".maps");

SEC("xdp")
int count_packets(struct xdp_md *ctx) {
    __u32 key = 0;
    __u64 *cnt = bpf_map_lookup_elem(&pkt_count, &key);
    if (cnt) __sync_fetch_and_add(cnt, 1);
    return XDP_PASS;
}

/* 用户态读取所有 CPU 计数之和 */
// bpf_map_lookup_elem(map_fd, &key, values[])
// sum = values[0] + values[1] + ... + values[ncpus]

/* bpftool 查看 map: bpftool map dump id <id> */`,
    },
    {
      title: 'bpftrace 快速脚本', icon: '⚡', color: '#e3b341',
      desc: 'bpftrace 是 eBPF 的高级脚本语言（类 awk），用于快速写一行式性能追踪，无需手写 C 代码。',
      code: `# 1. 追踪所有进程的 open() 系统调用（含路径名）
bpftrace -e '
tracepoint:syscalls:sys_enter_openat {
    printf("%s open: %s\\n", comm, str(args->filename));
}'

# 2. 统计内核函数调用延迟直方图
bpftrace -e '
kprobe:vfs_read  { @start[tid] = nsecs; }
kretprobe:vfs_read {
    @latency = hist(nsecs - @start[tid]);
    delete(@start[tid]);
}'

# 3. 追踪 CPU 调度延迟（runqueue 等待时间）
bpftrace -e '
tracepoint:sched:sched_wakeup { @ts[args->pid] = nsecs; }
tracepoint:sched:sched_switch {
    if (@ts[args->next_pid]) {
        @run_delay = hist(nsecs - @ts[args->next_pid]);
        delete(@ts[args->next_pid]);
    }
}'

# 4. 实时显示 TCP 连接（来源 IP + 端口）
bpftrace -e '
kprobe:tcp_connect {
    $sk = (struct sock *)arg0;
    printf("connect: %s:%d\\n",
           ntop(2, $sk->__sk_common.skc_daddr),
           $sk->__sk_common.skc_dport);
}'

# 5. 查看进程的 page fault（缺页中断）频率
bpftrace -e 'software:page-fault:1 { @[comm] = count(); }'`,
    },
  ]

  const t = TOPICS[sel]
  return (
    <div style={{ display:'flex', height:'100%', overflow:'hidden' }}>
      <div style={{ width:190, flexShrink:0, borderRight:'1px solid var(--border)', background:'var(--bg-secondary)', padding:'12px 8px', overflowY:'auto' }}>
        <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:10 }}>eBPF 主题</div>
        {TOPICS.map((tp, i) => (
          <button key={i} onClick={() => setSel(i)} style={{
            display:'flex', alignItems:'center', gap:8, width:'100%', marginBottom:4,
            padding:'8px 10px', border:'none', borderRadius:7, cursor:'pointer', textAlign:'left',
            background: sel===i ? `${tp.color}20` : 'transparent',
            borderLeft: `3px solid ${sel===i ? tp.color : 'transparent'}`,
            color: sel===i ? tp.color : 'var(--text-secondary)',
          }}>
            <span style={{ fontSize:16 }}>{tp.icon}</span>
            <span style={{ fontSize:11, fontWeight: sel===i ? 700 : 400 }}>{tp.title}</span>
          </button>
        ))}
        <div style={{ marginTop:16, padding:'10px', background:'var(--bg-elevated)', borderRadius:8, border:'1px solid var(--border)' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', marginBottom:6 }}>快速上手</div>
          {['apt install bpftrace', 'apt install bpfcc-tools', 'bpftool prog list', 'bpftool map list'].map(cmd => (
            <div key={cmd} style={{ fontFamily:'monospace', fontSize:9, color:'#79c0ff', marginBottom:3 }}>{cmd}</div>
          ))}
        </div>
      </div>
      <div style={{ flex:1, overflow:'auto', padding:20 }}>
        <div style={{ padding:'10px 16px', borderRadius:10, marginBottom:14, background:`${t.color}14`, border:`1px solid ${t.color}50` }}>
          <div style={{ fontSize:16, fontWeight:800, color:t.color }}>{t.icon} {t.title}</div>
          <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:4, lineHeight:1.7 }}>{t.desc}</div>
        </div>
        <div style={{ background:'var(--bg-secondary)', border:`1px solid ${t.color}40`, borderRadius:10, overflow:'hidden' }}>
          <div style={{ padding:'7px 14px', borderBottom:`1px solid ${t.color}30`, fontSize:11, fontWeight:700, color:t.color, background:`${t.color}10` }}>
            💻 代码示例
          </div>
          <pre style={{ margin:0, padding:'14px 16px', fontSize:11, lineHeight:1.65, fontFamily:'monospace', color:'var(--text-primary)', background:'var(--bg-tertiary)', overflowX:'auto', maxHeight:500 }}>
            {t.code}
          </pre>
        </div>
      </div>
    </div>
  )
}

// ─── Containers Tab ───────────────────────────────────────────────────────────

function ContainersTab() {
  const [sel, setSel] = useState<'overview'|'ns'|'cgroup'|'seccomp'|'demo'>('overview')

  const NAMESPACES = [
    { ns:'pid',     flag:'CLONE_NEWPID',   desc:'PID 隔离：容器内 PID=1 与宿主 PID=N 的映射' },
    { ns:'net',     flag:'CLONE_NEWNET',   desc:'网络栈隔离：独立 lo/eth0/路由表/iptables' },
    { ns:'mnt',     flag:'CLONE_NEWNS',    desc:'挂载点隔离：pivot_root 换根，看不到宿主目录' },
    { ns:'uts',     flag:'CLONE_NEWUTS',   desc:'Hostname/domainname 隔离' },
    { ns:'ipc',     flag:'CLONE_NEWIPC',   desc:'System V IPC / POSIX 消息队列隔离' },
    { ns:'user',    flag:'CLONE_NEWUSER',  desc:'UID/GID 映射：容器root→宿主非特权用户' },
    { ns:'cgroup',  flag:'CLONE_NEWCGROUP',desc:'cgroup root 隔离：容器看不到宿主 cgroup 树' },
    { ns:'time',    flag:'CLONE_NEWTIME',  desc:'时钟偏移隔离（Linux 5.6+）' },
  ]

  const CGROUP_SUBSYS = [
    { name:'cpu',     desc:'CPU 时间份额（cpu.shares / cpu.cfs_quota_us）' },
    { name:'memory',  desc:'内存上限（memory.limit_in_bytes / memory.oom_control）' },
    { name:'blkio',   desc:'块设备 IO 带宽和 IOPS 限制' },
    { name:'cpuset',  desc:'绑定到特定 CPU 核和 NUMA 节点' },
    { name:'pids',    desc:'进程数量上限（防止 fork bomb）' },
    { name:'net_cls', desc:'网络包打标签，配合 tc 做流量控制' },
  ]

  return (
    <div style={{ display:'flex', height:'100%', overflow:'hidden' }}>
      <div style={{ width:190, flexShrink:0, borderRight:'1px solid var(--border)', background:'var(--bg-secondary)', padding:'12px 8px', overflowY:'auto' }}>
        <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:10 }}>容器底层技术</div>
        {([
          { id:'overview', label:'📦 容器架构总览', color:'#4d8fff' },
          { id:'ns',       label:'🔲 Linux Namespaces', color:'#3fb950' },
          { id:'cgroup',   label:'📊 cgroups v2',    color:'#ffa657' },
          { id:'seccomp',  label:'🔒 seccomp / 安全',  color:'#f85149' },
          { id:'demo',     label:'💻 手写容器',       color:'#a371f7' },
        ] as const).map(item => (
          <button key={item.id} onClick={() => setSel(item.id)} style={{
            display:'block', width:'100%', marginBottom:4, padding:'8px 10px', border:'none', borderRadius:7,
            background: sel===item.id ? `${item.color}20` : 'transparent',
            borderLeft: `3px solid ${sel===item.id ? item.color : 'transparent'}`,
            color: sel===item.id ? item.color : 'var(--text-secondary)',
            cursor:'pointer', fontSize:11, fontWeight: sel===item.id ? 700 : 400, textAlign:'left',
          }}>{item.label}</button>
        ))}
      </div>

      <div style={{ flex:1, overflow:'auto', padding:20 }}>
        {sel === 'overview' && (
          <>
            <div style={{ padding:'10px 16px', borderRadius:10, marginBottom:14, background:'#4d8fff14', border:'1px solid #4d8fff50' }}>
              <div style={{ fontSize:16, fontWeight:800, color:'#4d8fff' }}>Docker/容器 = Namespace + cgroup + UnionFS</div>
              <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:4, lineHeight:1.7 }}>
                容器不是虚拟机。它们共享同一个 Linux 内核，通过 Namespace 实现资源视图隔离，通过 cgroup 实现资源限制，通过 UnionFS(OverlayFS) 实现镜像层叠。
              </div>
            </div>
            {/* Architecture diagram */}
            <svg viewBox="0 0 600 300" style={{ width:'100%', maxWidth:600, marginBottom:16 }}>
              {/* Host */}
              <rect x={10} y={10} width={580} height={280} rx={10} fill="none" stroke="#4d8fff" strokeWidth={1.5} strokeDasharray="6 3"/>
              <text x={20} y={28} fontSize={11} fill="#4d8fff" fontWeight={700}>宿主机 Linux Kernel</text>
              {/* Container 1 */}
              <rect x={30} y={40} width={240} height={220} rx={8} fill="#3fb95010" stroke="#3fb950" strokeWidth={1.5}/>
              <text x={42} y={58} fontSize={10} fill="#3fb950" fontWeight={700}>Container A</text>
              {[['PID ns','pid=1 → host pid=2341'],['Net ns','eth0: 172.17.0.2'],['Mnt ns','/ → overlay layer'],['User ns','root→uid=1000']].map(([k,v],i) => (
                <g key={k}>
                  <rect x={42} y={65+i*46} width={210} height={38} rx={5} fill="#3fb95015" stroke="#3fb95040"/>
                  <text x={52} y={80+i*46} fontSize={10} fontWeight={700} fill="#3fb950">{k}</text>
                  <text x={52} y={93+i*46} fontSize={9} fill="var(--text-muted)">{v}</text>
                </g>
              ))}
              {/* Container 2 */}
              <rect x={330} y={40} width={240} height={220} rx={8} fill="#ffa65710" stroke="#ffa657" strokeWidth={1.5}/>
              <text x={342} y={58} fontSize={10} fill="#ffa657" fontWeight={700}>Container B</text>
              {[['PID ns','pid=1 → host pid=5012'],['Net ns','eth0: 172.17.0.3'],['cgroup','CPU: 0.5 core, Mem: 256MB'],['seccomp','允许: read/write/... 拒绝: mount']].map(([k,v],i) => (
                <g key={k}>
                  <rect x={342} y={65+i*46} width={210} height={38} rx={5} fill="#ffa65715" stroke="#ffa65740"/>
                  <text x={352} y={80+i*46} fontSize={10} fontWeight={700} fill="#ffa657">{k}</text>
                  <text x={352} y={93+i*46} fontSize={9} fill="var(--text-muted)">{v}</text>
                </g>
              ))}
            </svg>
          </>
        )}

        {sel === 'ns' && (
          <>
            <div style={{ fontSize:14, fontWeight:700, color:'#3fb950', marginBottom:12 }}>Linux Namespaces (8种)</div>
            <div style={{ display:'grid', gap:8, marginBottom:16 }}>
              {NAMESPACES.map(n => (
                <div key={n.ns} style={{ padding:'10px 14px', borderRadius:8, border:'1px solid #3fb95040', background:'#3fb95010', display:'flex', gap:12, alignItems:'baseline' }}>
                  <code style={{ color:'#3fb950', fontSize:12, fontWeight:700, minWidth:60 }}>{n.ns}</code>
                  <code style={{ color:'#79c0ff', fontSize:10, minWidth:140 }}>{n.flag}</code>
                  <span style={{ fontSize:12, color:'var(--text-muted)' }}>{n.desc}</span>
                </div>
              ))}
            </div>
            <pre style={{ margin:0, padding:'14px 16px', fontSize:11, lineHeight:1.65, fontFamily:'monospace', color:'var(--text-primary)', background:'var(--bg-secondary)', border:'1px solid #3fb95040', borderRadius:10, overflowX:'auto' }}>
{`/* 创建新 namespace: unshare() */
// 终端执行:
unshare --pid --fork --mount-proc bash
// 现在在独立 PID namespace，ps 只看到自己

/* setns() — 加入已有 namespace */
int fd = open("/proc/12345/ns/net", O_RDONLY);
setns(fd, CLONE_NEWNET);  // 加入 PID=12345 的网络 ns
// 现在共享那个进程的网络栈

/* /proc/$PID/ns/ 查看进程的所有 namespace */
ls -la /proc/self/ns/
// pid    → pid:[4026532241]
// net    → net:[4026532008]
// mnt    → mnt:[4026532180]
// 相同 inode 号 = 在同一 namespace

/* Docker 实现 */
// docker run = clone(CLONE_NEWPID|CLONE_NEWNET|CLONE_NEWNS|...)
//              + pivot_root (换根文件系统)
//              + cgroup (限制资源)`}
            </pre>
          </>
        )}

        {sel === 'cgroup' && (
          <>
            <div style={{ fontSize:14, fontWeight:700, color:'#ffa657', marginBottom:12 }}>cgroups v2 资源隔离</div>
            <div style={{ display:'grid', gap:6, marginBottom:16 }}>
              {CGROUP_SUBSYS.map(s => (
                <div key={s.name} style={{ padding:'8px 14px', borderRadius:7, border:'1px solid #ffa65740', background:'#ffa65710', display:'flex', gap:12 }}>
                  <code style={{ color:'#ffa657', fontSize:12, fontWeight:700, minWidth:70 }}>{s.name}</code>
                  <span style={{ fontSize:12, color:'var(--text-muted)' }}>{s.desc}</span>
                </div>
              ))}
            </div>
            <pre style={{ margin:0, padding:'14px 16px', fontSize:11, lineHeight:1.65, fontFamily:'monospace', color:'var(--text-primary)', background:'var(--bg-secondary)', border:'1px solid #ffa65740', borderRadius:10, overflowX:'auto' }}>
{`# cgroup v2 文件系统接口
mount -t cgroup2 none /sys/fs/cgroup

# 创建容器 cgroup
mkdir /sys/fs/cgroup/my-container

# 限制 CPU（50% = 50000/100000us）
echo "50000 100000" > /sys/fs/cgroup/my-container/cpu.max

# 限制内存（256MB）
echo $((256*1024*1024)) > /sys/fs/cgroup/my-container/memory.max

# 限制进程数
echo 100 > /sys/fs/cgroup/my-container/pids.max

# 将进程加入 cgroup
echo $$ > /sys/fs/cgroup/my-container/cgroup.procs

# 查看 cgroup 内所有进程
cat /sys/fs/cgroup/my-container/cgroup.procs

# 查看内存使用
cat /sys/fs/cgroup/my-container/memory.current

# OOM 处理策略
echo 1 > /sys/fs/cgroup/my-container/memory.oom.group
# 超内存时整组进程一起 OOM kill`}
            </pre>
          </>
        )}

        {sel === 'seccomp' && (
          <>
            <div style={{ padding:'10px 16px', borderRadius:10, marginBottom:14, background:'#f8514914', border:'1px solid #f8514950' }}>
              <div style={{ fontSize:16, fontWeight:800, color:'#f85149' }}>seccomp — 系统调用过滤</div>
              <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:4, lineHeight:1.7 }}>
                seccomp-BPF 允许给进程安装系统调用白名单/黑名单过滤器。Docker 默认禁止 300+ 危险 syscall（如 ptrace/mount/reboot）。违规触发 SIGSYS 或 SECCOMP_RET_KILL。
              </div>
            </div>
            <pre style={{ margin:0, padding:'14px 16px', fontSize:11, lineHeight:1.65, fontFamily:'monospace', color:'var(--text-primary)', background:'var(--bg-secondary)', border:'1px solid #f8514940', borderRadius:10, overflowX:'auto' }}>
{`/* seccomp 过滤器：只允许 read/write/exit 三个 syscall */
#include <linux/seccomp.h>
#include <linux/filter.h>
#include <linux/audit.h>
#include <sys/prctl.h>
#include <sys/syscall.h>

struct sock_filter filter[] = {
    /* 加载 arch 字段，验证是 x86-64 */
    BPF_STMT(BPF_LD|BPF_W|BPF_ABS, offsetof(struct seccomp_data, arch)),
    BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K, AUDIT_ARCH_X86_64, 1, 0),
    BPF_STMT(BPF_RET|BPF_K, SECCOMP_RET_KILL),

    /* 加载 syscall 号 */
    BPF_STMT(BPF_LD|BPF_W|BPF_ABS, offsetof(struct seccomp_data, nr)),

    /* 白名单: read=0, write=1, exit=60, exit_group=231 */
    BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K, __NR_read,  3, 0),
    BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K, __NR_write, 2, 0),
    BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K, __NR_exit,  1, 0),

    /* 其余全部杀死进程 */
    BPF_STMT(BPF_RET|BPF_K, SECCOMP_RET_KILL),
    BPF_STMT(BPF_RET|BPF_K, SECCOMP_RET_ALLOW),
};

struct sock_fprog prog = {
    .len    = sizeof(filter)/sizeof(filter[0]),
    .filter = filter,
};

/* 安装过滤器 */
prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0);  /* 必须先设置 */
syscall(SYS_seccomp, SECCOMP_SET_MODE_FILTER, 0, &prog);

/* 现在执行 open() → SIGSYS，进程被杀 */`}
            </pre>
          </>
        )}

        {sel === 'demo' && (
          <>
            <div style={{ padding:'10px 16px', borderRadius:10, marginBottom:14, background:'#a371f714', border:'1px solid #a371f750' }}>
              <div style={{ fontSize:16, fontWeight:800, color:'#a371f7' }}>用 150 行 C 代码写一个极简容器</div>
              <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:4 }}>
                展示 Docker 的核心原理：clone() + pivot_root + cgroup + execve
              </div>
            </div>
            <pre style={{ margin:0, padding:'14px 16px', fontSize:11, lineHeight:1.65, fontFamily:'monospace', color:'var(--text-primary)', background:'var(--bg-secondary)', border:'1px solid #a371f740', borderRadius:10, overflowX:'auto', maxHeight:500 }}>
{`/* minicontainer.c — 极简容器，需要 root 权限运行 */
#define _GNU_SOURCE
#include <sched.h>
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <string.h>
#include <sys/mount.h>
#include <sys/wait.h>
#include <sys/stat.h>
#include <fcntl.h>

#define ROOTFS "/tmp/minicontainer-rootfs"  /* 容器根文件系统 */
#define STACK_SIZE (1024 * 1024)

/* 容器内运行的函数（新 namespace 内）*/
static int container_main(void *arg) {
    char **argv = (char **)arg;

    /* 1. 挂载 proc（容器内的 /proc）*/
    mount("proc", "/proc", "proc", 0, NULL);

    /* 2. pivot_root: 切换根文件系统 */
    /* 真实场景: chroot ROOTFS 或 pivot_root */
    /* 简化起见用 chroot */
    if (chroot(ROOTFS) || chdir("/")) {
        perror("chroot"); return 1;
    }

    /* 3. 设置 hostname */
    sethostname("container", 9);

    /* 4. 执行容器内的命令 */
    printf("[container] PID=%d, hostname=container\\n", getpid());
    execvp(argv[0], argv);
    perror("exec"); return 1;
}

int main(int argc, char *argv[]) {
    if (argc < 2) { fprintf(stderr, "Usage: %s <cmd>\\n", argv[0]); return 1; }

    /* 准备子进程栈 */
    char *stack = malloc(STACK_SIZE);
    char *stack_top = stack + STACK_SIZE;

    /* clone() 创建新进程，同时创建新 namespace */
    int flags = CLONE_NEWPID    /* 新 PID namespace，子进程 PID=1 */
              | CLONE_NEWNS     /* 新 Mount namespace */
              | CLONE_NEWUTS    /* 新 UTS namespace（hostname 隔离）*/
              | CLONE_NEWNET    /* 新 Net namespace（无网络访问）*/
              | SIGCHLD;

    pid_t pid = clone(container_main, stack_top, flags, &argv[1]);
    if (pid < 0) { perror("clone"); return 1; }

    printf("[host] container PID on host = %d\\n", pid);

    /* 5. 设置 cgroup 限制内存 256MB */
    char cg_path[128];
    snprintf(cg_path, sizeof(cg_path),
             "/sys/fs/cgroup/memory/mini/%d", pid);
    mkdir("/sys/fs/cgroup/memory/mini", 0755);
    char limit_path[160];
    snprintf(limit_path, sizeof(limit_path), "%s/memory.limit_in_bytes", cg_path);
    int fd = open(limit_path, O_WRONLY|O_CREAT, 0644);
    write(fd, "268435456\\n", 10);  /* 256 * 1024 * 1024 */
    close(fd);

    /* 等待容器进程退出 */
    int status;
    waitpid(pid, &status, 0);
    printf("[host] container exited: %d\\n", WEXITSTATUS(status));
    free(stack);
    return 0;
}

/* 编译运行:
   gcc -o minicontainer minicontainer.c
   sudo ./minicontainer /bin/bash

   # 容器内验证:
   echo $$          # PID=1
   hostname         # container
   ps aux           # 只看到自己
   ip addr          # 只有 lo (net namespace 隔离) */`}
            </pre>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main Linux View ──────────────────────────────────────────────────────────

const TABS = [
  { id: 'commands',  label: '📋 Commands',    comp: CommandsTab },
  { id: 'process',   label: '⚙️ task_struct', comp: ProcessTab },
  { id: 'ipc',       label: '🔌 IPC',         comp: IpcTab },
  { id: 'signals',   label: '📡 Signals',     comp: SignalsTab },
  { id: 'syscalls',  label: '⚙ Syscalls',    comp: SyscallsTab },
  { id: 'kernelboot',label: '🚀 Kernel Boot', comp: KernelBootTab },
  { id: 'vfs',       label: '📁 VFS',         comp: VfsTab },
  { id: 'ebpf',      label: '🔭 eBPF',        comp: EbpfTab },
  { id: 'containers',label: '📦 Containers',  comp: ContainersTab },
]

export default function LinuxView() {
  const [tab, setTab] = useState('commands')
  const isMobile = useMobile()
  const Current = TABS.find(t => t.id === tab)?.comp ?? CommandsTab

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', flexShrink: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              padding: isMobile ? '8px 12px' : '12px 22px', border: 'none', background: 'transparent',
              borderBottom: tab === t.id ? '2px solid var(--accent-blue)' : '2px solid transparent',
              color: tab === t.id ? 'var(--text-primary)' : 'var(--text-muted)',
              cursor: 'pointer', fontSize: isMobile ? 11 : 13, fontWeight: tab === t.id ? 700 : 400,
              flexShrink: 0, whiteSpace: 'nowrap',
            }}>
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <Current />
      </div>
    </div>
  )
}
