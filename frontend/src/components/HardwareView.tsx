import React, { useState } from 'react'
import { useLang } from '../i18n/lang'
import { useMobile } from '../hooks/useMobile'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Protocol {
  id: string
  name: string
  icon: string
  color: string
  category: 'serial' | 'field' | 'soc' | 'wireless' | 'debug'
  shortDesc: string
  specs: { label: string; value: string }[]
  pinout: PinDef[]
  diagram: string
  code: string
  codeTitle: string
  notes: string
}

interface PinDef {
  pin: string; signal: string; dir: '→'|'←'|'↔'|'—'; color: string; desc: string
}

// ─── English translations (separate map to keep Protocol data clean) ─────────

interface ProtocolTrans {
  shortDesc: string
  specs: { label: string; value: string }[]
  pinout: string[]  // desc per pin, same order as Protocol.pinout
  notes: string
}

const EN: Record<string, ProtocolTrans> = {
  rs232: {
    shortDesc: 'Point-to-point serial, max 15m, ±12V logic levels, DB9 connector, debug/industrial',
    specs: [
      { label: 'Topology',      value: 'Point-to-Point (1:1)' },
      { label: 'Voltage',       value: 'Logic 1: -3~-15V   Logic 0: +3~+15V' },
      { label: 'Max Speed',     value: 'Up to 115200 bps (practical: 1 Mbps)' },
      { label: 'Max Distance',  value: 'Max 15m (std), 100m (low speed)' },
      { label: 'Connector',     value: 'DB9 / DB25' },
      { label: 'Full Duplex',   value: 'Yes (separate TX/RX lines)' },
    ],
    pinout: ['Receive Data','Transmit Data','Data Terminal Ready','Signal Ground','Data Set Ready','Request to Send','Clear to Send'],
    notes: 'RS-232 is point-to-point only (no bus). Null-modem cable swaps TX↔RX and RTS↔CTS for DTE-to-DTE. MAX232 converts TTL (3.3/5V) ↔ RS-232 (±12V). For >15m use RS-485 or fiber. Common in lab instruments, industrial PLCs, GPS/GSM modules.',
  },
  rs485: {
    shortDesc: 'Differential multi-drop bus, 1.2km range, up to 32 nodes, robust industrial upgrade from RS-232',
    specs: [
      { label: 'Topology',      value: 'Bus (multi-drop, 32 nodes max)' },
      { label: 'Voltage',       value: 'Differential: A-B > +200mV = 1,  A-B < -200mV = 0' },
      { label: 'Max Speed',     value: '10 Mbps at 12m;  100 kbps at 1.2km' },
      { label: 'Max Distance',  value: '1200m (at low baud rates)' },
      { label: 'Half/Full Duplex', value: '2-wire half-duplex OR 4-wire full-duplex' },
      { label: 'Termination',   value: '120Ω at both ends of the cable' },
    ],
    pinout: ['A+ (non-inverting)','B- (inverting)','Signal Ground','120Ω termination resistor'],
    notes: 'RS-485 is the industrial workhorse: 32 nodes on one twisted pair, 1.2km cable. Linux: set SER_RS485_ENABLED flag via ioctl(). Termination resistor (120Ω) at both cable ends prevents reflections. Modbus RTU protocol runs over RS-485.',
  },
  spi: {
    shortDesc: 'Full-duplex 4-wire synchronous bus, up to 50MHz, master-slave, chip-select per device',
    specs: [
      { label: 'Wires',         value: 'SCLK + MOSI + MISO + CS (4-wire)' },
      { label: 'Topology',      value: 'Master–Slave, 1 CS line per slave' },
      { label: 'Max Speed',     value: 'Up to 50 MHz (device-dependent)' },
      { label: 'Duplex',        value: 'Full-duplex (simultaneous TX+RX)' },
      { label: 'Addressing',    value: 'No address; separate CS pin selects slave' },
      { label: 'Clock Modes',   value: 'CPOL/CPHA: Mode 0–3' },
    ],
    pinout: ['Clock','Master Out Slave In','Master In Slave Out','Chip Select (active low)'],
    notes: 'SPI is the fastest common serial bus. No arbitration, no ACK — master controls everything. Linux: /dev/spidevX.Y, use SPI_IOC_MESSAGE ioctl. Raspberry Pi: spidev0.0/spidev0.1. Typical: ADC, Flash, display drivers (ILI9341, ST7735), sensors.',
  },
  i2c: {
    shortDesc: '2-wire half-duplex bus, 7/10-bit addressing, up to 127 devices per bus, ACK/NACK flow control',
    specs: [
      { label: 'Wires',         value: 'SDA (data) + SCL (clock) — open drain' },
      { label: 'Addressing',    value: '7-bit (127 devices) or 10-bit' },
      { label: 'Speed',         value: 'Standard 100kHz / Fast 400kHz / Fast+ 1MHz' },
      { label: 'Pull-ups',      value: '4.7kΩ to VCC required on SDA and SCL' },
      { label: 'Topology',      value: 'Multi-master multi-slave bus' },
      { label: 'Flow Control',  value: 'ACK/NACK after every byte' },
    ],
    pinout: ['Serial Data (open-drain, needs pull-up)','Serial Clock (open-drain, needs pull-up)','Ground'],
    notes: 'I²C uses open-drain lines — each device can pull low but not drive high; external pull-up resistors provide the high level. Linux: /dev/i2c-X, use i2c-dev and I2C_RDWR ioctl. scan: i2cdetect -y 1. Typical: OLED (SSD1306), IMU (MPU6050), RTC (DS3231).',
  },
  uart: {
    shortDesc: 'Async serial (no clock line), start/stop framing, GPS/BT module standard, 9600–921600 bps',
    specs: [
      { label: 'Wires',         value: 'TX + RX (+ optional RTS/CTS)' },
      { label: 'Framing',       value: '1 start bit + 5–9 data bits + parity + 1–2 stop bits' },
      { label: 'Common Baud',   value: '9600 / 115200 / 460800 / 921600 bps' },
      { label: 'Voltage',       value: 'TTL: 3.3V or 5V logic (not RS-232 ±12V)' },
      { label: 'Duplex',        value: 'Full-duplex (TX and RX independent)' },
    ],
    pinout: ['UART Transmit (3.3V TTL)','UART Receive (3.3V TTL)','Ground','1PPS (GPS pulse-per-second, optional)'],
    notes: 'UART is asynchronous — both ends must be configured to the same baud rate. "8N1" means 8 data bits, No parity, 1 stop bit (most common). GPS modules (NEO-6M/9M) output NMEA sentences at 9600 bps by default. Use USB-to-UART bridge (CH340/CP2102) to connect to a PC.',
  },
  can: {
    shortDesc: 'Differential 2-wire bus for automotive/industrial, up to 1Mbps, priority arbitration, 11/29-bit frame ID',
    specs: [
      { label: 'Wires',         value: 'CAN-H + CAN-L (differential pair)' },
      { label: 'Topology',      value: 'Bus (multi-node, no master)' },
      { label: 'Max Speed',     value: '1 Mbps (CAN 2.0);  5 Mbps (CAN FD)' },
      { label: 'Max Nodes',     value: '110 nodes (typical)' },
      { label: 'Frame ID',      value: '11-bit (CAN 2.0A) or 29-bit (CAN 2.0B extended)' },
      { label: 'Error Handling',value: 'CRC + bit stuffing + ACK + error frames' },
    ],
    pinout: ['CAN High (dominant = 2.5–3.5V)','CAN Low (dominant = 1.5–2.5V)','Ground','120Ω termination resistor'],
    notes: 'CAN uses non-destructive CSMA/BA — lower ID wins arbitration without data loss. Linux SocketCAN: ip link set can0 up type can bitrate 500000, then use standard socket API. OBD-II diagnostic port uses CAN. candump/cansend for debugging.',
  },
  ethernet: {
    shortDesc: 'IEEE 802.3 LAN: full-duplex 100M/1G, RJ45 connector, MAC addressing, CSMA/CD for half-duplex',
    specs: [
      { label: 'Standard',      value: 'IEEE 802.3 (100BASE-TX / 1000BASE-T)' },
      { label: 'Connector',     value: 'RJ-45 (8P8C)' },
      { label: 'Speed',         value: '100 Mbps / 1 Gbps / 2.5G / 10G' },
      { label: 'Duplex',        value: 'Full-duplex (switched) / Half-duplex (hub)' },
      { label: 'Max Distance',  value: '100m per segment (Cat5e/Cat6)' },
      { label: 'MAC Address',   value: '48-bit hardware address (burned into NIC)' },
    ],
    pinout: ['TX+ Transmit Positive','TX- Transmit Negative','RX+ Receive Positive','RX- Receive Negative'],
    notes: 'Modern switched Ethernet is full-duplex point-to-point (switch port ↔ NIC), so CSMA/CD is never triggered. Linux raw socket: AF_PACKET + SOCK_RAW. libpcap for packet capture. Wireshark for analysis.',
  },
  gpio: {
    shortDesc: 'Raspberry Pi GPIO: 3.3V logic, sysfs/libgpiod API, PWM/I2C/SPI/UART multiplexed pins',
    specs: [
      { label: 'Voltage',       value: '3.3V logic (NOT 5V tolerant!)' },
      { label: 'Current',       value: 'Max 16mA per pin, 50mA total GPIO bank' },
      { label: 'Functions',     value: 'Input / Output / PWM / I2C / SPI / UART / I2S' },
      { label: 'Pin Count',     value: '40-pin header (26 GPIO usable on RPi 4)' },
      { label: 'API',           value: 'sysfs (/sys/class/gpio) or libgpiod (modern)' },
      { label: 'Hardware PWM',  value: 'GPIO12/13/18/19 (BCM numbering)' },
    ],
    pinout: ['Output: drive LED/relay/transistor','Input: read button/sensor','Hardware PWM output','I2C Bus Data','I2C Bus Clock'],
    notes: 'GPIO pins are 3.3V only — connecting 5V directly will damage the SoC. Use level shifter (TXB0108 or resistor divider) for 5V devices. libgpiod is preferred over sysfs for new code. BCM pin numbering ≠ physical pin numbering — use pinout.xyz for reference.',
  },
  pwm: {
    shortDesc: 'Pulse Width Modulation: duty cycle controls servo angle, motor speed, LED brightness',
    specs: [
      { label: 'Period',        value: 'T = 1/frequency (e.g. 20ms for 50Hz servo)' },
      { label: 'Duty Cycle',    value: 'D = t_on / T × 100%' },
      { label: 'Servo',         value: '50Hz, 1ms=0°, 1.5ms=90°, 2ms=180°' },
      { label: 'Motor Speed',   value: 'Higher duty = higher average voltage = faster' },
      { label: 'Linux HW PWM',  value: '/sys/class/pwm/pwmchipN/pwmM/' },
      { label: 'SW PWM',        value: 'pigpio / wiringPi on Raspberry Pi' },
    ],
    pinout: ['PWM signal output (3.3V)','Ground reference','Servo power (4.8–6V, separate supply!)'],
    notes: 'Hardware PWM (2–4 channels on RPi) has precise timing; software PWM uses CPU cycles and jitters under load. Write period_ns and duty_cycle_ns to sysfs. For servo control: period=20000000ns, duty_cycle=1500000ns = 90°.',
  },
  onewire: {
    shortDesc: '1-Wire: single signal wire + GND, parasitic power, 64-bit ROM ID per device, DS18B20 temperature sensor',
    specs: [
      { label: 'Wires',         value: '1 data wire + GND (parasitic: data+power on 1 wire)' },
      { label: 'Speed',         value: 'Regular 15.4 kbps / Overdrive 111 kbps' },
      { label: 'ROM ID',        value: '64-bit unique ID: family(8b) + serial(48b) + CRC(8b)' },
      { label: 'Max Devices',   value: '50+ on one bus (ROM search algorithm)' },
      { label: 'Linux Driver',  value: 'w1-gpio + w1-therm kernel modules' },
      { label: 'Read Path',     value: '/sys/bus/w1/devices/28-xxxx/temperature' },
    ],
    pinout: ['Data + parasitic power (4.7kΩ pull-up to 3.3V)','Ground'],
    notes: 'Linux kernel auto-enumerates DS18B20 sensors via w1 subsystem. Enable: dtoverlay=w1-gpio,gpiopin=4 in /boot/config.txt. Read: cat /sys/bus/w1/devices/28-*/temperature (returns millidegrees). Multiple sensors on one wire are distinguished by their 64-bit ROM ID.',
  },
  i2s: {
    shortDesc: 'I²S/PCM: 3-wire digital audio bus (BCLK/LRCLK/SDATA), connects DAC/ADC/microphone chips',
    specs: [
      { label: 'Wires',         value: 'BCLK (bit clock) + LRCLK (LR channel) + SDATA' },
      { label: 'BCLK Rate',     value: 'Sample rate × bit depth × channels (e.g. 44100×32×2 = 2.82 MHz)' },
      { label: 'LRCLK',         value: 'Frame sync: 0=Left channel, 1=Right channel' },
      { label: 'Format',        value: 'I²S (Philips) / Left/Right-justified / DSP mode' },
      { label: 'Bit Depth',     value: '16 / 24 / 32-bit PCM' },
      { label: 'Linux API',     value: 'ALSA: aplay, arecord, ALSA lib' },
    ],
    pinout: ['Bit Clock — master drives (2.82MHz at 44.1kHz/32-bit)','LR Clock — selects Left(0) or Right(1) channel','Serial Data Out (DAC/speaker)','Serial Data In (ADC/microphone)'],
    notes: 'I²S carries uncompressed PCM audio. Common chips: PCM5102A (DAC), INMP441 (MEMS mic), MAX98357 (amp+DAC). Raspberry Pi: dtoverlay=hifiberry-dac or dtoverlay=i2s-mmap. Use aplay for playback and arecord for capture. BCLK must be exactly sample_rate × bit_depth × channels.',
  },
  usb: {
    shortDesc: 'USB 1.0–3.2: host/device/OTG, plug-and-play, libusb-1.0 for raw device access on Linux',
    specs: [
      { label: 'USB 2.0 Speed', value: 'Low 1.5Mbps / Full 12Mbps / High 480Mbps' },
      { label: 'USB 3.2 Speed', value: 'Gen1×1 5Gbps / Gen2×2 20Gbps' },
      { label: 'Power',         value: 'USB 2.0: 500mA;  USB 3.0: 900mA;  USB PD: up to 100W' },
      { label: 'Topology',      value: 'Tiered star (host → hub → device)' },
      { label: 'Address',       value: '7-bit device address (127 devices per host controller)' },
      { label: 'Transfer Types',value: 'Control / Bulk / Interrupt / Isochronous' },
    ],
    pinout: ['VCC 5V (power)','D- Data Negative','D+ Data Positive','GND Ground','SS_TX+ (USB 3.0 SuperSpeed TX+)'],
    notes: 'libusb-1.0 provides host-side access to USB devices from userspace. Enumerate: libusb_get_device_list(), open with VID:PID. Linux device nodes: /dev/bus/usb/. lsusb -v for full descriptor dump. USB gadget mode (Raspberry Pi Zero) lets the Pi act as a USB device.',
  },
  modbus_tcp: {
    shortDesc: 'Modbus TCP: MBAP header over TCP port 502, wraps Modbus RTU function codes, SCADA/PLC standard',
    specs: [
      { label: 'Transport',     value: 'TCP port 502' },
      { label: 'MBAP Header',  value: '7 bytes: TransID(2) + ProtoID(2) + Length(2) + UnitID(1)' },
      { label: 'Function Codes',value: '01 Read Coils / 03 Read Holding Regs / 06 Write Single Reg' },
      { label: 'Data Model',    value: 'Coils (1-bit RW) + Discrete Inputs (1-bit RO) + Registers (16-bit)' },
      { label: 'Byte Order',    value: 'Big-endian (network byte order)' },
      { label: 'Topology',      value: 'Client → Server (master/slave terminology)' },
    ],
    pinout: ['Ethernet RJ-45 (same as standard TCP/IP)','No dedicated hardware interface'],
    notes: 'Modbus TCP wraps the Modbus RTU PDU in a TCP stream with MBAP header (no CRC needed — TCP handles reliability). Register address 40001 = holding register 0. Most PLCs/SCADA systems support Modbus TCP out of the box. Use modpoll or libmodbus for testing.',
  },
  current_loop: {
    shortDesc: '4–20mA current loop: noise-immune, 250Ω sense resistor, 4mA=0%, 20mA=100%, 0mA=broken wire',
    specs: [
      { label: 'Range',         value: '4mA (0%) to 20mA (100%)' },
      { label: 'Fault Detection',value: '0mA = wire break;  >20mA = sensor fault' },
      { label: 'Sense Resistor', value: 'V = I × 250Ω: 1V (4mA) to 5V (20mA)' },
      { label: 'Max Distance',  value: 'Kilometers (current, not voltage)' },
      { label: 'Noise Immunity', value: 'Excellent — EMI causes voltage not current errors' },
      { label: 'Power',         value: '24V DC loop power (typically)' },
    ],
    pinout: ['Loop+ (24V supply)','Loop- (current return, through 250Ω sense resistor)'],
    notes: '4–20mA is immune to voltage drops along cable — a 100m cable with 10Ω resistance has negligible effect. The "live zero" at 4mA distinguishes zero-percent signal from a broken wire (0mA). Common in industrial sensors: pressure, temperature, flow, level. ADC reads voltage across sense resistor.',
  },
  lin: {
    shortDesc: 'LIN Bus: single-wire 12V automotive sub-bus, master sends header, slaves auto-respond, max 20kbps',
    specs: [
      { label: 'Wires',         value: '1 LIN wire + 12V + GND' },
      { label: 'Max Speed',     value: '20 kbps' },
      { label: 'Frame',         value: 'Break (≥13 bit) + Sync (0x55) + PID + Data(1–8B) + Checksum' },
      { label: 'Addressing',    value: '6-bit frame ID (64 IDs) with parity bits → Protected ID' },
      { label: 'Master',        value: 'One master sends headers; slaves respond to matching PID' },
      { label: 'Application',   value: 'Body control: windows, mirrors, seats, sunroof' },
    ],
    pinout: ['LIN Bus (12V, single wire)','12V supply','GND'],
    notes: 'LIN is designed for low-cost body control (no crystal oscillator needed — slaves sync to Break+Sync bytes). LIN Schedule Table defines when master sends each frame ID. Checksum: enhanced (LIN 2.x includes PID) or classic (LIN 1.x). LIN nodes cost ~$0.50 vs CAN transceivers at ~$2.',
  },
  bluetooth: {
    shortDesc: 'Bluetooth BLE 4.2/5.0: 2.4GHz 40-channel FHSS, GATT profiles, BlueZ Linux stack, up to 100m (BLE 5)',
    specs: [
      { label: 'Version',       value: 'Classic BT 2.0–5.0 / BLE 4.0–5.3' },
      { label: 'Frequency',     value: '2.4 GHz ISM band, 40 channels (BLE) / 79 (Classic)' },
      { label: 'Range',         value: 'BLE Class 2: ~10m;  BLE 5 Long Range: ~400m' },
      { label: 'Data Rate',     value: 'BLE: 1–2 Mbps;  Classic BT: 3 Mbps (EDR)' },
      { label: 'Power',         value: 'BLE: <10mW (coin cell months); Classic: 100mW' },
      { label: 'Profiles',      value: 'BLE GATT (HRP/HID/UART) / Classic: A2DP/HFP/SPP' },
    ],
    pinout: ['Host UART TX (to HCI module)','Host UART RX (from HCI module)','Bluetooth Reset','3.3V Power'],
    notes: 'BlueZ is the Linux Bluetooth stack. BLE GATT: Server (peripheral) exposes Services→Characteristics; Client (central) reads/writes/notifies. bluetoothctl for pairing. hciconfig, hcitool for low-level HCI. nRF52 / ESP32 are popular BLE MCUs.',
  },
  wifi: {
    shortDesc: 'WiFi 802.11 b/g/n/ac: 2.4/5GHz OFDM, STA/AP/AP+STA modes, nl80211 kernel API',
    specs: [
      { label: 'Standard',      value: '802.11 b/g/n (2.4GHz) / n/ac (5GHz) / ax (WiFi 6)' },
      { label: 'Max Speed',     value: '11Mbps(b) / 54Mbps(g) / 600Mbps(n) / 3.5Gbps(ac)' },
      { label: 'Range',         value: '~30m indoor (2.4GHz) / ~15m (5GHz)' },
      { label: 'Security',      value: 'WPA2-AES / WPA3-SAE' },
      { label: 'Modes',         value: 'STA (client) / AP (access point) / AP+STA / Monitor' },
      { label: 'Linux API',     value: 'nl80211 → iw / wpa_supplicant / hostapd' },
    ],
    pinout: ['SPI/SDIO/USB to WiFi chip (module-dependent)','Antenna connector (u.FL / SMA)','3.3V power'],
    notes: 'wpa_supplicant connects as STA (client); hostapd creates a software AP. Linux mac80211 kernel layer handles 802.11 framing. Monitor mode + pcap enables packet capture of all WiFi frames in range. iw dev wlan0 scan for AP discovery.',
  },
  lora: {
    shortDesc: 'LoRa SX1276: chirp spread spectrum (CSS), SF7–SF12, 5–15km range, LoRaWAN MAC on top',
    specs: [
      { label: 'Modulation',    value: 'CSS (Chirp Spread Spectrum) — Semtech patent' },
      { label: 'Frequency',     value: 'EU 868MHz / US 915MHz / CN 470MHz' },
      { label: 'Spread Factor', value: 'SF7 (fast, 2km) ↔ SF12 (slow, 15km+)' },
      { label: 'Bandwidth',     value: '125kHz / 250kHz / 500kHz' },
      { label: 'Sensitivity',   value: '-137 dBm @ SF12 (best in class)' },
      { label: 'Data Rate',     value: '0.3 – 50 kbps (SF and BW dependent)' },
    ],
    pinout: ['SPI Clock (to SX1276)','SPI MOSI','SPI MISO','SPI CS','Interrupt / DIO0','Reset'],
    notes: 'LoRa = physical layer (CSS modulation, Semtech proprietary). LoRaWAN = MAC protocol on top (Class A/B/C, ADR, OTAA/ABP join). Higher SF increases range but also airtime and power. EU duty cycle limit: <1% per channel. Not suitable for frequent high-bandwidth data — use NB-IoT instead.',
  },
  esp32: {
    shortDesc: 'Espressif WiFi+BLE SoC, 2.4GHz dual-mode, AT commands / Arduino / MicroPython / ESP-IDF SDK',
    specs: [
      { label: 'ESP32 CPU',     value: 'Dual-core Xtensa LX6 240MHz, FPU, 304KB SRAM' },
      { label: 'ESP8266 CPU',   value: 'Single-core Xtensa L106 80/160MHz, 80KB DRAM' },
      { label: 'WiFi',          value: '802.11 b/g/n, 2.4GHz, STA/AP/AP+STA modes' },
      { label: 'Bluetooth',     value: 'ESP32: BLE 4.2/5.0 (ESP8266 has no BLE)' },
      { label: 'Flash',         value: '4MB SPI Flash (typical), optional PSRAM 4/8MB' },
      { label: 'GPIO',          value: 'ESP32: 34 GPIO;  ESP8266: 17 GPIO (9 usable)' },
      { label: 'Peripherals',   value: 'SPI/I2C/UART/I2S/ADC/DAC/PWM/CAN/JTAG' },
      { label: 'SDK',           value: 'ESP-IDF / Arduino / MicroPython / Lua (NodeMCU)' },
    ],
    pinout: ['Built-in LED (active low)','Boot mode: LOW=flash, HIGH=run','UART0 TX (debug console)','UART0 RX (debug console)','I2C Data','I2C Clock','3.3V Power (max 600mA)','Ground'],
    notes: 'ESP8266 (ESP-01/12E) is WiFi-only for low-cost IoT; ESP32 adds BLE + dual-core. ESP32-S3 adds USB-OTG; ESP32-C3 uses RISC-V. Flashing: esptool.py --chip esp32 write_flash. OTA: esp_ota_begin → write → end. Development path: AT commands (easiest) → Arduino Core → MicroPython → ESP-IDF (full control).',
  },
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

  // ── SoC 接口 ────────────────────────────────────────────────────────────────

  {
    id: 'pwm', name: 'PWM', icon: '〰️', color: '#f0883e', category: 'soc',
    shortDesc: '脉冲宽度调制：用占空比控制平均电压，用于舵机/电机/LED调光/蜂鸣器',
    specs: [
      { label: '原理', value: '固定频率方波，改变高电平时间（占空比 0–100%）' },
      { label: '频率', value: '舵机50Hz，电机1–20kHz，LED 1kHz+' },
      { label: '分辨率', value: '树莓派硬件PWM 4096步（12位）' },
      { label: 'RPi引脚', value: 'GPIO12(PWM0), GPIO13(PWM1), GPIO18(PWM0), GPIO19(PWM1)' },
      { label: '驱动方式', value: 'sysfs /sys/class/pwm/  或  pigpio库  或  硬件Timer' },
      { label: '舵机角度', value: '0°=1ms, 90°=1.5ms, 180°=2ms (周期20ms=50Hz)' },
    ],
    pinout: [
      { pin: 'GPIO18', signal: 'PWM0', dir: '→', color: '#f0883e', desc: '硬件PWM通道0（推荐）' },
      { pin: 'GPIO12', signal: 'PWM0', dir: '→', color: '#ffa657', desc: '硬件PWM通道0（alt）' },
      { pin: 'GPIO13', signal: 'PWM1', dir: '→', color: '#e3b341', desc: '硬件PWM通道1' },
      { pin: 'GND',    signal: 'GND',  dir: '—', color: '#8b949e', desc: '参考地' },
    ],
    diagram: 'pwm',
    code: `/* PWM 控制 — Linux sysfs + 舵机角度控制 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <fcntl.h>

/* sysfs PWM 路径（树莓派 PWM0: chip=0, channel=0）*/
#define PWM_BASE "/sys/class/pwm/pwmchip0"

static int pwm_write(const char *path, const char *val) {
    int fd = open(path, O_WRONLY);
    if (fd < 0) return -1;
    write(fd, val, strlen(val));
    close(fd);
    return 0;
}

/* 舵机：period=20ms=20000000ns, duty=1–2ms */
int servo_angle(int channel, int degrees) {
    char path[128], val[32];
    /* 占空比: 1ms + degrees/180 * 1ms = (1000000 + degrees*5555) ns */
    int duty_ns = 1000000 + (degrees * 1000000 / 180);
    snprintf(path, sizeof(path), PWM_BASE "/pwm%d/duty_cycle", channel);
    snprintf(val, sizeof(val), "%d", duty_ns);
    return pwm_write(path, val);
}

int main(void) {
    /* 初始化 PWM0 */
    pwm_write(PWM_BASE "/export", "0");
    usleep(100000);
    pwm_write(PWM_BASE "/pwm0/period",     "20000000"); /* 20ms = 50Hz */
    pwm_write(PWM_BASE "/pwm0/duty_cycle", "1500000");  /* 1.5ms = 90° */
    pwm_write(PWM_BASE "/pwm0/enable",     "1");

    printf("PWM 舵机控制演示 (50Hz, GPIO18):\\n");
    int angles[] = {0, 45, 90, 135, 180, 90};
    for (int i = 0; i < 6; i++) {
        int duty = 1000000 + angles[i] * 1000000 / 180;
        printf("  角度 %3d° → duty_cycle = %d ns (%.2f ms)\\n",
               angles[i], duty, duty / 1e6);
        servo_angle(0, angles[i]);
        usleep(500000);
    }

    pwm_write(PWM_BASE "/pwm0/enable", "0");
    printf("\\n启用硬件PWM: /boot/config.txt 添加 dtoverlay=pwm,pin=18,func=2\\n");
    printf("LED调光: period=1000000(1kHz), duty=250000(25%%)\\n");
    return 0;
}`,
    codeTitle: 'PWM sysfs + 舵机控制 (树莓派)',
    notes: '舵机信号：周期20ms(50Hz)，高电平宽度1ms=0°, 1.5ms=90°, 2ms=180°。硬件PWM精度最高，软件PWM（pigpio）用CPU定时器模拟，在系统负载高时可能抖动。电机驱动需要L298N/L9110等H桥芯片，PWM控制占空比即转速，IN1/IN2引脚控制方向。',
  },

  {
    id: 'onewire', name: '1-Wire', icon: '🌡️', color: '#56d364', category: 'soc',
    shortDesc: 'Dallas单线协议，1根信号线+地，DS18B20温度传感器，寄生供电',
    specs: [
      { label: '线数', value: '1线（信号）+ GND，可寄生供电（无VCC线）' },
      { label: '速率', value: '标准 16kbps，过速模式 142kbps' },
      { label: '距离', value: '最大 100m（低速），多节点<30m' },
      { label: '地址', value: '64位 ROM ID，唯一地址，同一总线多传感器' },
      { label: '用途', value: 'DS18B12/DS18B20温度，DS2401序列号，DS2431 EEPROM' },
      { label: 'Linux', value: 'w1-gpio驱动，/sys/bus/w1/devices/ 自动枚举' },
    ],
    pinout: [
      { pin: 'GPIO4', signal: 'DQ', dir: '↔', color: '#56d364', desc: '单线数据（需4.7kΩ上拉到3.3V）' },
      { pin: 'VCC',   signal: '3.3V', dir: '—', color: '#f85149', desc: '电源（或寄生供电省略）' },
      { pin: 'GND',   signal: 'GND',  dir: '—', color: '#8b949e', desc: '地' },
    ],
    diagram: 'onewire',
    code: `/* 1-Wire DS18B20 温度传感器 — Linux w1 子系统 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <dirent.h>
#include <fcntl.h>

/* Linux 内核 w1 驱动自动处理 1-Wire 时序和 CRC
   /boot/config.txt 添加: dtoverlay=w1-gpio,gpiopin=4
   传感器会在 /sys/bus/w1/devices/28-xxxxxxxxxxxx/temperature 出现 */

float ds18b20_read(const char *id) {
    char path[128];
    snprintf(path, sizeof(path),
             "/sys/bus/w1/devices/%s/temperature", id);
    FILE *f = fopen(path, "r");
    if (!f) return -999.0f;
    int raw; fscanf(f, "%d", &raw); fclose(f);
    return raw / 1000.0f;  /* 单位: millidegrees → °C */
}

/* 枚举所有 DS18B20 传感器 (ROM地址以 28- 开头) */
int find_sensors(char ids[][64], int max) {
    int count = 0;
    DIR *dir = opendir("/sys/bus/w1/devices");
    if (!dir) return 0;
    struct dirent *ent;
    while ((ent = readdir(dir)) && count < max) {
        if (strncmp(ent->d_name, "28-", 3) == 0) {
            strncpy(ids[count++], ent->d_name, 63);
        }
    }
    closedir(dir);
    return count;
}

int main(void) {
    char ids[8][64];
    int n = find_sensors(ids, 8);

    if (n == 0) {
        /* 模拟输出 */
        printf("未找到DS18B20（需要 w1-gpio 驱动）\\n");
        printf("模拟: 传感器1 ROM=28-0000012345ab → %.3f°C\\n", 23.562f);
        printf("模拟: 传感器2 ROM=28-0000087654cd → %.3f°C\\n", 21.125f);
        printf("\\n配置步骤:\\n");
        printf("  1. /boot/config.txt 加入: dtoverlay=w1-gpio,gpiopin=4\\n");
        printf("  2. modprobe w1-gpio; modprobe w1-therm\\n");
        printf("  3. ls /sys/bus/w1/devices/\\n");
        printf("  4. cat /sys/bus/w1/devices/28-xxx/temperature\\n");
        return 0;
    }

    printf("发现 %d 个 DS18B20 传感器:\\n", n);
    for (int i = 0; i < n; i++) {
        float t = ds18b20_read(ids[i]);
        printf("  [%s]  %.3f °C\\n", ids[i], t);
    }
    return 0;
}`,
    codeTitle: '1-Wire DS18B20 温度传感器 (Linux w1驱动)',
    notes: '1-Wire 时序靠主机严格控制脉冲宽度实现（复位480μs，写1/0不同宽度，读靠上拉电阻回弹）。Linux w1_gpio 驱动在软件层实现这些时序（精度受调度影响）。DS18B12 分辨率可设9-12位，12位精度0.0625°C，转换时间750ms。寄生供电：省略VCC，通过数据线的上拉偷电，但转换时间更长。',
  },

  {
    id: 'i2s', name: 'I²S / PCM', icon: '🎵', color: '#bc8cff', category: 'soc',
    shortDesc: '音频数字接口：主流SoC音频总线，用于麦克风阵列/扬声器/音频CODEC芯片',
    specs: [
      { label: '线数', value: '3–4线：BCLK(位时钟), LRCLK(帧同步), SDATA(数据), MCLK(主时钟)' },
      { label: '速率', value: '采样率×位深×通道数=BCLK，44.1kHz×32bit×2ch=2.82MHz' },
      { label: '格式', value: 'I²S标准 / Left-Justified / Right-Justified / TDM多通道' },
      { label: 'RPi', value: 'GPIO18(BCLK), GPIO19(LRCLK), GPIO20(SDATA-out), GPIO21(SDATA-in)' },
      { label: '设备', value: 'INMP441(麦克风), MAX98357(D类放大器), PCM5102(DAC), WM8960' },
      { label: 'Linux', value: 'ALSA子系统，ASoC驱动框架，aplay/arecord命令' },
    ],
    pinout: [
      { pin: 'GPIO18', signal: 'BCLK', dir: '→', color: '#bc8cff', desc: '位时钟（每位一个脉冲）' },
      { pin: 'GPIO19', signal: 'LRCLK', dir: '→', color: '#d2a8ff', desc: '左右声道帧同步（采样率）' },
      { pin: 'GPIO20', signal: 'SDATA-O', dir: '→', color: '#58a6ff', desc: '数据输出（到DAC/放大器）' },
      { pin: 'GPIO21', signal: 'SDATA-I', dir: '←', color: '#3fb950', desc: '数据输入（来自ADC/麦克风）' },
    ],
    diagram: 'i2s',
    code: `/* I2S 音频录制 — Linux ALSA API */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <alsa/asoundlib.h>

/* WAV 文件头 */
typedef struct {
    char  riff[4];       /* "RIFF" */
    int   size;          /* 文件总大小-8 */
    char  wave[4];       /* "WAVE" */
    char  fmt[4];        /* "fmt " */
    int   fmt_size;      /* 16 */
    short audio_fmt;     /* 1=PCM */
    short channels;      /* 1=单声道, 2=立体声 */
    int   sample_rate;   /* 采样率 */
    int   byte_rate;     /* 字节率 */
    short block_align;   /* 帧大小 */
    short bits;          /* 位深 */
    char  data[4];       /* "data" */
    int   data_size;     /* 数据大小 */
} WavHeader;

int main(void) {
    snd_pcm_t *pcm;
    int rc;

    /* 打开 I2S 录音设备 (INMP441 麦克风模块) */
    /* 设备名: "plughw:1,0" 或 "hw:sndrpii2scard" */
    rc = snd_pcm_open(&pcm, "default", SND_PCM_STREAM_CAPTURE, 0);
    if (rc < 0) {
        printf("ALSA 未找到 I2S 设备（演示模式）\\n");
        printf("树莓派 I2S 麦克风配置:\\n");
        printf("  /boot/config.txt: dtoverlay=i2s-mmap\\n");
        printf("  INMP441 接线:\\n");
        printf("    VDD → 3.3V, GND → GND\\n");
        printf("    SCK → GPIO18(BCLK)\\n");
        printf("    WS  → GPIO19(LRCLK)\\n");
        printf("    SD  → GPIO21(SDATA-I)\\n");
        printf("    L/R → GND (左声道)\\n");
        printf("  启动: arecord -D plughw:1,0 -f S32_LE -r 44100 -c 2 out.wav\\n");
        printf("\\nWAV 文件格式 (44.1kHz 16bit 立体声):\\n");
        WavHeader h;
        memcpy(h.riff,"RIFF",4); memcpy(h.wave,"WAVE",4);
        memcpy(h.fmt,"fmt ",4); memcpy(h.data,"data",4);
        h.fmt_size=16; h.audio_fmt=1; h.channels=2;
        h.sample_rate=44100; h.bits=16;
        h.block_align=h.channels*h.bits/8;
        h.byte_rate=h.sample_rate*h.block_align;
        printf("  RIFF头: %d字节, 采样率%dHz, %dch, %dbit, %.1fkBps\\n",
               (int)sizeof(h), h.sample_rate, h.channels, h.bits, h.byte_rate/1024.0f);
        return 0;
    }

    /* 设置参数: 44100Hz, 16bit, 立体声 */
    snd_pcm_set_params(pcm, SND_PCM_FORMAT_S16_LE,
                       SND_PCM_ACCESS_RW_INTERLEAVED, 2, 44100, 1, 100000);

    /* 录制 1 秒 */
    short buf[44100 * 2];
    snd_pcm_readi(pcm, buf, 44100);
    printf("录制 1s, %d 采样帧\\n", 44100);
    snd_pcm_close(pcm);
    return 0;
}`,
    codeTitle: 'I²S ALSA 音频录制 (INMP441麦克风)',
    notes: 'BCLK频率 = 采样率 × 位深 × 通道数。MCLK（主时钟）通常是BCLK的256倍，由SoC提供给CODEC做PLL参考。TDM（Time Division Multiplexing）模式可在同一组线上传多达8个声道（ReSpeaker麦克风阵列使用此方式）。树莓派音频HAT（HiFiBerry/JustBoom）通过I2S直接连DAC，音质远优于3.5mm模拟口。',
  },

  {
    id: 'usb', name: 'USB', icon: '🔋', color: '#58a6ff', category: 'soc',
    shortDesc: 'Universal Serial Bus：libusb裸访问，HID/CDC/Bulk传输，USB协议栈',
    specs: [
      { label: '版本', value: 'USB 2.0(480Mbps) / USB 3.0(5Gbps) / USB 3.2(20Gbps)' },
      { label: '拓扑', value: '星型（Hub扩展），主机轮询，最多127设备' },
      { label: '传输类型', value: 'Control(配置) / Bulk(大数据) / Interrupt(HID) / Iso(音视频)' },
      { label: '连接器', value: 'Type-A/B/C, Mini-B, Micro-B, Type-C(可反插,PD充电)' },
      { label: '电源', value: 'USB 2.0: 5V/500mA，USB 3.0: 5V/900mA，USB PD: 100W' },
      { label: 'Linux', value: 'libusb-1.0, /dev/bus/usb/, lsusb -v, usbmon抓包' },
    ],
    pinout: [
      { pin: '1', signal: 'VBUS', dir: '—', color: '#f85149', desc: '5V 总线电源' },
      { pin: '2', signal: 'D-',   dir: '↔', color: '#58a6ff', desc: '差分数据负线' },
      { pin: '3', signal: 'D+',   dir: '↔', color: '#3fb950', desc: '差分数据正线' },
      { pin: '4', signal: 'GND',  dir: '—', color: '#8b949e', desc: '地' },
      { pin: 'CC1/2', signal: 'CC', dir: '↔', color: '#e3b341', desc: 'USB-C: 方向检测/PD协商' },
    ],
    diagram: 'usb',
    code: `/* USB 裸访问 — libusb-1.0 API */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <libusb-1.0/libusb.h>

/* 遍历并打印所有 USB 设备信息 */
static void print_device(libusb_device *dev) {
    struct libusb_device_descriptor desc;
    if (libusb_get_device_descriptor(dev, &desc) < 0) return;

    printf("  Bus %03d Dev %03d  VID:PID = %04x:%04x  Class=%02x",
           libusb_get_bus_number(dev),
           libusb_get_device_address(dev),
           desc.idVendor, desc.idProduct, desc.bDeviceClass);

    /* 尝试打开设备读取字符串描述符 */
    libusb_device_handle *h;
    if (libusb_open(dev, &h) == 0) {
        char mfr[64]={}, prod[64]={}, serial[32]={};
        if (desc.iManufacturer)
            libusb_get_string_descriptor_ascii(h, desc.iManufacturer,
                                               (uint8_t*)mfr, sizeof(mfr));
        if (desc.iProduct)
            libusb_get_string_descriptor_ascii(h, desc.iProduct,
                                               (uint8_t*)prod, sizeof(prod));
        printf("  %s %s", mfr, prod);
        libusb_close(h);
    }
    printf("\\n");
}

/* Bulk 传输示例（读取 USB 大容量存储第一个扇区）*/
int bulk_read_example(uint16_t vid, uint16_t pid) {
    libusb_device_handle *h = libusb_open_device_with_vid_pid(NULL, vid, pid);
    if (!h) return -1;
    libusb_claim_interface(h, 0);

    uint8_t buf[512];
    int transferred = 0;
    /* Bulk IN: endpoint 0x81 */
    int rc = libusb_bulk_transfer(h, 0x81, buf, sizeof(buf),
                                  &transferred, 1000 /* ms */);
    printf("Bulk read %d bytes, rc=%d\\n", transferred, rc);
    libusb_release_interface(h, 0);
    libusb_close(h);
    return 0;
}

int main(void) {
    libusb_context *ctx = NULL;
    if (libusb_init(&ctx) < 0) {
        printf("libusb_init 失败（安装: sudo apt install libusb-1.0-0-dev）\\n");
        printf("\\nUSB 枚举命令：\\n");
        printf("  lsusb                     # 列出所有USB设备\\n");
        printf("  lsusb -v -d 1234:5678     # 详细信息（VID:PID）\\n");
        printf("  usb-devices               # 树状显示\\n");
        printf("  usbmon 抓包: sudo modprobe usbmon\\n");
        printf("             wireshark → USBPCap\\n");
        printf("\\nUSB 传输类型：\\n");
        printf("  Control   配置/控制  (每设备必有 EP0)\\n");
        printf("  Bulk      大数据     (U盘/打印机/扫描仪)\\n");
        printf("  Interrupt 低延迟轮询 (键鼠/游戏手柄/HID)\\n");
        printf("  Isochronous 恒定带宽  (摄像头/麦克风/扬声器)\\n");
        return 0;
    }

    libusb_device **list;
    ssize_t cnt = libusb_get_device_list(ctx, &list);
    printf("发现 %zd 个 USB 设备:\\n", cnt);
    for (ssize_t i = 0; i < cnt; i++) print_device(list[i]);

    libusb_free_device_list(list, 1);
    libusb_exit(ctx);
    return 0;
}`,
    codeTitle: 'USB libusb-1.0 设备枚举 + Bulk传输',
    notes: 'USB 设备识别靠 VID(供应商ID) + PID(产品ID)，驱动绑定靠 /etc/udev/rules.d/。CDC-ACM类（VCP串口）在Linux自动挂载为 /dev/ttyACM0。HID类（键鼠）无需驱动直接用。libusb 做 detach_kernel_driver 可接管已被内核绑定的设备。USB 3.0 新增 SuperSpeed（5Gbps）通道，USB-C双面插靠CC线判断方向。',
  },

  // ── 现场总线 / 工业以太网 ────────────────────────────────────────────────────

  {
    id: 'modbus_tcp', name: 'Modbus TCP', icon: '🏭', color: '#39d353', category: 'field',
    shortDesc: '工业以太网Modbus：TCP端口502，保留Modbus功能码，去掉RS-485物理层',
    specs: [
      { label: '传输层', value: 'TCP/IP，端口 502' },
      { label: '帧结构', value: 'MBAP头(7B) + PDU（功能码+数据）' },
      { label: '功能码', value: '0x01-0x06 / 0x0F-0x10 / 0x17（同RTU）' },
      { label: '区别RTU', value: '无CRC（TCP保证完整性），无从站地址（用Unit ID），无帧间间隔' },
      { label: '速率', value: '受TCP延迟限制，LAN内<1ms，WAN数十ms' },
      { label: '用途', value: '工厂PLC/SCADA/能源管理/楼宇自动化' },
    ],
    pinout: [
      { pin: 'RJ45', signal: 'ETH', dir: '↔', color: '#39d353', desc: '标准以太网接口' },
      { pin: 'Port', signal: '502', dir: '↔', color: '#58a6ff', desc: 'Modbus TCP 固定端口' },
    ],
    diagram: 'modbus_tcp',
    code: `/* Modbus TCP Client — 读保持寄存器 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <arpa/inet.h>
#include <sys/socket.h>
#include <stdint.h>

#define MODBUS_TCP_PORT 502

/* Modbus TCP 帧 = MBAP头(7B) + PDU */
typedef struct __attribute__((packed)) {
    uint16_t transaction_id; /* 事务ID，请求/响应要匹配 */
    uint16_t protocol_id;    /* 固定 0x0000 */
    uint16_t length;         /* 后续字节数 */
    uint8_t  unit_id;        /* 从站ID（对应RTU的从站地址）*/
    uint8_t  func_code;      /* 功能码 */
    uint16_t start_addr;     /* 起始寄存器地址 */
    uint16_t quantity;       /* 寄存器数量 */
} ModbusTCPReq;

int modbus_tcp_read_regs(const char *host, uint8_t unit,
                          uint16_t addr, uint16_t count,
                          uint16_t *regs) {
    int sock = socket(AF_INET, SOCK_STREAM, 0);
    struct sockaddr_in srv = {
        .sin_family = AF_INET,
        .sin_port   = htons(MODBUS_TCP_PORT),
    };
    inet_pton(AF_INET, host, &srv.sin_addr);

    if (connect(sock, (struct sockaddr*)&srv, sizeof(srv)) < 0) {
        close(sock); return -1;
    }

    ModbusTCPReq req = {
        .transaction_id = htons(1),
        .protocol_id    = 0,
        .length         = htons(6),
        .unit_id        = unit,
        .func_code      = 0x03,  /* 读保持寄存器 */
        .start_addr     = htons(addr),
        .quantity       = htons(count),
    };
    send(sock, &req, sizeof(req), 0);

    uint8_t resp[256];
    int n = recv(sock, resp, sizeof(resp), 0);
    close(sock);

    if (n < 9 || resp[7] != 0x03) return -1;
    uint8_t byte_count = resp[8];
    for (int i = 0; i < byte_count/2; i++)
        regs[i] = (resp[9+i*2]<<8) | resp[10+i*2];
    return byte_count / 2;
}

int main(void) {
    printf("Modbus TCP 帧结构:\\n");
    printf("  [事务ID 2B][协议0 2B][长度 2B][单元ID 1B][功能码 1B][地址 2B][数量 2B]\\n");
    printf("  RTU: [从站1B][功能码1B][地址2B][数量2B][CRC2B]\\n");
    printf("  TCP: 去掉CRC，增加MBAP头（7字节），可多事务并发\\n\\n");

    printf("典型场景: 读PLC保持寄存器 (FC=0x03):\\n");
    ModbusTCPReq req = {htons(1),0,htons(6),1,0x03,htons(0),htons(10)};
    uint8_t *b = (uint8_t*)&req;
    printf("  请求: "); for(int i=0;i<12;i++) printf("%02X ",b[i]); printf("\\n");
    printf("  含义: 读单元1的寄存器0起10个\\n\\n");

    printf("Python 快速测试: pip install pymodbus\\n");
    printf("  from pymodbus.client import ModbusTcpClient\\n");
    printf("  c = ModbusTcpClient('192.168.1.100')\\n");
    printf("  r = c.read_holding_registers(0, 10, unit=1)\\n");
    return 0;
}`,
    codeTitle: 'Modbus TCP Client (FC=03 读保持寄存器)',
    notes: 'Modbus TCP 与 Modbus RTU 功能码完全相同（0x01~0x17），区别在物理层和帧封装。一个 Modbus TCP 连接可并发多个事务（靠 Transaction ID 区分），而 RTU 是严格请求-响应串行。工业防火墙通常放行 TCP 502，但建议限制源IP。SCADA软件（Ignition/Wonderware）默认支持 Modbus TCP 作为驱动。',
  },

  {
    id: 'current_loop', name: '4-20mA 电流环', icon: '🔁', color: '#ffa657', category: 'field',
    shortDesc: '工业模拟量标准：4mA=0%，20mA=100%，抗干扰强，传输距离>1km',
    specs: [
      { label: '范围', value: '4mA（量程下限）~ 20mA（量程上限），0mA=断线检测' },
      { label: '优势', value: '电流不受线路电阻影响，极强抗噪（工厂干扰环境首选）' },
      { label: '距离', value: '最大 1000m+（取决于供电电压和线路电阻）' },
      { label: '分辨率', value: 'ADC 12位 → 4096步 / 16mA = 0.0039mA/步' },
      { label: '供电', value: '两线制（24V DC）：电流环同时传信号和供传感器电源' },
      { label: '用途', value: '压力/温度/液位/流量传感器，PLC模拟量输入卡' },
    ],
    pinout: [
      { pin: '+24V', signal: 'LOOP+', dir: '→', color: '#f85149', desc: '环路正极（24V DC电源正）' },
      { pin: 'IN+',  signal: 'LOOP-', dir: '←', color: '#58a6ff', desc: '信号线（串入电流检测电阻）' },
      { pin: 'GND',  signal: 'GND',   dir: '—', color: '#8b949e', desc: '电源负/参考地' },
    ],
    diagram: 'current_loop',
    code: `/* 4-20mA 电流环读取 — 通过ADC采样（树莓派+ADS1115）*/
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <math.h>

/* 4-20mA → 物理量转换
   使用 250Ω 采样电阻: 4mA→1.0V, 20mA→5.0V
   树莓派3.3V ADC: 用 ADS1115(I2C) 或 MCP3208(SPI) */

typedef struct {
    const char *name;
    const char *unit;
    float low_val;   /* 4mA对应的物理量 */
    float high_val;  /* 20mA对应的物理量 */
} Sensor;

/* 电流(mA) → 物理量 */
float current_to_value(const Sensor *s, float mA) {
    /* 线性插值: 4mA=0%, 20mA=100% */
    float pct = (mA - 4.0f) / 16.0f;
    return s->low_val + pct * (s->high_val - s->low_val);
}

/* ADC 读数(0-4095, 12bit) → 电流(mA)
   采样电阻 250Ω，ADC参考电压 5V */
float adc_to_current(int adc_raw, int adc_bits, float vref, float r_sense) {
    float voltage = (adc_raw / (float)((1 << adc_bits) - 1)) * vref;
    return (voltage / r_sense) * 1000.0f; /* 转为mA */
}

int main(void) {
    Sensor sensors[] = {
        { "压力", "kPa",   0.0f,  200.0f  },
        { "温度", "°C",  -40.0f,  150.0f  },
        { "液位", "cm",    0.0f,  500.0f  },
        { "流量", "L/min", 0.0f,  100.0f  },
    };

    printf("4-20mA 电流环解析（250Ω采样电阻，5V ADC参考）:\\n\\n");
    printf("%-8s %-8s %-10s %-10s %-10s\\n","电流(mA)","ADC值","压力(kPa)","温度(°C)","液位(cm)");
    printf("%-8s %-8s %-10s %-10s %-10s\\n","--------","-----","--------","--------","--------");

    float test_mA[] = {4.0, 8.0, 12.0, 16.0, 20.0};
    for (int i = 0; i < 5; i++) {
        float mA = test_mA[i];
        /* 模拟ADC读数: V=mA*0.25, ADC=(V/5)*4095 */
        int adc = (int)((mA * 0.250f / 5.0f) * 4095);
        printf("%-8.1f %-8d", mA, adc);
        for (int j = 0; j < 3; j++)
            printf(" %-10.2f", current_to_value(&sensors[j], mA));
        printf("\\n");
    }

    printf("\\n⚠ 断线检测: 电流<3.8mA → 告警（正常最低4mA）\\n");
    printf("   仪表选型: HART协议可在4-20mA上叠加数字通信(±0.5mA调制)\\n");
    return 0;
}`,
    codeTitle: '4-20mA 电流环 ADC采样与物理量转换',
    notes: '为什么选4mA而非0mA作为零点：① 断线时电流=0可区分于量程下限；② 传感器可从电流环取电（两线制，最低3.5mA维持运行）。HART协议在4-20mA基础上叠加FSK调制（1200Hz=1，2200Hz=0），实现数字通信不影响模拟信号。工业现场常见24V两线制传感器（E+H/西门子/横河）直接接PLC模拟量卡。',
  },

  {
    id: 'lin', name: 'LIN Bus', icon: '🚘', color: '#74c0fc', category: 'field',
    shortDesc: '单线低速汽车总线：12V，单主多从，CAN的低成本替代，车窗/座椅/灯控',
    specs: [
      { label: '线数', value: '1线（LIN）+ GND + 12V' },
      { label: '速率', value: '最高 20kbps（标准1kbps–20kbps）' },
      { label: '拓扑', value: '单主多从（1主，最多16从）' },
      { label: '电平', value: '逻辑1（隐性）= 12V，逻辑0（显性）= 0V' },
      { label: '帧格式', value: 'Break(13位)+Sync(0x55)+ID(1B)+Data(1-8B)+Checksum' },
      { label: '用途', value: '车门模块/座椅/天窗/雨刷/空调/后视镜调节' },
    ],
    pinout: [
      { pin: 'LIN', signal: 'LIN', dir: '↔', color: '#74c0fc', desc: '单总线（12V单线，开集极驱动）' },
      { pin: '12V', signal: 'VBat', dir: '—', color: '#f85149', desc: '车载电池电压' },
      { pin: 'GND', signal: 'GND', dir: '—', color: '#8b949e', desc: '车身地' },
    ],
    diagram: 'lin',
    code: `/* LIN Bus 帧结构与调度表模拟 */
#include <stdio.h>
#include <stdint.h>
#include <string.h>

/* LIN 2.1 受保护ID (Protected ID = ID + 奇偶校验) */
uint8_t lin_pid(uint8_t id) {
    id &= 0x3F; /* 6位ID */
    uint8_t p0 = ((id>>0)^(id>>1)^(id>>2)^(id>>4)) & 1;
    uint8_t p1 = !((id>>1)^(id>>3)^(id>>4)^(id>>5) & 1);
    return id | (p0 << 6) | (p1 << 7);
}

/* 增强校验和 (LIN 2.x): Data + PID 的补码 */
uint8_t lin_checksum(uint8_t pid, const uint8_t *data, int len) {
    uint16_t sum = pid;
    for (int i = 0; i < len; i++) sum += data[i];
    while (sum >> 8) sum = (sum & 0xFF) + (sum >> 8);
    return ~(uint8_t)sum;
}

/* 模拟 LIN 调度表（主机周期性发送帧头，从机响应）*/
typedef struct {
    uint8_t id; const char *name; int period_ms;
} LINFrame;

static LINFrame schedule[] = {
    { 0x01, "车窗位置",   100 },
    { 0x02, "座椅位置",   200 },
    { 0x10, "温度状态",   500 },
    { 0x20, "雨刷速度",   100 },
    { 0x3C, "诊断请求",  1000 },
};

int main(void) {
    printf("LIN 2.1 调度表模拟 (20kbps, 波特率检测靠0x55):\\n\\n");
    printf("%-6s %-16s %-8s %-6s %-8s %s\\n",
           "ID","功能","PID","周期","校验","帧字节序列");
    printf("%s\\n", "----------------------------------------------------------------------");

    for (int i = 0; i < 5; i++) {
        LINFrame *f = &schedule[i];
        uint8_t pid = lin_pid(f->id);
        uint8_t data[4] = { 0x01, 0x80, 0x00, 0xFF }; /* 模拟数据 */
        uint8_t chk = lin_checksum(pid, data, 4);

        printf("0x%02X  %-16s  0x%02X  %4dms ", f->id, f->name, pid, f->period_ms);
        printf("0x%02X   ", chk);
        printf("BREAK SYNC=55 PID=%02X %02X %02X %02X %02X CHK=%02X\\n",
               pid, data[0], data[1], data[2], data[3], chk);
    }

    printf("\\n帧头: [Break≥13位低] [Sync=0x55] [PID含奇偶校验]\\n");
    printf("从机: 接收帧头后自动响应（不需主机选通，靠PID识别自己的帧）\\n");
    printf("诊断: ID=0x3C(主→从请求) + 0x3D(从→主响应) 固定帧\\n");
    return 0;
}`,
    codeTitle: 'LIN Bus 帧结构 / 调度表 / PID校验',
    notes: 'LIN 成本远低于 CAN（单线 vs 双线差分，无需专用收发器芯片）。常用于 CAN 子网的末梢：CAN 主节点（BCM车身控制器）作为 LIN 主机，连接多个车门/座椅等低速从节点。Break 字段至少13个低电平位（超过一个正常字节的长度），从机靠此同步帧头。LIN 2.x 增加了诊断帧（0x3C/0x3D），支持 OBD-II 扩展。',
  },

  // ── 无线通信 ─────────────────────────────────────────────────────────────────

  {
    id: 'bluetooth', name: 'Bluetooth', icon: '🟦', color: '#4285F4', category: 'wireless',
    shortDesc: 'BLE低功耗蓝牙 + 经典蓝牙：BlueZ / RFCOMM / GATT / Linux HCI接口',
    specs: [
      { label: 'BLE速率', value: '1Mbps / 2Mbps（BT 5.0）' },
      { label: '经典速率', value: 'BR: 1Mbps，EDR: 2/3Mbps，A2DP高质量音频' },
      { label: '距离', value: 'Class 1: 100m，Class 2: 10m，BLE: 50m+' },
      { label: '频段', value: '2.4GHz ISM，79/40个信道，跳频扩频(FHSS)' },
      { label: 'BLE Profile', value: 'HID / HRP(心率) / BAS(电池) / UART(Nordic NUS)' },
      { label: 'Linux', value: 'BlueZ栈，bluetoothctl，hciconfig，DBUS API' },
    ],
    pinout: [
      { pin: 'UART', signal: 'HCI', dir: '↔', color: '#4285F4', desc: '模块通过UART连接主机（HC-05: AT命令配置）' },
      { pin: 'GPIO', signal: 'STATE', dir: '←', color: '#3fb950', desc: '连接状态指示（已配对时常亮）' },
      { pin: '3.3V', signal: 'VCC', dir: '—', color: '#f85149', desc: '电源（HC-05: 3.3V，模块板载稳压可接5V）' },
    ],
    diagram: 'bluetooth',
    code: `/* Bluetooth BLE 扫描 + RFCOMM 串口 — Linux BlueZ */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/socket.h>
#include <bluetooth/bluetooth.h>
#include <bluetooth/hci.h>
#include <bluetooth/hci_lib.h>
#include <bluetooth/rfcomm.h>

/* ── BLE 扫描（被动扫描）──────────────────────── */
void ble_scan(void) {
    int hci_fd = hci_open_dev(hci_get_route(NULL));
    if (hci_fd < 0) { perror("hci_open_dev"); return; }

    /* 开始 LE 扫描: 1280ms window, 2560ms interval */
    hci_le_set_scan_parameters(hci_fd, 0, htobs(0x0050), htobs(0x00A0),
                                LE_PUBLIC_ADDRESS, 0x00, 1000);
    hci_le_set_scan_enable(hci_fd, 0x01, 0x00, 1000);

    printf("BLE 扫描中 (5秒)...\\n");
    struct hci_filter nf;
    hci_filter_clear(&nf);
    hci_filter_set_ptype(HCI_EVENT_PKT, &nf);
    hci_filter_set_event(EVT_LE_META_EVENT, &nf);
    setsockopt(hci_fd, SOL_HCI, HCI_FILTER, &nf, sizeof(nf));

    /* 读取广播包 */
    sleep(5);
    hci_le_set_scan_enable(hci_fd, 0x00, 0x00, 1000);
    hci_close_dev(hci_fd);
}

/* ── RFCOMM 连接 HC-05 模块 ──────────────────── */
int rfcomm_connect(const char *bt_addr, uint8_t channel) {
    int sock = socket(AF_BLUETOOTH, SOCK_STREAM, BTPROTO_RFCOMM);
    struct sockaddr_rc addr = {
        .rc_family  = AF_BLUETOOTH,
        .rc_channel = channel,
    };
    str2ba(bt_addr, &addr.rc_bdaddr);
    if (connect(sock, (struct sockaddr*)&addr, sizeof(addr)) < 0) {
        close(sock); return -1;
    }
    return sock;
}

int main(void) {
    printf("BlueZ 蓝牙示例\\n\\n");
    printf("命令行工具:\\n");
    printf("  bluetoothctl           # 交互式配对/连接\\n");
    printf("  hciconfig hci0 up      # 启动蓝牙\\n");
    printf("  hcitool lescan         # BLE扫描\\n");
    printf("  hcitool scan           # 经典蓝牙扫描\\n");
    printf("  rfcomm connect hci0 AA:BB:CC:DD:EE:FF 1  # 串口连接\\n");
    printf("\\nHC-05 AT命令（3.3V串口，波特率38400，EN引脚拉高）:\\n");
    printf("  AT+NAME=MyDevice  设置名称\\n");
    printf("  AT+PSWD=1234      设置PIN码\\n");
    printf("  AT+UART=115200,0,0  设置波特率\\n");
    printf("\\nBLE GATT 读写（Python）:\\n");
    printf("  pip install bleak\\n");
    printf("  async def scan(): devs=await BleakScanner.discover()\\n");
    printf("  async def read(): c=BleakClient(addr); await c.read_gatt_char(uuid)\\n");
    return 0;
}`,
    codeTitle: 'Bluetooth BLE扫描 + RFCOMM (BlueZ)',
    notes: 'BLE GATT 核心概念：Profile→Service→Characteristic→Descriptor。心率传感器 Profile: Service UUID 0x180D，心率测量 Characteristic 0x2A37，可 Notify 方式推送数据。HC-05 是经典蓝牙 SPP（Serial Port Profile），Linux 侧用 RFCOMM 创建 /dev/rfcomm0 虚拟串口。树莓派内置蓝牙通过 UART 连接，需要禁用 miniuart 切换（dtoverlay=miniuart-bt）。',
  },

  {
    id: 'wifi', name: 'WiFi (Linux)', icon: '📶', color: '#a5d8ff', category: 'wireless',
    shortDesc: '802.11 无线：Linux nl80211/wpa_supplicant/hostapd，AP模式，WiFi扫描',
    specs: [
      { label: '标准', value: '802.11a/b/g/n/ac/ax（Wi-Fi 4/5/6/6E）' },
      { label: '频段', value: '2.4GHz（范围广），5GHz（速率高），6GHz（Wi-Fi 6E）' },
      { label: '安全', value: 'WPA2-PSK(CCMP/AES)，WPA3-SAE，802.1X企业' },
      { label: 'Linux', value: 'nl80211内核接口，iw命令，wpa_supplicant，hostapd' },
      { label: 'Socket', value: '透明使用标准socket，无需感知无线层' },
      { label: 'RPi', value: '树莓派内置BCM43438，支持AP+Station同时运行' },
    ],
    pinout: [
      { pin: 'RF',   signal: 'Antenna', dir: '↔', color: '#a5d8ff', desc: '天线（PCB/外置/IPEX）' },
      { pin: 'SDIO', signal: 'Host',    dir: '↔', color: '#58a6ff', desc: 'SoC接口（SDIO/USB/PCIe）' },
    ],
    diagram: 'wifi',
    code: `/* WiFi 扫描 + 连接 — Linux nl80211 / wpa_supplicant */
#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <net/if.h>
#include <sys/ioctl.h>
#include <linux/wireless.h>
#include <sys/socket.h>

/* iwlib 无线扫描（简化版，通用方式）*/
void wifi_scan_cmd(const char *iface) {
    char cmd[128];
    /* 触发扫描（需要root）*/
    snprintf(cmd, sizeof(cmd), "iw dev %s scan 2>/dev/null | "
             "grep -E 'SSID:|signal:|freq:'", iface);
    printf("=== WiFi 扫描 (iw dev %s scan) ===\\n", iface);
    FILE *f = popen(cmd, "r");
    if (!f) { printf("需要 root 或安装 iw\\n"); return; }
    char line[256]; int count = 0;
    while (fgets(line, sizeof(line), f) && count < 30) {
        line[strcspn(line,"\n")] = 0;
        printf("  %s\\n", line + strspn(line, " \t"));
        count++;
    }
    pclose(f);
}

/* wpa_supplicant 配置文件生成 */
void gen_wpa_conf(const char *ssid, const char *psk) {
    printf("\\n=== wpa_supplicant.conf ===\\n");
    printf("ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev\\n");
    printf("update_config=1\\ncountry=CN\\n\\n");
    printf("network={\\n");
    printf("    ssid=\"%s\"\\n", ssid);
    printf("    psk=\"%s\"\\n", psk);
    printf("    key_mgmt=WPA-PSK\\n");
    printf("    priority=1\\n");
    printf("}\\n");
}

/* hostapd AP 模式配置 */
void gen_hostapd_conf(const char *ssid, const char *pass) {
    printf("\\n=== hostapd.conf (AP模式) ===\\n");
    printf("interface=wlan0\\ndriver=nl80211\\n");
    printf("ssid=%s\\nhw_mode=g\\nchannel=7\\n", ssid);
    printf("wmm_enabled=0\\nmacaddr_acl=0\\nauth_algs=1\\n");
    printf("ignore_broadcast_ssid=0\\nwpa=2\\n");
    printf("wpa_passphrase=%s\\nwpa_key_mgmt=WPA-PSK\\n", pass);
    printf("rsn_pairwise=CCMP\\n");
}

int main(void) {
    printf("Linux WiFi 工具链:\\n");
    printf("  ip link set wlan0 up          # 启动网卡\\n");
    printf("  iw dev wlan0 scan             # 扫描AP\\n");
    printf("  iw dev wlan0 link             # 连接状态\\n");
    printf("  iwconfig wlan0                # 旧版工具\\n");
    printf("  wpa_supplicant -i wlan0 -c /etc/wpa_supplicant.conf -B\\n");
    printf("  dhclient wlan0                # 获取IP\\n\\n");

    wifi_scan_cmd("wlan0");
    gen_wpa_conf("MyNetwork", "MyPassword123");
    gen_hostapd_conf("RPi-AP", "raspberry");

    printf("\\n树莓派同时运行 STA+AP:\\n");
    printf("  iw phy phy0 interface add uap0 type __ap\\n");
    printf("  # wlan0=STA连路由器, uap0=AP供设备接入\\n");
    return 0;
}`,
    codeTitle: 'WiFi 扫描/连接/AP模式 (nl80211/hostapd)',
    notes: 'nl80211 是 Linux 内核的现代无线子系统，通过 netlink socket 与内核通信（替代旧的 ioctl/wireless extensions）。wpa_supplicant 实现 WPA/WPA2/WPA3 认证，hostapd 实现 AP 模式。树莓派 4/5 的 BCM43455 支持 5GHz，CM4/RPi 5 支持 802.11ac（Wi-Fi 5）。WiFi 监控模式（monitor mode）可抓取原始 802.11 帧，用于安全研究（airmon-ng）。',
  },

  {
    id: 'lora', name: 'LoRa / LoRaWAN', icon: '📡', color: '#cc5de8', category: 'wireless',
    shortDesc: '长距离低功耗IoT：扩频调制，5-15km，低速率，LoRaWAN网络协议',
    specs: [
      { label: '调制', value: 'Chirp扩频(CSS)，抗干扰强，可-20dB信噪比下工作' },
      { label: '频率', value: '中国: 470-510MHz，欧洲: 868MHz，美洲: 915MHz' },
      { label: '距离', value: '城市 2-5km，农村/空旷 15km+，卫星 > 1000km' },
      { label: '速率', value: '0.3kbps–27kbps（SF7–SF12，越大速率越慢距离越远）' },
      { label: '功耗', value: '发送10–100mA，睡眠1μA，适合电池供电年级别' },
      { label: '芯片', value: 'SX1276/SX1278（HPDtek），RPi: RAK811/SX1268 HAT' },
    ],
    pinout: [
      { pin: 'SCLK', signal: 'SCK',  dir: '→', color: '#e3b341', desc: 'SPI时钟（接RPi GPIO11）' },
      { pin: 'MOSI', signal: 'MOSI', dir: '→', color: '#58a6ff', desc: 'SPI数据输出' },
      { pin: 'MISO', signal: 'MISO', dir: '←', color: '#3fb950', desc: 'SPI数据输入' },
      { pin: 'NSS',  signal: 'CS',   dir: '→', color: '#f85149', desc: 'SPI片选' },
      { pin: 'DIO0', signal: 'IRQ',  dir: '←', color: '#cc5de8', desc: '发送/接收完成中断' },
    ],
    diagram: 'lora',
    code: `/* LoRa SX1276 寄存器操作 — SPI直驱 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

/* SX1276 关键寄存器 */
#define REG_FIFO          0x00
#define REG_OP_MODE       0x01
#define REG_FRF_MSB       0x06  /* 载波频率 */
#define REG_FRF_MID       0x07
#define REG_FRF_LSB       0x08
#define REG_PA_CONFIG     0x09
#define REG_MODEM_CONFIG1 0x1D  /* BW, CR */
#define REG_MODEM_CONFIG2 0x1E  /* SF */
#define REG_PAYLOAD_LEN   0x22
#define REG_FIFO_ADDR_PTR 0x0D
#define REG_IRQ_FLAGS     0x12
#define REG_VERSION       0x42  /* 应为 0x12 */

/* LoRa 调制参数 */
typedef struct {
    uint8_t sf;   /* 扩频因子: 7-12 */
    uint8_t bw;   /* 带宽: 7=125kHz, 8=250kHz, 9=500kHz */
    uint8_t cr;   /* 编码率: 1=4/5, 2=4/6, 3=4/7, 4=4/8 */
} LoRaConfig;

/* 计算空中时间 (ms) */
float lora_toa_ms(const LoRaConfig *c, int payload_bytes) {
    float bw_hz[] = {7800,10400,15600,20800,31250,41700,62500,125000,250000,500000};
    float bw = bw_hz[c->bw];
    float rs = bw / (1 << c->sf);  /* 符号率 */
    float ts = 1000.0f / rs;       /* 符号时间 ms */
    /* 前导码: 12.25个符号 + 载荷符号数 */
    int n_payload = (int)(8 + (payload_bytes * 8 - 4 * c->sf + 28 + 16 + 0) / (4 * c->sf) + 1) * (c->cr + 4);
    return (12.25f + n_payload) * ts;
}

/* 频率 → 寄存器值 (32MHz晶振, 分辨率61Hz) */
void freq_to_regs(uint32_t freq_hz, uint8_t *msb, uint8_t *mid, uint8_t *lsb) {
    uint64_t frf = ((uint64_t)freq_hz << 19) / 32000000ULL;
    *msb = (frf >> 16) & 0xFF;
    *mid = (frf >>  8) & 0xFF;
    *lsb =  frf        & 0xFF;
}

int main(void) {
    printf("LoRa SX1276 参数配置示例:\\n\\n");

    /* 中国470MHz LoRaWAN频段 */
    uint8_t msb, mid, lsb;
    freq_to_regs(470000000, &msb, &mid, &lsb);
    printf("频率 470MHz → FRF寄存器: 0x%02X%02X%02X\\n", msb, mid, lsb);

    /* 不同SF的性能对比 */
    printf("\\nSF  BW    速率      空中时间(10B)  距离估算\\n");
    printf("--- ----- --------- ------------- --------\\n");
    struct { int sf; const char *bw; float rate; } params[] = {
        {7,  "125kHz", 5469}, {9,  "125kHz", 1758},
        {10, "125kHz",  977}, {12, "125kHz",  293},
    };
    for (int i = 0; i < 4; i++) {
        LoRaConfig c = {params[i].sf, 7, 1}; /* BW=125kHz,CR=4/5 */
        float toa = lora_toa_ms(&c, 10);
        printf("SF%-2d %-6s %-8.0fbps %-12.1fms  %s\\n",
            params[i].sf, params[i].bw, params[i].rate, toa,
            params[i].sf==7?"~2km":params[i].sf==10?"~8km":"~15km");
    }

    printf("\\nLoRaWAN 数据速率限制: 中国470MHz最大255B/帧\\n");
    printf("实际: 每天最多发几十次（信道占用<1%%）\\n");
    printf("\\n树莓派 + RAK811 HAT 命令:\\n");
    printf("  AT+JOIN              # 入网 (OTAA)\\n");
    printf("  AT+SEND=1,hello      # 发送到端口1\\n");
    return 0;
}`,
    codeTitle: 'LoRa SX1276 寄存器/参数/空中时间计算',
    notes: 'LoRa 物理层 vs LoRaWAN 网络层：LoRa 是调制技术（扩频，Semtech专利），LoRaWAN 是在 LoRa 上的 MAC 层协议（定义 Class A/B/C 设备、ADR、入网认证）。SF（扩频因子）越大，接收灵敏度越高（最高-137dBm@SF12），距离越远，但速率越低，空中时间越长。LoRaWAN 有信道占用率限制（欧洲<1%），不适合高频发送数据。',
  },
  {
    id: 'esp32', name: 'ESP32 / ESP8266', icon: '📶', color: '#3fb950', category: 'wireless',
    shortDesc: 'Espressif WiFi+BLE SoC，2.4GHz双模，支持AT指令/Arduino/MicroPython/ESP-IDF',
    specs: [
      { label: 'ESP32 CPU', value: '双核 Xtensa LX6 240MHz，FPU，304KB SRAM' },
      { label: 'ESP8266 CPU', value: '单核 Xtensa L106 80/160MHz，80KB DRAM' },
      { label: 'WiFi', value: '802.11 b/g/n，2.4GHz，STA/AP/AP+STA 三模' },
      { label: 'BLE', value: 'ESP32: BLE 4.2/5.0（ESP8266 无 BLE）' },
      { label: 'Flash', value: '4MB SPI Flash（典型），PSRAM 可选 4/8MB' },
      { label: 'GPIO', value: 'ESP32: 34 GPIO；ESP8266: 17 GPIO（常用9个）' },
      { label: '外设', value: 'SPI/I2C/UART/I2S/ADC/DAC/PWM/CAN/JTAG' },
      { label: '开发', value: 'ESP-IDF / Arduino / MicroPython / Lua (NodeMCU)' },
    ],
    pinout: [
      { pin: 'GPIO2',  signal: 'LED',   dir: '→', color: '#3fb950', desc: '内置LED（低电平点亮）' },
      { pin: 'GPIO0',  signal: 'BOOT',  dir: '←', color: '#ffa657', desc: '上电低=下载模式，高=正常启动' },
      { pin: 'GPIO1',  signal: 'TXD0',  dir: '→', color: '#58a6ff', desc: 'UART0 调试串口发送' },
      { pin: 'GPIO3',  signal: 'RXD0',  dir: '←', color: '#3fb950', desc: 'UART0 调试串口接收' },
      { pin: 'GPIO21', signal: 'SDA',   dir: '↔', color: '#d2a8ff', desc: 'I2C 数据线' },
      { pin: 'GPIO22', signal: 'SCL',   dir: '→', color: '#74c0fc', desc: 'I2C 时钟线' },
      { pin: '3V3',    signal: 'VCC',   dir: '—', color: '#f85149', desc: '3.3V 电源输入（最大600mA）' },
      { pin: 'GND',    signal: 'GND',   dir: '—', color: '#8b949e', desc: '电源地' },
    ],
    diagram: 'esp32',
    code: `/* ─── ESP32/8266 开发四种方式 ─────────────────────────── */

/* 1. AT 指令（ESP-AT固件，通过串口TTL控制模块）*/
// 波特率: 115200，8N1，连接模块 TX/RX 引脚
AT                               // 测试通信 → OK
AT+GMR                           // 查固件版本
AT+CWMODE=3                      // 1=STA 2=AP 3=AP+STA
AT+CWJAP="MyWiFi","password"     // 连接路由 → WIFI CONNECTED
AT+CIFSR                         // 查 IP → STAIP,192.168.1.105
AT+CIPMUX=1                      // 多路连接模式
AT+CIPSTART=0,"TCP","10.0.0.1",80  // 建立TCP连接
AT+CIPSEND=0,4                   // 发送4字节 → > (等待输入)
// 输入 "GET " 后自动发送
AT+CIPCLOSE=0                    // 关闭连接

/* 2. Arduino ESP32 Core (platformio/arduino-esp32) */
#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "MyWiFi";
const char* pass = "password";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, pass);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500); Serial.print(".");
  }
  Serial.printf("\\nIP: %s\\n", WiFi.localIP().toString().c_str());

  /* HTTP GET */
  HTTPClient http;
  http.begin("http://api.example.com/sensor");
  int code = http.GET();
  if (code == HTTP_CODE_OK)
    Serial.println(http.getString());
  http.end();

  /* BLE 广播 (ESP32 only) */
  #include <BLEDevice.h>
  // BLEDevice::init("ESP32-Sensor");
  // BLEAdvertising *adv = BLEDevice::getAdvertising();
  // adv->start();  // BLE 扫描可见

  /* 深度休眠省电 (10μA) */
  esp_sleep_enable_timer_wakeup(30ULL * 1000000); // 30秒
  esp_deep_sleep_start();
}
void loop() {}

/* 3. MicroPython (micropython.org 固件，esptool.py 烧录) */
// esptool.py --chip esp32 erase_flash
// esptool.py --chip esp32 write_flash -z 0 esp32.bin
// ampy --port /dev/ttyUSB0 put main.py
# -- main.py --
# import network, urequests, time
# sta = network.WLAN(network.STA_IF)
# sta.active(True); sta.connect('MyWiFi', 'password')
# while not sta.isconnected(): time.sleep(0.1)
# print(sta.ifconfig())       # ('192.168.1.105', ...)
# r = urequests.get('http://api.example.com/data')
# print(r.json()); r.close()

/* 4. ESP-IDF (官方框架，完整C/C++) */
// idf.py create-project demo && cd demo
// idf.py menuconfig  (配置WiFi凭据等)
// idf.py build flash monitor
//
// wifi_config_t cfg = { .sta = {
//   .ssid     = "MyWiFi",
//   .password = "password",
// }};
// esp_wifi_init(&init_cfg);
// esp_wifi_set_mode(WIFI_MODE_STA);
// esp_wifi_set_config(WIFI_IF_STA, &cfg);
// esp_wifi_start(); esp_wifi_connect();
`,
    codeTitle: 'ESP32/8266 AT指令 + Arduino + MicroPython + ESP-IDF',
    notes: 'ESP8266（ESP-01/ESP-12E）仅支持WiFi，适合低成本IoT；ESP32增加BLE双核，ESP32-S3支持USB-OTG，ESP32-C3为RISC-V内核。常见模组：ESP-WROOM-32（FCC认证），ESP32-S3-MINI（PCB天线）。刷机工具：esptool.py；OTA升级：esp_ota_begin→write→end。开发建议：快速原型用Arduino，量产产品用ESP-IDF，教学演示用MicroPython。',
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

function PwmDiagram() {
  const W=540,H=160
  const sq=(x:number,w:number,y:number,h:number,col:string,lbl:string)=>(
    <g><rect x={x} y={y} width={w} height={h} fill={col} opacity={0.85}/>
      <text x={x+w/2} y={y+h/2+4} textAnchor="middle" fontSize={9} fill="#fff">{lbl}</text></g>
  )
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',maxWidth:W,display:'block'}}>
      <text x={10} y={30} fontSize={10} fontWeight={700} fill="var(--text-secondary)">PWM 波形 (50Hz 舵机)  周期=20ms</text>
      {/* timeline */}
      <line x1={40} y1={120} x2={500} y2={120} stroke="var(--border)" strokeWidth={1}/>
      <line x1={40} y1={60} x2={40} y2={125} stroke="var(--border)" strokeWidth={1}/>
      {/* pulse 1: 1ms/0° */}
      {sq(40,23,60,55,'#4d8fff','1ms\n0°')}
      <rect x={63} y={60} width={207} height={55} fill="var(--bg-tertiary)" stroke="var(--border)" strokeWidth={1}/>
      {/* pulse 2: 1.5ms/90° */}
      {sq(270,35,60,55,'#3fb950','1.5ms\n90°')}
      <rect x={305} y={60} width={195} height={55} fill="var(--bg-tertiary)" stroke="var(--border)" strokeWidth={1}/>
      {/* labels */}
      <line x1={40} y1={130} x2={270} y2={130} stroke="#e3b341" strokeWidth={1} markerEnd="url(#arr2)"/>
      <text x={155} y={145} textAnchor="middle" fontSize={9} fill="#e3b341">20ms 周期 (50Hz)</text>
      <text x={40} y={158} fontSize={8} fill="var(--text-muted)">占空比 5%=0°  7.5%=90°  10%=180°  改变duty_cycle不改变period</text>
      <defs><marker id="arr2" markerWidth={6} markerHeight={6} refX={5} refY={3} orient="auto">
        <path d="M0,0L0,6L6,3z" fill="#e3b341"/></marker></defs>
    </svg>
  )
}

function OneWireDiagram() {
  const W=540,H=155
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',maxWidth:W,display:'block'}}>
      {/* Single data line */}
      <line x1={40} y1={80} x2={500} y2={80} stroke="#56d364" strokeWidth={2.5}/>
      <text x={20} y={84} textAnchor="end" fontSize={10} fontWeight={700} fill="#56d364">DQ</text>
      {/* Pull-up */}
      <rect x={105} y={38} width={8} height={28} rx={2} fill="#e3b341" stroke="#e3b341"/>
      <line x1={109} y1={20} x2={109} y2={38} stroke="#f85149" strokeWidth={1.5}/>
      <line x1={109} y1={66} x2={109} y2={80} stroke="#56d364" strokeWidth={1.5}/>
      <text x={100} y={16} textAnchor="middle" fontSize={9} fill="#f85149">3.3V</text>
      <text x={120} y={58} fontSize={8} fill="#e3b341">4.7kΩ</text>
      {/* Master */}
      <rect x={30} y={95} width={100} height={40} rx={6} fill="#4d8fff22" stroke="#4d8fff" strokeWidth={1.5}/>
      <text x={80} y={115} textAnchor="middle" fontSize={10} fontWeight={700} fill="#4d8fff">Master</text>
      <text x={80} y={128} textAnchor="middle" fontSize={8} fill="var(--text-muted)">RPi GPIO4</text>
      <line x1={80} y1={95} x2={80} y2={80} stroke="#56d364" strokeWidth={1.5}/>
      {/* Sensors */}
      {[['28-aabb','DS18B20 #1',200],['28-ccdd','DS18B20 #2',340],['28-eeff','DS18B20 #3',430]].map(([id,lbl,x]:any,i)=>(
        <g key={i}>
          <rect x={x} y={95} width={85} height={40} rx={5} fill="#56d36422" stroke="#56d364" strokeWidth={1.5}/>
          <text x={x+42} y={113} textAnchor="middle" fontSize={9} fontWeight={700} fill="#56d364">{lbl}</text>
          <text x={x+42} y={127} textAnchor="middle" fontSize={7} fill="var(--text-muted)">{id}</text>
          <line x1={x+42} y1={95} x2={x+42} y2={80} stroke="#56d364" strokeWidth={1.5}/>
        </g>
      ))}
      <text x={270} y={148} textAnchor="middle" fontSize={9} fill="var(--text-muted)">同一根线最多50+个传感器，靠64位ROM ID区分，内核驱动自动枚举</text>
    </svg>
  )
}

