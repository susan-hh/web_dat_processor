import os
from datetime import timedelta

class Config:
    # 基础配置
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-key-please-change-in-production'
    MAX_CONTENT_LENGTH = 0.5 * 1024 * 1024  # 0.5MB 文件大小限制
    
    # 临时文件配置
    TEMP_FOLDER = os.environ.get('TEMP_FOLDER') or 'static/temp'
    TEMP_FILE_TIMEOUT = timedelta(hours=1)  # 临时文件保存时间
    
    # 安全配置
    SESSION_COOKIE_SECURE = True
    PERMANENT_SESSION_LIFETIME = timedelta(minutes=30)
    
    # CSRF 保护
    WTF_CSRF_ENABLED = True
    WTF_CSRF_SECRET_KEY = os.environ.get('WTF_CSRF_SECRET_KEY') or 'csrf-key-please-change'
    
    # GitHub 配置
    GITHUB_CONFIG = {
        'repository': os.environ.get('GITHUB_REPOSITORY_URL'),
        'branch': os.environ.get('GITHUB_BRANCH', 'main'),
        'username': os.environ.get('GITHUB_USERNAME'),
    }

class ProductionConfig(Config):
    DEBUG = False
    TESTING = False
    
    # 添加安全头
    SECURE_HEADERS = {
        'Content-Security-Policy': "default-src 'self'; img-src 'self' data: blob:;",
        'X-Frame-Options': 'SAMEORIGIN',
        'X-XSS-Protection': '1; mode=block',
        'X-Content-Type-Options': 'nosniff'
    }

class DevelopmentConfig(Config):
    DEBUG = True
    TESTING = False
    SECRET_KEY = 'dev-key-for-testing'
    WTF_CSRF_SECRET_KEY = 'dev-csrf-key-for-testing'

class TestingConfig(Config):
    DEBUG = True
    TESTING = True 