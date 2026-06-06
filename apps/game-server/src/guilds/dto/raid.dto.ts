import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

// userId field removed (P5-S1 security fix): the attacker who controls the
// request body must not be able to attribute a raid hit to another user.
// The acting user is now taken from the JWT (req.user.sub) in
// GuildsController.attackRaid.

export class RaidAttackDto {
  @IsInt()
  @Min(1)
  damage: number;
}
