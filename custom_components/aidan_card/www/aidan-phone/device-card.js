const whenDefined = (t) => customElements.whenDefined(t);
await Promise.race([whenDefined("ha-card"), whenDefined("ha-panel-lovelace")]);
const LitElement = window.LitElement || Object.getPrototypeOf(customElements.get("ha-card"));
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

window.customCards = window.customCards || [];
window.customCards.push({
    type: 'aidan-device-card',
    name: '设备卡片',
    description: '通用设备状态卡片（NAS/路由器）',
    preview: true
});

// ──────────────────────────────────────────────
// 编辑器
// ──────────────────────────────────────────────
class AidanDeviceCardEditor extends LitElement {
  static get properties() {
    return { hass: { type: Object }, config: { type: Object } };
  }
  setConfig(config) { this.config = config || {}; }

  _entitySearch(prefix) {
    if (!this.hass) return [];
    return Object.keys(this.hass.states).filter(eid => eid.startsWith(prefix));
  }

  _entityPicker(label, key) {
    const val = this.config[key] || '';
    const entities = this._entitySearch(key.includes('sensor') ? 'sensor' : '');
    return html`
      <div style="margin-bottom:8px">
        <label style="display:block;font-size:13px;margin-bottom:2px">${label}</label>
        <input .value="${val}" @input="${e => this._update(key, e.target.value)}"
          list="entity-list-${key}" style="width:100%;padding:4px" placeholder="entity_id" />
        <datalist id="entity-list-${key}">
          ${entities.map(e => html`<option value="${e}" />`)}
        </datalist>
      </div>`;
  }

  _update(key, val) {
    this.config = { ...this.config, [key]: val };
    const ev = new CustomEvent('config-changed', {
      detail: { config: this.config },
      bubbles: true, composed: true
    });
    this.dispatchEvent(ev);
  }

  render() {
    if (!this.hass) return html`<p>加载中...</p>`;
    return html`
      <div style="padding:12px;max-height:500px;overflow-y:auto">
        ${this._entityPicker('设备名称', 'name')}
        <label style="display:block;font-size:13px;margin-bottom:2px">Name</label>
        <input .value="${this.config.name || ''}" @input="${e => this._update('name', e.target.value)}"
          style="width:100%;padding:4px;margin-bottom:12px" />
        ${this._entityPicker('状态实体', 'status')}

        <h4 style="margin:8px 0 4px;color:#666">系统指标</h4>
        ${this._entityPicker('CPU 占用', 'cpu')}
        ${this._entityPicker('CPU 温度', 'cpu_temp')}
        ${this._entityPicker('主板温度', 'mb_temp')}
        ${this._entityPicker('内存占用', 'memory')}
        ${this._entityPicker('可用内存', 'mem_free')}
        ${this._entityPicker('运行时间', 'uptime')}
        ${this._entityPicker('在线终端', 'online_user')}
        ${this._entityPicker('连接数', 'connect_num')}
        ${this._entityPicker('LAN IP', 'lan_ip')}
        ${this._entityPicker('AP 在线数', 'ap_online')}

        <h4 style="margin:8px 0 4px;color:#666">存储 (NAS)</h4>
        ${this._entityPicker('存储卷1', 'vol1')}
        ${this._entityPicker('存储卷2', 'vol2')}

        <h4 style="margin:8px 0 4px;color:#666">硬盘 (NAS)</h4>
        ${[1,2,3,4,5,6,7,8].map(i => html`
          <div style="margin-bottom:4px;padding:4px;background:#333;border-radius:4px">
            <strong>硬盘${i}</strong>
            <input .value="${this.config[`disk${i}_name`] || ''}"
              @input="${e => this._update(`disk${i}_name`, e.target.value)}"
              style="width:100%;padding:4px;margin:2px 0" placeholder="名称" />
            ${this._entityPicker('温度', `disk${i}_temp`)}
            ${this._entityPicker('状态', `disk${i}_status`)}
          </div>`)}

        <h4 style="margin:8px 0 4px;color:#666">网络 (路由器)</h4>
        ${this._entityPicker('下载速度', 'download')}
        ${this._entityPicker('上传速度', 'upload')}
        ${this._entityPicker('累计下载', 'totaldown')}
        ${this._entityPicker('累计上传', 'totalup')}

        <h4 style="margin:8px 0 4px;color:#666">WAN 信息</h4>
        ${this._entityPicker('WAN1 IP', 'wan_ip')}
        ${this._entityPicker('WAN2 IP', 'wan2_ip')}
        ${this._entityPicker('WAN IPv6', 'wan6_ip')}

        <h4 style="margin:8px 0 4px;color:#666">电源 (NAS)</h4>
        ${this._entityPicker('功率', 'power_watt')}
        ${this._entityPicker('电压', 'power_volt')}
        ${this._entityPicker('电流', 'power_current')}

        <h4 style="margin:8px 0 4px;color:#666">容器 (NAS)</h4>
        <label style="font-size:12px;color:#888">JSON: [["名称","switch_entity"],...]</label>
        <textarea .value="${this.config.containers || ''}"
          @input="${e => this._update('containers', e.target.value)}"
          style="width:100%;height:60px;padding:4px" placeholder='[["冬瓜HA","switch.xxx"],...]'></textarea>
      </div>`;
  }
}
customElements.define('aidan-device-card-editor', AidanDeviceCardEditor);

