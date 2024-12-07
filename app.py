from flask import Flask, render_template, request, jsonify, send_file, redirect
import os
import binascii
import tempfile
import shutil
from werkzeug.utils import secure_filename
import threading
from config import ProductionConfig, DevelopmentConfig
import schedule
import time

# 创建应用时使用配置
def create_app(config=None):
    app = Flask(__name__)
    
    # 根据环境变量选择配置
    if config is None:
        env = os.environ.get('FLASK_ENV', 'development')
        if env == 'production':
            config = ProductionConfig
        else:
            config = DevelopmentConfig
    
    app.config.from_object(config)
    
    # 确保临时目录存在
    os.makedirs(app.config['TEMP_FOLDER'], exist_ok=True)
    
    return app

app = create_app()

# 全局计数器
class Counter:
    def __init__(self):
        self.value = 0
        self.lock = threading.Lock()
    
    def increment(self):
        with self.lock:
            self.value += 1
    
    def get(self):
        with self.lock:
            return self.value

processed_files_counter = Counter()

def find_key(file_content):
    """查找密钥"""
    try:
        # 获取前6个字节
        header = file_content[:6]
        hex_header = binascii.hexlify(header).decode().upper()
        
        # 尝试与 FFD8FF 异或
        key1 = int(hex_header[:2], 16) ^ int('FF', 16)
        key2 = int(hex_header[2:4], 16) ^ int('D8', 16)
        if key1 == key2:
            return format(key1, '02X')
        
        # 尝试与 89504E 异或
        key1 = int(hex_header[:2], 16) ^ int('89', 16)
        key2 = int(hex_header[2:4], 16) ^ int('50', 16)
        if key1 == key2:
            return format(key1, '02X')
        
        # 尝试与 474946 异或
        key1 = int(hex_header[:2], 16) ^ int('47', 16)
        key2 = int(hex_header[2:4], 16) ^ int('49', 16)
        if key1 == key2:
            return format(key1, '02X')
        
        return None
        
    except Exception as e:
        print(f"查找密钥时出错: {str(e)}")
        return None

def process_dat_file(file_content):
    """处理单个dat文件"""
    try:
        # 查找密钥
        key = find_key(file_content)
        if not key:
            return None, "无法找到有效密钥"
        
        # 解密文件
        decrypted = bytes(byte ^ int(key, 16) for byte in file_content)
        
        # 确定文件类型
        if decrypted.startswith(b'\xFF\xD8\xFF'):
            ext = '.jpg'
        elif decrypted.startswith(b'\x89PNG'):
            ext = '.png'
        elif decrypted.startswith(b'GIF8'):
            ext = '.gif'
        else:
            return None, "未知的文件类型"
        
        return decrypted, ext
        
    except Exception as e:
        return None, str(e)

@app.route('/')
def index():
    return render_template('index.html', processed_count=processed_files_counter.get())

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'files[]' not in request.files:
        print("没有找到文件")  # 添加调试日志
        return jsonify({'error': '没有选择文件'})
    
    files = request.files.getlist('files[]')
    results = []
    
    for file in files:
        if file.filename == '':
            continue
            
        print(f"处理文件: {file.filename}")  # 添加调试日志
        
        # 检查文件大小
        file_content = file.read()
        file_size = len(file_content)
        print(f"文件大小: {file_size} bytes")  # 添加调试日志
        
        if file_size > app.config['MAX_CONTENT_LENGTH']:  # 0.5MB
            print(f"文件过大: {file_size} bytes")  # 添加调试日志
            results.append({
                'filename': file.filename,
                'error': '文件大小超过0.5MB限制'
            })
            continue
        
        # 处理文件
        decrypted, ext = process_dat_file(file_content)
        if not isinstance(ext, str):
            print(f"处理失败: {ext}")  # 添加调试日志
            results.append({
                'filename': file.filename,
                'error': ext
            })
            continue
        
        # 保存解密后的文件
        temp_filename = f"{secure_filename(os.path.splitext(file.filename)[0])}{ext}"
        temp_path = os.path.join(app.config['TEMP_FOLDER'], temp_filename)
        
        try:
            with open(temp_path, 'wb') as f:
                f.write(decrypted)
            print(f"文件保存成功: {temp_path}")  # 添加调试日志
            
            # 增加计数器
            processed_files_counter.increment()
            
            results.append({
                'filename': file.filename,
                'temp_filename': temp_filename,
                'success': True
            })
        except Exception as e:
            print(f"保存文件失败: {str(e)}")  # 添加调试日志
            results.append({
                'filename': file.filename,
                'error': f'保存文件失败: {str(e)}'
            })
    
    print(f"处理结果: {results}")  # 添加调试日志
    return jsonify(results)

