'use client';

import { useState, useEffect } from 'react';

interface Vocab {
  日文: string;
  讀音: string;
  中文: string;
  等級: string;
}

export default function Home() {
  const [vocabList, setVocabList] = useState<Vocab[]>([]);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState('all');
  const [showMode, setShowMode] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-white text-xl">載入中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8">
      <header className="max-w-4xl mx-auto mb-8">
        <h1 className="text-4xl font-bold mb-2">🇯🇵 日文單字庫</h1>
        <p className="text-slate-400">Notion 同步 • N5/N4 學習</p>
      </header>

      <main className="max-w-4xl mx-auto">
        {/* 控制欄 */}
        <div className="flex gap-4 mb-8 flex-wrap">
          <select 
            value={level}
            onChange={(e) => { setLevel(e.target.value); setCurrentIndex(0); }}
            className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
          >
            <option value="all">全部等級</option>
            <option value="N5">N5</option>
            <option value="N4">N4</option>
          </select>
          
          <button 
            onClick={() => setShowMode(!showMode)}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition"
          >
            {showMode ? '👀 列表模式' : '🎴 卡片模式'}
          </button>

          <span className="text-slate-400 self-center">
            共 {filteredList.length} 個單字
          </span>
        </div>

        {/* 卡片模式 */}
        {showMode && filteredList.length > 0 && (
          <div className="bg-slate-800 rounded-2xl p-8 text-center mb-8">
            <div className="text-6xl font-bold mb-4 min-h-[120px] flex items-center justify-center">
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
            
            <div className="flex gap-4 justify-center">
              <button 
                onClick={prevCard}
                className="bg-slate-600 hover:bg-slate-500 px-6 py-2 rounded-lg"
              >
                ← 上一個
              </button>
              
              {!showAnswer ? (
                <button 
                  onClick={() => setShowAnswer(true)}
                  className="bg-yellow-600 hover:bg-yellow-700 px-6 py-2 rounded-lg"
                >
                  顯示答案
                </button>
              ) : (
                <button 
                  onClick={nextCard}
                  className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg"
                >
                  下一個 →
                </button>
              )}
            </div>
            
            <div className="mt-4 text-slate-400">
              {currentIndex + 1} / {filteredList.length}
            </div>
          </div>
        )}

        {/* 列表模式 */}
        {!showMode && (
          <div className="grid gap-3">
            {filteredList.map((vocab, index) => (
              <div 
                key={index}
                className="bg-slate-800 rounded-lg p-4 flex justify-between items-center hover:bg-slate-700 transition"
              >
                <div>
                  <span className="text-xl font-bold mr-3">{vocab.日文}</span>
                  <span className="text-pink-300 mr-3">{vocab.讀音}</span>
                  <span className="text-green-300">{vocab.中文}</span>
                </div>
                <span className="bg-slate-600 px-2 py-1 rounded text-sm">
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
