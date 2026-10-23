import { useCallback, useReducer } from 'react';
import type { Scene } from '../model/sceneModel';

interface HistoryState {
  past: Scene[];
  present: Scene;
  future: Scene[];
  transactionStart: Scene | null;
}

type HistoryAction =
  | { type: 'update'; updater: (scene: Scene) => Scene; record: boolean }
  | { type: 'begin' }
  | { type: 'end' }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'replace'; scene: Scene }
  | { type: 'reset'; scene: Scene };

const HISTORY_LIMIT = 80;

function reducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case 'update': {
      const next = action.updater(state.present);
      if (next === state.present) {
        return state;
      }
      if (action.record) {
        return {
          past: [...state.past, state.present].slice(-HISTORY_LIMIT),
          present: next,
          future: [],
          transactionStart: state.transactionStart,
        };
      }
      return { ...state, present: next };
    }
    case 'begin':
      return { ...state, transactionStart: state.present };
    case 'end': {
      if (
        state.transactionStart &&
        state.transactionStart !== state.present
      ) {
        return {
          past: [...state.past, state.transactionStart].slice(-HISTORY_LIMIT),
          present: state.present,
          future: [],
          transactionStart: null,
        };
      }
      return { ...state, transactionStart: null };
    }
    case 'undo': {
      if (state.past.length === 0) {
        return state;
      }
      const previous = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future].slice(0, HISTORY_LIMIT),
        transactionStart: null,
      };
    }
    case 'redo': {
      if (state.future.length === 0) {
        return state;
      }
      const next = state.future[0];
      return {
        past: [...state.past, state.present].slice(-HISTORY_LIMIT),
        present: next,
        future: state.future.slice(1),
        transactionStart: null,
      };
    }
    case 'replace':
      return {
        past: [],
        present: action.scene,
        future: [],
        transactionStart: null,
      };
    case 'reset':
      return {
        past: [],
        present: action.scene,
        future: [],
        transactionStart: null,
      };
    default:
      return state;
  }
}

export function useSceneHistory(initialScene: Scene) {
  const [state, dispatch] = useReducer(reducer, {
    past: [],
    present: initialScene,
    future: [],
    transactionStart: null,
  });

  const update = useCallback(
    (updater: (scene: Scene) => Scene, record = true) => {
      dispatch({ type: 'update', updater, record });
    },
    [],
  );

  const beginTransaction = useCallback(() => {
    dispatch({ type: 'begin' });
  }, []);

  const endTransaction = useCallback(() => {
    dispatch({ type: 'end' });
  }, []);

  return {
    scene: state.present,
    update,
    beginTransaction,
    endTransaction,
    undo: () => dispatch({ type: 'undo' }),
    redo: () => dispatch({ type: 'redo' }),
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    replaceScene: (scene: Scene) => dispatch({ type: 'replace', scene }),
  };
}
