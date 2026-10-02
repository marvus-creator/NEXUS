import { applyDecorators } from '@nestjs/common';
import { IsOptional, Matches, MaxLength, ValidateIf } from 'class-validator';

const IMAGE_URL = /^(https:\/\/[^\s"'<>]+|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/uploads\/[^\s"'<>]+|\/images\/[\w./-]+)$/;

export function IsImageUrl() {
  return applyDecorators(
    IsOptional(),
    ValidateIf((_, value) => value !== null),
    MaxLength(500),
    Matches(IMAGE_URL, { message: 'Images must be uploaded to NEXUS or served over https' }),
  );
}
