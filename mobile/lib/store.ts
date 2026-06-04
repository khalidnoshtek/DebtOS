import AsyncStorage from "@react-native-async-storage/async-storage";
import { createJSONStorage } from "zustand/middleware";
import { createDebtStore } from "@debtos/core";

// Mobile binds the shared store factory to AsyncStorage. Same "debtos-v1" key as
// the web app, so a JSON backup exported on one imports cleanly on the other.
export const useStore = createDebtStore({
  name: "debtos-v1",
  storage: createJSONStorage(() => AsyncStorage),
});