function I2sDiagram() {
  const W=540,H=160,lines=[
    {y:50,col:'#bc8cff',lbl:'BCLK (位时钟)'},
    {y:80,col:'#d2a8ff',lbl:'LRCLK (左右声道)'},
    {y:110,col:'#58a6ff',lbl:'SDATA-OUT (数据)'},
  ]
  const wave=(y:number,pattern:number[],col:string)=>
    pattern.map((h,i)=><rect key={i} x={160+i*12} y={y-(h?18:0)} width={11} height={h?18:10}
      rx={1} fill={col} opacity={0.7}/>)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',maxWidth:W,display:'block'}}>
      <rect x={20} y={30} width={110} height={100} rx={8} fill="#bc8cff22" stroke="#bc8cff" strokeWidth={1.5}/>
      <text x={75} y={78} textAnchor="middle" fontSize={11} fontWeight={700} fill="#bc8cff">Master</text>
      <text x={75} y={94} textAnchor="middle" fontSize={9} fill="var(--text-muted)">RPi / SoC</text>
      <rect x={420} y={30} width={100} height={100} rx={8} fill="#58a6ff22" stroke="#58a6ff" strokeWidth={1.5}/>
      <text x={470} y={78} textAnchor="middle" fontSize={11} fontWeight={700} fill="#58a6ff">DAC/ADC</text>
      <text x={470} y={94} textAnchor="middle" fontSize={9} fill="var(--text-muted)">PCM5102/INMP441</text>
      {lines.map((l,i)=>(
        <g key={i}>
          <line x1={130} y1={l.y} x2={420} y2={l.y} stroke={l.col} strokeWidth={1.5}/>
          <text x={125} y={l.y+4} textAnchor="end" fontSize={9} fill={l.col}>{l.lbl}</text>
          {wave(l.y,[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0].slice(0,i===1?4:20),l.col)}
        </g>
      ))}
      <text x={270} y={150} textAnchor="middle" fontSize={9} fill="var(--text-muted)">
        BCLK = 采样率×位深×声道 (44100×32×2 = 2.82MHz)
      </text>
    </svg>
  )
}

