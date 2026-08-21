import { createContext, useCallback, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import { AppModal, type AppModalOptions } from "./AppModal";

export interface AppModalContextValue {
  showModal: (options: AppModalOptions) => void;
  hideModal: () => void;
}

export const AppModalContext = createContext<AppModalContextValue | null>(null);

export function ModalProvider({ children }: PropsWithChildren) {
  const [options, setOptions] = useState<AppModalOptions | null>(null);
  const hideModal = useCallback(() => setOptions(null), []);
  const showModal = useCallback(
    (nextOptions: AppModalOptions) => setOptions(nextOptions),
    [],
  );
  const value = useMemo(
    () => ({ showModal, hideModal }),
    [showModal, hideModal],
  );

  return (
    <AppModalContext.Provider value={value}>
      {children}
      <AppModal options={options} onDismiss={hideModal} />
    </AppModalContext.Provider>
  );
}
