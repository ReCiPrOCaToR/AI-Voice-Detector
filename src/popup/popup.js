document.addEventListener('DOMContentLoaded', function() {
  const status = document.getElementById('status');
  const result = document.getElementById('result');
  const resultText = document.getElementById('result-text');
  const autoDetect = document.getElementById('auto-detect');
  const startDetect = document.getElementById('start-detect');
  const markAI = document.getElementById('mark-ai');
  const showMarkBtn = document.getElementById('show-mark-btn');
  const markedList = document.getElementById('marked-list');
  
  // 获取settings元素
  const settings = document.getElementById('settings');
  if (!settings) {
    console.error('未找到settings元素');
  }

  // 加载设置
  loadSettings();
  
  // 更新标记列表
  updateMarkedList();

  // 默认显示标记按钮
  setTimeout(() => {
    if (markAI) {
      markAI.style.display = 'block';
    }
  }, 500);

  // 显示标记按钮选项
  if (showMarkBtn) {
    showMarkBtn.addEventListener('click', function() {
      if (markAI) {
        markAI.style.display = 'block';
        status.textContent = '已显示标记按钮，可以点击标记当前音频';
      }
    });
  }

  // 保存自动检测设置
  if (autoDetect) {
    autoDetect.addEventListener('change', function() {
      chrome.storage.sync.set({ autoDetect: this.checked });
    });
  }

  // 检查content script是否已注入
  async function checkContentScript(tabId) {
    try {
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => window.AIVoiceDetector
      });
      return !!result;
    } catch (error) {
      console.error('检查content script失败:', error);
      return false;
    }
  }

  // 注入content script
  async function injectContentScript(tabId) {
    try {
      // 先检查是否已经注入
      const isInjected = await checkContentScript(tabId);
      if (isInjected) {
        console.log('Content script already injected');
        return true;
      }

      // 如果没有注入，则注入
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['src/content/content.js']
      });
      return true;
    } catch (error) {
      console.error('注入脚本失败:', error);
      return false;
    }
  }

  // 发送消息到content script
  async function sendMessageToContentScript(message) {
    try {
      // 获取当前标签页
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        throw new Error('无法获取当前标签页');
      }

      // 检查content script是否已注入
      const isInjected = await checkContentScript(tab.id);
      if (!isInjected) {
        // 注入content script
        const injected = await injectContentScript(tab.id);
        if (!injected) {
          throw new Error('注入content script失败');
        }
      }

      // 发送消息并等待响应
      return new Promise((resolve, reject) => {
        // 设置超时
        const timeout = setTimeout(() => {
          reject(new Error('消息响应超时'));
        }, 5000);

        // 发送消息
        chrome.tabs.sendMessage(tab.id, message, response => {
          clearTimeout(timeout);
          
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (!response) {
            reject(new Error('未收到响应'));
            return;
          }

          resolve(response);
        });
      });
    } catch (error) {
      console.error('发送消息失败:', error);
      throw error;
    }
  }

  // 标记AI配音
  markAI.addEventListener('click', async function() {
    try {
      // 检查当前是否处于标记状态
      if (markAI.dataset.marking === 'true') {
        // 第二次点击 - 完成标记，记录结束时间
        status.textContent = '正在处理标记区间...';
        
        const response = await sendMessageToContentScript({ 
          action: 'completeAudioMarking'
        });
        
        if (response.success) {
          // 保存标记的AI配音
          chrome.storage.sync.get(['markedAIVoices'], function(result) {
            const markedVoices = result.markedAIVoices || [];
            markedVoices.push({
              features: response.features,
              startTime: response.startTime,
              endTime: response.endTime,
              duration: response.duration,
              timestamp: new Date().toISOString()
            });
            
            chrome.storage.sync.set({ markedAIVoices: markedVoices }, function() {
              if (chrome.runtime.lastError) {
                console.error('保存标记失败:', chrome.runtime.lastError);
                status.textContent = '保存标记失败';
                return;
              }
              status.textContent = '标记成功';
              // 重置按钮状态
              markAI.textContent = '标记为AI配音';
              markAI.dataset.marking = 'false';
              markAI.classList.remove('marking');
              updateMarkedList();
            });
          });
        } else {
          status.textContent = response.error || '标记失败';
          // 重置按钮状态
          markAI.textContent = '标记为AI配音';
          markAI.dataset.marking = 'false';
          markAI.classList.remove('marking');
        }
      } else {
        // 第一次点击 - 开始标记，记录起始时间
        status.textContent = '正在标记起始点...';
        
        const response = await sendMessageToContentScript({ 
          action: 'startAudioMarking' 
        });
        
        if (response.success) {
          status.textContent = '已标记起始点，请在AI配音结束时再次点击';
          // 更新按钮状态
          markAI.textContent = '完成标记';
          markAI.dataset.marking = 'true';
          markAI.classList.add('marking');
        } else {
          status.textContent = response.error || '标记起始点失败';
        }
      }
    } catch (error) {
      console.error('标记错误:', error);
      status.textContent = '标记失败: ' + error.message;
      // 重置按钮状态
      markAI.textContent = '标记为AI配音';
      markAI.dataset.marking = 'false';
      markAI.classList.remove('marking');
    }
  });

  // 开始检测
  startDetect.addEventListener('click', async function() {
    try {
      status.textContent = '正在启动检测...';
      result.style.display = 'none';
      markAI.style.display = 'block'; // 保持标记按钮可见

      // 主动向background发送ping消息，确保连接正常
      try {
        await chrome.runtime.sendMessage({ type: 'ping' });
        console.log('与background连接正常');
      } catch (error) {
        console.log('与background的连接测试:', error);
      }
      
      const response = await sendMessageToContentScript({ action: 'startDetection' });
      
      if (response.success) {
        status.textContent = '检测已启动，等待结果...';
        
        // 设置超时，如果10秒内没有结果，显示提示
        setTimeout(() => {
          if (status.textContent === '检测已启动，等待结果...') {
            status.textContent = '检测进行中，请等待视频播放时有声音后获取结果';
          }
        }, 10000);
      } else {
        status.textContent = response.error || '启动检测失败';
      }
    } catch (error) {
      console.error('启动检测失败:', error);
      status.textContent = '启动检测失败: ' + error.message;
    }
  });

  // 更新标记列表
  function updateMarkedList() {
    // 从存储中获取已标记的AI配音
    chrome.storage.sync.get(['markedAIVoices'], function(result) {
      console.log('获取到的已标记AI配音:', result.markedAIVoices);
      const markedVoices = result.markedAIVoices || [];
      markedList.innerHTML = '';
      
      if (!markedVoices || !Array.isArray(markedVoices) || markedVoices.length === 0) {
        markedList.innerHTML = '<p>暂无标记的AI配音</p>';
        return;
      }
      
      markedVoices.forEach((voice, index) => {
        if (!voice || !voice.timestamp) return;
        
        const item = document.createElement('div');
        item.className = 'marked-item';
        
        const date = new Date(voice.timestamp);
        const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        
        // 格式化音频时间信息
        let timeInfo = '';
        if (voice.startTime && voice.endTime) {
          const formatTime = (seconds) => {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
          };
          
          const startTimeFormatted = formatTime(voice.startTime);
          const endTimeFormatted = formatTime(voice.endTime);
          const durationFormatted = voice.duration ? `${Math.round(voice.duration)}秒` : '';
          
          timeInfo = `<div class="time-info">
            <span class="time-label">时间段:</span>
            <span class="time-value">${startTimeFormatted} - ${endTimeFormatted}</span>
            <span class="duration">(${durationFormatted})</span>
          </div>`;
        }
        
        item.innerHTML = `
          <div class="mark-details">
            <span class="timestamp">${formattedDate}</span>
            ${timeInfo}
          </div>
          <button class="delete-btn" data-index="${index}">删除</button>
        `;
        
        markedList.appendChild(item);
      });
      
      // 添加删除按钮事件
      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const index = parseInt(this.getAttribute('data-index'));
          markedVoices.splice(index, 1);
          chrome.storage.sync.set({ markedAIVoices: markedVoices }, function() {
            if (chrome.runtime.lastError) {
              console.error('删除标记失败:', chrome.runtime.lastError);
              return;
            }
            updateMarkedList();
          });
        });
      });
    });
  }

  // 监听检测结果
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('popup收到消息:', message);
    
    // 处理ping消息，确认popup页面已打开
    if (message.type === 'ping') {
      sendResponse({ success: true, from: 'popup' });
      return true;
    }
    
    // 处理检测结果
    if (message.type === 'detectionResult') {
      console.log('处理检测结果消息:', message);
      
      // 更新状态文本
      if (status.textContent.includes('等待结果') || 
          status.textContent.includes('检测进行中')) {
        status.textContent = '检测完成';
      }
      
      // 显示结果区域
      result.style.display = 'block';
      
      // 更新检测结果文本
      resultText.textContent = message.isAI ? '检测到AI配音' : '未检测到AI配音';
      result.style.backgroundColor = message.isAI ? '#e8f5e9' : '#f5f5f5';
      
      // 标记按钮始终显示
      markAI.style.display = 'block';
      
      // 添加时间戳到结果
      const resultTime = document.createElement('div');
      resultTime.className = 'result-time';
      resultTime.textContent = `更新时间: ${new Date().toLocaleTimeString()}`;
      resultTime.style.fontSize = '12px';
      resultTime.style.color = '#888';
      resultTime.style.marginTop = '5px';
      
      // 检查是否已存在时间戳元素
      const existingTime = result.querySelector('.result-time');
      if (existingTime) {
        result.replaceChild(resultTime, existingTime);
      } else {
        result.appendChild(resultTime);
      }
      
      sendResponse({ success: true, received: true });
      return true;
    }
    
    return false;
  });

  // 从存储中加载设置
  function loadSettings() {
    chrome.storage.sync.get(['autoDetect'], function(result) {
      autoDetect.checked = result.autoDetect !== false;
    });
  }

  // 添加云熙配音优化按钮
  const optimizeYunxiBtn = document.createElement('button');
  optimizeYunxiBtn.className = 'button';
  optimizeYunxiBtn.textContent = '云熙配音优化';
  optimizeYunxiBtn.style.backgroundColor = '#f0f4ff';
  optimizeYunxiBtn.style.margin = '5px 0';
  
  // 添加按钮到settings元素
  if (settings) {
    settings.appendChild(optimizeYunxiBtn);
  }
  
  // 添加敏感度设置
  const sensitivityContainer = document.createElement('div');
  sensitivityContainer.className = 'setting-item';
  sensitivityContainer.style.margin = '10px 0';
  
  const sensitivityLabel = document.createElement('span');
  sensitivityLabel.textContent = '检测敏感度: ';
  sensitivityContainer.appendChild(sensitivityLabel);
  
  const sensitivitySlider = document.createElement('input');
  sensitivitySlider.type = 'range';
  sensitivitySlider.min = '1';
  sensitivitySlider.max = '5';
  sensitivitySlider.value = '3';
  sensitivitySlider.style.width = '100px';
  sensitivityContainer.appendChild(sensitivitySlider);
  
  const sensitivityValue = document.createElement('span');
  sensitivityValue.textContent = '中';
  sensitivityValue.style.marginLeft = '5px';
  sensitivityContainer.appendChild(sensitivityValue);
  
  // 添加敏感度设置到settings元素
  if (settings) {
    settings.appendChild(sensitivityContainer);
  }
  
  // 更新敏感度显示
  function updateSensitivityDisplay() {
    const value = parseInt(sensitivitySlider.value);
    let text = '';
    switch(value) {
      case 1: text = '极低'; break;
      case 2: text = '低'; break;
      case 3: text = '中'; break;
      case 4: text = '高'; break;
      case 5: text = '极高'; break;
    }
    sensitivityValue.textContent = text;
  }
  
  sensitivitySlider.addEventListener('input', updateSensitivityDisplay);
  
  // 云熙配音优化按钮
  optimizeYunxiBtn.addEventListener('click', async function() {
    try {
      status.textContent = '正在优化云熙配音检测...';
      
      // 保存当前敏感度设置
      const sensitivity = parseInt(sensitivitySlider.value);
      await chrome.storage.sync.set({ detectionSensitivity: sensitivity });
      
      // 发送优化检测消息
      const response = await sendMessageToContentScript({ 
        action: 'optimizeForYunxi',
        sensitivity: sensitivity
      });
      
      if (response.success) {
        status.textContent = '云熙配音优化完成，可开始检测';
        optimizeYunxiBtn.textContent = '已优化云熙配音';
        optimizeYunxiBtn.style.backgroundColor = '#e3f2fd';
      } else {
        status.textContent = response.error || '优化失败';
      }
    } catch (error) {
      console.error('优化失败:', error);
      status.textContent = '优化失败: ' + error.message;
    }
  });
}); 