// ──────────────────────────────────────────────
// 卡片本体
// ──────────────────────────────────────────────
class AidanDeviceCard extends LitElement {
  static get properties() {
    return { hass: { type: Object }, config: { type: Object } };
  }

  static getConfigElement() { return document.createElement('aidan-device-card-editor'); }
  static getStubConfig() { return { name: '设备', status: '' }; }
  getCardSize() { return 4; }

  setConfig(config) { this.config = config || {}; }

  // ── 实体读取 ──
  _state(eid) {
    if (!eid || !this.hass) return null;
    const s = this.hass.states[eid];
    return s ? { state: s.state, attributes: s.attributes, unit: s.attributes.unit_of_measurement || '' } : null;
  }
  _stateVal(eid, fallback = '—') {
    const s = this._state(eid);
    return s ? s.state : fallback;
  }

  // ── 温度自动转换 ──
  _temp(eid) {
    const s = this._state(eid);
    if (!s) return { val: '—', unit: '', color: '#888' };
    let v = parseFloat(s.state);
    if (isNaN(v)) return { val: s.state, unit: '', color: '#888' };
    // °F → °C
    if (s.unit && (s.unit.includes('°F') || s.unit.includes('F'))) {
      v = (v - 32) * 5 / 9;
    }
    v = Math.round(v * 10) / 10;
    let color = '#4caf50';
    if (v >= 70) color = '#f44336';
    else if (v >= 50) color = '#ff9800';
    return { val: v, unit: '°C', color };
  }

  // ── 进度条颜色 ──
  _barColor(val) {
    if (val >= 90) return '#f44336';
    if (val >= 70) return '#ff9800';
    if (val >= 50) return '#ffc107';
    return '#4caf50';
  }

  // ── 运行时间格式化 ──
  _formatUptime(eid) {
    const raw = this._stateVal(eid, '');
    if (!raw) return '—';
    // 如果已经是中文格式
    if (raw.includes('天') || raw.includes('时') || raw.includes('分') || raw.includes('秒')) {
      return raw.replace(/钟/g, '');
    }
    const sec = parseInt(raw);
    if (isNaN(sec)) return raw;
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    let r = '';
    if (d > 0) r += d + '天';
    if (h > 0) r += h + '时';
    if (!r && m > 0) r = m + '分';
    return r || '<1分';
  }

  // ── 判断某区块是否需要显示 ──
  _hasSystem() {
    const c = this.config;
    return c.cpu || c.mb_temp || c.memory || c.mem_free
      || c.online_user || c.connect_num || c.lan_ip;
  }
  _hasStorage() { return !!(this.config.vol1 || this.config.vol2); }
  _hasDisks() {
    for (let i = 1; i <= 8; i++) {
      if (this.config[`disk${i}_name`] || this.config[`disk${i}_temp`]) return true;
    }
    return false;
  }
  _hasNetwork() { return !!(this.config.download || this.config.upload); }
  _hasWAN() { return !!(this.config.wan_ip || this.config.wan2_ip || this.config.wan6_ip); }
  _hasPower() { return !!(this.config.power_watt || this.config.power_volt || this.config.power_current); }
  _hasContainers() { return !!this.config.containers; }

