import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BuildingsService } from './buildings.service';
import { Building, BuildingStatus, BuildingType } from './entities/building.entity';
import { ResourcesService } from '../resources/resources.service';
import { StartConstructionDto } from './dto/start-construction.dto';

const mockRepo = () => ({
  count: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
});

const mockResourcesService = () => ({
  canAfford: jest.fn(),
  deduct: jest.fn(),
  updateRates: jest.fn(),
});

describe('BuildingsService', () => {
  let service: BuildingsService;
  let repo: jest.Mocked<Repository<Building>>;
  let resources: jest.Mocked<ResourcesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BuildingsService,
        { provide: getRepositoryToken(Building), useFactory: mockRepo },
        { provide: ResourcesService, useFactory: mockResourcesService },
      ],
    }).compile();

    service = module.get(BuildingsService);
    repo = module.get(getRepositoryToken(Building));
    resources = module.get(ResourcesService);
  });

  describe('startConstruction', () => {
    const playerId = 'player-1';
    const dto: StartConstructionDto = { type: BuildingType.MINERAL_EXTRACTOR, positionX: 3, positionY: 4 };

    it('throws if max buildings of that type are already built', async () => {
      repo.count.mockResolvedValue(5);
      await expect(service.startConstruction(playerId, dto)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws if position is occupied', async () => {
      repo.count.mockResolvedValue(0);
      repo.findOne.mockResolvedValue({ id: 'existing' } as Building);
      await expect(service.startConstruction(playerId, dto)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws if player cannot afford', async () => {
      repo.count.mockResolvedValue(0);
      repo.findOne.mockResolvedValue(null);
      resources.canAfford.mockResolvedValue(false);
      await expect(service.startConstruction(playerId, dto)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates building and deducts resources', async () => {
      repo.count.mockResolvedValue(0);
      repo.findOne.mockResolvedValue(null);
      resources.canAfford.mockResolvedValue(true);
      resources.deduct.mockResolvedValue({} as any);
      const newBuilding = { id: 'b1', playerId, type: dto.type, status: BuildingStatus.CONSTRUCTING } as Building;
      repo.create.mockReturnValue(newBuilding);
      repo.save.mockResolvedValue(newBuilding);
      repo.find.mockResolvedValue([]);
      resources.updateRates.mockResolvedValue(undefined);

      const result = await service.startConstruction(playerId, dto);
      expect(result).toBe(newBuilding);
      expect(resources.deduct).toHaveBeenCalledTimes(1);
    });
  });

  describe('destroyBuilding', () => {
    it('throws NotFoundException if building not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.destroyBuilding('p1', 'b1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequestException for Command Center', async () => {
      repo.findOne.mockResolvedValue({ id: 'b1', type: BuildingType.COMMAND_CENTER, status: BuildingStatus.ACTIVE } as Building);
      await expect(service.destroyBuilding('p1', 'b1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('marks building as destroyed and recalculates rates', async () => {
      const building = { id: 'b1', playerId: 'p1', type: BuildingType.TURRET, status: BuildingStatus.ACTIVE } as Building;
      repo.findOne.mockResolvedValue(building);
      repo.save.mockResolvedValue({ ...building, status: BuildingStatus.DESTROYED });
      repo.find.mockResolvedValue([]);
      resources.updateRates.mockResolvedValue(undefined);

      await service.destroyBuilding('p1', 'b1');
      expect(building.status).toBe(BuildingStatus.DESTROYED);
      expect(resources.updateRates).toHaveBeenCalled();
    });
  });

  describe('recalculateProductionRates', () => {
    it('sums production and consumption across active buildings', async () => {
      const activeBuildings: Building[] = [
        { type: BuildingType.COMMAND_CENTER, status: BuildingStatus.ACTIVE } as Building,
        { type: BuildingType.MINERAL_EXTRACTOR, status: BuildingStatus.ACTIVE } as Building,
        { type: BuildingType.SOLAR_PLANT, status: BuildingStatus.ACTIVE } as Building,
      ];
      repo.find.mockResolvedValue(activeBuildings);
      resources.updateRates.mockResolvedValue(undefined);

      await service.recalculateProductionRates('p1');

      expect(resources.updateRates).toHaveBeenCalledWith('p1', {
        mineralPerTick: 5 + 15 + 0, // command_center + extractor + solar
        gasPerTick: 0,
        energyPerTick: (10 - 5) + (0 - 3) + (20 - 0), // net per building
      });
    });
  });
});
