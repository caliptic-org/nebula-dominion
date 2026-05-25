import { BadRequestException, Controller, HttpCode, HttpStatus, Logger, Post, UseGuards } from '@nestjs/common';
import { HttpJwtGuard } from '../auth/http-jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ResourcesService } from '../resources/resources.service';
import { ProgressionService } from './progression.service';
import { XpSource } from './config/level-config';

/**
 * One-shot tutorial completion grant.
 *
 * The /tutorial UI promises "BAŞLANGIÇ HEDİYESİ +500 mineral / +25 kristal /
 * +200 XP" on the final step.  Without this endpoint that promise was
 * cosmetic — `handleAdvance` in the page just routed to /base and nothing
 * landed in the wallet.  Players completed the 6-step flow, saw the gift
 * panel, hit /base, and the HUD showed the same 500/200/250 starter — felt
 * like the game was lying on its very first interaction.
 *
 * Idempotency: tracked in-memory by userId so a player who already redeemed
 * doesn't get duplicate grants.  In-memory is fine for the stub — the
 * worst-case on container restart is a player gets the grant twice over
 * the lifetime of their account.  When this graduates to a real persistent
 * flag, swap the Set for a column on the Player entity.
 */
const REDEEMED = new Set<string>();

@UseGuards(HttpJwtGuard)
@Controller('players/me')
export class TutorialController {
  private readonly logger = new Logger(TutorialController.name);

  constructor(
    private readonly resources: ResourcesService,
    private readonly progression: ProgressionService,
  ) {}

  @Post('tutorial-complete')
  @HttpCode(HttpStatus.OK)
  async tutorialComplete(@CurrentUser() userId: string) {
    if (REDEEMED.has(userId)) {
      throw new BadRequestException('Tutorial gift already redeemed');
    }

    // Resource grant matches the panel copy in ScrTutorial. `energy: 25`
    // serves as the "kristal" stand-in until energy/crystal split lands.
    await this.resources.grant(userId, { mineral: 500, gas: 0, energy: 25 });

    // 200 XP via the existing award-xp path — ACHIEVEMENT is the natural
    // XpSource for a one-shot grant. The service may emit a level-up
    // event if 200 pushes the player past their next threshold; that
    // surfaces via the existing /tier-up route + the level-up toast the
    // /base page now shows.
    let leveledUp = false;
    try {
      const result = await this.progression.awardXp({
        userId,
        source: XpSource.ACHIEVEMENT,
        referenceId: 'tutorial_complete',
      });
      leveledUp = result.leveledUp;
    } catch (err) {
      // Non-fatal — XP is the smaller part of the grant.  Log and proceed.
      this.logger.warn(`tutorial XP grant failed for ${userId}: ${(err as Error).message}`);
    }

    REDEEMED.add(userId);
    this.logger.log(`Tutorial gift granted to ${userId} (leveledUp=${leveledUp})`);

    return {
      granted: true,
      resources: { mineral: 500, gas: 0, energy: 25 },
      xp: 200,
      leveledUp,
    };
  }
}