  // ── 渲染 ──
  render() {
    const c = this.config;
    const name = c.name || '设备';

    // 主题 — 与 xiaoshi _evaluateTheme() 完全一致
    const theme = this._evaluateTheme();
    const fgColor = theme === 'light' ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)';
    const bgColor = theme === 'light' ? 'rgb(255, 255, 255)' : 'rgb(50, 50, 50)';

    // 判断设备类型 → 图标和配色
    const isNas = this._hasStorage() || this._hasDisks() || c.mem_free;
    const deviceIcon = c.icon || (isNas ? '🗄️' : '🌐');
    const accentColor = isNas ? '#007aff' : '#34c759';

    // 状态
    const status = this._stateVal(c.status, '');
    const statusOn = status === '正常' || status === 'OK' || status === 'ok';

    return html`
      <ha-card style="
        background: ${bgColor};
        border-radius: 16px;
        overflow: hidden;
        padding: 0;
        color: ${fgColor};
      ">
        <!-- Header -->
        <div style="
          display:flex;align-items:center;padding:16px 20px;
          border-bottom: 1px solid rgba(128,128,128,0.1);
        ">
          <div style="
            width:40px;height:40px;border-radius:10px;
            background: linear-gradient(135deg, ${accentColor}, ${isNas ? '#5ac8fa' : '#30d158'});
            display:flex;align-items:center;justify-content:center;
            font-size:20px;flex-shrink:0;
          ">${deviceIcon}</div>
          <div style="flex:1;margin-left:12px;min-width:0;">
            <div style="display:flex;justify-content:space-between;align-items:baseline;">
              <span style="font-size:17px;font-weight:600">${name}</span>
              ${c.uptime ? html`
                <span style="font-size:12px;color:#888;white-space:nowrap;flex-shrink:0;margin-left:8px;">
                  ⏱ ${this._formatUptime(c.uptime)}
                </span>` : ''}
            </div>
            ${status ? html`
              <div style="font-size:12px;margin-top:2px;color:${statusOn ? '#4caf50' : '#ff9800'}">
                ${statusOn ? '●' : '○'} ${status}
              </div>` : ''}
          </div>
        </div>

        <div style="padding:12px 16px">
          ${this._renderSystem()}
          ${this._renderStorage()}
          ${this._renderDisks()}
          ${this._renderContainers()}
          ${this._renderPower()}
          ${this._renderNetwork()}
          ${this._renderWAN()}
        </div>
      </ha-card>`;
  }

  // ── 系统区 ──
  _renderSystem() {
    if (!this._hasSystem()) return '';
    const c = this.config;

    // 主板温度+内存 合并为一行（如果两者都存在）
    const hasMbMem = c.mb_temp && c.memory;

    // 统计单元格数（mb+mem合并后算1个）
    const cells = [
      c.cpu,
      (c.mb_temp || c.memory) ? 1 : 0,
      c.mem_free,
      c.online_user, c.connect_num, c.lan_ip
    ].filter(Boolean).length;
    const cols = cells <= 3 ? cells : 3;

    return html`
      <div style="margin-bottom:10px">
        <div style="font-size:13px;font-weight:600;color:#888;margin-bottom:8px;display:flex;align-items:center;">
          <span style="width:6px;height:6px;background:#4caf50;border-radius:50%;display:inline-block;margin-right:6px;"></span>
          系统状态
        </div>
        <div style="display:grid;grid-template-columns:repeat(${cols}, 1fr);gap:6px;">
          ${this._sysCell('CPU', c.cpu, '%', 'bar')}
          ${hasMbMem ? this._sysCellDual('主板温度', c.mb_temp, '内存', c.memory) : ''}
          ${(!hasMbMem && c.memory) ? this._sysCell('内存', c.memory, '%', 'bar') : ''}
          ${(!hasMbMem && c.mb_temp) ? this._sysCellTemp('主板温度', c.mb_temp) : ''}
          ${this._sysCell('可用内存', c.mem_free, '', 'mem')}
          ${this._sysCell('在线终端', c.online_user, '', 'text')}
          ${this._sysCell('连接数', c.connect_num, '', 'text')}
          ${this._sysCell('LAN IP', c.lan_ip, '', 'text')}
        </div>
      </div>`;
  }

  _sysCellDual(label1, eid1, label2, eid2) {
    const t = this._temp(eid1);
    const memVal = this._stateVal(eid2, '—');
    return html`
      <div style="padding:8px 10px;background:rgba(128,128,128,0.06);border-radius:10px;">
        <div style="font-size:11px;color:#999;margin-bottom:3px">${label1} / ${label2}</div>
        <div style="font-size:13px;font-weight:500;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span>${t.val}${t.unit}</span>
          <span style="width:8px;height:8px;border-radius:50%;background:${t.color};flex-shrink:0;"></span>
          <span style="color:#666;">|</span>
          <span>${memVal}%</span>
        </div>
      </div>`;
  }

  _sysCell(label, eid, suffix, mode) {
    if (!eid) return '';
    let value;
    if (mode === 'uptime') {
      value = this._formatUptime(eid);
    } else if (mode === 'mem') {
      value = this._formatSize(this._stateVal(eid, '0'), 'GB');
    } else if (mode === 'bar') {
      const v = parseFloat(this._stateVal(eid, '0'));
      const pct = isNaN(v) ? 0 : Math.min(100, Math.max(0, v));
      value = html`
        <div style="display:flex;align-items:center;gap:6px">
          <span>${v}${suffix}</span>
          <div style="flex:1;height:4px;background:rgba(128,128,128,0.2);border-radius:2px;overflow:hidden">
            <div style="width:${pct}%;height:100%;background:${this._barColor(pct)};border-radius:2px;"></div>
          </div>
        </div>`;
    } else {
      value = this._stateVal(eid) + suffix;
    }
    return html`
      <div style="padding:8px 10px;background:rgba(128,128,128,0.06);border-radius:10px;">
        <div style="font-size:11px;color:#999;margin-bottom:3px">${label}</div>
        <div style="font-size:14px;font-weight:500">${value}</div>
      </div>`;
  }

  _sysCellTemp(label, eid) {
    if (!eid) return '';
    const t = this._temp(eid);
    return html`
      <div style="padding:8px 10px;background:rgba(128,128,128,0.06);border-radius:10px;">
        <div style="font-size:11px;color:#999;margin-bottom:3px">${label}</div>
        <div style="font-size:14px;font-weight:500;display:flex;align-items:center;gap:6px">
          <span>${t.val}${t.unit}</span>
          <span style="width:8px;height:8px;border-radius:50%;background:${t.color};flex-shrink:0;"></span>
        </div>
      </div>`;
  }

  // ── 存储区 ──
  _renderStorage() {
    if (!this._hasStorage()) return '';
    const c = this.config;
    return html`
      <div style="margin-bottom:10px">
        <div style="font-size:13px;font-weight:600;color:#888;margin-bottom:8px;display:flex;align-items:center;">
          <span style="width:6px;height:6px;background:#4caf50;border-radius:50%;display:inline-block;margin-right:6px;"></span>
          存储空间
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
          ${c.vol1 ? this._storageRow('Vol 1', c.vol1) : ''}
          ${c.vol2 ? this._storageRow('Vol 2', c.vol2) : ''}
        </div>
      </div>`;
  }

  _storageRow(label, eid) {
    const val = this._formatSize(this._stateVal(eid, '—'), 'TB');
    return html`
      <div style="display:flex;justify-content:space-between;align-items:center;
        padding:10px 12px;background:rgba(128,128,128,0.06);border-radius:10px;">
        <div style="display:flex;align-items:center;gap:8px">
          <span>💾</span>
          <span style="font-size:13px">${label}</span>
        </div>
        <span style="font-size:13px;font-weight:500">${val}</span>
      </div>`;
  }

  // ── 字节格式化（实体已输出正确单位，仅加后缀）──
  _formatSize(raw, unit) {
    if (!raw || raw === '—') return raw;
    const n = parseFloat(raw);
    if (isNaN(n)) return raw;
    return n.toFixed(1).replace(/\.0$/, '') + ' ' + unit;
  }

  // ── 硬盘名称缩短 ──
  _shortDisk(name) {
    if (/ssd/i.test(name)) return 'SSD';
    return name.replace(/\d{4,}/g, (m) => m[0] + '…');
  }

  // ── 硬盘区 ──
  _renderDisks() {
    if (!this._hasDisks()) return '';
    const c = this.config;
    const disks = [];
    for (let i = 1; i <= 8; i++) {
      const name = c[`disk${i}_name`] || '';
      const temp = c[`disk${i}_temp`] || '';
      const status = c[`disk${i}_status`] || '';
      if (name || temp) disks.push({ name: name || `硬盘${i}`, temp, status });
    }
    return html`
      <div style="margin-bottom:10px">
        <div style="font-size:13px;font-weight:600;color:#888;margin-bottom:8px;display:flex;align-items:center;">
          <span style="width:6px;height:6px;background:#4caf50;border-radius:50%;display:inline-block;margin-right:6px;"></span>
          硬盘
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
          ${disks.map(d => {
            const t = this._temp(d.temp);
            const s = this._stateVal(d.status, '');
            const diskOn = s && (s === '正常' || s === 'OK' || s === 'ok' || s === '活动中' || s === 'active' || s === 'running');
            return html`
              <div style="padding:8px 10px;background:rgba(128,128,128,0.06);border-radius:10px;">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
                  <div style="display:flex;align-items:center;gap:6px;min-width:0;">
                    <span>💿</span>
                    <span style="font-size:12px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                      ${this._shortDisk(d.name)}
                    </span>
                  </div>
                  <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;white-space:nowrap;">
                    ${d.temp ? html`
                      <span style="font-size:12px;color:${t.color}">${t.val}${t.unit}</span>
                    ` : ''}
                    ${s ? html`
                      <span style="font-size:11px;padding:1px 8px;border-radius:4px;
                        background:${diskOn ? 'rgba(76,175,80,0.15)' : 'rgba(244,67,54,0.15)'};
                        color:${diskOn ? '#4caf50' : '#f44336'};">${diskOn ? '运行' : '停止'}</span>
                    ` : ''}
                  </div>
                </div>
              </div>`;
          })}
        </div>
      </div>`;
  }

  // ── 网络区 ──
  _renderNetwork() {
    if (!this._hasNetwork()) return '';
    const c = this.config;
    return html`
      <div style="margin-bottom:10px">
        <div style="font-size:13px;font-weight:600;color:#888;margin-bottom:8px;display:flex;align-items:center;">
          <span style="width:6px;height:6px;background:#34c759;border-radius:50%;display:inline-block;margin-right:6px;"></span>
          网络流量
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
          ${this._netCell('⬇ 下载', c.download, 'MB/s')}
          ${this._netCell('⬆ 上传', c.upload, 'MB/s')}
          ${this._netCell('累计下载', c.totaldown, 'GB')}
          ${this._netCell('累计上传', c.totalup, 'GB')}
        </div>
      </div>`;
  }

  _netCell(label, eid, unit) {
    if (!eid) return '';
    const val = this._stateVal(eid, '—');
    return html`
      <div style="padding:8px 10px;background:rgba(128,128,128,0.06);border-radius:10px;">
        <div style="font-size:11px;color:#999;margin-bottom:3px">${label}</div>
        <div style="font-size:14px;font-weight:500">${val} ${unit}</div>
      </div>`;
  }

  // ── WAN 区 ──
  _renderWAN() {
    if (!this._hasWAN()) return '';
    const c = this.config;
    return html`
      <div style="margin-bottom:10px">
        <div style="font-size:13px;font-weight:600;color:#888;margin-bottom:8px;display:flex;align-items:center;">
          <span style="width:6px;height:6px;background:#34c759;border-radius:50%;display:inline-block;margin-right:6px;"></span>
          WAN 信息
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
          ${c.wan_ip ? html`
            <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(128,128,128,0.06);border-radius:10px;">
              <span style="font-size:11px;color:#999;min-width:36px">WAN1</span>
              <span style="font-size:13px;font-weight:500;font-family:monospace">${this._stateVal(c.wan_ip, '—')}</span>
            </div>` : ''}
          ${c.wan2_ip ? html`
            <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(128,128,128,0.06);border-radius:10px;">
              <span style="font-size:11px;color:#999;min-width:36px">WAN2</span>
              <span style="font-size:13px;font-weight:500;font-family:monospace">${this._stateVal(c.wan2_ip, '—')}</span>
            </div>` : ''}
          ${c.wan6_ip ? html`
            <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(128,128,128,0.06);border-radius:10px;grid-column:1/-1;">
              <span style="font-size:11px;color:#999;min-width:36px">IPv6</span>
              <span style="font-size:12px;font-weight:500;font-family:monospace;word-break:break-all">${this._stateVal(c.wan6_ip, '—')}</span>
            </div>` : ''}
        </div>
      </div>`;
  }

  // ── 电源区 ──
  _renderPower() {
    if (!this._hasPower()) return '';
    const c = this.config;
    return html`
      <div style="margin-bottom:10px">
        <div style="font-size:13px;font-weight:600;color:#888;margin-bottom:8px;display:flex;align-items:center;">
          <span style="width:6px;height:6px;background:#ff9800;border-radius:50%;display:inline-block;margin-right:6px;"></span>
          电源计量
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">
          ${this._powerCell('功率', c.power_watt, 'W')}
          ${this._powerCell('电压', c.power_volt, 'V')}
          ${this._powerCell('电流', c.power_current, 'A')}
        </div>
      </div>`;
  }

  _powerCell(label, eid, unit) {
    if (!eid) return '';
    const val = this._stateVal(eid, '—');
    return html`
      <div style="padding:8px 10px;background:rgba(128,128,128,0.06);border-radius:10px;text-align:center;">
        <div style="font-size:11px;color:#999;margin-bottom:3px">${label}</div>
        <div style="font-size:15px;font-weight:600">${val}<span style="font-size:11px;font-weight:400;color:#999"> ${unit}</span></div>
      </div>`;
  }

  // ── 容器区 ──
  _renderContainers() {
    if (!this._hasContainers()) return '';
    const c = this.config;
    let containers = [];
    try { containers = JSON.parse(c.containers); } catch (e) { return ''; }
    if (!containers.length) return '';

    return html`
      <div style="margin-bottom:10px">
        <div style="font-size:13px;font-weight:600;color:#888;margin-bottom:8px;display:flex;align-items:center;">
          <span style="width:6px;height:6px;background:#007aff;border-radius:50%;display:inline-block;margin-right:6px;"></span>
          容器/虚拟机
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
          ${containers.map(([name, entity]) => {
            const s = this._state(entity);
            const on = s && (s.state === 'on' || s.state === 'running');
            return html`
              <div style="padding:6px 10px;background:rgba(128,128,128,0.06);border-radius:10px;
                display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">📦 ${name}</span>
                <span style="font-size:11px;padding:1px 8px;border-radius:4px;
                  background:${on ? 'rgba(76,175,80,0.15)' : 'rgba(244,67,54,0.15)'};
                  color:${on ? '#4caf50' : '#f44336'};">
                  ${on ? '运行' : '停止'}
                </span>
              </div>`;
          })}
        </div>
      </div>`;
  }

  // ── 主题 — 与 xiaoshi 原始卡片 _evaluateTheme() 完全一致 ──
  _evaluateTheme() {
    try {
      const mode = this.config ? this.config.theme : 'system';
      if (mode === 'light') return 'light';
      if (mode === 'dark') return 'dark';
      if (mode === 'system' || !mode) {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
        return 'light';
      }
      if (mode === 'sun') {
        const sunState = this.hass && this.hass.states && this.hass.states['sun.sun'];
        if (sunState && sunState.state === 'above_horizon') return 'light';
        if (sunState && sunState.state === 'below_horizon') return 'dark';
        return 'light';
      }
      if (mode === 'function' || (typeof mode === 'string' && mode.includes('theme'))) {
        if (typeof window.theme === 'function') return window.theme() || 'light';
        return 'light';
      }
      return mode;
    } catch (e) { return 'light'; }
  }

  static get styles() {
    return css`
      :host { display: block; }
      ha-card { transition: all 0.2s ease; }
    `;
  }
}

customElements.define('aidan-device-card', AidanDeviceCard);
