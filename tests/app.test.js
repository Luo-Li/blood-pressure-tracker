/**
 * 血压记录管理系统 - 测试文件
 * Blood Pressure Tracker Tests
 */

const TEST_CONFIG = {
    STORAGE_KEY: 'blood_pressure_records',
    TEST_RECORDS: [
        {
            id: 'test-001',
            timestamp: new Date('2024-01-15T07:30:00'),
            recordType: 'morning',
            systolic: 120,
            diastolic: 80,
            heartRate: 72,
            notes: '测试记录1'
        },
        {
            id: 'test-002',
            timestamp: new Date('2024-01-15T20:30:00'),
            recordType: 'evening',
            systolic: 118,
            diastolic: 78,
            heartRate: 68,
            notes: '测试记录2'
        },
        {
            id: 'test-003',
            timestamp: new Date('2024-01-16T07:30:00'),
            recordType: 'morning',
            systolic: 122,
            diastolic: 82,
            heartRate: 75,
            notes: '测试记录3'
        },
        {
            id: 'test-004',
            timestamp: new Date('2024-01-16T20:30:00'),
            recordType: 'evening',
            systolic: 116,
            diastolic: 76,
            heartRate: 70,
            notes: ''
        },
        {
            id: 'test-005',
            timestamp: new Date('2024-01-17T07:30:00'),
            recordType: 'morning',
            systolic: 125,
            diastolic: 85,
            heartRate: 78,
            notes: '测试记录5'
        }
    ]
};

class BloodPressureTester {
    constructor() {
        this.testResults = [];
        this.runAllTests();
    }

    /**
     * 运行所有测试
     */
    async runAllTests() {
        console.log('='.repeat(50));
        console.log('血压记录管理系统 - 测试开始');
        console.log('='.repeat(50));

        // 清理测试数据
        this.clearTestData();

        // 运行测试
        await this.testDataValidation();
        await this.testRecordCRUD();
        await this.testStatisticsCalculation();
        await this.testDataFiltering();
        await this.testCSVParsing();
        await this.testDateFormatting();

        // 输出测试结果
        this.printTestResults();
    }

    /**
     * 清理测试数据
     */
    clearTestData() {
        localStorage.removeItem(TEST_CONFIG.STORAGE_KEY);
    }

    /**
     * 保存测试数据
     */
    saveTestData(records) {
        localStorage.setItem(TEST_CONFIG.STORAGE_KEY, JSON.stringify(records));
    }

