import { ArrayNotEmpty, IsArray, IsString } from "class-validator";

export class UpdateDashboardRatesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  selectedCurrencies!: string[];
}
