'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface Vocab {
  日文: string;
  讀音: string;
  中文: string;
  等級: string;
  例句: string;
  例句中文: string;
}

function speak(text: string) {
  // Try Web Speech API first - better mobile support
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.8;
    
    // Try to get Japanese voice
    const voices = speechSynthesis.getVoices();
    const japaneseVoice = voices.find(v => v.lang.includes('ja'));
    if (japaneseVoice) {
      utterance.voice = japaneseVoice;
    }
    
    // On mobile, we might need to wait for voices to load
    if (voices.length === 0) {
      speechSynthesis.addEventListener('voiceschanged', () => {
        const v = speechSynthesis.getVoices().find(voice => voice.lang.includes('ja'));
        if (v) utterance.voice = v;
        speechSynthesis.speak(utterance);
      }, { once: true });
    } else {
      speechSynthesis.speak(utterance);
    }
  }
}

export default function Home() {
  const [vocabList, setVocabList] = useState<Vocab[]>([]);
  const [allVocabCount, setAllVocabCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(50);
  const [levels, setLevels] = useState<string[]>(['N5', 'N4', 'N3', 'N2', 'N1']);
  const [level, setLevel] = useState('all');

  // User stats
  const [userStats, setUserStats] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('japanese-vocab-stats');
      if (saved) return JSON.parse(saved);
    }
    return { xp: 0, level: 1, streak: 0, lastDate: null, dailyGoal: 10, todayCount: 0 };
  });

  // Mode: 'list' | 'preview' | 'quiz'
  const [mode, setMode] = useState('list');
  
  // Preview mode
  const [previewBatch, setPreviewBatch] = useState<Vocab[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [batchSize] = useState(2);
  const [currentBatchStart, setCurrentBatchStart] = useState(0);
  const [learnedInBatch, setLearnedInBatch] = useState(0);
  
  // Quiz mode
  const [quizBatch, setQuizBatch] = useState<Vocab[]>([]);
  const [quizCurrentQ, setQuizCurrentQ] = useState(1);
  const [quizOptions, setQuizOptions] = useState<{jp: string, cn: string}[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });
  const [quizFinished, setQuizFinished] = useState(false);
  const [quizType, setQuizType] = useState(1);
  const [listeningOrder, setListeningOrder] = useState<Vocab[]>([]);

  // SRS (kept for review)
  const [srsMode, setSrsMode] = useState(false);
  const [srsList, setSrsList] = useState<Vocab[]>([]);
  const [srsIndex, setSrsIndex] = useState(0);
  const [showSrsAnswer, setShowSrsAnswer] = useState(false);
  const [srsResult, setSrsResult] = useState<'correct' | 'wrong' | null>(null);
  const [srsFinished, setSrsFinished] = useState(false);
  
  const [learnedCount, setLearnedCount] = useState<Record<string, number>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});
  
  // Distributed learning
  const [isFinalReview, setIsFinalReview] = useState(false);
  const [quizBatchStart, setQuizBatchStart] = useState(0);
  
  // Report modal
  const [showReport, setShowReport] = useState(false);
  const [reportVocab, setReportVocab] = useState("");
  const [reportType, setReportType] = useState("例句錯誤");
  const [reportDesc, setReportDesc] = useState("");
  const [reportSent, setReportSent] = useState(false);

  // Initial load - fetch all but render partially
  useEffect(() => {
    fetch("/api/vocab")
      .then(res => res.json())
      .then(data => {
        setVocabList(data.vocabList || []);
        setAllVocabCount(data.total || data.vocabList?.length || 0);
        if (data.levels && data.levels.length > 0) {
          setLevels(data.levels);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
    
    const saved = localStorage.getItem('japanese-vocab-learned');
    if (saved) setLearnedCount(JSON.parse(saved));
    
    // Check daily streak
    const today = new Date().toDateString();
    const stats = JSON.parse(localStorage.getItem('japanese-vocab-stats') || '{"xp":0,"level":1,"streak":0}');
    if (stats.lastDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (stats.lastDate === yesterday.toDateString()) {
        stats.streak += 1;
      } else if (stats.lastDate !== today) {
        stats.streak = 1;
      }
      stats.lastDate = today;
      stats.todayCount = 0;
      localStorage.setItem('japanese-vocab-stats', JSON.stringify(stats));
      setUserStats(stats);
    }
  }, []);

  // Scroll detection - show more items for all levels
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      
      // When user scrolls to within 200px of bottom, show more
      if (scrollTop + windowHeight >= docHeight - 200) {
        setVisibleCount(prev => Math.min(prev + 50, vocabList.length));
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [vocabList.length]);


  useEffect(() => {
    localStorage.setItem('japanese-vocab-stats', JSON.stringify(userStats));
  }, [userStats]);

  const filteredList = level === 'all' ? vocabList : vocabList.filter(v => v.等級 === level);

  // Auto play in preview - only if audio enabled
  useEffect(() => {
    if (mode === 'preview' && previewBatch.length > 0 ) {
      setTimeout(() => speak(previewBatch[previewIndex]?.讀音 || previewBatch[previewIndex]?.日文), 800);
    }
  }, [previewIndex, mode, previewBatch]);

  // Quiz mode - auto-play
  useEffect(() => {
    if (mode === 'quiz' && quizBatch.length > 0 && !selectedAnswer) {
      if (quizType === 5 && listeningOrder.length > 0) {
        // For listening order type, play all 4 in sequence
        setTimeout(() => {
          listeningOrder.forEach((vocab, i) => {
            setTimeout(() => speak(vocab.讀音 || vocab.日文), i * 1500);
          });
        }, 800);
      } else {
        setTimeout(() => speak(quizBatch[quizCurrentQ - 1]?.讀音 || quizBatch[quizCurrentQ - 1]?.日文), 800);
      }
    }
  }, [quizCurrentQ, mode, quizBatch, selectedAnswer, quizType, listeningOrder]);

  // SRS mode - auto-play if audio enabled
  useEffect(() => {
    if (srsMode && srsList.length > 0 && !showSrsAnswer ) {
      setTimeout(() => speak(srsList[srsIndex]?.讀音 || srsList[srsIndex]?.日文), 800);
    }
  }, [srsIndex, srsMode, srsList, showSrsAnswer]);

  const switchMode = (newMode: string, action?: () => void) => {
    const inProgress = (srsMode && srsIndex > 0 && !srsFinished) || (mode === 'quiz' && quizScore.total > 0 && !quizFinished);
    if (inProgress) {
      setConfirmAction(() => () => { if (action) action(); setShowConfirm(false); });
      setShowConfirm(true);
    } else {
      if (action) action();
      setMode(newMode);
    }
  };

  const submitReport = async () => {
    if (reportSent) return; // Prevent double click
    
    try {
      setReportSent(true);
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vocab: reportVocab,
          issueType: reportType,
          description: reportDesc
        })
      });
      if (res.ok) {
        // Show success message, then close after delay
        setTimeout(() => {
          setShowReport(false);
          // Reset after closing
          setTimeout(() => {
            setReportSent(false);
            setReportDesc("");
          }, 300);
        }, 1500);
      } else {
        setReportSent(false);
        alert("回報失敗，請稍後再試");
      }
    } catch (e) {
      setReportSent(false);
      alert("回報失敗，請稍後再試");
    }
  };

  const addXP = (amount: number) => {
    const newXP = userStats.xp + amount;
    const newLevel = Math.floor(newXP / 100) + 1;
    const newTodayCount = userStats.todayCount + 1;
    setUserStats({ ...userStats, xp: newXP, level: newLevel, todayCount: newTodayCount });
  };

  // Preview mode
  const startPreview = () => {
    const batch = [...filteredList].sort(() => Math.random() - 0.5).slice(0, 10);
    setPreviewBatch(batch);
    setPreviewIndex(0);
    setCurrentBatchStart(0);
    setLearnedInBatch(0);
    setIsFinalReview(false);
    setMode('preview');
    setSrsMode(false);
  };

  const nextPreview = () => {
    const newLearnedCount = learnedInBatch + 1;
    setLearnedInBatch(newLearnedCount);
    
    // 学完batchSize个后，测验刚才学的这些
    if (newLearnedCount >= batchSize) {
      // 重置当前组计数
      setLearnedInBatch(0);
      // 判断是否是最后一组
      const isLastBatch = currentBatchStart + batchSize >= previewBatch.length;
      setIsFinalReview(isLastBatch);
      
      if (isLastBatch) {
        // 总复习：测试全部10个
        startQuizForBatch(0, previewBatch.length);
      } else {
        startQuizForBatch(currentBatchStart, batchSize);
      }
    } else {
      setPreviewIndex(prev => prev + 1);
    }
  };

  const startQuizForBatch = (start: number, count: number) => {
    const batch = previewBatch.slice(start, start + count);
    setQuizBatch(batch);
    setQuizBatchStart(start);
    setQuizCurrentQ(1);
    setQuizScore({ correct: 0, total: 0 });
    setQuizFinished(false);
    setMode('quiz');
    generateQuizOptions(batch, 1);
  };

  const generateQuizOptions = (batch: Vocab[], qNum: number) => {
    if (!batch[qNum - 1]) return;
    
    const newQuizType = Math.floor(Math.random() * 5) + 1;
    setQuizType(newQuizType);
    
    const correct = batch[qNum - 1];
    
    if (newQuizType === 5) {
      // 听力排序题：确保正确答案在4个选项中
      const others = [...filteredList]
        .filter(v => v.日文 !== correct.日文)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      const selectedVocab = [correct, ...others].sort(() => Math.random() - 0.5);
      setListeningOrder(selectedVocab);
      
      const options = selectedVocab.map((_, i) => ({ jp: `第${i + 1}個`, cn: `第${i + 1}個` }));
      setQuizOptions(options);
      setSelectedAnswer(null);
      return;
    }
    
    const others = [...filteredList]
      .filter(v => v.日文 !== correct.日文)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    
    let options: {jp: string, cn: string}[];
    
    switch (newQuizType) {
      case 1:
        options = [
          { jp: correct.日文, cn: correct.中文 },
          ...others.map(v => ({ jp: v.日文, cn: v.中文 }))
        ];
        break;
      case 2:
        options = [
          { jp: correct.讀音, cn: correct.中文 },
          ...others.map(v => ({ jp: v.讀音, cn: v.中文 }))
        ];
        break;
      case 3:
        options = [
          { jp: correct.日文, cn: correct.讀音 },
          ...others.map(v => ({ jp: v.日文, cn: v.讀音 }))
        ];
        break;
      case 4:
        options = [
          { jp: correct.日文, cn: correct.日文 },
          ...others.map(v => ({ jp: v.日文, cn: v.日文 }))
        ];
        break;
      default:
        options = [
          { jp: correct.日文, cn: correct.中文 },
          ...others.map(v => ({ jp: v.日文, cn: v.中文 }))
        ];
    }
    
    options.sort(() => Math.random() - 0.5);
    setQuizOptions(options);
    setSelectedAnswer(null);
  };

  const checkAnswer = (answer: string) => {
    const correct = quizBatch[quizCurrentQ - 1];
    let isCorrect = false;
    
    switch (quizType) {
      case 1:
        isCorrect = answer === correct.中文;
        break;
      case 2:
        isCorrect = answer === correct.中文;
        break;
      case 3:
        isCorrect = answer === correct.讀音;
        break;
      case 4:
        isCorrect = answer === correct.日文;
        break;
      case 5: {
        // 听力排序题：检查答案是否在listeningOrder中的正确位置
        const correctVocab = quizBatch[quizCurrentQ - 1];
        const correctIndex = listeningOrder.findIndex(v => v.日文 === correctVocab.日文);
        isCorrect = answer === `第${correctIndex + 1}個`;
        break;
      }
    }
    
    setSelectedAnswer(answer);
    setQuizScore(prev => ({ correct: prev.correct + (isCorrect ? 1 : 0), total: prev.total + 1 }));
    if (isCorrect) addXP(10);
  };

  const nextQuiz = () => {
    const nextQ = quizCurrentQ + 1;
    if (nextQ > quizBatch.length) {
      if (isFinalReview) {
        setQuizFinished(true);
      } else {
        // 测验完这组后，继续预览下一组
        const nextBatchStart = currentBatchStart + batchSize;
        setCurrentBatchStart(nextBatchStart);
        setPreviewIndex(nextBatchStart);
        setLearnedInBatch(0); // 重置组内学习计数
        setMode('preview');
      }
      return;
    }
    setQuizCurrentQ(nextQ);
    generateQuizOptions(quizBatch, nextQ);
  };

  // SRS mode (review)
  const startSrs = () => {
    const notLearned = filteredList.filter(v => (learnedCount[v.日文] || 0) < 3);
    const pool = notLearned.length >= 15 ? notLearned.slice(0, 15) : filteredList.slice(0, 15);
    setSrsList([...pool].sort(() => Math.random() - 0.5));
    setSrsIndex(0);
    setShowSrsAnswer(false);
    setSrsResult(null);
    setSrsFinished(false);
    setSrsMode(true);
  };

  const answerSrs = (isCorrect: boolean) => {
    const current = srsList[srsIndex];
    const newCount = { ...learnedCount };
    newCount[current.日文] = (newCount[current.日文] || 0) + (isCorrect ? 1 : -1);
    setLearnedCount(newCount);
    localStorage.setItem('japanese-vocab-learned', JSON.stringify(newCount));
    setSrsResult(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) addXP(5);
    setTimeout(() => {
      if (srsIndex + 1 >= srsList.length) {
        setSrsFinished(true);
      } else {
        setSrsIndex(prev => prev + 1);
        setShowSrsAnswer(false);
        setSrsResult(null);
      }
    }, 1200);
  };

  const masteredCount = Object.values(learnedCount).filter(c => c >= 3).length;
  const xpToNextLevel = userStats.level * 100 - userStats.xp;
  const progressToGoal = Math.min((userStats.todayCount / userStats.dailyGoal) * 100, 100);

  if (loading) {
    return <div className="container"><div className="header"><h1>載入中...</h1></div></div>;
  }

  return (
    <div className="container">
      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-title">確定要離開嗎？</div>
            <div className="modal-text">目前的進度將會丟掉喔～</div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowConfirm(false)}>取消</button>
              <button className="btn-primary" onClick={confirmAction}>確定離開</button>
            </div>
          </div>
        </div>
      )}

      {showReport && (
        <div className="report-modal">
          <div className="report-modal-content">
            <h3>⚠️ 回報問題</h3>
            <p>單字: <strong>{reportVocab}</strong></p>
            <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
              <option value="例句錯誤">例句錯誤</option>
              <option value="例句中文錯誤">例句中文錯誤</option>
              <option value="發音錯誤">發音錯誤</option>
              <option value="翻譯錯誤">翻譯錯誤</option>
              <option value="其他">其他</option>
            </select>
            <textarea 
              placeholder="補充說明（選填）" 
              value={reportDesc}
              onChange={(e) => setReportDesc(e.target.value)}
              rows={3}
            />
            <div className="report-modal-buttons">
              <button className="btn-secondary" onClick={() => setShowReport(false)}>取消</button>
              <button className="btn-primary" onClick={submitReport} disabled={reportSent}>
                {reportSent ? "🙏 感謝您的回報！" : "送出回報"}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="header">
        <h1>🇯🇵 日文單字庫</h1>
        
        {/* XP & Level Display */}
        <div className="user-stats">
          <div className="stat-item">
            <span className="stat-icon">⭐</span>
            <span className="stat-value">Lv.{userStats.level}</span>
          </div>
          <div className="stat-item">
            <span className="stat-icon">💎</span>
            <span className="stat-value">{userStats.xp} XP</span>
          </div>
          <div className="stat-item">
            <span className="stat-icon">🔥</span>
            <span className="stat-value">{userStats.streak}天</span>
          </div>
        </div>
        
        {/* Daily Progress */}
        <div className="daily-progress">
          <div className="progress-label">今日目標: {userStats.todayCount} / {userStats.dailyGoal}</div>
          <div className="progress-bar">
            <div className="progress-fill xp-fill" style={{width: `${progressToGoal}%`}}></div>
          </div>
        </div>
      </header>

      <div className="controls">
        <select value={level} onChange={(e) => { 
          setLevel(e.target.value); 
          setVisibleCount(50);
        }}>
          <option value="all">全部</option>
          {levels.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        
        <button className="btn-primary" onClick={() => switchMode('preview', startPreview)}>🚀 快速學習</button>
        <button className="btn-secondary" onClick={() => switchMode('list', () => setSrsMode(false))}>📖 複習</button>
      </div>

      {/* Preview Mode */}
      {mode === 'preview' && (
        <div className="card">
          <div className="mode-badge">預覽模式</div>
          <div className="progress-text">
            第 {Math.floor(currentBatchStart / batchSize) + 1} 組 • 組內第 {learnedInBatch + 1}/{batchSize} • 總進度 {previewIndex + 1}/{previewBatch.length}
          </div>
          <div className="progress-bar"><div className="progress-fill" style={{width: `${((previewIndex + 1) / previewBatch.length) * 100}%`}}></div></div>
          
          <div className="vocab-japanese">{previewBatch[previewIndex]?.日文}</div>
          <button className="sound-btn" onClick={() => speak(previewBatch[previewIndex]?.讀音 || previewBatch[previewIndex]?.日文)}>🔊 播放發音</button>
          
          <div className="vocab-kana">{previewBatch[previewIndex]?.讀音}</div>
          <div className="vocab-chinese">{previewBatch[previewIndex]?.中文}</div>
          {previewBatch[previewIndex]?.例句 && (
            <div className="vocab-example">
              <div className="example-jp">📝 {previewBatch[previewIndex]?.例句}</div>
              <div className="example-cn">{previewBatch[previewIndex]?.例句中文}</div>
            </div>
          )}
          
          <div className="card-actions">
            <button className="btn-primary btn-large" onClick={nextPreview}>
              {(learnedInBatch + 1 >= batchSize) ? '開始測驗 →' : '下一個 →'}
            </button>
          </div>
          <div className="card-footer">
            <button onClick={() => setMode('list')}>退出</button>
            <button className="btn-report" onClick={() => { 
              const currentVocab = previewBatch[previewIndex];
              setReportVocab(currentVocab?.日文); 
              setShowReport(true); 
            }}>⚠️ 回報</button>
          </div>
        </div>
      )}

      {/* Quiz Mode */}
      {mode === 'quiz' && !quizFinished && quizBatch.length > 0 && (
        <div className="card">
          <div className="mode-badge quiz-badge">測驗模式</div>
          <div className="progress-text">
            {isFinalReview ? '總複習' : `第 ${Math.floor(quizBatchStart / batchSize) + 1} 組`} • 測驗 {quizCurrentQ} / {quizBatch.length}
          </div>
          <div className="progress-bar"><div className="progress-fill" style={{width: `${(quizCurrentQ / quizBatch.length) * 100}%`}}></div></div>
          
          {quizType === 1 && (
            <>
              <div className="quiz-question">{quizBatch[quizCurrentQ - 1]?.日文}</div>
              <button className="sound-btn" onClick={() => speak(quizBatch[quizCurrentQ - 1]?.讀音 || quizBatch[quizCurrentQ - 1]?.日文)}>🔊 播放發音</button>
              <div className="quiz-options">
                {quizOptions.map((option, i) => {
                  const isCorrect = option.cn === quizBatch[quizCurrentQ - 1]?.中文;
                  const isSelected = option.cn === selectedAnswer;
                  return (
                    <button key={i} onClick={() => !selectedAnswer && checkAnswer(option.cn)} disabled={!!selectedAnswer}
                      className={`quiz-option ${isSelected && isCorrect ? 'correct' : ''} ${isSelected && !isCorrect ? 'wrong' : ''} ${!isSelected && isCorrect && selectedAnswer ? 'correct' : ''}`}>
                      {option.cn}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          
          {quizType === 2 && (
            <>
              <div className="quiz-question">{quizBatch[quizCurrentQ - 1]?.讀音}</div>
              <button className="sound-btn" onClick={() => speak(quizBatch[quizCurrentQ - 1]?.讀音 || quizBatch[quizCurrentQ - 1]?.日文)}>🔊 播放發音</button>
              <div className="quiz-options">
                {quizOptions.map((option, i) => {
                  const isCorrect = option.cn === quizBatch[quizCurrentQ - 1]?.中文;
                  const isSelected = option.cn === selectedAnswer;
                  return (
                    <button key={i} onClick={() => !selectedAnswer && checkAnswer(option.cn)} disabled={!!selectedAnswer}
                      className={`quiz-option ${isSelected && isCorrect ? 'correct' : ''} ${isSelected && !isCorrect ? 'wrong' : ''} ${!isSelected && isCorrect && selectedAnswer ? 'correct' : ''}`}>
                      {option.cn}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          
          {quizType === 3 && (
            <>
              <div className="quiz-question">{quizBatch[quizCurrentQ - 1]?.日文}</div>
              <button className="sound-btn" onClick={() => speak(quizBatch[quizCurrentQ - 1]?.讀音 || quizBatch[quizCurrentQ - 1]?.日文)}>🔊 播放發音</button>
              <div className="quiz-options">
                {quizOptions.map((option, i) => {
                  const isCorrect = option.cn === quizBatch[quizCurrentQ - 1]?.讀音;
                  const isSelected = option.cn === selectedAnswer;
                  return (
                    <button key={i} onClick={() => !selectedAnswer && checkAnswer(option.cn)} disabled={!!selectedAnswer}
                      className={`quiz-option ${isSelected && isCorrect ? 'correct' : ''} ${isSelected && !isCorrect ? 'wrong' : ''} ${!isSelected && isCorrect && selectedAnswer ? 'correct' : ''}`}>
                      {option.cn}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          
          {quizType === 4 && (
            <>
              <div className="quiz-question">請聽發音，選正解</div>
              <button className="sound-btn btn-listen" onClick={() => speak(quizBatch[quizCurrentQ - 1]?.讀音 || quizBatch[quizCurrentQ - 1]?.日文)}>🔊 播放發音</button>
              <div className="quiz-options">
                {quizOptions.map((option, i) => {
                  const isCorrect = option.cn === quizBatch[quizCurrentQ - 1]?.日文;
                  const isSelected = option.cn === selectedAnswer;
                  return (
                    <button key={i} onClick={() => !selectedAnswer && checkAnswer(option.cn)} disabled={!!selectedAnswer}
                      className={`quiz-option ${isSelected && isCorrect ? 'correct' : ''} ${isSelected && !isCorrect ? 'wrong' : ''} ${!isSelected && isCorrect && selectedAnswer ? 'correct' : ''}`}>
                      {option.cn}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          
          {quizType === 5 && (
            <>
              <div className="quiz-question">{quizBatch[quizCurrentQ - 1]?.日文}</div>
              <div className="listen-order">
                {listeningOrder.map((vocab, i) => (
                  <button key={i} className="sound-btn btn-listen" onClick={() => speak(vocab.讀音 || vocab.日文)}>
                    第{i + 1}個 🔊
                  </button>
                ))}
              </div>
              <div className="quiz-options">
                {quizOptions.map((option, i) => {
                  const correctVocab = quizBatch[quizCurrentQ - 1];
                  const correctIndex = listeningOrder.findIndex(v => v.日文 === correctVocab?.日文);
                  const isCorrect = option.cn === `第${correctIndex + 1}個`;
                  const isSelected = option.cn === selectedAnswer;
                  return (
                    <button key={i} onClick={() => !selectedAnswer && checkAnswer(option.cn)} disabled={!!selectedAnswer}
                      className={`quiz-option ${isSelected && isCorrect ? 'correct' : ''} ${isSelected && !isCorrect ? 'wrong' : ''} ${!isSelected && isCorrect && selectedAnswer ? 'correct' : ''}`}>
                      {option.cn}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          
          {selectedAnswer && (
            <div className="card-actions">
              <button className="btn-primary btn-large" onClick={nextQuiz}>
                {quizCurrentQ >= quizBatch.length ? (isFinalReview ? '🏁 看結果' : '下一組 →') : '下一題 →'}
              </button>
            </div>
          )}
          <div className="card-footer">
            <button onClick={() => setMode('list')}>退出</button>
            <button className="btn-report" onClick={() => { 
              const currentVocab = previewBatch[previewIndex];
              setReportVocab(currentVocab?.日文); 
              setShowReport(true); 
            }}>⚠️ 回報</button>
          </div>
        </div>
      )}

      {/* Quiz Finished */}
      {mode === 'quiz' && quizFinished && (
        <div className="card">
          <div className="result-title">🏁 測驗結束！</div>
          <div className="result-score">
            <div className="score-number">{quizScore.correct}</div>
            <div className="score-total">/ {quizScore.total}</div>
            <div className="score-percent">+{quizScore.correct * 10} XP</div>
          </div>
          <div className="result-message">
            {quizScore.correct === quizScore.total ? '🎉 太厲害了！全對！' : 
             quizScore.correct >= quizScore.total * 0.7 ? '👍 很不錯！繼續加油！' :
             '💪 再多練習一下吧！'}
          </div>
          <div className="card-actions">
            <button className="btn-primary btn-large" onClick={() => { startPreview(); }}>再學一次</button>
            <button className="btn-secondary btn-large" onClick={() => setMode('list')}>回到列表</button>
            <button className="btn-report" onClick={() => { 
              const currentVocab = quizBatch[quizCurrentQ - 1];
              setReportVocab(currentVocab?.日文); 
              setShowReport(true); 
            }}>⚠️ 回報</button>
          </div>
        </div>
      )}

      {/* SRS Review Mode */}
      {srsMode && !srsFinished && (
        <div className="card">
          <div className="mode-badge review-badge">複習模式</div>
          <div className="progress-text">複習 {srsIndex + 1} / {srsList.length}</div>
          <div className="progress-bar"><div className="progress-fill" style={{width: `${((srsIndex + 1) / srsList.length) * 100}%`}}></div></div>
          
          <div className="vocab-japanese">{srsList[srsIndex]?.日文}</div>
          <button className="sound-btn" onClick={() => speak(srsList[srsIndex]?.讀音 || srsList[srsIndex]?.日文)}>🔊 播放發音</button>
          
          {showSrsAnswer ? (
            <>
              <div className="vocab-kana">{srsList[srsIndex]?.讀音}</div>
              <div className="vocab-chinese">{srsList[srsIndex]?.中文}</div>
            </>
          ) : <div className="vocab-kana" style={{marginTop: 24}}>這個日文的意思是？</div>}
          
          {srsResult ? (
            <div className={`result ${srsResult === 'correct' ? 'result-correct' : 'result-wrong'}`}>
              {srsResult === 'correct' ? '✅ 記住了！+5 XP' : '❌ 再記一下'}
            </div>
          ) : (
            <div className="card-actions">
              {!showSrsAnswer ? (
                <button className="btn-secondary btn-large" onClick={() => setShowSrsAnswer(true)}>顯示答案</button>
              ) : (
                <>
                  <button className="btn-error btn-large" onClick={() => answerSrs(false)}>❌ 不太熟</button>
                  <button className="btn-success btn-large" onClick={() => answerSrs(true)}>✅ 記住了</button>
                </>
              )}
            </div>
          )}
          <div className="card-footer">
            <button onClick={() => { setSrsMode(false); setMode('list'); }}>結束複習</button>
          </div>
        </div>
      )}

      {/* SRS Finished */}
      {srsMode && srsFinished && (
        <div className="card">
          <div className="result-title">🎉 複習完成！</div>
          <div className="result-stats">本次 {srsList.length} 個單字都已複習完畢</div>
          <div className="card-actions">
            <button className="btn-primary btn-large" onClick={startSrs}>再複習一次</button>
            <button className="btn-secondary btn-large" onClick={() => { setSrsMode(false); setMode('list'); }}>回到列表</button>
          </div>
        </div>
      )}

      {/* List Mode */}
      {mode === 'list' && !srsMode && (
        <div className="vocab-list">
          <div className="list-info">共 {allVocabCount || vocabList.length} 個單字 • 已記住 {masteredCount} • 顯示 {Math.min(visibleCount, vocabList.length)}</div>
          {filteredList.slice(0, visibleCount).map((vocab, i) => {
            const learned = learnedCount[vocab.日文] || 0;
            return (
              <div key={i} className="vocab-item">
                <div className="vocab-item-content">
                  <span className="vocab-item-jp">{vocab.日文}</span>
                  <span className="vocab-item-kana" onClick={() => speak(vocab.讀音)}>🔊 {vocab.讀音}</span>
                  <span className="vocab-item-cn">{vocab.中文}</span>
                  {learned >= 3 && <span className="vocab-item-learned">✓</span>}
                </div>
                <div className="vocab-item-actions">
                  <button className="btn-report" onClick={() => { setReportVocab(vocab.日文); setShowReport(true); }} title="回報問題">⚠️</button>
                  <span className="vocab-item-level">{vocab.等級}</span>
                </div>
              </div>
            );
          })}
          
          {/* Show count */}
          {level === "all" && visibleCount < vocabList.length && (
            <div className="loading-more">
              向下滾動載入更多...
            </div>
          )}
        </div>
      )}

      <footer className="footer">
        <p>每日目標 {userStats.dailyGoal} 個單字 💪</p>
      </footer>
    </div>
  );
}
