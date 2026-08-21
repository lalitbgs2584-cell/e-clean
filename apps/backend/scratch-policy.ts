import { GetBucketPolicyCommand, S3Client } from "@aws-sdk/client-s3";

const client = new S3Client({
  region: process.env.S3_REGION!,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});

try {
  const r = await client.send(
    new GetBucketPolicyCommand({ Bucket: process.env.S3_BUCKET! }),
  );
  console.log("POLICY:", r.Policy);
} catch (e: any) {
  console.log("GetBucketPolicy denied:", e.message?.slice(0, 300));
}
