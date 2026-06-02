import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { FormationsService } from './formations.service';

interface SlotInput {
  /** Grid index 0..N-1, where N = rows * cols */
  idx?: number;
  /** Optional unit type code (marine/zergling/etc.) */
  unitType?: string;
  /** Per-slot count for stack-style formations */
  count?: number;
}

/** New shape the /formation FE sends: separate unit + commander slot
 *  arrays with explicit positions, instead of one flat slots[] index. */
interface UnitSlotPosition {
  unitId: string;
  position: number;
}
interface CommanderSlotPosition {
  commanderId: string;
  position: number;
}

interface FormationInput {
  /** Optional override; server generates a uuid when missing */
  id?: string;
  name: string;
  rows?: number;
  cols?: number;
  templateId?: string;
  /** Legacy shape — kept for backward compatibility with older clients. */
  slots?: SlotInput[];
  /** New shape — what FormationScreenND.tsx actually sends today. */
  unitSlots?: UnitSlotPosition[];
  commanderSlots?: CommanderSlotPosition[];
}

/**
 * In-memory store keyed by playerId. The proper persistence layer (TypeORM
 * Formation entity + repository) lands in a follow-up; until then this
 * provides round-trip save/load so the /formation screen and any backend
 * battle preview share state within a single api process.
 *
 * Container restart wipes the store — same caveat as battles-stub.controller.
 */
const FORMATIONS: Map<string, Array<FormationInput & { id: string; updatedAt: string }>> = new Map();

