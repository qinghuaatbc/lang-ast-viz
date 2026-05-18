import React, { useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Protocol {
  id: string
  name: string
  icon: string
  color: string
  category: 'serial' | 'field' | 'soc' | 'wireless'
  shortDesc: string
  specs: { label: string; value: string }[]
  pinout: PinDef[]
  diagram: string   // SVG as JSX string key
  code: string
  codeTitle: string
  notes: string
}

interface PinDef {
  pin: string; signal: string; dir: '→'|'←'|'↔'|'—'; color: string; desc: string
}

// ─── Protocol Data ────────────────────────────────────────────────────────────

const PROTOCOLS: Protocol[] = [
  {
    id: 'rs232', name: 'RS-232', icon: '🔌', color: '#4d8fff', category: 'serial',
    shortDesc: '点对点串口通信，最大15m，±12V电平，DB9接口，用于调试终端/工业设备',
    specs: [
      { label: '拓扑', value: '点对点 (1:1)' },
      { label: '电平', value: '逻辑1: -3~-15V   逻辑0: +3~+15V' },
      { label: '速率', value: '最高 115200 bps（实际可达1Mbps）' },
      { label: '距离', value: '最大 15m（标准），100m（低速）' },
      { label: '接口', value: 'DB9 / DB25' },
      { label: '全双工', value: '是（TX/RX独立）' },
    ],
    pinout: [
      { pin: '2', signal: 'RXD', dir: '←', color: '#3fb950', desc: '接收数据' },
      { pin: '3', signal: 'TXD', dir: '→', color: '#58a6ff', desc: '发送数据' },
      { pin: '4', signal: 'DTR', dir: '→', color: '#ffa657', desc: '数据终端就绪' },
      { pin: '5', signal: 'GND', dir: '—', color: '#8b949e', desc: '信号地' },
      { pin: '6', signal: 'DSR', dir: '←', color: '#d2a8ff', desc: '数据集就绪' },
      { pin: '7', signal: 'RTS', dir: '→', color: '#f85149', desc: '请求发送' },
      { pin: '8', signal: 'CTS', dir: '←', color: '#e3b341', desc: '清除发送（允许发送）' },
    ],
    diagram: 'rs232',
    code: `/* RS-232 串口通信 — Linux termios API */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <fcntl.h>
#include <termios.h>
#include <errno.h>

int serial_open(const char *dev, int baud) {
    int fd = open(dev, O_RDWR | O_NOCTTY | O_NDELAY);
    if (fd < 0) return -1;

    struct termios tty;
    tcgetattr(fd, &tty);

    /* 波特率 */
    speed_t speed = B115200;
    if (baud == 9600)   speed = B9600;
    if (baud == 57600)  speed = B57600;
    cfsetispeed(&tty, speed);
    cfsetospeed(&tty, speed);

    /* 8N1: 8位数据, 无校验, 1停止位 */
    tty.c_cflag &= ~PARENB;         /* 无奇偶校验 */
    tty.c_cflag &= ~CSTOPB;         /* 1个停止位 */
    tty.c_cflag &= ~CSIZE;
    tty.c_cflag |=  CS8;            /* 8位数据位 */
    tty.c_cflag &= ~CRTSCTS;        /* 关闭硬件流控 */
    tty.c_cflag |=  CREAD | CLOCAL; /* 允许读，忽略调制解调器信号 */

    /* 原始模式：不做字符处理 */
    tty.c_lflag &= ~(ICANON | ECHO | ECHOE | ISIG);
    tty.c_iflag &= ~(IXON | IXOFF | IXANY); /* 关闭软件流控 */
    tty.c_oflag &= ~OPOST;

    /* 读超时：100ms */
    tty.c_cc[VMIN]  = 0;
    tty.c_cc[VTIME] = 1; /* 单位0.1秒 */

    tcsetattr(fd, TCSANOW, &tty);
    return fd;
}

int main(void) {
    /* 树莓派: /dev/ttyS0 或 /dev/ttyAMA0
       PC:     /dev/ttyUSB0 或 /dev/ttyS0 */
    int fd = serial_open("/dev/ttyUSB0", 115200);
    if (fd < 0) {
        /* 模拟演示：创建虚拟串口对 socat pty,raw pty,raw */
        printf("串口打开失败: %s\\n", strerror(errno));
        printf("演示命令: socat -d -d pty,raw,echo=0 pty,raw,echo=0\\n");
        return 1;
    }

    /* 发送 */
    const char *msg = "Hello RS-232!\\r\\n";
    write(fd, msg, strlen(msg));
    printf("发送: %s", msg);

    /* 接收（超时100ms）*/
    char buf[256];
    ssize_t n = read(fd, buf, sizeof(buf)-1);
    if (n > 0) { buf[n] = 0; printf("接收: %s", buf); }

    close(fd);
    return 0;
}`,
    codeTitle: 'RS-232 termios API (Linux)',
    notes: 'RS-232 电平与 UART (TTL 3.3V/5V) 不同，需要 MAX232/MAX3232 芯片转换。树莓派 GPIO 14/15 是 3.3V TTL UART，直连 PC RS-232 会损坏芯片。USB转串口芯片（CP2102, CH340, FT232）实际上内部做了电平转换。',
  },

  {
    id: 'rs485', name: 'RS-485', icon: '🔗', color: '#3fb950', category: 'serial',
    shortDesc: '多点差分总线，最大1200m，32节点，工业自动化Modbus的物理层',
    specs: [
      { label: '拓扑', value: '总线（多点，最多32个节点）' },
      { label: '电平', value: '差分：A-B > +0.2V = 逻辑1，A-B < -0.2V = 逻辑0' },
      { label: '速率', value: '最高 10 Mbps（短距），1200m时约100kbps' },
      { label: '距离', value: '最大 1200m（带中继可更长）' },
      { label: '接口', value: '2线（半双工）/ 4线（全双工）' },
      { label: '抗噪', value: '优秀（差分信号，共模噪声抑制）' },
    ],
    pinout: [
      { pin: 'A', signal: 'A(+)', dir: '↔', color: '#58a6ff', desc: '差分正线（非反相）' },
      { pin: 'B', signal: 'B(-)', dir: '↔', color: '#f85149', desc: '差分负线（反相）' },
      { pin: 'GND', signal: 'GND', dir: '—', color: '#8b949e', desc: '参考地（建议连接）' },
      { pin: 'RE', signal: 'RE#', dir: '→', color: '#d2a8ff', desc: '接收使能（低有效）' },
      { pin: 'DE', signal: 'DE', dir: '→', color: '#ffa657', desc: '发送使能（高有效）' },
    ],
    diagram: 'rs485',
    code: `/* RS-485 半双工通信 — 带方向控制 GPIO */
#define _GNU_SOURCE
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <fcntl.h>
#include <termios.h>
#include <sys/ioctl.h>
#include <linux/serial.h>

/* RS-485 半双工：发送前拉高 DE，发送完拉低 DE/RE */
/* 某些 USB转485芯片和 MCU UART 支持 RS485 硬件模式 */

int rs485_enable(int fd) {
    struct serial_rs485 rs485conf = {
        .flags = SER_RS485_ENABLED | SER_RS485_RTS_ON_SEND,
        .delay_rts_before_send = 0,
        .delay_rts_after_send  = 0,
    };
    return ioctl(fd, TIOCSRS485, &rs485conf);
}

/* Modbus RTU CRC16 */
uint16_t modbus_crc(const uint8_t *buf, int len) {
    uint16_t crc = 0xFFFF;
    for (int i = 0; i < len; i++) {
        crc ^= buf[i];
        for (int j = 0; j < 8; j++)
            crc = (crc & 1) ? (crc >> 1) ^ 0xA001 : crc >> 1;
    }
    return crc;
}

int main(void) {
    /* Modbus RTU 读保持寄存器示例 */
    /* 功能码 0x03: 读保持寄存器 */
    uint8_t req[] = {
        0x01,       /* 从站地址 1 */
        0x03,       /* 功能码: 读保持寄存器 */
        0x00, 0x00, /* 起始地址 0 */
        0x00, 0x02, /* 寄存器数量 2 */
        0x00, 0x00  /* CRC占位 */
    };
    uint16_t crc = modbus_crc(req, 6);
    req[6] = crc & 0xFF;
    req[7] = (crc >> 8) & 0xFF;

    printf("Modbus RTU 读请求 (站地址=1, 读2个保持寄存器):\\n");
    for (int i = 0; i < 8; i++) printf("%02X ", req[i]);
    printf("\\n");
    printf("CRC = 0x%04X\\n", crc);

    printf("\\n报文解析:\\n");
    printf("  [0] 从站地址: 0x%02X\\n", req[0]);
    printf("  [1] 功能码:   0x%02X (读保持寄存器)\\n", req[1]);
    printf("  [2-3] 起始地址: 0x%04X\\n", (req[2]<<8)|req[3]);
    printf("  [4-5] 寄存器数: %d\\n", (req[4]<<8)|req[5]);
    printf("  [6-7] CRC16:  0x%02X%02X\\n", req[7], req[6]);
    return 0;
}`,
    codeTitle: 'RS-485 / Modbus RTU (Linux)',
    notes: '工业现场 RS-485 总线两端需要 120Ω 终端电阻，否则信号反射导致误码。UART SER_RS485_ENABLED ioctl 让内核自动在发送时拉高 DE 引脚（需驱动支持）。Modbus TCP 是在以太网上的 Modbus，但帧结构不同（无 CRC，改用 MBAP 头）。',
  },

  {
    id: 'spi', name: 'SPI', icon: '⚡', color: '#e3b341', category: 'soc',
    shortDesc: '同步串行总线，4线全双工，高速（MHz级），SoC片上外设标准接口',
    specs: [
      { label: '线数', value: '4线：SCLK, MOSI, MISO, CS' },
      { label: '速率', value: '树莓派最高 125MHz，通常 1–50MHz' },
      { label: '距离', value: '板级（<30cm）' },
      { label: '拓扑', value: '主从（1主多从，每从1个CS线）' },
      { label: '模式', value: 'Mode 0-3（CPOL/CPHA组合）' },
      { label: '用途', value: 'Flash/SD卡/显示屏/ADC/DAC/传感器' },
    ],
    pinout: [
      { pin: 'SCLK', signal: 'CLK', dir: '→', color: '#e3b341', desc: '时钟（主机输出）' },
      { pin: 'MOSI', signal: 'MOSI', dir: '→', color: '#58a6ff', desc: 'Master Out Slave In' },
      { pin: 'MISO', signal: 'MISO', dir: '←', color: '#3fb950', desc: 'Master In Slave Out' },
      { pin: 'CS0',  signal: 'CE0#', dir: '→', color: '#f85149', desc: '片选0（低有效）' },
      { pin: 'GND',  signal: 'GND',  dir: '—', color: '#8b949e', desc: '共地' },
    ],
    diagram: 'spi',
    code: `/* SPI 通信 — Linux spidev 驱动 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <fcntl.h>
#include <sys/ioctl.h>
#include <linux/spi/spidev.h>
#include <stdint.h>

/* 树莓派 SPI 引脚:
   GPIO 11 (Pin 23) = SCLK
   GPIO 10 (Pin 19) = MOSI
   GPIO  9 (Pin 21) = MISO
   GPIO  8 (Pin 24) = CE0 (CS0)
   需在 /boot/config.txt 添加: dtoverlay=spi0-1cs */

int spi_init(const char *dev, uint32_t speed, uint8_t mode) {
    int fd = open(dev, O_RDWR);
    if (fd < 0) return -1;

    /* SPI 模式 (CPOL/CPHA) */
    ioctl(fd, SPI_IOC_WR_MODE, &mode);

    /* 字长 8bit */
    uint8_t bits = 8;
    ioctl(fd, SPI_IOC_WR_BITS_PER_WORD, &bits);

    /* 时钟速率 */
    ioctl(fd, SPI_IOC_WR_MAX_SPEED_HZ, &speed);

    return fd;
}

/* 全双工传输: tx发送同时rx接收（MOSI和MISO同步） */
int spi_transfer(int fd, uint8_t *tx, uint8_t *rx, int len) {
    struct spi_ioc_transfer tr = {
        .tx_buf = (unsigned long)tx,
        .rx_buf = (unsigned long)rx,
        .len    = len,
        .speed_hz = 1000000,  /* 1MHz */
        .delay_usecs = 0,
        .bits_per_word = 8,
    };
    return ioctl(fd, SPI_IOC_MESSAGE(1), &tr);
}

int main(void) {
    /* MCP3204: 4通道12位ADC via SPI */
    /* 读命令: [start|单端|CH2|CH1|CH0] */
    uint8_t tx[3] = { 0x06, 0x00, 0x00 }; /* 读CH0 */
    uint8_t rx[3] = { 0 };

    printf("SPI MCP3204 ADC 读取命令模拟:\\n");
    printf("TX: %02X %02X %02X\\n", tx[0], tx[1], tx[2]);

    /* 解析12位结果（实际硬件才有意义）*/
    int raw = ((rx[1] & 0x0F) << 8) | rx[2];
    printf("RX (模拟): %02X %02X %02X\\n", rx[0], rx[1], rx[2]);
    printf("12位ADC值: %d (%.2fV @ 3.3V参考)\\n",
           raw, raw * 3.3 / 4095.0);

    printf("\\n树莓派 SPI 设备: /dev/spidev0.0\\n");
    printf("启用SPI: sudo raspi-config → Interface Options → SPI\\n");
    return 0;
}`,
    codeTitle: 'SPI spidev API (Linux/树莓派)',
    notes: 'SPI Mode 0 (CPOL=0,CPHA=0) 最常见。树莓派默认 SPI0 CE0=/dev/spidev0.0，CE1=/dev/spidev0.1。spidev 驱动做全双工传输，同一时刻 MOSI 发出，MISO 采样。多个从设备通过独立的 CS 线选通，同一时刻只有一个 CS 为低。',
  },

  {
    id: 'i2c', name: 'I²C', icon: '🔄', color: '#d2a8ff', category: 'soc',
    shortDesc: '两线总线，支持127个设备，传感器/OLED/EEPROM标准接口，5V/3.3V通用',
    specs: [
      { label: '线数', value: '2线：SDA (数据), SCL (时钟)' },
      { label: '速率', value: '标准100kHz, 快速400kHz, 高速3.4MHz' },
      { label: '地址', value: '7位地址（127个设备）/ 10位地址（扩展）' },
      { label: '拓扑', value: '总线（多主多从，开漏上拉）' },
      { label: '用途', value: 'BME280传感器/SSD1306 OLED/EEPROM/RTC' },
      { label: '上拉', value: '需要4.7kΩ上拉至VCC' },
    ],
    pinout: [
      { pin: 'SDA', signal: 'SDA', dir: '↔', color: '#58a6ff', desc: '数据线（双向，开漏）' },
      { pin: 'SCL', signal: 'SCL', dir: '→', color: '#e3b341', desc: '时钟线（主机驱动）' },
      { pin: 'VCC', signal: '3.3V', dir: '—', color: '#f85149', desc: '电源（3.3V或5V）' },
      { pin: 'GND', signal: 'GND', dir: '—', color: '#8b949e', desc: '地' },
    ],
    diagram: 'i2c',
    code: `/* I2C 通信 — Linux i2c-dev 驱动 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <fcntl.h>
#include <sys/ioctl.h>
#include <linux/i2c-dev.h>
#include <linux/i2c.h>
#include <stdint.h>

/* 树莓派 I2C 引脚:
   GPIO 2 (Pin 3) = SDA1
   GPIO 3 (Pin 5) = SCL1
   设备文件: /dev/i2c-1
   启用: sudo raspi-config → Interface Options → I2C */

/* 写寄存器 */
int i2c_write_reg(int fd, uint8_t reg, uint8_t val) {
    uint8_t buf[2] = { reg, val };
    return write(fd, buf, 2) == 2 ? 0 : -1;
}

/* 读寄存器（先写地址，再读数据）*/
int i2c_read_reg(int fd, uint8_t reg, uint8_t *data, int len) {
    /* I2C SMBus write-then-read */
    struct i2c_msg msgs[2] = {
        { .flags = 0,         .buf = &reg,  .len = 1   },
        { .flags = I2C_M_RD,  .buf = data,  .len = len },
    };
    struct i2c_rdwr_ioctl_data io = { .msgs = msgs, .nmsgs = 2 };
    return ioctl(fd, I2C_RDWR, &io);
}

int main(void) {
    /* BME280 温湿度气压传感器 (I2C地址 0x76 或 0x77) */
    int fd = open("/dev/i2c-1", O_RDWR);
    if (fd < 0) {
        printf("I2C设备不可用（非树莓派环境）\\n");
        /* 模拟BME280读取流程 */
    }

    uint8_t addr = 0x76; /* BME280 默认地址 */
    if (fd >= 0) ioctl(fd, I2C_SLAVE, addr);

    printf("BME280 传感器读取流程:\\n");
    printf("1. 写寄存器 0xF2 (ctrl_hum) = 0x01 (湿度过采样x1)\\n");
    printf("2. 写寄存器 0xF4 (ctrl_meas) = 0x27 (温度x1, 压力x1, 强制模式)\\n");
    printf("3. 读寄存器 0xF7-0xFC (原始数据: press/temp/hum)\\n");

    uint8_t chip_id = 0;
    if (fd >= 0) {
        i2c_read_reg(fd, 0xD0, &chip_id, 1); /* ID寄存器 */
        printf("Chip ID: 0x%02X (BME280应为0x60)\\n", chip_id);
    }

    printf("\\n扫描I2C总线命令: i2cdetect -y 1\\n");
    printf("读寄存器命令: i2cget -y 1 0x76 0xD0\\n");

    if (fd >= 0) close(fd);
    return 0;
}`,
    codeTitle: 'I²C i2c-dev API + BME280 传感器',
    notes: 'I2C 开漏输出：SDA/SCL 低电平由设备驱动，高电平靠上拉电阻。多主仲裁基于线与逻辑。树莓派 GPIO2(SDA)/GPIO3(SCL) 内置了1.8kΩ上拉到3.3V，无需外加电阻。用 `i2cdetect -y 1` 扫描总线上所有设备地址。',
  },

  {
    id: 'uart', name: 'UART/TTL', icon: '📡', color: '#ffa657', category: 'soc',
    shortDesc: '最基础的异步串行，3.3V/5V，无时钟线，树莓派调试首选',
    specs: [
      { label: '线数', value: '2线最小（TX/RX），可选RTS/CTS' },
      { label: '速率', value: '常用 9600/115200 bps，树莓派默认 115200' },
      { label: '电平', value: '树莓派: 3.3V TTL（勿接5V!）' },
      { label: '距离', value: '<1m（板级），转RS232可达15m' },
      { label: '用途', value: '调试串口/GPS模块/蓝牙模块/GSM模块' },
      { label: '时钟', value: '无，双方约定相同波特率' },
    ],
    pinout: [
      { pin: 'GPIO14', signal: 'TXD0', dir: '→', color: '#58a6ff', desc: '发送（连接目标RX）' },
      { pin: 'GPIO15', signal: 'RXD0', dir: '←', color: '#3fb950', desc: '接收（连接目标TX）' },
      { pin: 'GND',    signal: 'GND',  dir: '—', color: '#8b949e', desc: '必须共地！' },
    ],
    diagram: 'uart',
    code: `/* UART 异步串行 — 树莓派 /dev/ttyS0 或 /dev/ttyAMA0 */
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <fcntl.h>
#include <termios.h>
#include <time.h>

/* GPS NMEA 句子解析示例 */
/* $GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47 */

typedef struct {
    double lat, lon;
    int satellites;
    double altitude;
    int fix;
} GPSFix;

int parse_gpgga(const char *line, GPSFix *gps) {
    char type[8], time[16], lat[16], ns, lon[16], ew;
    int fix, sat; double hdop, alt; char alt_unit;
    int n = sscanf(line, "$%7[^,],%15[^,],%15[^,],%c,%15[^,],%c,%d,%d,%lf,%lf,%c",
        type, time, lat, &ns, lon, &ew, &fix, &sat, &hdop, &alt, &alt_unit);
    if (n < 10 || strcmp(type, "GPGGA") != 0) return -1;
    gps->fix = fix;
    gps->satellites = sat;
    gps->altitude = alt;
    /* 转换 DDMM.MMMM → 十进制度 */
    double raw_lat = atof(lat);
    int d = (int)(raw_lat / 100);
    gps->lat = d + (raw_lat - d * 100) / 60.0;
    if (ns == 'S') gps->lat = -gps->lat;
    double raw_lon = atof(lon);
    d = (int)(raw_lon / 100);
    gps->lon = d + (raw_lon - d * 100) / 60.0;
    if (ew == 'W') gps->lon = -gps->lon;
    return 0;
}

int main(void) {
    /* 模拟 GPS NMEA 数据 */
    const char *samples[] = {
        "$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47",
        "$GPGGA,123520,3149.023,N,11706.834,E,1,12,0.6,10.0,M,-18.1,M,,*5A",
    };
    for (int i = 0; i < 2; i++) {
        GPSFix g;
        if (parse_gpgga(samples[i], &g) == 0)
            printf("Fix=%d  Sats=%d  Lat=%.6f  Lon=%.6f  Alt=%.1fm\\n",
                g.fix, g.satellites, g.lat, g.lon, g.altitude);
    }
    printf("\\n树莓派GPS接线:\\n");
    printf("  GPS VCC  → RPi 3.3V (Pin 1)\\n");
    printf("  GPS GND  → RPi GND  (Pin 6)\\n");
    printf("  GPS TX   → RPi RXD0 (Pin 10, GPIO15)\\n");
    printf("  GPS RX   → RPi TXD0 (Pin 8,  GPIO14)  可选\\n");
    printf("读取: cat /dev/ttyS0 | grep GPGGA\\n");
    return 0;
}`,
    codeTitle: 'UART + GPS NMEA 解析 (树莓派)',
    notes: '树莓派 /dev/ttyAMA0 是硬件UART（更稳定），/dev/ttyS0 是mini UART（受CPU频率影响）。默认 ttyAMA0 被蓝牙占用，要用硬件UART需在 config.txt 加 dtoverlay=disable-bt 或 dtoverlay=miniuart-bt。',
  },

  {
    id: 'can', name: 'CAN Bus', icon: '🚗', color: '#f85149', category: 'field',
    shortDesc: '汽车/工业差分总线，多主竞争，最高1Mbit，OBD2诊断标准接口',
    specs: [
      { label: '线数', value: '2线差分: CAN_H, CAN_L' },
      { label: '速率', value: '最高 1 Mbps（汽车），FD可达8Mbps' },
      { label: '距离', value: '40m@1Mbps，500m@125kbps' },
      { label: '拓扑', value: '总线（多主，CSMA/CA仲裁）' },
      { label: '帧格式', value: '11位/29位ID，最大8字节数据' },
      { label: '用途', value: 'OBD2车辆诊断/工业PLC/机器人ROS' },
    ],
    pinout: [
      { pin: 'CAN_H', signal: 'CAN_H', dir: '↔', color: '#f85149', desc: '差分高（显性=2.5V，隐性=3.5V）' },
      { pin: 'CAN_L', signal: 'CAN_L', dir: '↔', color: '#58a6ff', desc: '差分低（显性=2.5V，隐性=1.5V）' },
      { pin: '120Ω',  signal: 'RT',    dir: '—', color: '#8b949e', desc: '两端各需120Ω终端电阻' },
    ],
    diagram: 'can',
    code: `/* CAN Bus — Linux SocketCAN API */
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <net/if.h>
#include <sys/ioctl.h>
#include <sys/socket.h>
#include <linux/can.h>
#include <linux/can/raw.h>
#include <stdint.h>

/* 树莓派 CAN 接线 (MCP2515 + TJA1050):
   MCP2515 SPI → 树莓派 SPI0
   /boot/config.txt: dtoverlay=mcp2515-can0,oscillator=8000000,interrupt=25
   启动: sudo ip link set can0 up type can bitrate 500000 */

/* OBD-II PID 读取: 发 {0x7DF, [02 01 PID 00 00 00 00 00]} */
#define OBD_REQ_ID  0x7DF  /* 广播请求所有ECU */
#define OBD_RESP_ID 0x7E8  /* ECU1响应 */

void print_can_frame(const struct can_frame *f) {
    printf("ID=0x%03X DLC=%d Data:", f->can_id & CAN_EFF_MASK, f->can_dlc);
    for (int i = 0; i < f->can_dlc; i++) printf(" %02X", f->data[i]);
    printf("\\n");
}

int main(void) {
    /* OBD-II 常用 PID 模拟 */
    struct { uint8_t pid; const char *name; const char *unit; } pids[] = {
        { 0x0C, "发动机转速",   "rpm" },
        { 0x0D, "车速",        "km/h" },
        { 0x05, "冷却水温度",   "°C"  },
        { 0x04, "发动机负荷",   "%" },
        { 0x11, "节气门位置",   "%" },
    };

    printf("OBD-II CAN 请求帧示例:\\n");
    for (int i = 0; i < 5; i++) {
        struct can_frame req = {
            .can_id  = OBD_REQ_ID,
            .can_dlc = 8,
            .data    = {0x02, 0x01, pids[i].pid, 0,0,0,0,0}
        };
        printf("[%-12s] ", pids[i].name);
        print_can_frame(&req);
    }

    printf("\\n启动命令:\\n");
    printf("  sudo ip link set can0 up type can bitrate 500000\\n");
    printf("  candump can0          # 抓包\\n");
    printf("  cansend can0 7DF#02010C0000000000  # 读RPM\\n");
    return 0;
}`,
    codeTitle: 'CAN Bus / OBD-II (Linux SocketCAN)',
    notes: 'SocketCAN 是 Linux 内核的 CAN 协议栈，把 CAN 接口当作普通网络接口处理（ip link 命令）。树莓派通过 MCP2515 SPI→CAN 控制器芯片 + TJA1050 收发器连接 CAN 总线。汽车 OBD-II 接口是 CAN 2.0B，500kbps，11位ID。',
  },

  {
    id: 'ethernet', name: '以太网 / NIC', icon: '🌐', color: '#58a6ff', category: 'field',
    shortDesc: 'TCP/IP物理层，RJ45，100Mbps/1Gbps，Linux网卡驱动架构',
    specs: [
      { label: '标准', value: '100BASE-TX (5类线), 1000BASE-T (5e类线)' },
      { label: '接口', value: 'RJ45 (8P8C)，4对双绞线' },
      { label: '速率', value: '10/100/1000 Mbps，最高 100Gbps' },
      { label: '距离', value: '100m (铜线)，2km+ (光纤)' },
      { label: '协议', value: 'IEEE 802.3，全双工，自协商' },
      { label: 'Linux', value: 'ethtool/ip link，raw socket，AF_PACKET' },
    ],
    pinout: [
      { pin: '1,2', signal: 'TX+/TX-', dir: '→', color: '#58a6ff', desc: '发送差分对' },
      { pin: '3,6', signal: 'RX+/RX-', dir: '←', color: '#3fb950', desc: '接收差分对' },
      { pin: '4,5', signal: 'BI_DA', dir: '↔', color: '#ffa657', desc: '双向（千兆使用全部4对）' },
      { pin: '7,8', signal: 'BI_DB', dir: '↔', color: '#d2a8ff', desc: '双向（千兆使用全部4对）' },
    ],
    diagram: 'ethernet',
    code: `/* 原始以太网帧 — AF_PACKET socket */
#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/socket.h>
#include <arpa/inet.h>
#include <netinet/in.h>
#include <net/if.h>
#include <net/ethernet.h>
#include <linux/if_packet.h>
#include <sys/ioctl.h>
#include <stdint.h>

/* 以太网帧结构 */
struct eth_frame {
    uint8_t  dst[6];    /* 目标 MAC */
    uint8_t  src[6];    /* 源 MAC */
    uint16_t ethertype; /* 0x0800=IPv4, 0x0806=ARP, 0x86DD=IPv6 */
    uint8_t  payload[]; /* 数据（46-1500字节）*/
} __attribute__((packed));

void mac_str(const uint8_t *mac, char *buf) {
    sprintf(buf, "%02X:%02X:%02X:%02X:%02X:%02X",
            mac[0],mac[1],mac[2],mac[3],mac[4],mac[5]);
}

int main(void) {
    /* 创建原始套接字（需要 CAP_NET_RAW 权限）*/
    int sock = socket(AF_PACKET, SOCK_RAW, htons(ETH_P_ALL));
    if (sock < 0) {
        printf("需要 root 权限: sudo ./a.out\\n");
        printf("\\n以太网帧格式 (最小64字节, 最大1518字节):\\n");
        printf("  [6]目标MAC | [6]源MAC | [2]类型 | [46-1500]数据 | [4]FCS\\n");
        printf("\\n常见 EtherType:\\n");
        printf("  0x0800 IPv4\\n  0x0806 ARP\\n  0x86DD IPv6\\n  0x8100 VLAN\\n");
        printf("\\n抓包命令: sudo tcpdump -i eth0 -xx -n\\n");
        printf("网卡信息: ethtool eth0\\n");
        printf("混杂模式: sudo ip link set eth0 promisc on\\n");
        return 0;
    }

    /* 抓一个帧 */
    uint8_t buf[2048];
    ssize_t n = recv(sock, buf, sizeof(buf), 0);
    if (n > 14) {
        struct eth_frame *f = (struct eth_frame *)buf;
        char src[20], dst[20];
        mac_str(f->src, src); mac_str(f->dst, dst);
        printf("Src: %s → Dst: %s  Type: 0x%04X  Len: %zd\\n",
               src, dst, ntohs(f->ethertype), n);
    }
    close(sock);
    return 0;
}`,
    codeTitle: '原始以太网帧 (AF_PACKET)',
    notes: 'AF_PACKET 可以发送和接收原始以太网帧，需要 CAP_NET_RAW。tcpdump/wireshark 底层就用 AF_PACKET + libpcap。网卡驱动使用 NAPI 机制（中断+轮询混合）处理高速数据流，减少中断次数。大流量时可开启 RSS（多队列）和 XDP（eBPF快速路径）。',
  },

  {
    id: 'gpio', name: 'GPIO (树莓派)', icon: '🍓', color: '#ff6b6b', category: 'soc',
    shortDesc: '树莓派40Pin GPIO，PWM/中断/sysfs/gpiod，LED/继电器/编码器控制',
    specs: [
      { label: '引脚数', value: '40 Pin (RPi 2B+)，26 Pin (RPi 1)' },
      { label: '电压', value: '3.3V 逻辑电平（勿接5V！）' },
      { label: '电流', value: '单引脚最大 16mA，总计 50mA' },
      { label: '功能', value: 'GPIO/UART/SPI/I2C/PWM/PCM' },
      { label: '驱动', value: 'sysfs(旧) / libgpiod(推荐) / pigpio(PWM)' },
      { label: '中断', value: '上升沿/下降沿/双边沿 中断' },
    ],
    pinout: [
      { pin: '2,4', signal: '5V', dir: '—', color: '#f85149', desc: '5V 电源输出（来自USB）' },
      { pin: '1,17', signal: '3.3V', dir: '—', color: '#ffa657', desc: '3.3V 电源输出（50mA限制）' },
      { pin: '6,9,14,20,25,30,34,39', signal: 'GND', dir: '—', color: '#8b949e', desc: '地' },
      { pin: '3(GPIO2)', signal: 'SDA1', dir: '↔', color: '#d2a8ff', desc: 'I2C数据（默认I2C1）' },
      { pin: '5(GPIO3)', signal: 'SCL1', dir: '↔', color: '#e3b341', desc: 'I2C时钟（默认I2C1）' },
      { pin: '8(GPIO14)', signal: 'TXD0', dir: '→', color: '#58a6ff', desc: 'UART发送' },
      { pin: '10(GPIO15)', signal: 'RXD0', dir: '←', color: '#3fb950', desc: 'UART接收' },
    ],
    diagram: 'gpio',
    code: `/* GPIO 控制 — Linux gpiod 库（推荐方式）*/
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <string.h>
#include <fcntl.h>

/* 使用 sysfs 接口（无需安装库，所有Linux通用）*/

int gpio_export(int pin) {
    char buf[64];
    int fd = open("/sys/class/gpio/export", O_WRONLY);
    if (fd < 0) return -1;
    snprintf(buf, sizeof(buf), "%d", pin);
    write(fd, buf, strlen(buf));
    close(fd);
    return 0;
}

int gpio_direction(int pin, const char *dir) { /* "in" or "out" */
    char path[64];
    snprintf(path, sizeof(path), "/sys/class/gpio/gpio%d/direction", pin);
    int fd = open(path, O_WRONLY);
    if (fd < 0) return -1;
    write(fd, dir, strlen(dir));
    close(fd);
    return 0;
}

int gpio_write(int pin, int val) {
    char path[64];
    snprintf(path, sizeof(path), "/sys/class/gpio/gpio%d/value", pin);
    int fd = open(path, O_WRONLY);
    if (fd < 0) return -1;
    write(fd, val ? "1" : "0", 1);
    close(fd);
    return 0;
}

int gpio_read(int pin) {
    char path[64], c;
    snprintf(path, sizeof(path), "/sys/class/gpio/gpio%d/value", pin);
    int fd = open(path, O_RDONLY);
    if (fd < 0) return -1;
    read(fd, &c, 1);
    close(fd);
    return c == '1' ? 1 : 0;
}

int main(void) {
    /* LED: GPIO17 (Pin 11) 闪烁 */
    int led_pin = 17;
    gpio_export(led_pin);
    gpio_direction(led_pin, "out");

    printf("LED (GPIO17) 闪烁3次...\\n");
    for (int i = 0; i < 3; i++) {
        gpio_write(led_pin, 1); printf("  ON\\n");  usleep(500000);
        gpio_write(led_pin, 0); printf("  OFF\\n"); usleep(500000);
    }

    printf("\\n树莓派 GPIO 常用命令:\\n");
    printf("  raspi-gpio get          # 查看所有GPIO状态\\n");
    printf("  raspi-gpio set 17 op    # 设为输出\\n");
    printf("  raspi-gpio set 17 dh    # 设为高电平\\n");
    printf("  gpio -g mode 17 out     # WiringPi (已弃用)\\n");
    printf("  gpioset gpiochip0 17=1  # libgpiod\\n");
    return 0;
}`,
    codeTitle: 'GPIO sysfs + gpiod (树莓派)',
    notes: 'sysfs GPIO 接口（/sys/class/gpio/）在 Linux 4.8+ 被废弃，推荐用 libgpiod（gpiod_chip_open, gpiod_line_request_output）。PWM: 硬件PWM仅 GPIO12/13/18/19，软件PWM用 pigpio 库（1μs精度）。中断: poll() /sys/class/gpio/gpioN/value，或 gpiod_line_event_wait()。',
  },
]

// ─── Diagram SVG components ───────────────────────────────────────────────────

function Rs232Diagram() {
  const W = 540, H = 160
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',maxWidth:W,display:'block'}}>
      {/* DTE (PC/Host) */}
      <rect x={20} y={40} width={140} height={80} rx={8} fill="#4d8fff22" stroke="#4d8fff" strokeWidth={1.5}/>
      <text x={90} y={60} textAnchor="middle" fontSize={11} fontWeight={700} fill="#4d8fff">DTE</text>
      <text x={90} y={76} textAnchor="middle" fontSize={9} fill="var(--text-muted)">PC / MCU</text>
      <text x={90} y={93} textAnchor="middle" fontSize={9} fill="var(--text-muted)">DB9 Male</text>

      {/* Signal lines */}
      <line x1={160} y1={75} x2={220} y2={75} stroke="#58a6ff" strokeWidth={1.5}/>
      <line x1={160} y1={90} x2={220} y2={90} stroke="#3fb950" strokeWidth={1.5}/>
      <line x1={160} y1={105} x2={220} y2={105} stroke="#8b949e" strokeWidth={1.5}/>
      <text x={190} y={71} textAnchor="middle" fontSize={9} fill="#58a6ff">TXD →</text>
      <text x={190} y={86} textAnchor="middle" fontSize={9} fill="#3fb950">← RXD</text>
      <text x={190} y={101} textAnchor="middle" fontSize={9} fill="#8b949e">GND</text>

      {/* Null-modem cross */}
      <text x={215} y={115} fontSize={8} fill="var(--text-muted)">直连/交叉</text>

      {/* DCE (Modem/Device) */}
      <rect x={370} y={40} width={150} height={80} rx={8} fill="#3fb95022" stroke="#3fb950" strokeWidth={1.5}/>
      <text x={445} y={60} textAnchor="middle" fontSize={11} fontWeight={700} fill="#3fb950">DCE / Device</text>
      <text x={445} y={76} textAnchor="middle" fontSize={9} fill="var(--text-muted)">Modem / PLC</text>
      <text x={445} y={93} textAnchor="middle" fontSize={9} fill="var(--text-muted)">DB9 Female</text>

      <line x1={220} y1={75} x2={370} y2={90} stroke="#58a6ff" strokeWidth={1.5} strokeDasharray="4 3"/>
      <line x1={220} y1={90} x2={370} y2={75} stroke="#3fb950" strokeWidth={1.5} strokeDasharray="4 3"/>
      <line x1={220} y1={105} x2={370} y2={105} stroke="#8b949e" strokeWidth={1.5}/>

      <text x={270} y={135} textAnchor="middle" fontSize={9} fill="var(--text-muted)">TX→RX交叉（null-modem）或不交叉（直连同类设备）</text>
      <text x={270} y={148} textAnchor="middle" fontSize={9} fill="var(--text-muted)">电平: ±3~15V（MAX232芯片转换TTL 3.3V/5V）</text>
    </svg>
  )
}