@app.route('/download/<filename>')
def download_file(filename):
    try:
        file_path = os.path.join(app.config['TEMP_FOLDER'], filename)
        if not os.path.exists(file_path):
            return jsonify({'error': '文件不存在'}), 404
        
        # 读取文件内容
        with open(file_path, 'rb') as f:
            file_content = f.read()
        
        # 确定文件类型
        content_type = 'image/jpeg'  # 默认类型
        if filename.lower().endswith('.png'):
            content_type = 'image/png'
        elif filename.lower().endswith('.gif'):
            content_type = 'image/gif'
        
        response = send_file(
            file_path,
            mimetype=content_type,
            as_attachment=True,
            download_name=filename,
            conditional=True
        )
        
        # 添加必要的响应头
        response.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        
        return response
        
    except Exception as e:
        print(f"下载文件失败: {str(e)}")  # 添加服务器端日志
        return jsonify({'error': str(e)}), 500

@app.route('/clear', methods=['POST'])
def clear_temp():
    try:
        # 删除临时目录中的所有文件
        for filename in os.listdir(app.config['TEMP_FOLDER']):
            file_path = os.path.join(app.config['TEMP_FOLDER'], filename)
            try:
                if os.path.isfile(file_path):
                    os.unlink(file_path)
            except Exception as e:
                print(f'删除文件失败: {e}')
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)})

@app.before_request
def before_request():
    """请求预处理：检查 CSRF 令牌等"""
    if not app.debug and not app.testing:
        # 在生产环境中强制使用 HTTPS
        if not request.is_secure:
            url = request.url.replace('http://', 'https://', 1)
            return redirect(url, code=301)

def cleanup_temp_files():
    """定期清理临时文件"""
    temp_dir = app.config['TEMP_FOLDER']
    timeout = app.config['TEMP_FILE_TIMEOUT']
    current_time = time.time()
    
    for filename in os.listdir(temp_dir):
        file_path = os.path.join(temp_dir, filename)
        if os.path.isfile(file_path):
            if current_time - os.path.getmtime(file_path) > timeout.total_seconds():
                try:
                    os.remove(file_path)
                except Exception as e:
                    print(f"清理临时文件失败: {e}")

def run_schedule():
    """运行定时任务"""
    schedule.every(1).hours.do(cleanup_temp_files)
    while True:
        schedule.run_pending()
        time.sleep(60)

# 启动清理线程
cleanup_thread = threading.Thread(target=run_schedule, daemon=True)
cleanup_thread.start()

@app.errorhandler(404)
def not_found_error(error):
    return render_template('error.html',
                         error_code=404,
                         error_message='页面未找到',
                         error_description='您访问的页面不存在。'), 404

@app.errorhandler(500)
def internal_error(error):
    return render_template('error.html',
                         error_code=500,
                         error_message='服务器错误',
                         error_description='服务器遇到了一个错误。'), 500

if __name__ == '__main__':
    # 本地开发环境使用 debug 模式
    app.run(debug=True, host='0.0.0.0', port=5000) 