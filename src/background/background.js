/**
 * AI语音检测器 - 后台脚本
 * 负责处理通知和消息传递
 */

console.log('AI语音检测器后台脚本已加载');

// 用于标记上次通知时间，防止频繁通知
let lastNotificationTime = 0;
let lastNotificationContent = '';

// 监听来自内容脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    // 调试信息
    console.log('后台脚本收到消息:', message);
    
    // 处理检测结果通知
    if (message.action === 'notifyResult') {
      // 创建通知
      showDetectionNotification(message.isAI);
      sendResponse({ success: true });
    }
    // 处理标记成功通知
    else if (message.action === 'notifyMarked') {
      // 创建标记成功通知
      showMarkedNotification();
      sendResponse({ success: true });
    }
    // 转发消息到popup
    else if (message.action === 'forwardToPopup') {
      forwardMessageToPopup(message);
      sendResponse({ success: true });
    }
    // 未知操作类型
    else {
      console.log('未知的操作类型:', message.action);
      sendResponse({ success: false, error: '未知的操作类型' });
    }
  } catch (error) {
    console.error('处理消息错误:', error);
    sendResponse({ success: false, error: error.message });
  }
  
  return true; // 保持消息通道打开
});

// 显示检测结果通知
function showDetectionNotification(isAI) {
  // 限制通知频率，防止通知轰炸
  const now = Date.now();
  if (now - lastNotificationTime < 5000) {
    console.log('通知冷却中，跳过');
    return;
  }

  const notificationContent = isAI ? '检测到AI配音' : '可能是人声';
  
  // 避免重复相同内容的通知
  if (notificationContent === lastNotificationContent) {
    console.log('相同内容通知，跳过');
    return;
  }
  
  // 更新通知状态
  lastNotificationTime = now;
  lastNotificationContent = notificationContent;
  
  // 创建通知选项
  const options = {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('assets/icon128.png'),
    title: 'AI语音检测器',
    message: notificationContent,
    silent: true // 通知不发出声音
  };
  
  // 显示通知
  try {
    chrome.notifications.create(`ai-voice-detection-${now}`, options, (notificationId) => {
      console.log('通知已创建:', notificationId);
      
      // 5秒后自动关闭通知
      setTimeout(() => {
        chrome.notifications.clear(notificationId);
      }, 5000);
    });
  } catch (error) {
    console.error('创建通知失败:', error);
  }
}

// 显示标记成功通知
function showMarkedNotification() {
  const options = {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('assets/icon128.png'),
    title: 'AI语音检测器',
    message: '已成功标记当前音频为AI配音',
    silent: true
  };
  
  try {
    chrome.notifications.create(`ai-voice-marked-${Date.now()}`, options);
  } catch (error) {
    console.error('创建标记通知失败:', error);
  }
}

// 转发消息到popup
function forwardMessageToPopup(message) {
  // 获取当前活动标签页
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length === 0) {
      console.log('没有活动标签页');
      return;
    }
    
    // 向活动标签页的popup发送消息
    try {
      chrome.runtime.sendMessage({
        action: 'popupUpdate',
        data: message.data
      }).catch(error => {
        // 如果popup未打开，会抛出错误，这是正常的
        if (error.message && error.message.includes('receiving end does not exist')) {
          // 只记录日志，不做特殊处理
          console.log('Popup未打开，消息未发送');
        } else {
          console.error('向popup发送消息失败:', error);
        }
      });
    } catch (error) {
      // 处理可能的异常
      console.error('向popup发送消息时出错:', error);
    }
  });
}

// 监听插件安装事件
chrome.runtime.onInstalled.addListener(() => {
  // 初始化设置
  chrome.storage.sync.set({
    autoDetect: true
  });
}); 