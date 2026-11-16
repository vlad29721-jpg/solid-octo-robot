"use client";

import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { apiFetch } from "./api";
import { applyCombatantDamage, withEvent } from "./dnd/encounter";
import type { EncounterState } from "./dnd/types";
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
};

export function useCombatantHp() {
  return useHubMutation<CombatantHpInput, { encounter: EncounterDto; character: CharacterDto | null }>({
    path: ({ encounterId }) => `/api/encounters/${encounterId}/hp`,
    body: ({ combatantId, amount, mode }) => ({ combatantId, amount, mode }),
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
  return useHubMutation<{ displayName?: string; role?: "dm" | "player"; avatarUrl?: string | null }, { profile: ProfileDto }>({
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