function UsbDiagram() {
  const W=540,H=160
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',maxWidth:W,display:'block'}}>
      <rect x={20} y={50} width={110} height={70} rx={8} fill="#58a6ff22" stroke="#58a6ff" strokeWidth={1.5}/>
      <text x={75} y={83} textAnchor="middle" fontSize={11} fontWeight={700} fill="#58a6ff">Host</text>
      <text x={75} y={100} textAnchor="middle" fontSize={9} fill="var(--text-muted)">PC / RPi</text>
      <rect x={230} y={40} width={80} height={90} rx={6} fill="#3fb95022" stroke="#3fb950" strokeWidth={1.5}/>
      <text x={270} y={83} textAnchor="middle" fontSize={10} fontWeight={700} fill="#3fb950">USB Hub</text>
      <text x={270} y={100} textAnchor="middle" fontSize={8} fill="var(--text-muted)">最多7层级联</text>
      {[['U盘\nBulk','#ffa657',390],['键鼠\nInterrupt','#e3b341',440],['摄像头\nIso','#d2a8ff',490]].map(([lbl,col,x]:any,i)=>(
        <g key={i}>
          <rect x={x-28} y={50} width={56} height={50} rx={5} fill={`${col}22`} stroke={col} strokeWidth={1.5}/>
          <text x={x} y={75} textAnchor="middle" fontSize={8} fontWeight={700} fill={col}>{lbl.split('\n')[0]}</text>
          <text x={x} y={90} textAnchor="middle" fontSize={7} fill="var(--text-muted)">{lbl.split('\n')[1]}</text>
          <line x1={x} y1={50} x2={x>420?310:270} y2={130} stroke={col} strokeWidth={1.2}/>
        </g>
      ))}
      <line x1={130} y1={85} x2={230} y2={85} stroke="#58a6ff" strokeWidth={2}/>
      <text x={270} y={148} textAnchor="middle" fontSize={9} fill="var(--text-muted)">Control(EP0配置) Bulk(大数据) Interrupt(低延迟) Iso(恒带宽)</text>
    </svg>
  )
}

