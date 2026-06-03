import { PartialType } from '@nestjs/mapped-types';
import { CreateCreditPackageDto } from './create-credit-package.dto';

export class UpdateCreditPackageDto extends PartialType(CreateCreditPackageDto) {}
