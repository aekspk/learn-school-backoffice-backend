import { OmitType } from '@nestjs/mapped-types';
import { CreateUserDto } from 'src/users/dtos/create-user.dto';

export class Login extends OmitType(CreateUserDto, ['name']) {}
