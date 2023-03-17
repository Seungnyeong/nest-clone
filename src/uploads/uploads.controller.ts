import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import * as AWS from "aws-sdk";

const BUCKET_NAME = "nuber-eat-bucket-seungnyeong";

@Controller("uploads")
export class UploadsController {
  @Post("")
  @UseInterceptors(FileInterceptor("file"))
  async uploadFile(@UploadedFile() file) {
    AWS.config.update({
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    try {
      const objectName = `${Date.now() + file.originalname}`;
      const { Location: fileUrl } = await new AWS.S3()
        .upload({
          Body: file.buffer,
          Bucket: BUCKET_NAME,
          Key: objectName,
          ACL: "public-read",
        })
        .promise();

      return { url: fileUrl };
    } catch (e) {
      return null;
    }
  }
}
