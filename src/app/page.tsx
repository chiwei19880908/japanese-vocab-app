'use client';

import { useState, useEffect, useCallback } from 'react';

interface Vocab {
  日文: string;
  讀音: string;
  中文: string;
  等級: string;
}

function speak(text: string) {
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.8;
    speechSynthesis.speak(utterance);
  }
}

export default function Home() {
  const [vocabList, setVocabList] = useState<Vocab[]>([]);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState('all');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  // SRS
  const [srsMode, setSrsMode] = useState(false);
  const [srsList, setSrsList] = useState<Vocab[]>([]);
  const [srsIndex, setSrsIndex] = useState(0);
  const [showSrsAnswer, setShowSrsAnswer] = useState(false);
  const [srsResult, setSrsResult] = useState<'correct' | 'wrong' | null>(null);
  const [srsFinished, setSrsFinished] = useState(false);
  
  // Quiz
  const [quizMode, setQuizMode] = useState(false);
  const [quizLimit, setQuizLimit] = useState(10);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizOptions, setQuizOptions] = useState<{jp: string, cn: string}[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });
  const [quizFinished, setQuizFinished] = useState(false);

  // Confirm dialog
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});

  const [learnedCount, setLearnedCount] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch('/api/vocab')
      .then(res => res.json())
      .then(data => { setVocabList(data.vocabList); setLoading(false); })
      .catch(() => setLoading(false));
    const saved = localStorage.getItem('japanese-vocab-learned');
    if (saved) setLearnedCount(JSON.parse(saved));
  }, []);

  const filteredList = level === 'all' ? vocabList : vocabList.filter(v => v.等級 === level);

  // Auto play
  useEffect(() => {
    if (srsMode && srsList.length > 0 && !showSrsAnswer) {
      setTimeout(() => speak(srsList[srsIndex]?.讀音 || srsList[srsIndex]?.日文), 500);
    }
  }, [srsIndex, srsMode, srsList, showSrsAnswer]);

  useEffect(() => {
    if (quizMode && filteredList.length > 0 && !selectedAnswer) {
      setTimeout(() => speak(filteredList[quizIndex]?.讀音 || filteredList[quizIndex]?.日文), 500);
    }
  }, [quizIndex, quizMode, filteredList, selectedAnswer]);

  // Confirm before switching
  const switchMode = (action: () => void) => {
    const inProgress = (srsMode && srsIndex > 0) || (quizMode && quizScore.total > 0);
    if (inProgress) {
      setConfirmAction(() => () => { action(); setShowConfirm(false); });
      setShowConfirm(true);
    } else {
      action();
    }
  };

  const startSrs = () => {
    const notLearned = filteredList.filter(v => (learnedCount[v.日文] || 0) < 3);
    const pool = notLearned.length >= 15 ? notLearned.slice(0, 15) : filteredList.slice(0, 15);
    setSrsList([...pool].sort(() => Math.random() - 0.5));
    setSrsIndex(0);
    setShowSrsAnswer(false);
    setSrsResult(null);
    setSrsFinished(false);
    setSrsMode(true);
    setQuizMode(false);
  };

  const answerSrs = (isCorrect: boolean) => {
    const current = srsList[srsIndex];
    const newCount = { ...learnedCount };
    newCount[current.日文] = (newCount[current.日文] || 0) + (isCorrect ? 1 : -1);
    setLearnedCount(newCount);
    localStorage.setItem('japanese-vocab-learned', JSON.stringify(newCount));
    setSrsResult(isCorrect ? 'correct' : 'wrong');
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

  const generateQuiz = useCallback((idx: number) => {
    if (filteredList.length < 4 || !filteredList[idx]) return;
    const correct = filteredList[idx];
    const others = filteredList.filter(v => v.日文 !== correct.日文).sort(() => Math.random() - 0.5).slice(0, 3);
    const options = [{jp: correct.日文, cn: correct.中文}, ...others.map(v => ({jp: v.日文, cn: v.中文}))].sort(() => Math.random() - 0.5);
    setQuizOptions(options);
    setSelectedAnswer(null);
  }, [filteredList]);

  const startQuiz = () => {
    setQuizMode(true);
    setQuizIndex(0);
    setQuizScore({ correct: 0, total: 0 });
    setQuizFinished(false);
    generateQuiz(0);
    setSrsMode(false);
  };

  const checkAnswer = (cn: string) => {
    const correct = filteredList[quizIndex]?.中文;
    setSelectedAnswer(cn);
    setQuizScore(prev => ({ correct: prev.correct + (cn === correct ? 1 : 0), total: prev.total + 1 }));
  };

  const nextQuiz = () => {
    const nextIdx = quizIndex + 1;
    if (nextIdx >= filteredList.length || nextIdx >= quizLimit) {
      setQuizFinished(true);
      return;
    }
    setQuizIndex(nextIdx);
    generateQuiz(nextIdx);
  };

  const exitSrs = () => { setSrsMode(false); setSrsFinished(false); };
  const exitQuiz = () => { setQuizMode(false); setQuizFinished(false); };

  const masteredCount = Object.values(learnedCount).filter(c => c >= 3).length;

  if (loading) {
    return <div className="container"><div className="header"><h1>載入中...</h1></div></div>;
  }

  return (
    <div className="container">
      {/* 確認對話框 */}
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

      <header className="header">
        <h1>🇯🇵 日文單字庫</h1>
        <p>Notion 同步 • 間隔學習</p>
        <div className="header-stats">
          <div className="stat"><span className="stat-dot"></span>已記住 {masteredCount} / {filteredList.length}</div>
        </div>
      </header>

      <div className="controls">
        <select value={level} onChange={(e) => { setLevel(e.target.value); setCurrentIndex(0); setQuizIndex(0); }}>
          <option value="all">全部</option>
          <option value="N5">N5</option>
          <option value="N4">N4</option>
        </select>
        
        <button className="btn-primary" onClick={() => switchMode(startSrs)}>📚 學習</button>
        <button className="btn-primary" onClick={() => switchMode(startQuiz)}>🎮 測驗</button>
        
        {quizMode && (
          <select value={quizLimit} onChange={(e) => setQuizLimit(Number(e.target.value))}>
            <option value="5">5題</option>
            <option value="10">10題</option>
            <option value="15">15題</option>
            <option value="20">20題</option>
          </select>
        )}
      </div>

      {/* SRS 學習 */}
      {srsMode && !srsFinished && (
        <div className="card">
          <div className="progress-text">學習進度 {srsIndex + 1} / {srsList.length}</div>
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
              {srsResult === 'correct' ? '✅ 記住了！' : '❌ 再記一下'}
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
            <button onClick={exitSrs}>結束學習</button>
          </div>
        </div>
      )}

      {/* SRS 完成 */}
      {srsMode && srsFinished && (
        <div className="card">
          <div className="result-title">🎉 學習完成！</div>
          <div className="result-stats">本次 {srsList.length} 個單字都已學習完畢</div>
          <div className="card-actions">
            <button className="btn-primary btn-large" onClick={startSrs}>再學一次</button>
            <button className="btn-secondary btn-large" onClick={exitSrs}>回到列表</button>
          </div>
        </div>
      )}

      {/* Quiz 測驗 */}
      {quizMode && !quizFinished && (
        <div className="card">
          <div className="progress-text">測驗 {quizScore.total + 1} / {quizLimit}</div>
          <div className="progress-bar"><div className="progress-fill" style={{width: `${((quizScore.total + 1) / quizLimit) * 100}%`}}></div></div>
          
          <div className="quiz-question">{filteredList[quizIndex]?.日文}</div>
          <button className="sound-btn" onClick={() => speak(filteredList[quizIndex]?.讀音 || filteredList[quizIndex]?.日文)}>🔊 播放發音</button>
          
          <div className="quiz-options">
            {quizOptions.map((option, i) => {
              const isCorrect = option.cn === filteredList[quizIndex]?.中文;
              const isSelected = option.cn === selectedAnswer;
              return (
                <button key={i} onClick={() => !selectedAnswer && checkAnswer(option.cn)} disabled={!!selectedAnswer}
                  className={`quiz-option ${isSelected && isCorrect ? 'correct' : ''} ${isSelected && !isCorrect ? 'wrong' : ''}`}>
                  {option.cn}
                </button>
              );
            })}
          </div>
          {selectedAnswer && (
            <div className="card-actions">
              <button className="btn-primary btn-large" onClick={nextQuiz}>
                {quizScore.total + 1 >= quizLimit || quizScore.total + 1 >= filteredList.length ? '🏁 看結果' : '下一題 →'}
              </button>
            </div>
          )}
          <div className="card-footer">
            <button onClick={exitQuiz}>退出測驗</button>
          </div>
        </div>
      )}

      {/* Quiz 完成 */}
      {quizMode && quizFinished && (
        <div className="card">
          <div className="result-title">🏁 測驗結束！</div>
          <div className="result-score">
            <div className="score-number">{quizScore.correct}</div>
            <div className="score-total">/ {quizScore.total}</div>
            <div className="score-percent">{Math.round((quizScore.correct / quizScore.total) * 100)}%</div>
          </div>
          <div className="result-message">
            {quizScore.correct === quizScore.total ? '🎉 全對！太厲害了！' : 
             quizScore.correct >= quizScore.total * 0.7 ? '👍 很不錯！繼續加油！' :
             '💪 再多練習一下吧！'}
          </div>
          <div className="card-actions">
            <button className="btn-primary btn-large" onClick={startQuiz}>再測一次</button>
            <button className="btn-secondary btn-large" onClick={exitQuiz}>回到列表</button>
          </div>
        </div>
      )}

      {/* 列表模式 */}
      {!srsMode && !quizMode && (
        <div className="vocab-list">
          {filteredList.map((vocab, i) => {
            const learned = learnedCount[vocab.日文] || 0;
            return (
              <div key={i} className="vocab-item">
                <div className="vocab-item-content">
                  <span className="vocab-item-jp">{vocab.日文}</span>
                  <span className="vocab-item-kana" onClick={() => speak(vocab.讀音)}>🔊 {vocab.讀音}</span>
                  <span className="vocab-item-cn">{vocab.中文}</span>
                  {learned >= 3 && <span className="vocab-item-learned">✓</span>}
                </div>
                <span className="vocab-item-level">{vocab.等級}</span>
              </div>
            );
          })}
        </div>
      )}

      <footer className="footer">
        <p>學習得來不易，持續就是力量 💪</p>
      </footer>
    </div>
  );
}
