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
  
  const [quizMode, setQuizMode] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizOptions, setQuizOptions] = useState<{jp: string, cn: string}[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });

  useEffect(() => {
    fetch('/api/vocab')
      .then(res => res.json())
      .then(data => {
        setVocabList(data.vocabList);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const filteredList = level === 'all' 
    ? vocabList 
    : vocabList.filter(v => v.等級 === level);

  const nextCard = () => {
    setShowAnswer(false);
    setCurrentIndex((currentIndex + 1) % filteredList.length);
  };

  const prevCard = () => {
    setShowAnswer(false);
    setCurrentIndex((currentIndex - 1 + filteredList.length) % filteredList.length);
  };

  const generateQuiz = useCallback((idx: number) => {
    if (filteredList.length < 4 || !filteredList[idx]) return;
    
    const correct = filteredList[idx];
    const others = filteredList
      .filter(v => v.日文 !== correct.日文)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    
    const options = [{jp: correct.日文, cn: correct.中文}, ...others.map(v => ({jp: v.日文, cn: v.中文}))]
      .sort(() => Math.random() - 0.5);
    
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
    setQuizScore(prev => ({
      correct: prev.correct + (cn === correct ? 1 : 0),
      total: prev.total + 1
    }));
  };

  const nextQuiz = () => {
    const nextIdx = quizIndex + 1;
    if (nextIdx >= filteredList.length) {
      setQuizMode(false);
      return;
    }
    setQuizIndex(nextIdx);
    generateQuiz(nextIdx);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-white text-xl">載入中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 md:p-8">
      <header className="max-w-4xl mx-auto mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">🇯🇵 日文單字庫</h1>
        <p className="text-slate-400">Notion 同步 • N5/N4 學習</p>
      </header>

      <main className="max-w-4xl mx-auto">
        <div className="flex gap-3 md:gap-4 mb-6 flex-wrap">
          <select 
            value={level}
            onChange={(e) => { setLevel(e.target.value); setCurrentIndex(0); setQuizIndex(0); }}
            className="bg-slate-700 border border-slate-600 rounded-lg px-3 md:px-4 py-2"
          >
            <option value="all">全部等級</option>
            <option value="N5">N5</option>
            <option value="N4">N4</option>
          </select>
          
          <button 
            onClick={() => setShowMode(!showMode)}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition text-sm md:text-base"
          >
            {showMode ? '👀 列表' : '🎴 卡片'}
          </button>

          <button 
            onClick={startQuiz}
            disabled={filteredList.length < 4}
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition text-sm md:text-base disabled:opacity-50"
          >
            🎮 測驗
          </button>

          <span className="text-slate-400 self-center text-sm md:text-base">
            {filteredList.length} 個
          </span>
        </div>

        {/* 測驗模式 */}
        {quizMode && filteredList.length >= 4 && (
          <div className="bg-slate-800 rounded-2xl p-6 md:p-8 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">🎮 測驗模式</h2>
              <span className="text-slate-400">
                {quizScore.correct}/{quizScore.total} 正確
              </span>
            </div>

            <div className="text-center mb-6">
              <div className="text-4xl font-bold mb-2">
                {filteredList[quizIndex]?.日文}
              </div>
              <button 
                onClick={() => speak(filteredList[quizIndex]?.日文)}
                className="text-pink-400 hover:text-pink-300 text-sm"
              >
                🔊 播放發音
              </button>
            </div>

            <div className="text-center text-xl text-slate-300 mb-6">
              這個日文的意思是？
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {quizOptions.map((option, i) => {
                const isCorrect = option.cn === filteredList[quizIndex]?.中文;
                const isSelected = option.cn === selectedAnswer;
                
                return (
                  <button
                    key={i}
                    onClick={() => !selectedAnswer && checkAnswer(option.cn)}
                    disabled={!!selectedAnswer}
                    className={`p-4 rounded-lg text-lg transition
                      ${!selectedAnswer ? 'bg-slate-700 hover:bg-slate-600' : ''}
                      ${isSelected && isCorrect ? 'bg-green-600' : ''}
                      ${isSelected && !isCorrect ? 'bg-red-600' : ''}
                      ${!isSelected && isCorrect && selectedAnswer ? 'bg-green-600' : ''}
                      disabled:opacity-80
                    `}
                  >
                    {option.cn}
                  </button>
                );
              })}
            </div>

            {selectedAnswer && (
              <div className="text-center">
                <button 
                  onClick={nextQuiz}
                  className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg"
                >
                  {quizIndex + 1 >= filteredList.length ? '🏁 結束測驗' : '下一題 →'}
                </button>
              </div>
            )}

            <div className="text-center mt-4">
              <button 
                onClick={() => setQuizMode(false)}
                className="text-slate-400 hover:text-slate-300 text-sm"
              >
                退出測驗
              </button>
            </div>
          </div>
        )}

        {/* 卡片模式 */}
        {showMode && !quizMode && filteredList.length > 0 && (
          <div className="bg-slate-800 rounded-2xl p-6 md:p-8 text-center mb-8">
            <div className="text-5xl md:text-6xl font-bold mb-4 min-h-[120px] flex items-center justify-center">
              {filteredList[currentIndex]?.日文}
            </div>
            
            {showAnswer && (
              <div className="mb-6 space-y-2">
                <div className="text-2xl text-pink-300">
                  {filteredList[currentIndex]?.讀音}
                </div>
                <div className="text-xl text-green-300">
                  {filteredList[currentIndex]?.中文}
                </div>
              </div>
            )}
            
            <div className="flex gap-4 justify-center flex-wrap">
              <button 
                onClick={prevCard}
                className="bg-slate-600 hover:bg-slate-500 px-4 md:px-6 py-2 rounded-lg"
              >
                ← 上一個
              </button>
              
              {!showAnswer ? (
                <button 
                  onClick={() => setShowAnswer(true)}
                  className="bg-yellow-600 hover:bg-yellow-700 px-4 md:px-6 py-2 rounded-lg"
                >
                  顯示答案
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => speak(filteredList[currentIndex]?.日文)}
                    className="bg-pink-600 hover:bg-pink-700 px-4 py-2 rounded-lg"
                  >
                    🔊 發音
                  </button>
                  <button 
                    onClick={nextCard}
                    className="bg-green-600 hover:bg-green-700 px-4 md:px-6 py-2 rounded-lg"
                  >
                    下一個 →
                  </button>
                </>
              )}
            </div>
            
            <div className="mt-4 text-slate-400">
              {currentIndex + 1} / {filteredList.length}
            </div>
          </div>
        )}

        {/* 列表模式 */}
        {!showMode && !quizMode && (
          <div className="grid gap-2 md:gap-3">
            {filteredList.map((vocab, index) => (
              <div 
                key={index}
                className="bg-slate-800 rounded-lg p-3 md:p-4 flex justify-between items-center hover:bg-slate-700 transition flex-col md:flex-row gap-2"
              >
                <div className="flex-1 flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                  <span className="text-xl font-bold">{vocab.日文}</span>
                  <span 
                    className="text-pink-300 cursor-pointer hover:text-pink-200"
                    onClick={() => speak(vocab.日文)}
                    title="點擊發音"
                  >
                    🔊 {vocab.讀音}
                  </span>
                  <span className="text-green-300">{vocab.中文}</span>
                </div>
                <span className="bg-slate-600 px-2 py-1 rounded text-sm whitespace-nowrap">
                  {vocab.等級}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