function ModbusTcpDiagram() {
  const W=540,H=155
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',maxWidth:W,display:'block'}}>
      {/* SCADA */}
      <rect x={20} y={40} width={110} height={60} rx={8} fill="#39d35322" stroke="#39d353" strokeWidth={1.5}/>
      <text x={75} y={68} textAnchor="middle" fontSize={11} fontWeight={700} fill="#39d353">SCADA</text>
      <text x={75} y={84} textAnchor="middle" fontSize={9} fill="var(--text-muted)">Modbus TCP</text>
      {/* Switch */}
      <rect x={200} y={55} width={140} height={40} rx={6} fill="#58a6ff22" stroke="#58a6ff" strokeWidth={1.5}/>
      <text x={270} y={80} textAnchor="middle" fontSize={10} fontWeight={700} fill="#58a6ff">以太网交换机</text>
      <line x1={130} y1={70} x2={200} y2={75} stroke="#39d353" strokeWidth={1.5}/>
      <text x={165} y={65} textAnchor="middle" fontSize={8} fill="#e3b341">TCP:502</text>
      {/* PLCs */}
      {[['PLC #1\n192.168.1.10','#ffa657',370],['PLC #2\n192.168.1.11','#d2a8ff',460]].map(([lbl,col,x]:any,i)=>(
        <g key={i}>
          <rect x={x-40} y={40} width={80} height={60} rx={6} fill={`${col}22`} stroke={col} strokeWidth={1.5}/>
          <text x={x} y={68} textAnchor="middle" fontSize={9} fontWeight={700} fill={col}>{lbl.split('\n')[0]}</text>
          <text x={x} y={84} textAnchor="middle" fontSize={8} fill="var(--text-muted)">{lbl.split('\n')[1]}</text>
          <line x1={x-40} y1={70} x2={340} y2={75} stroke={col} strokeWidth={1.2}/>
        </g>
      ))}
      {/* Frame */}
      <text x={270} y={125} textAnchor="middle" fontSize={9} fill="var(--text-muted)">MBAP帧: [TxID 2B][Proto=0 2B][Len 2B][UnitID 1B][FC 1B][数据...]</text>
      <text x={270} y={140} textAnchor="middle" fontSize={9} fill="var(--text-muted)">RTU vs TCP: 去掉CRC+帧间隔, 加MBAP头, 支持多连接并发</text>
    </svg>
  )
}

