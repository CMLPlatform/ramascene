"""
Django settings for ramasceneMasterProject project.

This module imports settings from the config directory.
For different environments, set DJANGO_SETTINGS_MODULE to:
- ramasceneMasterProject.config.dev (development)
- ramasceneMasterProject.config.production (production)
- ramasceneMasterProject.config.staging_cml (staging)
"""

# Default to development settings
from ramasceneMasterProject.config.dev import *