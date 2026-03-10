/**
 * 血压记录管理系统 - 主应用
 * Blood Pressure Tracker Application
 */

const APP_CONFIG = {
    STORAGE_KEY: 'blood_pressure_records',
    BACKUP_KEY: 'last_backup_date',
    SYSTOLIC_MIN: 90,
    SYSTOLIC_MAX: 180,
    DIASTOLIC_MIN: 60,
    DIASTOLIC_MAX: 120,
    HEART_RATE_MIN: 40,
    HEART_RATE_MAX: 160,
    NOTES_MAX_LENGTH: 200,
    PAGE_SIZE: 10,
    CHART_COLORS: {
        morning: {
            systolic: 'rgba(25, 118, 210, 1)',
            diastolic: 'rgba(25, 118, 210, 0.5)',
            systolicFill: 'rgba(25, 118, 210, 0.1)',
            diastolicFill: 'rgba(25, 118, 210, 0.05)'
        },
        evening: {
            systolic: 'rgba(255, 152, 0, 1)',
            diastolic: 'rgba(255, 152, 0, 0.5)',
            systolicFill: 'rgba(255, 152, 0, 0.1)',
            diastolicFill: 'rgba(255, 152, 0, 0.05)'
        }
    }
};

class BloodPressureApp {
    constructor() {
        this.records = [];
        this.currentPage = 1;
        this.totalPages = 1;
        this.chart = null;
        this.deleteId = null;
        this.filterParams = {
            startDate: '',
            endDate: '',
            recordType: ''
        };
        
        this.init();
    }

    /**
     * 初始化应用
     */
    init() {
        this.loadRecords();
        this.bindEvents();
        this.initDateTimePicker();
        this.navigateTo('record');
        this.checkBackupReminder();
    }

    /**
     * 初始化日期时间选择器
     */
    initDateTimePicker() {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().slice(0, 5);
        
        document.getElementById('recordDate').value = dateStr;
        document.getElementById('recordDate').max = dateStr;
        document.getElementById('recordTime').value = timeStr;
    }

    /**
     * 从本地存储加载记录
     */
    loadRecords() {
        try {
            const data = localStorage.getItem(APP_CONFIG.STORAGE_KEY);
            this.records = data ? JSON.parse(data).map(r => ({
                ...r,
                timestamp: new Date(r.timestamp)
            })) : [];
            this.records.sort((a, b) => b.timestamp - a.timestamp);
        } catch (error) {
            console.error('加载记录失败:', error);
            this.records = [];
        }
    }

