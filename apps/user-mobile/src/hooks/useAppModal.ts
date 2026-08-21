import { useContext } from "react";
import { AppModalContext } from "@/components/ui/ModalProvider";

export function useAppModal() {
  const context = useContext(AppModalContext);
  if (!context)
    throw new Error("useAppModal must be used inside ModalProvider");
  return context;
}
