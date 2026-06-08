import { BuildingsController } from './buildings.controller';
import { XpSource } from '../progression/config/level-config';

/**
 * cycle-28 BATTLE_REWARD_XP — grantBattleReward used to cap-check the `xp`
 * field then DROP it, so quick-battle (the primary PvE surface) granted zero
 * level XP. It now maps the outcome-encoded source tag to a real XpSource and
 * awards via the canonical progression path (idempotent on the source tag).
 */
describe('BuildingsController.grantBattleReward — battle XP', () => {
  function build() {
    const resources = {
      grant: jest.fn().mockResolvedValue({}),
      getSnapshot: jest.fn().mockResolvedValue({}),
    };
    const progression = { awardXp: jest.fn().mockResolvedValue({}) };
    const ctrl = new BuildingsController({} as any, resources as any, progression as any);
    return { ctrl, resources, progression };
  }

  it('awards PVE_WIN xp for a pve_win source, idempotent on the source tag', async () => {
    const { ctrl, progression } = build();
    await ctrl.grantBattleReward({ userId: 'u1', xp: 320, mineral: 100, source: 'pve_win:b9' });
    expect(progression.awardXp).toHaveBeenCalledWith({
      userId: 'u1',
      source: XpSource.PVE_WIN,
      referenceId: 'pve_win:b9',
    });
  });

  it('awards PVE_LOSS xp for a pve_loss source', async () => {
    const { ctrl, progression } = build();
    await ctrl.grantBattleReward({ userId: 'u1', xp: 80, mineral: 60, source: 'pve_loss:b9' });
    expect(progression.awardXp).toHaveBeenCalledWith({
      userId: 'u1',
      source: XpSource.PVE_LOSS,
      referenceId: 'pve_loss:b9',
    });
  });

  it('does NOT award xp for a non-battle source (e.g. mission)', async () => {
    const { ctrl, progression } = build();
    await ctrl.grantBattleReward({ userId: 'u1', xp: 100, mineral: 100, source: 'mission:x' });
    expect(progression.awardXp).not.toHaveBeenCalled();
  });

  it('still grants the resources alongside the xp', async () => {
    const { ctrl, resources } = build();
    await ctrl.grantBattleReward({ userId: 'u1', xp: 320, mineral: 100, gas: 50, source: 'pve_win:b9' });
    expect(resources.grant).toHaveBeenCalledWith('u1', expect.objectContaining({ mineral: 100, gas: 50 }));
  });
});
