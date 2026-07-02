const whenDefined2 = (t) => customElements.whenDefined(t);
await Promise.race([whenDefined2("ha-card"), whenDefined2("ha-panel-lovelace")]);
const LitEl = window.LitElement || Object.getPrototypeOf(customElements.get("ha-card"));
const h = LitEl.prototype.html;
const c = LitEl.prototype.css;

// ══════════════════════════════════════════════
//  共用主题工具
// ══════════════════════════════════════════════
function evaluateTheme(hass) {
    // 与 xiaoshi 原始卡片 _evaluateTheme() 一致
    try {
        if (hass?.selectedTheme?.dark !== undefined) {
            return hass.selectedTheme.dark ? 'dark' : 'light';
        }
    } catch(e) {}
    return 'dark';
}

function themeColors(hass) {
    const isDark = evaluateTheme(hass) === 'dark';
    return {
        bg: isDark ? 'rgb(50,50,50)' : 'rgb(255,255,255)',
        fg: isDark ? 'rgb(255,255,255)' : 'rgb(0,0,0)',
        buttonBg: isDark ? 'rgb(80,80,80)' : 'rgb(230,230,230)',
        buttonFg: isDark ? 'rgb(240,240,240)' : 'rgb(50,50,50)',
        subText: isDark ? 'rgb(200,200,200)' : 'rgb(80,80,80)',
        cellBg: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
        isDark
    };
}

// ══════════════════════════════════════════════
//  AidanCameraCard — 摄像头卡片
// ══════════════════════════════════════════════
window.customCards = window.customCards || [];
window.customCards.push({
    type: 'aidan-camera-card',
    name: 'Aidan-摄像头',
    description: '阁楼摄像头卡片（实时画面+存储+格式化）',
    preview: true
});

class AidanCameraCard extends LitEl {
    static get properties() {
        return { hass: { type: Object }, config: { type: Object } };
    }

    setConfig(config) { this.config = config || {}; }

    _state(entityId) {
        if (!this.hass || !entityId) return null;
        const s = this.hass.states[entityId];
        return s ? { state: s.state, attributes: s.attributes } : null;
    }

    _formatBytes(bytes) {
        const b = parseFloat(bytes);
        if (isNaN(b)) return '--';
        if (b >= 1073741824) return (b / 1073741824).toFixed(1) + ' GB';
        if (b >= 1048576) return (b / 1048576).toFixed(1) + ' MB';
        return (b / 1024).toFixed(1) + ' KB';
    }

    _handleFormat() {
        const fe = this.config.format_entity;
        if (!fe) return;
        this.hass.callService('button', 'press', { entity_id: fe });
    }

    _handleSwitch() {
        const se = this.config.switch_entity;
        if (!se) return;
        const s = this._state(se);
        const svc = s?.state === 'on' ? 'turn_off' : 'turn_on';
        this.hass.callService('switch', svc, { entity_id: se });
    }

