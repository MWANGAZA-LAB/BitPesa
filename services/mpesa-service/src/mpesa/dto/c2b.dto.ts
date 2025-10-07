import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min, Max, Length } from 'class-validator';
import { Type } from 'class-transformer';

export class C2BDto {
  @ApiProperty({
    description: 'Short code',
    example: '174379',
  })
  @IsString()
  @Length(6, 6)
  shortCode: string;

  @ApiProperty({
    description: 'Response type',
    example: 'Completed',
    required: false,
  })
  @IsOptional()
  @IsString()
  responseType?: string;

  @ApiProperty({
    description: 'Confirmation URL',
    example: 'https://yourdomain.com/api/v1/mpesa/callback/c2b',
    required: false,
  })
  @IsOptional()
  @IsString()
  confirmationURL?: string;

  @ApiProperty({
    description: 'Validation URL',
    example: 'https://yourdomain.com/api/v1/mpesa/callback/c2b',
    required: false,
  })
  @IsOptional()
  @IsString()
  validationURL?: string;
}