    /**
     * 加载测试数据
     */
    loadTestData() {
        const data = localStorage.getItem(TEST_CONFIG.STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    }

    /**
     * 记录测试结果
     */
    recordTest(name, passed, message = '') {
        this.testResults.push({ name, passed, message });
        const status = passed ? '✓ PASS' : '✗ FAIL';
        console.log(`${status}: ${name}${message ? ' - ' + message : ''}`);
    }

    /**
     * 测试数据验证
     */
    async testDataValidation() {
        console.log('\n--- 测试: 数据验证 ---');

        // 测试收缩压范围验证
        const systolicValidator = (value) => value >= 90 && value <= 180;
        this.recordTest('收缩压验证 - 有效值(120)', systolicValidator(120));
        this.recordTest('收缩压验证 - 最小值(90)', systolicValidator(90));
        this.recordTest('收缩压验证 - 最大值(180)', systolicValidator(180));
        this.recordTest('收缩压验证 - 无效值(89)', !systolicValidator(89));
        this.recordTest('收缩压验证 - 无效值(181)', !systolicValidator(181));

        // 测试舒张压范围验证
        const diastolicValidator = (value) => value >= 60 && value <= 120;
        this.recordTest('舒张压验证 - 有效值(80)', diastolicValidator(80));
        this.recordTest('舒张压验证 - 最小值(60)', diastolicValidator(60));
        this.recordTest('舒张压验证 - 最大值(120)', diastolicValidator(120));
        this.recordTest('舒张压验证 - 无效值(59)', !diastolicValidator(59));
        this.recordTest('舒张压验证 - 无效值(121)', !diastolicValidator(121));

        // 测试心率范围验证
        const heartRateValidator = (value) => value >= 40 && value <= 160;
        this.recordTest('心率验证 - 有效值(72)', heartRateValidator(72));
        this.recordTest('心率验证 - 最小值(40)', heartRateValidator(40));
        this.recordTest('心率验证 - 最大值(160)', heartRateValidator(160));
        this.recordTest('心率验证 - 无效值(39)', !heartRateValidator(39));
        this.recordTest('心率验证 - 无效值(161)', !heartRateValidator(161));
    }

    /**
     * 测试记录CRUD操作
     */
    async testRecordCRUD() {
        console.log('\n--- 测试: 记录CRUD操作 ---');

        // Create - 创建记录
        const testRecord = {
            id: 'test-crud-001',
            timestamp: new Date(),
            recordType: 'morning',
            systolic: 120,
            diastolic: 80,
            heartRate: 72,
            notes: 'CRUD测试'
        };

        this.saveTestData([testRecord]);
        let records = this.loadTestData();
        
        this.recordTest('创建记录', records.length === 1 && records[0].id === 'test-crud-001');

        // Read - 读取记录
        const foundRecord = records.find(r => r.id === 'test-crud-001');
        this.recordTest('读取记录', foundRecord !== undefined);

        // Update - 更新记录
        records[0].systolic = 125;
        records[0].diastolic = 85;
        this.saveTestData(records);
        records = this.loadTestData();
        
        this.recordTest('更新记录', 
            records[0].systolic === 125 && records[0].diastolic === 85);

        // Delete - 删除记录
        records = records.filter(r => r.id !== 'test-crud-001');
        this.saveTestData(records);
        records = this.loadTestData();
        
        this.recordTest('删除记录', records.length === 0);
    }

    /**
     * 测试统计计算
     */
    async testStatisticsCalculation() {
        console.log('\n--- 测试: 统计计算 ---');

        this.saveTestData(TEST_CONFIG.TEST_RECORDS);
        const records = this.loadTestData();

        // 计算统计数据的函数
        const calculateStats = (recordList) => {
            if (recordList.length === 0) return null;

            const systolicValues = recordList.map(r => r.systolic);
            const diastolicValues = recordList.map(r => r.diastolic);
            const heartRateValues = recordList.map(r => r.heartRate);

            return {
                systolic: Math.round(systolicValues.reduce((a, b) => a + b, 0) / systolicValues.length),
                systolicMax: Math.max(...systolicValues),
                systolicMin: Math.min(...systolicValues),
                diastolic: Math.round(diastolicValues.reduce((a, b) => a + b, 0) / diastolicValues.length),
                diastolicMax: Math.max(...diastolicValues),
                diastolicMin: Math.min(...diastolicValues),
                heartRate: Math.round(heartRateValues.reduce((a, b) => a + b, 0) / heartRateValues.length),
                count: recordList.length
            };
        };

        // 全部记录统计
        const overallStats = calculateStats(records);
        this.recordTest('整体统计 - 平均收缩压', overallStats.systolic === 120);
        this.recordTest('整体统计 - 平均舒张压', overallStats.diastolic === 80);
        this.recordTest('整体统计 - 收缩压最高', overallStats.systolicMax === 125);
        this.recordTest('整体统计 - 收缩压最低', overallStats.systolicMin === 116);

        // 早晨记录统计
        const morningRecords = records.filter(r => r.recordType === 'morning');
        const morningStats = calculateStats(morningRecords);
        this.recordTest('早晨统计 - 记录数', morningStats.count === 3);
        this.recordTest('早晨统计 - 平均收缩压', morningStats.systolic === 122);

        // 晚上记录统计
        const eveningRecords = records.filter(r => r.recordType === 'evening');
        const eveningStats = calculateStats(eveningRecords);
        this.recordTest('晚上统计 - 记录数', eveningStats.count === 2);
        this.recordTest('晚上统计 - 平均舒张压', eveningStats.diastolic === 77);
    }

    /**
     * 测试数据筛选
     */
    async testDataFiltering() {
        console.log('\n--- 测试: 数据筛选 ---');

        this.saveTestData(TEST_CONFIG.TEST_RECORDS);
        const records = this.loadTestData();

        // 日期范围筛选
        const startDate = new Date('2024-01-16');
        const endDate = new Date('2024-01-17');
        
        const filteredByDate = records.filter(r => {
            const date = new Date(r.timestamp);
            return date >= startDate && date <= endDate;
        });
        
        this.recordTest('日期筛选 - 范围筛选', filteredByDate.length === 4);

        // 记录类型筛选 - 早晨
        const morningOnly = records.filter(r => r.recordType === 'morning');
        this.recordTest('类型筛选 - 早晨', morningOnly.length === 3);

        // 记录类型筛选 - 晚上
        const eveningOnly = records.filter(r => r.recordType === 'evening');
        this.recordTest('类型筛选 - 晚上', eveningOnly.length === 2);

        // 综合筛选
        const filtered = records.filter(r => {
            const date = new Date(r.timestamp);
            return date >= startDate && r.recordType === 'morning';
        });
        
        this.recordTest('综合筛选', filtered.length === 2);
    }

    /**
     * 测试CSV解析
     */
    async testCSVParsing() {
        console.log('\n--- 测试: CSV解析 ---');

        const csvData = `日期时间,记录类型,收缩压,舒张压,心率,备注
2024-01-15 07:30, morning, 120, 80, 72, 测试1
2024-01-15 20:30, evening, 118, 78, 68, 测试2
2024-01-16 07:30, morning, 122, 82, 75, 测试3`;

        const parseCSVLine = (line) => {
            const values = [];
            let current = '';
            let inQuotes = false;
            
            for (let char of line) {
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            values.push(current.trim());
            
            return values;
        };

        const lines = csvData.split('\n').filter(line => line.trim());
        const headers = parseCSVLine(lines[0]);
        
        this.recordTest('CSV解析 - 表头解析', headers.length === 6);
        this.recordTest('CSV解析 - 表头内容', 
            headers[0] === '日期时间' && headers[2] === '收缩压');

        const dataLine = parseCSVLine(lines[1]);
        this.recordTest('CSV解析 - 数据行解析', dataLine[2] === '120');
        this.recordTest('CSV解析 - 记录类型', dataLine[1] === 'morning');
    }

    /**
     * 测试日期格式化
     */
    async testDateFormatting() {
        console.log('\n--- 测试: 日期格式化 ---');

        const formatDateTime = (date) => {
            const d = new Date(date);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        };

        const testDate = new Date('2024-01-15T07:30:00');
        const formatted = formatDateTime(testDate);
        
        this.recordTest('日期时间格式化', formatted === '2024-01-15 07:30');

        // 测试边界情况
        const testDate2 = new Date('2024-12-31T23:59:00');
        const formatted2 = formatDateTime(testDate2);
        this.recordTest('日期时间格式化 - 年末', formatted2 === '2024-12-31 23:59');
    }

    /**
     * 输出测试结果摘要
     */
    printTestResults() {
        console.log('\n' + '='.repeat(50));
        console.log('测试结果摘要');
        console.log('='.repeat(50));

        const passed = this.testResults.filter(t => t.passed).length;
        const failed = this.testResults.filter(t => !t.passed).length;
        const total = this.testResults.length;

        console.log(`总计: ${total} | 通过: ${passed} | 失败: ${failed}`);
        console.log(`通过率: ${Math.round(passed / total * 100)}%`);
        console.log('='.repeat(50));

        if (failed > 0) {
            console.log('\n失败的测试:');
            this.testResults.filter(t => !t.passed).forEach(t => {
                console.log(`  - ${t.name}: ${t.message}`);
            });
        }

        // 清理测试数据
        this.clearTestData();
    }
}

// 如果在浏览器环境中运行测试
if (typeof window !== 'undefined') {
    window.BloodPressureTester = BloodPressureTester;
    window.TEST_CONFIG = TEST_CONFIG;
}