function Rs485Diagram() {
  const W = 540, H = 170
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',maxWidth:W,display:'block'}}>
      {/* Bus line */}
      <line x1={60} y1={85} x2={480} y2={85} stroke="#3fb950" strokeWidth={2.5}/>
      <line x1={60} y1={100} x2={480} y2={100} stroke="#f85149" strokeWidth={2.5}/>
      <text x={270} y={79} textAnchor="middle" fontSize={10} fontWeight={700} fill="#3fb950">A(+)</text>
      <text x={270} y={116} textAnchor="middle" fontSize={10} fontWeight={700} fill="#f85149">B(-)</text>

      {/* Terminators */}
      <rect x={20} y={78} width={12} height={28} rx={2} fill="#e3b341" stroke="#e3b341"/>
      <text x={26} y={120} textAnchor="middle" fontSize={8} fill="#e3b341">120Ω</text>
      <rect x={508} y={78} width={12} height={28} rx={2} fill="#e3b341" stroke="#e3b341"/>
      <text x={514} y={120} textAnchor="middle" fontSize={8} fill="#e3b341">120Ω</text>

      {/* Node 1 (Master) */}
      <rect x={55} y={35} width={90} height={40} rx={6} fill="#4d8fff22" stroke="#4d8fff" strokeWidth={1.5}/>
      <text x={100} y={53} textAnchor="middle" fontSize={10} fontWeight={700} fill="#4d8fff">Master</text>
      <text x={100} y={68} textAnchor="middle" fontSize={8} fill="var(--text-muted)">PLC / MCU</text>
      <line x1={100} y1={75} x2={100} y2={85} stroke="#8b949e" strokeWidth={1.5}/>
      <line x1={100} y1={85} x2={100} y2={100} stroke="#8b949e" strokeWidth={1.5}/>

      {/* Node 2 */}
      <rect x={185} y={35} width={80} height={40} rx={6} fill="#a371f722" stroke="#a371f7" strokeWidth={1.5}/>
      <text x={225} y={53} textAnchor="middle" fontSize={10} fontWeight={700} fill="#a371f7">Slave 1</text>
      <text x={225} y={68} textAnchor="middle" fontSize={8} fill="var(--text-muted)">Addr: 0x01</text>
      <line x1={225} y1={75} x2={225} y2={100} stroke="#8b949e" strokeWidth={1.5}/>

      {/* Node 3 */}
      <rect x={305} y={35} width={80} height={40} rx={6} fill="#a371f722" stroke="#a371f7" strokeWidth={1.5}/>
      <text x={345} y={53} textAnchor="middle" fontSize={10} fontWeight={700} fill="#a371f7">Slave 2</text>
      <text x={345} y={68} textAnchor="middle" fontSize={8} fill="var(--text-muted)">Addr: 0x02</text>
      <line x1={345} y1={75} x2={345} y2={100} stroke="#8b949e" strokeWidth={1.5}/>

      {/* Node 4 */}
      <rect x={415} y={35} width={80} height={40} rx={6} fill="#a371f722" stroke="#a371f7" strokeWidth={1.5}/>
      <text x={455} y={53} textAnchor="middle" fontSize={10} fontWeight={700} fill="#a371f7">Slave 3</text>
      <text x={455} y={68} textAnchor="middle" fontSize={8} fill="var(--text-muted)">Addr: 0x03</text>
      <line x1={455} y1={75} x2={455} y2={100} stroke="#8b949e" strokeWidth={1.5}/>

      <text x={270} y={150} textAnchor="middle" fontSize={9} fill="var(--text-muted)">最多32个节点（无中继），最远1200m，差分传输抗干扰</text>
      <text x={270} y={163} textAnchor="middle" fontSize={9} fill="var(--text-muted)">Modbus RTU/ASCII 运行在 RS-485 物理层</text>
    </svg>
  )
}