function CurrentLoopDiagram() {
  const W=540,H=155
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',maxWidth:W,display:'block'}}>
      {/* Power supply */}
      <rect x={20} y={55} width={80} height={55} rx={6} fill="#ffa65722" stroke="#ffa657" strokeWidth={1.5}/>
      <text x={60} y={82} textAnchor="middle" fontSize={10} fontWeight={700} fill="#ffa657">24V DC</text>
      <text x={60} y={98} textAnchor="middle" fontSize={8} fill="var(--text-muted)">电源</text>
      {/* Loop */}
      <line x1={100} y1={62} x2={200} y2={62} stroke="#f85149" strokeWidth={2}/>
      <text x={150} y={57} textAnchor="middle" fontSize={8} fill="#f85149">+24V</text>
      {/* Sensor */}
      <rect x={200} y={45} width={100} height={55} rx={6} fill="#e3b34122" stroke="#e3b341" strokeWidth={1.5}/>
      <text x={250} y={72} textAnchor="middle" fontSize={10} fontWeight={700} fill="#e3b341">传感器</text>
      <text x={250} y={87} textAnchor="middle" fontSize={8} fill="var(--text-muted)">4-20mA 两线制</text>
      {/* Loop back */}
      <line x1={300} y1={62} x2={390} y2={62} stroke="#58a6ff" strokeWidth={2}/>
      {/* Sense resistor */}
      <rect x={390} y={50} width={40} height={22} rx={3} fill="#3fb95033" stroke="#3fb950" strokeWidth={1.5}/>
      <text x={410} y={64} textAnchor="middle" fontSize={8} fill="#3fb950">250Ω</text>
      <text x={410} y={84} textAnchor="middle" fontSize={7} fill="var(--text-muted)">采样电阻</text>
      {/* ADC */}
      <rect x={440} y={45} width={80} height={55} rx={6} fill="#58a6ff22" stroke="#58a6ff" strokeWidth={1.5}/>
      <text x={480} y={72} textAnchor="middle" fontSize={10} fontWeight={700} fill="#58a6ff">ADC</text>
      <text x={480} y={87} textAnchor="middle" fontSize={8} fill="var(--text-muted)">PLC/RPi</text>
      <line x1={430} y1={62} x2={440} y2={62} stroke="#3fb950" strokeWidth={2}/>
      {/* GND */}
      <line x1={480} y1={100} x2={480} y2={118} stroke="#8b949e" strokeWidth={1.5}/>
      <line x1={60} y1={110} x2={60} y2={118} stroke="#8b949e" strokeWidth={1.5}/>
      <line x1={60} y1={118} x2={480} y2={118} stroke="#8b949e" strokeWidth={2}/>
      <text x={270} y={135} textAnchor="middle" fontSize={9} fill="var(--text-muted)">4mA=0% 20mA=100% 0mA=断线 V=I×250Ω: 1V=4mA, 5V=20mA</text>
    </svg>
  )
}