    /**
     * 保存记录到本地存储
     */
    saveRecords() {
        try {
            localStorage.setItem(APP_CONFIG.STORAGE_KEY, JSON.stringify(this.records));
            return true;
        } catch (error) {
            console.error('保存记录失败:', error);
            this.showToast('保存失败，请重试', 'error');
            return false;
        }
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 导航事件
        document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const page = e.currentTarget.dataset.page;
                this.navigateTo(page);
            });
        });

        // 记录表单提交
        document.getElementById('bpForm').addEventListener('submit', (e) => this.handleSubmit(e));
        
        // 重置表单
        document.getElementById('bpForm').addEventListener('reset', () => this.handleReset());
        
        // 备注字符计数
        document.getElementById('notes').addEventListener('input', (e) => {
            const count = e.target.value.length;
            document.getElementById('notesCount').textContent = count;
        });

        // 筛选功能
        document.getElementById('applyFilter').addEventListener('click', () => this.applyFilter());
        document.getElementById('clearFilter').addEventListener('click', () => this.clearFilter());

        // 时间范围选择器
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.updateStatistics(parseInt(e.target.dataset.range));
            });
        });

        // 图表控制
        document.getElementById('chartTimeRange').addEventListener('change', () => this.updateChart());
        document.getElementById('showMorning').addEventListener('change', () => this.updateChart());
        document.getElementById('showEvening').addEventListener('change', () => this.updateChart());
        document.getElementById('showSystolic').addEventListener('change', () => this.updateChart());
        document.getElementById('showDiastolic').addEventListener('change', () => this.updateChart());
        
        // 导出功能
        document.getElementById('exportBtn').addEventListener('click', () => this.showExportModal());
        document.getElementById('exportJson').addEventListener('click', () => this.exportData('json'));
        document.getElementById('exportCsvFormat').addEventListener('click', () => this.exportData('csv'));
        document.getElementById('closeExportModal').addEventListener('click', () => this.hideExportModal());
        
        // 导入功能
        document.getElementById('importBtn').addEventListener('click', () => this.showImportModal());
        document.getElementById('importJson').addEventListener('click', () => this.triggerImport('json'));
        document.getElementById('importCsv').addEventListener('click', () => this.triggerImport('csv'));
        document.getElementById('importFile').addEventListener('change', (e) => this.handleImport(e));
        document.getElementById('closeImportModal').addEventListener('click', () => this.hideImportModal());

        // 图表导出
        document.getElementById('exportCSV').addEventListener('click', () => this.exportChartData('csv'));
        document.getElementById('exportPNG').addEventListener('click', () => this.exportChartImage());

        // 编辑模态框
        document.getElementById('editForm').addEventListener('submit', (e) => this.handleEditSubmit(e));
        document.getElementById('closeEditModal').addEventListener('click', () => this.hideEditModal());
        document.getElementById('cancelEdit').addEventListener('click', () => this.hideEditModal());

        // 删除确认
        document.getElementById('confirmDelete').addEventListener('click', () => this.confirmDelete());
        document.getElementById('cancelDelete').addEventListener('click', () => this.hideDeleteConfirm());

        // 备份提醒关闭
        document.getElementById('closeBackupReminder').addEventListener('click', () => {
            document.getElementById('backupReminder').style.display = 'none';
        });

        // 模态框点击关闭
        document.querySelectorAll('.modal-overlay, .confirm-overlay').forEach(overlay => {
            overlay.addEventListener('click', () => {
                document.querySelectorAll('.modal.active, .confirm-dialog.active').forEach(modal => {
                    modal.classList.remove('active');
                });
            });
        });
    }

    /**
     * 页面导航
     */
    navigateTo(page) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(n => n.classList.remove('active'));
        
        document.getElementById(`page-${page}`).classList.add('active');
        document.querySelectorAll(`[data-page="${page}"]`).forEach(n => n.classList.add('active'));

        switch (page) {
            case 'record':
                break;
            case 'history':
                this.renderRecordsList();
                break;
            case 'statistics':
                this.updateStatistics(30);
                break;
            case 'chart':
                this.initChart();
                break;
        }
    }

    /**
     * 表单验证
     */
    validateForm(formData) {
        const errors = {};
        
        const systolic = parseInt(formData.get('systolic'));
        if (isNaN(systolic) || systolic < APP_CONFIG.SYSTOLIC_MIN || systolic > APP_CONFIG.SYSTOLIC_MAX) {
            errors.systolic = `收缩压应在 ${APP_CONFIG.SYSTOLIC_MIN}-${APP_CONFIG.SYSTOLIC_MAX} mmHg 之间`;
        }

        const diastolic = parseInt(formData.get('diastolic'));
        if (isNaN(diastolic) || diastolic < APP_CONFIG.DIASTOLIC_MIN || diastolic > APP_CONFIG.DIASTOLIC_MAX) {
            errors.diastolic = `舒张压应在 ${APP_CONFIG.DIASTOLIC_MIN}-${APP_CONFIG.DIASTOLIC_MAX} mmHg 之间`;
        }

        const heartRate = parseInt(formData.get('heartRate'));
        if (isNaN(heartRate) || heartRate < APP_CONFIG.HEART_RATE_MIN || heartRate > APP_CONFIG.HEART_RATE_MAX) {
            errors.heartRate = `心率应在 ${APP_CONFIG.HEART_RATE_MIN}-${APP_CONFIG.HEART_RATE_MAX} 次/分钟 之间`;
        }

        return errors;
    }

    /**
     * 显示表单错误
     */
    showFieldError(fieldId, message) {
        const input = document.getElementById(fieldId);
        const errorSpan = document.getElementById(`${fieldId}Error`);
        
        if (input) input.classList.add('error');
        if (errorSpan) errorSpan.textContent = message;
    }

    /**
     * 清除表单错误
     */
    clearFieldErrors() {
        document.querySelectorAll('.form-input.error, .form-textarea.error').forEach(el => {
            el.classList.remove('error');
        });
        document.querySelectorAll('.form-error').forEach(el => {
            el.textContent = '';
        });
    }

    /**
     * 处理表单提交
     */
    handleSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        
        this.clearFieldErrors();
        
        const errors = this.validateForm(formData);
        
        if (Object.keys(errors).length > 0) {
            Object.entries(errors).forEach(([field, message]) => {
                this.showFieldError(field, message);
            });
            this.showToast('请修正表单中的错误', 'error');
            return;
        }

        const recordDate = document.getElementById('recordDate').value;
        const recordTime = document.getElementById('recordTime').value;
        
        if (!recordDate || !recordTime) {
            this.showFieldError('datetime', '请选择日期和时间');
            this.showToast('请选择测量日期和时间', 'error');
            return;
        }

        const timestamp = new Date(`${recordDate}T${recordTime}`);
        
        if (isNaN(timestamp.getTime())) {
            this.showFieldError('datetime', '日期时间格式无效');
            this.showToast('日期时间格式无效', 'error');
            return;
        }

        const record = {
            id: this.generateId(),
            timestamp: timestamp,
            recordType: formData.get('recordType'),
            systolic: parseInt(formData.get('systolic')),
            diastolic: parseInt(formData.get('diastolic')),
            heartRate: parseInt(formData.get('heartRate')),
            notes: formData.get('notes') || ''
        };

        this.records.unshift(record);
        this.records.sort((a, b) => b.timestamp - a.timestamp);
        
        if (this.saveRecords()) {
            this.showToast('记录已保存', 'success');
            form.reset();
            this.initDateTimePicker();
            document.getElementById('notesCount').textContent = '0';
            document.querySelector('input[name="recordType"][value="morning"]').checked = true;
        }
    }

    /**
     * 处理表单重置
     */
    handleReset() {
        this.clearFieldErrors();
        document.getElementById('notesCount').textContent = '0';
    }

    /**
     * 生成唯一ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * 渲染记录列表
     */
    renderRecordsList() {
        const filteredRecords = this.getFilteredRecords();
        const totalRecords = filteredRecords.length;
        this.totalPages = Math.ceil(totalRecords / APP_CONFIG.PAGE_SIZE);
        
        if (totalRecords === 0) {
            document.getElementById('recordsList').innerHTML = '';
            document.getElementById('pagination').innerHTML = '';
            document.getElementById('emptyState').style.display = 'flex';
            return;
        }

        document.getElementById('emptyState').style.display = 'none';
        
        const start = (this.currentPage - 1) * APP_CONFIG.PAGE_SIZE;
        const pageRecords = filteredRecords.slice(start, start + APP_CONFIG.PAGE_SIZE);
        
        const html = pageRecords.map(record => this.renderRecordItem(record)).join('');
        
        document.getElementById('recordsList').innerHTML = html;
        this.renderPagination(totalRecords);
        
        // 绑定编辑和删除事件
        document.querySelectorAll('.record-action-btn.edit').forEach(btn => {
            btn.addEventListener('click', (e) => this.showEditModal(e.target.closest('.record-item').dataset.id));
        });
        
        document.querySelectorAll('.record-action-btn.delete').forEach(btn => {
            btn.addEventListener('click', (e) => this.showDeleteConfirm(e.target.closest('.record-item').dataset.id));
        });
    }

    /**
     * 渲染单条记录
     */
    renderRecordItem(record) {
        const time = this.formatDateTime(record.timestamp);
        const typeLabel = record.recordType === 'morning' ? '🌅 早晨' : '🌙 晚上';
        
        return `
            <div class="record-item" data-id="${record.id}">
                <div class="record-time">
                    <div class="record-type-badge ${record.recordType}">${typeLabel}</div>
                    <div style="font-size: 14px; color: var(--text-secondary); margin-top: 4px;">${time}</div>
                </div>
                <div class="record-values">
                    <div class="record-value">
                        <div class="record-value-label">收缩压</div>
                        <div class="record-value-number">${record.systolic}</div>
                        <div class="record-value-unit">mmHg</div>
                    </div>
                    <div class="record-value">
                        <div class="record-value-label">舒张压</div>
                        <div class="record-value-number">${record.diastolic}</div>
                        <div class="record-value-unit">mmHg</div>
                    </div>
                    <div class="record-value">
                        <div class="record-value-label">心率</div>
                        <div class="record-value-number">${record.heartRate}</div>
                        <div class="record-value-unit">bpm</div>
                    </div>
                </div>
                ${record.notes ? `<div class="record-notes" title="${this.escapeHtml(record.notes)}">${this.escapeHtml(record.notes)}</div>` : '<div class="record-notes"></div>'}
                <div class="record-actions">
                    <button class="record-action-btn edit" title="编辑">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button class="record-action-btn delete" title="删除">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * 渲染分页
     */
    renderPagination(totalRecords) {
        if (totalRecords <= APP_CONFIG.PAGE_SIZE) {
            document.getElementById('pagination').innerHTML = '';
            return;
        }

        let html = `
            <button class="pagination-btn" ${this.currentPage === 1 ? 'disabled' : ''} data-page="prev">上一页</button>
        `;
        
        for (let i = 1; i <= this.totalPages; i++) {
            if (i === 1 || i === this.totalPages || (i >= this.currentPage - 1 && i <= this.currentPage + 1)) {
                html += `<button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
            } else if (i === this.currentPage - 2 || i === this.currentPage + 2) {
                html += `<span>...</span>`;
            }
        }
        
        html += `
            <button class="pagination-btn" ${this.currentPage === this.totalPages ? 'disabled' : ''} data-page="next">下一页</button>
        `;
        
        document.getElementById('pagination').innerHTML = html;
        
        document.querySelectorAll('.pagination-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = e.target.dataset.page;
                if (page === 'prev') {
                    this.currentPage = Math.max(1, this.currentPage - 1);
                } else if (page === 'next') {
                    this.currentPage = Math.min(this.totalPages, this.currentPage + 1);
                } else {
                    this.currentPage = parseInt(page);
                }
                this.renderRecordsList();
            });
        });
    }

    /**
     * 获取筛选后的记录
     */
    getFilteredRecords() {
        let filtered = [...this.records];
        
        if (this.filterParams.startDate) {
            const start = new Date(this.filterParams.startDate);
            start.setHours(0, 0, 0, 0);
            filtered = filtered.filter(r => new Date(r.timestamp) >= start);
        }
        
        if (this.filterParams.endDate) {
            const end = new Date(this.filterParams.endDate);
            end.setHours(23, 59, 59, 999);
            filtered = filtered.filter(r => new Date(r.timestamp) <= end);
        }
        
        if (this.filterParams.recordType) {
            filtered = filtered.filter(r => r.recordType === this.filterParams.recordType);
        }
        
        return filtered;
    }

    /**
     * 应用筛选
     */
    applyFilter() {
        this.filterParams.startDate = document.getElementById('filterStartDate').value;
        this.filterParams.endDate = document.getElementById('filterEndDate').value;
        this.filterParams.recordType = document.getElementById('filterRecordType').value;
        this.currentPage = 1;
        this.renderRecordsList();
    }

    /**
     * 清除筛选
     */
    clearFilter() {
        this.filterParams = { startDate: '', endDate: '', recordType: '' };
        document.getElementById('filterStartDate').value = '';
        document.getElementById('filterEndDate').value = '';
        document.getElementById('filterRecordType').value = '';
        this.currentPage = 1;
        this.renderRecordsList();
    }

    /**
     * 显示编辑模态框
     */
    showEditModal(id) {
        const record = this.records.find(r => r.id === id);
        if (!record) return;

        document.getElementById('editId').value = id;
        document.querySelector(`input[name="editRecordType"][value="${record.recordType}"]`).checked = true;
        document.getElementById('editSystolic').value = record.systolic;
        document.getElementById('editDiastolic').value = record.diastolic;
        document.getElementById('editHeartRate').value = record.heartRate;
        document.getElementById('editNotes').value = record.notes;

        const timestamp = new Date(record.timestamp);
        const dateStr = timestamp.toISOString().split('T')[0];
        const timeStr = timestamp.toTimeString().slice(0, 5);
        
        document.getElementById('editRecordDate').value = dateStr;
        document.getElementById('editRecordDate').max = new Date().toISOString().split('T')[0];
        document.getElementById('editRecordTime').value = timeStr;

        document.getElementById('editModal').classList.add('active');
    }

    /**
     * 隐藏编辑模态框
     */
    hideEditModal() {
        document.getElementById('editModal').classList.remove('active');
    }

    /**
     * 处理编辑提交
     */
    handleEditSubmit(e) {
        e.preventDefault();
        
        const id = document.getElementById('editId').value;
        const recordType = document.querySelector('input[name="editRecordType"]:checked').value;
        const systolic = parseInt(document.getElementById('editSystolic').value);
        const diastolic = parseInt(document.getElementById('editDiastolic').value);
        const heartRate = parseInt(document.getElementById('editHeartRate').value);
        const notes = document.getElementById('editNotes').value;

        const editRecordDate = document.getElementById('editRecordDate').value;
        const editRecordTime = document.getElementById('editRecordTime').value;
        
        if (!editRecordDate || !editRecordTime) {
            this.showToast('请选择日期和时间', 'error');
            return;
        }

        const timestamp = new Date(`${editRecordDate}T${editRecordTime}`);
        
        if (isNaN(timestamp.getTime())) {
            this.showToast('日期时间格式无效', 'error');
            return;
        }

        if (systolic < APP_CONFIG.SYSTOLIC_MIN || systolic > APP_CONFIG.SYSTOLIC_MAX ||
            diastolic < APP_CONFIG.DIASTOLIC_MIN || diastolic > APP_CONFIG.DIASTOLIC_MAX ||
            heartRate < APP_CONFIG.HEART_RATE_MIN || heartRate > APP_CONFIG.HEART_RATE_MAX) {
            this.showToast('数值超出有效范围', 'error');
            return;
        }

        const index = this.records.findIndex(r => r.id === id);
        if (index !== -1) {
            this.records[index] = {
                ...this.records[index],
                timestamp: timestamp,
                recordType,
                systolic,
                diastolic,
                heartRate,
                notes
            };
            
            this.records.sort((a, b) => b.timestamp - a.timestamp);
            
            if (this.saveRecords()) {
                this.showToast('记录已更新', 'success');
                this.hideEditModal();
                this.renderRecordsList();
            }
        }
    }

    /**
     * 显示删除确认
     */
    showDeleteConfirm(id) {
        this.deleteId = id;
        document.getElementById('deleteConfirm').classList.add('active');
    }

    /**
     * 隐藏删除确认
     */
    hideDeleteConfirm() {
        document.getElementById('deleteConfirm').classList.remove('active');
        this.deleteId = null;
    }

    /**
     * 确认删除
     */
    confirmDelete() {
        if (this.deleteId) {
            this.records = this.records.filter(r => r.id !== this.deleteId);
            if (this.saveRecords()) {
                this.showToast('记录已删除', 'success');
                this.renderRecordsList();
            }
            this.hideDeleteConfirm();
        }
    }

    /**
     * 更新统计数据
     */
    updateStatistics(days) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        const filteredRecords = this.records.filter(r => {
            const date = new Date(r.timestamp);
            return date >= startDate && date <= endDate;
        });

        const morningRecords = filteredRecords.filter(r => r.recordType === 'morning');
        const eveningRecords = filteredRecords.filter(r => r.recordType === 'evening');

        // 计算统计指标
        const stats = {
            morning: this.calculateStats(morningRecords),
            evening: this.calculateStats(eveningRecords),
            overall: this.calculateStats(filteredRecords)
        };

        // 渲染统计卡片
        const formatStat = (stat, key) => stat ? stat[key] : '--';
        
        const statsGrid = document.getElementById('statsGrid');
        
        if (filteredRecords.length === 0) {
            statsGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                    </svg>
                    <h3>暂无统计数据</h3>
                    <p>请先添加血压记录后再查看统计数据</p>
                </div>
            `;
        } else {
            statsGrid.innerHTML = `
                <div class="stat-card">
                    <div class="stat-card-title">早晨平均收缩压</div>
                    <div class="stat-card-value morning">${formatStat(stats.morning, 'systolic')}<span class="stat-card-unit">mmHg</span></div>
                    <div class="stat-card-subtitle">最高: ${formatStat(stats.morning, 'systolicMax')} / 最低: ${formatStat(stats.morning, 'systolicMin')}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-title">早晨平均舒张压</div>
                    <div class="stat-card-value morning">${formatStat(stats.morning, 'diastolic')}<span class="stat-card-unit">mmHg</span></div>
                    <div class="stat-card-subtitle">最高: ${formatStat(stats.morning, 'diastolicMax')} / 最低: ${formatStat(stats.morning, 'diastolicMin')}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-title">晚上平均收缩压</div>
                    <div class="stat-card-value evening">${formatStat(stats.evening, 'systolic')}<span class="stat-card-unit">mmHg</span></div>
                    <div class="stat-card-subtitle">最高: ${formatStat(stats.evening, 'systolicMax')} / 最低: ${formatStat(stats.evening, 'systolicMin')}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-title">晚上平均舒张压</div>
                    <div class="stat-card-value evening">${formatStat(stats.evening, 'diastolic')}<span class="stat-card-unit">mmHg</span></div>
                    <div class="stat-card-subtitle">最高: ${formatStat(stats.evening, 'diastolicMax')} / 最低: ${formatStat(stats.evening, 'diastolicMin')}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-title">平均心率</div>
                    <div class="stat-card-value">${formatStat(stats.overall, 'heartRate')}<span class="stat-card-unit">bpm</span></div>
                    <div class="stat-card-subtitle">总记录数: ${filteredRecords.length}</div>
                </div>
            `;
        }

        // 渲染统计表格
        this.renderStatsTable(filteredRecords, days);
    }

    /**
     * 计算统计数据
     */
    calculateStats(records) {
        if (records.length === 0) return null;

        const systolicValues = records.map(r => r.systolic);
        const diastolicValues = records.map(r => r.diastolic);
        const heartRateValues = records.map(r => r.heartRate);

        return {
            systolic: Math.round(systolicValues.reduce((a, b) => a + b, 0) / systolicValues.length),
            systolicMax: Math.max(...systolicValues),
            systolicMin: Math.min(...systolicValues),
            diastolic: Math.round(diastolicValues.reduce((a, b) => a + b, 0) / diastolicValues.length),
            diastolicMax: Math.max(...diastolicValues),
            diastolicMin: Math.min(...diastolicValues),
            heartRate: Math.round(heartRateValues.reduce((a, b) => a + b, 0) / heartRateValues.length),
            count: records.length
        };
    }

    /**
     * 渲染统计表格
     */
    renderStatsTable(records, days) {
        const tableTitle = document.getElementById('statsTableTitle');
        const tableBody = document.getElementById('statsTableBody');
        
        let groupBy, formatLabel;
        
        if (days <= 7) {
            tableTitle.textContent = '按日统计';
            groupBy = (date) => date.toISOString().split('T')[0];
            formatLabel = (date) => this.formatDate(date, 'MM月dd日');
        } else if (days <= 30) {
            tableTitle.textContent = '按周统计';
            groupBy = (date) => {
                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - date.getDay());
                return weekStart.toISOString().split('T')[0];
            };
            formatLabel = (date) => `第${Math.ceil(date.getDate() / 7)}周`;
        } else {
            tableTitle.textContent = '按月统计';
            groupBy = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            formatLabel = (date) => `${date.getFullYear()}年${date.getMonth() + 1}月`;
        }

        const grouped = {};
        records.forEach(r => {
            const date = new Date(r.timestamp);
            const key = groupBy(date);
            if (!grouped[key]) {
                grouped[key] = [];
            }
            grouped[key].push(r);
        });

        const sortedKeys = Object.keys(grouped).sort();
        
        const html = sortedKeys.map(key => {
            const groupRecords = grouped[key];
            const stats = this.calculateStats(groupRecords);
            const date = new Date(key);
            
            return `
                <tr>
                    <td>${formatLabel(date)}</td>
                    <td>${stats ? stats.systolic : '--'}</td>
                    <td>${stats ? stats.diastolic : '--'}</td>
                    <td>${stats ? stats.heartRate : '--'}</td>
                    <td>${stats ? stats.count : 0}</td>
                </tr>
            `;
        }).join('');

        tableBody.innerHTML = html || '<tr><td colspan="5" style="text-align: center; color: var(--text-secondary);">暂无数据</td></tr>';
    }

    /**
     * 初始化图表
     */
    initChart() {
        const ctx = document.getElementById('bloodPressureChart').getContext('2d');
        
        if (this.chart) {
            this.chart.destroy();
        }

        this.chart = new Chart(ctx, this.getChartConfig());
    }

    /**
     * 获取图表配置
     */
    getChartConfig() {
        const days = parseInt(document.getElementById('chartTimeRange').value);
        const showMorning = document.getElementById('showMorning').checked;
        const showEvening = document.getElementById('showEvening').checked;
        const showSystolic = document.getElementById('showSystolic').checked;
        const showDiastolic = document.getElementById('showDiastolic').checked;

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const filteredRecords = this.records.filter(r => {
            const date = new Date(r.timestamp);
            return date >= startDate && date <= endDate;
        });

        const morningRecords = filteredRecords.filter(r => r.recordType === 'morning');
        const eveningRecords = filteredRecords.filter(r => r.recordType === 'evening');

        const datasets = [];

        if (showMorning && showSystolic) {
            datasets.push({
                label: '早晨收缩压',
                data: morningRecords.map(r => ({ x: r.timestamp, y: r.systolic })),
                borderColor: APP_CONFIG.CHART_COLORS.morning.systolic,
                backgroundColor: APP_CONFIG.CHART_COLORS.morning.systolicFill,
                borderWidth: 2,
                tension: 0.3,
                fill: false,
                pointRadius: 4,
                pointHoverRadius: 6
            });
        }

        if (showMorning && showDiastolic) {
            datasets.push({
                label: '早晨舒张压',
                data: morningRecords.map(r => ({ x: r.timestamp, y: r.diastolic })),
                borderColor: APP_CONFIG.CHART_COLORS.morning.diastolic,
                backgroundColor: APP_CONFIG.CHART_COLORS.morning.diastolicFill,
                borderWidth: 2,
                borderDash: [5, 5],
                tension: 0.3,
                fill: false,
                pointRadius: 4,
                pointHoverRadius: 6
            });
        }

        if (showEvening && showSystolic) {
            datasets.push({
                label: '晚上收缩压',
                data: eveningRecords.map(r => ({ x: r.timestamp, y: r.systolic })),
                borderColor: APP_CONFIG.CHART_COLORS.evening.systolic,
                backgroundColor: APP_CONFIG.CHART_COLORS.evening.systolicFill,
                borderWidth: 2,
                tension: 0.3,
                fill: false,
                pointRadius: 4,
                pointHoverRadius: 6
            });
        }

        if (showEvening && showDiastolic) {
            datasets.push({
                label: '晚上舒张压',
                data: eveningRecords.map(r => ({ x: r.timestamp, y: r.diastolic })),
                borderColor: APP_CONFIG.CHART_COLORS.evening.diastolic,
                backgroundColor: APP_CONFIG.CHART_COLORS.evening.diastolicFill,
                borderWidth: 2,
                borderDash: [5, 5],
                tension: 0.3,
                fill: false,
                pointRadius: 4,
                pointHoverRadius: 6
            });
        }

        return {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            afterLabel: (context) => {
                                const record = filteredRecords.find(r => 
                                    new Date(r.timestamp).getTime() === new Date(context.raw.x).getTime()
                                );
                                if (record && record.notes) {
                                    return `备注: ${record.notes}`;
                                }
                                return '';
                            }
                        }
                    },
                    zoom: {
                        zoom: {
                            wheel: { enabled: true },
                            pinch: { enabled: true },
                            mode: 'x'
                        },
                        pan: {
                            enabled: true,
                            mode: 'x'
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: days <= 7 ? 'day' : days <= 30 ? 'week' : 'month',
                            displayFormats: {
                                day: 'MM/dd',
                                week: 'MM/dd',
                                month: 'yyyy/MM'
                            }
                        },
                        title: {
                            display: true,
                            text: '日期'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: '血压 (mmHg)'
                        },
                        suggestedMin: 50,
                        suggestedMax: 190
                    }
                }
            }
        };
    }

    /**
     * 更新图表
     */
    updateChart() {
        if (this.chart) {
            this.chart.destroy();
        }
        this.initChart();
    }

    /**
     * 导出图表数据
     */
    exportChartData(format) {
        const days = parseInt(document.getElementById('chartTimeRange').value);
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const filteredRecords = this.records.filter(r => {
            const date = new Date(r.timestamp);
            return date >= startDate && date <= endDate;
        });

        if (format === 'csv') {
            const headers = ['日期时间', '记录类型', '收缩压', '舒张压', '心率', '备注'];
            const rows = filteredRecords.map(r => [
                this.formatDateTime(r.timestamp),
                r.recordType === 'morning' ? '早晨' : '晚上',
                r.systolic,
                r.diastolic,
                r.heartRate,
                r.notes || ''
            ]);

            const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            this.downloadFile(csv, `blood_pressure_${this.formatDate(new Date(), 'YYYYMMDD')}.csv`, 'text/csv');
        }

        this.showToast('数据导出成功', 'success');
    }

    /**
     * 导出图表图片
     */
    exportChartImage() {
        if (!this.chart) return;
        
        const link = document.createElement('a');
        link.download = `blood_pressure_chart_${this.formatDate(new Date(), 'YYYYMMDD')}.png`;
        link.href = this.chart.toBase64Image();
        link.click();
        
        this.showToast('图表导出成功', 'success');
    }

    /**
     * 显示导出模态框
     */
    showExportModal() {
        document.getElementById('exportModal').classList.add('active');
    }

    /**
     * 隐藏导出模态框
     */
    hideExportModal() {
        document.getElementById('exportModal').classList.remove('active');
    }

    /**
     * 导出数据
     */
    exportData(format) {
        if (this.records.length === 0) {
            this.showToast('没有数据可导出', 'warning');
            return;
        }

        const lastBackup = new Date();
        localStorage.setItem(APP_CONFIG.BACKUP_KEY, lastBackup.toISOString());

        if (format === 'json') {
            const data = JSON.stringify(this.records, null, 2);
            this.downloadFile(data, `blood_pressure_backup_${this.formatDate(new Date(), 'YYYYMMDD')}.json`, 'application/json');
        } else if (format === 'csv') {
            const headers = ['日期时间', '记录类型', '收缩压', '舒张压', '心率', '备注'];
            const rows = this.records.map(r => [
                this.formatDateTime(r.timestamp),
                r.recordType,
                r.systolic,
                r.diastolic,
                r.heartRate,
                r.notes || ''
            ]);

            const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            this.downloadFile(csv, `blood_pressure_${this.formatDate(new Date(), 'YYYYMMDD')}.csv`, 'text/csv');
        }

        this.hideExportModal();
        this.showToast('数据导出成功', 'success');
    }

    /**
     * 显示导入模态框
     */
    showImportModal() {
        document.getElementById('importModal').classList.add('active');
    }

    /**
     * 隐藏导入模态框
     */
    hideImportModal() {
        document.getElementById('importModal').classList.remove('active');
    }

    /**
     * 触发文件导入
     */
    triggerImport(format) {
        const fileInput = document.getElementById('importFile');
        fileInput.accept = format === 'json' ? '.json' : '.csv';
        fileInput.dataset.format = format;
        fileInput.click();
    }

    /**
     * 处理文件导入
     */
    handleImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        const format = e.target.dataset.format;
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                let importedRecords = [];
                
                if (format === 'json') {
                    importedRecords = JSON.parse(event.target.result);
                } else {
                    importedRecords = this.parseCSV(event.target.result);
                }

                // 验证数据
                if (!Array.isArray(importedRecords)) {
                    throw new Error('数据格式无效');
                }

                // 合并数据
                const existingIds = new Set(this.records.map(r => r.id));
                const newRecords = importedRecords.filter(r => !existingIds.has(r.id));

                if (newRecords.length === 0) {
                    this.showToast('没有新数据需要导入', 'warning');
                    return;
                }

                // 转换时间戳
                newRecords.forEach(r => {
                    r.timestamp = new Date(r.timestamp);
                });

                this.records = [...newRecords, ...this.records];
                this.records.sort((a, b) => b.timestamp - a.timestamp);

                if (this.saveRecords()) {
                    this.showToast(`成功导入 ${newRecords.length} 条记录`, 'success');
                    this.hideImportModal();
                }
            } catch (error) {
                console.error('导入失败:', error);
                this.showToast('导入失败，请检查文件格式', 'error');
            }
        };

        reader.readAsText(file);
        e.target.value = '';
    }

    /**
     * 解析CSV
     */
    parseCSV(csv) {
        const lines = csv.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim());
        
        return lines.slice(1).map(line => {
            const values = this.parseCSVLine(line);
            const record = {};
            
            headers.forEach((header, index) => {
                record[header] = values[index];
            });

            return {
                id: this.generateId(),
                timestamp: new Date(record['日期时间'] || record['timestamp']),
                recordType: record['记录类型'] || record['recordType'] || 'morning',
                systolic: parseInt(record['收缩压'] || record['systolic']),
                diastolic: parseInt(record['舒张压'] || record['diastolic']),
                heartRate: parseInt(record['心率'] || record['heartRate']),
                notes: record['备注'] || record['notes'] || ''
            };
        }).filter(r => !isNaN(r.systolic) && !isNaN(r.diastolic));
    }

    /**
     * 解析CSV行（处理引号内的逗号）
     */
    parseCSVLine(line) {
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
    }

    /**
     * 下载文件
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    }

    /**
     * 检查备份提醒
     */
    checkBackupReminder() {
        const lastBackup = localStorage.getItem(APP_CONFIG.BACKUP_KEY);
        
        if (!lastBackup) {
            // 首次使用，显示提醒
            document.getElementById('backupReminder').style.display = 'flex';
            return;
        }

        const daysSinceBackup = Math.floor((Date.now() - new Date(lastBackup).getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceBackup >= 30) {
            document.getElementById('backupReminder').style.display = 'flex';
        }
    }

    /**
     * 显示Toast消息
     */
    showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        
        const icons = {
            success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>',
            error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',
            warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${icons[type]}</span>
            <span class="toast-message">${message}</span>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /**
     * 格式化日期时间
     */
    formatDateTime(date) {
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }

    /**
     * 格式化日期
     */
    formatDate(date, format) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        
        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('dd', day);
    }

    /**
     * HTML转义
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.app = new BloodPressureApp();
});