function SpiDiagram() {
  const W = 540, H = 180
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',maxWidth:W,display:'block'}}>
      {/* Master */}
      <rect x={30} y={60} width={110} height={80} rx={8} fill="#e3b34122" stroke="#e3b341" strokeWidth={1.5}/>
      <text x={85} y={82} textAnchor="middle" fontSize={11} fontWeight={700} fill="#e3b341">Master</text>
      <text x={85} y={96} textAnchor="middle" fontSize={9} fill="var(--text-muted)">RPi / MCU</text>

      {/* Lines */}
      {[['SCLK','#e3b341',30],['MOSI','#58a6ff',50],['MISO','#3fb950',70],['CS0','#f85149',90],['CS1','#d2a8ff',110]].map(([sig,col,y]:any,i)=>(
        <g key={i}>
          <line x1={140} y1={y+45} x2={270} y2={y+45} stroke={col} strokeWidth={1.5}/>
          <text x={205} y={y+41} textAnchor="middle" fontSize={8} fill={col}>{sig}</text>
        </g>
      ))}

      {/* Slave 1 */}
      <rect x={270} y={50} width={100} height={50} rx={6} fill="#4d8fff22" stroke="#4d8fff" strokeWidth={1.5}/>
      <text x={320} y={72} textAnchor="middle" fontSize={10} fontWeight={700} fill="#4d8fff">Slave 0</text>
      <text x={320} y={88} textAnchor="middle" fontSize={9} fill="var(--text-muted)">Flash/ADC</text>

      {/* Slave 2 */}
      <rect x={270} y={120} width={100} height={50} rx={6} fill="#a371f722" stroke="#a371f7" strokeWidth={1.5}/>
      <text x={320} y={142} textAnchor="middle" fontSize={10} fontWeight={700} fill="#a371f7">Slave 1</text>
      <text x={320} y={158} textAnchor="middle" fontSize={9} fill="var(--text-muted)">DAC/Display</text>

      {/* CS lines go to different slaves */}
      <line x1={270} y1={75+45} x2={270} y2={75} stroke="#f85149" strokeWidth={1.5}/>
      <line x1={270} y1={90+45} x2={270} y2={145} stroke="#d2a8ff" strokeWidth={1.5}/>

      <text x={430} y={100} textAnchor="middle" fontSize={9} fill="var(--text-muted)">同时只有一个CS</text>
      <text x={430} y={113} textAnchor="middle" fontSize={9} fill="var(--text-muted)">为低电平</text>
      <text x={270} y={178} textAnchor="middle" fontSize={9} fill="var(--text-muted)">SCLK/MOSI/MISO共享，每个从设备独占CS线</text>
    </svg>
  )
}