function uid(): string {
  return `fm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/* Stub controller — see formations.module.ts for context.
 *
 * Returns empty paginated formations + a small static template list so
 * the /formation screen has something to render without surfacing 404s
 * during the autonomous QA crawler runs.
 *
 * TODO: replace with real persistence + service-driven derivation when
 * the formation backend lands. Don't add Post/Put/Delete here without
 * the service — the screen falls back to client-side state for those.
 */
@ApiTags('formations')
@ApiBearerAuth()
@Controller('formations')
export class FormationsController {
  constructor(private readonly formationsService: FormationsService) {}

  /** GET /formations?playerId=X&page=1&limit=50 — paginated saved formations. */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List saved formations for a player' })
  @ApiQuery({ name: 'playerId', required: false, description: 'Defaults to the authenticated user' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  list(
    @Request() req: { user: { id: string } },
    @Query('playerId') playerId: string | undefined,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const owner = playerId || req.user.id;
    const formations = FORMATIONS.get(owner) ?? [];
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Math.min(100, Number(limit)));
    const start = (pageNum - 1) * limitNum;
    const slice = formations.slice(start, start + limitNum);
    return {
      formations: slice,
      page: pageNum,
      limit: limitNum,
      total: formations.length,
    };
  }

  /**
   * POST /formations — save (create or upsert by id) a formation for the
   * caller.  The /formation screen calls this after a drag-drop edit; the
   * payload mirrors what `formation-api.ts` constructs client-side.
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Save (create or update) a formation' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'slots'],
      properties: {
        id:         { type: 'string', description: 'Optional — omit to create, supply to update' },
        name:       { type: 'string' },
        rows:       { type: 'number' },
        cols:       { type: 'number' },
        templateId: { type: 'string' },
        slots:      { type: 'array', items: { type: 'object' } },
      },
    },
  })
  async save(@Request() req: { user: { id: string } }, @Body() body: FormationInput) {
    const userId = req.user.id;
    const list = FORMATIONS.get(userId) ?? [];
    const updatedAt = new Date().toISOString();

    // Upsert: id supplied + existing row → replace in place; otherwise
    // create a fresh row with a server-generated id.
    const existingIdx = body.id ? list.findIndex((f) => f.id === body.id) : -1;
    const previous = existingIdx >= 0 ? list[existingIdx] : null;
    const record = {
      id: body.id || uid(),
      name: body.name,
      rows: body.rows ?? 3,
      cols: body.cols ?? 5,
      templateId: body.templateId,
      slots: body.slots ?? [],
      // Persist the new dual-array shape too — FE always sends these
      // now (formation-api.ts createFormation/updateFormation). Without
      // storing them, GET /formations returned records that round-tripped
      // to empty slots in the UI even though save succeeded.
      unitSlots: body.unitSlots ?? [],
      commanderSlots: body.commanderSlots ?? [],
      updatedAt,
    };

    if (existingIdx >= 0) {
      list[existingIdx] = record;
    } else {
      list.unshift(record);
    }
    FORMATIONS.set(userId, list);

    // Compute server-authoritative power so the FE doesn't have to
    // immediately re-debounce a /formations/power call after save —
    // the displayed GÜÇ stays stable. Stale-slot dropping is safe here:
    // FormationsService skips referenced units/commanders the caller
    // doesn't own (deleted mid-edit, etc.).
    const power = await this.formationsService.calculatePower(
      userId,
      record.unitSlots,
      record.commanderSlots,
    );

    // Return shape mirrors the FE Formation type
    // (apps/web/src/components/formation/types.ts). The previous shape
    // wrapped the record under `{ saved, formation }` which made the
    // FE try to iterate `response.unitSlots` (undefined on the wrapper)
    // and crash with "e is not iterable" on every save. Per REST,
    // POST/PUT on a resource returns the resource.
    return {
      id: record.id,
      playerId: userId,
      name: record.name,
      unitSlots: record.unitSlots,
      commanderSlots: record.commanderSlots,
      templateId: record.templateId ?? null,
      // Preserve the previous "active" flags across an update so the
      // chip on the saved-list keeps highlighting the right row. New
      // formations default to inactive — the player explicitly activates
      // via the separate POST /formations/:id/activate flow.
      isLastActive: (previous as { isLastActive?: boolean } | null)?.isLastActive ?? false,
      isActive: (previous as { isActive?: boolean } | null)?.isActive ?? false,
      totalPower: power.totalPower,
      createdAt:
        (previous as { createdAt?: string } | null)?.createdAt ?? updatedAt,
      updatedAt,
    };
  }

  /** PUT /formations/:id — explicit update endpoint (same logic as POST upsert). */
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update an existing formation by id' })
  update(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
    @Body() body: Omit<FormationInput, 'id'>,
  ) {
    return this.save(req, { ...body, id });
  }

  /** DELETE /formations/:id */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a saved formation' })
  remove(@Param('id') id: string, @Request() req: { user: { id: string } }) {
    const list = FORMATIONS.get(req.user.id);
    if (!list) return;
    FORMATIONS.set(
      req.user.id,
      list.filter((f) => f.id !== id),
    );
  }

  /**
   * POST /formations/power — server-authoritative power calculation.
   *
   * The /formation screen calls this debounced after each slot edit so
   * the displayed "GÜÇ" badge confirms (and overrides) the optimistic
   * local sum. The endpoint reads `player_units` and `player_commanders`
   * directly (same Postgres DB, owned by game-server) and only counts
   * slots whose referenced unit/commander the caller actually owns —
   * stale refs from a deleted unit silently drop from the breakdown.
   *
   * Placed BEFORE the `:id` routes above (specifically `update` / `remove`
   * which match `:id` for PUT/DELETE) is unnecessary here because
   * `/power` is a POST and the only POST on this controller besides
   * the unparameterized `save()`. Nest's method+path matcher would
   * never confuse them. Kept near the bottom of the route block
   * alongside the other one-off endpoints.
   */
  @Post('power')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Compute server-authoritative formation power' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        playerId: {
          type: 'string',
          description: 'Ignored — server uses authenticated caller. Kept for FE API parity.',
        },
        unitSlots: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              unitId: { type: 'string' },
              position: { type: 'number' },
            },
          },
        },
        commanderSlots: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              commanderId: { type: 'string' },
              position: { type: 'number' },
            },
          },
        },
      },
    },
  })
  async calculatePower(
    @Request() req: { user: { id: string } },
    @Body() body: {
      unitSlots?: Array<{ unitId: string; position?: number }>;
      commanderSlots?: Array<{ commanderId: string; position?: number }>;
    },
  ) {
    return this.formationsService.calculatePower(
      req.user.id,
      body.unitSlots,
      body.commanderSlots,
    );
  }

  /** GET /formations/templates — static template catalog (preset layouts). */
  @Get('templates')
  @ApiOperation({ summary: 'List preset formation templates (stub)' })
  listTemplates() {
    return [
      {
        id: 'standard-3x5',
        name: 'Standart Saldırı',
        description: '3 sıra · 5 kolon. Yakın dövüşçü öne, menzilli arka sıraya.',
        rows: 3,
        cols: 5,
        recommendedRoles: ['tank', 'assault', 'sniper'],
      },
      {
        id: 'defensive-2x5',
        name: 'Savunma Falanksı',
        description: 'İki sıra. Tank duvarı önde, destek arkada. PvP defansı için ideal.',
        rows: 2,
        cols: 5,
        recommendedRoles: ['tank', 'support'],
      },
      {
        id: 'rush-1x6',
        name: 'Hücum Hattı',
        description: 'Tek sıra, geniş ön cephe. Yüksek hızlı birim akınları.',
        rows: 1,
        cols: 6,
        recommendedRoles: ['assault', 'stealth'],
      },
    ];
  }
}
