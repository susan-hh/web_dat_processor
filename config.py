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

class ProductionConfig(Config):
    DEBUG = False
    TESTING = False
    # 生产环境必须设置安全的密钥
    SECRET_KEY = os.environ.get('SECRET_KEY') or None
    WTF_CSRF_SECRET_KEY = os.environ.get('WTF_CSRF_SECRET_KEY') or None
    
    if not (SECRET_KEY and WTF_CSRF_SECRET_KEY):
        raise ValueError("Production environment must set SECRET_KEY and WTF_CSRF_SECRET_KEY")
    
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

class TestingConfig(Config):
    DEBUG = True
    TESTING = True 