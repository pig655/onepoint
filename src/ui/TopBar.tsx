interface TopBarProps {
  screen: 'basic' | 'room';
  canUndo: boolean;
  canRedo: boolean;
  onHome: () => void;
  onMode: (mode: 'basic' | 'room') => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onExportJson: () => void;
  onImportJson: () => void;
  onResetScene: () => void;
  onLoadDefaultRoom: () => void;
}

export function TopBar({
  screen,
  canUndo,
  canRedo,
  onHome,
  onMode,
  onUndo,
  onRedo,
  onSave,
  onExportJson,
  onImportJson,
  onResetScene,
  onLoadDefaultRoom,
}: TopBarProps) {
  return (
    <header className="topbar">
      <button
        type="button"
        className="brand brand-button"
        onClick={onHome}
        data-testid="top-home"
      >
        <span className="brand-mark">1P</span>
        <span className="brand-text">
          <strong>單點透視教室</strong>
          <small>互動學習</small>
        </span>
      </button>

      <nav className="mode-switch" aria-label="學習模式">
        <button
          type="button"
          className={screen === 'basic' ? 'active' : ''}
          onClick={() => onMode('basic')}
          data-testid="top-mode-basic"
        >
          基礎透視
        </button>
        <button
          type="button"
          className={screen === 'room' ? 'active' : ''}
          onClick={() => onMode('room')}
          data-testid="top-mode-room"
        >
          室內空間
        </button>
      </nav>

      <div className="top-actions">
        <div className="history-actions">
          <button
            type="button"
            className="icon-btn"
            onClick={onUndo}
            disabled={!canUndo}
            title="復原"
            data-testid="undo"
          >
            ↶
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={onRedo}
            disabled={!canRedo}
            title="重做"
            data-testid="redo"
          >
            ↷
          </button>
        </div>
        <button
          type="button"
          className="btn secondary compact"
          onClick={onSave}
          data-testid="save"
        >
          儲存
        </button>
        <button
          type="button"
          className="btn ghost compact"
          onClick={onExportJson}
          data-testid="export-json"
        >
          匯出 JSON
        </button>
        <button
          type="button"
          className="btn ghost compact"
          onClick={onImportJson}
          data-testid="import-json"
        >
          匯入
        </button>
        <button
          type="button"
          className="btn ghost compact"
          onClick={onLoadDefaultRoom}
          data-testid="load-default-room"
        >
          預設房間
        </button>
        <button
          type="button"
          className="btn ghost compact danger-text"
          onClick={onResetScene}
          data-testid="reset-scene"
        >
          重設場景
        </button>
      </div>
    </header>
  );
}
