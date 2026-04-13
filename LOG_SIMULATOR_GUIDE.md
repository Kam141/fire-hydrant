# Log Simulator - Hadoop Cluster Integration

## 📋 Overview

The Log Simulator is a dedicated page that allows you to simulate sending sensor logs to your Hadoop cluster. Instead of relying on actual sensor data, you can manually create and submit log entries with custom sensor readings.

## 🚀 Getting Started

### 1. Configure Environment Variables

Update your `.env.local` file with your Hadoop cluster details. The file should look like this:

```bash
# Copy from .env.example and update with your actual cluster IPs
HADOOP_MODE=webhdfs

# Hadoop Cluster Configuration (1 NameNode + 3 DataNodes)
HADOOP_NAMENODE_IP=192.168.1.100
HADOOP_DATANODE1_IP=192.168.1.101
HADOOP_DATANODE2_IP=192.168.1.102
HADOOP_DATANODE3_IP=192.168.1.103
HADOOP_NAMENODE_PORT=9870
HADOOP_DATANODE_PORT=9870

# Remote log path on HDFS
HADOOP_LOG_PATH=/fire-hydrant/sensor-log.jsonl
```

### 2. Access the Log Simulator Page

Navigate to: `http://localhost:3000/log-simulator`

## 📝 Form Fields

### Timestamp Section

- **Timestamp**: Automatically set to current date/time, but can be adjusted

### Sensor Data Section

- **Suhu (°C)**: Temperature (0-100°C)
- **Deteksi Api (%)**: Fire detection percentage (0-100%)
- **Tekanan (bar)**: Water pressure (0-10 bar)
- **Laju Alir (LPM)**: Flow rate in liters per minute (0-500 LPM)
- **Level Air (%)**: Water level percentage (0-100%)

### System Status Section

- **Valve Terbuka**: Checkbox to indicate if valve is open
- **Mode Kontrol**: Select between AUTO or MANUAL control mode
- **Level Alert**: Select alert level from:
  - NORMAL 🟢 (green)
  - POTENSI_KEBAKARAN 🟡 (yellow)
  - KEBAKARAN 🔴 (red)

## 🎯 Features

### Manual Input

- Use sliders for easier value adjustments
- Input fields for precise value entry
- Real-time value feedback

### Random Data Generator

- Click "Isi Nilai Random" button to generate realistic random sensor data
- Helps with testing the system's data handling

### Submit Logs

- Click "Kirim Log ke Hadoop" to send the log entry
- Logs are sent to your Hadoop cluster via WebHDFS API
- Logs are stored at the path specified in `HADOOP_LOG_PATH`

## 🔧 Environment Variables Reference

| Variable               | Required                   | Default                          | Description                                    |
| ---------------------- | -------------------------- | -------------------------------- | ---------------------------------------------- |
| `HADOOP_MODE`          | Yes                        | `local`                          | Set to `webhdfs` to use Hadoop cluster         |
| `HADOOP_NAMENODE_IP`   | When `HADOOP_MODE=webhdfs` | -                                | IP address of your NameNode                    |
| `HADOOP_DATANODE1_IP`  | No                         | -                                | IP address of DataNode 1                       |
| `HADOOP_DATANODE2_IP`  | No                         | -                                | IP address of DataNode 2                       |
| `HADOOP_DATANODE3_IP`  | No                         | -                                | IP address of DataNode 3                       |
| `HADOOP_NAMENODE_PORT` | No                         | `9870`                           | Port for NameNode WebHDFS                      |
| `HADOOP_DATANODE_PORT` | No                         | `9870`                           | Port for DataNodes WebHDFS                     |
| `HADOOP_LOG_PATH`      | No                         | `/fire-hydrant/sensor-log.jsonl` | Remote HDFS path for logs                      |
| `HADOOP_WEBHDFS_URL`   | No                         | -                                | Direct WebHDFS URL (overrides IP-based config) |

## ⚙️ Hadoop Cluster Setup

### Prerequisites

- Hadoop cluster with 1 NameNode and 3 DataNodes running
- WebHDFS enabled on your Hadoop cluster
- Network connectivity between your application and Hadoop nodes

### Example Cluster Architecture

```
NameNode (192.168.1.100:9870)
├── DataNode 1 (192.168.1.101)
├── DataNode 2 (192.168.1.102)
└── DataNode 3 (192.168.1.103)
```

### Enable WebHDFS

Add to your `hdfs-site.xml`:

```xml
<property>
  <name>dfs.webhdfs.enabled</name>
  <value>true</value>
</property>
```

## 📊 Log Entry Format

When you submit a log, it's saved in JSONL (JSON Lines) format on HDFS:

```json
{
  "timestamp": "2024-04-13T10:30:45.123Z",
  "temperatureC": 28.5,
  "firePercent": 15.2,
  "pressureBar": 2.3,
  "flowRateLpm": 45.0,
  "waterLevelPercent": 85.0,
  "valveOpen": true,
  "controlMode": "AUTO",
  "alertLevel": "NORMAL"
}
```

Each line in the file is a separate log entry.

## 🔄 Fallback Behavior

If your application cannot connect to the Hadoop cluster, logs are automatically saved to the local fallback file:

```
./logs/hadoop-sensor-log.jsonl
```

This ensures data is never lost, even if the cluster is temporarily unavailable.

## 📡 API Integration

The simulator uses the `/api/logs` endpoint:

### POST Request Example

```bash
curl -X POST http://localhost:3000/api/logs \
  -H "Content-Type: application/json" \
  -d '{
    "log": {
      "timestamp": "2024-04-13T10:30:45.123Z",
      "temperatureC": 28.5,
      "firePercent": 15.2,
      "pressureBar": 2.3,
      "flowRateLpm": 45.0,
      "waterLevelPercent": 85.0,
      "valveOpen": true,
      "controlMode": "AUTO",
      "alertLevel": "NORMAL"
    }
  }'
```

### Response

```json
{
  "ok": true,
  "message": "Log berhasil dikirim ke cluster Hadoop",
  "data": {
    "timestamp": "2024-04-13T10:30:45.123Z",
    ...
  }
}
```

## ❌ Troubleshooting

### "Failed to resolve hostname" Error

- **Solution**: Replace hostname references with IP addresses in `.env.local`
- Make sure `HADOOP_NAMENODE_IP` is set correctly
- Verify network connectivity between your app and Hadoop cluster

### Logs Not Appearing in Hadoop

- Check if `HADOOP_MODE` is set to `webhdfs`
- Verify NameNode is running and WebHDFS is enabled
- Check the `HADOOP_LOG_PATH` directory exists on HDFS
- Review server logs for detailed error messages

### Wrong Data Type in Input

- Each field has validation (temperature 0-100°C, pressure 0-10 bar, etc.)
- The form will show an error if values are out of range
- Use sliders for quick value adjustments

## 🎓 Testing Workflow

1. **Test Local Mode** (Before cluster setup)
   - Set `HADOOP_MODE=local`
   - Submit logs
   - Check `./logs/hadoop-sensor-log.jsonl`

2. **Test WebHDFS Connection**
   - Set `HADOOP_MODE=webhdfs`
   - Add correct `HADOOP_NAMENODE_IP`
   - Try to submit a simple log entry

3. **Full Integration Testing**
   - Submit various test scenarios
   - Verify logs appear in HDFS
   - Test fallback when cluster is unavailable
   - Monitor system logs for errors

## 📝 Notes

- Timestamps are in ISO 8601 format (UTC)
- All numeric values are stored as floats for precision
- Logs are append-only (new entries don't overwrite old ones)
- The simulator runs entirely in the browser (client-side form) with server-side submission
