import { create } from "zustand";
import { persist } from "zustand/middleware";

type HubState = {
  currentUserId: string;
  activeCampaignId: string;
  authToken: string | null;
  campaignDialogOpen: boolean;
  accountDialogOpen: boolean;
  quickRollOpen: boolean;
  setCurrentUserId: (id: string) => void;
  setActiveCampaignId: (id: string) => void;
  setAuthToken: (token: string | null) => void;
  setCampaignDialogOpen: (open: boolean) => void;
  setAccountDialogOpen: (open: boolean) => void;
  setQuickRollOpen: (open: boolean) => void;
};

export const useHubStore = create<HubState>()(
  persist(
    (set) => ({
      currentUserId: "demo-dm",
      activeCampaignId: "demo-campaign-1",
      authToken: null,
      campaignDialogOpen: false,
      accountDialogOpen: false,
      quickRollOpen: false,
      setCurrentUserId: (id) => set({ currentUserId: id, authToken: null }),
      setActiveCampaignId: (id) => set({ activeCampaignId: id }),
      setAuthToken: (token) => set({ authToken: token }),
      setCampaignDialogOpen: (open) => set({ campaignDialogOpen: open }),
      setAccountDialogOpen: (open) => set({ accountDialogOpen: open }),
      setQuickRollOpen: (open) => set({ quickRollOpen: open }),
    }),
    {
      name: "dnd-master-hub-v1",
      partialize: (state) => ({
        currentUserId: state.currentUserId,
        activeCampaignId: state.activeCampaignId,
      }),
    },
  ),
);
