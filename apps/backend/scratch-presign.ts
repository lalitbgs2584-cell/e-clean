import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const client = new S3Client({
  region: process.env.S3_REGION!,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});

const url = await getSignedUrl(
  client,
  new GetObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: "reports/f2c3cc86-76c7-4861-b9e5-522b1e4deeec/original.jpg",
  }),
  { expiresIn: 300 },
);
console.log(url);