function I2cDiagram() {
  const W = 540, H = 160
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',maxWidth:W,display:'block'}}>
      {/* VCC rail */}
      <line x1={40} y1={20} x2={500} y2={20} stroke="#f85149" strokeWidth={2}/>
      <text x={270} y={16} textAnchor="middle" fontSize={9} fill="#f85149">VCC (3.3V)</text>

      {/* Pull-up resistors */}
      <rect x={90} y={22} width={8} height={20} rx={2} fill="#e3b341" stroke="#e3b341"/>
      <text x={94} y={55} textAnchor="middle" fontSize={8} fill="#e3b341">4.7kΩ</text>
      <rect x={140} y={22} width={8} height={20} rx={2} fill="#e3b341" stroke="#e3b341"/>
      <text x={144} y={55} textAnchor="middle" fontSize={8} fill="#e3b341">4.7kΩ</text>

      {/* SDA/SCL bus */}
      <line x1={40} y1={65} x2={500} y2={65} stroke="#58a6ff" strokeWidth={2}/>
      <line x1={40} y1={85} x2={500} y2={85} stroke="#e3b341" strokeWidth={2}/>
      <text x={25} y={69} textAnchor="end" fontSize={10} fontWeight={700} fill="#58a6ff">SDA</text>
      <text x={25} y={89} textAnchor="end" fontSize={10} fontWeight={700} fill="#e3b341">SCL</text>

      {/* Pullup connections */}
      <line x1={94} y1={42} x2={94} y2={65} stroke="#58a6ff" strokeWidth={1.5}/>
      <line x1={144} y1={42} x2={144} y2={85} stroke="#e3b341" strokeWidth={1.5}/>

      {/* Devices */}
      {[['Master\nRPi/MCU','#4d8fff',60],['0x48\nADS1115','#3fb950',200],['0x76\nBME280','#a371f7',330],['0x3C\nSSD1306','#ff6b6b',440]].map(([lbl,col,x]:any,i)=>(
        <g key={i}>
          <rect x={x} y={100} width={80} height={45} rx={6} fill={`${col}22`} stroke={col} strokeWidth={1.5}/>
          <text x={x+40} y={120} textAnchor="middle" fontSize={9} fontWeight={700} fill={col}>{lbl.split('\n')[0]}</text>
          <text x={x+40} y={136} textAnchor="middle" fontSize={8} fill="var(--text-muted)">{lbl.split('\n')[1]}</text>
          <line x1={x+40} y1={100} x2={x+40} y2={65} stroke="#58a6ff" strokeWidth={1.5}/>
          <line x1={x+40} y1={100} x2={x+40} y2={85} stroke="#e3b341" strokeWidth={1.5}/>
        </g>
      ))}

      <text x={270} y={158} textAnchor="middle" fontSize={9} fill="var(--text-muted)">开漏上拉，所有设备共享SDA/SCL，通过7位地址区分</text>
    </svg>
  )
}

