"use client";

import { createJSONStorage } from "zustand/middleware";
import { createDebtStore } from "@debtos/core";

// Web binds the shared store to localStorage. Mobile binds the same factory to
// AsyncStorage. Same persistence key ("debtos-v1") keeps backups interchangeable.
export const useStore = createDebtStore({
  name: "debtos-v1",
  storage: createJSONStorage(() => localStorage),
});
