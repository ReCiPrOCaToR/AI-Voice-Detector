console.log('AI语音检测器内容脚本已加载');

// 防止重复注入
if (window.AIVoiceDetector) {
  console.log('AI语音检测器已存在，跳过注入');
} else {
  console.log('注入AI语音检测器');
  
  // 音频分析工具
  const AudioAnalyzer = {
    // 默认敏感度设置
    sensitivity: 3,
    similarityThreshold: 0.9,
    detectionRequiredRatio: 0.7,
    distanceCoefficient: -1.5,
    
    // 初始化，从存储中加载设置
    init() {
      if (chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.get(['detectionSensitivity', 'yunxiOptimized'], (result) => {
          if (result.detectionSensitivity) {
            this.setSensitivity(result.detectionSensitivity);
            console.log('从存储中加载敏感度设置:', result.detectionSensitivity);
          }
          
          if (result.yunxiOptimized) {
            console.log('云熙配音优化已启用');
          }
        });
      }
    },

    // 音频特征提取
    extractFeatures(audioData) {
      // 计算音高变化（基于零交叉率的变化）
      let previousSign = audioData[0] > 0;
      let zeroCrossings = 0;
      let sumSquared = 0;
      let maxAmplitude = 0;
      let spectralSum = 0;
      let spectralWeightedSum = 0;
      
      // 将音频数据分析分成多个块，检测变化
      const blockSize = 128;
      const numBlocks = Math.floor(audioData.length / blockSize);
      const blockCrossings = new Array(numBlocks).fill(0);
      const blockEnergy = new Array(numBlocks).fill(0);
      
      // 计算每个块的过零率和能量
      for (let i = 0; i < audioData.length; i++) {
        // 过零率计算
        const currentSign = audioData[i] > 0;
        if (currentSign !== previousSign) {
          zeroCrossings++;
          previousSign = currentSign;
          
          // 记录块内过零情况
          const blockIndex = Math.floor(i / blockSize);
          if (blockIndex < numBlocks) {
            blockCrossings[blockIndex]++;
          }
        }
        
        // 能量计算
        const absValue = Math.abs(audioData[i]);
        sumSquared += absValue * absValue;
        maxAmplitude = Math.max(maxAmplitude, absValue);
        
        // 块能量
        const blockIdx = Math.floor(i / blockSize);
        if (blockIdx < numBlocks) {
          blockEnergy[blockIdx] += absValue * absValue;
        }
        
        // 简化的频谱分析 - 为频谱质心计算做准备
        // 我们使用索引作为频率的粗略代理
        spectralSum += absValue;
        spectralWeightedSum += i * absValue;
      }
      
      // 计算块间变化 - 用于音高和能量变化检测
      let pitchVariations = 0;
      let energyVariations = 0;
      
      for (let i = 1; i < numBlocks; i++) {
        // 平滑的过零率作为音高代理
        pitchVariations += Math.abs(blockCrossings[i] - blockCrossings[i-1]);
        
        // 能量变化
        energyVariations += Math.abs(blockEnergy[i] - blockEnergy[i-1]);
      }
      
      // 归一化特征
      const normalizedCrossings = zeroCrossings / audioData.length;
      const normalizedPitchVar = pitchVariations / (numBlocks > 1 ? numBlocks - 1 : 1) / blockSize;
      const energy = sumSquared / audioData.length;
      const normalizedEnergyVar = energyVariations / (numBlocks > 1 ? numBlocks - 1 : 1) / blockSize;
      
      // 计算频谱质心 (归一化为0-1)
      let spectralCentroid = 0;
      if (spectralSum > 0) {
        spectralCentroid = spectralWeightedSum / (spectralSum * audioData.length);
      }
      
      // 返回特征集
      return {
        // 主要特征
        pitch: normalizedPitchVar,
        energy: energy,
        zeroCrossings: normalizedCrossings,
        spectralCentroid: spectralCentroid,
        
        // 额外信息
        energyVariation: normalizedEnergyVar,
        maxAmplitude: maxAmplitude,
        timestamp: Date.now()
      };
    },

    // 计算音高
    calculatePitch(audioData) {
      // 使用自相关算法计算音高
      let sum = 0;
      for (let i = 0; i < audioData.length - 1; i++) {
        sum += Math.abs(audioData[i] - audioData[i + 1]);
      }
      return sum / audioData.length;
    },

    // 计算共振峰
    calculateFormants(audioData) {
      // 简化的共振峰计算
      const formants = [];
      for (let i = 0; i < 3; i++) {
        formants.push(Math.random() * 1000); // 示例值
      }
      return formants;
    },

    // 计算频谱质心
    calculateSpectralCentroid(audioData) {
      let sum = 0;
      let total = 0;
      for (let i = 0; i < audioData.length; i++) {
        sum += Math.abs(audioData[i]) * i;
        total += Math.abs(audioData[i]);
      }
      return total > 0 ? sum / total : 0;
    },

    // 计算过零率
    calculateZeroCrossings(audioData) {
      let crossings = 0;
      for (let i = 0; i < audioData.length - 1; i++) {
        if ((audioData[i] >= 0 && audioData[i + 1] < 0) ||
            (audioData[i] < 0 && audioData[i + 1] >= 0)) {
          crossings++;
        }
      }
      return crossings / audioData.length;
    },

    // 计算能量
    calculateEnergy(audioData) {
      let sum = 0;
      for (let i = 0; i < audioData.length; i++) {
        sum += audioData[i] * audioData[i];
      }
      return Math.sqrt(sum / audioData.length);
    },

    // 使用默认规则检测AI配音
    useDefaultDetection(features, resolve) {
      // 使用针对云熙等高质量AI配音优化的检测算法
      const pitchVariation = features.pitch;
      const energyLevel = features.energy;
      const zeroCrossRate = features.zeroCrossings;
      const spectralCentroid = features.spectralCentroid || 0;
      
      console.log('AI配音检测 - 特征值:', {
        pitch: pitchVariation.toFixed(4),
        energy: energyLevel.toFixed(4),
        zeroCrossings: zeroCrossRate.toFixed(4),
        spectralCentroid: spectralCentroid.toFixed(4)
      });
      
      // 优化后的阈值，特别针对云熙配音特征
      let conditionsMet = 0;
      let conditionsTotal = 0;
      
      // 1. 音高变化：云熙配音音高变化平滑但不是完全不变
      conditionsTotal++;
      if (pitchVariation < 0.05) {
        conditionsMet++;
        console.log('✓ 音高特征符合AI配音');
      } else {
        console.log('✗ 音高特征不符合AI配音');
      }
      
      // 2. 能量范围：云熙配音能量控制很好，但范围更宽
      conditionsTotal++;
      if (energyLevel > 0.08 && energyLevel < 0.7) {
        conditionsMet++;
        console.log('✓ 能量特征符合AI配音');
      } else {
        console.log('✗ 能量特征不符合AI配音');
      }
      
      // 3. 过零率：云熙配音波形更规则但模拟了一些人声特征
      conditionsTotal++;
      if (zeroCrossRate < 0.25) {
        conditionsMet++;
        console.log('✓ 过零率特征符合AI配音');
      } else {
        console.log('✗ 过零率特征不符合AI配音');
      }
      
      // 4. 频谱质心：检测云熙配音频谱分布特征
      if (spectralCentroid > 0) {
        conditionsTotal++;
        if (spectralCentroid > 0.4 && spectralCentroid < 0.7) {
          conditionsMet++;
          console.log('✓ 频谱质心特征符合AI配音');
        } else {
          console.log('✗ 频谱质心特征不符合AI配音');
        }
      }
      
      // 获取敏感度设置的比率，如果没有设置使用默认值0.7
      const requiredRatio = this.detectionRequiredRatio || 0.7;
      const ratio = conditionsMet / conditionsTotal;
      const isAI = ratio >= requiredRatio;
      
      console.log(`AI配音检测结果: ${isAI ? '是AI配音' : '可能是人声'} (满足${conditionsMet}/${conditionsTotal}条件，比率${ratio.toFixed(2)}，阈值${requiredRatio})`);
      resolve(isAI);
    },

    // 判断是否为AI配音
    isAIVoice(features) {
      // 从存储中获取已标记的AI配音特征
      return new Promise((resolve) => {
        try {
          // 检查扩展上下文是否有效
          if (!chrome.runtime || !chrome.runtime.id) {
            console.log('扩展上下文已失效');
            resolve(false);
            return;
          }

          // 记录当前分析的特征值
          console.log('当前音频特征:', {
            pitch: features.pitch.toFixed(4),
            energy: features.energy.toFixed(4),
            zeroCrossings: features.zeroCrossings.toFixed(4),
            spectralCentroid: features.spectralCentroid?.toFixed(4) || 'N/A'
          });

          // 获取标记的样本
          chrome.storage.sync.get(['markedAIVoices'], (result) => {
            // 检查chrome.runtime.lastError
            if (chrome.runtime.lastError) {
              console.log('存储访问错误:', chrome.runtime.lastError);
              // 使用默认检测
              this.useDefaultDetection(features, resolve);
              return;
            }

            const markedVoices = result.markedAIVoices || [];
            console.log(`从存储中获取到${markedVoices.length}个AI配音标记`);
            
            // 如果没有标记的样本，使用默认检测
            if (markedVoices.length === 0) {
              this.useDefaultDetection(features, resolve);
              return;
            }

            // 如果有标记样本，计算与所有已标记样本的相似度
            let similarities = [];
            let detailLog = [];
            
            for (let i = 0; i < markedVoices.length; i++) {
              const markedFeatures = markedVoices[i].features;
              if (!markedFeatures) continue;
              
              const similarity = this.calculateSimilarity(features, markedFeatures);
              similarities.push(similarity);
              
              // 记录详细日志
              detailLog.push({
                index: i+1,
                similarity: similarity.toFixed(4),
                markedFeatures: {
                  pitch: markedFeatures.pitch?.toFixed(4) || 'N/A',
                  energy: markedFeatures.energy?.toFixed(4) || 'N/A',
                  zeroCrossings: markedFeatures.zeroCrossings?.toFixed(4) || 'N/A',
                  spectralCentroid: markedFeatures.spectralCentroid?.toFixed(4) || 'N/A'
                }
              });
            }
            
            // 找出最大相似度
            const maxSimilarity = Math.max(...similarities);
            console.log('最大相似度:', maxSimilarity.toFixed(4));
            
            // 打印详细日志
            console.log('相似度详情:', detailLog);

            // 使用设置的相似度阈值，如果没有设置使用默认值0.9
            const similarityThreshold = this.similarityThreshold || 0.9;
            const isAI = maxSimilarity > similarityThreshold;
            console.log(`基于相似度的检测结果: ${isAI ? '是AI配音' : '可能是人声'} (阈值: ${similarityThreshold}, 最大相似度: ${maxSimilarity.toFixed(4)})`);
            
            // 如果相似度较低但不是很低，结合默认检测再次判断
            if (!isAI && maxSimilarity > 0.2) {
              console.log('相似度较低但不是很低，进一步使用默认规则检测');
              this.useDefaultDetection(features, isDefaultAI => {
                // 如果两种方法有一种判断为AI，则认为是AI
                const finalResult = isDefaultAI || isAI;
                console.log(`最终检测结果: ${finalResult ? '是AI配音' : '可能是人声'} (综合相似度和规则判断)`);
                resolve(finalResult);
              });
            } else {
              resolve(isAI);
            }
          });
        } catch (error) {
          console.error('AI配音检测错误:', error);
          // 出错时使用默认检测
          this.useDefaultDetection(features, resolve);
        }
      });
    },

    // 计算特征相似度
    calculateSimilarity(features1, features2) {
      // 针对云熙等AI配音特征的优化权重
      const weights = {
        pitch: 0.25, // 降低音高变化的权重，因为云熙配音的音高变化可能更自然
        energy: 0.2, // 降低能量权重
        zeroCrossings: 0.25, // 提高过零率权重
        spectralCentroid: 0.3  // 大幅提高频谱质心权重，这是区分云熙配音的关键特征
      };
      
      // 计算加权欧氏距离
      let sum = 0;
      let totalWeight = 0;
      let featureDistances = {};
      
      // 处理所有特征
      for (const key in weights) {
        if (features1[key] !== undefined && features2[key] !== undefined) {
          const diff = features1[key] - features2[key];
          const squaredDiff = diff * diff;
          sum += weights[key] * squaredDiff;
          totalWeight += weights[key];
          
          // 记录各特征的距离，用于日志
          featureDistances[key] = Math.sqrt(squaredDiff);
        }
      }
      
      // 如果没有有效特征，返回0
      if (totalWeight === 0) return 0;
      
      // 归一化距离
      const distance = Math.sqrt(sum / totalWeight);
      
      // 细节日志 - 但要限制在需要详细日志时才输出，避免过多输出
      if (distance < 0.5) {
        console.log('特征距离详情:', {
          总距离: distance.toFixed(4),
          音高距离: featureDistances.pitch?.toFixed(4) || 'N/A',
          能量距离: featureDistances.energy?.toFixed(4) || 'N/A',
          过零率距离: featureDistances.zeroCrossings?.toFixed(4) || 'N/A',
          频谱质心距离: featureDistances.spectralCentroid?.toFixed(4) || 'N/A'
        });
      }
      
      // 使用修改后的高斯函数计算相似度，使云熙配音更容易匹配
      // 使用敏感度设置的距离系数，如果没有设置则使用默认值-1.5
      const distanceCoefficient = this.distanceCoefficient || -1.5;
      return Math.exp(distanceCoefficient * distance);
    },

    // 设置敏感度
    setSensitivity(sensitivity) {
      // 实现敏感度设置逻辑
      sensitivity = Number(sensitivity) || 3; // 默认中等敏感度
      console.log('设置AI配音检测敏感度:', sensitivity);
      
      // 根据敏感度级别调整阈值和参数
      this.sensitivity = sensitivity;
      
      // 根据敏感度调整相似度阈值
      if (sensitivity === 1) { // 极低敏感度
        console.log('设置极低敏感度');
        this.similarityThreshold = 0.95; // 需要非常高相似度才判断为AI
      } else if (sensitivity === 2) { // 低敏感度
        console.log('设置低敏感度');
        this.similarityThreshold = 0.92;
      } else if (sensitivity === 3) { // 中等敏感度
        console.log('设置中等敏感度');
        this.similarityThreshold = 0.9;
      } else if (sensitivity === 4) { // 高敏感度
        console.log('设置高敏感度');
        this.similarityThreshold = 0.87;
      } else if (sensitivity === 5) { // 极高敏感度
        console.log('设置极高敏感度');
        this.similarityThreshold = 0.85; // 需要较高相似度就判断为AI
      }
      
      // 根据敏感度调整必要条件比率
      switch(sensitivity) {
        case 1: // 极低敏感度
          this.detectionRequiredRatio = 0.85; // 需要满足更多条件
          this.distanceCoefficient = -2.0; // 更严格的距离系数
          break;
        case 2: // 低敏感度
          this.detectionRequiredRatio = 0.8;
          this.distanceCoefficient = -1.8;
          break;
        case 3: // 中等敏感度(默认)
          this.detectionRequiredRatio = 0.7;
          this.distanceCoefficient = -1.5;
          break;
        case 4: // 高敏感度
          this.detectionRequiredRatio = 0.6;
          this.distanceCoefficient = -1.2;
          break;
        case 5: // 极高敏感度
          this.detectionRequiredRatio = 0.5; // 只需满足一半条件
          this.distanceCoefficient = -1.0; // 更宽松的距离系数
          break;
      }
      
      console.log('检测参数已调整:', {
        相似度阈值: this.similarityThreshold,
        必要条件比率: this.detectionRequiredRatio,
        距离系数: this.distanceCoefficient
      });
      
      return {
        similarityThreshold: this.similarityThreshold,
        detectionRequiredRatio: this.detectionRequiredRatio,
        distanceCoefficient: this.distanceCoefficient
      };
    }
  };

  // 视频检测器
  class AIVoiceDetector {
    constructor() {
      this.isDetecting = false;
      this.audioContexts = new Map();
      this.audioNodes = new Map();
      this.isExtensionValid = true;
      this.observer = null;
      this.lastResult = null;
      this.processedVideos = new Set(); // 添加已处理视频的集合
      this.lastAnalysisTime = 0;
      this.lastNotificationTime = 0;
      this.analyzeCount = 0;
      this.animationFrame = null;
      this.videoElements = new Set(); // 存储当前处理的视频元素

      // 用于标记的变量
      this.markingStartTime = null;   // 标记开始时间
      this.markingStartData = null;   // 标记开始时的音频数据
      this.audioBuffer = [];          // 用于存储音频分析的历史数据
      this.isMarking = false;         // 是否正在标记状态
    }

    // 初始化检测
    init() {
      // 设置DOM观察器，监听视频元素的变化
      this.observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeName === 'VIDEO' && !this.processedVideos.has(node)) {
              this.handleVideoElement(node);
            }
          });
        });
      });

      // 开始观察DOM变化
      this.observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      // 扫描现有的视频元素
      this.scanForVideos();
    }

    // 扫描页面中的视频元素
    scanForVideos() {
      const videos = document.getElementsByTagName('video');
      Array.from(videos).forEach(video => {
        if (!this.processedVideos.has(video)) {
          this.handleVideoElement(video);
        }
      });
    }

    // 处理视频元素
    handleVideoElement(video) {
      if (!this.isExtensionValid || this.processedVideos.has(video)) return;

      try {
        // 增加视频元素检查的日志
        console.log('开始处理视频元素:', video);
        console.log('视频元素属性:', {
          src: video.src,
          currentSrc: video.currentSrc,
          readyState: video.readyState,
          networkState: video.networkState,
          error: video.error,
          paused: video.paused
        });

        // 检查视频元素是否有效
        if (!video) {
          console.log('视频元素无效');
          return;
        }

        // B站可能没有audioTracks属性，跳过这个检查
        // if (!video.audioTracks || video.audioTracks.length === 0) {
        //   console.log('视频元素没有音频轨道，跳过处理');
        //   return;
        // }

        // 检查是否已经存在音频上下文
        if (this.audioContexts.has(video)) {
          console.log('视频元素已有音频上下文，跳过处理');
          return;
        }

        // 创建音频上下文
        console.log('创建音频上下文');
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // 检查音频上下文是否创建成功
        if (!audioContext) {
          console.error('无法创建音频上下文');
          return;
        }

        // 创建媒体元素源
        let source;
        try {
          console.log('创建媒体元素源');
          source = audioContext.createMediaElementSource(video);
          console.log('媒体元素源创建成功');
        } catch (error) {
          console.error('创建媒体元素源失败:', error);
          audioContext.close();
          return;
        }

        // 创建分析器和增益节点
        console.log('创建分析器和增益节点');
        const analyser = audioContext.createAnalyser();
        const gainNode = audioContext.createGain();
        
        // 设置增益值为1.0（不改变音量）
        gainNode.gain.value = 1.0;

        // 设置音频节点
        try {
          console.log('设置音频节点连接');
          
          // 连接节点
          source.connect(analyser);
          analyser.connect(gainNode);
          gainNode.connect(audioContext.destination);

          // 设置分析器参数
          analyser.fftSize = 2048;
          analyser.smoothingTimeConstant = 0.8;
          
          console.log('音频节点连接成功');
        } catch (error) {
          console.error('连接音频节点失败:', error);
          try {
            audioContext.close();
          } catch (e) {
            console.error('关闭音频上下文失败:', e);
          }
          return;
        }

        // 存储音频上下文和节点
        console.log('存储音频上下文和节点');
        this.audioContexts.set(video, audioContext);
        this.audioNodes.set(video, { source, analyser, gainNode });
        this.processedVideos.add(video);

        // 验证音频节点已正确存储
        const storedNodes = this.audioNodes.get(video);
        console.log('验证音频节点:', storedNodes ? '存在' : '不存在');
        if (storedNodes) {
          console.log('分析器存在:', !!storedNodes.analyser);
          console.log('音频源存在:', !!storedNodes.source);
          console.log('增益节点存在:', !!storedNodes.gainNode);
        }

        // 监听视频播放事件
        console.log('添加视频事件监听器');
        video.addEventListener('play', () => {
          if (this.isExtensionValid) {
            console.log('视频开始播放，启动音频分析');
            this.startAudioAnalysis(video);
          }
        });

        // 监听视频暂停事件
        video.addEventListener('pause', () => {
          console.log('视频暂停，停止音频分析');
          this.stopAudioAnalysis(video);
        });

        // 监听视频结束事件
        video.addEventListener('ended', () => {
          console.log('视频结束，停止音频分析');
          this.stopAudioAnalysis(video);
        });

        // 监听视频移除事件
        video.addEventListener('remove', () => {
          console.log('视频移除，清理资源');
          this.cleanupVideo(video);
        });

        console.log('视频元素处理成功');
      } catch (error) {
        console.error('处理视频元素错误:', error);
        // 清理可能部分创建的资源
        this.cleanupVideo(video);
      }
    }

    // 清理单个视频的资源
    cleanupVideo(video) {
      const audioNodes = this.audioNodes.get(video);
      if (audioNodes) {
        try {
          if (audioNodes.analyser) {
            audioNodes.analyser.disconnect();
          }
          if (audioNodes.source) {
            audioNodes.source.disconnect();
          }
          if (audioNodes.gainNode) {
            audioNodes.gainNode.disconnect();
          }
        } catch (error) {
          console.error('清理音频节点失败:', error);
        }
      }

      const audioContext = this.audioContexts.get(video);
      if (audioContext) {
        try {
          audioContext.close();
        } catch (error) {
          console.error('关闭音频上下文失败:', error);
        }
      }

      this.audioNodes.delete(video);
      this.audioContexts.delete(video);
      this.processedVideos.delete(video);
    }

    // 开始音频分析
    startAudioAnalysis(video) {
      if (!this.isExtensionValid) {
        console.log('扩展上下文无效，无法启动音频分析');
        return;
      }

      const audioNodes = this.audioNodes.get(video);
      if (!audioNodes || !audioNodes.analyser) {
        console.log('音频节点不存在，跳过分析');
        return;
      }

      console.log('开始音频分析 - 针对云熙配音优化版');
      const { analyser } = audioNodes;
      analyser.fftSize = 2048; // 使用较大的FFT以获得更细的频率分辨率
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Float32Array(bufferLength);

      // 设置初始检测时间
      this.lastAnalysisTime = 0;
      this.lastNotificationTime = 0;
      this.analyzeCount = 0;
      this.pendingAnalysis = false;
      this.consecutiveAIDetections = 0; // 连续AI检测次数
      this.consecutiveHumanDetections = 0; // 连续人声检测次数

      // 立即执行第一次分析，不等待防抖
      console.log('立即执行第一次分析 - 云熙配音检测');
      
      // 执行首次分析
      const runFirstAnalysis = () => {
        try {
          analyser.getFloatTimeDomainData(dataArray);
          
          // 检查数据是否有效
          let hasSound = false;
          let maxValue = 0;
          let sumSquared = 0;
          
          // 分析样本数据是否有足够的音量
          for (let i = 0; i < Math.min(1000, dataArray.length); i++) {
            const value = Math.abs(dataArray[i]);
            maxValue = Math.max(maxValue, value);
            sumSquared += value * value;
            if (value > 0.01) {
              hasSound = true;
            }
          }
          
          // 计算RMS音量
          const rms = Math.sqrt(sumSquared / Math.min(1000, dataArray.length));
          console.log('首次分析数据检查: 最大值 =', maxValue.toFixed(4), 
                     'RMS =', rms.toFixed(4), '有声音 =', hasSound);
          
          // 如果音量太小，等待并重试
          if (!hasSound || rms < 0.01) {
            console.log('首次分析未检测到足够声音，等待300ms后重试');
            setTimeout(runFirstAnalysis, 300);
            return;
          }
          
          // 提取音频特征
          const features = AudioAnalyzer.extractFeatures(dataArray);
          
          // 检查是否为AI配音
          AudioAnalyzer.isAIVoice(features)
            .then(isAI => {
              if (!this.isExtensionValid) return;
              
              this.lastResult = isAI;
              console.log('首次分析结果:', isAI ? '是AI配音' : '可能是人声');
              
              // 立即通知结果
              this.notifyDetectionResult(isAI);
              
              // 如果首次未检测为AI，尝试再次分析以提高准确率
              if (!isAI) {
                console.log('首次未检测为AI，300ms后再尝试一次');
                setTimeout(() => {
                  try {
                    analyser.getFloatTimeDomainData(dataArray);
                    const features2 = AudioAnalyzer.extractFeatures(dataArray);
                    
                    AudioAnalyzer.isAIVoice(features2)
                      .then(isAI2 => {
                        if (!this.isExtensionValid) return;
                        this.lastResult = isAI2;
                        console.log('二次分析结果:', isAI2 ? '是AI配音' : '可能是人声');
                        this.notifyDetectionResult(isAI2);
                      })
                      .catch(error => {
                        console.error('二次AI配音检测错误:', error);
                      });
                  } catch (error) {
                    console.error('二次音频分析错误:', error);
                  }
                }, 300);
              }
            })
            .catch(error => {
              console.error('首次AI配音检测错误:', error);
            });
        } catch (error) {
          console.error('首次音频分析错误:', error);
        }
      };
      
      // 立即执行首次分析
      setTimeout(runFirstAnalysis, 200);

      const analyze = () => {
        if (!this.isExtensionValid) {
          console.log('扩展上下文无效，停止分析');
          return;
        }

        // 如果正在进行分析，跳过此帧
        if (this.pendingAnalysis) {
          this.animationFrame = requestAnimationFrame(analyze);
          return;
        }

        // 获取当前时间
        const now = Date.now();
        
        // 节流处理，每120毫秒分析一次（从150ms降低到120ms）
        if (now - this.lastAnalysisTime >= 120) {
          this.lastAnalysisTime = now;
          this.analyzeCount++;
          this.pendingAnalysis = true;
          
          try {
            analyser.getFloatTimeDomainData(dataArray);
            
            // 每15帧记录一次数据统计(从20帧降低到15帧)
            if (this.analyzeCount % 15 === 0) {
              let nonZeroCount = 0;
              let maxValue = 0;
              for (let i = 0; i < Math.min(100, dataArray.length); i++) {
                const value = Math.abs(dataArray[i]);
                maxValue = Math.max(maxValue, value);
                if (value > 0.001) nonZeroCount++;
              }
              console.log(`音频分析中 - 帧 ${this.analyzeCount} - 非零值: ${nonZeroCount}, 最大值: ${maxValue}`);
            }
            
            // 每2帧分析一次AI配音（从3帧减少到2帧）
            if (this.analyzeCount % 2 === 0) {
              const features = AudioAnalyzer.extractFeatures(dataArray);
              
              // 如果处于标记状态，记录音频特征
              if (this.isMarking) {
                this.audioBuffer.push(features);
                // 限制缓冲区大小，避免内存溢出
                if (this.audioBuffer.length > 300) { // 约1分钟的数据
                  this.audioBuffer.shift();
                }
              }
              
              // 检查是否为AI配音
              AudioAnalyzer.isAIVoice(features)
                .then(isAI => {
                  if (!this.isExtensionValid) return;
                  
                  // 使用连续检测次数来提高检测稳定性
                  if (isAI) {
                    this.consecutiveAIDetections++;
                    this.consecutiveHumanDetections = 0;
                  } else {
                    this.consecutiveHumanDetections++;
                    this.consecutiveAIDetections = 0;
                  }
                  
                  // 只在以下情况通知结果:
                  // 1. 结果变化且连续检测达到阈值
                  // 2. 每8帧发送一次最新结果（从10帧减少到8帧）
                  const stableAI = this.consecutiveAIDetections >= 2;
                  const stableHuman = this.consecutiveHumanDetections >= 3; // 人声需要更多确认
                  
                  if ((this.lastResult !== isAI && (stableAI || stableHuman)) || 
                      this.analyzeCount % 8 === 0) {
                    this.lastResult = isAI;
                    this.notifyDetectionResult(isAI);
                  }
                  this.pendingAnalysis = false;
                })
                .catch(error => {
                  this.pendingAnalysis = false;
                  if (error.message && error.message.includes('Extension context invalidated')) {
                    this.isExtensionValid = false;
                    return;
                  }
                  console.error('AI配音检测错误:', error);
                });
            } else {
              this.pendingAnalysis = false;
            }
          } catch (error) {
            this.pendingAnalysis = false;
            if (error.message && error.message.includes('Extension context invalidated')) {
              this.isExtensionValid = false;
              return;
            }
            console.error('音频分析错误:', error);
          }
        } else {
          this.pendingAnalysis = false;
        }

        // 如果扩展上下文仍然有效，继续分析
        if (this.isExtensionValid) {
          this.animationFrame = requestAnimationFrame(analyze);
        }
      };

      this.animationFrame = requestAnimationFrame(analyze);
      console.log('音频分析循环已启动 - 云熙配音检测增强版');
    }

    // 停止音频分析
    stopAudioAnalysis(video) {
      // 取消动画帧请求
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
        this.animationFrame = null;
      }

      const audioNodes = this.audioNodes.get(video);
      if (audioNodes && audioNodes.analyser) {
        try {
          // 不要断开连接，只是停止分析
          console.log('停止音频分析');
        } catch (error) {
          console.error('停止音频分析失败:', error);
        }
      }
    }

    // 通知检测结果
    notifyDetectionResult(isAI) {
      // 首先检查扩展上下文是否有效
      if (!this.isExtensionValid) {
        console.log('扩展上下文无效，停止发送通知');
        return;
      }

      // 限制通知频率，防止闪烁
      const now = Date.now();
      if (this.lastNotificationTime && now - this.lastNotificationTime < 2000) {
        // 距离上次通知不到2秒，跳过
        return;
      }
      this.lastNotificationTime = now;

      try {
        // 记录检测结果
        console.log('检测结果:', isAI ? 'AI配音' : '人声');
        
        // 直接向background发送消息
        chrome.runtime.sendMessage({
          action: 'notifyResult',
          isAI: isAI
        }, response => {
          console.log('通知结果响应:', response);
          if (chrome.runtime.lastError) {
            console.error('通知结果错误:', chrome.runtime.lastError.message);
          }
        });
      } catch (error) {
        console.error('通知检测结果处理失败:', error.message);
        // 标记扩展上下文为无效，避免继续尝试
        if (error.message.includes('Extension context invalidated')) {
          this.isExtensionValid = false;
        }
      }
    }

    // 开始检测
    startDetection() {
      this.isDetecting = true;
      this.scanForVideos();
      return { success: true };
    }

    // 停止检测
    stopDetection() {
      this.isDetecting = false;
      // 停止所有音频分析
      document.querySelectorAll('video').forEach(video => {
        this.stopAudioAnalysis(video);
      });
      return { success: true };
    }

    // 标记当前音频
    async markCurrentAudio() {
      if (!this.isExtensionValid) {
        return { success: false, error: '扩展上下文无效' };
      }

      try {
        // 使用更广泛的选择器查找视频
        console.log('查找视频元素...');
        let video = document.querySelector('video:not([paused])');
        
        // 如果没找到正在播放的视频，尝试查找所有视频
        if (!video) {
          const allVideos = document.querySelectorAll('video');
          console.log('找到的视频数量:', allVideos.length);
          
          // 查找第一个有src或currentSrc属性的视频
          for (const v of allVideos) {
            if (v.src || v.currentSrc) {
              video = v;
              console.log('找到带src的视频:', v.src || v.currentSrc);
              break;
            }
          }
          
          // 如果仍然没找到，使用第一个视频
          if (!video && allVideos.length > 0) {
            video = allVideos[0];
            console.log('使用第一个视频元素');
          }
        }

        if (!video) {
          console.log('页面上没有找到视频元素');
          return { success: false, error: '没有找到视频元素' };
        }

        console.log('找到视频元素:', video);
        console.log('视频状态:', video.paused ? '暂停' : '播放中', '时长:', video.duration);

        // 如果视频还没有被处理，先处理它
        if (!this.processedVideos.has(video)) {
          console.log('视频尚未处理，开始处理');
          this.handleVideoElement(video);
          
          // 等待处理完成
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          console.log('视频已被处理');
        }

        // 再次检查音频节点
        const audioNodes = this.audioNodes.get(video);
        if (!audioNodes) {
          // 尝试重新处理视频
          console.log('找不到音频节点，尝试重新处理视频');
          this.cleanupVideo(video);
          this.processedVideos.delete(video);
          this.handleVideoElement(video);
          
          // 等待重新处理完成
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // 第三次检查音频节点
          const retriedAudioNodes = this.audioNodes.get(video);
          if (!retriedAudioNodes) {
            console.log('重试后仍无法获取音频节点');
            return { success: false, error: '无法获取音频节点' };
          }
        }
        
        // 再次获取音频节点（可能是重试后获取的）
        const finalAudioNodes = this.audioNodes.get(video);
        if (!finalAudioNodes) {
          console.log('无法获取音频节点');
          return { success: false, error: '无法获取音频节点' };
        }
        
        if (!finalAudioNodes.analyser) {
          console.log('无法获取分析器');
          return { success: false, error: '无法获取分析器' };
        }

        // 获取音频上下文
        const audioContext = this.audioContexts.get(video);
        if (!audioContext) {
          console.log('无法获取音频上下文');
          return { success: false, error: '无法获取音频上下文' };
        }

        const { analyser, source, gainNode } = finalAudioNodes;
        
        try {
          // 确保分析器已连接
          console.log('尝试重新连接音频节点');
          
          // 断开现有连接
          try {
            source.disconnect();
          } catch (e) {
            console.log('断开source连接时出错:', e);
          }
          
          try {
            analyser.disconnect();
          } catch (e) {
            console.log('断开analyser连接时出错:', e);
          }
          
          try {
            gainNode.disconnect();
          } catch (e) {
            console.log('断开gainNode连接时出错:', e);
          }
          
          // 重新连接节点
          source.connect(analyser);
          analyser.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          // 设置分析器参数
          analyser.fftSize = 2048;
          analyser.smoothingTimeConstant = 0.8;
          
          // 获取音频数据
          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Float32Array(bufferLength);
          
          // 等待更长时间确保音频数据已经准备好
          console.log('等待音频数据准备...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          console.log('获取音频数据');
          analyser.getFloatTimeDomainData(dataArray);
          
          // 检查音频数据是否有效
          if (dataArray.length === 0) {
            console.log('音频数据长度为0');
            return { success: false, error: '音频数据为空' };
          }

          // 检查音频数据是否包含有效信息
          let hasValidData = false;
          let maxValue = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const value = Math.abs(dataArray[i]);
            maxValue = Math.max(maxValue, value);
            if (value > 0.001) {
              hasValidData = true;
              break;
            }
          }

          console.log('音频数据最大值:', maxValue);
          
          if (!hasValidData) {
            console.log('音频数据无效 (无非零值)');
            return { success: false, error: '音频数据无效 (无有效声音)' };
          }

          // 提取特征
          console.log('提取音频特征');
          const features = AudioAnalyzer.extractFeatures(dataArray);
          return { success: true, features };
        } catch (error) {
          console.error('处理音频节点错误:', error);
          return { success: false, error: '处理音频节点错误: ' + error.message };
        }
      } catch (error) {
        console.error('标记错误:', error);
        return { success: false, error: '标记失败: ' + error.message };
      }
    }

    // 清理资源
    cleanup() {
      console.log('清理扩展资源');
      
      // 取消动画帧
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
        this.animationFrame = null;
      }
      
      // 停止检测
      this.stopDetection();
      
      // 断开观察器
      if (this.observer) {
        this.observer.disconnect();
      }
      
      // 处理所有视频
      this.processedVideos.forEach(video => {
        // 不要断开音频连接，只清理资源
        const audioNodes = this.audioNodes.get(video);
        if (audioNodes) {
          // 不操作音频节点，保持视频声音
        }
      });
      
      // 清空集合但不关闭音频上下文
      this.audioNodes.clear();
      this.audioContexts.clear();
      this.processedVideos.clear();
      
      console.log('资源清理完成');
    }

    // 开始标记音频
    async startAudioMarking() {
      if (!this.isExtensionValid) {
        return { success: false, error: '扩展上下文无效' };
      }

      try {
        // 获取当前播放的视频
        const video = document.querySelector('video');
        if (!video) {
          return { success: false, error: '没有找到视频元素' };
        }

        if (video.paused) {
          return { success: false, error: '视频未播放，请先播放视频' };
        }

        // 记录开始标记的时间
        this.markingStartTime = video.currentTime;
        console.log('开始标记，视频时间:', this.markingStartTime);
        
        // 如果视频还没有被处理，先处理它
        if (!this.processedVideos.has(video)) {
          console.log('视频尚未处理，开始处理');
          this.handleVideoElement(video);
          
          // 等待处理完成
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // 获取当前音频数据作为开始标记点
        const audioNodes = this.audioNodes.get(video);
        if (!audioNodes || !audioNodes.analyser) {
          return { success: false, error: '无法获取音频节点' };
        }

        // 清空音频缓冲区
        this.audioBuffer = [];
        
        // 开始记录音频数据
        this.isMarking = true;
        
        return { 
          success: true, 
          message: '开始标记成功', 
          startTime: this.markingStartTime 
        };
      } catch (error) {
        console.error('开始标记错误:', error);
        return { success: false, error: '开始标记失败: ' + error.message };
      }
    }

    // 完成音频标记
    async completeAudioMarking() {
      if (!this.isExtensionValid) {
        return { success: false, error: '扩展上下文无效' };
      }

      if (!this.isMarking || this.markingStartTime === null) {
        return { success: false, error: '未找到标记起始点，请先开始标记' };
      }

      try {
        // 获取当前播放的视频
        const video = document.querySelector('video');
        if (!video) {
          return { success: false, error: '没有找到视频元素' };
        }

        // 记录结束标记的时间
        const markingEndTime = video.currentTime;
        console.log('完成标记，开始时间:', this.markingStartTime, '结束时间:', markingEndTime);
        
        // 计算标记持续时间
        const duration = markingEndTime - this.markingStartTime;
        if (duration <= 0) {
          return { success: false, error: '标记区间无效，结束时间必须大于开始时间' };
        }
        
        // 如果缓冲区中没有足够的音频数据，返回错误
        if (this.audioBuffer.length === 0) {
          return { success: false, error: '未捕获到有效音频数据' };
        }
        
        // 分析收集到的音频数据
        console.log(`处理收集到的${this.audioBuffer.length}个音频样本`);
        
        // 聚合所有音频特征
        let aggregatedFeatures = {
          pitch: 0,
          formants: 0,
          spectralCentroid: 0,
          zeroCrossings: 0,
          energy: 0
        };
        
        // 计算特征的平均值
        for (const features of this.audioBuffer) {
          aggregatedFeatures.pitch += features.pitch;
          aggregatedFeatures.formants += features.formants;
          aggregatedFeatures.spectralCentroid += features.spectralCentroid;
          aggregatedFeatures.zeroCrossings += features.zeroCrossings;
          aggregatedFeatures.energy += features.energy;
        }
        
        // 除以样本数量得到平均值
        const count = this.audioBuffer.length;
        aggregatedFeatures.pitch /= count;
        aggregatedFeatures.formants /= count;
        aggregatedFeatures.spectralCentroid /= count;
        aggregatedFeatures.zeroCrossings /= count;
        aggregatedFeatures.energy /= count;
        
        // 重置标记状态
        this.markingStartTime = null;
        this.markingStartData = null;
        this.isMarking = false;
        
        return {
          success: true,
          features: aggregatedFeatures,
          startTime: this.markingStartTime,
          endTime: markingEndTime,
          duration: duration,
          samplesCount: count
        };
      } catch (error) {
        console.error('完成标记错误:', error);
        
        // 重置标记状态
        this.markingStartTime = null;
        this.markingStartData = null;
        this.isMarking = false;
        
        return { success: false, error: '完成标记失败: ' + error.message };
      }
    }

    // 改善云熙配音检测
    optimizeForYunxi(sensitivity = 3) {
      if (!this.isExtensionValid) {
        console.log('扩展上下文无效，无法优化');
        return { success: false, error: '扩展上下文无效' };
      }
      
      console.log('正在优化云熙配音检测，敏感度:', sensitivity);
      
      // 保存敏感度设置到存储
      chrome.storage.sync.set({ 
        yunxiOptimized: true,
        detectionSensitivity: sensitivity 
      });
      
      // 直接设置当前检测器的敏感度
      AudioAnalyzer.setSensitivity(sensitivity);
      
      // 如果当前有视频正在播放，重启检测
      if (this.videoElements.size > 0) {
        console.log('重启视频检测以应用云熙优化');
        
        // 停止当前分析
        if (this.animationFrame) {
          cancelAnimationFrame(this.animationFrame);
          this.animationFrame = null;
        }
        
        // 对所有视频应用云熙优化检测
        this.videoElements.forEach(video => {
          this.stopDetection(video);
          setTimeout(() => {
            this.startDetection(video);
          }, 300);
        });
      }
      
      return { success: true };
    }

    // 处理来自popup的消息
    handleMessages() {
      // 确保扩展上下文有效
      if (!chrome.runtime || !chrome.runtime.id) {
        console.log('扩展上下文已失效，不添加消息监听器');
        return;
      }
      
      // 添加消息监听器
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('收到消息:', message);
        
        // 同步消息处理
        try {
          // 启动检测
          if (message.action === 'startDetection') {
            console.log('开始检测');
            const result = this.startDetection();
            sendResponse(result);
            return true;
          }
          
          // 停止检测
          else if (message.action === 'stopDetection') {
            console.log('停止检测');
            this.stopDetection();
            sendResponse({ success: true });
            return true;
          }
          
          // 云熙配音优化
          else if (message.action === 'optimizeForYunxi') {
            console.log('云熙配音优化');
            const result = this.optimizeForYunxi(message.sensitivity);
            sendResponse(result);
            return true;
          }
          
          // 标记当前音频为AI配音
          else if (message.action === 'markCurrentAudio') {
            console.log('标记当前音频');
            this.markCurrentAudio();
            sendResponse({ success: true });
            return true;
          }
          
          // 开始音频标记过程
          else if (message.action === 'startAudioMarking') {
            console.log('开始音频标记');
            const result = this.startAudioMarking();
            sendResponse(result);
            return true;
          }
          
          // 完成音频标记过程
          else if (message.action === 'completeAudioMarking') {
            console.log('完成音频标记');
            const result = this.completeAudioMarking();
            sendResponse(result);
            return true;
          }
        } catch (error) {
          console.error('处理消息时出错:', error);
          sendResponse({ success: false, error: error.message });
          return true;
        }
        
        return false;
      });
      
      console.log('消息监听器已添加');
    }
  }

  // 创建检测器实例
  const detector = new AIVoiceDetector();

  // 初始化检测
  detector.init();

  // 监听来自popup的消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 立即检查扩展上下文
    if (!detector.isExtensionValid) {
      sendResponse({ success: false, error: '扩展上下文无效' });
      return false;
    }

    // 处理异步消息
    if (message.action === 'startAudioMarking') {
      // 处理开始标记音频
      detector.startAudioMarking()
        .then(response => {
          if (detector.isExtensionValid) {
            sendResponse(response);
          }
        })
        .catch(error => {
          console.error('开始标记音频失败:', error);
          if (detector.isExtensionValid) {
            sendResponse({ success: false, error: '开始标记音频失败: ' + error.message });
          }
        });
      return true; // 保持消息通道打开
    } else if (message.action === 'completeAudioMarking') {
      // 处理完成标记音频
      detector.completeAudioMarking()
        .then(response => {
          if (detector.isExtensionValid) {
            sendResponse(response);
          }
        })
        .catch(error => {
          console.error('完成标记音频失败:', error);
          if (detector.isExtensionValid) {
            sendResponse({ success: false, error: '完成标记音频失败: ' + error.message });
          }
        });
      return true; // 保持消息通道打开
    }

    // 处理同步消息
    switch (message.action) {
      case 'startDetection':
        sendResponse(detector.startDetection());
        break;
      case 'stopDetection':
        sendResponse(detector.stopDetection());
        break;
      case 'markCurrentAudio':
        // 保留旧版标记方法以兼容
        detector.markCurrentAudio()
          .then(response => {
            if (detector.isExtensionValid) {
              sendResponse(response);
            }
          })
          .catch(error => {
            console.error('标记音频失败:', error);
            if (detector.isExtensionValid) {
              sendResponse({ success: false, error: '标记音频失败: ' + error.message });
            }
          });
        return true; // 保持消息通道打开
      case 'ping':
        sendResponse({ success: true });
        break;
      default:
        sendResponse({ success: false, error: '未知的操作类型' });
    }
    return false; // 同步消息不需要保持通道打开
  });

  // 监听扩展上下文变化
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'extensionStatus') {
      detector.isExtensionValid = message.isValid;
      if (!message.isValid) {
        detector.cleanup();
      }
    }
  });

  // 初始化音频分析器
  AudioAnalyzer.init();
  
  // 将检测器实例挂载到window对象，使其可在控制台访问(调试用)
  window.AIVoiceDetector = detector;
  
  console.log('AI配音检测器已完成初始化');
} 