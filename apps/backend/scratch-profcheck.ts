import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const client = new S3Client({
  region: process.env.S3_REGION!,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});
const bucket = process.env.S3_BUCKET!;

const checks = [
  `profiles/cmt1pb1mh00003wv5j82og59u/avatar-137470ce-903e-477e-8fca-c0be4814cd6b.jpg`,
  `profile/cmt1pb1mh00003wv5j82og59u/avatar-137470ce-903e-477e-8fca-c0be4814cd6b.jpg`,
];

for (const key of checks) {
  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    console.log("EXISTS:", key, "len=", head.ContentLength);
  } catch (e: any) {
    console.log("MISSING:", key, "->", e.$metadata?.httpStatusCode, e.name);
  }
}

try {
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: "profiles/_probe.txt",
      Body: "probe",
      ContentType: "text/plain",
    }),
  );
  console.log("WRITE OK to profiles/_probe.txt");
} catch (e: any) {
  console.log("WRITE DENIED to profiles/:", e.$metadata?.httpStatusCode, e.name);
}
