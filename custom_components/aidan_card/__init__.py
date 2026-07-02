"""Aidan Card 集成 - 加载 aidan-card.js 及自定义设备卡片资源"""
import logging

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.components.frontend import add_extra_js_url

_LOGGER = logging.getLogger(__name__)
DOMAIN = "aidan_card"

_STATE_AIDAN_PATH = "/aidan_card"


class StaticPathConfig:
    """静态路径配置，兼容 async_register_static_paths 的列表参数"""

    def __init__(self, url_path: str, path: str, cache_headers: bool):
        self.url_path = url_path
        self.path = path
        self.cache_headers = cache_headers


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """通过 UI 配置流程设置"""
    await hass.http.async_register_static_paths([
        StaticPathConfig(
            _STATE_AIDAN_PATH,
            hass.config.path("custom_components/aidan_card/www"),
            False,
        )
    ])
    add_extra_js_url(hass, _STATE_AIDAN_PATH + "/aidan-card.js")
    _LOGGER.info("Aidan Card 集成已加载")
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """卸载集成条目"""
    return True
