import { GetObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";

const client = new S3Client({
  region: process.env.S3_REGION!,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});
const bucket = process.env.S3_BUCKET!;

const keys = [
  "reports/f2c3cc86-76c7-4861-b9e5-522b1e4deeec/original.jpg",
  "cleanups/92bad888-e8e2-499e-98a1-1e8fe437410a/before.jpg",
  "cleanups/92bad888-e8e2-499e-98a1-1e8fe437410a/after.jpg",
  "profile/cmt1pb1mh00003wv5j82og59u/avatar-137470ce-903e-477e-8fca-c0be4814cd6b.jpg",
  "profiles/cmt1pb1mh00003wv5j82og59u/avatar-137470ce-903e-477e-8fca-c0be4814cd6b.jpg",
  "_probe.txt",
  "profile/_probe2.txt",
  "profiles/_probe.txt",
];

for (const key of keys) {
  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    console.log(`HEAD OK  ${key} len=${head.ContentLength}`);
  } catch (e: any) {
    console.log(`HEAD ERR ${key} status=${e.$metadata?.httpStatusCode}`);
  }
}
