import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Matches,
  ValidateNested,
} from 'class-validator';

export class PushChangeDto {
  @IsString()
  @IsNotEmpty()
  table!: string;

  /** The client's `local_id` for this row (a UUID it generated offline). */
  @IsString()
  @IsNotEmpty()
  localId!: string;

  @IsOptional()
  @IsString()
  remoteId?: string;

  /** Domain columns + updated_at/deleted_at; FK values are the client's local
   *  ids (resolved server-side). Validated structurally per-table at the
   *  Prisma merge boundary, not here — this module stores generically. */
  @IsObject()
  data!: Record<string, unknown>;
}

export class PushDto {
  /** Same 64-hex fingerprint the licence check-in pins (check-in.dto.ts). */
  @IsString()
  @Length(64, 64)
  @Matches(/^[0-9a-f]{64}$/, {
    message: 'deviceFingerprint must be 64 lowercase hex characters',
  })
  deviceFingerprint!: string;

  @IsArray()
  // A till reconnecting after two offline weeks pushes a lot, but not
  // unboundedly much — cap the batch so a runaway client can't OOM the
  // server. The desktop client is expected to chunk beyond this.
  @ArrayMaxSize(5000)
  @ValidateNested({ each: true })
  @Type(() => PushChangeDto)
  changes!: PushChangeDto[];
}
