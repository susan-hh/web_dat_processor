document.addEventListener('DOMContentLoaded', function() {
    // 获取元素
    const fileInput = document.querySelector('#file-input');
    const selectButton = document.querySelector('#select-files');
    const clearButton = document.querySelector('#clear-all');
    const downloadAllButton = document.querySelector('#download-all');
    const imageContainer = document.querySelector('#image-container');
    const processedCount = document.querySelector('#processed-count');

    // 调试信息
    console.log('DOM加载完成');
    console.log('文件输入框:', fileInput);
    console.log('选择按钮:', selectButton);

    // 确保元素存在
    if (!fileInput || !selectButton) {
        console.error('必要的DOM元素未找到');
        return;
    }

    // 使用 label for 的方式，不需要额外的点击事件
    // 但我们仍然可以添加一个用于调试的事件监听器
    selectButton.addEventListener('click', (e) => {
        console.log('选择按钮被点击');
    });

    // 文件选择事件
    fileInput.addEventListener('change', async (e) => {
        console.log('文件选择事件触发');
        const files = e.target.files;
        
        if (!files || !files.length) {
            console.log('没有选择文件');
            return;
        }

        console.log(`选择了 ${files.length} 个文件:`, 
            Array.from(files).map(f => f.name));

        // 显示加载提示
        const loadingText = document.createElement('div');
        loadingText.className = 'progress-text';
        loadingText.textContent = '正在处理文件...';
        document.body.appendChild(loadingText);
            const formData = new FormData();
            Array.from(files).forEach(file => {
                formData.append('files[]', file);
            });

            console.log('开始上传...');
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const results = await response.json();
            console.log('上传结果:', results);

            let successCount = 0;
            let failCount = 0;

            results.forEach(result => {
                if (result.success) {
                    console.log(`处理成功: ${result.filename}`);
                    // 创建图片项
                    const imageItem = document.createElement('div');
                    imageItem.className = 'image-item';
                    
                    // 创建图片元素
                    const img = document.createElement('img');
                    img.src = `/static/temp/${result.temp_filename}`;
                    img.alt = result.filename;
                    
                    // 添加加载事件监听
                    img.onload = () => {
                        console.log(`图片加载成功: ${result.filename}`);
                    };
                    img.onerror = () => {
                        console.error(`图片加载失败: ${result.filename}`);
                    };
                    // 创建下载按钮
                    const downloadBtn = document.createElement('button');
                    downloadBtn.className = 'download-btn';
                    downloadBtn.textContent = '下载';
                    downloadBtn.onclick = () => {
                        window.location.href = `/download/${result.temp_filename}`;
                    };
                    
                    imageItem.appendChild(img);
                    imageItem.appendChild(downloadBtn);
                    imageContainer.appendChild(imageItem);
                    
                    // 更新计数器
                    processedCount.textContent = parseInt(processedCount.textContent) + 1;
                    successCount++;
                } else {
                    console.error(`处理失败: ${result.filename}`, result.error);
                    alert(`处理文件 ${result.filename} 失败: ${result.error}`);
                    failCount++;
                }
            });


        } catch (error) {
            console.error('上传处理错误:', error);
            alert('上传文件时发生错误');
        } finally {
            // 移除加载提示
            document.body.removeChild(loadingText);
            // 重置文件输入框
            fileInput.value = '';
        }
    });
	clearButton.addEventListener('click', async () => {
        try {
            await fetch('/clear', { method: 'POST' });
            imageContainer.innerHTML = '';
        } catch (error) {
            alert('清空失败');
            console.error(error);
        }
    });
    
    downloadAllButton.addEventListener('click', async () => {
        const imageItems = document.querySelectorAll('.image-item');
        if (!imageItems.length) {
            alert('没有可下载的图片');
            return;
        }

        // 创建下载进度提示
        const progressText = document.createElement('div');
        progressText.className = 'progress-text';
        document.body.appendChild(progressText);
		try {
            let successCount = 0;
            let failCount = 0;
            const totalCount = imageItems.length;

            // 串行下载以避免浏览器限制
            for (let i = 0; i < imageItems.length; i++) {
                const item = imageItems[i];
                const img = item.querySelector('img');
                const filename = img.src.split('/').pop();

                progressText.textContent = `正在下载: ${i + 1}/${totalCount}`;

                try {
                    const response = await fetch(`/download/${filename}`);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }


                    // 获取blob数据
                    const blob = await response.blob();
                    
                    // 使用原生下载方法
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    
                    // 清理资源
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                    
                    successCount++;
                } catch (error) {
                    console.error(`下载 ${filename} 失败:`, error);
                    failCount++;
                }

                // 短暂延迟，避免浏览器过载
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // 显示最终结果
            if (failCount === 0) {
                alert(`全部 ${successCount} 个文件下载成功！`);
            } else {
                alert(`下载完成：成功 ${successCount} 个，失败 ${failCount} 个`);
            }

        } catch (error) {
            console.error('批量下载过程中发生错误:', error);
            alert('批量下载过程中发生错误');
        } finally {
            // 移除进度提示
            document.body.removeChild(progressText);
        }
    });
}); 


