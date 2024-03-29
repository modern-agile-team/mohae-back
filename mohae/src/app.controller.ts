import {
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AppService } from './app.service';
import { AwsService } from './aws/aws.service';
import { multerOptions } from './common/configs/multer.option';
import { BoardPhotoSizes } from './common/configs/photo-size.config';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly awsService: AwsService,
  ) {}

  @Post('image')
  @UseInterceptors(FilesInterceptor('image', 10, multerOptions))
  async imageResizing(@UploadedFiles() files: Express.Multer.File) {
    const savedImage = [];
    for (const size in BoardPhotoSizes) {
      savedImage.push(
        await this.awsService.uploadFileToS3(
          `resize/${BoardPhotoSizes[size]}`,
          BoardPhotoSizes[size],
          files,
        ),
      );
    }
    return savedImage;
  }
}
