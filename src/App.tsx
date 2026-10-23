import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useSceneHistory } from './hooks/useSceneHistory';
import {
  downloadSceneJSON,
  loadSceneFromLocalStorage,
  saveSceneToLocalStorage,
  sceneFromJSON,
} from './model/persistence';
import {
  createDefaultScene,
  type AppMode,
  type Scene,
} from './model/sceneModel';
import { BasicMode } from './ui/BasicMode';
import { HomeScreen } from './ui/HomeScreen';
import { RoomMode } from './ui/RoomMode';
import { TopBar } from './ui/TopBar';

type Screen = 'home' | 'basic' | 'room';

export default function App() {
  const [initialScene] = useState<Scene>(() => loadSceneFromLocalStorage());
  const {
    scene,
    update,
    beginTransaction,
    endTransaction,
    undo,
    redo,
    canUndo,
    canRedo,
    replaceScene,
  } = useSceneHistory(initialScene);
  const [screen, setScreen] = useState<Screen>('home');
  const [toast, setToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const notify = useCallback((message: string) => {
    setToast(message);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      saveSceneToLocalStorage(scene);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [scene]);

  const navigateMode = (mode: AppMode) => {
    update(
      (current) => ({
        ...current,
        mode,
      }),
      false,
    );
    setScreen(mode);
  };

  const save = () => {
    const ok = saveSceneToLocalStorage(scene);
    notify(ok ? '作品已儲存在此瀏覽器' : '儲存失敗，瀏覽器可能停用了本機儲存');
  };

  const resetScene = () => {
    const confirmed = window.confirm(
      '要清除目前作品，回到預設的單點透視教室嗎？',
    );
    if (!confirmed) {
      return;
    }
    replaceScene(createDefaultScene());
    setScreen('room');
    notify('已重設為預設場景');
  };

  const loadDefaultRoom = () => {
    const defaults = createDefaultScene();
    update(
      (current) => ({
        ...current,
        mode: 'room',
        room: defaults.room,
      }),
      true,
    );
    setScreen('room');
    notify('已載入預設空房間');
  };

  const exportJson = () => {
    downloadSceneJSON(scene);
    notify('場景 JSON 已匯出');
  };

  const openImport = () => {
    fileInputRef.current?.click();
  };

  const importFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = sceneFromJSON(text);
      if (!parsed.ok) {
        notify(`匯入失敗：${parsed.error}`);
        return;
      }
      replaceScene(parsed.scene);
      setScreen(parsed.scene.mode);
      notify('場景匯入成功');
    } catch {
      notify('匯入失敗：無法讀取檔案');
    }
  };

  return (
    <div className="app">
      {screen === 'home' ? (
        <HomeScreen
          onBasic={() => navigateMode('basic')}
          onRoom={() => navigateMode('room')}
        />
      ) : (
        <>
          <TopBar
            screen={screen}
            canUndo={canUndo}
            canRedo={canRedo}
            onHome={() => setScreen('home')}
            onMode={navigateMode}
            onUndo={undo}
            onRedo={redo}
            onSave={save}
            onExportJson={exportJson}
            onImportJson={openImport}
            onResetScene={resetScene}
            onLoadDefaultRoom={loadDefaultRoom}
          />
          {screen === 'room' ? (
            <RoomMode
              scene={scene}
              update={update}
              beginTransaction={beginTransaction}
              endTransaction={endTransaction}
              notify={notify}
            />
          ) : (
            <BasicMode
              scene={scene}
              update={update}
              beginTransaction={beginTransaction}
              endTransaction={endTransaction}
              notify={notify}
            />
          )}
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden-input"
        data-testid="import-file"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void importFile(file);
          }
          event.target.value = '';
        }}
      />

      {toast && (
        <div className="toast" role="status" data-testid="toast">
          {toast}
        </div>
      )}
    </div>
  );
}