    render() {
        if (!this.hass || !this.config) return h`<ha-card>Loading...</ha-card>`;
        const tc = themeColors(this.hass);
        const accent = '#007aff';
        const border = tc.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

        const name = this.config.name || '摄像头';
        const camEntity = this.config.entity;
        const swState = this._state(this.config.switch_entity);

        const used = this._state(this.config.storage_used);
        const free = this._state(this.config.storage_free);
        const storageStatus = this._state(this.config.storage_status);
        const hasStorage = used || free || storageStatus;

        let usedBytes = 0, freeBytes = 0, pct = 0;
        if (used && free) {
            usedBytes = parseFloat(used.state) || 0;
            freeBytes = parseFloat(free.state) || 0;
            const total = usedBytes + freeBytes;
            if (total > 0) pct = (usedBytes / total) * 100;
        }

        return h`
        <ha-card style="background:${tc.bg}; border:1px solid ${border}; border-radius:16px; padding:16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
                <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg, ${accent}, #5856d6); display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12,2A7,7 0 0,1 19,9C19,14.25 12,22 12,22C12,22 5,14.25 5,9A7,7 0 0,1 12,2M12,4A5,5 0 0,0 7,9C7,10 7,12 12,18.71C17,12 17,10 17,9A5,5 0 0,0 12,4M12,7.5A1.5,1.5 0 1,1 10.5,9A1.5,1.5 0 0,1 12,7.5Z"/></svg>
                </div>
                <div style="flex:1;">
                    <div style="font-size:16px;font-weight:600;color:${tc.fg};">${name}</div>
                    <div style="font-size:12px;color:${tc.subText};margin-top:2px;">${swState?.state === 'on' ? '运行中' : '已关闭'}</div>
                </div>
                ${this.config.switch_entity ? h`
                <div @click="${() => this._handleSwitch()}" style="width:44px;height:44px;border-radius:22px;background:${swState?.state === 'on' ? accent : tc.buttonBg}; display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;cursor:pointer;transition:background 0.2s;">
                    ⏻
                </div>` : ''}
            </div>

            <!-- Camera Stream -->
            ${camEntity && swState?.state === 'on' ? h`
            <div style="background:${tc.cellBg};border-radius:12px;overflow:hidden;margin-bottom:12px;border:1px solid ${border};">
                <img src="${this.hass.states[camEntity]?.attributes?.entity_picture || ''}"
                     style="width:100%;display:block;aspect-ratio:16/9;object-fit:cover;"
                     @error="${(e) => { e.target.style.display = 'none'; }}" />
            </div>` : ''}

            ${camEntity && swState?.state !== 'on' ? h`
            <div style="background:${tc.cellBg};border-radius:12px;padding:32px;margin-bottom:12px;text-align:center;color:${tc.subText};border:1px solid ${border};">
                <div style="font-size:40px;margin-bottom:8px;">📷</div>
                <div style="font-size:14px;">摄像头已关闭</div>
            </div>` : ''}

            <!-- Storage Section -->
            ${hasStorage ? h`
            <div style="margin-bottom:12px;">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
                    <div style="width:6px;height:6px;border-radius:50%;background:#34c759;"></div>
                    <span style="font-size:13px;color:${tc.subText};font-weight:500;">💾 存储卡</span>
                </div>
                <div style="background:${tc.cellBg};border-radius:12px;padding:12px;border:1px solid ${border};">
                    ${used && free ? h`
                    <div style="margin-bottom:8px;">
                        <div style="display:flex;justify-content:space-between;font-size:12px;color:${tc.subText};margin-bottom:4px;">
                            <span>已用 ${this._formatBytes(usedBytes)}</span>
                            <span>剩余 ${this._formatBytes(freeBytes)}</span>
                        </div>
                        <div style="height:4px;background:rgba(128,128,128,0.2);border-radius:2px;overflow:hidden;">
                            <div style="height:100%;width:${pct}%;background:${pct > 80 ? '#ff3b30' : '#34c759'};border-radius:2px;transition:width 0.4s;"></div>
                        </div>
                    </div>` : ''}
                    ${storageStatus ? h`
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-size:12px;color:${tc.subText};">状态</span>
                        <span style="font-size:12px;color:${tc.fg};font-weight:500;">${storageStatus.state}</span>
                    </div>` : ''}
                    ${this.config.format_entity ? h`
                    <div @click="${() => this._handleFormat()}" style="margin-top:${(used || storageStatus) ? '8px' : '0'};padding:8px;background:${accent};color:#fff;border-radius:8px;text-align:center;font-size:13px;font-weight:500;cursor:pointer;">
                        🗑️ 格式化存储卡
                    </div>` : ''}
                </div>
            </div>` : ''}
        </ha-card>`;
    }

    getCardSize() {
        const hasStorage = this.config?.storage_used || this.config?.storage_free;
        return 3 + (hasStorage ? 1 : 0);
    }

    static get styles() { return c`:host { display: block; }`; }
}
customElements.define('aidan-camera-card', AidanCameraCard);

// ══════════════════════════════════════════════
//  AidanWaterDispenserCard — 饮水机卡片
// ══════════════════════════════════════════════
window.customCards.push({
    type: 'aidan-water-dispenser-card',
    name: 'Aidan-饮水机',
    description: '客厅饮水机卡片（开关+温度）',
    preview: true
});

class AidanWaterDispenserCard extends LitEl {
    static get properties() {
        return { hass: { type: Object }, config: { type: Object } };
    }

    setConfig(config) { this.config = config || {}; }

