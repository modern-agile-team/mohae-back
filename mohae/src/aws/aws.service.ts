import * as path from 'path';
import * as AWS from 'aws-sdk';
import * as sharp from 'sharp';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PromiseResult } from 'aws-sdk/lib/request';
import { connect } from 'http2';

@Injectable()
export class AwsService {
  private readonly awsS3: AWS.S3;
  public readonly S3_BUCKET_NAME: string;

  constructor(private readonly configService: ConfigService) {
    this.awsS3 = new AWS.S3({
      accessKeyId: this.configService.get('AWS_S3_ACCESS_KEY'), // process.env.AWS_S3_ACCESS_KEY
      secretAccessKey: this.configService.get('AWS_S3_SECRET_KEY'),
      region: this.configService.get('AWS_S3_REGION'),
    });
    this.S3_BUCKET_NAME = this.configService.get('AWS_S3_BUCKET_NAME');
  }

  async uploadFileToS3(
    folder: string,
    sizes: string,
    files: Express.Multer.File,
  ): Promise<{
    keys: Array<string>;
    contentType: string;
  }> {
    const keys = [];

    try {
      for (const index in files) {
        const separatedSizes = sizes.split('X');

        const key: string = `${folder}/${Date.now()}_${path.basename(
          files[index].originalname,
        )}`.replace(/ /g, '');

        sharp(files[index].buffer)
          .resize({
            with: +separatedSizes[0],
            height: +separatedSizes[1],
            position: 'left top',
          })
          .withMetadata() // 이미지의 exif데이터 유지
          .toBuffer((err, buffer) => {
            if (err) {
              throw err;
            }

            this.awsS3
              .putObject({
                Bucket: this.S3_BUCKET_NAME,
                Key: key,
                Body: buffer,
                ACL: 'public-read',
                ContentType: files[index].mimetype,
              })
              .promise();
          });

        keys.push(key);
      }

      return { keys, contentType: files.mimetype };
    } catch (error) {
      throw new BadRequestException(`File upload failed : ${error}`);
    }
  }

  async deleteS3Object(
    key: string,
    callback?: (err: AWS.AWSError, data: AWS.S3.DeleteObjectOutput) => void,
  ): Promise<{ success: true }> {
    try {
      await this.awsS3
        .deleteObject(
          {
            Bucket: this.S3_BUCKET_NAME,
            Key: key,
          },
          callback,
        )
        .promise();
      return { success: true };
    } catch (error) {
      throw new BadRequestException(`Failed to delete file : ${error}`);
    }
  }

  async uploadSpecFileToS3(folder: string, files: any): Promise<Array<string>> {
    try {
      if (files[0].originalname === 'default.jpg') {
        return ['default.jpg'];
      }
      const specPhotoUrls = [];

      for await (const file of files) {
        const key: string = `${folder}/${Date.now()}_${path.basename(
          file.originalname,
        )}`.replace(/ /g, '');

        this.awsS3
          .putObject({
            Bucket: this.S3_BUCKET_NAME,
            Key: key,
            Body: file.buffer,
            ACL: 'public-read',
            ContentType: file.mimetype,
          })
          .promise();

        specPhotoUrls.push(key);
      }
      return specPhotoUrls;
    } catch (error) {
      throw new BadRequestException(`File upload failed : ${error}`);
    }
  }

  async deleteSpecS3Object(
    originSpecPhotoUrls: string,
    callback?: (err: AWS.AWSError, data: AWS.S3.DeleteObjectOutput) => void,
  ): Promise<{ success: true }> {
    try {
      for await (const originSpecPhotoUrl of originSpecPhotoUrls) {
        await this.awsS3
          .deleteObject(
            {
              Bucket: this.S3_BUCKET_NAME,
              Key: originSpecPhotoUrl,
            },
            callback,
          )
          .promise();
      }
      return { success: true };
    } catch (error) {
      throw new BadRequestException(`Failed to delete file : ${error}`);
    }
  }

  async uploadProfileFileToS3(folder: string, file: any): Promise<string> {
    try {
      if (file.originalname === 'default.jpg') {
        return 'default.jpg';
      }
      const profilePhotoUrl: string = `${folder}/${Date.now()}_${path.basename(
        file.originalname,
      )}`.replace(/ /g, '');

      this.awsS3
        .putObject({
          Bucket: this.S3_BUCKET_NAME,
          Key: profilePhotoUrl,
          Body: file.buffer,
          ACL: 'public-read',
          ContentType: file.mimetype,
        })
        .promise();

      return profilePhotoUrl;
    } catch (error) {
      throw new BadRequestException(`File upload failed : ${error}`);
    }
  }

  async deleteProfileS3Object(
    originProfilePhotoUrl: string,
    callback?: (err: AWS.AWSError, data: AWS.S3.DeleteObjectOutput) => void,
  ): Promise<{ success: true }> {
    try {
      await this.awsS3
        .deleteObject(
          {
            Bucket: this.S3_BUCKET_NAME,
            Key: originProfilePhotoUrl,
          },
          callback,
        )
        .promise();

      return { success: true };
    } catch (error) {
      throw new BadRequestException(`Failed to delete file : ${error}`);
    }
  }

  public getAwsS3FileUrl(objectKey: string) {
    return `https://${this.S3_BUCKET_NAME}.s3.amazonaws.com/${objectKey}`;
  }

  // upload = multer({
  //   storage: s3Storage({
  //     s3: awsS3,
  //     bucket: this.S3,
  //     acl: 'public-read',
  //     key: function (request, file, cb) {
  //       cb(null, `${Date.now().toString()} - ${file.originalname}`);
  //     },
  //     resize: {
  //       width: 600,
  //       height: 400,
  //     },
  //   }),
  // }).array('upload', 1);
}
