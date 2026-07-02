console.info("%c Aidan卡-平板摄像头 %c camera-card ", "color: #0096c8; font-weight: bold;", "color: white; font-weight: bold; background: black");

const whenDefinedCam = (t) => customElements.whenDefined(t);
await Promise.race([whenDefinedCam("ha-card"), whenDefinedCam("ha-panel-lovelace")]);
const LitEl = window.LitElement || Object.getPrototypeOf(customElements.get("ha-card"));
const h = LitEl.prototype.html;
const css = LitEl.prototype.css;

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
  type: 'aidan-pad-camera-card',
  name: 'Aidan-平板摄像头',
  description: '平板端摄像头卡片（实时画面+开关+移动侦测+追踪+夜视+录像模式+存储）',
  preview: true
});

class AidanPadCameraCard extends LitEl {
  static get properties() {
    return { hass: { type: Object }, config: { type: Object } };
  }

  setConfig(config) { this.config = config || {}; }

  _state(eid) {
    if (!this.hass || !eid) return null;
    const s = this.hass.states[eid];
    return s ? { state: s.state, attributes: s.attributes } : null;
  }

  _formatBytes(bytes) {
    const b = parseFloat(bytes);
    if (isNaN(b)) return '--';
    if (b >= 1073741824) return (b / 1073741824).toFixed(1) + ' GB';
    if (b >= 1048576) return (b / 1048576).toFixed(1) + ' MB';
    return (b / 1024).toFixed(1) + ' KB';
  }

  _callService(domain, service, data) {
    if (!this.hass) return;
    this.hass.callService(domain, service, data);
  }

  _toggleSwitch() {
    const se = this.config.switch_entity;
    if (!se) return;
    const s = this._state(se);
    const svc = s?.state === 'on' ? 'turn_off' : 'turn_on';
    this._callService('switch', svc, { entity_id: se });
  }

  _toggleMotion() {
    const me = this.config.motion_entity;
    if (!me) return;
    const s = this._state(me);
    const svc = s?.state === 'on' ? 'turn_off' : 'turn_on';
    this._callService('switch', svc, { entity_id: me });
  }

  _toggleTracking() {
    const te = this.config.tracking_entity;
    if (!te) return;
    const s = this._state(te);
    const svc = s?.state === 'on' ? 'turn_off' : 'turn_on';
    this._callService('switch', svc, { entity_id: te });
  }

  _selectOption(entity, option) {
    if (!entity) return;
    this._callService('select', 'select_option', { entity_id: entity, option: option });
  }

  _handleFormat() {
    const fe = this.config.format_entity;
    if (!fe) return;
    this._callService('button', 'press', { entity_id: fe });
  }

  // ── 图标模式：点击调用 popup_card 服务 ──
  _openPopup() {
    const c = this.config;
    const popupCfg = {
      type: 'custom:aidan-pad-camera-card',
      theme: c.theme || 'system',
      entity: c.entity,
      switch_entity: c.switch_entity,
      motion_entity: c.motion_entity,
      tracking_entity: c.tracking_entity,
      night_entity: c.night_entity,
      rec_entity: c.rec_entity,
      storage_used: c.storage_used,
      storage_free: c.storage_free,
      storage_status: c.storage_status,
      format_entity: c.format_entity,
      name: c.name || '阁楼摄像头'
    };
    this.hass.callService('popup_card', 'show', {
      card: [popupCfg],
      popup_width: c.popup_width || '680px',
      popup_top: c.popup_top || '50%'
    });
  }

  // ── 图标模式专用：渲染小图标 ──
  _renderIcon() {
    const c = this.config;
    const st = c.entity ? this.hass.states[c.entity] : null;
    const isOff = st && st.state === 'off';
    const iconSrc = isOff ? '/local/UI/安防/camera_off.svg' : '/local/UI/安防/camera_on.svg';
    return h`<img src="${iconSrc}"
      @click="${() => this._openPopup()}"
      style="width:45px;height:45px;cursor:pointer;display:block;" />`;
  }

