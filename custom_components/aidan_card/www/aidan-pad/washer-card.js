console.info("%c Aidan卡-平板洗衣机 %c washer-card ", "color: #0096c8; font-weight: bold;", "color: white; font-weight: bold; background: black");

const whenDefined3 = (t) => customElements.whenDefined(t);
await Promise.race([whenDefined3("ha-card"), whenDefined3("ha-panel-lovelace")]);
const LitEl = window.LitElement || Object.getPrototypeOf(customElements.get("ha-card"));
const h = LitEl.prototype.html;
const css = LitEl.prototype.css;

// ── 16个洗涤模式 ──
const WASH_MODES = [
  "日常洗", "快速洗", "婴童洗", "高温洗",
  "内衣", "单脱水", "桶自洁", "自定义",
  "除螨", "漂洗加脱水", "单烘干", "浸泡洗",
  "丝绸洗", "强力洗", "毛巾", "袜子"
];

function _evaluateTheme(config, hass) {
  try {
    const mode = config ? config.theme : 'system';
    if (mode === 'light') return 'light';
    if (mode === 'dark') return 'dark';
    if (mode === 'system' || !mode) {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
      return 'light';
    }
    if (mode === 'sun') {
      const sunState = hass && hass.states && hass.states['sun.sun'];
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

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'aidan-washer-card',
  name: 'Aidan-平板洗衣机',
  description: '平板端洗衣机控制卡（状态+倒计时+16模式+控制）',
  preview: true
});

class AidanWasherCard extends LitEl {
  static get properties() {
    return { hass: { type: Object }, config: { type: Object } };
  }

  setConfig(config) { this.config = config || {}; }

  _state(eid) {
    if (!this.hass || !eid) return null;
    const s = this.hass.states[eid];
    return s ? { state: s.state, attributes: s.attributes } : null;
  }
  _stateVal(eid, fallback = '—') {
    const s = this._state(eid);
    return s ? s.state : fallback;
  }

  _callService(domain, service, data) {
    if (!this.hass) return;
    this.hass.callService(domain, service, data);
  }

  // ── 状态文本 ──
  _statusText() {
    const c = this.config;
    // 先检查报错
    const fault = this._state(c.fault);
    if (fault && fault.state && fault.state !== '0' && fault.state !== 'unknown' && fault.state !== 'unavailable') {
      return '⚠️ ' + fault.state;
    }
    // 工作状态
    const st = this._state(c.status);
    if (st && st.state && st.state !== 'unknown' && st.state !== 'unavailable') {
      return st.state;
    }
    // 当前进程
    const proc = this._state(c.process);
    if (proc && proc.state && proc.state !== 'unknown' && proc.state !== 'unavailable') {
      return proc.state;
    }
    // 开机显示模式，关机显示待机
    const sw = this._state(c.entity);
    if (sw && sw.state === 'on') {
      return this._stateVal(c.mode, '运行中');
    }
    return '待机中';
  }

  // ── 倒计时数值 ──
  _timeValue() {
    const c = this.config;
    const sw = this._state(c.entity);
    if (sw && sw.state === 'on') {
      const left = this._state(c.left_time);
      if (left && left.state && left.state !== '0' && left.state !== 'unknown' && left.state !== 'unavailable') {
        return left.state;
      }
      const remain = this._state(c.time_remain);
      if (remain && remain.state && remain.state !== '0' && remain.state !== 'unknown' && remain.state !== 'unavailable') {
        return remain.state;
      }
    }
    return '—';
  }

  _timeUnit() {
    const c = this.config;
    const total = this._state(c.time_total);
    if (total && total.state && total.state !== '0' && total.state !== 'unknown' && total.state !== 'unavailable') {
      return '分钟 / 总 ' + total.state + ' 分钟';
    }
    return '分钟';
  }

  // ── 进度 (0~1) ──
  _progress() {
    const c = this.config;
    const sw = this._state(c.entity);
    if (!sw || sw.state !== 'on') return 0;
    const leftRaw = this._state(c.left_time);
    const remainRaw = this._state(c.time_remain);
    const totalRaw = this._state(c.time_total);
    const remaining = leftRaw && leftRaw.state ? parseFloat(leftRaw.state) :
                     (remainRaw && remainRaw.state ? parseFloat(remainRaw.state) : NaN);
    const total = totalRaw && totalRaw.state ? parseFloat(totalRaw.state) : NaN;
    if (isNaN(remaining) || isNaN(total) || total <= 0) return 0;
    return Math.max(0, Math.min(1, remaining / total));
  }

  // ── SVG 半圆环路径 ──
  _arcPath(pct, r, cx, cy) {
    if (pct <= 0) return '';
    const angle = Math.PI - pct * Math.PI; // π → 0
    const x2 = cx + r * Math.cos(angle);
    const y2 = cy - r * Math.sin(angle);
    return `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
  }

  // ── 圆环颜色（根据状态变色） ──
  _ringColor(isLight) {
    const c = this.config;
    const sw = this._state(c.entity);
    if (!sw || sw.state !== 'on') return isLight ? 'rgb(200,200,200)' : 'rgb(100,100,100)';
    const fault = this._state(c.fault);
    if (fault && fault.state && fault.state !== '0' && fault.state !== 'unknown' && fault.state !== 'unavailable') {
      return 'rgb(255,106,106)';
    }
    return 'rgb(0,120,200)';
  }

  // ── 模式选择 ──
  _selectMode(mode) {
    const ent = this.config.mode;
    if (!ent) return;
    this._callService('select', 'select_option', { entity_id: ent, option: mode });
  }

  // ── 渲染 ──
  render() {
    if (!this.hass || !this.config) return h`<ha-card>Loading...</ha-card>`;

    const theme = _evaluateTheme(this.config, this.hass);
    const isLight = theme === 'light';
    const fg = isLight ? 'rgb(0,0,0)' : 'rgb(255,255,255)';
    const subFg = isLight ? 'rgb(100,100,100)' : 'rgb(180,180,180)';
    const bg = isLight ? 'rgb(255,255,255)' : 'rgb(50,50,50)';
    const rowBg = isLight ? 'rgb(230,230,230)' : 'rgb(80,80,80)';
    const accent = 'rgb(0,120,200)';

    const c = this.config;
    const sw = this._state(c.entity);
    const isOn = sw && sw.state === 'on';
    const curMode = this._stateVal(c.mode, '');
    const timeVal = this._timeValue();
    const timeUnit = this._timeUnit();
    const status = this._statusText();

    // 水耗/电耗
    const waterVal = this._state(c.water);
    const powerVal = this._state(c.power);

    // 童锁
    const lock = this._state(c.child_lock);
    const isLocked = lock && lock.state === '1';

    // 预约
    const schedule = this._state(c.schedule);

    const ringColor = this._ringColor(isLight);
    const progress = this._progress();
    const W = 280;

    // 半圆环参数：圆心 (140, 95)，半径 75
    const svgCX = 140, svgCY = 95, svgR = 75;
    const arcTrack = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)';

    return h`<ha-card style="width:${W}px;background:${bg};border-radius:15px;padding:0;overflow:hidden;color:${fg};">

      <!-- ═══ Header：名称 ═══ -->
      <div style="padding:20px 20px 0 20px;">
        <div style="font-size:19px;font-weight:bold;text-align:center;">${c.name || '洗衣机'}</div>
      </div>

      <!-- ═══ 半圆环 + 时间 + 状态 ═══ -->
      <div style="position:relative;height:118px;margin-top:4px;">
        <!-- SVG 半圆环 -->
        <svg viewBox="0 0 280 105" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;">
          <!-- 底轨 -->
          <path d="${this._arcPath(1, svgR, svgCX, svgCY)}"
            fill="none" stroke="${arcTrack}" stroke-width="6" stroke-linecap="round"/>
          <!-- 进度弧 -->
          ${progress > 0 ? h`
          <path d="${this._arcPath(progress, svgR, svgCX, svgCY)}"
            fill="none" stroke="${ringColor}" stroke-width="6" stroke-linecap="round"
            style="transition:stroke-dashoffset 1s ease;"/>
          ` : ''}
        </svg>
        <!-- 倒计时数字（圆环内部） -->
        <div style="position:relative;z-index:1;text-align:center;padding-top:16px;">
          <div style="font-size:56px;font-weight:bold;line-height:1.1;">${timeVal}</div>
          <div style="font-size:11px;color:${subFg};margin-top:2px;">${status}</div>
        </div>
      </div>

      <!-- ═══ 单位 ═══ -->
      <div style="text-align:center;padding:0 0 10px 0;">
        <div style="font-size:12px;color:${isLight ? 'rgb(140,140,140)' : 'rgb(160,160,160)'};">${timeUnit}</div>
      </div>

      <!-- ═══ 水耗 & 电耗 ═══ -->
      <div style="padding:8px 20px;display:flex;gap:20px;">
        <div style="display:flex;align-items:center;gap:6px;font-size:12px;">
          <span style="color:${isLight ? 'rgb(0,150,220)' : 'rgb(100,200,255)'};">💧</span>
          <span>${waterVal ? waterVal.state + ' L' : '-- L'}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;font-size:12px;">
          <span style="color:${isLight ? 'rgb(255,165,0)' : 'rgb(255,200,100)'};">⚡</span>
          <span>${powerVal ? powerVal.state + ' kWh' : '-- kWh'}</span>
        </div>
      </div>

      <!-- ═══ 16个模式 4行×4列 ═══ -->
      <div style="padding:0 16px;margin-top:8px;">
        ${[0, 1, 2, 3].map(rowIdx => h`
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:3px;
            ${rowIdx === 0 ? '' : 'margin-top:3px'};
            background:${rowBg};border-radius:10px;padding:0;">
            ${WASH_MODES.slice(rowIdx*4, rowIdx*4+4).map(m => {
              const active = curMode === m;
              return h`
                <div @click="${() => this._selectMode(m)}"
                  style="height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;
                    background:${active ? accent : 'transparent'};
                    color:${active ? '#fff' : fg};
                    font-size:11px;cursor:pointer;transition:background 0.15s;">
                  ${m}
                </div>`;
            })}
          </div>
        `)}
      </div>

      <!-- ═══ 开关按钮 ═══ -->
      <div style="padding:0 16px;margin-top:10px;">
        <div @click="${() => this.hass.callService('switch', isOn ? 'turn_off' : 'turn_on', { entity_id: c.entity })}"
          style="height:40px;background:${rowBg};border-radius:10px;display:flex;align-items:center;justify-content:center;
            gap:8px;font-size:12px;cursor:pointer;">
          <span>${isOn ? '⏻ 关闭洗衣机' : '⏻ 开启洗衣机'}</span>
        </div>
      </div>

      <!-- ═══ 控制按钮：开始/暂停/童锁/预约 ═══ -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;padding:10px 16px 16px;gap:0;">
        ${[
          {
            icon: '▶', label: '开始', color: isLight ? 'rgb(0,150,220)' : 'rgb(100,200,255)',
            action: () => this._callService('button', 'press', { entity_id: c.start })
          },
          {
            icon: '⏸', label: '暂停', color: isLight ? 'rgb(255,140,0)' : 'rgb(255,180,80)',
            action: () => this._callService('button', 'press', { entity_id: c.pause })
          },
          {
            icon: isLocked ? '🔒' : '🔓', label: '童锁',
            color: isLocked ? 'rgb(255,165,0)' : fg,
            bg: isLocked ? 'rgba(255,165,0,0.3)' : 'transparent',
            action: () => this._callService('select', 'select_option', { entity_id: c.child_lock, option: isLocked ? '0' : '1' })
          },
          {
            icon: '🕐',
            label: (schedule && schedule.state && schedule.state !== '0' && schedule.state !== 'unknown' && schedule.state !== 'unavailable')
              ? schedule.state + 'h' : '预约',
            color: (schedule && schedule.state && schedule.state !== '0' && schedule.state !== 'unknown' && schedule.state !== 'unavailable')
              ? 'rgb(255,165,0)' : fg,
            bg: (schedule && schedule.state && schedule.state !== '0' && schedule.state !== 'unknown' && schedule.state !== 'unavailable')
              ? 'rgba(255,165,0,0.3)' : 'transparent',
            action: () => {
              if (c.schedule) this._callService('number', 'set_value', { entity_id: c.schedule, value: '0' });
            }
          }
        ].map(btn => h`
          <div @click="${btn.action}"
            style="height:40px;border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;
              background:${btn.bg || 'transparent'};cursor:pointer;">
            <span style="font-size:18px;color:${btn.color};">${btn.icon}</span>
            <span style="font-size:10px;color:${btn.color};">${btn.label}</span>
          </div>
        `)}
      </div>

    </ha-card>`;
  }

  getCardSize() { return 5; }

  static get styles() {
    return css`:host{display:block;}`;
  }
}

customElements.define('aidan-washer-card', AidanWasherCard);
