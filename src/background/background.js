// 监听插件安装事件
chrome.runtime.onInstalled.addListener(() => {
  // 初始化设置
  chrome.storage.sync.set({
    autoDetect: true
  });
});

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('background收到消息:', message);
  
  // 处理AI检测结果通知
  if (message.action === 'notifyResult') {
    // 创建通知
    chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('assets/1.png'),
      title: '检测结果',
      message: message.isAI ? '检测到AI配音' : '未检测到AI配音'
    });
    
    // 转发消息到popup
    try {
      // 使用更安全的方式发送消息，忽略错误
      chrome.runtime.sendMessage({
        type: 'detectionResult',
        isAI: message.isAI
      }).catch(e => {
        // 忽略"接收端不存在"的错误
        console.log('popup可能未打开，忽略错误:', e);
      });
    } catch (error) {
      // 忽略错误，不影响主流程
      console.log('转发消息到popup时出错，可能popup未打开:', error);
    }
    
    sendResponse({ success: true });
    return true;
  }
  
  return false;
}); 