  // ── 完整卡片内容（图标模式弹出时复用） ──
  _renderFullCard() {
    if (!this.hass || !this.config) return h`<ha-card>Loading...</ha-card>`;

    const theme = _evaluateTheme(this.config, this.hass);
    const isLight = theme === 'light';
    const fg = isLight ? 'rgb(0,0,0)' : 'rgb(255,255,255)';
    const subFg = isLight ? 'rgb(100,100,100)' : 'rgb(180,180,180)';
    const bg = isLight ? 'rgb(255,255,255)' : 'rgb(50,50,50)';
    const cellBg = isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)';
    const btnBg = isLight ? 'rgb(230,230,230)' : 'rgb(80,80,80)';
    const accent = '#007aff';

    const c = this.config;
    const name = c.name || '摄像头';
    const swState = this._state(c.switch_entity);
    const isOn = swState && swState.state === 'on';
    const camEntity = c.entity;

    // 移动侦测 & 追踪
    const motion = this._state(c.motion_entity);
    const tracking = this._state(c.tracking_entity);
    const motionOn = motion && motion.state === 'on';
    const trackingOn = tracking && tracking.state === 'on';

    // 夜视 & 录像模式
    const night = this._state(c.night_entity);
    const recMode = this._state(c.rec_entity);

    // 存储
    const used = this._state(c.storage_used);
    const free = this._state(c.storage_free);
    const stStatus = this._state(c.storage_status);
    const hasStorage = used || free || stStatus;

    let usedBytes = 0, freeBytes = 0, pct = 0;
    if (used && free) {
      usedBytes = parseFloat(used.state) || 0;
      freeBytes = parseFloat(free.state) || 0;
      const total = usedBytes + freeBytes;
      if (total > 0) pct = (usedBytes / total) * 100;
    }

