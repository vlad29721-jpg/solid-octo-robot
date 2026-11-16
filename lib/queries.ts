"use client";

import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { apiFetch } from "./api";
import { applyCombatantDamage, withEvent } from "./dnd/encounter";
import type { EncounterState, InventoryItem, MapState, SceneState, WorldState } from "./dnd/types";
import { useHubStore } from "./store";
import { toast } from "./toast";
import type {
  CampaignDto, CharacterDto, DiceRollDto, EncounterDto, HubSnapshot, ProfileDto, SessionDto,
} from "./types";
import type {
  CampaignCreateInput, CampaignJoinInput, CharacterCreateInput, CharacterPatchInput,
  DeepseekInput, DiceRollInput, EncounterCreateInput, SessionCreateInput,
} from "./validation";

type CacheEntry = [QueryKey, HubSnapshot | undefined];
type MutationContext = { previous: CacheEntry[] };
type HttpMethod = "POST" | "PATCH" | "DELETE";

type HubMutationConfig<TVariables, TResult> = {
  path: string | ((variables: TVariables) => string);
  method?: HttpMethod;
  body?: (variables: TVariables) => unknown;
  optimistic?: (snapshot: HubSnapshot, variables: TVariables) => HubSnapshot;
  successMessage?: string | null;
  extraSuccess?: (data: TResult, variables: TVariables) => void;
};

function useHubMutation<TVariables, TResult>(config: HubMutationConfig<TVariables, TResult>) {
  const queryClient = useQueryClient();
  return useMutation<TResult, Error, TVariables, MutationContext>({
    mutationFn: (variables) => {
      const path = typeof config.path === "function" ? config.path(variables) : config.path;
      const init: RequestInit = { method: config.method ?? "POST" };
      if (config.body) init.body = JSON.stringify(config.body(variables));
      return apiFetch<TResult>(path, init);
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ["hub"] });
      const previous = queryClient.getQueriesData<HubSnapshot>({ queryKey: ["hub"] }) as CacheEntry[];
      if (config.optimistic) {
        queryClient.setQueriesData<HubSnapshot>({ queryKey: ["hub"] }, (old) =>
          old ? config.optimistic!(old, variables) : old,
        );
      }
      return { previous };
    },
    onError: (error, _variables, context) => {
      context?.previous.forEach(([key, value]) => queryClient.setQueryData(key, value));
      toast.error("Изменение отменено", error.message);
    },
    onSuccess: (data, variables) => {
      if (config.successMessage !== null) toast.success(config.successMessage ?? "Сохранено");
      config.extraSuccess?.(data, variables);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["hub"] });
    },
  });
}

function patchToDto(patch: CharacterPatchInput): Partial<CharacterDto> {
  const result: Partial<CharacterDto> = {};
  if (patch.name !== undefined) result.name = patch.name;
  if (patch.level !== undefined) result.level = patch.level;
  if (patch.hpCurrent !== undefined) result.hpCurrent = patch.hpCurrent;
  if (patch.hpMax !== undefined) result.hpMax = patch.hpMax;
  if (patch.armorClass !== undefined) result.armorClass = patch.armorClass;
  if (patch.stats !== undefined) result.stats = patch.stats;
  if (patch.inventory !== undefined) result.inventory = patch.inventory;
  if (patch.spellbook !== undefined) result.spellbook = patch.spellbook;
  if (patch.conditions !== undefined) result.conditions = patch.conditions;
  if (patch.avatarUrl !== undefined) result.avatarUrl = patch.avatarUrl;
  return result;
}

export function useCreateCampaign() {
  return useHubMutation<CampaignCreateInput, { campaign: CampaignDto }>({
    path: "/api/campaigns",
    body: (input) => input,
    successMessage: "Кампания создана",
    extraSuccess: (data) => useHubStore.getState().setActiveCampaignId(data.campaign.id),
  });
}

export function useJoinCampaign() {
  return useHubMutation<CampaignJoinInput, { campaign: CampaignDto }>({
    path: "/api/campaigns/join",
    body: (input) => input,
    successMessage: "Вы присоединились к кампании",
    extraSuccess: (data) => useHubStore.getState().setActiveCampaignId(data.campaign.id),
  });
}

export function useCreateCharacter() {
  return useHubMutation<CharacterCreateInput, { character: CharacterDto }>({
    path: "/api/characters",
    body: (input) => input,
    successMessage: "Лист персонажа создан",
  });
}