function UartDiagram() {
  const W = 540, H = 150
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',maxWidth:W,display:'block'}}>
      <rect x={30} y={40} width={130} height={80} rx={8} fill="#ffa65722" stroke="#ffa657" strokeWidth={1.5}/>
      <text x={95} y={65} textAnchor="middle" fontSize={11} fontWeight={700} fill="#ffa657">树莓派</text>
      <text x={95} y={82} textAnchor="middle" fontSize={9} fill="var(--text-muted)">GPIO14 TXD</text>
      <text x={95} y={96} textAnchor="middle" fontSize={9} fill="var(--text-muted)">GPIO15 RXD</text>
      <text x={95} y={110} textAnchor="middle" fontSize={9} fill="var(--text-muted)">GND</text>

      {/* Cross wires */}
      <line x1={160} y1={82} x2={230} y2={95} stroke="#58a6ff" strokeWidth={1.5}/>
      <line x1={160} y1={96} x2={230} y2={83} stroke="#3fb950" strokeWidth={1.5}/>
      <line x1={160} y1={110} x2={230} y2={110} stroke="#8b949e" strokeWidth={1.5}/>
      <text x={195} y={78} fontSize={8} fill="#58a6ff">TX→RX</text>
      <text x={195} y={104} fontSize={8} fill="#3fb950">RX←TX</text>

      <rect x={380} y={40} width={130} height={80} rx={8} fill="#58a6ff22" stroke="#58a6ff" strokeWidth={1.5}/>
      <text x={445} y={65} textAnchor="middle" fontSize={11} fontWeight={700} fill="#58a6ff">目标设备</text>
      <text x={445} y={82} textAnchor="middle" fontSize={9} fill="var(--text-muted)">RX（接收）</text>
      <text x={445} y={96} textAnchor="middle" fontSize={9} fill="var(--text-muted)">TX（发送）</text>
      <text x={445} y={110} textAnchor="middle" fontSize={9} fill="var(--text-muted)">GND</text>
      <line x1={230} y1={83} x2={380} y2={83} stroke="#3fb950" strokeWidth={1.5}/>
      <line x1={230} y1={95} x2={380} y2={95} stroke="#58a6ff" strokeWidth={1.5}/>
      <line x1={230} y1={110} x2={380} y2={110} stroke="#8b949e" strokeWidth={1.5}/>

      <text x={270} y={140} textAnchor="middle" fontSize={9} fill="#f85149">⚠ 树莓派 3.3V TTL，勿接 PC RS-232 的 ±12V！</text>
    </svg>
  )
}

