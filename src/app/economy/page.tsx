"use client";

import { Coins, Dices, Gift, Package, Plus, Scale, ShoppingBag, Store, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { useHub } from "@/components/providers/hub-provider";
import { Button } from "@/components/ui/button";
import { Input, Select, Switch } from "@/components/ui/field";
import { Badge } from "@/components/ui/primitives";
import { PageHeader, PageSkeleton } from "@/components/ui/page-header";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { ITEM_CATALOG } from "@/lib/dnd/catalog";
import { generateLoot, MAGIC_ITEMS } from "@/lib/dnd/content";
import { coinsInGold, coinsOf } from "@/lib/dnd/rules";
import type { InventoryItem, Shop } from "@/lib/dnd/types";
import { useBoardPatch, useChestAction, useShopAction } from "@/lib/queries";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type Tab = "shops" | "chest" | "loot";
const TABS: TabItem<Tab>[] = [{ value: "shops", label: "Лавки", icon: Store }, { value: "chest", label: "Сундук партии", icon: Package }, { value: "loot", label: "Добыча", icon: Gift }];
const ALL_ITEMS = [...ITEM_CATALOG, ...MAGIC_ITEMS];

export default function EconomyPage() {
  const { snapshot, campaign, isDm, actor } = useHub();
  const patch = useBoardPatch();
  const shopAction = useShopAction();
  const chest = useChestAction();
  const [tab, setTab] = useState<Tab>("shops");
  const [characterId, setCharacterId] = useState("");
  const [shopName, setShopName] = useState("");
  const [goods, setGoods] = useState<Record<string, { itemId: string; price: number; stock: number }>>({});
  const [gold, setGold] = useState(10);
  const [tier, setTier] = useState<"0-4" | "5-10" | "11-16" | "17+">("0-4");
  const [loot, setLoot] = useState<{ gold: number; items: InventoryItem[] } | null>(null);

  const characters = (snapshot?.characters ?? []).filter((character) => isDm || character.ownerId === actor?.id);
  useEffect(() => { if (!characters.some((character) => character.id === characterId)) setCharacterId(characters[0]?.id ?? ""); }, [characters, characterId]);
  if (!snapshot || !campaign || !snapshot.board) return <PageSkeleton />;
  const world = snapshot.board.world;
  const shops = world.shops ?? [];
  const box = world.chest ?? { items: [], gold: 0 };
  const character = characters.find((entry) => entry.id === characterId);
  const wallet = character ? coinsInGold(coinsOf(character.stats)) : 0;
  const saveShops = (next: Shop[]) => patch.mutate({ campaignId: campaign.id, patch: { world: { ...world, shops: next } } });
  const notify = { onSuccess: (data: { text: string }) => data.text && toast.success(data.text) };

  const picker = characters.length ? (
    <div className="glass flex flex-wrap items-center gap-2 rounded-2xl p-3">
      <span className="text-xs text-muted-ink">Персонаж:</span>
      <Select value={characterId} onChange={(event) => setCharacterId(event.target.value)} className="h-9 w-56 text-xs">{characters.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</Select>
      {character ? <Badge variant="gold"><Coins className="h-3 w-3" />{wallet} зм</Badge> : null}
    </div>
  ) : null;

  return (
    <div className="space-y-5 pb-4">
      <PageHeader eyebrow="Рынок и казна" title="Торговля" description="Лавки Мастера, общий сундук партии и генератор добычи. Все сделки сразу видны в чате." />
      <Tabs value={tab} onValueChange={setTab} items={TABS} />
      {picker}

      {tab === "shops" ? (
        <div className="space-y-4">
          {shops.length ? shops.map((shop) => (
            <section key={shop.id} className={cn("glass rounded-2xl p-4", !shop.open && "opacity-75")}>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Store className="h-5 w-5 text-gold" /><h2 className="font-display text-xl text-parchment">{shop.name}</h2>
                <Badge variant={shop.open ? "success" : "muted"}>{shop.open ? "Открыто" : "Закрыто"}</Badge>
                <span className="text-[11px] text-muted-ink">скупает за {Math.round(shop.sellRate * 100)}% цены</span>
                {isDm ? <span className="ml-auto flex items-center gap-2"><Switch checked={shop.open} onCheckedChange={(open) => saveShops(shops.map((entry) => entry.id === shop.id ? { ...entry, open } : entry))} /><Button size="icon-sm" variant="danger" onClick={() => saveShops(shops.filter((entry) => entry.id !== shop.id))}><Trash2 className="h-3.5 w-3.5" /></Button></span> : null}
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {shop.items.map((good) => (
                  <div key={good.id} className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-black/25 p-2.5">
                    <div className="min-w-0 flex-1"><p className="truncate text-sm text-parchment">{good.item.magic ? "✨ " : ""}{good.item.name}</p><p className="text-[11px] text-muted-ink">{good.price} зм · {good.stock === -1 ? "много" : `в наличии ${good.stock}`}</p></div>
                    {character ? <Button size="sm" disabled={shopAction.isPending || good.stock === 0 || wallet < good.price} onClick={() => shopAction.mutate({ campaignId: campaign.id, action: "buy", shopId: shop.id, characterId: character.id, itemId: good.id, quantity: 1 }, notify)}><ShoppingBag className="h-3.5 w-3.5" />Купить</Button> : null}
                    {isDm ? <button type="button" aria-label="Убрать товар" onClick={() => saveShops(shops.map((entry) => entry.id === shop.id ? { ...entry, items: entry.items.filter((item) => item.id !== good.id) } : entry))}><Trash2 className="h-3.5 w-3.5 text-muted-ink" /></button> : null}
                  </div>
                ))}
              </div>
              {isDm ? (() => {
                const draft = goods[shop.id] ?? { itemId: ALL_ITEMS[0].id, price: ALL_ITEMS[0].costGp, stock: -1 };
                return (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Select value={draft.itemId} onChange={(event) => { const item = ALL_ITEMS.find((entry) => entry.id === event.target.value); setGoods({ ...goods, [shop.id]: { ...draft, itemId: event.target.value, price: item?.costGp ?? 1 } }); }} className="h-9 flex-1 text-xs">{ALL_ITEMS.map((item) => <option key={item.id} value={item.id}>{item.magic ? "✨ " : ""}{item.name}</option>)}</Select>
                    <Input type="number" min={0} value={draft.price} onChange={(event) => setGoods({ ...goods, [shop.id]: { ...draft, price: Number(event.target.value) } })} className="h-9 w-24" title="Цена, зм" />
                    <Input type="number" min={-1} value={draft.stock} onChange={(event) => setGoods({ ...goods, [shop.id]: { ...draft, stock: Number(event.target.value) } })} className="h-9 w-20" title="Количество (-1 = бесконечно)" />
                    <Button size="sm" variant="outline" onClick={() => { const item = ALL_ITEMS.find((entry) => entry.id === draft.itemId); if (item) saveShops(shops.map((entry) => entry.id === shop.id ? { ...entry, items: [...entry.items, { id: `g-${Date.now()}`, item: { ...item, quantity: 1, equipped: false }, price: Math.max(0, draft.price), stock: draft.stock }] } : entry)); }}><Plus className="h-3.5 w-3.5" />Товар</Button>
                  </div>
                );
              })() : null}
              {character && shop.open ? (
                <details className="mt-3 rounded-xl border border-white/[0.07] bg-black/20 p-3">
                  <summary className="cursor-pointer text-xs font-semibold text-gold">Продать из инвентаря {character.name}</summary>
                  <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                    {character.inventory.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 rounded-lg bg-black/25 px-2 py-1.5 text-xs">
                        <span className="flex-1 truncate text-parchment">{item.name} ×{item.quantity}</span>
                        <span className="text-muted-ink">{Math.round(item.costGp * shop.sellRate * 100) / 100} зм</span>
                        <Button size="sm" variant="glass" className="h-7" disabled={shopAction.isPending} onClick={() => shopAction.mutate({ campaignId: campaign.id, action: "sell", shopId: shop.id, characterId: character.id, itemId: item.id, quantity: 1 }, notify)}>Продать</Button>
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}
            </section>
          )) : <EmptyState compact title="Лавок пока нет" description={isDm ? "Создайте первую лавку ниже." : "Мастер ещё не открыл ни одной лавки."} icon={Store} />}
          {isDm ? (
            <div className="glass flex gap-2 rounded-2xl p-3">
              <Input value={shopName} onChange={(event) => setShopName(event.target.value)} placeholder="Лавка кузнеца, Алхимик «Синий дым»…" />
              <Button disabled={!shopName.trim()} onClick={() => { saveShops([...shops, { id: `shop-${Date.now()}`, name: shopName.trim(), open: false, sellRate: 0.5, items: [] }]); setShopName(""); toast.info("Лавка создана закрытой", "Наполните товарами и откройте переключателем."); }}><Plus className="h-4 w-4" />Создать лавку</Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "chest" ? (
        <div className="grid gap-5 lg:grid-cols-3">
          <section className="glass space-y-3 rounded-2xl p-4 lg:col-span-2">
            <div className="flex flex-wrap items-center gap-2"><Package className="h-5 w-5 text-gold" /><h2 className="font-display text-xl text-parchment">Сундук партии</h2><Badge variant="gold"><Coins className="h-3 w-3" />{box.gold} зм</Badge>
              {isDm ? <Button size="sm" variant="outline" className="ml-auto" disabled={!box.gold || chest.isPending} onClick={() => chest.mutate({ action: "split", campaignId: campaign.id }, notify)}><Scale className="h-3.5 w-3.5" />Поделить золото поровну</Button> : null}</div>
            {box.items.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {box.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-black/25 p-2.5">
                    <div className="min-w-0 flex-1"><p className="truncate text-sm text-parchment">{item.magic ? "✨ " : ""}{item.name} ×{item.quantity}</p><p className="truncate text-[10px] text-muted-ink">{item.description}</p></div>
                    {character ? <Button size="sm" variant="glass" disabled={chest.isPending} onClick={() => chest.mutate({ action: "take", campaignId: campaign.id, characterId: character.id, itemId: item.id }, notify)}>Взять</Button> : null}
                    {isDm ? <button type="button" aria-label="Выбросить" onClick={() => chest.mutate({ action: "discard", campaignId: campaign.id, itemId: item.id })}><Trash2 className="h-3.5 w-3.5 text-muted-ink" /></button> : null}
                  </div>
                ))}
              </div>
            ) : <p className="py-6 text-center text-sm text-muted-ink">Сундук пуст. Положите добычу или сгенерируйте её во вкладке «Добыча».</p>}
          </section>
          {character ? (
            <section className="glass space-y-3 rounded-2xl p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">{character.name} → сундук</p>
              <div className="flex gap-2"><Input type="number" min={1} value={gold} onChange={(event) => setGold(Number(event.target.value))} className="h-9" /><Button size="sm" variant="outline" disabled={chest.isPending} onClick={() => chest.mutate({ action: "gold", campaignId: campaign.id, characterId: character.id, amount: Math.abs(gold) }, notify)}>Положить</Button><Button size="sm" variant="glass" disabled={chest.isPending} onClick={() => chest.mutate({ action: "gold", campaignId: campaign.id, characterId: character.id, amount: -Math.abs(gold) }, notify)}>Взять</Button></div>
              <div className="thin-scrollbar max-h-80 space-y-1.5 overflow-y-auto">
                {character.inventory.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 rounded-lg bg-black/25 px-2 py-1.5 text-xs"><span className="flex-1 truncate text-parchment">{item.name} ×{item.quantity}</span><Button size="sm" variant="glass" className="h-7" onClick={() => chest.mutate({ action: "deposit", campaignId: campaign.id, characterId: character.id, itemId: item.id }, notify)}>В сундук</Button></div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {tab === "loot" ? (
        isDm ? (
          <div className="mx-auto max-w-2xl space-y-4">
            <div className="glass space-y-3 rounded-2xl p-5">
              <p className="text-sm text-muted-ink">Таблицы сокровищ по мотивам «Руководства Мастера»: монеты, самоцветы и шанс магического предмета.</p>
              <div className="grid grid-cols-4 gap-1 rounded-xl bg-black/30 p-1">{(["0-4", "5-10", "11-16", "17+"] as const).map((value) => <button key={value} type="button" onClick={() => setTier(value)} className={cn("rounded-lg py-1.5 text-xs font-semibold", tier === value ? "bg-gold text-ink" : "text-muted-ink")}>ПО {value}</button>)}</div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => setLoot(generateLoot(tier, false))}><Dices className="h-4 w-4" />Добыча с врага</Button>
                <Button onClick={() => setLoot(generateLoot(tier, true))}><Gift className="h-4 w-4" />Клад (сокровищница)</Button>
              </div>
            </div>
            {loot ? (
              <div className="parchment-panel space-y-2 rounded-2xl p-5">
                <p className="font-display text-2xl text-gold">{loot.gold} зм</p>
                {loot.items.length ? loot.items.map((item) => <p key={item.id} className="text-sm text-parchment">{item.magic ? "✨ " : "💎 "}{item.name} ×{item.quantity} <span className="text-xs text-muted-ink">— {item.description}</span></p>) : <p className="text-sm text-muted-ink">Без предметов — только монеты.</p>}
                <div className="flex gap-2 pt-2"><Button disabled={chest.isPending} onClick={() => chest.mutate({ action: "addLoot", campaignId: campaign.id, gold: loot.gold, items: loot.items }, { onSuccess: () => { toast.success("Добыча в сундуке партии"); setLoot(null); } })}><Package className="h-4 w-4" />В сундук партии</Button><Button variant="ghost" onClick={() => setLoot(null)}>Сбросить</Button></div>
              </div>
            ) : null}
          </div>
        ) : <EmptyState compact title="Добычу генерирует Мастер" description="Найденные сокровища появятся в сундуке партии." icon={Gift} />
      ) : null}
    </div>
  );
}