export function useUpdateCharacter() {
  return useHubMutation<{ id: string; patch: CharacterPatchInput }, { character: CharacterDto }>({
    path: ({ id }) => `/api/characters/${id}`,
    method: "PATCH",
    body: ({ patch }) => patch,
    successMessage: null,
    optimistic: (snapshot, { id, patch }) => ({
      ...snapshot,
      characters: snapshot.characters.map((character) => character.id === id
        ? { ...character, ...patchToDto(patch) }
        : character),
    }),
  });
}

export function useDeleteCharacter() {
  return useHubMutation<string, { ok: boolean }>({
    path: (id) => `/api/characters/${id}`,
    method: "DELETE",
    successMessage: "Персонаж удалён",
    optimistic: (snapshot, id) => ({
      ...snapshot,
      characters: snapshot.characters.filter((character) => character.id !== id),
      encounter: snapshot.encounter
        ? {
            ...snapshot.encounter,
            state: {
              ...snapshot.encounter.state,
              combatants: snapshot.encounter.state.combatants.filter((item) => item.sourceCharacterId !== id),
            },
          }
        : null,
    }),
  });
}

export function useCreateSession() {
  return useHubMutation<SessionCreateInput, { session: SessionDto }>({
    path: "/api/sessions",
    body: (input) => input,
    successMessage: "Заметка сохранена в журнале",
  });
}

export function useCreateEncounter() {
  return useHubMutation<EncounterCreateInput, { encounter: EncounterDto }>({
    path: "/api/encounters",
    body: (input) => input,
    successMessage: "Новое столкновение готово",
  });
}

export function useUpdateEncounter() {
  return useHubMutation<{ id: string; state: EncounterState }, { encounter: EncounterDto }>({
    path: ({ id }) => `/api/encounters/${id}`,
    method: "PATCH",
    body: ({ state }) => ({ state }),
    successMessage: null,
    optimistic: (snapshot, { id, state }) => ({
      ...snapshot,
      encounter: snapshot.encounter?.id === id ? { ...snapshot.encounter, state } : snapshot.encounter,
    }),
  });
}

export type CombatantHpInput = {
  encounterId: string;
  combatantId: string;
  amount: number;
  mode: "damage" | "heal";
  damageType?: string;
};

export function useCombatantHp() {
  return useHubMutation<CombatantHpInput, { encounter: EncounterDto; character: CharacterDto | null }>({
    path: ({ encounterId }) => `/api/encounters/${encounterId}/hp`,
    body: ({ combatantId, amount, mode, damageType }) => ({ combatantId, amount, mode, damageType }),
    successMessage: null,
    optimistic: (snapshot, variables) => {
      if (!snapshot.encounter) return snapshot;
      const current = snapshot.encounter.state;
      const target = current.combatants.find((item) => item.id === variables.combatantId);
      if (!target) return snapshot;
      const delta = variables.mode === "damage" ? variables.amount : -variables.amount;
      const damaged = applyCombatantDamage(current, variables.combatantId, delta);
      const state = withEvent(damaged, `${target.name} ${variables.mode === "damage" ? `получил ${variables.amount} урона` : `восстановил ${variables.amount} HP`}.`);
      const finalTarget = state.combatants.find((item) => item.id === variables.combatantId);
      return {
        ...snapshot,
        encounter: { ...snapshot.encounter, state },
        characters: finalTarget?.sourceCharacterId
          ? snapshot.characters.map((character) => character.id === finalTarget.sourceCharacterId
            ? { ...character, hpCurrent: finalTarget.hp }
            : character)
          : snapshot.characters,
      };
    },
  });
}

export function useRollDice() {
  return useHubMutation<DiceRollInput, { roll: DiceRollDto }>({
    path: "/api/dice-rolls",
    body: (input) => input,
    successMessage: null,
  });
}

export function useUpdateProfile() {
  return useHubMutation<{ displayName?: string; role?: "dm" | "player"; avatarUrl?: string | null; telegramChatId?: string | null; prefs?: { diceColor?: string; diceMaterial?: "gold" | "obsidian" | "crystal" | "blood" | "bone" } }, { profile: ProfileDto }>({
    path: "/api/profile",
    method: "PATCH",
    body: (input) => input,
    successMessage: "Профиль обновлён",
  });
}

