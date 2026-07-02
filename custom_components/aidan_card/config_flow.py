"""Aidan Card 配置流程"""
from __future__ import annotations

import voluptuous as vol

from homeassistant import config_entries

from . import DOMAIN


class AidanCardConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Aidan 设备卡片配置流程"""

    VERSION = 1

    async def async_step_user(self, user_input=None):
        """添加集成"""
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")

        return self.async_create_entry(title="Aidan 设备卡片", data={})