function CanDiagram() {
  const W = 540, H = 160
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',maxWidth:W,display:'block'}}>
      <line x1={50} y1={70} x2={490} y2={70} stroke="#f85149" strokeWidth={2.5}/>
      <line x1={50} y1={90} x2={490} y2={90} stroke="#58a6ff" strokeWidth={2.5}/>
      <text x={20} y={74} textAnchor="end" fontSize={10} fontWeight={700} fill="#f85149">CAN_H</text>
      <text x={20} y={94} textAnchor="end" fontSize={10} fontWeight={700} fill="#58a6ff">CAN_L</text>
      <rect x={18} y={63} width={10} height={34} rx={2} fill="#e3b341" stroke="#e3b341"/>
      <text x={23} y={112} textAnchor="middle" fontSize={8} fill="#e3b341">120Ω</text>
      <rect x={512} y={63} width={10} height={34} rx={2} fill="#e3b341" stroke="#e3b341"/>
      <text x={517} y={112} textAnchor="middle" fontSize={8} fill="#e3b341">120Ω</text>

      {[['ECU-Engine','#4d8fff',60],['ECU-ABS','#3fb950',200],['OBD-II','#ffa657',340],['RPi+MCP2515','#a371f7',440]].map(([lbl,col,x]:any,i)=>(
        <g key={i}>
          <rect x={x} y={105} width={90} height={35} rx={5} fill={`${col}22`} stroke={col} strokeWidth={1.5}/>
          <text x={x+45} y={120} textAnchor="middle" fontSize={9} fontWeight={700} fill={col}>{lbl.split('-')[0]}</text>
          <text x={x+45} y={134} textAnchor="middle" fontSize={8} fill="var(--text-muted)">{lbl.split('-')[1]}</text>
          <line x1={x+45} y1={105} x2={x+45} y2={70} stroke={col} strokeWidth={1.5}/>
          <line x1={x+45} y1={105} x2={x+45} y2={90} stroke={col} strokeWidth={1.5}/>
        </g>
      ))}

      <text x={270} y={152} textAnchor="middle" fontSize={9} fill="var(--text-muted)">多主竞争：低ID（高优先级）赢得总线仲裁，CSMA/CA机制</text>
    </svg>
  )
}