function LinDiagram() {
  const W=540,H=155
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',maxWidth:W,display:'block'}}>
      <line x1={40} y1={80} x2={500} y2={80} stroke="#74c0fc" strokeWidth={2.5}/>
      <text x={20} y={84} textAnchor="end" fontSize={10} fontWeight={700} fill="#74c0fc">LIN</text>
      <rect x={30} y={95} width={100} height={45} rx={6} fill="#4d8fff22" stroke="#4d8fff" strokeWidth={1.5}/>
      <text x={80} y={118} textAnchor="middle" fontSize={10} fontWeight={700} fill="#4d8fff">Master</text>
      <text x={80} y={132} textAnchor="middle" fontSize={8} fill="var(--text-muted)">BCM车身控制器</text>
      <line x1={80} y1={95} x2={80} y2={80} stroke="#74c0fc" strokeWidth={1.5}/>
      {[['车门\n模块','#74c0fc',190],['座椅\n控制','#a5d8ff',310],['天窗\n电机','#74c0fc',420]].map(([lbl,col,x]:any,i)=>(
        <g key={i}>
          <rect x={x-40} y={95} width={80} height={45} rx={5} fill={`${col}22`} stroke={col} strokeWidth={1.5}/>
          <text x={x} y={117} textAnchor="middle" fontSize={9} fontWeight={700} fill={col}>{lbl.split('\n')[0]}</text>
          <text x={x} y={131} textAnchor="middle" fontSize={8} fill="var(--text-muted)">{lbl.split('\n')[1]}</text>
          <line x1={x} y1={95} x2={x} y2={80} stroke={col} strokeWidth={1.5}/>
        </g>
      ))}
      <line x1={40} y1={55} x2={500} y2={55} stroke="#f85149" strokeWidth={1.5}/>
      <text x={20} y={59} textAnchor="end" fontSize={9} fill="#f85149">12V</text>
      <text x={20} y={110} textAnchor="end" fontSize={9} fill="#8b949e">GND</text>
      <text x={270} y={148} textAnchor="middle" fontSize={9} fill="var(--text-muted)">主机主动发帧头(Break+Sync+PID)，对应从机自动响应，最高20kbps</text>
    </svg>
  )
}

