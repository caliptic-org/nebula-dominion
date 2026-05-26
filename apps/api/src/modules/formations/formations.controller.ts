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

interface SlotInput {
  /** Grid index 0..N-1, where N = rows * cols */
  idx?: number;
  /** Optional unit type code (marine/zergling/etc.) */
  unitType?: string;
  /** Per-slot count for stack-style formations */
  count?: number;
}

interface FormationInput {
  /** Optional override; server generates a uuid when missing */
  id?: string;
  name: string;
  rows?: number;
  cols?: number;
  templateId?: string;
  slots: SlotInput[];
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
  save(@Request() req: { user: { id: string } }, @Body() body: FormationInput) {
    const userId = req.user.id;
    const list = FORMATIONS.get(userId) ?? [];
    const updatedAt = new Date().toISOString();

    // Upsert: id supplied + existing row → replace in place; otherwise
    // create a fresh row with a server-generated id.
    const existingIdx = body.id ? list.findIndex((f) => f.id === body.id) : -1;
    const record = {
      id: body.id || uid(),
      name: body.name,
      rows: body.rows ?? 3,
      cols: body.cols ?? 5,
      templateId: body.templateId,
      slots: body.slots ?? [],
      updatedAt,
    };

    if (existingIdx >= 0) {
      list[existingIdx] = record;
    } else {
      list.unshift(record);
    }
    FORMATIONS.set(userId, list);

    return { saved: true, formation: record };
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