function EthernetDiagram() {
  const W = 540, H = 160
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',maxWidth:W,display:'block'}}>
      <rect x={30} y={50} width={100} height={60} rx={8} fill="#58a6ff22" stroke="#58a6ff" strokeWidth={1.5}/>
      <text x={80} y={78} textAnchor="middle" fontSize={11} fontWeight={700} fill="#58a6ff">Host A</text>
      <text x={80} y={94} textAnchor="middle" fontSize={9} fill="var(--text-muted)">NIC (eth0)</text>

      <rect x={190} y={35} width={160} height={90} rx={8} fill="#3fb95022" stroke="#3fb950" strokeWidth={1.5}/>
      <text x={270} y={65} textAnchor="middle" fontSize={11} fontWeight={700} fill="#3fb950">Switch</text>
      <text x={270} y={82} textAnchor="middle" fontSize={9} fill="var(--text-muted)">MAC地址表</text>
      <text x={270} y={97} textAnchor="middle" fontSize={9} fill="var(--text-muted)">自学习/转发</text>
      <text x={270} y={112} textAnchor="middle" fontSize={9} fill="var(--text-muted)">VLAN/STP</text>

      <rect x={410} y={50} width={100} height={60} rx={8} fill="#a371f722" stroke="#a371f7" strokeWidth={1.5}/>
      <text x={460} y={78} textAnchor="middle" fontSize={11} fontWeight={700} fill="#a371f7">Host B</text>
      <text x={460} y={94} textAnchor="middle" fontSize={9} fill="var(--text-muted)">NIC (eth0)</text>

      <line x1={130} y1={80} x2={190} y2={80} stroke="#58a6ff" strokeWidth={2}/>
      <line x1={350} y1={80} x2={410} y2={80} stroke="#a371f7" strokeWidth={2}/>

      <text x={160} y={74} textAnchor="middle" fontSize={8} fill="#e3b341">RJ45</text>
      <text x={380} y={74} textAnchor="middle" fontSize={8} fill="#e3b341">RJ45</text>

      {/* Frame format */}
      <text x={270} y={145} textAnchor="middle" fontSize={9} fill="var(--text-muted)">帧: [6B dst MAC][6B src MAC][2B type][46-1500B data][4B FCS]</text>
      <text x={270} y={158} textAnchor="middle" fontSize={9} fill="var(--text-muted)">MTU=1500B，Jumbo Frame可达9000B，全双工无冲突</text>
    </svg>
  )
}