function BluetoothDiagram() {
  const W=540,H=155
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',maxWidth:W,display:'block'}}>
      {/* BLE stack */}
      {[['APP / GATT Profile','#4285F4',20,30],['ATT Protocol','#74b5ff',20,55],
        ['L2CAP','#a5d8ff',20,80],['HCI','#4285F4',20,105],['LL (Link Layer)','#4285F4',20,130]].map(([lbl,col,x,y]:any,i)=>(
        <g key={i}>
          <rect x={x+10} y={y} width={160} height={22} rx={3} fill={`${col}22`} stroke={col} strokeWidth={1}/>
          <text x={x+90} y={y+14} textAnchor="middle" fontSize={9} fill={col}>{lbl}</text>
        </g>
      ))}
      <text x={100} y={22} textAnchor="middle" fontSize={10} fontWeight={700} fill="#4285F4">BLE 协议栈</text>
      {/* RF */}
      <rect x={200} y={100} width={130} height={40} rx={6} fill="#4285F422" stroke="#4285F4" strokeWidth={1.5}/>
      <text x={265} y={124} textAnchor="middle" fontSize={10} fill="#4285F4">2.4GHz RF</text>
      <text x={265} y={137} textAnchor="middle" fontSize={8} fill="var(--text-muted)">40信道 跳频</text>
      {/* Devices */}
      {[['心率带\nHRP','#f85149',370],['手机\nBLE','#3fb950',460]].map(([lbl,col,x]:any,i)=>(
        <g key={i}>
          <rect x={x-35} y={55} width={70} height={60} rx={6} fill={`${col}22`} stroke={col} strokeWidth={1.5}/>
          <text x={x} y={85} textAnchor="middle" fontSize={9} fontWeight={700} fill={col}>{lbl.split('\n')[0]}</text>
          <text x={x} y={100} textAnchor="middle" fontSize={8} fill="var(--text-muted)">{lbl.split('\n')[1]}</text>
          <line x1={x-35} y1={115} x2={330} y2={120} stroke={col} strokeWidth={1.2} strokeDasharray="4 3"/>
        </g>
      ))}
      <text x={350} y={148} textAnchor="middle" fontSize={9} fill="var(--text-muted)">广播(ADV)→扫描(SCAN)→连接(CONNECT)→GATT读写</text>
    </svg>
  )
}