export type DeepseekResponse = {
  content: string;
  model: string;
  usage: Record<string, unknown> | null;
  source: "deepseek";
};

export function useDeepseek() {
  return useMutation<DeepseekResponse, Error, DeepseekInput>({
    mutationFn: (input) => apiFetch<DeepseekResponse>("/api/deepseek", {
      method: "POST",
      body: JSON.stringify(input),
    }),
    onError: (error) => toast.error("Запрос к DeepSeek не выполнен", error.message),
  });
}

function useAuthMutation<T>(path: string, message: string) {
  const queryClient = useQueryClient();
  return useMutation<{ ok: boolean }, Error, T>({
    mutationFn: (input) => apiFetch(path, { method: "POST", body: JSON.stringify(input ?? {}) }),
    onSuccess: () => { toast.success(message); void queryClient.invalidateQueries({ queryKey: ["hub"] }); },
    onError: (error) => toast.error("Не получилось", error.message),
  });
}
export const useRegister = () => useAuthMutation<{ email: string; password: string; displayName: string; role: "dm" | "player" }>("/api/auth/register", "Аккаунт создан, вы вошли");
export const useLogin = () => useAuthMutation<{ email: string; password: string }>("/api/auth/login", "С возвращением!");
export const useLogout = () => useAuthMutation<void>("/api/auth/logout", "Вы вышли из аккаунта");

export type BoardPatch = { map?: MapState; scene?: SceneState; world?: WorldState };
export function useBoardPatch() {
  return useHubMutation<{ campaignId: string; patch: BoardPatch }, unknown>({
    path: ({ campaignId }) => `/api/boards/${campaignId}`,
    method: "PATCH",
    body: ({ patch }) => patch,
    successMessage: null,
    optimistic: (snapshot, { patch }) => snapshot.board ? { ...snapshot, board: { ...snapshot.board, ...patch } } : snapshot,
  });
}

export function useMoveToken() {
  return useHubMutation<{ campaignId: string; tokenId: string; x: number; y: number }, unknown>({
    path: ({ campaignId }) => `/api/boards/${campaignId}/token`,
    body: ({ tokenId, x, y }) => ({ tokenId, x, y }),
    successMessage: null,
    optimistic: (snapshot, { tokenId, x, y }) => snapshot.board ? {
      ...snapshot,
      board: { ...snapshot.board, map: { ...snapshot.board.map, tokens: snapshot.board.map.tokens.map((token) => token.id === tokenId ? { ...token, x, y } : token) } },
    } : snapshot,
  });
}

export function useGroupSaveRoll() {
  return useHubMutation<{ campaignId: string; characterId: string }, { result: { total: number; success: boolean; roll: number } }>({
    path: ({ campaignId }) => `/api/boards/${campaignId}/group-save`,
    body: ({ characterId }) => ({ characterId }),
    successMessage: null,
  });
}

export function useSendMessage() {
  return useHubMutation<{ campaignId: string; body: string; recipientId?: string | null; kind?: "chat" | "whisper" | "secret" }, unknown>({
    path: "/api/messages", body: (input) => input, successMessage: null,
  });
}
export function useReact() {
  return useHubMutation<{ messageId: string; emoji: string; actorId: string }, unknown>({
    path: ({ messageId }) => `/api/messages/${messageId}/react`,
    body: ({ emoji }) => ({ emoji }),
    successMessage: null,
    optimistic: (snapshot, { messageId, emoji, actorId }) => ({
      ...snapshot,
      messages: snapshot.messages.map((message) => {
        if (message.id !== messageId) return message;
        const reactions = { ...message.reactions };
        const list = new Set(reactions[emoji] ?? []);
        if (list.has(actorId)) list.delete(actorId); else list.add(actorId);
        if (list.size) reactions[emoji] = [...list]; else delete reactions[emoji];
        return { ...message, reactions };
      }),
    }),
  });
}

export async function uploadImage(campaignId: string, file: File): Promise<string> {
  if (file.size > 2_800_000) throw new Error("Файл больше 2.8 МБ. Сожмите изображение.");
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Не удалось прочитать файл."));
    reader.readAsDataURL(file);
  });
  const result = await apiFetch<{ url: string }>("/api/assets", { method: "POST", body: JSON.stringify({ campaignId, dataUrl }) });
  return result.url;
}

