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
  const [showMode, setShowMode] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  const [srsMode, setSrsMode] = useState(false);
  const [srsList, setSrsList] = useState<Vocab[]>([]);
  const [srsIndex, setSrsIndex] = useState(0);
  const [showSrsAnswer, setShowSrsAnswer] = useState(false);
  const [srsResult, setSrsResult] = useState<'correct' | 'wrong' | null>(null);
  
  const [quizMode, setQuizMode] = useState(false);
  const [quizLimit, setQuizLimit] = useState(10);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizOptions, setQuizOptions] = useState<{jp: string, cn: string}[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });

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

  useEffect(() => {
    if (showMode && filteredList.length > 0) {
      const vocab = filteredList[currentIndex];
      if (vocab) setTimeout(() => speak(vocab.讀音 || vocab.日文), 500);
    }
  }, [currentIndex, showMode, filteredList]);

  useEffect(() => {
    if (srsMode && srsList.length > 0) {
      const vocab = srsList[srsIndex];
      if (vocab && !showSrsAnswer) setTimeout(() => speak(vocab.讀音 || vocab.日文), 500);
    }
  }, [srsIndex, srsMode, srsList, showSrsAnswer]);

  useEffect(() => {
    if (quizMode && filteredList.length > 0) {
      const vocab = filteredList[quizIndex];
      if (vocab && !selectedAnswer) setTimeout(() => speak(vocab.讀音 || vocab.日文), 500);
    }
  }, [quizIndex, quizMode, filteredList, selectedAnswer]);

  const startSrs = () => {
    const notLearned = filteredList.filter(v => (learnedCount[v.日文] || 0) < 3);
    const pool = notLearned.length >= 15 ? notLearned.slice(0, 15) : filteredList.slice(0, 15);
    setSrsList([...pool].sort(() => Math.random() - 0.5));
    setSrsIndex(0);
    setShowSrsAnswer(false);
    setSrsResult(null);
    setSrsMode(true);
  };

  const answerSrs = (isCorrect: boolean) => {
    const current = srsList[srsIndex];
    const newCount = { ...learnedCount };
    newCount[current.日文] = (newCount[current.日文] || 0) + (isCorrect ? 1 : -1);
    setLearnedCount(newCount);
    localStorage.setItem('japanese-vocab-learned', JSON.stringify(newCount));
    setSrsResult(isCorrect ? 'correct' : 'wrong');
    setTimeout(() => {
      if (srsIndex + 1 >= srsList.length) setSrsMode(false);
      else { setSrsIndex(prev => prev + 1); setShowSrsAnswer(false); setSrsResult(null); }
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
    generateQuiz(0);
  };

  const checkAnswer = (cn: string) => {
    const correct = filteredList[quizIndex]?.中文;
    setSelectedAnswer(cn);
    setQuizScore(prev => ({ correct: prev.correct + (cn === correct ? 1 : 0), total: prev.total + 1 }));
  };

  const nextQuiz = () => {
    const nextIdx = quizIndex + 1;
    if (nextIdx >= filteredList.length || nextIdx >= quizLimit) { setQuizMode(false); return; }
    setQuizIndex(nextIdx);
    generateQuiz(nextIdx);
  };

  const masteredCount = Object.values(learnedCount).filter(c => c >= 3).length;

  if (loading) {
    return <div className="container"><div className="header"><h1>載入中...</h1></div></div>;
  }

  return (
    <div className="container">
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
        <button className="btn-secondary" onClick={() => setShowMode(!showMode)}>{showMode ? '📝 列表' : '🎴 卡片'}</button>
        <button className="btn-primary" onClick={startSrs}>📚 學習</button>
        <button className="btn-primary" onClick={startQuiz}>🎮 測驗</button>
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
      {srsMode && srsList.length > 0 && (
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
        </div>
      )}

      {/* Quiz 測驗 */}
      {quizMode && filteredList.length >= 4 && !srsMode && (
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
              <button className="btn-primary btn-large" onClick={nextQuiz}>{quizIndex + 1 >= quizLimit || quizIndex + 1 >= filteredList.length ? '🏁 結束' : '下一題 →'}</button>
            </div>
          )}
          <div style={{marginTop: 16}}><button className="footer" onClick={() => setQuizMode(false)}>退出測驗</button></div>
        </div>
      )}

      {/* 卡片模式 */}
      {showMode && !quizMode && !srsMode && filteredList.length > 0 && (
        <div className="card">
          <div className="vocab-japanese">{filteredList[currentIndex]?.日文}</div>
          {showAnswer && (<><div className="vocab-kana">{filteredList[currentIndex]?.讀音}</div><div className="vocab-chinese">{filteredList[currentIndex]?.中文}</div></>)}
          <div className="card-actions">
            <button className="btn-secondary btn-icon" onClick={() => setCurrentIndex((currentIndex - 1 + filteredList.length) % filteredList.length)}>←</button>
            {!showAnswer ? (
              <button className="btn-secondary btn-large" onClick={() => setShowAnswer(true)}>顯示</button>
            ) : (
              <>
                <button className="btn-secondary btn-icon" onClick={() => speak(filteredList[currentIndex]?.讀音)}>🔊</button>
                <button className="btn-primary btn-icon" onClick={() => setCurrentIndex((currentIndex + 1) % filteredList.length)}>→</button>
              </>
            )}
          </div>
          <div className="progress-text" style={{marginTop: 16}}>{currentIndex + 1} / {filteredList.length}</div>
        </div>
      )}

      {/* 列表模式 */}
      {!showMode && !quizMode && !srsMode && (
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