function WifiDiagram() {
  const W=540,H=155
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',maxWidth:W,display:'block'}}>
      {/* Stack */}
      {[['应用层 (TCP/UDP Socket)','#a5d8ff',55],['802.11 MAC','#58a6ff',80],['802.11 PHY (OFDM)','#4d8fff',105]].map(([lbl,col,y]:any,i)=>(
        <g key={i}>
          <rect x={20} y={y} width={170} height={22} rx={3} fill={`${col}22`} stroke={col} strokeWidth={1}/>
          <text x={105} y={y+14} textAnchor="middle" fontSize={9} fill={col}>{lbl}</text>
        </g>
      ))}
      <text x={105} y={48} textAnchor="middle" fontSize={10} fontWeight={700} fill="#58a6ff">WiFi 协议栈</text>
      {/* AP */}
      <rect x={220} y={60} width={120} height={60} rx={8} fill="#3fb95022" stroke="#3fb950" strokeWidth={1.5}/>
      <text x={280} y={88} textAnchor="middle" fontSize={11} fontWeight={700} fill="#3fb950">AP/路由器</text>
      <text x={280} y={104} textAnchor="middle" fontSize={9} fill="var(--text-muted)">2.4/5GHz</text>
      <line x1={190} y1={90} x2={220} y2={90} stroke="#a5d8ff" strokeWidth={1.5} strokeDasharray="5 3"/>
      {/* Clients */}
      {[['手机\n802.11ac','#ffa657',390],['IoT\n802.11n','#e3b341',475]].map(([lbl,col,x]:any,i)=>(
        <g key={i}>
          <rect x={x-32} y={60} width={64} height={60} rx={5} fill={`${col}22`} stroke={col} strokeWidth={1.5}/>
          <text x={x} y={88} textAnchor="middle" fontSize={9} fontWeight={700} fill={col}>{lbl.split('\n')[0]}</text>
          <text x={x} y={103} textAnchor="middle" fontSize={8} fill="var(--text-muted)">{lbl.split('\n')[1]}</text>
          <line x1={x-32} y1={90} x2={340} y2={90} stroke={col} strokeWidth={1.2} strokeDasharray="4 3"/>
        </g>
      ))}
      <text x={270} y={140} textAnchor="middle" fontSize={9} fill="var(--text-muted)">CSMA/CA 载波监听多路访问/碰撞避免，OFDM多子载波调制</text>
    </svg>
  )
}

function LoraDiagram() {
  const W=540,H=155
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',maxWidth:W,display:'block'}}>
      {/* Node */}
      <rect x={20} y={55} width={90} height={65} rx={8} fill="#cc5de822" stroke="#cc5de8" strokeWidth={1.5}/>
      <text x={65} y={82} textAnchor="middle" fontSize={10} fontWeight={700} fill="#cc5de8">LoRa节点</text>
      <text x={65} y={97} textAnchor="middle" fontSize={8} fill="var(--text-muted)">SX1276+MCU</text>
      <text x={65} y={112} textAnchor="middle" fontSize={8} fill="var(--text-muted)">电池供电</text>
      {/* Gateway */}
      <rect x={200} y={45} width={110} height={75} rx={8} fill="#58a6ff22" stroke="#58a6ff" strokeWidth={1.5}/>
      <text x={255} y={82} textAnchor="middle" fontSize={10} fontWeight={700} fill="#58a6ff">LoRaWAN</text>
      <text x={255} y={97} textAnchor="middle" fontSize={9} fill="var(--text-muted)">网关</text>
      <text x={255} y={112} textAnchor="middle" fontSize={8} fill="var(--text-muted)">RPi+RAK831</text>
      {/* Arrow with range */}
      <line x1={110} y1={88} x2={200} y2={88} stroke="#cc5de8" strokeWidth={1.5} strokeDasharray="6 4"/>
      <text x={155} y={78} textAnchor="middle" fontSize={8} fill="#cc5de8">5-15km</text>
      <text x={155} y={90} textAnchor="middle" fontSize={8} fill="#cc5de8">LoRa RF</text>
      {/* NS + Server */}
      <rect x={360} y={50} width={80} height={35} rx={5} fill="#3fb95022" stroke="#3fb950" strokeWidth={1.5}/>
      <text x={400} y={72} textAnchor="middle" fontSize={9} fontWeight={700} fill="#3fb950">LoRa NS</text>
      <rect x={360} y={95} width={80} height={35} rx={5} fill="#ffa65722" stroke="#ffa657" strokeWidth={1.5}/>
      <text x={400} y={117} textAnchor="middle" fontSize={9} fontWeight={700} fill="#ffa657">应用服务器</text>
      <line x1={310} y1={83} x2={360} y2={67} stroke="#3fb950" strokeWidth={1.5}/>
      <text x={335} y={70} textAnchor="middle" fontSize={8} fill="var(--text-muted)">IP</text>
      <line x1={400} y1={85} x2={400} y2={95} stroke="#ffa657" strokeWidth={1.5}/>
      <text x={270} y={148} textAnchor="middle" fontSize={9} fill="var(--text-muted)">SF7=快/近 ↔ SF12=慢/远，ADR自适应速率，Class A省电最佳</text>
    </svg>
  )
}

function Esp32Diagram() {
  const W=540,H=170
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',maxWidth:W,display:'block'}}>
      {/* Module outline */}
      <rect x={170} y={20} width={200} height={130} rx={8} fill="#3fb95015" stroke="#3fb950" strokeWidth={2}/>
      <text x={270} y={43} textAnchor="middle" fontSize={11} fontWeight={800} fill="#3fb950">ESP32-WROOM-32</text>
      {/* Chip */}
      <rect x={205} y={55} width={130} height={80} rx={4} fill="#1a2a1a" stroke="#3fb950" strokeWidth={1}/>
      <text x={270} y={92} textAnchor="middle" fontSize={9} fontWeight={700} fill="#3fb950">ESP32</text>
      <text x={270} y={106} textAnchor="middle" fontSize={8} fill="var(--text-muted)">240MHz Dual-Core</text>
      <text x={270} y={120} textAnchor="middle" fontSize={7} fill="var(--text-muted)">WiFi + BLE 4.2/5.0</text>
      {/* Antenna */}
      <rect x={340} y={25} width={22} height={70} rx={2} fill="#3fb95030" stroke="#3fb950" strokeWidth={1} strokeDasharray="3 2"/>
      <text x={351} y={66} textAnchor="middle" fontSize={8} fill="#3fb950" transform="rotate(-90 351 66)">PCB ANT</text>
      {/* Left pins */}
      {[['3V3','#f85149',30],['GND','#8b949e',46],['GPIO34\nIN','#ffa657',62],['GPIO35\nIN','#ffa657',78],
        ['GPIO0\nBOOT','#e3b341',94],['GPIO2\nLED','#3fb950',110],['GPIO4','#74c0fc',126]].map(([lbl,col,y]:any,i)=>(
        <g key={i}>
          <line x1={155} y1={y} x2={170} y2={y} stroke={col} strokeWidth={1.5}/>
          <text x={150} y={y+4} textAnchor="end" fontSize={8} fill={col}>{lbl.split('\n')[0]}</text>
          {lbl.includes('\n') && <text x={150} y={y+13} textAnchor="end" fontSize={7} fill="var(--text-muted)">{lbl.split('\n')[1]}</text>}
          <circle cx={155} cy={y} r={2} fill={col}/>
        </g>
      ))}
      {/* Right pins */}
      {[['GPIO1\nTXD0','#58a6ff',30],['GPIO3\nRXD0','#3fb950',46],['GPIO21\nSDA','#d2a8ff',62],
        ['GPIO22\nSCL','#74c0fc',78],['GPIO18\nSCK','#ffa657',94],['GPIO23\nMOSI','#ffa657',110],['GND','#8b949e',126]].map(([lbl,col,y]:any,i)=>(
        <g key={i}>
          <line x1={370} y1={y} x2={390} y2={y} stroke={col} strokeWidth={1.5}/>
          <text x={395} y={y+4} textAnchor="start" fontSize={8} fill={col}>{lbl.split('\n')[0]}</text>
          {lbl.includes('\n') && <text x={395} y={y+13} textAnchor="start" fontSize={7} fill="var(--text-muted)">{lbl.split('\n')[1]}</text>}
          <circle cx={390} cy={y} r={2} fill={col}/>
        </g>
      ))}
      <text x={270} y={160} textAnchor="middle" fontSize={9} fill="var(--text-muted)">GPIO0低=下载模式 | USB-TTL(CH340)接TXD0/RXD0烧录 | 3.3V供电（最大600mA）</text>
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
  pwm:       PwmDiagram,
  onewire:   OneWireDiagram,
  i2s:       I2sDiagram,
  usb:       UsbDiagram,
  modbus_tcp: ModbusTcpDiagram,
  current_loop: CurrentLoopDiagram,
  lin:       LinDiagram,
  bluetooth: BluetoothDiagram,
  wifi:      WifiDiagram,
  lora:      LoraDiagram,
  esp32:     Esp32Diagram,
}

// ─── Main view ────────────────────────────────────────────────────────────────

export default function HardwareView() {
  const [sel, setSel] = useState('rs232')
  const { lang } = useLang()
  const p = PROTOCOLS.find(x => x.id === sel)!
  const enTrans = EN[p.id]
  const DiagramComp = DIAGRAMS[p.diagram] as () => React.ReactElement

  const isEn = lang === 'en'
  const isMobile = useMobile()

  const catLabel: Record<string, string> = isEn
    ? { serial: 'Serial Bus', field: 'Fieldbus / Ethernet', soc: 'SoC / SBC Interfaces', wireless: 'Wireless' }
    : { serial: '串行总线', field: '现场总线/以太网', soc: 'SoC/单板机接口', wireless: '无线' }
  const cats = ['serial', 'soc', 'field', 'wireless'] as const

  const displayShortDesc = isEn && enTrans ? enTrans.shortDesc : p.shortDesc
  const displaySpecs     = isEn && enTrans ? enTrans.specs     : p.specs
  const displayNotes     = isEn && enTrans ? enTrans.notes     : p.notes

  return (
    <div style={{display:'flex', flexDirection: isMobile ? 'column' : 'row', height:'100%', overflow:'hidden'}}>
      {/* Sidebar */}
      <div style={{
        width: isMobile ? '100%' : 180, flexShrink:0,
        borderRight: isMobile ? 'none' : '1px solid var(--border)',
        borderBottom: isMobile ? '1px solid var(--border)' : 'none',
        background:'var(--bg-secondary)',
        overflowX: isMobile ? 'auto' : undefined,
        overflowY: isMobile ? 'hidden' : 'auto',
        maxHeight: isMobile ? 56 : undefined,
        display: isMobile ? 'flex' : 'block',
        scrollbarWidth: 'none',
      }}>
        {!isMobile && <div style={{padding:'10px 14px', borderBottom:'1px solid var(--border)',
          background:'var(--bg-elevated)'}}>
          <div style={{fontSize:13, fontWeight:800, color:'var(--text-primary)'}}>
            🔌 {isEn ? 'Hardware I/O' : '通信接口'}
          </div>
          <div style={{fontSize:10, color:'var(--text-muted)', marginTop:2}}>Hardware Interfaces</div>
        </div>}
        {cats.map(cat => (
          <div key={cat} style={{display: isMobile ? 'contents' : 'block'}}>
            {!isMobile && <div style={{padding:'6px 14px 3px', fontSize:10, fontWeight:700,
              color:'var(--text-muted)', letterSpacing:0.8, marginTop:4}}>
              {catLabel[cat].toUpperCase()}
            </div>}
            {PROTOCOLS.filter(x => x.category === cat).map(pro => (
              <button key={pro.id} onClick={() => setSel(pro.id)}
                style={{display:'flex', alignItems:'center', gap:6, flexShrink: 0,
                  width: isMobile ? 'auto' : '100%',
                  padding: isMobile ? '6px 10px' : '8px 14px', border:'none',
                  borderLeft: isMobile ? 'none' : (sel===pro.id ? `3px solid ${pro.color}` : '3px solid transparent'),
                  borderBottom: isMobile ? (sel===pro.id ? `2px solid ${pro.color}` : '2px solid transparent') : 'none',
                  background: sel===pro.id ? 'var(--bg-elevated)' : 'transparent',
                  color: sel===pro.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor:'pointer', fontSize:11, fontWeight: sel===pro.id ? 700 : 400,
                  textAlign:'left', whiteSpace: 'nowrap'}}>
                <span style={{fontSize:14}}>{pro.icon}</span>
                {!isMobile && <span>{pro.name}</span>}
                {isMobile && <span style={{fontSize:10}}>{pro.name}</span>}
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
            <div style={{fontSize:12, color:'var(--text-secondary)', marginTop:2}}>{displayShortDesc}</div>
          </div>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14}}>
          {/* Specs */}
          <div style={{background:'var(--bg-secondary)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden'}}>
            <div style={{padding:'7px 14px', borderBottom:'1px solid var(--border)',
              fontSize:11, fontWeight:700, color:'var(--text-muted)'}}>
              {isEn ? 'Specifications' : '技术规格'}
            </div>
            {displaySpecs.map(s => (
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
              fontSize:11, fontWeight:700, color:'var(--text-muted)'}}>
              {isEn ? 'Pinout' : '引脚定义'}
            </div>
            {p.pinout.map((pin, i) => (
              <div key={pin.pin} style={{display:'flex', alignItems:'center', gap:8,
                padding:'5px 14px', borderBottom:'1px solid var(--border)'}}>
                <code style={{color:pin.color, fontSize:11, fontWeight:700, minWidth:52, flexShrink:0}}>{pin.pin}</code>
                <span style={{color:p.color, fontSize:11, fontWeight:600, minWidth:44, flexShrink:0}}>{pin.signal}</span>
                <span style={{color:'var(--text-muted)', fontSize:12}}>{pin.dir}</span>
                <span style={{color:'var(--text-secondary)', fontSize:10}}>
                  {isEn && enTrans ? (enTrans.pinout[i] ?? pin.desc) : pin.desc}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Wiring Diagram */}
        <div style={{background:'var(--bg-secondary)', border:'1px solid var(--border)',
          borderRadius:10, overflow:'hidden', marginBottom:14}}>
          <div style={{padding:'7px 14px', borderBottom:'1px solid var(--border)',
            fontSize:11, fontWeight:700, color:'var(--text-muted)'}}>
            {isEn ? 'Wiring Diagram' : '接线图 / 拓扑'}
          </div>
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
          {displayNotes}
        </div>
      </div>
    </div>
  )
}
