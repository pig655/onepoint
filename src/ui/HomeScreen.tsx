interface HomeScreenProps {
  onBasic: () => void;
  onRoom: () => void;
}

export function HomeScreen({ onBasic, onRoom }: HomeScreenProps) {
  return (
    <div className="home-screen">
      <header className="home-header">
        <div className="brand">
          <span className="brand-mark">1P</span>
          <span>
            <strong>單點透視互動學習教室</strong>
            <small>國小五年級 · 視覺藝術與數學</small>
          </span>
        </div>
        <span className="home-badge">即時幾何計算</span>
      </header>

      <main className="home-main">
        <section className="hero">
          <span className="eyebrow">用拖曳理解透視</span>
          <h1>
            一個透視點，
            <br />
            讓房間真的動起來。
          </h1>
          <p>
            不是看一張畫好的圖，而是自己移動透視點、調整深度與尺寸，
            觀察每一條深度線如何匯聚。所有牆面、掛畫與家具都由同一個
            針孔投影模型即時計算。
          </p>
          <div className="hero-points">
            <span>固定房間外框</span>
            <span>牆面物件錨定</span>
            <span>實際尺寸與投影尺寸分開</span>
          </div>
        </section>

        <section className="mode-cards" aria-label="選擇學習模式">
          <button
            type="button"
            className="mode-card basic"
            data-testid="home-basic-entry"
            onClick={onBasic}
          >
            <div className="mode-card-visual">
              <MiniBasic />
            </div>
            <div className="mode-card-copy">
              <span className="eyebrow">模式一</span>
              <h2>基礎透視練習</h2>
              <p>
                移動透視點，觀察方塊、長方體與柱體的深度線，
                比較實際尺寸和投影大小。
              </p>
              <span className="card-action">開始練習 →</span>
            </div>
          </button>

          <button
            type="button"
            className="mode-card room"
            data-testid="home-room-entry"
            onClick={onRoom}
          >
            <div className="mode-card-visual">
              <MiniRoom />
            </div>
            <div className="mode-card-copy">
              <span className="eyebrow">模式二</span>
              <h2>室內空間透視</h2>
              <p>
                從空房間開始，加入門窗、掛畫、家具與植物，
                完成著色作品，並挑戰八個循序任務。
              </p>
              <span className="card-action">進入房間 →</span>
            </div>
          </button>
        </section>

        <section className="how-strip">
          <div>
            <span className="step-number">1</span>
            <strong>觀察</strong>
            <p>找到視平線與透視點，看看深度線往哪裡集中。</p>
          </div>
          <div>
            <span className="step-number">2</span>
            <strong>操作</strong>
            <p>拖曳透視點、移動物件、改變深度與實際尺寸。</p>
          </div>
          <div>
            <span className="step-number">3</span>
            <strong>完成</strong>
            <p>替房間著色，儲存作品，或匯出 PNG 與場景 JSON。</p>
          </div>
        </section>

        <section className="model-note">
          <div>
            <span className="eyebrow">數學模型</span>
            <h3>固定視窗針孔投影</h3>
          </div>
          <p>
            前開口的四個角固定在畫布外框；透視點可左右與上下移動。
            這是水平與垂直移軸的受約束針孔模型，所有深度線仍精確匯聚到同一個
            消失點，牆面共用邊也由同一組頂點計算，不會各自變形。
          </p>
        </section>
      </main>

      <footer className="home-footer">
        適用於 Windows 桌機、平板與基本觸控操作 · 資料只儲存在你的瀏覽器
      </footer>
    </div>
  );
}

function MiniBasic() {
  return (
    <svg viewBox="0 0 320 190" aria-hidden="true">
      <rect width="320" height="190" rx="18" fill="#f8efdf" />
      <line
        x1="18"
        y1="98"
        x2="302"
        y2="98"
        stroke="#d85d3f"
        strokeWidth="2"
        strokeDasharray="8 6"
      />
      <circle cx="160" cy="98" r="7" fill="#fffaf0" stroke="#d85d3f" strokeWidth="3" />
      <circle cx="160" cy="98" r="2.5" fill="#d85d3f" />
      <path d="M35 160h70v-42H35z" fill="#e4a35f" stroke="#364b55" strokeWidth="2" />
      <path d="M105 160l24-16v-42l-24 16z" fill="#c98b4b" stroke="#364b55" strokeWidth="2" />
      <path d="M35 118l24-16h70l-24 16z" fill="#efbd79" stroke="#364b55" strokeWidth="2" />
      <path d="M105 118l70 0 24-16M105 160l24-16M35 118l70 0M160 98l0 0" fill="none" stroke="#8e9a9e" strokeWidth="1" strokeDasharray="4 4" />
      <path d="M213 152h48v-30h-48z" fill="#74a5c2" stroke="#364b55" strokeWidth="2" />
      <path d="M261 152l20-12v-30l-20 12z" fill="#5b89a5" stroke="#364b55" strokeWidth="2" />
      <path d="M213 122l20-12h48l-20 12z" fill="#95bfd5" stroke="#364b55" strokeWidth="2" />
      <path d="M213 122h48M213 152l20-12M261 122l20-12" fill="none" stroke="#8e9a9e" strokeWidth="1" strokeDasharray="4 4" />
      <line x1="70" y1="160" x2="160" y2="98" stroke="#a9b1b2" strokeWidth="1" strokeDasharray="4 4" />
      <line x1="237" y1="152" x2="160" y2="98" stroke="#a9b1b2" strokeWidth="1" strokeDasharray="4 4" />
    </svg>
  );
}

function MiniRoom() {
  return (
    <svg viewBox="0 0 320 190" aria-hidden="true">
      <rect width="320" height="190" rx="18" fill="#eef0e5" />
      <path d="M35 42h250v118H35z" fill="#f8f2e7" stroke="#364b55" strokeWidth="2.5" />
      <path d="M87 71h146v61H87z" fill="#fffaf0" stroke="#364b55" strokeWidth="2.5" />
      <path d="M35 42l52 29h146l52-29M35 160l52-28h146l52 28M87 71v61M233 71v61" fill="none" stroke="#364b55" strokeWidth="2" />
      <line x1="35" y1="104" x2="285" y2="104" stroke="#d85d3f" strokeWidth="2" strokeDasharray="8 6" />
      <circle cx="160" cy="104" r="7" fill="#fffaf0" stroke="#d85d3f" strokeWidth="3" />
      <circle cx="160" cy="104" r="2.5" fill="#d85d3f" />
      <path d="M87 71l146 0M87 132l146 0" fill="none" stroke="#d8c9af" strokeWidth="1" />
      <path d="M109 84h35v23h-35z" fill="#d9a441" stroke="#3e6b7a" strokeWidth="2" />
      <path d="M168 86h22v30h-22z" fill="#c25b4a" stroke="#3e6b7a" strokeWidth="2" />
      <path d="M78 132v-38h14v38z" fill="#b8794f" stroke="#364b55" strokeWidth="2" />
      <path d="M201 132h46v-24h-46z" fill="#8c9b71" stroke="#364b55" strokeWidth="2" />
      <path d="M201 108h46M214 132v-24" fill="none" stroke="#5e6d48" strokeWidth="1.4" />
    </svg>
  );
}
