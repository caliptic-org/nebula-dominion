import { IsString, IsNotEmpty, MinLength, MaxLength, Matches } from 'class-validator';

/**
 * CreateGuildDto — body for POST /guilds.
 *
 * SECURITY NOTE (BLOCKER IDOR-GUILDS-CREATE-LEADER, audit cycle 6):
 *   The previous version of this DTO carried a `leaderId: string` field that
 *   was read directly from the request body and used as both the
 *   `Guild.leaderId` column AND the `GuildMember(role=LEADER)` row's
 *   `userId`. Because the endpoint trusted the body verbatim, any
 *   authenticated player could POST {name, tag, leaderId:<victim_uuid>} and
 *   conscript an arbitrary victim as the leader of a guild they never
 *   created — locking the victim out of any other guild (the
 *   `existingMembership` check would then flag them as already enrolled)
 *   and forging telemetry / event log entries against the victim's id.
 *
 * Mitigation:
 *   `leaderId` has been DROPPED from the DTO entirely. The controller now
 *   derives the acting user from the JWT subject claim via @CurrentUser()
 *   and passes it as a separate argument to GuildsService.createGuild().
 *   See guilds.controller.ts `create()` for the new contract. Mirrors the
 *   same pattern already used by /:id/join, /:id/leave, /:id/donate.
 */
export class CreateGuildDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(3)
  @MaxLength(5)
  @Matches(/^[A-Z0-9]+$/, { message: 'tag must be 3-5 uppercase alphanumeric characters' })
  tag: string;
}
