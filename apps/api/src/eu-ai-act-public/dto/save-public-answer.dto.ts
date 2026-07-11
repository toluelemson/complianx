import { IsDefined } from 'class-validator';

export class SavePublicAnswerDto {
  @IsDefined()
  value!: unknown;
}