function GpioDiagram() {
  const W = 540, H = 175
  const pins = [
    {label:'3.3V',color:'#f85149',y:30},
    {label:'5V',color:'#ffa657',y:50},
    {label:'GPIO2(SDA)',color:'#d2a8ff',y:70},
    {label:'GPIO3(SCL)',color:'#e3b341',y:90},
    {label:'GPIO14(TX)',color:'#58a6ff',y:110},
    {label:'GPIO15(RX)',color:'#3fb950',y:130},
    {label:'GND',color:'#8b949e',y:150},
  ]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',maxWidth:W,display:'block'}}>
      <rect x={200} y={20} width={80} height={145} rx={4} fill="#ff6b6b18" stroke="#ff6b6b" strokeWidth={2}/>
      <text x={240} y={100} textAnchor="middle" fontSize={10} fontWeight={700} fill="#ff6b6b" transform="rotate(-90,240,100)">树莓派 GPIO</text>

      {pins.map((p,i)=>(
        <g key={i}>
          <circle cx={200} cy={p.y} r={5} fill={p.color}/>
          <line x1={160} y1={p.y} x2={195} y2={p.y} stroke={p.color} strokeWidth={1.5}/>
          <text x={155} y={p.y+4} textAnchor="end" fontSize={9} fill={p.color}>{p.label}</text>
          {/* Right side connection */}
          <circle cx={280} cy={p.y} r={5} fill={p.color}/>
          <line x1={285} y1={p.y} x2={330} y2={p.y} stroke={p.color} strokeWidth={1.5} strokeDasharray="4 3"/>
        </g>
      ))}

      <rect x={330} y={25} width={100} height={140} rx={6} fill="#3fb95018" stroke="#3fb950" strokeWidth={1.5}/>
      <text x={380} y={100} textAnchor="middle" fontSize={10} fill="#3fb950" transform="rotate(-90,380,100)">外部设备</text>

      <text x={430} y={95} textAnchor="middle" fontSize={8} fill="var(--text-muted)">LED/传感器</text>
      <text x={270} y={172} textAnchor="middle" fontSize={9} fill="var(--text-muted)">所有GPIO均为3.3V逻辑，单引脚最大16mA，总计50mA</text>
    </svg>
  )
}

const DIAGRAMS: Record<string, () => React.ReactElement> = {
  rs232: Rs232Diagram,
  rs485: Rs485Diagram,
  spi:   SpiDiagram,
  i2c:   I2cDiagram,
  uart:  UartDiagram,
  can:   CanDiagram,
  ethernet: EthernetDiagram,
  gpio:  GpioDiagram,
}

// ─── Main view ────────────────────────────────────────────────────────────────

export default function HardwareView() {
  const [sel, setSel] = useState('rs232')
  const p = PROTOCOLS.find(x => x.id === sel)!
  const DiagramComp = DIAGRAMS[p.diagram] as () => React.ReactElement

  const catLabel: Record<string, string> = {
    serial: '串行总线', field: '现场总线/以太网', soc: 'SoC/单板机接口', wireless: '无线'
  }
  const cats = ['serial', 'soc', 'field'] as const

  return (
    <div style={{display:'flex', height:'100%', overflow:'hidden'}}>
      {/* Sidebar */}
      <div style={{width:180, flexShrink:0, borderRight:'1px solid var(--border)',
        background:'var(--bg-secondary)', overflowY:'auto'}}>
        <div style={{padding:'10px 14px', borderBottom:'1px solid var(--border)',
          background:'var(--bg-elevated)'}}>
          <div style={{fontSize:13, fontWeight:800, color:'var(--text-primary)'}}>🔌 通信接口</div>
          <div style={{fontSize:10, color:'var(--text-muted)', marginTop:2}}>Hardware Interfaces</div>
        </div>
        {cats.map(cat => (
          <div key={cat}>
            <div style={{padding:'6px 14px 3px', fontSize:10, fontWeight:700,
              color:'var(--text-muted)', letterSpacing:0.8, marginTop:4}}>
              {catLabel[cat].toUpperCase()}
            </div>
            {PROTOCOLS.filter(x => x.category === cat).map(pro => (
              <button key={pro.id} onClick={() => setSel(pro.id)}
                style={{display:'flex', alignItems:'center', gap:8, width:'100%',
                  padding:'8px 14px', border:'none',
                  borderLeft: sel===pro.id ? `3px solid ${pro.color}` : '3px solid transparent',
                  background: sel===pro.id ? 'var(--bg-elevated)' : 'transparent',
                  color: sel===pro.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor:'pointer', fontSize:11, fontWeight: sel===pro.id ? 700 : 400,
                  textAlign:'left'}}>
                <span style={{fontSize:14}}>{pro.icon}</span>
                <span>{pro.name}</span>
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Detail */}
      <div style={{flex:1, overflow:'auto', padding:20}}>
        {/* Header */}
        <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:14,
          padding:'10px 16px', borderRadius:10,
          background:`${p.color}14`, border:`1px solid ${p.color}50`}}>
          <span style={{fontSize:28}}>{p.icon}</span>
          <div>
            <div style={{fontSize:17, fontWeight:800, color:p.color}}>{p.name}</div>
            <div style={{fontSize:12, color:'var(--text-secondary)', marginTop:2}}>{p.shortDesc}</div>
          </div>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14}}>
          {/* Specs */}
          <div style={{background:'var(--bg-secondary)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden'}}>
            <div style={{padding:'7px 14px', borderBottom:'1px solid var(--border)',
              fontSize:11, fontWeight:700, color:'var(--text-muted)'}}>技术规格</div>
            {p.specs.map(s => (
              <div key={s.label} style={{display:'flex', padding:'5px 14px',
                borderBottom:'1px solid var(--border)', gap:8, flexWrap:'wrap', alignItems:'baseline'}}>
                <span style={{color:'var(--text-muted)', fontSize:11, minWidth:60, flexShrink:0}}>{s.label}</span>
                <span style={{color:'var(--text-primary)', fontSize:11, fontFamily:'monospace'}}>{s.value}</span>
              </div>
            ))}
          </div>

          {/* Pinout */}
          <div style={{background:'var(--bg-secondary)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden'}}>
            <div style={{padding:'7px 14px', borderBottom:'1px solid var(--border)',
              fontSize:11, fontWeight:700, color:'var(--text-muted)'}}>引脚定义</div>
            {p.pinout.map(pin => (
              <div key={pin.pin} style={{display:'flex', alignItems:'center', gap:8,
                padding:'5px 14px', borderBottom:'1px solid var(--border)'}}>
                <code style={{color:pin.color, fontSize:11, fontWeight:700, minWidth:52, flexShrink:0}}>{pin.pin}</code>
                <span style={{color:p.color, fontSize:11, fontWeight:600, minWidth:44, flexShrink:0}}>{pin.signal}</span>
                <span style={{color:'var(--text-muted)', fontSize:12}}>{pin.dir}</span>
                <span style={{color:'var(--text-secondary)', fontSize:10}}>{pin.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Wiring Diagram */}
        <div style={{background:'var(--bg-secondary)', border:'1px solid var(--border)',
          borderRadius:10, overflow:'hidden', marginBottom:14}}>
          <div style={{padding:'7px 14px', borderBottom:'1px solid var(--border)',
            fontSize:11, fontWeight:700, color:'var(--text-muted)'}}>接线图 / 拓扑</div>
          <div style={{padding:'12px 16px', display:'flex', justifyContent:'center',
            background:'var(--bg-primary)'}}>
            <DiagramComp/>
          </div>
        </div>

        {/* Code */}
        <div style={{background:'var(--bg-secondary)', border:`1px solid ${p.color}40`,
          borderRadius:10, overflow:'hidden', marginBottom:14}}>
          <div style={{padding:'7px 14px', borderBottom:`1px solid ${p.color}30`,
            fontSize:11, fontWeight:700, color:p.color, background:`${p.color}10`}}>
            💻 {p.codeTitle}
          </div>
          <pre style={{margin:0, padding:'14px 16px', overflow:'auto', fontSize:11,
            lineHeight:1.65, fontFamily:'monospace', color:'var(--text-primary)',
            background:'var(--bg-tertiary)', maxHeight:480}}>
            {p.code}
          </pre>
        </div>

        {/* Notes */}
        <div style={{padding:'10px 14px', borderRadius:8, fontSize:12, lineHeight:1.65,
          background:'rgba(227,179,65,0.08)', border:'1px solid rgba(227,179,65,0.3)',
          color:'var(--text-secondary)'}}>
          <span style={{fontWeight:700, color:'#e3b341', marginRight:6}}>💡</span>
          {p.notes}
        </div>
      </div>
    </div>
  )
}