export type InventoryOp =
  | { op: "add"; item: InventoryItem }
  | { op: "remove"; itemId: string }
  | { op: "quantity"; itemId: string; delta: number }
  | { op: "equip"; itemId: string }
  | { op: "attune"; itemId: string }
  | { op: "charge"; itemId: string; delta: number };

export function useInventoryOp() {
  return useHubMutation<{ characterId: string; operation: InventoryOp }, { character: CharacterDto }>({
    path: ({ characterId }) => `/api/characters/${characterId}/inventory`,
    body: ({ operation }) => operation,
    successMessage: null,
    optimistic: (snapshot, { characterId, operation }) => ({
      ...snapshot,
      characters: snapshot.characters.map((character) => {
        if (character.id !== characterId) return character;
        let inventory = [...character.inventory];
        if (operation.op === "add") {
          const existing = inventory.find((item) => item.name === operation.item.name);
          inventory = existing ? inventory.map((item) => item.name === operation.item.name ? { ...item, quantity: item.quantity + operation.item.quantity } : item) : [...inventory, operation.item];
        } else if (operation.op === "remove") inventory = inventory.filter((item) => item.id !== operation.itemId);
        else if (operation.op === "quantity") inventory = inventory.flatMap((item) => item.id !== operation.itemId ? [item] : item.quantity + operation.delta <= 0 ? [] : [{ ...item, quantity: item.quantity + operation.delta }]);
        else if (operation.op === "attune") inventory = inventory.map((item) => item.id === operation.itemId ? { ...item, attuned: !item.attuned } : item);
        else if (operation.op === "charge") inventory = inventory.map((item) => item.id === operation.itemId && item.charges ? { ...item, charges: { ...item.charges, current: Math.max(0, Math.min(item.charges.max, item.charges.current + operation.delta)) } } : item);
        else inventory = inventory.map((item) => item.id === operation.itemId ? { ...item, equipped: !item.equipped } : item);
        return { ...character, inventory };
      }),
    }),
  });
}

export function useLevelUp() {
  return useHubMutation<{ characterId: string; mode: "average" | "roll" }, { summary: { gain: number; proficiency: number; asi: boolean } }>({
    path: ({ characterId }) => `/api/characters/${characterId}/level-up`, body: ({ mode }) => ({ mode }), successMessage: null,
  });
}
export function useRest() {
  return useHubMutation<{ characterId: string; type: "short" | "long"; hitDice: number }, { summary: { healed: number; rolls: number[] } }>({
    path: ({ characterId }) => `/api/characters/${characterId}/rest`, body: ({ type, hitDice }) => ({ type, hitDice }), successMessage: null,
  });
}
export function useDeathSave() {
  return useHubMutation<string, { roll: number; text: string }>({ path: (id) => `/api/characters/${id}/death-save`, successMessage: null });
}
export function useTransfer() {
  return useHubMutation<{ fromId: string; toId: string; itemId?: string; quantity?: number; gold?: number }, { text: string }>({
    path: "/api/characters/transfer", body: (input) => input, successMessage: null,
  });
}
export type AttackInput = { encounterId: string; targetId: string; attackerName: string; attackName: string; toHit: number; damage: string; advantage: "normal" | "advantage" | "disadvantage"; autoHit?: boolean; damageType?: string };
export type AttackResult = { hit: boolean; crit: boolean; natural: number; attackTotal: number; damage: number; targetName: string; verdict: string };
export function useAttack() {
  return useHubMutation<AttackInput, AttackResult>({
    path: ({ encounterId }) => `/api/encounters/${encounterId}/attack`,
    body: ({ encounterId: _id, ...rest }) => rest,
    successMessage: null,
  });
}
export function useUndo() {
  return useHubMutation<string, unknown>({ path: (id) => `/api/encounters/${id}/undo`, successMessage: "Последнее действие отменено" });
}

