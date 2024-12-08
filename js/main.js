document.addEventListener('DOMContentLoaded', function() {
    // 获取所有需要的 DOM 元素
    const fileInput = document.querySelector('#file-input');
    const selectButton = document.querySelector('#select-files');
    const clearButton = document.querySelector('#clear-all');
    const downloadAllButton = document.querySelector('#download-all');
    const imageContainer = document.querySelector('#image-container');
    const processedCount = document.querySelector('#processed-count');

    // 从 localStorage 获取计数器的值，如果没有则设为 0
    let count = parseInt(localStorage.getItem('processedCount') || '0');
    processedCount.textContent = count;

    // 更新计数器的函数
    function updateCount(increment = 1) {
        count += increment;
        processedCount.textContent = count;
        localStorage.setItem('processedCount', count);
    }

    // 调试信息
    console.log('DOM加载完成');
    console.log('文件输入框:', fileInput);
    console.log('选择按钮:', selectButton);

    // 确保元素存在
    if (!fileInput || !selectButton) {
        console.error('必要的DOM元素未找到');
        return;
    }

    // 文件选择事件
    fileInput.addEventListener('change', async (e) => {
        const files = e.target.files;
        
        if (!files || !files.length) {
            console.log('没有选择文件');
            return;
        }

        // 显示加载提示
        const loadingText = document.createElement('div');
        loadingText.className = 'progress-text';
        loadingText.textContent = '正在处理文件...';
        document.body.appendChild(loadingText);

        try {
            // 客户端处理文件
            for (const file of files) {
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    const arrayBuffer = e.target.result;
                    const bytes = new Uint8Array(arrayBuffer);
                    
                    // 检查文件头
                    if (bytes.length < 6) {
                        throw new Error('文件太小，不是有效的DAT文件');
                    }

                    // 获取前6位字节
                    const header = bytes.slice(0, 6);
                    let key = null;

                    // 尝试与 FFD8FF 异或
                    const jpegMagic = [0xFF, 0xD8, 0xFF];
                    let possibleKey1 = header[0] ^ jpegMagic[0];
                    let possibleKey2 = header[1] ^ jpegMagic[1];
                    if (possibleKey1 === possibleKey2) {
                        key = possibleKey1;
                        console.log('JPEG密钥:', key.toString(16));
                    }

                    // 尝试与 89504E 异或
                    if (!key) {
                        const pngMagic = [0x89, 0x50, 0x4E];
                        possibleKey1 = header[0] ^ pngMagic[0];
                        possibleKey2 = header[1] ^ pngMagic[1];
                        if (possibleKey1 === possibleKey2) {
                            key = possibleKey1;
                            console.log('PNG密钥:', key.toString(16));
                        }
                    }

                    // 尝试与 474946 异或
                    if (!key) {
                        const gifMagic = [0x47, 0x49, 0x46];
                        possibleKey1 = header[0] ^ gifMagic[0];
                        possibleKey2 = header[1] ^ gifMagic[1];
                        if (possibleKey1 === possibleKey2) {
                            key = possibleKey1;
                            console.log('GIF密钥:', key.toString(16));
                        }
                    }

                    if (!key) {
                        throw new Error('无法获取解密密钥');
                    }

                    // 解密数据
                    const decryptedBytes = new Uint8Array(bytes.length);
                    for (let i = 0; i < bytes.length; i++) {
                        decryptedBytes[i] = bytes[i] ^ key;
                    }

                    // 检查解密后的文件头
                    const isJPEG = decryptedBytes[0] === 0xFF && decryptedBytes[1] === 0xD8;
                    const isPNG = decryptedBytes[0] === 0x89 && decryptedBytes[1] === 0x50;
                    const isGIF = decryptedBytes[0] === 0x47 && decryptedBytes[1] === 0x49;

                    if (!isJPEG && !isPNG && !isGIF) {
                        throw new Error('解密后不是有效的图片文件');
                    }

                    // 确定正确的 MIME 类型
                    let mimeType = 'image/jpeg';
                    if (isPNG) mimeType = 'image/png';
                    if (isGIF) mimeType = 'image/gif';

                    // 创建Blob并生成URL
                    const blob = new Blob([decryptedBytes], { type: mimeType });
                    const imageUrl = URL.createObjectURL(blob);
                    
                    // 创建图片容器
                    const imageItem = document.createElement('div');
                    imageItem.className = 'image-item';
                    
                    // 创建图片元素
                    const img = document.createElement('img');
                    img.src = imageUrl;
                    img.alt = file.name;
                    
                    // 添加加载事件
                    img.onload = () => {
                        console.log(`图片加载成功: ${file.name}`);
                    };
                    
                    img.onerror = () => {
                        console.error(`图片加载失败: ${file.name}`);
                        URL.revokeObjectURL(imageUrl);
                        img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
                        img.alt = '图片加载失败';
                    };
                    
                    // 创建下载按钮
                    const downloadBtn = document.createElement('button');
                    downloadBtn.className = 'download-btn';
                    downloadBtn.textContent = '下载';
                    downloadBtn.onclick = () => {
                        const a = document.createElement('a');
                        a.href = imageUrl;
                        a.download = file.name.replace('.dat', '.jpg');
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                    };
                    
                    imageItem.appendChild(img);
                    imageItem.appendChild(downloadBtn);
                    imageContainer.appendChild(imageItem);
                    
                    // 更新计数器
                    updateCount();
                };
                
                reader.onerror = function() {
                    console.error(`文件读取失败: ${file.name}`);
                    alert(`文件 ${file.name} 读取失败`);
                };
                
                reader.readAsArrayBuffer(file);
            }
        } catch (error) {
            console.error('处理文件错误:', error);
            alert('处理文件时发生错误: ' + error.message);
        } finally {
            // 移除加载提示
            document.body.removeChild(loadingText);
            // 重置文件输入框
            fileInput.value = '';
        }
    });

    // 清除按钮事件
    clearButton.addEventListener('click', () => {
        try {
            // 清除所有图片的 URL
            const images = imageContainer.querySelectorAll('img');
            images.forEach(img => {
                if (img.src.startsWith('blob:')) {
                    URL.revokeObjectURL(img.src);
                }
            });
            
            // 清空图片容器
            imageContainer.innerHTML = '';
            
            console.log('已清空所有图片和重置计数器');
        } catch (error) {
            console.error('清空操作失败:', error);
            alert('清空失败，请刷新页面重试');
        }
    });
    
    // 下载全部按钮事件
    downloadAllButton.addEventListener('click', () => {
        const images = imageContainer.querySelectorAll('.image-item');
        if (!images.length) {
            alert('没有可下载的图片');
            return;
        }
        
        images.forEach(item => {
            const downloadBtn = item.querySelector('.download-btn');
            if (downloadBtn) {
                downloadBtn.click();
            }
        });
    });
}); 