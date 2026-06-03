import { HttpException, HttpStatus, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';

interface Options {
  mimeTypes?: string;
  maxSize?: number;
  destination?: string;
}

export function UploadFileInterceptor(name: string, options: Options = {}) {
  return UseInterceptors(
    FileInterceptor(name, {
      limits: { fileSize: options.maxSize ?? 1024 * 1_000 },
      fileFilter: (_req, file, cb) => {
        if (file.mimetype.match(options.mimeTypes ?? /\/(jpg|jpeg|png)$/)) {
          cb(null, true);
        } else {
          cb(
            new HttpException(
              `Unsupported file type ${extname(file.originalname)}`,
              HttpStatus.BAD_REQUEST,
            ),
            false,
          );
        }
      },
      storage: diskStorage({
        destination: join(
          __dirname,
          '../../..',
          options.destination ?? 'uploads',
        ),
        filename: (_req, file, cb) => {
          cb(null, `${crypto.randomUUID()}${extname(file.originalname)}`);
        },
      }),
    }),
  );
}
