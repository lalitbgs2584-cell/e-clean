import { HeadObjectCommand, S3Client, ListObjectsV2Command, GetBucketLocationCommand } from "@aws-sdk/client-s3";

const client = new S3Client({
  region: process.env.S3_REGION!,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});

const bucket = process.env.S3_BUCKET!;
console.log("bucket:", bucket);

try {
  const loc = await client.send(new GetBucketLocationCommand({ Bucket: bucket }));
  console.log("location:", JSON.stringify(loc.LocationConstraint));
} catch (e: any) {
  console.log("location error:", e.message);
}

const keys = [
  "reports/f2c3cc86-76c7-4861-b9e5-522b1e4deeec/original.jpg",
  "cleanups/92bad888-e8e2-499e-98a1-1e8fe437410a/before.jpg",
  "profile/cmt1pb1mh00003wv5j82og59u/avatar-137470ce-903e-477e-8fca-c0be4814cd6b.jpg",
];

for (const key of keys) {
  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    console.log("EXISTS:", key, "len=", head.ContentLength, "type=", head.ContentType);
  } catch (e: any) {
    console.log("MISSING:", key, "->", e.name, e.$metadata?.httpStatusCode);
  }
}

try {
  const list = await client.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 30 }));
  console.log("bucket contents:");
  for (const o of list.Contents ?? []) {
    console.log("  ", o.Key, o.Size);
  }
} catch (e: any) {
  console.log("list error:", e.message);
}