export type CheckRollResult = { secret: boolean; label: string; mode: string; inspired: boolean; total?: number; natural?: number; autoFail?: boolean; success?: boolean | null; dc?: number | null; breakdown?: string };
export function useCheckRoll() {
  return useHubMutation<{ characterId: string; kind: "skill" | "ability" | "save"; key: string; advantage: "normal" | "advantage" | "disadvantage"; useInspiration: boolean; checkId?: string }, CheckRollResult>({
    path: "/api/rolls/check", body: (input) => input, successMessage: null,
  });
}
export function useConcentrationRoll() {
  return useHubMutation<{ campaignId: string; checkId: string }, { success: boolean; total: number; dc: number }>({ path: "/api/rolls/concentration", body: (input) => input, successMessage: null });
}
export function useAwardXp() {
  return useHubMutation<{ encounterId: string; total: number; characterIds: string[] }, { share: number; ready: string[] }>({
    path: ({ encounterId }) => `/api/encounters/${encounterId}/award-xp`, body: ({ total, characterIds }) => ({ total, characterIds }), successMessage: null,
  });
}
export function usePing() {
  return useHubMutation<{ campaignId: string; x: number; y: number }, unknown>({ path: ({ campaignId }) => `/api/boards/${campaignId}/ping`, body: ({ x, y }) => ({ x, y }), successMessage: null });
}
export function useDraw() {
  return useHubMutation<{ campaignId: string; drawing: import("./dnd/types").MapDrawing }, unknown>({
    path: ({ campaignId }) => `/api/boards/${campaignId}/draw`, body: ({ drawing }) => ({ drawing }), successMessage: null,
    optimistic: (snapshot, { drawing }) => snapshot.board ? { ...snapshot, board: { ...snapshot.board, map: { ...snapshot.board.map, drawings: [...(snapshot.board.map.drawings ?? []), drawing] } } } : snapshot,
  });
}
export function useShopAction() {
  return useHubMutation<{ campaignId: string; action: "buy" | "sell"; shopId: string; characterId: string; itemId: string; quantity: number }, { text: string }>({ path: "/api/shops", body: (input) => input, successMessage: null });
}
export type ChestAction =
  | { action: "deposit" | "take"; campaignId: string; characterId: string; itemId: string }
  | { action: "gold"; campaignId: string; characterId: string; amount: number }
  | { action: "split"; campaignId: string }
  | { action: "addLoot"; campaignId: string; gold: number; items: InventoryItem[] }
  | { action: "discard"; campaignId: string; itemId: string };
export function useChestAction() {
  return useHubMutation<ChestAction, { text: string }>({ path: "/api/chest", body: (input) => input, successMessage: null });
}
export function usePollVote() {
  return useHubMutation<{ campaignId: string; pollId: string; optionId: string; actorId: string }, unknown>({
    path: "/api/polls/vote", body: ({ campaignId, pollId, optionId }) => ({ campaignId, pollId, optionId }), successMessage: null,
    optimistic: (snapshot, { pollId, optionId, actorId }) => snapshot.board ? { ...snapshot, board: { ...snapshot.board, world: { ...snapshot.board.world, polls: (snapshot.board.world.polls ?? []).map((poll) => poll.id !== pollId ? poll : { ...poll, options: poll.options.map((option) => option.id !== optionId ? option : { ...option, votes: option.votes.includes(actorId) ? option.votes.filter((id) => id !== actorId) : [...option.votes, actorId] }) }) } } } : snapshot,
  });
}
export function useTelegramTest() {
  return useHubMutation<void, unknown>({ path: "/api/telegram/test", successMessage: "Тестовое сообщение отправлено в Telegram" });
}
export function useTelegramRemind() {
  return useHubMutation<{ campaignId: string }, unknown>({ path: "/api/telegram/remind", body: (input) => input, successMessage: "Напоминание отправлено в Telegram" });
}
export function useAccountPatch() {
  return useHubMutation<{ currentPassword: string; newEmail?: string; newPassword?: string }, unknown>({ path: "/api/auth/account", method: "PATCH", body: (input) => input, successMessage: "Данные аккаунта обновлены" });
}
export function useMemberAction() {
  return useHubMutation<{ campaignId: string; action: "kick" | "transfer" | "regenerate" | "reset-link"; userId?: string }, { inviteCode?: string; link?: string }>({
    path: ({ campaignId }) => `/api/campaigns/${campaignId}/members`, body: ({ action, userId }) => ({ action, userId }), successMessage: null,
  });
}
export function useImportCampaign() {
  return useHubMutation<{ data: Record<string, unknown> }, { campaignId: string; characters: number }>({
    path: "/api/campaigns/import", body: (input) => input, successMessage: "Кампания импортирована",
    extraSuccess: (data) => useHubStore.getState().setActiveCampaignId(data.campaignId),
  });
}