    _state(entityId) {
        if (!this.hass || !entityId) return null;
        const s = this.hass.states[entityId];
        return s ? { state: s.state, attributes: s.attributes } : null;
    }

    _handleSwitch() {
        const ent = this.config.entity;
        if (!ent) return;
        const s = this._state(ent);
        const svc = s?.state === 'on' ? 'turn_off' : 'turn_on';
        this.hass.callService('switch', svc, { entity_id: ent });
    }

    render() {
        if (!this.hass || !this.config) return h`<ha-card>Loading...</ha-card>`;
        const tc = themeColors(this.hass);
        const accent = 'rgb(255,140,0)';
        const accent2 = 'rgb(255,100,0)';
        const border = tc.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

        const name = this.config.name || '饮水机';
        const swState = this._state(this.config.entity);
        const temp = this._state(this.config.temperature);
        const isOn = swState?.state === 'on';

        return h`
        <ha-card style="background:${tc.bg}; border:1px solid ${border}; border-radius:16px; padding:16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
                <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg, ${accent}, ${accent2}); display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12.5,3C9.85,3 7.35,4.08 5.5,5.82C6.55,6.81 8.05,7.79 10,8.47V9.82C8.92,10.24 7.83,10.84 6.73,11.58L5.08,10.62C4.88,10.5 4.61,10.55 4.47,10.75C4.33,10.95 4.38,11.23 4.58,11.37L6.23,12.33C5.08,13.38 4.08,14.59 3.26,15.93C3.15,16.15 3.21,16.41 3.41,16.55C3.5,16.63 3.62,16.67 3.74,16.67C3.83,16.67 3.92,16.64 4,16.58L6,15.42C5.35,16.82 5,18.33 5,19.89V22H19V19.89C19,18.33 18.65,16.82 18,15.42L20,16.58C20.08,16.64 20.17,16.67 20.26,16.67C20.38,16.67 20.5,16.63 20.59,16.55C20.79,16.41 20.85,16.15 20.74,15.93C19.92,14.59 18.92,13.38 17.77,12.33L19.42,11.37C19.62,11.23 19.67,10.95 19.53,10.75C19.39,10.55 19.12,10.5 18.92,10.62L17.27,11.58C16.17,10.84 15.08,10.24 14,9.82V8.47C15.95,7.79 17.45,6.81 18.5,5.82C16.65,4.08 14.15,3 11.5,3H12.5Z"/></svg>
                </div>
                <div style="flex:1;">
                    <div style="font-size:16px;font-weight:600;color:${tc.fg};">${name}</div>
                    <div style="font-size:12px;color:${tc.subText};margin-top:2px;">${isOn ? '运行中' : '已关闭'}</div>
                </div>
                <div @click="${() => this._handleSwitch()}" style="width:44px;height:44px;border-radius:22px;background:${isOn ? accent : tc.buttonBg}; display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;cursor:pointer;transition:background 0.2s;">
                    ⏻
                </div>
            </div>

            <!-- Temperature -->
            ${temp ? h`
            <div style="background:${tc.cellBg};border-radius:12px;padding:16px;text-align:center;border:1px solid ${border};">
                <div style="font-size:12px;color:${tc.subText};margin-bottom:4px;">🌡️ 插头温度</div>
                <div style="font-size:36px;font-weight:300;color:${isOn ? accent : tc.fg};">
                    ${temp.state}
                    <span style="font-size:16px;color:${tc.subText};">${temp.attributes?.unit_of_measurement || '°C'}</span>
                </div>
                ${isOn ? h`<div style="font-size:11px;color:${tc.subText};margin-top:4px;">M3 智能插座温度</div>` : ''}
            </div>` : h`
            <div style="background:${tc.cellBg};border-radius:12px;padding:24px;text-align:center;color:${tc.subText};border:1px solid ${border};">
                <div style="font-size:13px;">无温度数据</div>
            </div>`}
        </ha-card>`;
    }

    getCardSize() { return 2; }

    static get styles() { return c`:host { display: block; }`; }
}
customElements.define('aidan-water-dispenser-card', AidanWaterDispenserCard);

console.info("%c Aidan卡-家电卡 %c 摄像头+饮水机 ", "color: orange; font-weight: bold;", "color: white; font-weight: bold; background: black");
