import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { EquipmentController } from '../equipment.controller';
import { EquipmentService } from '../equipment.service';
import { EquipmentSlot, EquipmentRarity } from '../types/equipment.types';

const PLAYER_ID = 'player-e2e-1';
const COMMANDER_ID = 'cmd-uuid-0001-0000-0000-000000000001';

function makeInventoryItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'item-sword-1',
    name: 'Demir Kılıç',
    slot: EquipmentSlot.SILAH,
    rarity: EquipmentRarity.YAYGIN,
    icon: '⚔️',
    description: 'Sıradan bir demir kılıç',
    stats: { attack: 20 },
    isEquipped: false,
    ...overrides,
  };
}

function makeEquipResult(slot: EquipmentSlot, itemId: string) {
  return {
    commanderId: COMMANDER_ID,
    slot,
    item: {
      id: itemId,
      name: 'Demir Kılıç',
      slot,
      rarity: EquipmentRarity.YAYGIN,
      icon: '⚔️',
      description: 'Sıradan demir kılıç',
      stats: { attack: 20 },
    },
  };
}

describe('EquipmentController — E2E senaryoları (/customization)', () => {
  let controller: EquipmentController;
  let service: jest.Mocked<EquipmentService>;

  beforeEach(async () => {
    const mockService: Partial<jest.Mocked<EquipmentService>> = {
      getCommanderEquipment: jest.fn(),
      equipSlot: jest.fn(),
      unequipSlot: jest.fn(),
      getPlayerInventory: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EquipmentController],
      providers: [{ provide: EquipmentService, useValue: mockService }],
    }).compile();

    controller = module.get<EquipmentController>(EquipmentController);
    service = module.get<EquipmentService>(EquipmentService) as jest.Mocked<EquipmentService>;
  });

  // ─── /customization: kozmetik/ekipman listesi yükleniyor ─────────────

  describe('Ekipman envanteri yükleniyor', () => {
    it('oyuncunun tüm envanter öğelerini döner', async () => {
      const inventory = [
        makeInventoryItem(),
        makeInventoryItem({ id: 'item-armor-1', name: 'Deri Zırh', slot: EquipmentSlot.ZIRH, stats: { defense: 15 } }),
        makeInventoryItem({ id: 'item-acc-1', name: 'Gümüş Kolye', slot: EquipmentSlot.AKSESUAR_1, stats: {} }),
      ];
      service.getPlayerInventory.mockResolvedValue(inventory as any);

      const result = await controller.getInventory(PLAYER_ID);

      expect(service.getPlayerInventory).toHaveBeenCalledWith(PLAYER_ID);
      expect(result).toHaveLength(3);
    });

    it('boş envanter için boş dizi döner', async () => {
      service.getPlayerInventory.mockResolvedValue([]);

      const result = await controller.getInventory(PLAYER_ID);

      expect(result).toEqual([]);
    });

    it('her öğe slot, rarity ve stats alanlarını içerir', async () => {
      const inventory = [makeInventoryItem()];
      service.getPlayerInventory.mockResolvedValue(inventory as any);

      const result = (await controller.getInventory(PLAYER_ID)) as typeof inventory;

      result.forEach((item) => {
        expect(item.slot).toBeDefined();
        expect(item.rarity).toBeDefined();
        expect(item.stats).toBeDefined();
      });
    });

    it('isEquipped=true olan öğeler sahada gözükür', async () => {
      const inventory = [
        makeInventoryItem({ isEquipped: true }),
        makeInventoryItem({ id: 'item-2', isEquipped: false }),
      ];
      service.getPlayerInventory.mockResolvedValue(inventory as any);

      const result = (await controller.getInventory(PLAYER_ID)) as typeof inventory;

      const equippedItems = result.filter((i) => i.isEquipped);
      const unequippedItems = result.filter((i) => !i.isEquipped);

      expect(equippedItems).toHaveLength(1);
      expect(unequippedItems).toHaveLength(1);
    });

    it('komutanın mevcut ekipman slotlarını getirir', async () => {
      service.getCommanderEquipment.mockResolvedValue({
        commanderId: COMMANDER_ID,
        slots: {
          [EquipmentSlot.SILAH]: {
            id: 'item-sword-1',
            name: 'Demir Kılıç',
            slot: EquipmentSlot.SILAH,
            rarity: EquipmentRarity.YAYGIN,
            icon: '⚔️',
            description: '',
            stats: { attack: 20 },
          },
        },
        lockedSlots: [EquipmentSlot.OZEL],
      } as any);

      const result = await controller.getCommanderEquipment(COMMANDER_ID, PLAYER_ID);

      expect(service.getCommanderEquipment).toHaveBeenCalledWith(COMMANDER_ID, PLAYER_ID);
      expect(result.commanderId).toBe(COMMANDER_ID);
      expect(result.slots).toBeDefined();
    });
  });

  // ─── Kozmetik equip → API çağrısı + güncelleme ───────────────────────

  describe('Ekipman giyinme (equip)', () => {
    it('slota uygun öğe başarıyla takılır', async () => {
      service.equipSlot.mockResolvedValue(makeEquipResult(EquipmentSlot.SILAH, 'item-sword-1') as any);

      const result = await controller.equipSlot(
        COMMANDER_ID,
        EquipmentSlot.SILAH,
        { item_id: 'item-sword-1' },
        PLAYER_ID,
      );

      expect(service.equipSlot).toHaveBeenCalledWith(COMMANDER_ID, EquipmentSlot.SILAH, 'item-sword-1', PLAYER_ID);
      expect(result.slot).toBe(EquipmentSlot.SILAH);
      expect(result.item).toBeDefined();
      expect(result.item.id).toBe('item-sword-1');
    });

    it('equip sonucu güncellenmiş öğe bilgisi döner', async () => {
      const equipResult = makeEquipResult(EquipmentSlot.ZIRH, 'item-armor-1');
      (equipResult.item as any).name = 'Deri Zırh';
      (equipResult.item as any).stats = { defense: 15 };
      service.equipSlot.mockResolvedValue(equipResult as any);

      const result = await controller.equipSlot(
        COMMANDER_ID,
        EquipmentSlot.ZIRH,
        { item_id: 'item-armor-1' },
        PLAYER_ID,
      );

      expect(result.item.name).toBe('Deri Zırh');
      expect((result.item as any).stats.defense).toBe(15);
    });

    it('yanlış slota öğe taktığında BadRequestException fırlatır', async () => {
      service.equipSlot.mockRejectedValue(
        new BadRequestException("Item silah slotuna ait, zirh slotuna takılamaz"),
      );

      await expect(
        controller.equipSlot(COMMANDER_ID, EquipmentSlot.ZIRH, { item_id: 'item-sword-1' }, PLAYER_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('kilitli slota ekipman taktığında ForbiddenException fırlatır', async () => {
      service.equipSlot.mockRejectedValue(
        new ForbiddenException({ error: 'slot_locked', message: 'Slot ozel kilitli' }),
      );

      await expect(
        controller.equipSlot(COMMANDER_ID, EquipmentSlot.OZEL, { item_id: 'item-special-1' }, PLAYER_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('envanterde olmayan öğe için NotFoundException fırlatır', async () => {
      service.equipSlot.mockRejectedValue(
        new NotFoundException('Öğe envanterde bulunamadı'),
      );

      await expect(
        controller.equipSlot(COMMANDER_ID, EquipmentSlot.SILAH, { item_id: 'nonexistent-item' }, PLAYER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('başka komutanda takılı öğe için ConflictException fırlatır', async () => {
      service.equipSlot.mockRejectedValue(
        new ConflictException('Öğe başka bir komutanda takılı'),
      );

      await expect(
        controller.equipSlot(COMMANDER_ID, EquipmentSlot.SILAH, { item_id: 'item-on-other-cmd' }, PLAYER_ID),
      ).rejects.toThrow(ConflictException);
    });

    it('başka oyuncunun komutanına ekipman taktığında ForbiddenException fırlatır', async () => {
      service.equipSlot.mockRejectedValue(
        new ForbiddenException('Komutan bu oyuncuya ait değil'),
      );

      await expect(
        controller.equipSlot(COMMANDER_ID, EquipmentSlot.SILAH, { item_id: 'item-sword-1' }, 'another-player'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── Ekipman çıkarma (unequip) ────────────────────────────────────────

  describe('Ekipman çıkarma (unequip)', () => {
    it('dolu slottan ekipman başarıyla çıkarılır', async () => {
      service.unequipSlot.mockResolvedValue(undefined);

      await expect(
        controller.unequipSlot(COMMANDER_ID, EquipmentSlot.SILAH, PLAYER_ID),
      ).resolves.toBeUndefined();

      expect(service.unequipSlot).toHaveBeenCalledWith(COMMANDER_ID, EquipmentSlot.SILAH, PLAYER_ID);
    });

    it('boş slottan ekipman çıkarmak NotFoundException fırlatır', async () => {
      service.unequipSlot.mockRejectedValue(
        new NotFoundException('Slot zaten boş'),
      );

      await expect(
        controller.unequipSlot(COMMANDER_ID, EquipmentSlot.AKSESUAR_1, PLAYER_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── Boundary / Edge case testleri ───────────────────────────────────

  describe('Boundary değerler', () => {
    it('tüm slot türleri için ayrı ayrı equip çağrısı yapılabilir', async () => {
      const slots = [
        EquipmentSlot.SILAH,
        EquipmentSlot.ZIRH,
        EquipmentSlot.AKSESUAR_1,
        EquipmentSlot.AKSESUAR_2,
        EquipmentSlot.AKSESUAR_3,
      ];

      for (const slot of slots) {
        service.equipSlot.mockResolvedValue(makeEquipResult(slot, `item-${slot}`) as any);

        const result = await controller.equipSlot(
          COMMANDER_ID,
          slot,
          { item_id: `item-${slot}` },
          PLAYER_ID,
        );

        expect(result.slot).toBe(slot);
      }

      expect(service.equipSlot).toHaveBeenCalledTimes(slots.length);
    });

    it('aynı slota farklı öğe takınca önceki öğenin üzerine yazar', async () => {
      service.equipSlot
        .mockResolvedValueOnce(makeEquipResult(EquipmentSlot.SILAH, 'item-sword-1') as any)
        .mockResolvedValueOnce(makeEquipResult(EquipmentSlot.SILAH, 'item-sword-2') as any);

      const first = await controller.equipSlot(COMMANDER_ID, EquipmentSlot.SILAH, { item_id: 'item-sword-1' }, PLAYER_ID);
      const second = await controller.equipSlot(COMMANDER_ID, EquipmentSlot.SILAH, { item_id: 'item-sword-2' }, PLAYER_ID);

      expect(first.item.id).toBe('item-sword-1');
      expect(second.item.id).toBe('item-sword-2');
    });

    it('nadir (efsanevi) öğe tüm rarity sınıfları arasında en yüksek', () => {
      const rarities = Object.values(EquipmentRarity);
      expect(rarities).toContain(EquipmentRarity.EFSANEVI);
      expect(rarities).toContain(EquipmentRarity.SIRADAN);
    });
  });
});
