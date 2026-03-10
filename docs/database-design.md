# 血压记录管理系统 - 数据库设计文档

## 1. 数据库概述

本系统采用本地存储（LocalStorage）作为主要数据存储方案，适合单用户使用的Web应用场景。数据以JSON格式存储在浏览器本地，支持数据导入导出功能。

## 2. 数据模型

### 2.1 血压记录表 (blood_pressure_records)

| 字段名 | 数据类型 | 必填 | 约束 | 说明 |
|--------|----------|------|------|------|
| id | String | 是 | 唯一 | 记录唯一标识符，由时间戳+随机字符串生成 |
| timestamp | DateTime | 是 | | 记录时间戳，精确到分钟，系统自动生成 |
| recordType | String | 是 | morning/evening | 记录类型：早晨(morning)或晚上(evening) |
| systolic | Number | 是 | 90-180 | 收缩压，单位mmHg |
| diastolic | Number | 是 | 60-120 | 舒张压，单位mmHg |
| heartRate | Number | 是 | 40-160 | 心率，单位bpm |
| notes | String | 否 | 最大200字符 | 备注信息 |

### 2.2 系统配置表 (system_config)

| 字段名 | 数据类型 | 说明 |
|--------|----------|------|
| last_backup_date | DateTime | 上次备份时间 |
| user_preferences | JSON | 用户偏好设置 |

## 3. ER图

```
┌─────────────────────────────────────────────────────────────┐
│                    血压记录 (blood_pressure_records)        │
├─────────────────────────────────────────────────────────────┤
│  PK  id              : String (唯一标识)                    │
│      timestamp       : DateTime (记录时间)                  │
│      recordType      : String (记录类型)                    │
│      systolic        : Number (收缩压)                       │
│      diastolic       : Number (舒张压)                       │
│      heartRate       : Number (心率)                         │
│      notes           : String (备注)                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    系统配置 (system_config)                  │
├─────────────────────────────────────────────────────────────┤
│      key             : String (配置键)                      │
│      value           : String/JSON (配置值)                  │
└─────────────────────────────────────────────────────────────┘
```

## 4. 数据完整性约束

### 4.1 数值范围约束

| 字段 | 最小值 | 最大值 | 说明 |
|------|--------|--------|------|
| systolic | 90 | 180 | 收缩压正常范围 |
| diastolic | 60 | 120 | 舒张压正常范围 |
| heartRate | 40 | 160 | 心率正常范围 |

### 4.2 必填字段

- id: 系统自动生成，不可为空
- timestamp: 系统自动生成，精确到分钟
- recordType: 必选，从早晨/晚上中选择
- systolic: 必填，90-180之间的整数
- diastolic: 必填，60-120之间的整数
- heartRate: 必填，40-160之间的整数

### 4.3 可选字段

- notes: 最大200字符的文本，可留空

## 5. 数据存储方案

### 5.1 本地存储 (LocalStorage)

- 存储键值: `blood_pressure_records`
- 存储格式: JSON字符串
- 存储容量: 约5-10MB（取决于浏览器）

### 5.2 数据备份

- 备份提醒周期: 30天
- 导出格式支持: JSON、CSV
- 导入格式支持: JSON、CSV

## 6. API设计

### 6.1 数据操作接口

```javascript
// 创建记录
function createRecord(recordData) {
    const record = {
        id: generateId(),
        timestamp: new Date(),
        ...recordData
    };
    records.push(record);
    saveToStorage();
    return record;
}

// 读取记录
function getRecords(filters) {
    let result = [...records];
    if (filters.startDate) {
        result = result.filter(r => r.timestamp >= filters.startDate);
    }
    if (filters.endDate) {
        result = result.filter(r => r.timestamp <= filters.endDate);
    }
    if (filters.recordType) {
        result = result.filter(r => r.recordType === filters.recordType);
    }
    return result;
}

// 更新记录
function updateRecord(id, updates) {
    const index = records.findIndex(r => r.id === id);
    if (index !== -1) {
        records[index] = { ...records[index], ...updates };
        saveToStorage();
        return records[index];
    }
    return null;
}

// 删除记录
function deleteRecord(id) {
    const index = records.findIndex(r => r.id === id);
    if (index !== -1) {
        records.splice(index, 1);
        saveToStorage();
        return true;
    }
    return false;
}
```

### 6.2 统计计算接口

```javascript
// 计算统计数据
function calculateStatistics(records) {
    if (records.length === 0) return null;
    
    const systolicValues = records.map(r => r.systolic);
    const diastolicValues = records.map(r => r.diastolic);
    const heartRateValues = records.map(r => r.heartRate);
    
    return {
        systolic: average(systolicValues),
        systolicMax: Math.max(...systolicValues),
        systolicMin: Math.min(...systolicValues),
        diastolic: average(diastolicValues),
        diastolicMax: Math.max(...diastolicValues),
        diastolicMin: Math.min(...diastolicValues),
        heartRate: average(heartRateValues),
        count: records.length
    };
}
```

## 7. 数据安全

### 7.1 数据隐私

- 所有数据存储在用户浏览器本地
- 不上传到任何服务器
- 清除浏览器数据会导致记录丢失

### 7.2 数据备份建议

- 定期导出数据备份
- 建议至少每30天备份一次
- 导出JSON格式可保留完整数据结构

## 8. 版本历史

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| 1.0.0 | 2024-01 | 初始版本 |