    return h`<ha-card style="background:${bg};border-radius:15px;padding:0;overflow:hidden;color:${fg};width:100%;">

      <!-- ═══ Header ═══ -->
      <div style="padding:16px 16px 0;display:flex;align-items:center;gap:12px;">
        <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,${accent},#5856d6);display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12,2A7,7 0 0,1 19,9C19,14.25 12,22 12,22C12,22 5,14.25 5,9A7,7 0 0,1 12,2M12,4A5,5 0 0,0 7,9C7,10 7,12 12,18.71C17,12 17,10 17,9A5,5 0 0,0 12,4M12,7.5A1.5,1.5 0 1,1 10.5,9A1.5,1.5 0 0,1 12,7.5Z"/></svg>
        </div>
        <div style="flex:1;">
          <div style="font-size:16px;font-weight:600;">${name}</div>
          <div style="font-size:13px;color:${subFg};margin-top:2px;">
            ${swState ? (isOn ? '🟢 运行中' : '⚫ 已关闭') : '未知'}
          </div>
        </div>
        ${c.switch_entity ? h`
        <div @click="${() => this._toggleSwitch()}"
          style="width:40px;height:40px;border-radius:20px;background:${isOn ? accent : btnBg};display:flex;align-items:center;justify-content:center;color:${isOn ? '#fff' : fg};font-size:18px;cursor:pointer;">
          ⏻
        </div>` : ''}
      </div>

      <!-- ═══ Camera Stream ═══ -->
      <div style="padding:12px 16px;">
        ${camEntity && isOn ? h`
        <div style="background:${cellBg};border-radius:12px;overflow:hidden;">
          <img src="${this.hass.states[camEntity]?.attributes?.entity_picture || ''}"
            style="width:100%;display:block;aspect-ratio:16/9;object-fit:cover;"
            @error="${(e) => { e.target.style.display = 'none'; }}" />
        </div>` : h`
        <div style="background:${cellBg};border-radius:12px;padding:40px;text-align:center;color:${subFg};">
          <div style="font-size:40px;margin-bottom:8px;">📷</div>
          <div style="font-size:14px;">摄像头已关闭</div>
        </div>`}
      </div>

      <!-- ═══ 控制面板 ═══ -->
      <div style="padding:0 16px 12px;display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        ${c.motion_entity ? h`
        <div @click="${() => this._toggleMotion()}"
          style="padding:10px;background:${motionOn ? accent : btnBg};border-radius:10px;display:flex;align-items:center;gap:8px;cursor:pointer;color:${motionOn ? '#fff' : fg};font-size:12px;">
          <span>👁</span>
          <span>移动侦测 ${motionOn ? '开' : '关'}</span>
        </div>` : ''}
        ${c.tracking_entity ? h`
        <div @click="${() => this._toggleTracking()}"
          style="padding:10px;background:${trackingOn ? accent : btnBg};border-radius:10px;display:flex;align-items:center;gap:8px;cursor:pointer;color:${trackingOn ? '#fff' : fg};font-size:12px;">
          <span>🎯</span>
          <span>移动追踪 ${trackingOn ? '开' : '关'}</span>
        </div>` : ''}
      </div>

      <!-- ═══ 夜视 / 录像模式 ═══ -->
      <div style="padding:0 16px 12px;display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        ${c.night_entity ? h`
        <div style="background:${btnBg};border-radius:10px;padding:10px;display:flex;align-items:center;gap:6px;">
          <span style="font-size:14px;">🌙</span>
          <select @change="${(e) => this._selectOption(c.night_entity, e.target.value)}"
            style="flex:1;background:transparent;border:none;color:${fg};font-size:12px;outline:none;cursor:pointer;"
            .value="${night ? night.state : ''}">
            <option value="" disabled>夜视模式</option>
            <option value="自动">自动</option>
            <option value="打开">始终开启</option>
            <option value="关闭">始终关闭</option>
          </select>
        </div>` : ''}
        ${c.rec_entity ? h`
        <div style="background:${btnBg};border-radius:10px;padding:10px;display:flex;align-items:center;gap:6px;">
          <span style="font-size:14px;">⏺</span>
          <select @change="${(e) => this._selectOption(c.rec_entity, e.target.value)}"
            style="flex:1;background:transparent;border:none;color:${fg};font-size:12px;outline:none;cursor:pointer;"
            .value="${recMode ? recMode.state : ''}">
            <option value="" disabled>录像模式</option>
            <option value="停止录制">关闭录像</option>
            <option value="一直录制">始终录像</option>
            <option value="仅录制移动">侦测录像</option>
          </select>
        </div>` : ''}
      </div>

      <!-- ═══ 存储 ═══ -->
      ${hasStorage ? h`
      <div style="padding:0 16px 16px;">
        <div style="font-size:12px;color:${subFg};margin-bottom:8px;font-weight:500;">💾 存储卡</div>
        <div style="background:${cellBg};border-radius:12px;padding:12px;">
          ${used && free ? h`
          <div style="margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;font-size:12px;color:${subFg};margin-bottom:4px;">
              <span>已用 ${this._formatBytes(usedBytes)}</span>
              <span>剩余 ${this._formatBytes(freeBytes)}</span>
            </div>
            <div style="height:4px;background:rgba(128,128,128,0.2);border-radius:2px;overflow:hidden;">
              <div style="height:100%;width:${pct}%;background:${pct > 80 ? '#ff3b30' : '#34c759'};border-radius:2px;transition:width 0.4s;"></div>
            </div>
          </div>` : ''}
          ${stStatus ? h`
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;margin-bottom:8px;">
            <span style="color:${subFg};">状态</span>
            <span style="font-weight:500;">${stStatus.state}</span>
          </div>` : ''}
          ${c.format_entity ? h`
          <div @click="${() => this._handleFormat()}"
            style="padding:8px;background:${isLight ? '#ff3b30' : '#ff453a'};color:#fff;border-radius:8px;text-align:center;font-size:12px;font-weight:500;cursor:pointer;">
            🗑️ 格式化存储卡
          </div>` : ''}
        </div>
      </div>` : ''}

    </ha-card>`;
  }

  render() {
    const c = this.config;
    // 图标模式：只渲染小图标，弹窗由 popup_card 服务处理
    if (c.icon_mode) {
      return this._renderIcon();
    }
    // 默认：完整卡片模式
    return this._renderFullCard();
  }

  getCardSize() { return this.config && this.config.icon_mode ? 1 : 5; }

  static get styles() {
    return css`:host{display:block;}`;
  }
}

customElements.define('aidan-pad-camera-card', AidanPadCameraCard);
